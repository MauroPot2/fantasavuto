import 'package:jaspr/dom.dart';
import 'package:jaspr/jaspr.dart';

class SiteHeader extends StatelessComponent {
  const SiteHeader({this.compact = false, super.key});

  final bool compact;

  @override
  Component build(BuildContext context) {
    return header(
      classes: compact ? 'site-header site-header--compact' : 'site-header',
      [
        div(classes: 'shell header-inner', [
          a(
            href: '/',
            classes: 'brand',
            attributes: const {'aria-label': 'Fantasavuto, torna alla home'},
            [
              span(classes: 'brand-mark', [Component.text('FS')]),
              span(classes: 'brand-copy', [
                strong([Component.text('FANTASAVUTO')]),
                small([Component.text('Fantacalcio del Savuto')]),
              ]),
            ],
          ),
          nav(
            classes: 'main-nav',
            attributes: const {'aria-label': 'Navigazione principale'},
            [
              a(href: '/#competizioni', [Component.text('Competizioni')]),
              a(href: '/regolamento', [Component.text('Regolamento')]),
              a(href: '/#sponsor-section', [Component.text('Sponsor')]),
            ],
          ),
          a(
            href: '/admin',
            classes: 'admin-link',
            [
              span(classes: 'admin-link__dot', []),
              Component.text('Area admin'),
            ],
          ),
        ]),
      ],
    );
  }
}

