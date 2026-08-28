import { firebaseConfig, isFirebaseConfigured } from './firebase-config.js';
import {
  escapeHtml,
  formatItalianDate,
  markdownToHtml,
  normalizeExternalUrl,
  safeFileName,
  sortSponsors,
} from './site-utils.js';

const FIREBASE_VERSION = '12.18.0';
const FIREBASE_BASE = `https://www.gstatic.com/firebasejs/${FIREBASE_VERSION}`;

let servicesPromise;
let currentSponsors = [];
let toastTimer;

function getServices() {
  if (servicesPromise) return servicesPromise;

  servicesPromise = Promise.all([
    import(`${FIREBASE_BASE}/firebase-app.js`),
    import(`${FIREBASE_BASE}/firebase-auth.js`),
    import(`${FIREBASE_BASE}/firebase-firestore.js`),
    import(`${FIREBASE_BASE}/firebase-storage.js`),
  ]).then(([appSdk, authSdk, firestoreSdk, storageSdk]) => {
    const app = appSdk.initializeApp(firebaseConfig);
    return {
      app,
      auth: authSdk.getAuth(app),
      db: firestoreSdk.getFirestore(app),
      storage: storageSdk.getStorage(app),
      authSdk,
      firestoreSdk,
      storageSdk,
    };
  });

  return servicesPromise;
}

function byId(id) {
  return document.getElementById(id);
}

function setText(id, value) {
  const element = byId(id);
  if (element) element.textContent = value;
}

function show(element) {
  element?.classList.remove('is-hidden');
}

function hide(element) {
  element?.classList.add('is-hidden');
}

function showToast(message, isError = false) {
  const toast = byId('admin-toast');
  if (!toast) return;

  window.clearTimeout(toastTimer);
  toast.textContent = message;
  toast.classList.toggle('is-error', isError);
  toast.classList.add('is-visible');
  toastTimer = window.setTimeout(() => {
    toast.classList.remove('is-visible');
  }, 3600);
}

async function loadWinner(services) {
  const { db, firestoreSdk } = services;
  const snapshot = await firestoreSdk.getDoc(
    firestoreSdk.doc(db, 'siteContent', 'currentWinner'),
  );
  if (!snapshot.exists()) return;

  const winner = snapshot.data();
  setText('winner-matchday', `G${winner.matchday}`);
  setText('winner-kicker', winner.title || 'Vincitore di giornata');
  setText('winner-card-title', winner.team || '—');
  setText(
    'winner-manager',
    winner.manager ? `Fantallenatore: ${winner.manager}` : 'Fantallenatore non indicato',
  );
  setText('winner-score', Number(winner.score).toLocaleString('it-IT'));
  setText('winner-date', formatItalianDate(winner.date));
}

async function loadRegulation(services) {
  const { db, firestoreSdk } = services;
  const snapshot = await firestoreSdk.getDoc(
    firestoreSdk.doc(db, 'siteContent', 'regulation'),
  );
  if (!snapshot.exists()) return;

  const regulation = snapshot.data();
  const content = byId('regulation-content');
  if (content && regulation.markdown) {
    content.innerHTML = markdownToHtml(regulation.markdown);
  }
  setText('regulation-season-badge', regulation.season || '—');

  const updatedAt = regulation.updatedAt?.toDate?.();
  if (updatedAt) {
    setText(
      'regulation-updated-at',
      new Intl.DateTimeFormat('it-IT', {
        day: '2-digit',
        month: 'long',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      }).format(updatedAt),
    );
  }
}

function createSponsorLink(sponsor, duplicate = false) {
  const websiteUrl = normalizeExternalUrl(sponsor.websiteUrl);
  const item = document.createElement(websiteUrl ? 'a' : 'div');
  item.className = 'sponsor-item';

  if (item instanceof HTMLAnchorElement) {
    item.href = websiteUrl;
    item.target = '_blank';
    item.rel = 'noopener noreferrer';
    item.setAttribute('aria-label', `Visita il sito di ${sponsor.name}`);
  }

  if (duplicate) {
    item.setAttribute('aria-hidden', 'true');
    if (item instanceof HTMLAnchorElement) item.tabIndex = -1;
  }

  const image = document.createElement('img');
  image.src = sponsor.logoUrl;
  image.alt = sponsor.name;
  image.loading = 'lazy';
  image.decoding = 'async';
  item.append(image);

  return item;
}

function renderSponsorBand(sponsors) {
  const band = byId('sponsor-section');
  const track = byId('sponsor-track');
  if (!band || !track) return;

  const activeSponsors = sortSponsors(
    sponsors.filter((sponsor) => sponsor.active && sponsor.logoUrl),
  );
  if (!activeSponsors.length) {
    hide(band);
    track.replaceChildren();
    return;
  }

  const originals = activeSponsors.map((sponsor) => createSponsorLink(sponsor));
  const duplicates = activeSponsors.map((sponsor) => createSponsorLink(sponsor, true));
  track.replaceChildren(...originals, ...duplicates);
  track.classList.toggle('sponsor-track--static', activeSponsors.length === 1);
  show(band);
}

async function fetchSponsors(services, includeInactive = false) {
  const { db, firestoreSdk } = services;
  const collection = firestoreSdk.collection(db, 'sponsors');
  const source = includeInactive
    ? collection
    : firestoreSdk.query(
        collection,
        firestoreSdk.where('active', '==', true),
      );
  const snapshot = await firestoreSdk.getDocs(
    source,
  );
  return snapshot.docs.map((document) => ({
    id: document.id,
    ...document.data(),
  }));
}

async function loadPublicSponsors(services) {
  const sponsors = await fetchSponsors(services);
  renderSponsorBand(sponsors);
}

async function initializeHome() {
  if (!isFirebaseConfigured) return;

  try {
    const services = await getServices();
    await Promise.all([loadWinner(services), loadPublicSponsors(services)]);
  } catch (error) {
    console.error('Impossibile caricare i contenuti pubblici.', error);
  }
}

async function initializeRegulation() {
  if (!isFirebaseConfigured) return;

  try {
    const services = await getServices();
    await loadRegulation(services);
  } catch (error) {
    console.error('Impossibile caricare il regolamento.', error);
  }
}

function selectAdminTab(tabName) {
  document.querySelectorAll('[data-admin-tab]').forEach((button) => {
    button.classList.toggle('is-active', button.dataset.adminTab === tabName);
  });
  document.querySelectorAll('[data-admin-panel]').forEach((panel) => {
    panel.classList.toggle('is-hidden', panel.dataset.adminPanel !== tabName);
  });
}

function bindAdminTabs() {
  document.querySelectorAll('[data-admin-tab]').forEach((button) => {
    button.addEventListener('click', () => selectAdminTab(button.dataset.adminTab));
  });
}

function populateAdminUser(user) {
  setText('admin-user-name', user.displayName || 'Amministratore');
  setText('admin-user-email', user.email || '');
  setText(
    'admin-user-avatar',
    (user.displayName || user.email || 'A').trim().charAt(0).toUpperCase(),
  );
}

async function isAuthorizedAdmin(user, services) {
  const { db, firestoreSdk } = services;
  const snapshot = await firestoreSdk.getDoc(
    firestoreSdk.doc(db, 'admins', user.uid),
  );
  return snapshot.exists();
}

function readInput(id) {
  return byId(id)?.value?.trim() || '';
}

async function loadAdminWinner(services) {
  const { db, firestoreSdk } = services;
  const snapshot = await firestoreSdk.getDoc(
    firestoreSdk.doc(db, 'siteContent', 'currentWinner'),
  );
  if (!snapshot.exists()) return;

  const winner = snapshot.data();
  byId('winner-matchday-input').value = winner.matchday ?? '';
  byId('winner-date-input').value = winner.date ?? '';
  byId('winner-team-input').value = winner.team ?? '';
  byId('winner-manager-input').value = winner.manager ?? '';
  byId('winner-score-input').value = winner.score ?? '';
  byId('winner-title-input').value = winner.title ?? '';
}

async function loadAdminRegulation(services) {
  const { db, firestoreSdk } = services;
  const snapshot = await firestoreSdk.getDoc(
    firestoreSdk.doc(db, 'siteContent', 'regulation'),
  );
  if (!snapshot.exists()) return;

  const regulation = snapshot.data();
  byId('regulation-season-input').value = regulation.season ?? '2025/26';
  byId('regulation-markdown-input').value = regulation.markdown ?? '';
}

function resetSponsorForm() {
  const form = byId('sponsor-form');
  form?.reset();
  byId('sponsor-id-input').value = '';
  byId('sponsor-order-input').value = '100';
  byId('sponsor-active-input').checked = true;
  setText('sponsor-submit-button', 'Aggiungi sponsor');
  hide(byId('sponsor-cancel-button'));
}

function editSponsor(sponsor) {
  byId('sponsor-id-input').value = sponsor.id;
  byId('sponsor-name-input').value = sponsor.name ?? '';
  byId('sponsor-website-input').value = sponsor.websiteUrl ?? '';
  byId('sponsor-order-input').value = sponsor.order ?? 100;
  byId('sponsor-logo-url-input').value = sponsor.logoUrl ?? '';
  byId('sponsor-active-input').checked = Boolean(sponsor.active);
  setText('sponsor-submit-button', 'Salva modifiche');
  show(byId('sponsor-cancel-button'));
  byId('sponsor-name-input')?.focus();
}

function createAdminSponsorItem(sponsor, services) {
  const item = document.createElement('article');
  item.className = 'sponsor-admin-item';

  const logo = document.createElement('div');
  logo.className = 'sponsor-admin-item__logo';
  const image = document.createElement('img');
  image.src = sponsor.logoUrl;
  image.alt = '';
  logo.append(image);

  const copy = document.createElement('div');
  copy.className = 'sponsor-admin-item__copy';
  const name = document.createElement('strong');
  name.textContent = sponsor.name;
  const meta = document.createElement('small');
  meta.textContent = `Ordine ${sponsor.order ?? 100}`;
  const status = document.createElement('span');
  status.className = sponsor.active
    ? 'status-pill status-pill--active'
    : 'status-pill';
  status.textContent = sponsor.active ? 'Attivo' : 'Nascosto';
  copy.append(name, meta, status);

  const actions = document.createElement('div');
  actions.className = 'sponsor-admin-item__actions';

  const toggle = document.createElement('button');
  toggle.type = 'button';
  toggle.className = 'icon-button';
  toggle.textContent = sponsor.active ? 'Nascondi' : 'Attiva';
  toggle.addEventListener('click', async () => {
    try {
      await services.firestoreSdk.updateDoc(
        services.firestoreSdk.doc(services.db, 'sponsors', sponsor.id),
        {
          active: !sponsor.active,
          updatedAt: services.firestoreSdk.serverTimestamp(),
        },
      );
      await refreshAdminSponsors(services);
      showToast('Visibilità dello sponsor aggiornata.');
    } catch (error) {
      console.error(error);
      showToast('Non è stato possibile aggiornare lo sponsor.', true);
    }
  });

  const edit = document.createElement('button');
  edit.type = 'button';
  edit.className = 'icon-button';
  edit.textContent = 'Modifica';
  edit.addEventListener('click', () => editSponsor(sponsor));

  const remove = document.createElement('button');
  remove.type = 'button';
  remove.className = 'icon-button icon-button--danger';
  remove.textContent = 'Elimina';
  remove.addEventListener('click', async () => {
    const confirmed = window.confirm(
      `Eliminare definitivamente lo sponsor “${sponsor.name}”?`,
    );
    if (!confirmed) return;

    try {
      await services.firestoreSdk.deleteDoc(
        services.firestoreSdk.doc(services.db, 'sponsors', sponsor.id),
      );
      if (sponsor.storagePath) {
        await services.storageSdk
          .deleteObject(services.storageSdk.ref(services.storage, sponsor.storagePath))
          .catch(() => undefined);
      }
      resetSponsorForm();
      await refreshAdminSponsors(services);
      showToast('Sponsor eliminato.');
    } catch (error) {
      console.error(error);
      showToast('Non è stato possibile eliminare lo sponsor.', true);
    }
  });

  actions.append(toggle, edit, remove);
  item.append(logo, copy, actions);
  return item;
}

async function refreshAdminSponsors(services) {
  currentSponsors = sortSponsors(await fetchSponsors(services, true));
  const list = byId('sponsor-admin-list');
  if (!list) return;

  if (!currentSponsors.length) {
    const empty = document.createElement('p');
    empty.className = 'empty-list';
    empty.textContent = 'Nessuno sponsor inserito.';
    list.replaceChildren(empty);
    return;
  }

  list.replaceChildren(
    ...currentSponsors.map((sponsor) =>
      createAdminSponsorItem(sponsor, services),
    ),
  );
}

function bindWinnerForm(services) {
  byId('winner-form')?.addEventListener('submit', async (event) => {
    event.preventDefault();

    const submitButton = event.submitter;
    if (submitButton) submitButton.disabled = true;

    try {
      await services.firestoreSdk.setDoc(
        services.firestoreSdk.doc(services.db, 'siteContent', 'currentWinner'),
        {
          matchday: Number.parseInt(readInput('winner-matchday-input'), 10),
          date: readInput('winner-date-input'),
          team: readInput('winner-team-input'),
          manager: readInput('winner-manager-input'),
          score: Number.parseFloat(readInput('winner-score-input')),
          title: readInput('winner-title-input'),
          updatedAt: services.firestoreSdk.serverTimestamp(),
        },
      );
      showToast('Vincitore pubblicato nella home.');
    } catch (error) {
      console.error(error);
      showToast('Salvataggio non riuscito. Controlla i dati e riprova.', true);
    } finally {
      if (submitButton) submitButton.disabled = false;
    }
  });
}

function bindRegulationForm(services) {
  byId('regulation-form')?.addEventListener('submit', async (event) => {
    event.preventDefault();

    const submitButton = event.submitter;
    if (submitButton) submitButton.disabled = true;

    try {
      await services.firestoreSdk.setDoc(
        services.firestoreSdk.doc(services.db, 'siteContent', 'regulation'),
        {
          season: readInput('regulation-season-input'),
          markdown: readInput('regulation-markdown-input'),
          updatedAt: services.firestoreSdk.serverTimestamp(),
        },
      );
      showToast('Regolamento aggiornato.');
    } catch (error) {
      console.error(error);
      showToast('Non è stato possibile aggiornare il regolamento.', true);
    } finally {
      if (submitButton) submitButton.disabled = false;
    }
  });
}

async function uploadSponsorLogo(file, sponsorName, services) {
  const path = `sponsors/${Date.now()}-${safeFileName(file.name || sponsorName)}`;
  const reference = services.storageSdk.ref(services.storage, path);
  await services.storageSdk.uploadBytes(reference, file, {
    contentType: file.type,
    customMetadata: { sponsorName },
  });
  return {
    logoUrl: await services.storageSdk.getDownloadURL(reference),
    storagePath: path,
  };
}

function bindSponsorForm(services) {
  byId('sponsor-cancel-button')?.addEventListener('click', resetSponsorForm);

  byId('sponsor-form')?.addEventListener('submit', async (event) => {
    event.preventDefault();

    const submitButton = event.submitter;
    if (submitButton) submitButton.disabled = true;

    try {
      const sponsorId = readInput('sponsor-id-input');
      const existing = currentSponsors.find((sponsor) => sponsor.id === sponsorId);
      const name = readInput('sponsor-name-input');
      const file = byId('sponsor-logo-input')?.files?.[0];
      let logoUrl = normalizeExternalUrl(readInput('sponsor-logo-url-input'));
      let storagePath = existing?.storagePath || '';
      const previousStoragePath = existing?.storagePath || '';

      if (file) {
        if (file.size >= 5 * 1024 * 1024) {
          throw new Error('Il logo supera il limite di 5 MB.');
        }
        const uploaded = await uploadSponsorLogo(file, name, services);
        logoUrl = uploaded.logoUrl;
        storagePath = uploaded.storagePath;
      } else if (logoUrl && logoUrl !== existing?.logoUrl) {
        storagePath = '';
      } else if (!logoUrl && existing?.logoUrl) {
        logoUrl = existing.logoUrl;
      }

      if (!logoUrl) {
        throw new Error('Carica un logo oppure inserisci un URL valido.');
      }

      const payload = {
        name,
        logoUrl,
        storagePath,
        websiteUrl: normalizeExternalUrl(readInput('sponsor-website-input')),
        active: Boolean(byId('sponsor-active-input')?.checked),
        order: Number.parseInt(readInput('sponsor-order-input'), 10),
        updatedAt: services.firestoreSdk.serverTimestamp(),
      };

      if (sponsorId) {
        await services.firestoreSdk.setDoc(
          services.firestoreSdk.doc(services.db, 'sponsors', sponsorId),
          {
            ...payload,
            createdAt: existing?.createdAt || services.firestoreSdk.serverTimestamp(),
          },
        );
      } else {
        await services.firestoreSdk.addDoc(
          services.firestoreSdk.collection(services.db, 'sponsors'),
          {
            ...payload,
            createdAt: services.firestoreSdk.serverTimestamp(),
          },
        );
      }

      if (previousStoragePath && previousStoragePath !== storagePath) {
        await services.storageSdk
          .deleteObject(services.storageSdk.ref(services.storage, previousStoragePath))
          .catch(() => undefined);
      }

      resetSponsorForm();
      await refreshAdminSponsors(services);
      showToast(sponsorId ? 'Sponsor aggiornato.' : 'Sponsor aggiunto.');
    } catch (error) {
      console.error(error);
      showToast(error.message || 'Salvataggio dello sponsor non riuscito.', true);
    } finally {
      if (submitButton) submitButton.disabled = false;
    }
  });
}

async function openAdminShell(user, services) {
  hide(byId('admin-loading'));
  hide(byId('admin-login'));
  hide(byId('admin-unauthorized'));
  show(byId('admin-shell'));
  populateAdminUser(user);

  await Promise.all([
    loadAdminWinner(services),
    loadAdminRegulation(services),
    refreshAdminSponsors(services),
  ]);
}

async function initializeAdmin() {
  bindAdminTabs();

  if (!isFirebaseConfigured) {
    hide(byId('admin-loading'));
    show(byId('admin-config-missing'));
    return;
  }

  try {
    const services = await getServices();
    bindWinnerForm(services);
    bindRegulationForm(services);
    bindSponsorForm(services);

    byId('google-login-button')?.addEventListener('click', async () => {
      try {
        const provider = new services.authSdk.GoogleAuthProvider();
        provider.setCustomParameters({ prompt: 'select_account' });
        await services.authSdk.signInWithPopup(services.auth, provider);
      } catch (error) {
        if (error.code !== 'auth/popup-closed-by-user') {
          console.error(error);
          showToast('Accesso Google non riuscito.', true);
        }
      }
    });

    const logout = () => services.authSdk.signOut(services.auth);
    byId('logout-button')?.addEventListener('click', logout);
    byId('unauthorized-logout-button')?.addEventListener('click', logout);

    services.authSdk.onAuthStateChanged(services.auth, async (user) => {
      hide(byId('admin-loading'));
      hide(byId('admin-shell'));
      hide(byId('admin-unauthorized'));

      if (!user) {
        show(byId('admin-login'));
        return;
      }

      hide(byId('admin-login'));
      try {
        if (await isAuthorizedAdmin(user, services)) {
          await openAdminShell(user, services);
          return;
        }
      } catch (error) {
        if (error.code !== 'permission-denied') console.error(error);
      }

      setText('admin-user-uid', user.uid);
      show(byId('admin-unauthorized'));
    });
  } catch (error) {
    console.error(error);
    hide(byId('admin-loading'));
    show(byId('admin-config-missing'));
  }
}

async function initializePage() {
  const page = document.body.dataset.page;
  if (page === 'home') await initializeHome();
  if (page === 'regulation') await initializeRegulation();
  if (page === 'admin') await initializeAdmin();
}

initializePage();
