import 'package:jaspr/dom.dart';
import 'package:jaspr/jaspr.dart';

class SiteFooter extends StatelessComponent {
  const SiteFooter({super.key});

  @override
  Component build(BuildContext context) {
    return footer(classes: 'site-footer', [
      div(classes: 'shell footer-grid', [
        div(classes: 'footer-brand', [
          span(classes: 'brand-mark brand-mark--small', [Component.text('FS')]),
          div([
            strong([Component.text('Fantasavuto')]),
            p([Component.text('Il Fantacalcio del Savuto, tutto in un posto.')]),
          ]),
        ]),
        nav(
          classes: 'footer-links',
          attributes: const {'aria-label': 'Link del footer'},
          [
            a(href: '/regolamento', [Component.text('Regolamento')]),
            a(href: '/admin', [Component.text('Area admin')]),
            a(
              href: 'https://www.instagram.com/fantacalciosavuto/',
              target: Target.blank,
              attributes: const {'rel': 'noopener noreferrer'},
              [Component.text('Instagram')],
            ),
          ],
        ),
      ]),
      div(classes: 'shell footer-bottom', [
        p([Component.text('© 2026 Fantasavuto')]),
        p([Component.text('Stagione 2025/26 · 3ª edizione')]),
      ]),
    ]);
  }
}

