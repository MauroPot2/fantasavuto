import { firebaseConfig, isFirebaseConfigured } from './firebase-config.js';
import {
  escapeHtml,
  formatItalianDate,
  markdownToHtml,
  normalizeExternalUrl,
  safeFileName,
  sortByOrder,
  sortSponsors,
  sortWinners,
} from './site-utils.js';

const FIREBASE_VERSION = '12.18.0';
const FIREBASE_BASE = `https://www.gstatic.com/firebasejs/${FIREBASE_VERSION}`;
const COMPETITION_NAMES = {
  campionato: 'Campionato',
  'champions-savuto': 'Champions Savuto',
  'campione-inverno': 'Campione d’inverno',
  'coppa-sponsor': 'Coppa Sponsor',
};
const COMPETITION_PATHS = {
  campionato: '/competizioni/campionato',
  'champions-savuto': '/competizioni/champions-savuto',
  'campione-inverno': '/competizioni/campione-inverno',
  'coppa-sponsor': '/competizioni/coppa-sponsor',
};

let servicesPromise;
let currentSponsors = [];
let currentRegulationSections = [];
let currentPrizes = [];
let currentWinners = [];
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

async function fetchRegulationSections(services, includeInactive = false) {
  const collection = services.firestoreSdk.collection(services.db, 'regulationSections');
  const source = includeInactive
    ? collection
    : services.firestoreSdk.query(collection, services.firestoreSdk.where('active', '==', true));
  const snapshot = await services.firestoreSdk.getDocs(source);
  return sortByOrder(snapshot.docs.map((document) => ({ id: document.id, ...document.data() })));
}

function renderRegulationSections(sections) {
  const container = byId('regulation-sections');
  const toc = byId('regulation-toc-list');
  if (!container || !toc || !sections.length) return;

  const articles = [];
  const links = [];
  sections.forEach((section, index) => {
    const anchor = 'regola-' + section.id;
    const article = document.createElement('article');
    article.id = anchor;
    article.className = 'regulation-section';
    const number = document.createElement('span');
    number.className = 'regulation-section__number';
    number.textContent = String(index + 1).padStart(2, '0');
    const content = document.createElement('div');
    content.className = 'regulation-content';
    const heading = document.createElement('h2');
    heading.textContent = section.title;
    const body = document.createElement('div');
    body.className = 'regulation-content__body';
    body.innerHTML = markdownToHtml(section.markdown);
    content.append(heading, body);
    article.append(number, content);
    articles.push(article);

    const item = document.createElement('li');
    const link = document.createElement('a');
    link.href = '#' + anchor;
    link.textContent = section.title;
    item.append(link);
    links.push(item);
  });
  container.replaceChildren(...articles);
  toc.replaceChildren(...links);
}

async function loadRegulation(services) {
  const [snapshot, sections] = await Promise.all([
    services.firestoreSdk.getDoc(services.firestoreSdk.doc(services.db, 'siteContent', 'regulation')),
    fetchRegulationSections(services),
  ]);
  if (snapshot.exists()) {
    const regulation = snapshot.data();
    setText('regulation-season-badge', regulation.season || '—');
    const updatedAt = regulation.updatedAt?.toDate?.();
    if (updatedAt) {
      setText('regulation-updated-at', new Intl.DateTimeFormat('it-IT', {
        day: '2-digit', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit',
      }).format(updatedAt));
    }
  }
  renderRegulationSections(sections);
}

async function fetchPrizes(services, includeInactive = false) {
  const collection = services.firestoreSdk.collection(services.db, 'prizes');
  const source = includeInactive
    ? collection
    : services.firestoreSdk.query(collection, services.firestoreSdk.where('active', '==', true));
  const snapshot = await services.firestoreSdk.getDocs(source);
  return sortByOrder(snapshot.docs.map((document) => ({ id: document.id, ...document.data() })));
}

function renderPrizes(prizes) {
  const grid = byId('prizes-grid');
  if (!grid || !prizes.length) return;
  grid.replaceChildren(...prizes.map((prize, index) => {
    const path = COMPETITION_PATHS[prize.competitionId];
    const card = document.createElement(path ? 'a' : 'article');
    card.className = 'prize-card';
    if (path) card.href = path;
    const number = document.createElement('span');
    number.className = 'prize-card__index';
    number.textContent = String(index + 1).padStart(2, '0');
    const copy = document.createElement('div');
    const competition = document.createElement('small');
    competition.textContent = prize.competitionName || 'Premio generale';
    const title = document.createElement('h3');
    title.textContent = prize.title;
    const description = document.createElement('p');
    description.textContent = prize.description || '';
    copy.append(competition, title);
    if (prize.description) copy.append(description);
    const amount = document.createElement('strong');
    amount.className = 'prize-card__amount';
    amount.textContent = prize.amount;
    card.append(number, copy, amount);
    return card;
  }));
}

async function fetchCompetitionWinners(services, competitionId = '') {
  const collection = services.firestoreSdk.collection(services.db, 'competitionWinners');
  const source = competitionId
    ? services.firestoreSdk.query(collection, services.firestoreSdk.where('competitionId', '==', competitionId))
    : collection;
  const snapshot = await services.firestoreSdk.getDocs(source);
  return sortWinners(snapshot.docs.map((document) => ({ id: document.id, ...document.data() })));
}

function renderCompetitionWinners(winners) {
  if (!winners.length) return;
  const featured = winners[0];
  setText('competition-featured-round', 'Giornata ' + featured.matchday);
  setText('competition-featured-date', formatItalianDate(featured.date));
  setText('competition-featured-title', featured.title || 'Ultimo risultato');
  setText('competition-featured-team', featured.team);
  setText('competition-featured-manager', featured.manager ? 'Fantallenatore: ' + featured.manager : 'Fantallenatore non indicato');
  setText('competition-featured-score', Number(featured.score).toLocaleString('it-IT') + ' pt');
  const list = byId('competition-winner-list');
  if (list) {
    list.replaceChildren(...winners.slice(1).map((winner) => {
      const card = document.createElement('article');
      card.className = 'winner-history-card';
      const meta = document.createElement('div');
      const round = document.createElement('span');
      round.textContent = 'G' + winner.matchday;
      const date = document.createElement('time');
      date.dateTime = winner.date;
      date.textContent = formatItalianDate(winner.date);
      meta.append(round, date);
      const title = document.createElement('small');
      title.textContent = winner.title || 'Vincitore';
      const team = document.createElement('h3');
      team.textContent = winner.team;
      const manager = document.createElement('p');
      manager.textContent = winner.manager || 'Fantallenatore non indicato';
      const score = document.createElement('strong');
      score.textContent = Number(winner.score).toLocaleString('it-IT') + ' pt';
      card.append(meta, title, team, manager, score);
      return card;
    }));
  }
  hide(byId('competition-empty'));
  show(byId('competition-content'));
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
    const [, prizes] = await Promise.all([
      loadWinner(services),
      fetchPrizes(services),
      loadPublicSponsors(services),
    ]);
    renderPrizes(prizes);
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

async function initializeCompetition() {
  if (!isFirebaseConfigured) return;
  const competitionId = byId('main-content')?.dataset.competitionId || '';
  if (!competitionId) return;
  try {
    const services = await getServices();
    renderCompetitionWinners(await fetchCompetitionWinners(services, competitionId));
  } catch (error) {
    console.error('Impossibile caricare i vincitori della competizione.', error);
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

function normalizeAdminEmail(user) {
  return (user?.email || '').trim().toLowerCase();
}

async function isAuthorizedAdmin(user, services) {
  const email = normalizeAdminEmail(user);
  if (!email || !user.emailVerified) return false;

  const { db, firestoreSdk } = services;
  const snapshot = await firestoreSdk.getDoc(
    firestoreSdk.doc(db, 'admins', email),
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
  if (!snapshot.exists()) {
    byId('winner-date-input').value = new Date().toISOString().slice(0, 10);
    return;
  }

  const winner = snapshot.data();
  byId('winner-competition-input').value = winner.competitionId ?? 'campionato';
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
  byId('regulation-season-input').value = snapshot.data().season ?? '2026/27';
}

function renderManagedList(listId, items, describe, onEdit, onDelete, emptyText) {
  const list = byId(listId);
  if (!list) return;
  if (!items.length) {
    const empty = document.createElement('p');
    empty.className = 'empty-list';
    empty.textContent = emptyText;
    list.replaceChildren(empty);
    return;
  }
  list.replaceChildren(...items.map((item) => {
    const row = document.createElement('article');
    row.className = 'managed-item';
    const copy = document.createElement('div');
    copy.className = 'managed-item__copy';
    const title = document.createElement('strong');
    title.textContent = describe(item).title;
    const meta = document.createElement('small');
    meta.textContent = describe(item).meta;
    copy.append(title, meta);
    if ('active' in item) {
      const status = document.createElement('span');
      status.className = item.active ? 'status-pill status-pill--active' : 'status-pill';
      status.textContent = item.active ? 'Visibile' : 'Nascosto';
      copy.append(status);
    }
    const actions = document.createElement('div');
    actions.className = 'managed-item__actions';
    if (onEdit) {
      const edit = document.createElement('button');
      edit.type = 'button';
      edit.className = 'icon-button';
      edit.textContent = 'Modifica';
      edit.addEventListener('click', () => onEdit(item));
      actions.append(edit);
    }
    const remove = document.createElement('button');
    remove.type = 'button';
    remove.className = 'icon-button icon-button--danger';
    remove.textContent = 'Elimina';
    remove.addEventListener('click', () => onDelete(item));
    actions.append(remove);
    row.append(copy, actions);
    return row;
  }));
}

async function refreshAdminWinners(services) {
  currentWinners = await fetchCompetitionWinners(services);
  renderManagedList(
    'winner-admin-list',
    currentWinners.slice(0, 30),
    (winner) => ({
      title: winner.team,
      meta: (winner.competitionName || COMPETITION_NAMES[winner.competitionId]) + ' · G' + winner.matchday + ' · ' + formatItalianDate(winner.date) + ' · ' + Number(winner.score).toLocaleString('it-IT') + ' pt',
    }),
    null,
    async (winner) => {
      if (!window.confirm('Eliminare il risultato di “' + winner.team + '”?')) return;
      await services.firestoreSdk.deleteDoc(services.firestoreSdk.doc(services.db, 'competitionWinners', winner.id));
      await refreshAdminWinners(services);
      showToast('Risultato eliminato.');
    },
    'Nessun risultato pubblicato.',
  );
}

function resetRegulationSectionForm() {
  byId('regulation-section-form')?.reset();
  byId('regulation-section-id-input').value = '';
  byId('regulation-section-order-input').value = '100';
  byId('regulation-section-active-input').checked = true;
  setText('regulation-section-submit-button', 'Aggiungi sezione');
  hide(byId('regulation-section-cancel-button'));
}

function editRegulationSection(section) {
  byId('regulation-section-id-input').value = section.id;
  byId('regulation-section-title-input').value = section.title ?? '';
  byId('regulation-section-order-input').value = section.order ?? 100;
  byId('regulation-section-markdown-input').value = section.markdown ?? '';
  byId('regulation-section-active-input').checked = Boolean(section.active);
  setText('regulation-section-submit-button', 'Salva modifiche');
  show(byId('regulation-section-cancel-button'));
}

async function refreshAdminRegulationSections(services) {
  currentRegulationSections = await fetchRegulationSections(services, true);
  renderManagedList(
    'regulation-section-list',
    currentRegulationSections,
    (section) => ({ title: section.title, meta: 'Ordine ' + (section.order ?? 100) }),
    editRegulationSection,
    async (section) => {
      if (!window.confirm('Eliminare la sezione “' + section.title + '”?')) return;
      await services.firestoreSdk.deleteDoc(services.firestoreSdk.doc(services.db, 'regulationSections', section.id));
      resetRegulationSectionForm();
      await refreshAdminRegulationSections(services);
      showToast('Sezione eliminata.');
    },
    'Nessuna sezione inserita.',
  );
}

function resetPrizeForm() {
  byId('prize-form')?.reset();
  byId('prize-id-input').value = '';
  byId('prize-order-input').value = '100';
  byId('prize-active-input').checked = true;
  setText('prize-submit-button', 'Aggiungi premio');
  hide(byId('prize-cancel-button'));
}

function editPrize(prize) {
  byId('prize-id-input').value = prize.id;
  byId('prize-competition-input').value = prize.competitionId ?? 'general';
  byId('prize-title-input').value = prize.title ?? '';
  byId('prize-amount-input').value = prize.amount ?? '';
  byId('prize-description-input').value = prize.description ?? '';
  byId('prize-order-input').value = prize.order ?? 100;
  byId('prize-active-input').checked = Boolean(prize.active);
  setText('prize-submit-button', 'Salva modifiche');
  show(byId('prize-cancel-button'));
}

async function refreshAdminPrizes(services) {
  currentPrizes = await fetchPrizes(services, true);
  renderManagedList(
    'prize-admin-list',
    currentPrizes,
    (prize) => ({ title: prize.title + ' · ' + prize.amount, meta: prize.competitionName + ' · ordine ' + (prize.order ?? 100) }),
    editPrize,
    async (prize) => {
      if (!window.confirm('Eliminare il premio “' + prize.title + '”?')) return;
      await services.firestoreSdk.deleteDoc(services.firestoreSdk.doc(services.db, 'prizes', prize.id));
      resetPrizeForm();
      await refreshAdminPrizes(services);
      showToast('Premio eliminato.');
    },
    'Nessun premio inserito.',
  );
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
      const competitionId = readInput('winner-competition-input');
      const payload = {
        competitionId,
        competitionName: COMPETITION_NAMES[competitionId],
        matchday: Number.parseInt(readInput('winner-matchday-input'), 10),
        date: readInput('winner-date-input'),
        team: readInput('winner-team-input'),
        manager: readInput('winner-manager-input'),
        score: Number.parseFloat(readInput('winner-score-input')),
        title: readInput('winner-title-input'),
        updatedAt: services.firestoreSdk.serverTimestamp(),
      };
      const batch = services.firestoreSdk.writeBatch(services.db);
      batch.set(
        services.firestoreSdk.doc(services.firestoreSdk.collection(services.db, 'competitionWinners')),
        { ...payload, createdAt: services.firestoreSdk.serverTimestamp() },
      );
      if (byId('winner-featured-input')?.checked) {
        batch.set(services.firestoreSdk.doc(services.db, 'siteContent', 'currentWinner'), payload);
      }
      await batch.commit();
      byId('winner-form')?.reset();
      byId('winner-date-input').value = new Date().toISOString().slice(0, 10);
      byId('winner-title-input').value = 'Vincitore di giornata';
      byId('winner-featured-input').checked = true;
      await refreshAdminWinners(services);
      showToast('Risultato pubblicato nello storico.');
    } catch (error) {
      console.error(error);
      showToast('Salvataggio non riuscito. Controlla i dati e riprova.', true);
    } finally {
      if (submitButton) submitButton.disabled = false;
    }
  });
}

function bindRegulationForms(services) {
  byId('regulation-meta-form')?.addEventListener('submit', async (event) => {
    event.preventDefault();

    const submitButton = event.submitter;
    if (submitButton) submitButton.disabled = true;

    try {
      await services.firestoreSdk.setDoc(
        services.firestoreSdk.doc(services.db, 'siteContent', 'regulation'),
        {
          season: readInput('regulation-season-input'),
          updatedAt: services.firestoreSdk.serverTimestamp(),
        },
      );
      showToast('Stagione aggiornata.');
    } catch (error) {
      console.error(error);
      showToast('Non è stato possibile aggiornare il regolamento.', true);
    } finally {
      if (submitButton) submitButton.disabled = false;
    }
  });

  byId('regulation-section-cancel-button')?.addEventListener('click', resetRegulationSectionForm);
  byId('regulation-section-form')?.addEventListener('submit', async (event) => {
    event.preventDefault();
    const submitButton = event.submitter;
    if (submitButton) submitButton.disabled = true;
    try {
      const sectionId = readInput('regulation-section-id-input');
      const existing = currentRegulationSections.find((item) => item.id === sectionId);
      const payload = {
        title: readInput('regulation-section-title-input'),
        markdown: readInput('regulation-section-markdown-input'),
        order: Number.parseInt(readInput('regulation-section-order-input'), 10),
        active: Boolean(byId('regulation-section-active-input')?.checked),
        createdAt: existing?.createdAt || services.firestoreSdk.serverTimestamp(),
        updatedAt: services.firestoreSdk.serverTimestamp(),
      };
      if (sectionId) {
        await services.firestoreSdk.setDoc(services.firestoreSdk.doc(services.db, 'regulationSections', sectionId), payload);
      } else {
        await services.firestoreSdk.addDoc(services.firestoreSdk.collection(services.db, 'regulationSections'), payload);
      }
      resetRegulationSectionForm();
      await refreshAdminRegulationSections(services);
      showToast(sectionId ? 'Sezione aggiornata.' : 'Sezione aggiunta.');
    } catch (error) {
      console.error(error);
      showToast('Salvataggio della sezione non riuscito.', true);
    } finally {
      if (submitButton) submitButton.disabled = false;
    }
  });
}

function bindPrizeForm(services) {
  byId('prize-cancel-button')?.addEventListener('click', resetPrizeForm);
  byId('prize-form')?.addEventListener('submit', async (event) => {
    event.preventDefault();
    const submitButton = event.submitter;
    if (submitButton) submitButton.disabled = true;
    try {
      const prizeId = readInput('prize-id-input');
      const existing = currentPrizes.find((item) => item.id === prizeId);
      const competitionId = readInput('prize-competition-input');
      const payload = {
        competitionId,
        competitionName: competitionId === 'general' ? 'Premio generale' : COMPETITION_NAMES[competitionId],
        title: readInput('prize-title-input'),
        amount: readInput('prize-amount-input'),
        description: readInput('prize-description-input'),
        order: Number.parseInt(readInput('prize-order-input'), 10),
        active: Boolean(byId('prize-active-input')?.checked),
        createdAt: existing?.createdAt || services.firestoreSdk.serverTimestamp(),
        updatedAt: services.firestoreSdk.serverTimestamp(),
      };
      if (prizeId) {
        await services.firestoreSdk.setDoc(services.firestoreSdk.doc(services.db, 'prizes', prizeId), payload);
      } else {
        await services.firestoreSdk.addDoc(services.firestoreSdk.collection(services.db, 'prizes'), payload);
      }
      resetPrizeForm();
      await refreshAdminPrizes(services);
      showToast(prizeId ? 'Premio aggiornato.' : 'Premio aggiunto.');
    } catch (error) {
      console.error(error);
      showToast('Salvataggio del premio non riuscito.', true);
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
    refreshAdminWinners(services),
    refreshAdminRegulationSections(services),
    refreshAdminPrizes(services),
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
    bindRegulationForms(services);
    bindPrizeForm(services);
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

      const email = normalizeAdminEmail(user);
      const label = document.querySelector('#admin-unauthorized .uid-box span');
      if (label) label.textContent = 'Email da autorizzare';
      setText('admin-user-uid', email || 'Email non disponibile');
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
  if (page === 'competition') await initializeCompetition();
  if (page === 'admin') await initializeAdmin();
}

initializePage();
