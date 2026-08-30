import 'package:jaspr/dom.dart';
import 'package:jaspr/jaspr.dart';
import 'package:jaspr_router/jaspr_router.dart';

import 'components/seo_head.dart';
import 'pages/admin_page.dart';
import 'pages/competition_page.dart';
import 'pages/home_page.dart';
import 'pages/regulation_page.dart';

Component _seoPage({
  required Component page,
  required String title,
  required String description,
  required String canonicalPath,
  String robots = 'index,follow',
  String ogType = 'website',
}) {
  return Component.fragment([
    page,
    SeoHead(
      title: title,
      description: description,
      canonicalPath: canonicalPath,
      robots: robots,
      ogType: ogType,
    ),
  ]);
}

class App extends StatelessComponent {
  const App({super.key});

  @override
  Component build(BuildContext context) {
    return Component.fragment([
      const Document.html(attributes: const {'lang': 'it'}),
      const Document.body(attributes: const {'class': 'site-body'}),
      const a(href: '#main-content', classes: 'skip-link', [
        Component.text('Vai al contenuto'),
      ]),
      Router(
        routes: [
          Route(
            path: '/',
            builder: (context, state) => _seoPage(
              page: const HomePage(),
              title: 'Fantasavuto | Fantacalcio del Savuto 2026/27',
              description:
                  'Fantasavuto è il portale del Fantacalcio del Savuto: competizioni, risultati, vincitori di giornata, premi e regolamento della stagione 2026/27.',
              canonicalPath: '/',
            ),
          ),
          Route(
            path: '/regolamento',
            builder: (context, state) => _seoPage(
              page: const RegulationPage(),
              title:
                  'Regolamento Fantacalcio del Savuto 2026/27 | Fantasavuto',
              description:
                  'Consulta il regolamento aggiornato del Fantacalcio del Savuto 2026/27: rosa, mercato, competizioni, premi e regole della modalità Mantra.',
              canonicalPath: '/regolamento',
            ),
          ),
          Route(
            path: '/admin',
            builder: (context, state) => _seoPage(
              page: const AdminPage(),
              title: 'Area admin | Fantasavuto',
              description: 'Gestione riservata dei contenuti di Fantasavuto.',
              canonicalPath: '/admin',
              robots: 'noindex,nofollow',
            ),
          ),
          Route(
            path: '/competizioni/campionato',
            builder: (context, state) => _seoPage(
              page: const CompetitionPage(
                competitionId: 'campionato',
                title: 'Campionato',
                tagline: '38 giornate',
                description:
                    'La corsa lunga del Fantacalcio del Savuto: continuità, strategia e risultati giornata dopo giornata.',
                accent: 'lime',
              ),
              title:
                  'Campionato Fantacalcio del Savuto 2026/27 | Fantasavuto',
              description:
                  'Risultati, vincitori e aggiornamenti del Campionato del Fantacalcio del Savuto, stagione 2026/27.',
              canonicalPath: '/competizioni/campionato',
            ),
          ),
          Route(
            path: '/competizioni/champions-savuto',
            builder: (context, state) => _seoPage(
              page: const CompetitionPage(
                competitionId: 'champions-savuto',
                title: 'Champions Savuto',
                tagline: 'Fase finale',
                description:
                    'Il percorso della competizione più intensa, con tutti i protagonisti dei turni decisivi.',
                accent: 'orange',
              ),
              title:
                  'Champions Savuto 2026/27 | Fantacalcio del Savuto',
              description:
                  'Risultati, vincitori e aggiornamenti della Champions Savuto nella stagione 2026/27 del Fantacalcio del Savuto.',
              canonicalPath: '/competizioni/champions-savuto',
            ),
          ),
          Route(
            path: '/competizioni/campione-inverno',
            builder: (context, state) => _seoPage(
              page: const CompetitionPage(
                competitionId: 'campione-inverno',
                title: 'Campione d’inverno',
                tagline: 'Girone d’andata',
                description:
                    'Il primo grande traguardo stagionale e il protagonista che chiude davanti a metà percorso.',
                accent: 'blue',
              ),
              title:
                  'Campione d’inverno 2026/27 | Fantacalcio del Savuto',
              description:
                  'Scopri risultati e vincitore del Campione d’inverno 2026/27 del Fantacalcio del Savuto.',
              canonicalPath: '/competizioni/campione-inverno',
            ),
          ),
          Route(
            path: '/competizioni/coppa-sponsor',
            builder: (context, state) => _seoPage(
              page: const CompetitionPage(
                competitionId: 'coppa-sponsor',
                title: 'Coppa Sponsor',
                tagline: 'Formula Uno',
                description:
                    'La classifica speciale dedicata a costanza, piazzamenti e prestazioni di giornata.',
                accent: 'pink',
              ),
              title: 'Coppa Sponsor 2026/27 | Fantacalcio del Savuto',
              description:
                  'Classifica, risultati e vincitori della Coppa Sponsor del Fantacalcio del Savuto, stagione 2026/27.',
              canonicalPath: '/competizioni/coppa-sponsor',
            ),
          ),
          Route(
            path: '/competizioni/dettaglio',
            builder: (context, state) {
              final competitionId = state.queryParams['id']?.trim() ?? '';
              final hasCompetitionId = competitionId.isNotEmpty;
              final canonicalPath = hasCompetitionId
                  ? '/competizioni/dettaglio?id=${Uri.encodeQueryComponent(competitionId)}'
                  : '/competizioni/dettaglio';

              return _seoPage(
                page: const CompetitionPage(
                  competitionId: '__dynamic__',
                  title: 'Competizione',
                  tagline: 'Fantasavuto',
                  description: 'Dettagli e risultati della competizione.',
                  accent: 'lime',
                ),
                title: 'Competizione | Fantasavuto',
                description:
                    'Risultati e vincitori delle competizioni del Fantacalcio del Savuto.',
                canonicalPath: canonicalPath,
                robots: hasCompetitionId ? 'index,follow' : 'noindex,follow',
              );
            },
          ),
        ],
      ),
    ]);
  }
}
