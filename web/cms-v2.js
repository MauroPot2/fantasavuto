import { firebaseConfig, isFirebaseConfigured } from './firebase-config.js';

const FIREBASE_VERSION = '12.18.0';
const FIREBASE_BASE = `https://www.gstatic.com/firebasejs/${FIREBASE_VERSION}`;
const LEGACY_COMPETITION_PATHS = {
  campionato: '/competizioni/campionato',
  'champions-savuto': '/competizioni/champions-savuto',
  'campione-inverno': '/competizioni/campione-inverno',
  'coppa-sponsor': '/competizioni/coppa-sponsor',
};
const LEGACY_COMPETITION_IDS = new Set(Object.keys(LEGACY_COMPETITION_PATHS));
const ALLOWED_IMAGE_TYPES = new Set([
  'image/png',
  'image/jpeg',
  'image/webp',
  'image/svg+xml',
]);

let servicesPromise;
let toastTimer;

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

function showToast(message, isError = false) {
  const toast = byId('admin-toast');
  if (!toast) return;
  window.clearTimeout(toastTimer);
  toast.textContent = message;
  toast.classList.toggle('is-error', isError);
  toast.classList.add('is-visible');
  toastTimer = window.setTimeout(() => toast.classList.remove('is-visible'), 4200);
}

function serverTimestamp(services) {
  return services.firestoreSdk.serverTimestamp();
}

function normalizeSlug(value) {
  return (value || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80);
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

function safeFileName(value) {
  return (value || 'logo')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9._-]+/g, '-')
    .replace(/^-+|-+$/g, '') || 'logo';
}

async function getServices() {
  if (servicesPromise) return servicesPromise;

  servicesPromise = Promise.all([
    import(`${FIREBASE_BASE}/firebase-app.js`),
    import(`${FIREBASE_BASE}/firebase-auth.js`),
    import(`${FIREBASE_BASE}/firebase-firestore.js`),
    import(`${FIREBASE_BASE}/firebase-storage.js`),
  ]).then(([appSdk, authSdk, firestoreSdk, storageSdk]) => {
    let app;
    try {
      app = appSdk.getApp();
    } catch (_) {
      app = appSdk.initializeApp(firebaseConfig);
    }
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

async function isAdmin(user, services) {
  const email = (user?.email || '').trim().toLowerCase();
  if (!email || !user.emailVerified) return false;
  const snapshot = await services.firestoreSdk.getDoc(
    services.firestoreSdk.doc(services.db, 'admins', email),
  );
  return snapshot.exists();
}

function rememberAdminTab(tab) {
  sessionStorage.setItem('fantasavuto-admin-tab', tab);
}

function restoreAdminTab() {
  const tab = sessionStorage.getItem('fantasavuto-admin-tab');
  if (!tab) return;
  sessionStorage.removeItem('fantasavuto-admin-tab');
  window.setTimeout(() => {
    document.querySelector(`[data-admin-tab="${tab}"]`)?.click();
  }, 80);
}

async function waitForElement(selector, timeoutMs = 6000) {
  const existing = document.querySelector(selector);
  if (existing) return existing;

  return new Promise((resolve) => {
    const timeout = window.setTimeout(() => {
      observer.disconnect();
      resolve(null);
    }, timeoutMs);
    const observer = new MutationObserver(() => {
      const element = document.querySelector(selector);
      if (!element) return;
      window.clearTimeout(timeout);
      observer.disconnect();
      resolve(element);
    });
    observer.observe(document.documentElement, { childList: true, subtree: true });
  });
}

function competitionPublicPath(id) {
  return LEGACY_COMPETITION_PATHS[id]
    || `/competizioni/dettaglio?id=${encodeURIComponent(id)}`;
}

async function fetchActiveCompetitions(services) {
  const query = services.firestoreSdk.query(
    services.firestoreSdk.collection(services.db, 'competitions'),
    services.firestoreSdk.where('active', '==', true),
  );
  const snapshot = await services.firestoreSdk.getDocs(query);
  return snapshot.docs
    .map((document) => ({ id: document.id, ...document.data() }))
    .sort((a, b) => (a.order ?? 100) - (b.order ?? 100));
}

function createCompetitionCard(competition, index) {
  const card = document.createElement('a');
  card.href = competitionPublicPath(competition.id);
  card.className = `competition-card competition-card--${competition.accent || 'lime'}`;
  card.dataset.competitionId = competition.id;

  const meta = document.createElement('div');
  meta.className = 'competition-card__meta';
  const number = document.createElement('span');
  number.textContent = String(index + 1).padStart(2, '0');
  const tag = document.createElement('small');
  tag.textContent = competition.tagline || '';
  meta.append(number, tag);

  const copy = document.createElement('div');
  copy.className = 'competition-card__copy';
  const title = document.createElement('h3');
  title.textContent = competition.name || competition.id;
  const description = document.createElement('p');
  description.textContent = competition.description || '';
  copy.append(title, description);

  const arrow = document.createElement('span');
  arrow.className = 'competition-card__arrow';
  arrow.setAttribute('aria-hidden', 'true');
  arrow.textContent = '↘';
  card.append(meta, copy, arrow);
  return card;
}

async function renderDynamicHomeCompetitions(services) {
  const grid = document.querySelector('.competition-grid');
  if (!grid) return;
  const competitions = await fetchActiveCompetitions(services);
  if (!competitions.length) return;
  grid.replaceChildren(...competitions.map(createCompetitionCard));
}

function setCompetitionHero(competition) {
  const main = byId('main-content');
  if (!main) return;
  [...main.classList]
    .filter((className) => className.startsWith('competition-page--'))
    .forEach((className) => main.classList.remove(className));
  main.classList.add(`competition-page--${competition.accent || 'lime'}`);
  main.dataset.competitionId = competition.id;
  main.dataset.competitionName = competition.name || competition.id;

  const eyebrow = document.querySelector('.competition-page__hero .eyebrow');
  const heading = document.querySelector('.competition-page__hero h1');
  const heroCopy = document.querySelector('.competition-page__hero-grid > div');
  const paragraphs = heroCopy ? [...heroCopy.querySelectorAll(':scope > p')] : [];
  const description = paragraphs.at(-1);
  if (eyebrow) eyebrow.textContent = competition.tagline || 'Competizione';
  if (heading) heading.textContent = competition.name || competition.id;
  if (description) description.textContent = competition.description || '';
  document.title = `${competition.name || 'Competizione'} | Fantasavuto`;
}

function sortWinners(winners) {
  return [...winners].sort((a, b) => {
    if ((a.date || '') !== (b.date || '')) return (b.date || '').localeCompare(a.date || '');
    if ((a.matchday ?? 0) !== (b.matchday ?? 0)) return (b.matchday ?? 0) - (a.matchday ?? 0);
    return 0;
  });
}

function formatDate(value) {
  if (!value) return '—';
  const date = new Date(`${value}T12:00:00`);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat('it-IT', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(date);
}

function renderDynamicCompetitionWinners(winners) {
  const empty = byId('competition-empty');
  const content = byId('competition-content');
  const list = byId('competition-winner-list');
  if (!winners.length) {
    empty?.classList.remove('is-hidden');
    content?.classList.add('is-hidden');
    return;
  }

  const sorted = sortWinners(winners);
  const featured = sorted[0];
  byId('competition-featured-round').textContent = `Giornata ${featured.matchday ?? '—'}`;
  byId('competition-featured-date').textContent = formatDate(featured.date);
  byId('competition-featured-title').textContent = featured.title || 'Ultimo risultato';
  byId('competition-featured-team').textContent = featured.team || '—';
  byId('competition-featured-manager').textContent = featured.manager
    ? `Fantallenatore: ${featured.manager}`
    : 'Fantallenatore non indicato';
  byId('competition-featured-score').textContent = `${Number(featured.score || 0).toLocaleString('it-IT')} pt`;

  const cards = sorted.slice(1).map((winner) => {
    const card = document.createElement('article');
    card.className = 'winner-history-card';
    const meta = document.createElement('div');
    const round = document.createElement('span');
    round.textContent = `G${winner.matchday ?? '—'}`;
    const date = document.createElement('time');
    date.dateTime = winner.date || '';
    date.textContent = formatDate(winner.date);
    meta.append(round, date);
    const title = document.createElement('small');
    title.textContent = winner.title || 'Vincitore';
    const team = document.createElement('h3');
    team.textContent = winner.team || '—';
    const manager = document.createElement('p');
    manager.textContent = winner.manager || 'Fantallenatore non indicato';
    const score = document.createElement('strong');
    score.textContent = `${Number(winner.score || 0).toLocaleString('it-IT')} pt`;
    card.append(meta, title, team, manager, score);
    return card;
  });
  list?.replaceChildren(...cards);
  empty?.classList.add('is-hidden');
  content?.classList.remove('is-hidden');
}

async function initializeDynamicCompetitionPage(services) {
  if (window.location.pathname !== '/competizioni/dettaglio') return;
  const id = normalizeSlug(new URLSearchParams(window.location.search).get('id') || '');
  if (!id) return;

  const competitionSnapshot = await services.firestoreSdk.getDoc(
    services.firestoreSdk.doc(services.db, 'competitions', id),
  );
  if (!competitionSnapshot.exists() || competitionSnapshot.data().active !== true) {
    const heading = document.querySelector('.competition-page__hero h1');
    if (heading) heading.textContent = 'Competizione non disponibile';
    byId('competition-content')?.classList.add('is-hidden');
    return;
  }

  const competition = { id: competitionSnapshot.id, ...competitionSnapshot.data() };
  setCompetitionHero(competition);
  const winnersSnapshot = await services.firestoreSdk.getDocs(
    services.firestoreSdk.query(
      services.firestoreSdk.collection(services.db, 'competitionWinners'),
      services.firestoreSdk.where('competitionId', '==', id),
    ),
  );
  renderDynamicCompetitionWinners(
    winnersSnapshot.docs.map((document) => ({ id: document.id, ...document.data() })),
  );
}

function createNewCompetitionForm() {
  const wrapper = document.createElement('div');
  wrapper.className = 'cms-v2-create-competition';
  wrapper.innerHTML = `
    <div class="admin-subsection__heading">
      <h3>Nuova competizione</h3>
      <p>Crea una nuova competizione senza modificare il codice o fare un deploy dedicato.</p>
    </div>
    <form id="cms-v2-new-competition-form" class="admin-form">
      <div class="form-grid form-grid--2">
        <div class="field"><label for="cms-v2-competition-name">Nome</label><input id="cms-v2-competition-name" maxlength="80" required placeholder="Es. Coppa Calabria"></div>
        <div class="field"><label for="cms-v2-competition-slug">Slug / ID</label><input id="cms-v2-competition-slug" maxlength="80" required pattern="[a-z0-9]+(?:-[a-z0-9]+)*" placeholder="coppa-calabria"><small>Diventa l'identificativo permanente della competizione.</small></div>
      </div>
      <div class="form-grid form-grid--2">
        <div class="field"><label for="cms-v2-competition-tagline">Etichetta breve</label><input id="cms-v2-competition-tagline" maxlength="80" required placeholder="Es. Eliminazione diretta"></div>
        <div class="field"><label for="cms-v2-competition-order">Ordine</label><input id="cms-v2-competition-order" type="number" min="0" max="9999" value="100" required></div>
      </div>
      <div class="field"><label for="cms-v2-competition-description">Descrizione</label><textarea id="cms-v2-competition-description" maxlength="500" rows="4" required></textarea></div>
      <div class="field"><label for="cms-v2-competition-accent">Colore</label><select id="cms-v2-competition-accent"><option value="lime">Lime</option><option value="orange">Arancione</option><option value="blue">Blu</option><option value="pink">Rosa</option></select></div>
      <label class="switch-field"><input id="cms-v2-competition-active" type="checkbox" checked><span class="switch-control"></span><span>Mostra subito la competizione sul sito</span></label>
      <div class="form-actions"><button class="button button--primary" type="submit">Crea competizione</button></div>
    </form>`;
  return wrapper;
}

async function mountCompetitionCreation(services) {
  const panel = await waitForElement('#panel-competitions');
  if (!panel || byId('cms-v2-new-competition-form')) return;
  const existingForm = byId('cms-competition-form');
  panel.insertBefore(createNewCompetitionForm(), existingForm || panel.firstChild);

  const name = byId('cms-v2-competition-name');
  const slug = byId('cms-v2-competition-slug');
  let slugManuallyEdited = false;
  slug?.addEventListener('input', () => {
    slugManuallyEdited = true;
    slug.value = normalizeSlug(slug.value);
  });
  name?.addEventListener('input', () => {
    if (!slugManuallyEdited && slug) slug.value = normalizeSlug(name.value);
  });

  byId('cms-v2-new-competition-form')?.addEventListener('submit', async (event) => {
    event.preventDefault();
    const button = event.submitter;
    if (button) button.disabled = true;
    try {
      const id = normalizeSlug(readValue('cms-v2-competition-slug'));
      if (!id) throw new Error('Inserisci un identificativo valido.');
      const ref = services.firestoreSdk.doc(services.db, 'competitions', id);
      if ((await services.firestoreSdk.getDoc(ref)).exists()) {
        throw new Error('Esiste già una competizione con questo identificativo.');
      }
      const settings = await services.firestoreSdk.getDoc(
        services.firestoreSdk.doc(services.db, 'siteSettings', 'current'),
      );
      await services.firestoreSdk.setDoc(ref, {
        name: readValue('cms-v2-competition-name'),
        tagline: readValue('cms-v2-competition-tagline'),
        description: readValue('cms-v2-competition-description'),
        accent: readValue('cms-v2-competition-accent') || 'lime',
        active: checked('cms-v2-competition-active'),
        order: numberValue('cms-v2-competition-order', 100),
        season: settings.exists() ? settings.data().season : '2026/27',
        createdAt: serverTimestamp(services),
        updatedAt: serverTimestamp(services),
      });
      rememberAdminTab('competitions');
      showToast('Competizione creata.');
      window.setTimeout(() => window.location.reload(), 450);
    } catch (error) {
      console.error(error);
      showToast(error.message || 'Creazione della competizione non riuscita.', true);
      if (button) button.disabled = false;
    }
  });

  const editName = byId('cms-competition-name');
  if (editName) {
    editName.removeAttribute('readonly');
    editName.classList.remove('cms-readonly');
  }

  const editForm = byId('cms-competition-form');
  editForm?.addEventListener('submit', async (event) => {
    event.preventDefault();
    event.stopImmediatePropagation();
    const button = event.submitter;
    if (button) button.disabled = true;
    try {
      const id = readValue('cms-competition-id');
      const ref = services.firestoreSdk.doc(services.db, 'competitions', id);
      const existing = await services.firestoreSdk.getDoc(ref);
      if (!existing.exists()) throw new Error('Competizione non trovata.');
      await services.firestoreSdk.setDoc(ref, {
        ...existing.data(),
        name: readValue('cms-competition-name'),
        tagline: readValue('cms-competition-tagline'),
        description: readValue('cms-competition-description'),
        accent: readValue('cms-competition-accent') || 'lime',
        active: checked('cms-competition-active'),
        order: numberValue('cms-competition-order', 100),
        updatedAt: serverTimestamp(services),
      });
      rememberAdminTab('competitions');
      showToast('Competizione aggiornata.');
      window.setTimeout(() => window.location.reload(), 450);
    } catch (error) {
      console.error(error);
      showToast(error.message || 'Aggiornamento non riuscito.', true);
      if (button) button.disabled = false;
    }
  }, true);
}

async function interceptDynamicWinnerForm(services) {
  const form = byId('winner-form');
  if (!form || form.dataset.dynamicCompetitionBound === 'true') return;
  form.dataset.dynamicCompetitionBound = 'true';
  form.addEventListener('submit', async (event) => {
    const competitionId = readValue('winner-competition-input');
    if (!competitionId || LEGACY_COMPETITION_IDS.has(competitionId)) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    const button = event.submitter;
    if (button) button.disabled = true;
    try {
      const competition = await services.firestoreSdk.getDoc(
        services.firestoreSdk.doc(services.db, 'competitions', competitionId),
      );
      if (!competition.exists()) throw new Error('Competizione non trovata.');
      const payload = {
        competitionId,
        competitionName: competition.data().name,
        matchday: Number.parseInt(readValue('winner-matchday-input'), 10),
        date: readValue('winner-date-input'),
        team: readValue('winner-team-input'),
        manager: readValue('winner-manager-input'),
        score: Number.parseFloat(readValue('winner-score-input')),
        title: readValue('winner-title-input'),
        updatedAt: serverTimestamp(services),
      };
      const batch = services.firestoreSdk.writeBatch(services.db);
      batch.set(
        services.firestoreSdk.doc(services.firestoreSdk.collection(services.db, 'competitionWinners')),
        { ...payload, createdAt: serverTimestamp(services) },
      );
      if (checked('winner-featured-input')) {
        batch.set(services.firestoreSdk.doc(services.db, 'siteContent', 'currentWinner'), payload);
      }
      await batch.commit();
      rememberAdminTab('winner');
      showToast('Risultato pubblicato.');
      window.setTimeout(() => window.location.reload(), 450);
    } catch (error) {
      console.error(error);
      showToast(error.message || 'Salvataggio non riuscito.', true);
      if (button) button.disabled = false;
    }
  }, true);
}

async function interceptDynamicPrizeForm(services) {
  const form = byId('prize-form');
  if (!form || form.dataset.dynamicCompetitionBound === 'true') return;
  form.dataset.dynamicCompetitionBound = 'true';
  form.addEventListener('submit', async (event) => {
    const competitionId = readValue('prize-competition-input');
    if (!competitionId || competitionId === 'general' || LEGACY_COMPETITION_IDS.has(competitionId)) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    const button = event.submitter;
    if (button) button.disabled = true;
    try {
      const competition = await services.firestoreSdk.getDoc(
        services.firestoreSdk.doc(services.db, 'competitions', competitionId),
      );
      if (!competition.exists()) throw new Error('Competizione non trovata.');
      const prizeId = readValue('prize-id-input');
      let createdAt = serverTimestamp(services);
      if (prizeId) {
        const existing = await services.firestoreSdk.getDoc(
          services.firestoreSdk.doc(services.db, 'prizes', prizeId),
        );
        if (existing.exists()) createdAt = existing.data().createdAt || createdAt;
      }
      const payload = {
        competitionId,
        competitionName: competition.data().name,
        title: readValue('prize-title-input'),
        amount: readValue('prize-amount-input'),
        description: readValue('prize-description-input'),
        order: numberValue('prize-order-input', 100),
        active: checked('prize-active-input'),
        createdAt,
        updatedAt: serverTimestamp(services),
      };
      if (prizeId) {
        await services.firestoreSdk.setDoc(
          services.firestoreSdk.doc(services.db, 'prizes', prizeId), payload,
        );
      } else {
        await services.firestoreSdk.addDoc(
          services.firestoreSdk.collection(services.db, 'prizes'), payload,
        );
      }
      rememberAdminTab('prizes');
      showToast(prizeId ? 'Premio aggiornato.' : 'Premio aggiunto.');
      window.setTimeout(() => window.location.reload(), 450);
    } catch (error) {
      console.error(error);
      showToast(error.message || 'Salvataggio del premio non riuscito.', true);
      if (button) button.disabled = false;
    }
  }, true);
}

function sponsorStatus(message, state = 'neutral') {
  const box = byId('cms-v2-sponsor-status');
  if (!box) return;
  box.textContent = message;
  box.dataset.state = state;
}

function storageErrorMessage(error) {
  const code = error?.code || '';
  if (code.includes('bucket-not-found')) {
    return 'Firebase Storage non risulta attivato per questo progetto. Apri Firebase Console → Storage → Inizia.';
  }
  if (code.includes('unauthorized')) {
    return 'Storage ha rifiutato l’upload. Verifica di aver deployato storage.rules e di essere un admin autorizzato.';
  }
  if (code.includes('canceled')) return 'Upload annullato.';
  if (code.includes('quota-exceeded')) return 'Quota Firebase Storage superata.';
  return error?.message || 'Errore Firebase Storage non identificato.';
}

async function testStorage(services) {
  const binary = Uint8Array.from(atob('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9Y9ZQmcAAAAASUVORK5CYII='), (char) => char.charCodeAt(0));
  const blob = new Blob([binary], { type: 'image/png' });
  const path = `sponsors/storage-healthcheck-${Date.now()}.png`;
  const ref = services.storageSdk.ref(services.storage, path);
  await services.storageSdk.uploadBytes(ref, blob, { contentType: 'image/png' });
  await services.storageSdk.deleteObject(ref);
}

async function mountSponsorDiagnostics(services) {
  const form = await waitForElement('#sponsor-form');
  if (!form || byId('cms-v2-sponsor-tools')) return;
  const tools = document.createElement('div');
  tools.id = 'cms-v2-sponsor-tools';
  tools.className = 'cms-v2-sponsor-tools';
  tools.innerHTML = `
    <div>
      <strong>Logo sponsor</strong>
      <p>Puoi caricare il file su Firebase Storage oppure usare direttamente un URL HTTPS. L'URL non richiede Storage.</p>
    </div>
    <div class="cms-v2-sponsor-tools__actions">
      <button id="cms-v2-test-storage" type="button" class="icon-button">Verifica Storage</button>
      <span id="cms-v2-sponsor-status" class="cms-v2-status" data-state="neutral">Storage non ancora verificato</span>
    </div>`;
  form.prepend(tools);

  byId('cms-v2-test-storage')?.addEventListener('click', async (event) => {
    const button = event.currentTarget;
    button.disabled = true;
    sponsorStatus('Verifica Storage in corso…', 'neutral');
    try {
      await testStorage(services);
      sponsorStatus('Storage operativo', 'success');
    } catch (error) {
      console.error(error);
      sponsorStatus(storageErrorMessage(error), 'error');
    } finally {
      button.disabled = false;
    }
  });

  form.addEventListener('invalid', () => {
    sponsorStatus('Completa i campi obbligatori evidenziati prima di salvare.', 'error');
  }, true);

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    event.stopImmediatePropagation();
    const button = event.submitter;
    if (button) button.disabled = true;
    sponsorStatus('Salvataggio sponsor in corso…', 'neutral');
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
      const file = byId('sponsor-logo-input')?.files?.[0];
      let logoUrl = normalizeHttpsUrl(readValue('sponsor-logo-url-input'));
      let storagePath = existing?.storagePath || '';
      const previousStoragePath = existing?.storagePath || '';

      if (file) {
        if (file.size >= 5 * 1024 * 1024) throw new Error('Il logo supera il limite di 5 MB.');
        if (file.type && !ALLOWED_IMAGE_TYPES.has(file.type)) {
          throw new Error('Formato logo non supportato. Usa PNG, JPG, WebP o SVG.');
        }
        const path = `sponsors/${Date.now()}-${safeFileName(file.name || name)}`;
        const ref = services.storageSdk.ref(services.storage, path);
        try {
          await services.storageSdk.uploadBytes(ref, file, {
            contentType: file.type || 'image/png',
            customMetadata: { sponsorName: name },
          });
          logoUrl = await services.storageSdk.getDownloadURL(ref);
          storagePath = path;
        } catch (error) {
          throw new Error(storageErrorMessage(error));
        }
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
        createdAt: existing?.createdAt || serverTimestamp(services),
        updatedAt: serverTimestamp(services),
      };

      if (sponsorId) {
        await services.firestoreSdk.setDoc(
          services.firestoreSdk.doc(services.db, 'sponsors', sponsorId), payload,
        );
      } else {
        await services.firestoreSdk.addDoc(
          services.firestoreSdk.collection(services.db, 'sponsors'), payload,
        );
      }

      if (previousStoragePath && previousStoragePath !== storagePath) {
        await services.storageSdk.deleteObject(
          services.storageSdk.ref(services.storage, previousStoragePath),
        ).catch(() => undefined);
      }
      sponsorStatus('Sponsor salvato correttamente.', 'success');
      showToast(sponsorId ? 'Sponsor aggiornato.' : 'Sponsor aggiunto.');
      rememberAdminTab('sponsors');
      window.setTimeout(() => window.location.reload(), 600);
    } catch (error) {
      console.error(error);
      sponsorStatus(error.message || 'Salvataggio dello sponsor non riuscito.', 'error');
      showToast(error.message || 'Salvataggio dello sponsor non riuscito.', true);
      if (button) button.disabled = false;
    }
  }, true);
}

async function initializeAdminV2(services) {
  const user = services.auth.currentUser;
  if (!user || !(await isAdmin(user, services))) return;
  await Promise.all([
    mountCompetitionCreation(services),
    mountSponsorDiagnostics(services),
  ]);
  await interceptDynamicWinnerForm(services);
  await interceptDynamicPrizeForm(services);
  restoreAdminTab();
}

async function initialize() {
  if (!isFirebaseConfigured) return;
  const services = await getServices();
  const page = document.body.dataset.page;

  if (page === 'home') {
    await new Promise((resolve) => window.setTimeout(resolve, 180));
    await renderDynamicHomeCompetitions(services);
    return;
  }

  if (page === 'competition') {
    await initializeDynamicCompetitionPage(services);
    return;
  }

  if (page === 'admin') {
    services.authSdk.onAuthStateChanged(services.auth, async (user) => {
      if (!user) return;
      try {
        if (!(await isAdmin(user, services))) return;
        await initializeAdminV2(services);
      } catch (error) {
        console.error('Errore inizializzazione CMS V2.', error);
        showToast('Alcune funzioni avanzate non sono disponibili.', true);
      }
    });
  }
}

initialize().catch((error) => console.error('Errore CMS V2 Fantasavuto.', error));
