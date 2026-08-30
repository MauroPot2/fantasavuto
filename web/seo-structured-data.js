(() => {
  const SITE_ORIGIN = 'https://fantasavuto.web.app';
  const SITE_NAME = 'Fantasavuto';
  const WEBSITE_ID = `${SITE_ORIGIN}/#website`;

  function getCanonicalLink() {
    return document.querySelector('link[rel="canonical"]');
  }

  function canonicalUrl() {
    return getCanonicalLink()?.href || `${SITE_ORIGIN}${window.location.pathname}`;
  }

  function metaContent(selector) {
    return document.querySelector(selector)?.getAttribute('content')?.trim() || '';
  }

  function upsertMetaByName(name, content) {
    let element = document.querySelector(`meta[name="${name}"]`);
    if (!element) {
      element = document.createElement('meta');
      element.setAttribute('name', name);
      document.head.appendChild(element);
    }
    element.setAttribute('content', content);
  }

  function upsertMetaByProperty(property, content) {
    let element = document.querySelector(`meta[property="${property}"]`);
    if (!element) {
      element = document.createElement('meta');
      element.setAttribute('property', property);
      document.head.appendChild(element);
    }
    element.setAttribute('content', content);
  }

  function upsertCanonical(url) {
    let element = getCanonicalLink();
    if (!element) {
      element = document.createElement('link');
      element.setAttribute('rel', 'canonical');
      document.head.appendChild(element);
    }
    element.setAttribute('href', url);
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

    element.textContent = JSON.stringify({
      '@context': 'https://schema.org',
      '@graph': [websiteSchema(), pageSchema()],
    });
  }

  function updateDynamicCompetitionSeo() {
    if (window.location.pathname !== '/competizioni/dettaglio') return;

    const main = document.getElementById('main-content');
    const competitionId = main?.dataset.competitionId?.trim();
    const competitionName = main?.dataset.competitionName?.trim();
    if (!competitionId || competitionId === '__dynamic__' || !competitionName) return;

    const title = `${competitionName} Fantacalcio del Savuto 2026/27 | Fantasavuto`;
    const description = `Risultati, vincitori e aggiornamenti di ${competitionName} nel Fantacalcio del Savuto, stagione 2026/27.`;
    const url = `${SITE_ORIGIN}/competizioni/dettaglio?id=${encodeURIComponent(competitionId)}`;

    document.title = title;
    upsertMetaByName('description', description);
    upsertMetaByName('robots', 'index,follow');
    upsertMetaByName('twitter:title', title);
    upsertMetaByName('twitter:description', description);
    upsertMetaByProperty('og:title', title);
    upsertMetaByProperty('og:description', description);
    upsertMetaByProperty('og:url', url);
    upsertCanonical(url);
    refreshStructuredData();
  }

  function initialize() {
    refreshStructuredData();
    updateDynamicCompetitionSeo();

    if (window.location.pathname !== '/competizioni/dettaglio') return;
    const main = document.getElementById('main-content');
    if (!main) return;

    const observer = new MutationObserver(updateDynamicCompetitionSeo);
    observer.observe(main, {
      attributes: true,
      attributeFilter: ['data-competition-id', 'data-competition-name'],
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initialize, { once: true });
  } else {
    initialize();
  }
})();
