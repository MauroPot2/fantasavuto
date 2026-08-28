import { firebaseConfig, isFirebaseConfigured } from './firebase-config.js';

const FIREBASE_VERSION = '12.18.0';
const FIREBASE_BASE = `https://www.gstatic.com/firebasejs/${FIREBASE_VERSION}`;
const LEGACY_IDS = new Set([
  'campionato',
  'champions-savuto',
  'campione-inverno',
  'coppa-sponsor',
]);

let servicesPromise;
let toastTimer;

function byId(id) {
  return document.getElementById(id);
}

function value(id) {
  return byId(id)?.value?.trim() || '';
}

function checked(id) {
  return Boolean(byId(id)?.checked);
}

function showToast(message, isError = false) {
  const toast = byId('admin-toast');
  if (!toast) return;
  window.clearTimeout(toastTimer);
  toast.textContent = message;
  toast.classList.toggle('is-error', isError);
  toast.classList.add('is-visible');
  toastTimer = window.setTimeout(() => toast.classList.remove('is-visible'), 4000);
}

async function services() {
  if (servicesPromise) return servicesPromise;
  servicesPromise = Promise.all([
    import(`${FIREBASE_BASE}/firebase-app.js`),
    import(`${FIREBASE_BASE}/firebase-auth.js`),
    import(`${FIREBASE_BASE}/firebase-firestore.js`),
  ]).then(([appSdk, authSdk, firestoreSdk]) => {
    let app;
    try {
      app = appSdk.getApp();
    } catch (_) {
      app = appSdk.initializeApp(firebaseConfig);
    }
    return {
      auth: authSdk.getAuth(app),
      db: firestoreSdk.getFirestore(app),
      authSdk,
      firestoreSdk,
    };
  });
  return servicesPromise;
}

async function competitionName(id, api) {
  const snapshot = await api.firestoreSdk.getDoc(
    api.firestoreSdk.doc(api.db, 'competitions', id),
  );
  if (!snapshot.exists()) throw new Error('Competizione non trovata.');
  return snapshot.data().name;
}

function remember(tab) {
  sessionStorage.setItem('fantasavuto-admin-tab', tab);
}

function bindWinner(api) {
  const form = byId('winner-form');
  if (!form) return;
  form.addEventListener('submit', async (event) => {
    const competitionId = value('winner-competition-input');
    if (!LEGACY_IDS.has(competitionId)) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    const button = event.submitter;
    if (button) button.disabled = true;
    try {
      const name = await competitionName(competitionId, api);
      const timestamp = api.firestoreSdk.serverTimestamp();
      const payload = {
        competitionId,
        competitionName: name,
        matchday: Number.parseInt(value('winner-matchday-input'), 10),
        date: value('winner-date-input'),
        team: value('winner-team-input'),
        manager: value('winner-manager-input'),
        score: Number.parseFloat(value('winner-score-input')),
        title: value('winner-title-input'),
        updatedAt: timestamp,
      };
      const batch = api.firestoreSdk.writeBatch(api.db);
      batch.set(
        api.firestoreSdk.doc(api.firestoreSdk.collection(api.db, 'competitionWinners')),
        { ...payload, createdAt: api.firestoreSdk.serverTimestamp() },
      );
      if (checked('winner-featured-input')) {
        batch.set(api.firestoreSdk.doc(api.db, 'siteContent', 'currentWinner'), payload);
      }
      await batch.commit();
      remember('winner');
      showToast('Risultato pubblicato.');
      window.setTimeout(() => window.location.reload(), 450);
    } catch (error) {
      console.error(error);
      showToast(error.message || 'Salvataggio non riuscito.', true);
      if (button) button.disabled = false;
    }
  }, true);
}

function bindPrize(api) {
  const form = byId('prize-form');
  if (!form) return;
  form.addEventListener('submit', async (event) => {
    const competitionId = value('prize-competition-input');
    if (!LEGACY_IDS.has(competitionId)) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    const button = event.submitter;
    if (button) button.disabled = true;
    try {
      const name = await competitionName(competitionId, api);
      const prizeId = value('prize-id-input');
      let createdAt = api.firestoreSdk.serverTimestamp();
      if (prizeId) {
        const current = await api.firestoreSdk.getDoc(
          api.firestoreSdk.doc(api.db, 'prizes', prizeId),
        );
        if (current.exists()) createdAt = current.data().createdAt || createdAt;
      }
      const payload = {
        competitionId,
        competitionName: name,
        title: value('prize-title-input'),
        amount: value('prize-amount-input'),
        description: value('prize-description-input'),
        order: Number.parseInt(value('prize-order-input'), 10),
        active: checked('prize-active-input'),
        createdAt,
        updatedAt: api.firestoreSdk.serverTimestamp(),
      };
      if (prizeId) {
        await api.firestoreSdk.setDoc(api.firestoreSdk.doc(api.db, 'prizes', prizeId), payload);
      } else {
        await api.firestoreSdk.addDoc(api.firestoreSdk.collection(api.db, 'prizes'), payload);
      }
      remember('prizes');
      showToast(prizeId ? 'Premio aggiornato.' : 'Premio aggiunto.');
      window.setTimeout(() => window.location.reload(), 450);
    } catch (error) {
      console.error(error);
      showToast(error.message || 'Salvataggio del premio non riuscito.', true);
      if (button) button.disabled = false;
    }
  }, true);
}

async function initialize() {
  if (!isFirebaseConfigured || document.body.dataset.page !== 'admin') return;
  const api = await services();
  api.authSdk.onAuthStateChanged(api.auth, (user) => {
    if (!user) return;
    bindWinner(api);
    bindPrize(api);
  });
}

initialize().catch((error) => console.error('Errore override CMS Fantasavuto.', error));
