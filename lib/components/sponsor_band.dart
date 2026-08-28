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
        div(classes: 'shell sponsor-surface', [
          div(classes: 'sponsor-dock-label', [
            p(classes: 'eyebrow', [Component.text('Il territorio fa squadra')]),
            h2(id: 'sponsor-title', [Component.text('Partner ufficiali')]),
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
        ]),
      ],
    );
  }
}
