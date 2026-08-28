import { firebaseConfig, isFirebaseConfigured } from './firebase-config.js';

const FIREBASE_VERSION = '12.18.0';
const FIREBASE_BASE = `https://www.gstatic.com/firebasejs/${FIREBASE_VERSION}`;
const CACHE_CONTROL = 'public,max-age=31536000,immutable';
const SESSION_KEY = 'fantasavuto-sponsor-cache-migrated-v2';
const MAX_SOURCE_BYTES = 5 * 1024 * 1024;
const TARGET_BYTES = 180 * 1024;
const MAX_WIDTH = 640;
const MAX_HEIGHT = 320;

let servicesPromise;
let migrationRunning = false;

function byId(id) {
  return document.getElementById(id);
}

function sponsorStatus(message, state = 'neutral') {
  const box = byId('cms-v2-sponsor-status');
  if (!box) return;
  box.textContent = message;
  box.dataset.state = state;
}

function formatBytes(bytes) {
  if (!Number.isFinite(bytes) || bytes <= 0) return '0 KB';
  if (bytes >= 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  return `${Math.max(1, Math.round(bytes / 1024))} KB`;
}

function safeBaseName(value) {
  return (value || 'logo')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80) || 'logo';
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

function loadImage(blob) {
  return new Promise((resolve, reject) => {
    const image = new Image();
    const objectUrl = URL.createObjectURL(blob);
    image.onload = () => {
      URL.revokeObjectURL(objectUrl);
      resolve(image);
    };
    image.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error('Impossibile leggere il logo esistente.'));
    };
    image.src = objectUrl;
  });
}

function canvasToBlob(canvas, quality) {
  return new Promise((resolve) => {
    canvas.toBlob((blob) => resolve(blob), 'image/webp', quality);
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
  if (!context) throw new Error('Il browser non supporta la conversione WebP.');
  context.clearRect(0, 0, width, height);
  context.drawImage(image, 0, 0, width, height);
  return { canvas, width, height };
}

async function encodeExistingLogo(blob) {
  const image = await loadImage(blob);
  let rendered = drawImage(image, MAX_WIDTH, MAX_HEIGHT);
  let output = null;

  for (const quality of [0.82, 0.74, 0.66, 0.58]) {
    output = await canvasToBlob(rendered.canvas, quality);
    if (!output || output.type !== 'image/webp') break;
    if (output.size <= TARGET_BYTES) break;
  }

  if (
    output?.type === 'image/webp'
    && output.size > TARGET_BYTES
    && (rendered.width > 420 || rendered.height > 210)
  ) {
    const reduced = drawImage(image, 480, 240);
    const reducedOutput = await canvasToBlob(reduced.canvas, 0.68);
    if (reducedOutput?.type === 'image/webp' && reducedOutput.size < output.size) {
      rendered = reduced;
      output = reducedOutput;
    }
  }

  if (!output || output.type !== 'image/webp') {
    throw new Error('Il browser non ha prodotto un file WebP valido.');
  }

  return {
    blob: output,
    width: rendered.width,
    height: rendered.height,
  };
}

async function ensureLongCache(reference, services, metadata = null) {
  const current = metadata || await services.storageSdk.getMetadata(reference);
  if (current.cacheControl === CACHE_CONTROL) return false;
  await services.storageSdk.updateMetadata(reference, { cacheControl: CACHE_CONTROL });
  return true;
}

async function applyCacheToExistingSponsors() {
  if (!isFirebaseConfigured || window.location.pathname !== '/admin') return;
  if (sessionStorage.getItem(SESSION_KEY) === 'true') return;
  if (!byId('cms-v2-sponsor-tools')) return;

  try {
    const services = await getServices();
    const snapshot = await services.firestoreSdk.getDocs(
      services.firestoreSdk.collection(services.db, 'sponsors'),
    );
    const storedSponsors = snapshot.docs
      .map((document) => ({ id: document.id, ...document.data() }))
      .filter((sponsor) => sponsor.storagePath);

    if (!storedSponsors.length) {
      sessionStorage.setItem(SESSION_KEY, 'true');
      return;
    }

    let updated = 0;
    let checked = 0;
    for (const sponsor of storedSponsors) {
      const reference = services.storageSdk.ref(services.storage, sponsor.storagePath);
      try {
        const metadata = await services.storageSdk.getMetadata(reference);
        checked += 1;
        if (await ensureLongCache(reference, services, metadata)) updated += 1;
      } catch (error) {
        console.warn('Impossibile aggiornare la cache di', sponsor.storagePath, error);
      }
    }

    sessionStorage.setItem(SESSION_KEY, 'true');
    if (updated > 0) {
      sponsorStatus(`Cache ottimizzata su ${updated} logo già presenti (${checked} verificati).`, 'success');
    }
  } catch (error) {
    console.warn('Migrazione cache sponsor non completata.', error);
  }
}

async function optimizeStoredSponsor(sponsor, index, total, services) {
  const oldReference = services.storageSdk.ref(services.storage, sponsor.storagePath);
  const metadata = await services.storageSdk.getMetadata(oldReference);
  const sourceBytes = Number(metadata.size || 0);
  const contentType = metadata.contentType || '';

  sponsorStatus(
    `Ottimizzazione loghi esistenti ${index}/${total}: ${sponsor.name || sponsor.id}…`,
    'neutral',
  );

  if (!sourceBytes || sourceBytes >= MAX_SOURCE_BYTES) {
    await ensureLongCache(oldReference, services, metadata).catch(() => undefined);
    return { status: 'skipped', before: sourceBytes, after: sourceBytes };
  }

  const alreadyOptimized = contentType === 'image/webp'
    && sourceBytes <= TARGET_BYTES
    && metadata.cacheControl === CACHE_CONTROL;
  if (alreadyOptimized) {
    return { status: 'already', before: sourceBytes, after: sourceBytes };
  }

  if (contentType === 'image/svg+xml' && sourceBytes <= TARGET_BYTES) {
    await ensureLongCache(oldReference, services, metadata);
    return { status: 'already', before: sourceBytes, after: sourceBytes };
  }

  const sourceBlob = await services.storageSdk.getBlob(oldReference, MAX_SOURCE_BYTES);
  const optimized = await encodeExistingLogo(sourceBlob);

  if (optimized.blob.size >= sourceBytes) {
    await ensureLongCache(oldReference, services, metadata);
    return { status: 'already', before: sourceBytes, after: sourceBytes };
  }

  const newPath = `sponsors/${Date.now()}-${safeBaseName(sponsor.name || sponsor.id)}.webp`;
  const newReference = services.storageSdk.ref(services.storage, newPath);
  let uploaded = false;

  try {
    await services.storageSdk.uploadBytes(newReference, optimized.blob, {
      contentType: 'image/webp',
      cacheControl: CACHE_CONTROL,
      customMetadata: {
        sponsorName: sponsor.name || sponsor.id,
        optimized: 'migration',
        originalBytes: String(sourceBytes),
        storedBytes: String(optimized.blob.size),
        width: String(optimized.width),
        height: String(optimized.height),
      },
    });
    uploaded = true;
    const logoUrl = await services.storageSdk.getDownloadURL(newReference);

    await services.firestoreSdk.updateDoc(
      services.firestoreSdk.doc(services.db, 'sponsors', sponsor.id),
      {
        logoUrl,
        storagePath: newPath,
        updatedAt: services.firestoreSdk.serverTimestamp(),
      },
    );

    await services.storageSdk.deleteObject(oldReference).catch((error) => {
      console.warn('Vecchio logo non eliminato:', sponsor.storagePath, error);
    });

    return {
      status: 'optimized',
      before: sourceBytes,
      after: optimized.blob.size,
    };
  } catch (error) {
    if (uploaded) {
      await services.storageSdk.deleteObject(newReference).catch(() => undefined);
    }
    throw error;
  }
}

async function optimizeAllExistingLogos(button) {
  if (migrationRunning) return;
  migrationRunning = true;
  button.disabled = true;

  try {
    const services = await getServices();
    const snapshot = await services.firestoreSdk.getDocs(
      services.firestoreSdk.collection(services.db, 'sponsors'),
    );
    const sponsors = snapshot.docs
      .map((document) => ({ id: document.id, ...document.data() }))
      .filter((sponsor) => sponsor.storagePath);

    if (!sponsors.length) {
      sponsorStatus('Nessun logo Storage da ottimizzare.', 'success');
      return;
    }

    let optimizedCount = 0;
    let alreadyCount = 0;
    let skippedCount = 0;
    let failedCount = 0;
    let bytesBefore = 0;
    let bytesAfter = 0;

    for (let i = 0; i < sponsors.length; i += 1) {
      try {
        const result = await optimizeStoredSponsor(sponsors[i], i + 1, sponsors.length, services);
        bytesBefore += result.before || 0;
        bytesAfter += result.after || 0;
        if (result.status === 'optimized') optimizedCount += 1;
        else if (result.status === 'already') alreadyCount += 1;
        else skippedCount += 1;
      } catch (error) {
        failedCount += 1;
        console.warn('Logo non ottimizzato:', sponsors[i].name || sponsors[i].id, error);
      }
    }

    const savedBytes = Math.max(0, bytesBefore - bytesAfter);
    const details = [
      `${optimizedCount} convertiti`,
      `${alreadyCount} già ottimizzati`,
    ];
    if (skippedCount) details.push(`${skippedCount} saltati`);
    if (failedCount) details.push(`${failedCount} errori`);

    sponsorStatus(
      `Ottimizzazione completata: ${details.join(', ')}. ${formatBytes(bytesBefore)} → ${formatBytes(bytesAfter)} (risparmiati ${formatBytes(savedBytes)}).`,
      failedCount ? 'neutral' : 'success',
    );
    sessionStorage.setItem(SESSION_KEY, 'true');
  } catch (error) {
    console.error('Ottimizzazione loghi esistenti non riuscita.', error);
    sponsorStatus(error?.message || 'Ottimizzazione dei loghi esistenti non riuscita.', 'error');
  } finally {
    migrationRunning = false;
    button.disabled = false;
  }
}

function mountMigrationButton() {
  const tools = byId('cms-v2-sponsor-tools');
  if (!tools || byId('cms-v2-optimize-existing-logos')) return false;
  const actions = tools.querySelector('.cms-v2-sponsor-tools__actions');
  if (!actions) return false;

  const button = document.createElement('button');
  button.id = 'cms-v2-optimize-existing-logos';
  button.type = 'button';
  button.className = 'icon-button';
  button.textContent = 'Ottimizza loghi esistenti';
  button.title = 'Converte i loghi Storage pesanti in WebP e aggiorna automaticamente gli sponsor.';
  button.addEventListener('click', () => void optimizeAllExistingLogos(button));
  actions.insertBefore(button, actions.firstChild);
  return true;
}

function scheduleSetup() {
  window.setTimeout(() => {
    mountMigrationButton();
    void applyCacheToExistingSponsors();
  }, 250);
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', scheduleSetup);
} else {
  scheduleSetup();
}

const observer = new MutationObserver(() => {
  if (mountMigrationButton()) {
    scheduleSetup();
  }
  if (byId('cms-v2-sponsor-tools')) observer.disconnect();
});
observer.observe(document.documentElement, { childList: true, subtree: true });
