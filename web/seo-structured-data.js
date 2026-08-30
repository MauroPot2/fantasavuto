(() => {
  const SITE_ORIGIN = 'https://fantasavuto.web.app';
  const SITE_NAME = 'Fantasavuto';
  const WEBSITE_ID = `${SITE_ORIGIN}/#website`;

  const STATIC_COMPETITION_SEO = {
    '/competizioni/campionato': {
      title: 'Campionato Fantacalcio del Savuto 2026/27 | Fantasavuto',
      description:
        'Risultati, vincitori e aggiornamenti del Campionato del Fantacalcio del Savuto, stagione 2026/27.',
    },
    '/competizioni/champions-savuto': {
      title: 'Champions Savuto 2026/27 | Fantacalcio del Savuto',
      description:
        'Risultati, vincitori e aggiornamenti della Champions Savuto nella stagione 2026/27 del Fantacalcio del Savuto.',
    },
    '/competizioni/campione-inverno': {
      title: 'Campione d’inverno 2026/27 | Fantacalcio del Savuto',
      description:
        'Scopri risultati e vincitore del Campione d’inverno 2026/27 del Fantacalcio del Savuto.',
    },
    '/competizioni/coppa-sponsor': {
      title: 'Coppa Sponsor 2026/27 | Fantacalcio del Savuto',
      description:
        'Classifica, risultati e vincitori della Coppa Sponsor del Fantacalcio del Savuto, stagione 2026/27.',
    },
  };

  function getCanonicalLink() {
    return document.querySelector('link[rel="canonical"]');
  }

  function canonicalUrl() {
    return getCanonicalLink()?.href || `${SITE_ORIGIN}${window.location.pathname}`;
  }

  function metaContent(selector) {
    return document.querySelector(selector)?.getAttribute('content')?.trim() || '';
  }

  function setAttributeIfChanged(element, name, value) {
    if (element.getAttribute(name) !== value) {
      element.setAttribute(name, value);
    }
  }

  function upsertMetaByName(name, content) {
    let element = document.querySelector(`meta[name="${name}"]`);
    if (!element) {
      element = document.createElement('meta');
      element.setAttribute('name', name);
      document.head.appendChild(element);
    }
    setAttributeIfChanged(element, 'content', content);
  }

  function upsertMetaByProperty(property, content) {
    let element = document.querySelector(`meta[property="${property}"]`);
    if (!element) {
      element = document.createElement('meta');
      element.setAttribute('property', property);
      document.head.appendChild(element);
    }
    setAttributeIfChanged(element, 'content', content);
  }

  function upsertCanonical(url) {
    let element = getCanonicalLink();
    if (!element) {
      element = document.createElement('link');
      element.setAttribute('rel', 'canonical');
      document.head.appendChild(element);
    }
    setAttributeIfChanged(element, 'href', url);
  }

  function websiteSchema() {
    return {
      '@type': 'WebSite',
      '@id': WEBSITE_ID,
      url: `${SITE_ORIGIN}/`,
      name: SITE_NAME,
      alternateName: 'Fantacalcio del Savuto',
      inLanguage: 'it-IT',
    };
  }

  function pageSchema() {
    const page = document.body?.dataset.page || 'page';
    const type = page === 'competition' ? 'CollectionPage' : 'WebPage';
    const description = metaContent('meta[name="description"]');

    return {
      '@type': type,
      '@id': `${canonicalUrl()}#webpage`,
      url: canonicalUrl(),
      name: document.title,
      description,
      inLanguage: 'it-IT',
      isPartOf: { '@id': WEBSITE_ID },
    };
  }

  function refreshStructuredData() {
    if (document.body?.dataset.page === 'admin') return;

    let element = document.getElementById('fantasavuto-structured-data');
    if (!element) {
      element = document.createElement('script');
      element.id = 'fantasavuto-structured-data';
      element.type = 'application/ld+json';
      document.head.appendChild(element);
    }

    const content = JSON.stringify({
      '@context': 'https://schema.org',
      '@graph': [websiteSchema(), pageSchema()],
    });

    if (element.textContent !== content) {
      element.textContent = content;
    }
  }

  function applySeoMetadata({ title, description, url, robots = 'index,follow' }) {
    if (document.title !== title) document.title = title;
    upsertMetaByName('description', description);
    upsertMetaByName('robots', robots);
    upsertMetaByName('twitter:title', title);
    upsertMetaByName('twitter:description', description);
    upsertMetaByProperty('og:title', title);
    upsertMetaByProperty('og:description', description);
    upsertMetaByProperty('og:url', url);
    upsertCanonical(url);
    refreshStructuredData();
  }

  function updateStaticCompetitionSeo() {
    const seo = STATIC_COMPETITION_SEO[window.location.pathname];
    if (!seo || document.body?.dataset.page !== 'competition') return false;

    applySeoMetadata({
      ...seo,
      url: `${SITE_ORIGIN}${window.location.pathname}`,
    });
    return true;
  }

  function updateDynamicCompetitionSeo() {
    if (window.location.pathname !== '/competizioni/dettaglio') return false;

    const main = document.getElementById('main-content');
    const competitionId = main?.dataset.competitionId?.trim();
    const competitionName = main?.dataset.competitionName?.trim();
    if (!competitionId || competitionId === '__dynamic__' || !competitionName) return false;

    const title = `${competitionName} Fantacalcio del Savuto 2026/27 | Fantasavuto`;
    const description = `Risultati, vincitori e aggiornamenti di ${competitionName} nel Fantacalcio del Savuto, stagione 2026/27.`;
    const url = `${SITE_ORIGIN}/competizioni/dettaglio?id=${encodeURIComponent(competitionId)}`;

    applySeoMetadata({ title, description, url });
    return true;
  }

  function repairCompetitionSeo() {
    if (document.body?.dataset.page !== 'competition') return;
    if (updateDynamicCompetitionSeo()) return;
    updateStaticCompetitionSeo();
  }

  function initialize() {
    refreshStructuredData();
    repairCompetitionSeo();

    let repairScheduled = false;
    const scheduleRepair = () => {
      if (repairScheduled) return;
      repairScheduled = true;
      queueMicrotask(() => {
        repairScheduled = false;
        repairCompetitionSeo();
      });
    };

    const headObserver = new MutationObserver(scheduleRepair);
    headObserver.observe(document.head, {
      childList: true,
      subtree: true,
      characterData: true,
      attributes: true,
      attributeFilter: ['content', 'href'],
    });

    const main = document.getElementById('main-content');
    if (main) {
      const mainObserver = new MutationObserver(scheduleRepair);
      mainObserver.observe(main, {
        attributes: true,
        attributeFilter: ['data-competition-id', 'data-competition-name'],
      });
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initialize, { once: true });
  } else {
    initialize();
  }
})();
