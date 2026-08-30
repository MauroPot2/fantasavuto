(() => {
  const MEASUREMENT_ID = 'G-HKCHXL4QNM';
  const STORAGE_KEY = 'fantasavuto_cookie_consent_v1';

  let analyticsLoaded = false;

  function readConsent() {
    try {
      return JSON.parse(localStorage.getItem(STORAGE_KEY));
    } catch (_) {
      return null;
    }
  }

  function saveConsent(analytics) {
    const value = {
      analytics,
      updatedAt: new Date().toISOString(),
    };

    localStorage.setItem(STORAGE_KEY, JSON.stringify(value));
  }

  function updateConsent(analytics) {
    if (typeof window.gtag !== 'function') {
      window.dataLayer = window.dataLayer || [];
      window.gtag = function () {
        window.dataLayer.push(arguments);
      };
    }

    window.gtag('consent', 'update', {
      analytics_storage: analytics ? 'granted' : 'denied',
      ad_storage: 'denied',
      ad_user_data: 'denied',
      ad_personalization: 'denied',
    });
  }

  function loadAnalytics() {
    updateConsent(true);

    if (analyticsLoaded) return;

    analyticsLoaded = true;

    const script = document.createElement('script');
    script.async = true;
    script.src =
      `https://www.googletagmanager.com/gtag/js?id=${MEASUREMENT_ID}`;

    document.head.appendChild(script);

    window.gtag('js', new Date());

    window.gtag('config', MEASUREMENT_ID, {
      anonymize_ip: true,
    });
  }

  function rejectAnalytics() {
    updateConsent(false);
  }

  function removeBanner() {
    document.getElementById('fs-cookie-banner')?.remove();
  }

  function closePreferences() {
    document.getElementById('fs-cookie-modal')?.remove();
  }

  function showCookieButton() {
    if (document.getElementById('fs-cookie-settings-button')) return;

    const button = document.createElement('button');

    button.id = 'fs-cookie-settings-button';
    button.className = 'fs-cookie-settings-button';
    button.type = 'button';
    button.setAttribute('aria-label', 'Gestisci preferenze cookie');
    button.innerHTML = '🍪';

    button.addEventListener('click', openPreferences);

    document.body.appendChild(button);
  }

  function acceptAll() {
    saveConsent(true);
    loadAnalytics();

    removeBanner();
    closePreferences();
    showCookieButton();
  }

  function rejectAll() {
    saveConsent(false);
    rejectAnalytics();

    removeBanner();
    closePreferences();
    showCookieButton();
  }

  function savePreferences() {
    const analytics =
      document.getElementById('fs-analytics-toggle')?.checked ?? false;

    saveConsent(analytics);

    if (analytics) {
      loadAnalytics();
    } else {
      rejectAnalytics();
    }

    removeBanner();
    closePreferences();
    showCookieButton();
  }

  function openPreferences() {
    closePreferences();

    const current = readConsent();
    const enabled = current?.analytics === true;

    const overlay = document.createElement('div');

    overlay.id = 'fs-cookie-modal';
    overlay.className = 'fs-cookie-modal-overlay';

    overlay.innerHTML = `
      <div
        class="fs-cookie-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="fs-cookie-title"
      >
        <div class="fs-cookie-modal-header">
          <div>
            <span class="fs-cookie-eyebrow">Privacy</span>
            <h2 id="fs-cookie-title">Preferenze cookie</h2>
          </div>

          <button
            type="button"
            class="fs-cookie-close"
            aria-label="Chiudi preferenze"
          >
            ×
          </button>
        </div>

        <p class="fs-cookie-description">
          Puoi scegliere quali strumenti utilizzare.
          I cookie necessari sono sempre attivi perché servono
          al corretto funzionamento di Fantasavuto.
        </p>

        <div class="fs-cookie-option">
          <div>
            <strong>Cookie necessari</strong>
            <p>
              Permettono il funzionamento delle funzionalità essenziali
              del sito.
            </p>
          </div>

          <span class="fs-cookie-always-on">Sempre attivi</span>
        </div>

        <div class="fs-cookie-option">
          <div>
            <strong>Analytics</strong>
            <p>
              Google Analytics ci aiuta a capire quali pagine vengono
              utilizzate e come migliorare Fantasavuto.
            </p>
          </div>

          <label class="fs-cookie-switch">
            <input
              id="fs-analytics-toggle"
              type="checkbox"
              ${enabled ? 'checked' : ''}
            />
            <span></span>
          </label>
        </div>

        <div class="fs-cookie-policy">
          Per maggiori informazioni consulta la
          <a href="/cookie-policy">Cookie Policy</a>.
        </div>

        <div class="fs-cookie-modal-actions">
          <button
            type="button"
            class="fs-cookie-button fs-cookie-secondary"
            id="fs-cookie-reject-modal"
          >
            Rifiuta
          </button>

          <button
            type="button"
            class="fs-cookie-button fs-cookie-primary"
            id="fs-cookie-save"
          >
            Salva preferenze
          </button>
        </div>
      </div>
    `;

    document.body.appendChild(overlay);

    overlay
      .querySelector('.fs-cookie-close')
      ?.addEventListener('click', closePreferences);

    document
      .getElementById('fs-cookie-reject-modal')
      ?.addEventListener('click', rejectAll);

    document
      .getElementById('fs-cookie-save')
      ?.addEventListener('click', savePreferences);
  }

  function showBanner() {
    if (document.getElementById('fs-cookie-banner')) return;

    const banner = document.createElement('section');

    banner.id = 'fs-cookie-banner';
    banner.className = 'fs-cookie-banner';
    banner.setAttribute('aria-label', 'Impostazioni cookie');

    banner.innerHTML = `
      <button
        class="fs-cookie-banner-close"
        type="button"
        aria-label="Continua senza accettare i cookie Analytics"
      >
        ×
      </button>

      <div class="fs-cookie-content">
        <div class="fs-cookie-icon">🍪</div>

        <div class="fs-cookie-copy">
          <span class="fs-cookie-eyebrow">Privacy</span>

          <h2>La tua privacy conta</h2>

          <p>
            Utilizziamo cookie tecnici necessari al funzionamento del sito
            e, solo con il tuo consenso, Google Analytics per capire come
            viene utilizzato Fantasavuto.
            Puoi modificare la tua scelta in qualsiasi momento.
          </p>

          <a href="/cookie-policy" class="fs-cookie-policy-link">
            Scopri di più
          </a>
        </div>
      </div>

      <div class="fs-cookie-actions">
        <button
          type="button"
          id="fs-cookie-reject"
          class="fs-cookie-button fs-cookie-secondary"
        >
          Rifiuta
        </button>

        <button
          type="button"
          id="fs-cookie-preferences"
          class="fs-cookie-button fs-cookie-secondary"
        >
          Preferenze
        </button>

        <button
          type="button"
          id="fs-cookie-accept"
          class="fs-cookie-button fs-cookie-primary"
        >
          Accetta
        </button>
      </div>
    `;

    document.body.appendChild(banner);

    banner
      .querySelector('.fs-cookie-banner-close')
      ?.addEventListener('click', rejectAll);

    document
      .getElementById('fs-cookie-reject')
      ?.addEventListener('click', rejectAll);

    document
      .getElementById('fs-cookie-preferences')
      ?.addEventListener('click', openPreferences);

    document
      .getElementById('fs-cookie-accept')
      ?.addEventListener('click', acceptAll);
  }

  function initialize() {
    const saved = readConsent();

    if (!saved) {
      showBanner();
      return;
    }

    if (saved.analytics === true) {
      loadAnalytics();
    } else {
      rejectAnalytics();
    }

    showCookieButton();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initialize);
  } else {
    initialize();
  }
})();