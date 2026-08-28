import { firebaseConfig, isFirebaseConfigured } from './firebase-config.js';

const FIREBASE_VERSION = '12.18.0';
const FIREBASE_BASE = `https://www.gstatic.com/firebasejs/${FIREBASE_VERSION}`;

let servicesPromise;
let bound = false;

function byId(id) {
  return document.getElementById(id);
}

function setStatus(message, state = 'neutral') {
  const status = byId('cms-v2-sponsor-status');
  if (!status) return;
  status.textContent = message;
  status.dataset.state = state;
}

async function getServices() {
  if (servicesPromise) return servicesPromise;
  servicesPromise = Promise.all([
    import(`${FIREBASE_BASE}/firebase-app.js`),
    import(`${FIREBASE_BASE}/firebase-auth.js`),
    import(`${FIREBASE_BASE}/firebase-storage.js`),
  ]).then(([appSdk, authSdk, storageSdk]) => {
    let app;
    try {
      app = appSdk.getApp();
    } catch (_) {
      app = appSdk.initializeApp(firebaseConfig);
    }
    return {
      auth: authSdk.getAuth(app),
      storage: storageSdk.getStorage(app),
      storageSdk,
    };
  });
  return servicesPromise;
}

function humanStorageError(error) {
  const code = error?.code || '';
  if (code.includes('bucket-not-found')) {
    return 'Firebase Storage non è ancora attivato. Firebase Console → Storage → Inizia.';
  }
  if (code.includes('unauthorized')) {
    return 'Storage ha rifiutato l’upload. Verifica storage.rules e l’account admin.';
  }
  if (code.includes('quota-exceeded')) {
    return 'Quota Firebase Storage superata.';
  }
  if (code.includes('canceled')) {
    return 'Verifica Storage annullata.';
  }
  return error?.message || 'Verifica Firebase Storage non riuscita.';
}

async function runReliableStorageCheck(button) {
  button.disabled = true;
  setStatus('Verifica Storage in corso…', 'neutral');

  let ref;
  try {
    const services = await getServices();
    const binary = Uint8Array.from(
      atob('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9Y9ZQmcAAAAASUVORK5CYII='),
      (character) => character.charCodeAt(0),
    );
    const blob = new Blob([binary], { type: 'image/png' });
    const path = `sponsors/storage-healthcheck-${Date.now()}.png`;
    ref = services.storageSdk.ref(services.storage, path);

    const uploadResult = await services.storageSdk.uploadBytes(ref, blob, {
      contentType: 'image/png',
    });

    // Il test è positivo solo se Firebase conferma l'oggetto caricato
    // e riesce a generare un URL di download reale.
    await services.storageSdk.getDownloadURL(uploadResult.ref);

    setStatus('Storage operativo: upload verificato', 'success');

    // Cleanup best-effort: un object-not-found durante la cancellazione non
    // invalida un upload che è già stato verificato con getDownloadURL().
    await services.storageSdk.deleteObject(uploadResult.ref).catch((error) => {
      if (error?.code !== 'storage/object-not-found') {
        console.warn('Cleanup health-check Storage non riuscito.', error);
      }
    });
  } catch (error) {
    console.error('Verifica Storage non riuscita.', error);
    setStatus(humanStorageError(error), 'error');
  } finally {
    button.disabled = false;
  }
}

function bindStorageCheck() {
  if (bound) return;
  const button = byId('cms-v2-test-storage');
  if (!button) return;
  bound = true;

  // Capture + stopImmediatePropagation sostituisce il vecchio health-check
  // che considerava errore anche il solo fallimento del cleanup temporaneo.
  button.addEventListener('click', (event) => {
    event.preventDefault();
    event.stopImmediatePropagation();
    runReliableStorageCheck(button);
  }, true);
}

function initialize() {
  if (!isFirebaseConfigured || document.body.dataset.page !== 'admin') return;
  bindStorageCheck();
  const observer = new MutationObserver(() => {
    bindStorageCheck();
    if (bound) observer.disconnect();
  });
  observer.observe(document.documentElement, { childList: true, subtree: true });
}

initialize();
