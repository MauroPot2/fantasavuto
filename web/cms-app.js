import { firebaseConfig, isFirebaseConfigured } from './firebase-config.js';

const FIREBASE_VERSION = '12.18.0';
const FIREBASE_BASE = `https://www.gstatic.com/firebasejs/${FIREBASE_VERSION}`;

const DEFAULT_SETTINGS = {
  leagueName: 'Fantacalcio del Savuto',
  season: '2026/27',
  editionLabel: '4ª edizione',
  currentMatchday: 0,
  sponsorBarEnabled: true,
  sponsorBarTitle: 'Partner ufficiali',
  sponsorBarDescription: 'Le attività che sostengono il Fantacalcio del Savuto.',
  sponsorBarSpeedSeconds: 32,
};

const DEFAULT_COMPETITIONS = [
  {
    id: 'campionato',
    name: 'Campionato',
    tagline: '38 giornate',
    description: 'La corsa lunga: continuità, strategia e classifica generale.',
    accent: 'lime',
    order: 10,
    active: true,
  },
  {
    id: 'champions-savuto',
    name: 'Champions Savuto',
    tagline: 'Fase finale',
    description: 'La competizione che premia chi sa alzare il livello nei momenti decisivi.',
    accent: 'orange',
    order: 20,
    active: true,
  },
  {
    id: 'campione-inverno',
    name: 'Campione d’inverno',
    tagline: 'Girone d’andata',
    description: 'Il primo traguardo stagionale per chi chiude davanti a metà percorso.',
    accent: 'blue',
    order: 30,
    active: true,
  },
  {
    id: 'coppa-sponsor',
    name: 'Coppa Sponsor',
    tagline: 'Formula Uno',
    description: 'Una classifica speciale che valorizza costanza e piazzamenti.',
    accent: 'pink',
    order: 40,
    active: true,
  },
];

let servicesPromise;
let cmsMounted = false;
let currentSettings = null;
let currentTeams = [];
let currentCompetitions = [];

function byId(id) {
  return document.getElementById(id);
}

function readValue(id) {
  return byId(id)?.value?.trim() || '';
}

function numberValue(id, fallback = 0) {
  const value = Number.parseInt(readValue(id), 10);
  return Number.isFinite(value) ? value : fallback;
}

function checked(id) {
  return Boolean(byId(id)?.checked);
}

function normalizedEmail(user) {
  return (user?.email || '').trim().toLowerCase();
}

function setText(id, value) {
  const element = byId(id);
  if (element) element.textContent = value;
}

function showToast(message, isError = false) {
  const toast = byId('admin-toast');
  if (!toast) return;
  toast.textContent = message;
  toast.classList.toggle('is-error', isError);
  toast.classList.add('is-visible');
  window.setTimeout(() => toast.classList.remove('is-visible'), 3200);
}

async function getServices() {
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
      app,
      auth: authSdk.getAuth(app),
      db: firestoreSdk.getFirestore(app),
      authSdk,
      firestoreSdk,
    };
  });

  return servicesPromise;
}

async function isAuthorizedAdmin(user, services) {
  const email = normalizedEmail(user);
  if (!email || !user.emailVerified) return false;
  const snapshot = await services.firestoreSdk.getDoc(
    services.firestoreSdk.doc(services.db, 'admins', email),
  );
  return snapshot.exists();
}

function serverTimestamp(services) {
  return services.firestoreSdk.serverTimestamp();
}

async function ensureCmsDefaults(services) {
  const { db, firestoreSdk } = services;
  const settingsRef = firestoreSdk.doc(db, 'siteSettings', 'current');
  const regulationRef = firestoreSdk.doc(db, 'siteContent', 'regulation');
  const [settingsSnapshot, regulationSnapshot] = await Promise.all([
    firestoreSdk.getDoc(settingsRef),
    firestoreSdk.getDoc(regulationRef).catch(() => null),
  ]);

  if (!settingsSnapshot.exists()) {
    const regulationSeason = regulationSnapshot?.exists?.()
      ? regulationSnapshot.data().season
      : DEFAULT_SETTINGS.season;
    await firestoreSdk.setDoc(settingsRef, {
      ...DEFAULT_SETTINGS,
      season: regulationSeason || DEFAULT_SETTINGS.season,
      updatedAt: serverTimestamp(services),
    });
  }

  await Promise.all(DEFAULT_COMPETITIONS.map(async (competition) => {
    const ref = firestoreSdk.doc(db, 'competitions', competition.id);
    const snapshot = await firestoreSdk.getDoc(ref);
    if (snapshot.exists()) return;
    const settings = settingsSnapshot.exists()
      ? settingsSnapshot.data()
      : { ...DEFAULT_SETTINGS };
    await firestoreSdk.setDoc(ref, {
      name: competition.name,
      tagline: competition.tagline,
      description: competition.description,
      accent: competition.accent,
      active: competition.active,
      order: competition.order,
      season: settings.season || DEFAULT_SETTINGS.season,
      createdAt: serverTimestamp(services),
      updatedAt: serverTimestamp(services),
    });
  }));
}

function createTab(name, number, label) {
  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'admin-tab';
  button.dataset.adminTab = name;
  const numberElement = document.createElement('span');
  numberElement.textContent = number;
  button.append(numberElement, document.createTextNode(label));
  return button;
}

function createNavLabel(label) {
  const element = document.createElement('div');
  element.className = 'cms-nav-label';
  element.textContent = label;
  return element;
}

function resetOriginalTab(button, number, label) {
  if (!button) return null;
  button.classList.remove('is-active');
  const numberElement = document.createElement('span');
  numberElement.textContent = number;
  button.replaceChildren(numberElement, document.createTextNode(label));
  return button;
}

function selectAdminPanel(name) {
  document.querySelectorAll('[data-admin-tab]').forEach((button) => {
    button.classList.toggle('is-active', button.dataset.adminTab === name);
  });
  document.querySelectorAll('[data-admin-panel]').forEach((panel) => {
    panel.classList.toggle('is-hidden', panel.dataset.adminPanel !== name);
  });
}

function mountNavigation() {
  const navigation = document.querySelector('.admin-tabs');
  if (!navigation || navigation.dataset.cmsMounted === 'true') return;
  navigation.dataset.cmsMounted = 'true';

  const winner = resetOriginalTab(
    navigation.querySelector('[data-admin-tab="winner"]'),
    '02',
    'Giornate',
  );
  const regulation = resetOriginalTab(
    navigation.querySelector('[data-admin-tab="regulation"]'),
    '05',
    'Regolamento',
  );
  const prizes = resetOriginalTab(
    navigation.querySelector('[data-admin-tab="prizes"]'),
    '06',
    'Premi',
  );
  const sponsors = resetOriginalTab(
    navigation.querySelector('[data-admin-tab="sponsors"]'),
    '07',
    'Sponsor',
  );

  const dashboard = createTab('dashboard', '01', 'Dashboard');
  const teams = createTab('teams', '03', 'Squadre');
  const competitions = createTab('competitions', '04', 'Competizioni');
  const settings = createTab('settings', '08', 'Impostazioni');

  navigation.replaceChildren(
    createNavLabel('Panoramica'),
    dashboard,
    createNavLabel('Stagione'),
    winner,
    teams,
    competitions,
    createNavLabel('Contenuti'),
    regulation,
    prizes,
    sponsors,
    createNavLabel('Sistema'),
    settings,
  );

  navigation.querySelectorAll('[data-admin-tab]').forEach((button) => {
    button.addEventListener('click', () => selectAdminPanel(button.dataset.adminTab));
  });
}

function createPanel(id, name, html) {
  const panel = document.createElement('section');
  panel.id = id;
  panel.className = 'admin-panel is-hidden';
  panel.dataset.adminPanel = name;
  panel.innerHTML = html;
  return panel;
}

function mountDashboardPanel() {
  if (byId('panel-dashboard')) return;
  const panels = document.querySelector('.admin-panels');
  if (!panels) return;

  const panel = createPanel('panel-dashboard', 'dashboard', `
    <div class="panel-heading">
      <div>
        <p class="eyebrow">Centro di controllo</p>
        <h2>Dashboard</h2>
      </div>
      <p>Una fotografia rapida della stagione e accesso alle attività che usi più spesso.</p>
    </div>
    <div class="cms-dashboard-grid">
      <article class="cms-stat-card"><small>Stagione attiva</small><strong id="cms-stat-season">—</strong><span id="cms-stat-edition">—</span></article>
      <article class="cms-stat-card"><small>Giornata corrente</small><strong id="cms-stat-matchday">—</strong><span>configurata nel sito</span></article>
      <article class="cms-stat-card"><small>Squadre</small><strong id="cms-stat-teams">—</strong><span>attive nella stagione</span></article>
      <article class="cms-stat-card"><small>Competizioni</small><strong id="cms-stat-competitions">—</strong><span>visibili sul sito</span></article>
      <article class="cms-stat-card"><small>Sponsor</small><strong id="cms-stat-sponsors">—</strong><span id="cms-stat-sponsor-bar">barra sponsor</span></article>
      <article class="cms-stat-card"><small>Risultati</small><strong id="cms-stat-results">—</strong><span>pubblicati nello storico</span></article>
    </div>
    <div class="admin-subsection__heading">
      <h3>Azioni rapide</h3>
      <p>Vai direttamente alle operazioni più frequenti.</p>
    </div>
    <div class="cms-quick-actions">
      <button type="button" class="cms-quick-action" data-cms-open="winner"><span>01</span><strong>Pubblica risultato</strong></button>
      <button type="button" class="cms-quick-action" data-cms-open="teams"><span>02</span><strong>Gestisci squadre</strong></button>
      <button type="button" class="cms-quick-action" data-cms-open="sponsors"><span>03</span><strong>Gestisci sponsor</strong></button>
      <button type="button" class="cms-quick-action" data-cms-open="settings"><span>04</span><strong>Impostazioni stagione</strong></button>
    </div>
  `);
  panels.prepend(panel);

  panel.querySelectorAll('[data-cms-open]').forEach((button) => {
    button.addEventListener('click', () => selectAdminPanel(button.dataset.cmsOpen));
  });
}

function mountTeamsPanel() {
  if (byId('panel-teams')) return;
  const panels = document.querySelector('.admin-panels');
  if (!panels) return;

  panels.append(createPanel('panel-teams', 'teams', `
    <div class="panel-heading">
      <div>
        <p class="eyebrow">Anagrafica stagione</p>
        <h2>Squadre</h2>
      </div>
      <p>Inserisci ogni squadra una sola volta: nel pannello Giornate potrai richiamarla e compilare automaticamente il fantallenatore.</p>
    </div>
    <p class="cms-panel-note">Le squadre appartengono alla stagione attiva. Nascondere una squadra non cancella i risultati già pubblicati.</p>
    <form id="cms-team-form" class="admin-form">
      <input id="cms-team-id" type="hidden">
      <div class="form-grid form-grid--2">
        <div class="field"><label for="cms-team-name">Nome squadra</label><input id="cms-team-name" maxlength="80" required placeholder="Es. NK Maribor"></div>
        <div class="field"><label for="cms-team-manager">Fantallenatore</label><input id="cms-team-manager" maxlength="80" required placeholder="Nome e cognome"></div>
      </div>
      <div class="form-grid form-grid--2">
        <div class="field"><label for="cms-team-logo">URL logo (facoltativo)</label><input id="cms-team-logo" type="url" maxlength="2048" placeholder="https://..."><small class="cms-field-hint">Per ora il logo può essere un URL HTTPS; l'upload diretto potrà essere aggiunto in seguito.</small></div>
        <div class="field"><label for="cms-team-order">Ordine</label><input id="cms-team-order" type="number" min="0" max="9999" value="100" required></div>
      </div>
      <label class="switch-field"><input id="cms-team-active" type="checkbox" checked><span class="switch-control"></span><span>Squadra attiva</span></label>
      <div class="cms-form-actions"><button class="button button--primary" type="submit" id="cms-team-submit">Aggiungi squadra</button><button class="text-button is-hidden" id="cms-team-cancel" type="button">Annulla modifica</button></div>
    </form>
    <div class="admin-list-wrap">
      <h3>Squadre registrate</h3>
      <div id="cms-team-list" class="managed-list"><p class="cms-empty">Nessuna squadra inserita.</p></div>
    </div>
  `));
}

function mountCompetitionsPanel() {
  if (byId('panel-competitions')) return;
  const panels = document.querySelector('.admin-panels');
  if (!panels) return;

  panels.append(createPanel('panel-competitions', 'competitions', `
    <div class="panel-heading">
      <div>
        <p class="eyebrow">Struttura del sito</p>
        <h2>Competizioni</h2>
      </div>
      <p>Controlla visibilità, ordine e presentazione delle competizioni senza modificare il codice del sito.</p>
    </div>
    <p class="cms-panel-note">In questa prima versione manteniamo stabili i quattro identificativi delle competizioni per non rompere URL e storico. Puoi però cambiarne testi, ordine, colore e visibilità.</p>
    <form id="cms-competition-form" class="admin-form">
      <div class="field"><label for="cms-competition-id">Competizione</label><select id="cms-competition-id"></select></div>
      <div class="form-grid form-grid--2">
        <div class="field"><label for="cms-competition-name">Nome</label><input id="cms-competition-name" class="cms-readonly" readonly></div>
        <div class="field"><label for="cms-competition-tagline">Etichetta breve</label><input id="cms-competition-tagline" maxlength="80" required placeholder="Es. 38 giornate"></div>
      </div>
      <div class="field"><label for="cms-competition-description">Descrizione</label><textarea id="cms-competition-description" maxlength="500" rows="5" required></textarea></div>
      <div class="form-grid form-grid--2">
        <div class="field"><label for="cms-competition-accent">Colore</label><select id="cms-competition-accent"><option value="lime">Lime</option><option value="orange">Arancione</option><option value="blue">Blu</option><option value="pink">Rosa</option></select></div>
        <div class="field"><label for="cms-competition-order">Ordine sul sito</label><input id="cms-competition-order" type="number" min="0" max="9999" required></div>
      </div>
      <label class="switch-field"><input id="cms-competition-active" type="checkbox"><span class="switch-control"></span><span>Mostra questa competizione sul sito</span></label>
      <div class="cms-form-actions"><button class="button button--primary" type="submit">Salva competizione</button></div>
    </form>
    <div class="admin-list-wrap">
      <h3>Ordine attuale</h3>
      <div id="cms-competition-list" class="managed-list"></div>
    </div>
  `));
}

function mountSettingsPanel() {
  if (byId('panel-settings')) return;
  const panels = document.querySelector('.admin-panels');
  if (!panels) return;

  panels.append(createPanel('panel-settings', 'settings', `
    <div class="panel-heading">
      <div>
        <p class="eyebrow">Configurazione centrale</p>
        <h2>Impostazioni</h2>
      </div>
      <p>La stagione e i dati generali del portale vengono gestiti da qui e non più dal codice.</p>
    </div>
    <form id="cms-settings-form" class="admin-form">
      <div class="form-grid form-grid--2">
        <div class="field"><label for="cms-setting-league-name">Nome lega</label><input id="cms-setting-league-name" maxlength="80" required></div>
        <div class="field"><label for="cms-setting-season">Stagione</label><input id="cms-setting-season" maxlength="20" required placeholder="2026/27"></div>
      </div>
      <div class="form-grid form-grid--2">
        <div class="field"><label for="cms-setting-edition">Edizione</label><input id="cms-setting-edition" maxlength="30" required placeholder="4ª edizione"></div>
        <div class="field"><label for="cms-setting-matchday">Giornata corrente</label><input id="cms-setting-matchday" type="number" min="0" max="60" required></div>
      </div>
      <div class="cms-form-actions"><button class="button button--primary" type="submit">Salva impostazioni</button></div>
    </form>
  `));
}

function mountSponsorBarControls() {
  const panel = byId('panel-sponsors');
  if (!panel || byId('cms-sponsor-settings-form')) return;
  const heading = panel.querySelector('.panel-heading');
  const section = document.createElement('div');
  section.className = 'cms-sponsor-settings';
  section.innerHTML = `
    <div class="cms-sponsor-settings__header">
      <div><h3>Barra sponsor</h3><p>Controlla la fascia pubblica che scorre nella home, indipendentemente dai singoli sponsor.</p></div>
      <span id="cms-sponsor-bar-status" class="cms-inline-status">—</span>
    </div>
    <form id="cms-sponsor-settings-form" class="admin-form">
      <label class="switch-field"><input id="cms-sponsor-bar-enabled" type="checkbox"><span class="switch-control"></span><span>Mostra la barra sponsor nella home</span></label>
      <div class="form-grid form-grid--2">
        <div class="field"><label for="cms-sponsor-bar-title">Titolo</label><input id="cms-sponsor-bar-title" maxlength="80" required></div>
        <div class="field"><label for="cms-sponsor-bar-speed">Durata scorrimento (secondi)</label><input id="cms-sponsor-bar-speed" type="number" min="10" max="120" required></div>
      </div>
      <div class="field"><label for="cms-sponsor-bar-description">Descrizione</label><input id="cms-sponsor-bar-description" maxlength="180" required></div>
      <div class="cms-form-actions"><button class="button button--dark" type="submit">Salva barra sponsor</button></div>
    </form>
  `;
  heading?.insertAdjacentElement('afterend', section);
}

function mountAdminCms() {
  if (cmsMounted) return;
  cmsMounted = true;

  const unauthorizedLabel = document.querySelector('#admin-unauthorized .uid-box span');
  if (unauthorizedLabel) unauthorizedLabel.textContent = 'Email da autorizzare';

  mountNavigation();
  mountDashboardPanel();
  mountTeamsPanel();
  mountCompetitionsPanel();
  mountSettingsPanel();
  mountSponsorBarControls();
  bindCmsForms();
  selectAdminPanel('dashboard');
}

function resetTeamForm() {
  byId('cms-team-form')?.reset();
  if (byId('cms-team-id')) byId('cms-team-id').value = '';
  if (byId('cms-team-order')) byId('cms-team-order').value = '100';
  if (byId('cms-team-active')) byId('cms-team-active').checked = true;
  setText('cms-team-submit', 'Aggiungi squadra');
  byId('cms-team-cancel')?.classList.add('is-hidden');
}

function editTeam(team) {
  byId('cms-team-id').value = team.id;
  byId('cms-team-name').value = team.name || '';
  byId('cms-team-manager').value = team.manager || '';
  byId('cms-team-logo').value = team.logoUrl || '';
  byId('cms-team-order').value = team.order ?? 100;
  byId('cms-team-active').checked = Boolean(team.active);
  setText('cms-team-submit', 'Salva modifiche');
  byId('cms-team-cancel')?.classList.remove('is-hidden');
  byId('cms-team-name')?.focus();
}

async function refreshTeams(services) {
  const snapshot = await services.firestoreSdk.getDocs(
    services.firestoreSdk.collection(services.db, 'teams'),
  );
  currentTeams = snapshot.docs
    .map((document) => ({ id: document.id, ...document.data() }))
    .sort((a, b) => {
      if (Boolean(a.active) !== Boolean(b.active)) return a.active ? -1 : 1;
      if ((a.order ?? 100) !== (b.order ?? 100)) return (a.order ?? 100) - (b.order ?? 100);
      return (a.name || '').localeCompare(b.name || '', 'it');
    });
  renderTeams(services);
  bindWinnerTeamAutocomplete();
}

function renderTeams(services) {
  const list = byId('cms-team-list');
  if (!list) return;
  if (!currentTeams.length) {
    list.innerHTML = '<p class="cms-empty">Nessuna squadra inserita.</p>';
    return;
  }

  list.replaceChildren(...currentTeams.map((team) => {
    const item = document.createElement('article');
    item.className = 'cms-managed-item';

    const copy = document.createElement('div');
    copy.className = 'cms-managed-copy';
    const title = document.createElement('strong');
    title.textContent = team.name || 'Squadra senza nome';
    const meta = document.createElement('small');
    meta.textContent = `${team.manager || 'Fantallenatore non indicato'} · ${team.season || 'stagione non indicata'} · ordine ${team.order ?? 100}`;
    const status = document.createElement('span');
    status.className = `status-pill${team.active ? ' status-pill--active' : ''}`;
    status.textContent = team.active ? 'Attiva' : 'Nascosta';
    copy.append(title, meta, status);

    const actions = document.createElement('div');
    actions.className = 'cms-managed-actions';
    const toggle = document.createElement('button');
    toggle.type = 'button';
    toggle.className = 'icon-button';
    toggle.textContent = team.active ? 'Nascondi' : 'Attiva';
    toggle.addEventListener('click', async () => {
      await services.firestoreSdk.updateDoc(
        services.firestoreSdk.doc(services.db, 'teams', team.id),
        { active: !team.active, updatedAt: serverTimestamp(services) },
      );
      await refreshTeams(services);
      await refreshDashboard(services);
      showToast('Stato della squadra aggiornato.');
    });
    const edit = document.createElement('button');
    edit.type = 'button';
    edit.className = 'icon-button';
    edit.textContent = 'Modifica';
    edit.addEventListener('click', () => editTeam(team));
    const remove = document.createElement('button');
    remove.type = 'button';
    remove.className = 'icon-button icon-button--danger';
    remove.textContent = 'Elimina';
    remove.addEventListener('click', async () => {
      if (!window.confirm(`Eliminare la squadra “${team.name}”? I risultati già pubblicati resteranno nello storico.`)) return;
      await services.firestoreSdk.deleteDoc(
        services.firestoreSdk.doc(services.db, 'teams', team.id),
      );
      resetTeamForm();
      await refreshTeams(services);
      await refreshDashboard(services);
      showToast('Squadra eliminata.');
    });
    actions.append(toggle, edit, remove);
    item.append(copy, actions);
    return item;
  }));
}

function bindWinnerTeamAutocomplete() {
  const input = byId('winner-team-input');
  const manager = byId('winner-manager-input');
  if (!input || !manager) return;

  let datalist = byId('cms-team-options');
  if (!datalist) {
    datalist = document.createElement('datalist');
    datalist.id = 'cms-team-options';
    document.body.append(datalist);
  }
  datalist.replaceChildren(...currentTeams
    .filter((team) => team.active)
    .map((team) => {
      const option = document.createElement('option');
      option.value = team.name || '';
      option.label = team.manager || '';
      return option;
    }));
  input.setAttribute('list', 'cms-team-options');

  if (input.dataset.cmsAutocompleteBound !== 'true') {
    input.dataset.cmsAutocompleteBound = 'true';
    input.addEventListener('change', () => {
      const selected = currentTeams.find(
        (team) => (team.name || '').toLowerCase() === input.value.trim().toLowerCase(),
      );
      if (selected?.manager) manager.value = selected.manager;
    });
  }
}

async function refreshCompetitions(services) {
  const snapshot = await services.firestoreSdk.getDocs(
    services.firestoreSdk.collection(services.db, 'competitions'),
  );
  currentCompetitions = snapshot.docs
    .map((document) => ({ id: document.id, ...document.data() }))
    .sort((a, b) => (a.order ?? 100) - (b.order ?? 100));
  renderCompetitionAdminList();
  populateCompetitionEditor();
  updateCompetitionSelectors();
}

function renderCompetitionAdminList() {
  const list = byId('cms-competition-list');
  if (!list) return;
  list.replaceChildren(...currentCompetitions.map((competition) => {
    const item = document.createElement('article');
    item.className = 'cms-managed-item';
    const copy = document.createElement('div');
    copy.className = 'cms-managed-copy';
    const title = document.createElement('strong');
    title.textContent = competition.name;
    const meta = document.createElement('small');
    meta.textContent = `${competition.tagline || '—'} · ordine ${competition.order ?? 100} · ${competition.accent || 'lime'}`;
    const status = document.createElement('span');
    status.className = `status-pill${competition.active ? ' status-pill--active' : ''}`;
    status.textContent = competition.active ? 'Visibile' : 'Nascosta';
    copy.append(title, meta, status);
    const actions = document.createElement('div');
    actions.className = 'cms-managed-actions';
    const edit = document.createElement('button');
    edit.type = 'button';
    edit.className = 'icon-button';
    edit.textContent = 'Gestisci';
    edit.addEventListener('click', () => {
      byId('cms-competition-id').value = competition.id;
      populateCompetitionEditor();
      byId('cms-competition-tagline')?.focus();
    });
    actions.append(edit);
    item.append(copy, actions);
    return item;
  }));
}

function populateCompetitionEditor() {
  const select = byId('cms-competition-id');
  if (!select || !currentCompetitions.length) return;

  const previous = select.value;
  select.replaceChildren(...currentCompetitions.map((competition) => {
    const option = document.createElement('option');
    option.value = competition.id;
    option.textContent = competition.name;
    return option;
  }));
  if (previous && currentCompetitions.some((item) => item.id === previous)) {
    select.value = previous;
  }
  const competition = currentCompetitions.find((item) => item.id === select.value)
    || currentCompetitions[0];
  if (!competition) return;
  select.value = competition.id;
  byId('cms-competition-name').value = competition.name || '';
  byId('cms-competition-tagline').value = competition.tagline || '';
  byId('cms-competition-description').value = competition.description || '';
  byId('cms-competition-accent').value = competition.accent || 'lime';
  byId('cms-competition-order').value = competition.order ?? 100;
  byId('cms-competition-active').checked = Boolean(competition.active);
}

function updateCompetitionSelectors() {
  const active = currentCompetitions.filter((competition) => competition.active);
  const winnerSelect = byId('winner-competition-input');
  if (winnerSelect) {
    const previous = winnerSelect.value;
    winnerSelect.replaceChildren(...active.map((competition) => {
      const option = document.createElement('option');
      option.value = competition.id;
      option.textContent = competition.name;
      return option;
    }));
    if (active.some((item) => item.id === previous)) winnerSelect.value = previous;
  }

  const prizeSelect = byId('prize-competition-input');
  if (prizeSelect) {
    const previous = prizeSelect.value;
    const general = document.createElement('option');
    general.value = 'general';
    general.textContent = 'Premio generale';
    prizeSelect.replaceChildren(general, ...active.map((competition) => {
      const option = document.createElement('option');
      option.value = competition.id;
      option.textContent = competition.name;
      return option;
    }));
    if (previous === 'general' || active.some((item) => item.id === previous)) {
      prizeSelect.value = previous;
    }
  }
}

async function refreshSettings(services) {
  const snapshot = await services.firestoreSdk.getDoc(
    services.firestoreSdk.doc(services.db, 'siteSettings', 'current'),
  );
  currentSettings = snapshot.exists()
    ? { ...DEFAULT_SETTINGS, ...snapshot.data() }
    : { ...DEFAULT_SETTINGS };
  populateSettingsForms();
}

function populateSettingsForms() {
  if (!currentSettings) return;
  if (byId('cms-setting-league-name')) byId('cms-setting-league-name').value = currentSettings.leagueName || DEFAULT_SETTINGS.leagueName;
  if (byId('cms-setting-season')) byId('cms-setting-season').value = currentSettings.season || DEFAULT_SETTINGS.season;
  if (byId('cms-setting-edition')) byId('cms-setting-edition').value = currentSettings.editionLabel || DEFAULT_SETTINGS.editionLabel;
  if (byId('cms-setting-matchday')) byId('cms-setting-matchday').value = currentSettings.currentMatchday ?? 0;

  if (byId('cms-sponsor-bar-enabled')) byId('cms-sponsor-bar-enabled').checked = Boolean(currentSettings.sponsorBarEnabled);
  if (byId('cms-sponsor-bar-title')) byId('cms-sponsor-bar-title').value = currentSettings.sponsorBarTitle || DEFAULT_SETTINGS.sponsorBarTitle;
  if (byId('cms-sponsor-bar-description')) byId('cms-sponsor-bar-description').value = currentSettings.sponsorBarDescription || DEFAULT_SETTINGS.sponsorBarDescription;
  if (byId('cms-sponsor-bar-speed')) byId('cms-sponsor-bar-speed').value = currentSettings.sponsorBarSpeedSeconds ?? DEFAULT_SETTINGS.sponsorBarSpeedSeconds;

  const status = byId('cms-sponsor-bar-status');
  if (status) {
    status.textContent = currentSettings.sponsorBarEnabled ? 'Barra attiva' : 'Barra nascosta';
    status.classList.toggle('is-active', Boolean(currentSettings.sponsorBarEnabled));
  }
}

async function refreshDashboard(services) {
  const { db, firestoreSdk } = services;
  const [teams, competitions, sponsors, results] = await Promise.all([
    firestoreSdk.getDocs(firestoreSdk.collection(db, 'teams')),
    firestoreSdk.getDocs(firestoreSdk.collection(db, 'competitions')),
    firestoreSdk.getDocs(firestoreSdk.collection(db, 'sponsors')),
    firestoreSdk.getDocs(firestoreSdk.collection(db, 'competitionWinners')),
  ]);

  const activeTeams = teams.docs.filter((document) => document.data().active).length;
  const activeCompetitions = competitions.docs.filter((document) => document.data().active).length;
  const activeSponsors = sponsors.docs.filter((document) => document.data().active).length;

  setText('cms-stat-season', currentSettings?.season || '—');
  setText('cms-stat-edition', currentSettings?.editionLabel || '—');
  setText('cms-stat-matchday', currentSettings?.currentMatchday ? `G${currentSettings.currentMatchday}` : 'Pre-season');
  setText('cms-stat-teams', String(activeTeams));
  setText('cms-stat-competitions', String(activeCompetitions));
  setText('cms-stat-sponsors', String(activeSponsors));
  setText('cms-stat-results', String(results.size));
  setText('cms-stat-sponsor-bar', currentSettings?.sponsorBarEnabled ? 'barra sponsor attiva' : 'barra sponsor nascosta');
}

function bindCmsForms() {
  const servicesPromiseForHandlers = getServices();

  byId('cms-team-cancel')?.addEventListener('click', resetTeamForm);
  byId('cms-team-form')?.addEventListener('submit', async (event) => {
    event.preventDefault();
    const services = await servicesPromiseForHandlers;
    const id = readValue('cms-team-id');
    const existing = currentTeams.find((team) => team.id === id);
    const payload = {
      name: readValue('cms-team-name'),
      manager: readValue('cms-team-manager'),
      logoUrl: readValue('cms-team-logo'),
      active: checked('cms-team-active'),
      order: numberValue('cms-team-order', 100),
      season: currentSettings?.season || DEFAULT_SETTINGS.season,
      createdAt: existing?.createdAt || serverTimestamp(services),
      updatedAt: serverTimestamp(services),
    };
    try {
      if (id) {
        await services.firestoreSdk.setDoc(
          services.firestoreSdk.doc(services.db, 'teams', id),
          payload,
        );
      } else {
        await services.firestoreSdk.addDoc(
          services.firestoreSdk.collection(services.db, 'teams'),
          payload,
        );
      }
      resetTeamForm();
      await refreshTeams(services);
      await refreshDashboard(services);
      showToast(id ? 'Squadra aggiornata.' : 'Squadra aggiunta.');
    } catch (error) {
      console.error(error);
      showToast('Non è stato possibile salvare la squadra.', true);
    }
  });

  byId('cms-competition-id')?.addEventListener('change', populateCompetitionEditor);
  byId('cms-competition-form')?.addEventListener('submit', async (event) => {
    event.preventDefault();
    const services = await servicesPromiseForHandlers;
    const id = readValue('cms-competition-id');
    const existing = currentCompetitions.find((competition) => competition.id === id);
    if (!existing) return;
    const payload = {
      name: existing.name,
      tagline: readValue('cms-competition-tagline'),
      description: readValue('cms-competition-description'),
      accent: readValue('cms-competition-accent') || 'lime',
      active: checked('cms-competition-active'),
      order: numberValue('cms-competition-order', 100),
      season: currentSettings?.season || DEFAULT_SETTINGS.season,
      createdAt: existing.createdAt || serverTimestamp(services),
      updatedAt: serverTimestamp(services),
    };
    try {
      await services.firestoreSdk.setDoc(
        services.firestoreSdk.doc(services.db, 'competitions', id),
        payload,
      );
      await refreshCompetitions(services);
      await refreshDashboard(services);
      showToast('Competizione aggiornata.');
    } catch (error) {
      console.error(error);
      showToast('Non è stato possibile aggiornare la competizione.', true);
    }
  });

  byId('cms-settings-form')?.addEventListener('submit', async (event) => {
    event.preventDefault();
    const services = await servicesPromiseForHandlers;
    try {
      await services.firestoreSdk.setDoc(
        services.firestoreSdk.doc(services.db, 'siteSettings', 'current'),
        {
          leagueName: readValue('cms-setting-league-name'),
          season: readValue('cms-setting-season'),
          editionLabel: readValue('cms-setting-edition'),
          currentMatchday: numberValue('cms-setting-matchday', 0),
          sponsorBarEnabled: currentSettings?.sponsorBarEnabled ?? true,
          sponsorBarTitle: currentSettings?.sponsorBarTitle || DEFAULT_SETTINGS.sponsorBarTitle,
          sponsorBarDescription: currentSettings?.sponsorBarDescription || DEFAULT_SETTINGS.sponsorBarDescription,
          sponsorBarSpeedSeconds: currentSettings?.sponsorBarSpeedSeconds || DEFAULT_SETTINGS.sponsorBarSpeedSeconds,
          updatedAt: serverTimestamp(services),
        },
      );
      await refreshSettings(services);
      await refreshDashboard(services);
      showToast('Impostazioni aggiornate.');
    } catch (error) {
      console.error(error);
      showToast('Non è stato possibile salvare le impostazioni.', true);
    }
  });

  byId('cms-sponsor-settings-form')?.addEventListener('submit', async (event) => {
    event.preventDefault();
    const services = await servicesPromiseForHandlers;
    try {
      await services.firestoreSdk.setDoc(
        services.firestoreSdk.doc(services.db, 'siteSettings', 'current'),
        {
          leagueName: currentSettings?.leagueName || DEFAULT_SETTINGS.leagueName,
          season: currentSettings?.season || DEFAULT_SETTINGS.season,
          editionLabel: currentSettings?.editionLabel || DEFAULT_SETTINGS.editionLabel,
          currentMatchday: currentSettings?.currentMatchday ?? 0,
          sponsorBarEnabled: checked('cms-sponsor-bar-enabled'),
          sponsorBarTitle: readValue('cms-sponsor-bar-title'),
          sponsorBarDescription: readValue('cms-sponsor-bar-description'),
          sponsorBarSpeedSeconds: numberValue('cms-sponsor-bar-speed', DEFAULT_SETTINGS.sponsorBarSpeedSeconds),
          updatedAt: serverTimestamp(services),
        },
      );
      await refreshSettings(services);
      await refreshDashboard(services);
      showToast('Barra sponsor aggiornata.');
    } catch (error) {
      console.error(error);
      showToast('Non è stato possibile aggiornare la barra sponsor.', true);
    }
  });
}

async function initializeAdminCms() {
  if (!isFirebaseConfigured) return;
  const services = await getServices();

  services.authSdk.onAuthStateChanged(services.auth, async (user) => {
    if (!user) return;
    try {
      if (!(await isAuthorizedAdmin(user, services))) return;
      await ensureCmsDefaults(services);
      mountAdminCms();
      await refreshSettings(services);
      await refreshCompetitions(services);
      await refreshTeams(services);
      await refreshDashboard(services);
    } catch (error) {
      console.error('Impossibile inizializzare il CMS Fantasavuto.', error);
      showToast('Alcune funzioni avanzate dell’area admin non sono disponibili.', true);
    }
  });
}

function applyPublicSettings(settings) {
  if (!settings) return;

  const sponsorSection = byId('sponsor-section');
  if (sponsorSection) {
    sponsorSection.style.display = settings.sponsorBarEnabled ? '' : 'none';
    setText('sponsor-title', settings.sponsorBarTitle || DEFAULT_SETTINGS.sponsorBarTitle);
    const headingDescription = sponsorSection.querySelector('.sponsor-heading > p');
    if (headingDescription) {
      headingDescription.textContent = settings.sponsorBarDescription || DEFAULT_SETTINGS.sponsorBarDescription;
    }
    const track = byId('sponsor-track');
    if (track) {
      track.style.animationDuration = `${settings.sponsorBarSpeedSeconds || DEFAULT_SETTINGS.sponsorBarSpeedSeconds}s`;
    }
  }

  if (document.body.dataset.page === 'home') {
    const eyebrow = document.querySelector('.hero-copy .eyebrow');
    if (eyebrow) {
      const pulse = eyebrow.querySelector('.status-pulse');
      eyebrow.replaceChildren();
      if (pulse) eyebrow.append(pulse);
      eyebrow.append(document.createTextNode(`Stagione ${settings.season || DEFAULT_SETTINGS.season} · ${settings.editionLabel || DEFAULT_SETTINGS.editionLabel}`));
    }
  }
}

function competitionIdFromCard(card) {
  const href = card.getAttribute('href') || '';
  return href.split('/').filter(Boolean).pop() || '';
}

function applyHomeCompetitions(competitions) {
  const grid = document.querySelector('.competition-grid');
  if (!grid) return;
  const cards = [...grid.querySelectorAll('.competition-card')];
  const competitionMap = new Map(competitions.map((competition) => [competition.id, competition]));

  cards.forEach((card) => {
    const id = competitionIdFromCard(card);
    const competition = competitionMap.get(id);
    card.hidden = !competition || !competition.active;
    if (!competition) return;
    const tag = card.querySelector('.competition-card__meta small');
    const title = card.querySelector('.competition-card__copy h3');
    const description = card.querySelector('.competition-card__copy p');
    if (tag) tag.textContent = competition.tagline || '';
    if (title) title.textContent = competition.name || '';
    if (description) description.textContent = competition.description || '';
    card.classList.remove(
      'competition-card--lime',
      'competition-card--orange',
      'competition-card--blue',
      'competition-card--pink',
    );
    card.classList.add(`competition-card--${competition.accent || 'lime'}`);
  });

  competitions
    .filter((competition) => competition.active)
    .sort((a, b) => (a.order ?? 100) - (b.order ?? 100))
    .forEach((competition) => {
      const card = cards.find((candidate) => competitionIdFromCard(candidate) === competition.id);
      if (card) grid.append(card);
    });
}

function applyCompetitionPage(competition) {
  const main = byId('main-content');
  if (!main || !competition) return;
  const heroCopy = document.querySelector('.competition-page__hero-grid > div:first-child');
  if (heroCopy) {
    const eyebrow = heroCopy.querySelector('.eyebrow');
    const title = heroCopy.querySelector('h1');
    const paragraphs = [...heroCopy.querySelectorAll(':scope > p')];
    if (eyebrow) eyebrow.textContent = competition.tagline || '';
    if (title) title.textContent = competition.name || '';
    const description = paragraphs.find((paragraph) => !paragraph.classList.contains('eyebrow'));
    if (description) description.textContent = competition.description || '';
  }
  main.classList.remove(
    'competition-page--lime',
    'competition-page--orange',
    'competition-page--blue',
    'competition-page--pink',
  );
  main.classList.add(`competition-page--${competition.accent || 'lime'}`);
  document.title = `${competition.name} | Fantasavuto`;
}

async function initializePublicCms() {
  if (!isFirebaseConfigured) return;
  const services = await getServices();
  const { db, firestoreSdk } = services;

  try {
    const settingsSnapshot = await firestoreSdk.getDoc(
      firestoreSdk.doc(db, 'siteSettings', 'current'),
    );
    if (settingsSnapshot.exists()) {
      applyPublicSettings({ ...DEFAULT_SETTINGS, ...settingsSnapshot.data() });
    }
  } catch (error) {
    console.debug('Impostazioni CMS non ancora disponibili.', error);
  }

  if (document.body.dataset.page === 'home') {
    try {
      const snapshot = await firestoreSdk.getDocs(
        firestoreSdk.query(
          firestoreSdk.collection(db, 'competitions'),
          firestoreSdk.where('active', '==', true),
        ),
      );
      applyHomeCompetitions(
        snapshot.docs.map((document) => ({ id: document.id, ...document.data() })),
      );
    } catch (error) {
      console.debug('Competizioni CMS non ancora disponibili.', error);
    }
  }

  if (document.body.dataset.page === 'competition') {
    const competitionId = byId('main-content')?.dataset.competitionId;
    if (!competitionId) return;
    try {
      const snapshot = await firestoreSdk.getDoc(
        firestoreSdk.doc(db, 'competitions', competitionId),
      );
      if (snapshot.exists()) {
        applyCompetitionPage({ id: snapshot.id, ...snapshot.data() });
      }
    } catch (error) {
      console.debug('Metadati competizione non disponibili.', error);
    }
  }
}

async function initializeCms() {
  const page = document.body.dataset.page;
  if (page === 'admin') {
    await initializeAdminCms();
    return;
  }
  if (page === 'home' || page === 'competition') {
    await initializePublicCms();
  }
}

initializeCms().catch((error) => console.error('Errore CMS Fantasavuto.', error));
