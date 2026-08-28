import 'package:jaspr/dom.dart';
import 'package:jaspr/jaspr.dart';

import '../components/site_footer.dart';
import '../components/site_header.dart';
import '../components/sponsor_band.dart';

class HomePage extends StatelessComponent {
  const HomePage({super.key});

  @override
  Component build(BuildContext context) {
    return const Component.fragment([
      Document.head(
        title: 'Fantasavuto | Il Fantacalcio del Savuto',
        meta: {
          'description':
              'Il portale del Fantacalcio del Savuto: competizioni, vincitori, regolamento e sponsor.',
        },
      ),
      Document.body(attributes: {'data-page': 'home'}),
      SiteHeader(),
      main_(id: 'main-content', [
        section(classes: 'hero', [
          div(classes: 'hero-lines', []),
          div(classes: 'shell hero-grid', [
            div(classes: 'hero-copy', [
              img(
                src: '/assets/fantasavuto-logo.webp',
                alt: 'Logo Fantacalcio del Savuto',
                classes: 'hero-logo',
                attributes: {
                  'width': '118',
                  'height': '118',
                  'fetchpriority': 'high',
                },
              ),
              p(classes: 'eyebrow eyebrow--accent', [
                span(classes: 'status-pulse', []),
                Component.text('Stagione 2026/27 · 4ª edizione'),
              ]),
              h1([
                Component.text('Tutto il fantacalcio '),
                span([Component.text('del Savuto')]),
                Component.text(', in un solo posto.'),
              ]),
              p(classes: 'hero-lead', [
                Component.text(
                  'Competizioni, aggiornamenti, regolamento e protagonisti della giornata. Un portale unico, chiaro e sempre accessibile.',
                ),
              ]),
              div(classes: 'hero-actions', [
                a(href: '#competizioni', classes: 'button button--primary', [
                  Component.text('Scopri le competizioni'),
                  span(
                    attributes: {'aria-hidden': 'true'},
                    [Component.text('↘')],
                  ),
                ]),
                a(href: '/regolamento', classes: 'button button--ghost', [
                  Component.text('Leggi il regolamento'),
                ]),
              ]),
              div(classes: 'hero-metrics', [
                _Metric(value: '300', label: 'crediti iniziali'),
                _Metric(value: '25', label: 'giocatori in rosa'),
                _Metric(value: 'MANTRA', label: 'modalità di gioco'),
              ]),
            ]),
            aside(
              classes: 'winner-card',
              attributes: {'aria-labelledby': 'winner-card-title'},
              [
                div(classes: 'winner-card__top', [
                  p(classes: 'winner-card__label', [
                    span(classes: 'live-dot', []),
                    Component.text('Giornata in primo piano'),
                  ]),
                  span(id: 'winner-matchday', classes: 'round-badge', [
                    Component.text('—'),
                  ]),
                ]),
                div(classes: 'winner-card__body', [
                  p(id: 'winner-kicker', classes: 'winner-kicker', [
                    Component.text('Il prossimo protagonista'),
                  ]),
                  h2(id: 'winner-card-title', [
                    Component.text('In attesa del risultato'),
                  ]),
                  p(id: 'winner-manager', classes: 'winner-manager', [
                    Component.text(
                      'L’amministrazione pubblicherà qui il vincitore della giornata.',
                    ),
                  ]),
                  div(classes: 'winner-score-row', [
                    div([
                      span([Component.text('Punteggio')]),
                      strong(id: 'winner-score', [Component.text('—')]),
                    ]),
                    div([
                      span([Component.text('Data')]),
                      strong(id: 'winner-date', [Component.text('—')]),
                    ]),
                  ]),
                ]),
                div(classes: 'winner-card__footer', [
                  span([Component.text('FANTASAVUTO')]),
                  span([Component.text('In diretta dalla Valle del Savuto')]),
                ]),
              ],
            ),
          ]),
        ]),
        section(id: 'competizioni', classes: 'section competitions', [
          div(classes: 'shell', [
            div(classes: 'section-heading', [
              div([
                p(classes: 'eyebrow', [Component.text('Un’unica stagione')]),
                h2([Component.text('Più modi di vincere')]),
              ]),
              p([
                Component.text(
                  'Ogni competizione ha il proprio ritmo, ma tutte confluiscono nello stesso racconto.',
                ),
              ]),
            ]),
            div(classes: 'competition-grid', [
              _CompetitionCard(
                number: '01',
                tag: '38 giornate',
                title: 'Campionato',
                href: '/competizioni/campionato',
                description:
                    'La corsa lunga: continuità, strategia e classifica generale.',
                accent: 'lime',
              ),
              _CompetitionCard(
                number: '02',
                tag: 'Fase finale',
                title: 'Champions Savuto',
                href: '/competizioni/champions-savuto',
                description:
                    'La competizione che premia chi sa alzare il livello nei momenti decisivi.',
                accent: 'orange',
              ),
              _CompetitionCard(
                number: '03',
                tag: 'Girone d’andata',
                title: 'Campione d’inverno',
                href: '/competizioni/campione-inverno',
                description:
                    'Il primo traguardo stagionale per chi chiude davanti a metà percorso.',
                accent: 'blue',
              ),
              _CompetitionCard(
                number: '04',
                tag: 'Formula Uno',
                title: 'Coppa Sponsor',
                href: '/competizioni/coppa-sponsor',
                description:
                    'Una classifica speciale che valorizza costanza e piazzamenti.',
                accent: 'pink',
              ),
            ]),
          ]),
        ]),
        section(id: 'premi', classes: 'section prizes-section', [
          div(classes: 'shell', [
            div(classes: 'section-heading', [
              div([
                p(classes: 'eyebrow', [Component.text('Traguardi stagionali')]),
                h2([Component.text('Premi in palio')]),
              ]),
              p([
                Component.text(
                  'Il montepremi e i riconoscimenti ufficiali, aggiornati direttamente dall’amministrazione.',
                ),
              ]),
            ]),
            div(id: 'prizes-grid', classes: 'prize-grid', [
              article(classes: 'prize-card prize-card--placeholder', [
                span(classes: 'prize-card__index', [Component.text('—')]),
                div([
                  h3([Component.text('Premi in aggiornamento')]),
                  p([
                    Component.text(
                      'L’amministrazione pubblicherà qui il montepremi della stagione.',
                    ),
                  ]),
                ]),
              ]),
            ]),
          ]),
        ]),
        section(classes: 'section regulation-teaser', [
          div(classes: 'shell regulation-grid', [
            div(classes: 'regulation-intro', [
              p(classes: 'eyebrow eyebrow--light', [
                Component.text('Regole chiare, stagione migliore'),
              ]),
              h2([
                Component.text('Il regolamento'),
                em([Component.text('semplice.')]),
              ]),
              p([
                Component.text(
                  'Consultabile anche dal cellulare, con tutte le informazioni necessarie per giocare e vincere.',
                ),
              ]),
              a(href: '/regolamento', classes: 'text-link text-link--light', [
                Component.text('Consulta il regolamento completo'),
                span(
                  attributes: {'aria-hidden': 'true'},
                  [Component.text('→')],
                ),
              ]),
            ]),
            ol(classes: 'rule-highlights', [
              li([
                span([Component.text('01')]),
                div([
                  strong([Component.text('Modalità Mantra')]),
                  p([
                    Component.text(
                      'Ruoli, crediti e calciatori: tutto secondo le regole della modalità Mantra.',
                    ),
                  ]),
                ]),
              ]),
              li([
                span([Component.text('02')]),
                div([
                  strong([Component.text('Mercato e scadenze')]),
                  p([
                    Component.text(
                      'Finestre di mercato, scadenze e regole per le operazioni tra fantallenatori.',
                    ),
                  ]),
                ]),
              ]),
              li([
                span([Component.text('03')]),
                div([
                  strong([Component.text('Premi e competizioni')]),
                  p([
                    Component.text(
                      'Tutte le competizioni della stagione, con premi e riconoscimenti ufficiali.',
                    ),
                  ]),
                ]),
              ]),
            ]),
          ]),
        ]),
        SponsorBand(),
        section(classes: 'section social-callout', [
          div(classes: 'shell social-card', [
            div([
              p(classes: 'eyebrow', [Component.text('Fuori dal campo')]),
              h2([Component.text('La stagione continua sui social.')]),
              p([
                Component.text(
                  'Risultati, curiosità e aggiornamenti del Fantacalcio del Savuto.',
                ),
              ]),
            ]),
            a(
              href: 'https://www.instagram.com/fantacalciosavuto/',
              target: Target.blank,
              classes: 'button button--dark',
              attributes: {'rel': 'noopener noreferrer'},
              [Component.text('Seguici su Instagram ↗')],
            ),
          ]),
        ]),
      ]),
      SiteFooter(),
    ]);
  }
}

class _Metric extends StatelessComponent {
  const _Metric({required this.value, required this.label});

  final String value;
  final String label;

  @override
  Component build(BuildContext context) {
    return div(classes: 'metric', [
      strong([Component.text(value)]),
      span([Component.text(label)]),
    ]);
  }
}

class _CompetitionCard extends StatelessComponent {
  const _CompetitionCard({
    required this.number,
    required this.tag,
    required this.title,
    required this.href,
    required this.description,
    required this.accent,
  });

  final String number;
  final String tag;
  final String title;
  final String href;
  final String description;
  final String accent;

  @override
  Component build(BuildContext context) {
    return a(
      href: href,
      classes: 'competition-card competition-card--$accent',
      [
        div(classes: 'competition-card__meta', [
          span([Component.text(number)]),
          small([Component.text(tag)]),
        ]),
        div(classes: 'competition-card__copy', [
          h3([Component.text(title)]),
          p([Component.text(description)]),
        ]),
        const span(
          classes: 'competition-card__arrow',
          attributes: {'aria-hidden': 'true'},
          [Component.text('↗')],
        ),
      ],
    );
  }
}
