/* Sincronizza la dock persistente con la vetrina sponsor della homepage.
   La sorgente dei dati resta firebase-app.js: qui cloniamo solo gli elementi
   già renderizzati, evitando una seconda query Firestore. */

function byId(id) {
  return document.getElementById(id);
}

function sectionIsVisible(section) {
  if (!section) return false;
  if (section.classList.contains('is-hidden')) return false;
  if (section.style.display === 'none') return false;
  return true;
}

function cloneForDock(item, duplicate = false) {
  const clone = item.cloneNode(true);
  clone.removeAttribute('role');

  if (duplicate) {
    clone.setAttribute('aria-hidden', 'true');
    if (clone instanceof HTMLAnchorElement) clone.tabIndex = -1;
  } else {
    clone.removeAttribute('aria-hidden');
  }

  return clone;
}

function syncSponsorDock() {
  const section = byId('sponsor-section');
  const sourceTrack = byId('sponsor-track');
  const dock = byId('sponsor-dock');
  const dockTrack = byId('sponsor-dock-track');
  if (!section || !sourceTrack || !dock || !dockTrack) return;

  const originals = [...sourceTrack.children].filter(
    (item) => item.getAttribute('aria-hidden') !== 'true',
  );

  // La vetrina non ha bisogno delle copie generate per il marquee originale.
  sourceTrack.querySelectorAll('[aria-hidden="true"]').forEach((item) => item.remove());

  if (!originals.length || !sectionIsVisible(section)) {
    dock.classList.add('is-hidden');
    dockTrack.replaceChildren();
    return;
  }

  const firstPass = originals.map((item) => cloneForDock(item));
  const secondPass = originals.length > 1
    ? originals.map((item) => cloneForDock(item, true))
    : [];

  dockTrack.replaceChildren(...firstPass, ...secondPass);
  dockTrack.classList.toggle('sponsor-track--static', originals.length === 1);

  const publicTitle = byId('sponsor-title')?.textContent?.trim();
  const dockTitle = byId('sponsor-dock-title');
  if (publicTitle && dockTitle) dockTitle.textContent = publicTitle;

  dock.classList.remove('is-hidden');
}

function initializeSponsorDockSync() {
  const section = byId('sponsor-section');
  const sourceTrack = byId('sponsor-track');
  if (!section || !sourceTrack) return;

  let syncing = false;
  const scheduleSync = () => {
    if (syncing) return;
    syncing = true;
    queueMicrotask(() => {
      syncing = false;
      syncSponsorDock();
    });
  };

  const observer = new MutationObserver(scheduleSync);
  observer.observe(sourceTrack, { childList: true });
  observer.observe(section, {
    attributes: true,
    attributeFilter: ['class', 'style'],
    subtree: false,
  });

  const title = byId('sponsor-title');
  if (title) observer.observe(title, { childList: true, characterData: true, subtree: true });

  scheduleSync();
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initializeSponsorDockSync, { once: true });
} else {
  initializeSponsorDockSync();
}
