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
        'description': 'Competizioni, vincitori di giornata, regolamento e sponsor del Fantacalcio del Savuto.',
        'theme-color': '#071814',
        'robots': 'index,follow',
      },
      head: [
        link(href: '/styles.css', rel: 'stylesheet'),
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
      ],
      body: const App(),
    ),
  );
}
