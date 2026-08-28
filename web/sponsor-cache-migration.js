import { firebaseConfig, isFirebaseConfigured } from './firebase-config.js';

const FIREBASE_VERSION = '12.18.0';
const FIREBASE_BASE = `https://www.gstatic.com/firebasejs/${FIREBASE_VERSION}`;
const CACHE_CONTROL = 'public,max-age=31536000,immutable';
const SESSION_KEY = 'fantasavuto-sponsor-cache-migrated';

let servicesPromise;

function byId(id) {
  return document.getElementById(id);
}

function sponsorStatus(message, state = 'neutral') {
  const box = byId('cms-v2-sponsor-status');
  if (!box) return;
  box.textContent = message;
  box.dataset.state = state;
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
      .map((document) => document.data())
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
        if (metadata.cacheControl !== CACHE_CONTROL) {
          await services.storageSdk.updateMetadata(reference, {
            cacheControl: CACHE_CONTROL,
          });
          updated += 1;
        }
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

function scheduleMigration() {
  window.setTimeout(() => void applyCacheToExistingSponsors(), 250);
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', scheduleMigration);
} else {
  scheduleMigration();
}

const observer = new MutationObserver(() => {
  if (byId('cms-v2-sponsor-tools')) {
    scheduleMigration();
    observer.disconnect();
  }
});
observer.observe(document.documentElement, { childList: true, subtree: true });
