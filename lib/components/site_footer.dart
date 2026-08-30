import 'package:jaspr/dom.dart';
import 'package:jaspr/jaspr.dart';

class SiteFooter extends StatelessComponent {
  const SiteFooter({super.key});

  @override
  Component build(BuildContext context) {
    return const footer(classes: 'site-footer', [
      div(classes: 'shell footer-grid', [
        div(classes: 'footer-brand', [
          img(
            src: '/assets/fantasavuto-logo.webp',
            alt: '',
            classes: 'brand-logo brand-logo--footer',
            attributes: {'width': '46', 'height': '46', 'loading': 'lazy'},
          ),
          div([
            strong([Component.text('Fantasavuto')]),
            p([
              Component.text('Il Fantacalcio del Savuto, tutto in un posto.'),
            ]),
          ]),
        ]),
        nav(
          classes: 'footer-links',
          attributes: {'aria-label': 'Link del footer'},
          [
            a(href: '/regolamento', [Component.text('Regolamento')]),
            a(href: '/#premi', [Component.text('Premi')]),
            a(href: '/admin', [Component.text('Area admin')]),
            a(
              href: 'https://www.instagram.com/fantacalciosavuto/',
              target: Target.blank,
              attributes: {'rel': 'noopener noreferrer'},
              [Component.text('Instagram')],
            ),
          ],
        ),
      ]),
      div(classes: 'shell footer-bottom', [
        p([Component.text('© 2026 Fantasavuto')]),
        p(
          attributes: {'aria-live': 'polite'},
          [
            Component.text('Visite · '),
            span(id: 'visitor-count', [Component.text('—')]),
          ],
        ),
        p([Component.text('Stagione 2026/27 · 4ª edizione')]),
      ]),
      div(classes: 'shell footer-grid', [
        p(classes: 'footer-policy', [
          Component.text(
            'I diritti relativi ai termini Fantacalcio® e Mantra® e ai loghi correlati appartengono ai legittimi proprietari. Fantacalcio e Mantra sono marchi registrati da Fantacalcio S.r.l. Questo sito viene gestito in totale autonomia e non rappresenta in alcun modo la piattaforma ufficiale, né è a essa collegato, sponsorizzato o affiliato. Tutti i marchi registrati citati appartengono ai rispettivi proprietari.',
          ),
        ]),
      ]),
    ]);
  }
}
