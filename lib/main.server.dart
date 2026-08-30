import 'package:jaspr/dom.dart';
import 'package:jaspr/server.dart';

import 'app.dart';
import 'main.server.options.dart';

void main() {
  Jaspr.initializeApp(options: defaultServerOptions);
  runApp(
    const Document(
      title: 'Fantasavuto | Il Fantacalcio del Savuto',
      meta: const {
        'description':
            'Competizioni, vincitori di giornata, regolamento e sponsor del Fantacalcio del Savuto.',
        'theme-color': '#071814',
        'robots': 'index,follow',
      },
      head: [
        Component.element(
          tag: 'script',
          attributes: const {},
          children: [
            Component.text('''
window.dataLayer = window.dataLayer || [];
function gtag(){dataLayer.push(arguments);}

gtag('consent', 'default', {
  'analytics_storage': 'denied',
  'ad_storage': 'denied',
  'ad_user_data': 'denied',
  'ad_personalization': 'denied'
});
'''),
          ],
        ),

        link(href: '/styles.css', rel: 'stylesheet'),
        link(href: '/sponsor-material.css', rel: 'stylesheet'),
        link(href: '/sponsor-section.css', rel: 'stylesheet'),
        link(href: '/admin-cms.css', rel: 'stylesheet'),
        link(href: '/cookie-consent.css', rel: 'stylesheet'),
        link(href: '/cms-v2.css', rel: 'stylesheet'),
        link(
          href: '/favicon.png',
          rel: 'icon',
          attributes: const {'type': 'image/png', 'sizes': '64x64'},
        ),
        link(
          href: '/apple-touch-icon.png',
          rel: 'apple-touch-icon',
          attributes: const {'sizes': '180x180'},
        ),
        link(
          href: '/assets/fantasavuto-logo.webp',
          rel: 'preload',
          attributes: const {'as': 'image', 'type': 'image/webp'},
        ),
        Component.element(
          tag: 'meta',
          attributes: const {
            'property': 'og:title',
            'content': 'Fantasavuto | Il Fantacalcio del Savuto',
          },
          children: const [],
        ),
        Component.element(
          tag: 'meta',
          attributes: const {
            'property': 'og:description',
            'content': 'Tutto il Fantacalcio del Savuto in un solo portale.',
          },
          children: const [],
        ),
        Component.element(
          tag: 'meta',
          attributes: const {'property': 'og:type', 'content': 'website'},
          children: const [],
        ),
        Component.element(
          tag: 'script',
          attributes: const {'type': 'module', 'src': '/firebase-app.js'},
          children: const [],
        ),
        Component.element(
          tag: 'script',
          attributes: const {'type': 'module', 'src': '/visitor-counter.js'},
          children: const [],
        ),
        Component.element(
          tag: 'script',
          attributes: const {'type': 'module', 'src': '/cms-app.js'},
          children: const [],
        ),
        Component.element(
          tag: 'script',
          attributes: const {'type': 'module', 'src': '/sponsor-dock-sync.js'},
          children: const [],
        ),
        Component.element(
          tag: 'script',
          attributes: const {'type': 'module', 'src': '/cms-v2.js'},
          children: const [],
        ),
        Component.element(
          tag: 'script',
          attributes: const {'type': 'module', 'src': '/cms-v2-overrides.js'},
          children: const [],
        ),
        Component.element(
          tag: 'script',
          attributes: const {'type': 'module', 'src': '/cms-v2-storage-fix.js'},
          children: const [],
        ),
        Component.element(
          tag: 'script',
          attributes: const {
            'type': 'module',
            'src': '/sponsor-cache-migration.js',
          },
          children: const [],
        ),
        Component.element(
          tag: 'script',
          attributes: const {'src': '/cookie-consent.js', 'defer': ''},
          children: const [],
        ),
        Component.element(
          tag: 'script',
          attributes: const {'src': '/analytics-events.js', 'defer': ''},
          children: const [],
        ),
        Component.element(
          tag: 'script',
          attributes: const {
            'type': 'module',
            'src': '/sponsor-image-optimization.js',
          },
          children: const [],
        ),
      ],
      body: const App(),
    ),
  );
}
