import 'package:jaspr/dom.dart';
import 'package:jaspr/jaspr.dart';

class SponsorBand extends StatelessComponent {
  const SponsorBand({super.key});

  @override
  Component build(BuildContext context) {
    return section(
      id: 'sponsor-section',
      classes: 'sponsor-band is-hidden',
      attributes: const {'aria-labelledby': 'sponsor-title'},
      [
        div(classes: 'shell sponsor-heading', [
          div([
            p(classes: 'eyebrow', [Component.text('Il territorio fa squadra')]),
            h2(id: 'sponsor-title', [Component.text('Partner ufficiali')]),
          ]),
          p([
            Component.text(
              'Le attività che sostengono il Fantacalcio del Savuto.',
            ),
          ]),
        ]),
        div(
          classes: 'sponsor-viewport',
          attributes: const {
            'role': 'region',
            'aria-label': 'Elenco degli sponsor',
          },
          [
            div(
              id: 'sponsor-track',
              classes: 'sponsor-track',
              attributes: const {'aria-live': 'polite'},
              [],
            ),
          ],
        ),
      ],
    );
  }
}
