import 'package:jaspr/dom.dart';
import 'package:jaspr/jaspr.dart';

/// Vetrina completa degli sponsor mostrata nella homepage.
///
/// I contenuti vengono popolati da Firebase usando gli stessi sponsor attivi
/// della dock persistente. L'ID `sponsor-section` resta il riferimento pubblico
/// usato dalle impostazioni CMS della barra sponsor.
class SponsorSection extends StatelessComponent {
  const SponsorSection({super.key});

  @override
  Component build(BuildContext context) {
    return const section(
      id: 'sponsor-section',
      classes: 'section sponsor-showcase is-hidden',
      attributes: {'aria-labelledby': 'sponsor-title'},
      [
        div(classes: 'shell', [
          div(classes: 'sponsor-showcase__surface', [
            div(classes: 'sponsor-heading sponsor-showcase__heading', [
              div([
                p(classes: 'eyebrow', [
                  Component.text('Il territorio fa squadra'),
                ]),
                h2(id: 'sponsor-title', [
                  Component.text('Partner ufficiali'),
                ]),
              ]),
              p([
                Component.text(
                  'Le attività e le realtà che sostengono Fantasavuto e accompagnano la nostra stagione.',
                ),
              ]),
            ]),
            div(
              classes: 'sponsor-showcase__intro',
              [
                span(classes: 'sponsor-showcase__badge', [
                  Component.text('Grazie ai nostri partner'),
                ]),
                p([
                  Component.text(
                    'Scopri chi rende possibile il Fantacalcio del Savuto. Tocca un logo per visitare il sito del partner.',
                  ),
                ]),
              ],
            ),
            div(
              id: 'sponsor-track',
              classes: 'sponsor-showcase__grid',
              attributes: {
                'role': 'list',
                'aria-live': 'polite',
                'aria-label': 'Tutti gli sponsor ufficiali',
              },
              [],
            ),
          ]),
        ]),
      ],
    );
  }
}
