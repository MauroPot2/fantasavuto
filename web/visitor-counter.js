import { firebaseConfig, isFirebaseConfigured } from './firebase-config.js';

const FIREBASE_VERSION = '12.18.0';
const FIREBASE_BASE = `https://www.gstatic.com/firebasejs/${FIREBASE_VERSION}`;
const METRICS_COLLECTION = 'siteMetrics';
const VISITS_DOCUMENT = 'visits';
const LAST_ACTIVITY_KEY = 'fantasavuto:last-visit-activity';
const CACHED_COUNT_KEY = 'fantasavuto:visitor-count';
const CACHED_AT_KEY = 'fantasavuto:visitor-count-at';
const SESSION_TIMEOUT_MS = 30 * 60 * 1000;
const CACHE_TTL_MS = 10 * 60 * 1000;

function getSafeLocalStorage() {
  try {
    const storage = window.localStorage;
    const testKey = 'fantasavuto:storage-test';
    storage.setItem(testKey, '1');
    storage.removeItem(testKey);
    return storage;
  } catch (_) {
    return null;
  }
}

function readNumber(storage, key) {
  if (!storage) return null;
  const rawValue = storage.getItem(key);
  if (rawValue == null) return null;
  const value = Number(rawValue);
  return Number.isFinite(value) ? value : null;
}

function renderCount(element, total) {
  if (!element || !Number.isFinite(total)) return;
  element.textContent = Math.max(0, total).toLocaleString('it-IT');
}

async function getFirestoreServices() {
  const [appSdk, firestoreSdk] = await Promise.all([
    import(`${FIREBASE_BASE}/firebase-app.js`),
    import(`${FIREBASE_BASE}/firebase-firestore.js`),
  ]);

  const app = appSdk.getApps().length
    ? appSdk.getApp()
    : appSdk.initializeApp(firebaseConfig);

  return {
    db: firestoreSdk.getFirestore(app),
    firestoreSdk,
  };
}

async function incrementVisit(services, reference) {
  const { db, firestoreSdk } = services;

  return firestoreSdk.runTransaction(db, async (transaction) => {
    const snapshot = await transaction.get(reference);
    const currentTotal = snapshot.exists()
      ? Number(snapshot.data().total) || 0
      : 0;
    const nextTotal = currentTotal + 1;

    if (snapshot.exists()) {
      transaction.update(reference, {
        total: nextTotal,
        updatedAt: firestoreSdk.serverTimestamp(),
      });
    } else {
      transaction.set(reference, {
        total: nextTotal,
        updatedAt: firestoreSdk.serverTimestamp(),
      });
    }

    return nextTotal;
  });
}

async function loadVisitCount() {
  const element = document.getElementById('visitor-count');
  if (!element || !isFirebaseConfigured) return;

  const storage = getSafeLocalStorage();
  const now = Date.now();
  const previousActivity = readNumber(storage, LAST_ACTIVITY_KEY);
  const isNewSession = storage != null
    && (previousActivity == null || now - previousActivity >= SESSION_TIMEOUT_MS);

  if (storage) storage.setItem(LAST_ACTIVITY_KEY, String(now));

  const cachedCount = readNumber(storage, CACHED_COUNT_KEY);
  const cachedAt = readNumber(storage, CACHED_AT_KEY);

  if (!isNewSession
      && cachedCount != null
      && cachedAt != null
      && now - cachedAt < CACHE_TTL_MS) {
    renderCount(element, cachedCount);
    return;
  }

  try {
    const services = await getFirestoreServices();
    const reference = services.firestoreSdk.doc(
      services.db,
      METRICS_COLLECTION,
      VISITS_DOCUMENT,
    );

    let total;
    if (isNewSession) {
      total = await incrementVisit(services, reference);
    } else {
      const snapshot = await services.firestoreSdk.getDoc(reference);
      total = snapshot.exists() ? Number(snapshot.data().total) || 0 : 0;
    }

    renderCount(element, total);

    if (storage) {
      storage.setItem(CACHED_COUNT_KEY, String(total));
      storage.setItem(CACHED_AT_KEY, String(now));
    }
  } catch (error) {
    console.warn('Visitor counter unavailable:', error);
    if (cachedCount != null) renderCount(element, cachedCount);
  }
}

loadVisitCount();
