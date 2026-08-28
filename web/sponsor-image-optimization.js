import { firebaseConfig, isFirebaseConfigured } from './firebase-config.js';

const FIREBASE_VERSION = '12.18.0';
const FIREBASE_BASE = `https://www.gstatic.com/firebasejs/${FIREBASE_VERSION}`;
const MAX_SOURCE_BYTES = 5 * 1024 * 1024;
const TARGET_BYTES = 180 * 1024;
const MAX_WIDTH = 640;
const MAX_HEIGHT = 320;
const CACHE_CONTROL = 'public,max-age=31536000,immutable';
const ALLOWED_IMAGE_TYPES = new Set([
  'image/png',
  'image/jpeg',
  'image/webp',
  'image/svg+xml',
]);

let servicesPromise;
const optimizationCache = new WeakMap();

function byId(id) {
  return document.getElementById(id);
}

function readValue(id) {
  return byId(id)?.value?.trim() || '';
}

function checked(id) {
  return Boolean(byId(id)?.checked);
}

function numberValue(id, fallback = 0) {
  const parsed = Number.parseInt(readValue(id), 10);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function safeFileName(value) {
  return (value || 'logo')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9._-]+/g, '-')
    .replace(/^-+|-+$/g, '') || 'logo';
}

function fileBaseName(value) {
  return safeFileName(value).replace(/\.[a-z0-9]+$/i, '') || 'logo';
}

function normalizeHttpsUrl(value) {
  const trimmed = (value || '').trim();
  if (!trimmed) return '';
  try {
    const url = new URL(trimmed);
    return url.protocol === 'https:' ? url.toString() : '';
  } catch (_) {
    return '';
  }
}

function normalizeExternalUrl(value) {
  const trimmed = (value || '').trim();
  if (!trimmed) return '';
  try {
    const url = new URL(trimmed);
    return ['http:', 'https:'].includes(url.protocol) ? url.toString() : '';
  } catch (_) {
    return '';
  }
}

function formatBytes(bytes) {
  if (!Number.isFinite(bytes) || bytes <= 0) return '0 KB';
  if (bytes >= 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  return `${Math.max(1, Math.round(bytes / 1024))} KB`;
}

function optimizationMessage(result) {
  if (!result) return '';
  const before = result.originalBytes;
  const after = result.file.size;
  const saved = before > 0 ? Math.max(0, Math.round((1 - after / before) * 100)) : 0;
  if (!result.changed) {
    return `Logo già ottimizzato: ${formatBytes(after)}. Cache lunga attiva al salvataggio.`;
  }
  return `Logo ottimizzato: ${formatBytes(before)} → ${formatBytes(after)} (-${saved}%).`;
}

function sponsorStatus(message, state = 'neutral') {
  const box = byId('cms-v2-sponsor-status');
  if (!box) return;
  box.textContent = message;
  box.dataset.state = state;
}

function showToast(message, isError = false) {
  const toast = byId('admin-toast');
  if (!toast) return;
  toast.textContent = message;
  toast.classList.toggle('is-error', isError);
  toast.classList.add('is-visible');
  window.setTimeout(() => toast.classList.remove('is-visible'), 4800);
}

function storageErrorMessage(error) {
  const code = error?.code || '';
  if (code.includes('bucket-not-found')) {
    return 'Firebase Storage non risulta attivato per questo progetto.';
  }
  if (code.includes('unauthorized')) {
    return 'Storage ha rifiutato l’upload. Verifica storage.rules e l’account admin.';
  }
  if (code.includes('canceled')) return 'Upload annullato.';
  if (code.includes('quota-exceeded')) return 'Quota Firebase Storage superata.';
  return error?.message || 'Errore Firebase Storage non identificato.';
}

async function getServices() {
  if (servicesPromise) return servicesPromise;
  servicesPromise = Promise.all([
    import(`${FIREBASE_BASE}/firebase-app.js`),
    import(`${FIREBASE_BASE}/firebase-firestore.js`),
    import(`${FIREBASE_BASE}/firebase-storage.js`),
  ]).then(([appSdk, firestoreSdk, storageSdk]) => {
    let app;
    try {
      app = appSdk.getApp();
    } catch (_) {
      app = appSdk.initializeApp(firebaseConfig);
    }
    return {
      db: firestoreSdk.getFirestore(app),
      storage: storageSdk.getStorage(app),
      firestoreSdk,
      storageSdk,
    };
  });
  return servicesPromise;
}

function loadImage(file) {
  return new Promise((resolve, reject) => {
    const image = new Image();
    const objectUrl = URL.createObjectURL(file);
    image.onload = () => {
      URL.revokeObjectURL(objectUrl);
      resolve(image);
    };
    image.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error('Non riesco a leggere il logo selezionato.'));
    };
    image.src = objectUrl;
  });
}

function canvasToBlob(canvas, type, quality) {
  return new Promise((resolve) => {
    canvas.toBlob((blob) => resolve(blob), type, quality);
  });
}

function drawImage(image, maxWidth, maxHeight) {
  const naturalWidth = image.naturalWidth || image.width;
  const naturalHeight = image.naturalHeight || image.height;
  if (!naturalWidth || !naturalHeight) {
    throw new Error('Dimensioni del logo non valide.');
  }

  const scale = Math.min(1, maxWidth / naturalWidth, maxHeight / naturalHeight);
  const width = Math.max(1, Math.round(naturalWidth * scale));
  const height = Math.max(1, Math.round(naturalHeight * scale));
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext('2d', { alpha: true });
  if (!context) throw new Error('Il browser non supporta l’ottimizzazione immagini.');
  context.clearRect(0, 0, width, height);
  context.drawImage(image, 0, 0, width, height);
  return { canvas, width, height };
}

async function encodeWebp(image, maxWidth = MAX_WIDTH, maxHeight = MAX_HEIGHT) {
  const { canvas, width, height } = drawImage(image, maxWidth, maxHeight);
  let blob = null;
  for (const quality of [0.82, 0.74, 0.66, 0.58]) {
    blob = await canvasToBlob(canvas, 'image/webp', quality);
    if (!blob || blob.type !== 'image/webp') break;
    if (blob.size <= TARGET_BYTES) break;
  }

  if (blob && blob.type === 'image/webp' && blob.size > TARGET_BYTES && (width > 420 || height > 210)) {
    const reduced = drawImage(image, Math.min(480, maxWidth), Math.min(240, maxHeight));
    const reducedBlob = await canvasToBlob(reduced.canvas, 'image/webp', 0.68);
    if (reducedBlob?.type === 'image/webp' && reducedBlob.size < blob.size) {
      blob = reducedBlob;
      return { blob, width: reduced.width, height: reduced.height };
    }
  }

  return { blob, width, height };
}

async function optimizeSponsorFile(file) {
  if (!file) return null;
  if (file.size >= MAX_SOURCE_BYTES) {
    throw new Error('Il logo supera il limite di 5 MB. Riducilo prima del caricamento.');
  }
  if (file.type && !ALLOWED_IMAGE_TYPES.has(file.type)) {
    throw new Error('Formato logo non supportato. Usa PNG, JPG, WebP o SVG.');
  }

  const cached = optimizationCache.get(file);
  if (cached) return cached;

  const promise = (async () => {
    const originalBytes = file.size;
    const image = await loadImage(file);
    const naturalWidth = image.naturalWidth || image.width;
    const naturalHeight = image.naturalHeight || image.height;

    const alreadyCompactVector = file.type === 'image/svg+xml' && file.size <= TARGET_BYTES;
    const alreadyCompactWebp = file.type === 'image/webp'
      && file.size <= TARGET_BYTES
      && naturalWidth <= MAX_WIDTH
      && naturalHeight <= MAX_HEIGHT;

    if (alreadyCompactVector || alreadyCompactWebp) {
      return {
        file,
        originalBytes,
        width: naturalWidth,
        height: naturalHeight,
        changed: false,
      };
    }

    const encoded = await encodeWebp(image);
    if (!encoded.blob || encoded.blob.type !== 'image/webp') {
      return {
        file,
        originalBytes,
        width: naturalWidth,
        height: naturalHeight,
        changed: false,
      };
    }

    const optimizedFile = new File(
      [encoded.blob],
      `${fileBaseName(file.name)}.webp`,
      { type: 'image/webp', lastModified: Date.now() },
    );

    if (optimizedFile.size >= originalBytes && originalBytes <= TARGET_BYTES) {
      return {
        file,
        originalBytes,
        width: naturalWidth,
        height: naturalHeight,
        changed: false,
      };
    }

    return {
      file: optimizedFile,
      originalBytes,
      width: encoded.width,
      height: encoded.height,
      changed: true,
    };
  })();

  optimizationCache.set(file, promise);
  return promise;
}

async function uploadOptimizedLogo(file, sponsorName, services) {
  const result = await optimizeSponsorFile(file);
  if (!result?.file) throw new Error('Logo non valido.');

  const uploadFile = result.file;
  const extension = uploadFile.type === 'image/svg+xml' ? 'svg' : 'webp';
  const path = `sponsors/${Date.now()}-${fileBaseName(uploadFile.name || sponsorName)}.${extension}`;
  const reference = services.storageSdk.ref(services.storage, path);

  await services.storageSdk.uploadBytes(reference, uploadFile, {
    contentType: uploadFile.type || 'image/webp',
    cacheControl: CACHE_CONTROL,
    customMetadata: {
      sponsorName,
      optimized: result.changed ? 'true' : 'already-compact',
      originalBytes: String(result.originalBytes),
      storedBytes: String(uploadFile.size),
      width: String(result.width || ''),
      height: String(result.height || ''),
    },
  });

  return {
    path,
    logoUrl: await services.storageSdk.getDownloadURL(reference),
    optimization: result,
  };
}

async function saveSponsor(event) {
  const button = event.submitter;
  if (button) button.disabled = true;
  const services = await getServices();
  let uploadedPath = '';

  try {
    const sponsorId = readValue('sponsor-id-input');
    let existing = null;
    if (sponsorId) {
      const snapshot = await services.firestoreSdk.getDoc(
        services.firestoreSdk.doc(services.db, 'sponsors', sponsorId),
      );
      if (snapshot.exists()) existing = snapshot.data();
    }

    const name = readValue('sponsor-name-input');
    if (!name) throw new Error('Inserisci il nome dello sponsor.');

    const sourceFile = byId('sponsor-logo-input')?.files?.[0];
    let logoUrl = normalizeHttpsUrl(readValue('sponsor-logo-url-input'));
    let storagePath = existing?.storagePath || '';
    const previousStoragePath = existing?.storagePath || '';
    let optimization = null;

    if (sourceFile) {
      sponsorStatus('Ottimizzazione e upload del logo in corso…', 'neutral');
      let uploaded;
      try {
        uploaded = await uploadOptimizedLogo(sourceFile, name, services);
      } catch (error) {
        if (error?.code) throw new Error(storageErrorMessage(error));
        throw error;
      }
      logoUrl = uploaded.logoUrl;
      storagePath = uploaded.path;
      uploadedPath = uploaded.path;
      optimization = uploaded.optimization;
    } else if (logoUrl && logoUrl !== existing?.logoUrl) {
      storagePath = '';
    } else if (!logoUrl && existing?.logoUrl) {
      logoUrl = existing.logoUrl;
    }

    if (!logoUrl) {
      throw new Error('Carica un logo oppure inserisci un URL HTTPS del logo.');
    }

    const payload = {
      name,
      logoUrl,
      storagePath,
      websiteUrl: normalizeExternalUrl(readValue('sponsor-website-input')),
      active: checked('sponsor-active-input'),
      order: numberValue('sponsor-order-input', 100),
      createdAt: existing?.createdAt || services.firestoreSdk.serverTimestamp(),
      updatedAt: services.firestoreSdk.serverTimestamp(),
    };

    if (sponsorId) {
      await services.firestoreSdk.setDoc(
        services.firestoreSdk.doc(services.db, 'sponsors', sponsorId),
        payload,
      );
    } else {
      await services.firestoreSdk.addDoc(
        services.firestoreSdk.collection(services.db, 'sponsors'),
        payload,
      );
    }

    if (previousStoragePath && previousStoragePath !== storagePath) {
      await services.storageSdk.deleteObject(
        services.storageSdk.ref(services.storage, previousStoragePath),
      ).catch(() => undefined);
    }

    uploadedPath = '';
    const message = optimization
      ? `${optimizationMessage(optimization)} Sponsor salvato.`
      : 'Sponsor salvato correttamente.';
    sponsorStatus(message, 'success');
    showToast(message);
    sessionStorage.setItem('fantasavuto-admin-tab', 'sponsors');
    window.setTimeout(() => window.location.reload(), 1100);
  } catch (error) {
    console.error(error);
    if (uploadedPath) {
      await services.storageSdk.deleteObject(
        services.storageSdk.ref(services.storage, uploadedPath),
      ).catch(() => undefined);
    }
    const message = error?.message || 'Salvataggio dello sponsor non riuscito.';
    sponsorStatus(message, 'error');
    showToast(message, true);
    if (button) button.disabled = false;
  }
}

function enhanceSponsorTools() {
  const tools = byId('cms-v2-sponsor-tools');
  if (!tools || byId('sponsor-optimizer-note')) return;
  const note = document.createElement('p');
  note.id = 'sponsor-optimizer-note';
  note.textContent = 'PNG/JPG/WebP pesanti vengono ridimensionati e convertiti automaticamente in WebP (max 640×320). I file salvati usano cache lunga di 1 anno.';
  tools.firstElementChild?.append(note);
}

document.addEventListener('change', async (event) => {
  const input = event.target;
  if (!(input instanceof HTMLInputElement) || input.id !== 'sponsor-logo-input') return;
  const file = input.files?.[0];
  if (!file) return;
  sponsorStatus('Analisi e ottimizzazione del logo…', 'neutral');
  try {
    const result = await optimizeSponsorFile(file);
    sponsorStatus(optimizationMessage(result), 'success');
  } catch (error) {
    sponsorStatus(error?.message || 'Impossibile ottimizzare il logo.', 'error');
  }
});

document.addEventListener('submit', (event) => {
  const form = event.target;
  if (!(form instanceof HTMLFormElement) || form.id !== 'sponsor-form') return;
  if (!isFirebaseConfigured) return;
  event.preventDefault();
  event.stopPropagation();
  event.stopImmediatePropagation();
  void saveSponsor(event);
}, true);

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    window.setTimeout(enhanceSponsorTools, 0);
  });
} else {
  window.setTimeout(enhanceSponsorTools, 0);
}

const sponsorToolsObserver = new MutationObserver(() => enhanceSponsorTools());
sponsorToolsObserver.observe(document.documentElement, { childList: true, subtree: true });
