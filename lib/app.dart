import 'package:jaspr/dom.dart';
import 'package:jaspr/jaspr.dart';
import 'package:jaspr_router/jaspr_router.dart';

import 'pages/admin_page.dart';
import 'pages/competition_page.dart';
import 'pages/home_page.dart';
import 'pages/regulation_page.dart';

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
          Route(path: '/', builder: (context, state) => const HomePage()),
          Route(
            path: '/regolamento',
            builder: (context, state) => const RegulationPage(),
          ),
          Route(path: '/admin', builder: (context, state) => const AdminPage()),
          Route(
            path: '/competizioni/campionato',
            builder: (context, state) => const CompetitionPage(
              competitionId: 'campionato',
              title: 'Campionato',
              tagline: '38 giornate',
              description: 'La corsa lunga del Fantacalcio del Savuto: continuità, strategia e risultati giornata dopo giornata.',
              accent: 'lime',
            ),
          ),
          Route(
            path: '/competizioni/champions-savuto',
            builder: (context, state) => const CompetitionPage(
              competitionId: 'champions-savuto',
              title: 'Champions Savuto',
              tagline: 'Fase finale',
              description: 'Il percorso della competizione più intensa, con tutti i protagonisti dei turni decisivi.',
              accent: 'orange',
            ),
          ),
          Route(
            path: '/competizioni/campione-inverno',
            builder: (context, state) => const CompetitionPage(
              competitionId: 'campione-inverno',
              title: 'Campione d’inverno',
              tagline: 'Girone d’andata',
              description: 'Il primo grande traguardo stagionale e il protagonista che chiude davanti a metà percorso.',
              accent: 'blue',
            ),
          ),
          Route(
            path: '/competizioni/coppa-sponsor',
            builder: (context, state) => const CompetitionPage(
              competitionId: 'coppa-sponsor',
              title: 'Coppa Sponsor',
              tagline: 'Formula Uno',
              description: 'La classifica speciale dedicata a costanza, piazzamenti e prestazioni di giornata.',
              accent: 'pink',
            ),
          ),
          Route(
            path: '/competizioni/dettaglio',
            builder: (context, state) => const CompetitionPage(
              competitionId: '__dynamic__',
              title: 'Competizione',
              tagline: 'Fantasavuto',
              description: 'Dettagli e risultati della competizione.',
              accent: 'lime',
            ),
          ),
        ],
      ),
    ]);
  }
}
