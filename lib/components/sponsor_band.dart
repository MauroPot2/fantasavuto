import 'package:jaspr/dom.dart';
import 'package:jaspr/jaspr.dart';

/// Dock sponsor persistente ancorata al fondo dello schermo.
///
/// La vetrina completa della homepage è gestita da [SponsorSection]; questa
/// componente mostra invece una selezione scorrevole degli stessi partner.
class SponsorBand extends StatelessComponent {
  const SponsorBand({super.key});

  @override
  Component build(BuildContext context) {
    return const section(
      id: 'sponsor-dock',
      classes: 'sponsor-band is-hidden',
      attributes: {'aria-labelledby': 'sponsor-dock-title'},
      [
        div(classes: 'shell sponsor-surface', [
          div(classes: 'sponsor-dock-label', [
            p(classes: 'eyebrow', [Component.text('Il territorio fa squadra')]),
            h2(id: 'sponsor-dock-title', [Component.text('Partner ufficiali')]),
          ]),
          div(
            classes: 'sponsor-viewport',
            attributes: {
              'role': 'region',
              'aria-label': 'Sponsor ufficiali in evidenza',
            },
            [
              div(
                id: 'sponsor-dock-track',
                classes: 'sponsor-track',
                attributes: {'aria-live': 'off'},
                [],
              ),
            ],
          ),
        ]),
      ],
    );
  }
}
