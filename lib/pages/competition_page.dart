import 'package:jaspr/dom.dart';
import 'package:jaspr/jaspr.dart';

import '../components/site_footer.dart';
import '../components/site_header.dart';

class CompetitionPage extends StatelessComponent {
  const CompetitionPage({
    required this.competitionId,
    required this.title,
    required this.tagline,
    required this.description,
    required this.accent,
    super.key,
  });
  final String competitionId;
  final String title;
  final String tagline;
  final String description;
  final String accent;

  @override
  Component build(BuildContext context) {
    return Component.fragment([
      Document.head(
        title: '$title | Fantasavuto',
        meta: {
          'description':
              'Vincitori e risultati di $title nel Fantacalcio del Savuto.',
        },
      ),
      const Document.body(attributes: {'data-page': 'competition'}),
      const SiteHeader(compact: true),
      main_(
        id: 'main-content',
        classes: 'competition-page competition-page--$accent',
        attributes: {
          'data-competition-id': competitionId,
          'data-competition-name': title,
        },
        [
          section(classes: 'page-hero competition-page__hero', [
            div(classes: 'shell competition-page__hero-grid', [
              div([
                a(href: '/#competizioni', classes: 'competition-back-link', [
                  Component.text('← Tutte le competizioni'),
                ]),
                p(classes: 'eyebrow eyebrow--accent', [
                  Component.text(tagline),
                ]),
                h1([Component.text(title)]),
                p([Component.text(description)]),
              ]),
              const img(
                src: '/assets/fantasavuto-logo.webp',
                alt: '',
                classes: 'competition-page__crest',
                attributes: {'width': '190', 'height': '190'},
              ),
            ]),
          ]),
          const section(classes: 'section competition-results', [
            div(classes: 'shell', [
              div(classes: 'section-heading', [
                div([
                  p(classes: 'eyebrow', [Component.text('Archivio ufficiale')]),
                  h2([Component.text('Vincitori')]),
                ]),
                p([
                  Component.text(
                    'Risultati pubblicati dall’amministrazione, dal più recente al meno recente.',
                  ),
                ]),
              ]),
              div(id: 'competition-empty', classes: 'results-empty', [
                span([Component.text('—')]),
                h3([Component.text('Nessun vincitore pubblicato')]),
                p([
                  Component.text(
                    'La sezione si aggiornerà automaticamente dopo la prima pubblicazione.',
                  ),
                ]),
              ]),
              div(id: 'competition-content', classes: 'is-hidden', [
                article(
                  id: 'competition-featured',
                  classes: 'featured-result',
                  [
                    div(classes: 'featured-result__meta', [
                      span(id: 'competition-featured-round', [
                        Component.text('—'),
                      ]),
                      span(id: 'competition-featured-date', [
                        Component.text('—'),
                      ]),
                    ]),
                    p(id: 'competition-featured-title', classes: 'eyebrow', [
                      Component.text('Ultimo risultato'),
                    ]),
                    h3(id: 'competition-featured-team', [Component.text('—')]),
                    p(id: 'competition-featured-manager', [
                      Component.text('—'),
                    ]),
                    strong(id: 'competition-featured-score', [
                      Component.text('—'),
                    ]),
                  ],
                ),
                div(
                  id: 'competition-winner-list',
                  classes: 'winner-history-grid',
                  [],
                ),
              ]),
            ]),
          ]),
        ],
      ),
      const SiteFooter(),
    ]);
  }
}
