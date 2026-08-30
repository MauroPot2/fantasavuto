(() => {
  const CONSENT_STORAGE_KEY = 'fantasavuto_cookie_consent_v1';

  function analyticsAllowed() {
    try {
      const saved = JSON.parse(localStorage.getItem(CONSENT_STORAGE_KEY));
      return saved?.analytics === true;
    } catch (_) {
      return false;
    }
  }

  function sendEvent(name, parameters = {}) {
    if (!analyticsAllowed() || typeof window.gtag !== 'function') return;

    window.gtag('event', name, {
      ...parameters,
      page_path: window.location.pathname,
    });
  }

  function linkSource(anchor) {
    if (anchor.closest('.hero-actions')) return 'hero';
    if (anchor.closest('.competition-grid')) return 'competition_grid';
    if (anchor.closest('.prize-grid')) return 'prize_grid';
    if (anchor.closest('.regulation-teaser')) return 'regulation_teaser';
    if (anchor.closest('.site-header, header')) return 'header';
    if (anchor.closest('.site-footer, footer')) return 'footer';
    return 'page';
  }

  function sponsorName(anchor) {
    const imageAlt = anchor.querySelector('img')?.alt?.trim();
    if (imageAlt) return imageAlt;

    const ariaLabel = anchor.getAttribute('aria-label')?.trim();
    if (ariaLabel) return ariaLabel.replace(/^Visita il sito di\s+/i, '');

    return 'sponsor';
  }

  function competitionIdFromAnchor(anchor, rawHref) {
    const datasetId = anchor.dataset.competitionId?.trim();
    if (datasetId) return datasetId;

    try {
      const url = new URL(rawHref, window.location.origin);

      if (url.pathname === '/competizioni/dettaglio') {
        return url.searchParams.get('id')?.trim() || 'unknown';
      }

      if (url.pathname.startsWith('/competizioni/')) {
        return url.pathname.split('/').filter(Boolean).pop() || 'unknown';
      }
    } catch (_) {
      // Fall through to the safe fallback below.
    }

    return 'unknown';
  }

  document.addEventListener('click', (event) => {
    const target = event.target;
    if (!(target instanceof Element)) return;

    const anchor = target.closest('a');
    if (!(anchor instanceof HTMLAnchorElement)) return;

    const rawHref = anchor.getAttribute('href') || '';

    const sponsorContainer = anchor.closest('#sponsor-section, #sponsor-dock');
    if (sponsorContainer) {
      sendEvent('sponsor_click', {
        sponsor_name: sponsorName(anchor),
        sponsor_url: anchor.href,
        placement: sponsorContainer.id === 'sponsor-dock' ? 'dock' : 'showcase',
      });
      return;
    }

    if (rawHref.startsWith('/competizioni/')) {
      sendEvent('select_competition', {
        competition_id: competitionIdFromAnchor(anchor, rawHref),
        source: linkSource(anchor),
      });
      return;
    }

    if (rawHref === '/regolamento') {
      sendEvent('open_regulation', {
        source: linkSource(anchor),
      });
      return;
    }

    if (rawHref === '#competizioni') {
      sendEvent('view_competitions', {
        source: linkSource(anchor),
      });
      return;
    }

    if (anchor.hostname === 'www.instagram.com' || anchor.hostname === 'instagram.com') {
      sendEvent('social_click', {
        platform: 'instagram',
        destination: anchor.href,
        source: linkSource(anchor),
      });
    }
  }, { capture: true });
})();