import 'package:jaspr/dom.dart';
import 'package:jaspr/jaspr.dart';
import 'package:jaspr_router/jaspr_router.dart';

import 'pages/admin_page.dart';
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
        ],
      ),
    ]);
  }
}
