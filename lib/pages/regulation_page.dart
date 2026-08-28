import 'package:jaspr/dom.dart';
import 'package:jaspr/jaspr.dart';

import '../components/site_footer.dart';
import '../components/site_header.dart';

class RegulationPage extends StatelessComponent {
  const RegulationPage({super.key});

  @override
  Component build(BuildContext context) {
    return const Component.fragment([
      Document.head(
        title: 'Regolamento | Fantasavuto',
        meta: {
          'description':
              'Regolamento aggiornato del Fantacalcio del Savuto, stagione 2026/27.',
        },
      ),
      Document.body(attributes: {'data-page': 'regulation'}),
      SiteHeader(compact: true),
      main_(id: 'main-content', [
        section(classes: 'page-hero', [
          div(classes: 'shell page-hero__grid', [
            div([
              p(classes: 'eyebrow eyebrow--accent', [
                Component.text('Documento ufficiale'),
              ]),
              h1([Component.text('Regolamento')]),
              p([
                Component.text(
                  'Una versione leggibile, sempre aggiornata e consultabile da qualsiasi dispositivo.',
                ),
              ]),
            ]),
            div(classes: 'document-stamp', [
              span([Component.text('STAGIONE')]),
              strong(id: 'regulation-season-badge', [
                Component.text('2026/27'),
              ]),
              small([Component.text('4ª EDIZIONE')]),
            ]),
          ]),
        ]),
        section(classes: 'section regulation-page', [
          div(classes: 'shell regulation-layout', [
            aside(classes: 'regulation-aside', [
              p(classes: 'regulation-aside__title', [
                Component.text('In sintesi'),
              ]),
              dl([
                dt([Component.text('Modalità')]),
                dd([Component.text('Mantra')]),
                dt([Component.text('Budget')]),
                dd([Component.text('300 crediti')]),
                dt([Component.text('Rosa')]),
                dd([Component.text('25 calciatori')]),
                dt([Component.text('Quota')]),
                dd([Component.text('€ 35,00')]),
              ]),
              p(classes: 'regulation-updated', [
                Component.element(
                  tag: 'time',
                  attributes: {'id': 'regulation-updated-at'},
                  children: [Component.text('in attesa di pubblicazione')],
                ),
              ]),
            ]),
            article(id: 'regulation-content', classes: 'regulation-content', [
              h2([Component.text('Regolamento stagione 2026/27')]),
              p(classes: 'notice-box', [
                Component.text(
                  'Questa è la versione sintetica iniziale. Dall’area admin sarà possibile pubblicare il testo completo senza modificare il codice.',
                ),
              ]),
              h3([Component.text('1. Composizione della rosa')]),
              p([
                Component.text(
                  'Ogni fantallenatore dispone di 300 crediti per comporre una rosa di 25 calciatori secondo i ruoli previsti dalla modalità Mantra.',
                ),
              ]),
              h3([Component.text('2. Competizioni')]),
              ul([
                li([Component.text('Campionato')]),
                li([Component.text('Campione d’inverno')]),
                li([Component.text('Champions Savuto')]),
                li([Component.text('Coppa Sponsor Formula Uno')]),
              ]),
              h3([Component.text('3. Aggiornamenti')]),
              p([
                Component.text(
                  'In caso di modifica farà fede il testo pubblicato in questa pagina con la relativa data di aggiornamento.',
                ),
              ]),
            ]),
          ]),
        ]),
      ]),
      SiteFooter(),
    ]);
  }
}
