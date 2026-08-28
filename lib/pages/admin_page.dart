import 'package:jaspr/dom.dart';
import 'package:jaspr/jaspr.dart';

import '../components/site_header.dart';

class AdminPage extends StatelessComponent {
  const AdminPage({super.key});

  @override
  Component build(BuildContext context) {
    return Component.fragment([
      const Document.head(
        title: 'Area admin | Fantasavuto',
        meta: const {
          'description': 'Gestione dei contenuti pubblici di Fantasavuto.',
          'robots': 'noindex,nofollow',
        },
      ),
      const Document.body(attributes: const {'data-page': 'admin'}),
      const SiteHeader(compact: true),
      main_(id: 'main-content', classes: 'admin-main', [
        const section(classes: 'admin-hero', [
          div(classes: 'shell admin-hero__inner', [
            div([
              p(classes: 'eyebrow eyebrow--accent', [
                Component.text('Pannello riservato'),
              ]),
              h1([Component.text('Gestione Fantasavuto')]),
              p([
                Component.text(
                  'Aggiorna il vincitore di giornata, il regolamento e la fascia degli sponsor.',
                ),
              ]),
            ]),
            a(href: '/', classes: 'text-link', [
              Component.text('← Torna al sito'),
            ]),
          ]),
        ]),
        const section(id: 'admin-loading', classes: 'shell admin-state', [
          const div(classes: 'loader', []),
          const p([Component.text('Verifica dell’accesso in corso…')]),
        ]),
        const section(
          id: 'admin-config-missing',
          classes: 'shell admin-state is-hidden',
          [
            div(classes: 'state-icon', [Component.text('!')]),
            h2([Component.text('Configurazione Firebase mancante')]),
            p([
              Component.text(
                'Completa web/firebase-config.js con i dati dell’app web Firebase prima di usare il pannello.',
              ),
            ]),
          ],
        ),
        const section(id: 'admin-login', classes: 'shell admin-state is-hidden', [
          div(classes: 'state-icon', [Component.text('FS')]),
          h2([Component.text('Accesso amministratore')]),
          p([
            Component.text(
              'Accedi con l’account Google autorizzato per gestire i contenuti.',
            ),
          ]),
          button(
            id: 'google-login-button',
            classes: 'button button--primary',
            attributes: const {'type': 'button'},
            [Component.text('Accedi con Google')],
          ),
        ]),
        const section(
          id: 'admin-unauthorized',
          classes: 'shell admin-state is-hidden',
          [
            div(classes: 'state-icon state-icon--warning', [
              Component.text('×'),
            ]),
            h2([Component.text('Account non autorizzato')]),
            p([
              Component.text(
                'L’accesso è riuscito, ma questo utente non è presente tra gli amministratori.',
              ),
            ]),
            div(classes: 'uid-box', [
              span([Component.text('UID da autorizzare')]),
              code(id: 'admin-user-uid', [Component.text('—')]),
            ]),
            button(
              id: 'unauthorized-logout-button',
              classes: 'button button--ghost-dark',
              attributes: const {'type': 'button'},
              [Component.text('Esci e usa un altro account')],
            ),
          ],
        ),
        section(id: 'admin-shell', classes: 'shell admin-shell is-hidden', [
          const div(classes: 'admin-toolbar', [
            div(classes: 'admin-user', [
              span(id: 'admin-user-avatar', classes: 'admin-user__avatar', [
                Component.text('A'),
              ]),
              div([
                strong(id: 'admin-user-name', [
                  Component.text('Amministratore'),
                ]),
                small(id: 'admin-user-email', [Component.text('')]),
              ]),
            ]),
            button(
              id: 'logout-button',
              classes: 'text-button',
              attributes: {'type': 'button'},
              [Component.text('Esci')],
            ),
          ]),
          div(classes: 'admin-layout', [
            const nav(
              classes: 'admin-tabs',
              attributes: {'aria-label': 'Sezioni amministrative'},
              [
                button(
                  classes: 'admin-tab is-active',
                  attributes: {'type': 'button', 'data-admin-tab': 'winner'},
                  [
                    span([Component.text('01')]),
                    Component.text('Vincitore'),
                  ],
                ),
                button(
                  classes: 'admin-tab',
                  attributes: {
                    'type': 'button',
                    'data-admin-tab': 'regulation',
                  },
                  [
                    span([Component.text('02')]),
                    Component.text('Regolamento'),
                  ],
                ),
                button(
                  classes: 'admin-tab',
                  attributes: {'type': 'button', 'data-admin-tab': 'sponsors'},
                  [
                    span([Component.text('03')]),
                    Component.text('Sponsor'),
                  ],
                ),
              ],
            ),
            div(classes: 'admin-panels', [
              _WinnerPanel(),
              _RegulationPanel(),
              _SponsorsPanel(),
            ]),
          ]),
        ]),
      ]),
      const div(
        id: 'admin-toast',
        classes: 'admin-toast',
        attributes: const {
          'role': 'status',
          'aria-live': 'polite',
          'aria-atomic': 'true',
        },
        [],
      ),
    ]);
  }
}

class _WinnerPanel extends StatelessComponent {
  @override
  Component build(BuildContext context) {
    return const section(
      id: 'panel-winner',
      classes: 'admin-panel',
      attributes: {'data-admin-panel': 'winner'},
      [
        div(classes: 'panel-heading', [
          div([
            p(classes: 'eyebrow', [Component.text('Home page')]),
            h2([Component.text('Vincitore di giornata')]),
          ]),
          p([
            Component.text(
              'Il dato salvato appare subito nella scheda principale del sito.',
            ),
          ]),
        ]),
        form(id: 'winner-form', classes: 'admin-form', [
          div(classes: 'form-grid form-grid--2', [
            _Field(
              id: 'winner-matchday-input',
              labelText: 'Giornata',
              type: 'number',
              attributes: {'min': '1', 'max': '60', 'required': 'required'},
            ),
            _Field(
              id: 'winner-date-input',
              labelText: 'Data',
              type: 'date',
              attributes: {'required': 'required'},
            ),
          ]),
          _Field(
            id: 'winner-team-input',
            labelText: 'Squadra vincitrice',
            type: 'text',
            attributes: {
              'maxlength': '80',
              'placeholder': 'Es. NK Maribor',
              'required': 'required',
            },
          ),
          div(classes: 'form-grid form-grid--2', [
            _Field(
              id: 'winner-manager-input',
              labelText: 'Fantallenatore',
              type: 'text',
              attributes: {'maxlength': '80', 'placeholder': 'Nome e cognome'},
            ),
            _Field(
              id: 'winner-score-input',
              labelText: 'Punteggio',
              type: 'number',
              attributes: {
                'min': '0',
                'max': '300',
                'step': '0.5',
                'required': 'required',
              },
            ),
          ]),
          _Field(
            id: 'winner-title-input',
            labelText: 'Titolo della scheda',
            type: 'text',
            attributes: {
              'maxlength': '90',
              'value': 'Vincitore di giornata',
              'placeholder': 'Es. Miglior punteggio di giornata',
              'required': 'required',
            },
          ),
          div(classes: 'form-actions', [
            button(
              classes: 'button button--primary',
              attributes: {'type': 'submit'},
              [Component.text('Pubblica vincitore')],
            ),
          ]),
        ]),
      ],
    );
  }
}

class _RegulationPanel extends StatelessComponent {
  @override
  Component build(BuildContext context) {
    return const section(
      id: 'panel-regulation',
      classes: 'admin-panel is-hidden',
      attributes: {'data-admin-panel': 'regulation'},
      [
        div(classes: 'panel-heading', [
          div([
            p(classes: 'eyebrow', [Component.text('Pagina pubblica')]),
            h2([Component.text('Regolamento')]),
          ]),
          p([
            Component.text(
              'Scrivi in Markdown: titoli con #, elenchi con - e grassetti con **testo**.',
            ),
          ]),
        ]),
        form(id: 'regulation-form', classes: 'admin-form', [
          _Field(
            id: 'regulation-season-input',
            labelText: 'Stagione',
            type: 'text',
            attributes: {
              'maxlength': '20',
              'value': '2025/26',
              'required': 'required',
            },
          ),
          div(classes: 'field', [
            label(
              attributes: {'for': 'regulation-markdown-input'},
              [Component.text('Testo del regolamento')],
            ),
            textarea(
              id: 'regulation-markdown-input',
              attributes: {
                'name': 'markdown',
                'rows': '22',
                'maxlength': '100000',
                'placeholder':
                    '# Regolamento 2025/26\n\n## 1. Rosa\n- 25 calciatori\n- 300 crediti',
                'required': 'required',
              },
              [],
            ),
          ]),
          details(classes: 'markdown-help', [
            summary([Component.text('Guida rapida alla formattazione')]),
            div([
              code([Component.text('# Titolo principale')]),
              code([Component.text('## Titolo di sezione')]),
              code([Component.text('- Voce di elenco')]),
              code([Component.text('**testo in grassetto**')]),
            ]),
          ]),
          div(classes: 'form-actions', [
            button(
              classes: 'button button--primary',
              attributes: {'type': 'submit'},
              [Component.text('Aggiorna regolamento')],
            ),
          ]),
        ]),
      ],
    );
  }
}

class _SponsorsPanel extends StatelessComponent {
  @override
  Component build(BuildContext context) {
    return const section(
      id: 'panel-sponsors',
      classes: 'admin-panel is-hidden',
      attributes: {'data-admin-panel': 'sponsors'},
      [
        div(classes: 'panel-heading', [
          div([
            p(classes: 'eyebrow', [Component.text('Fascia dinamica')]),
            h2([Component.text('Sponsor')]),
          ]),
          p([
            Component.text(
              'La fascia in home resta nascosta finché non esiste almeno uno sponsor attivo con logo.',
            ),
          ]),
        ]),
        form(id: 'sponsor-form', classes: 'admin-form sponsor-form', [
          input(
            id: 'sponsor-id-input',
            attributes: {'type': 'hidden', 'name': 'sponsorId'},
          ),
          _Field(
            id: 'sponsor-name-input',
            labelText: 'Nome sponsor',
            type: 'text',
            attributes: {
              'maxlength': '100',
              'placeholder': 'Es. Attività commerciale',
              'required': 'required',
            },
          ),
          div(classes: 'form-grid form-grid--2', [
            _Field(
              id: 'sponsor-website-input',
              labelText: 'Sito o pagina social',
              type: 'url',
              attributes: {'placeholder': 'https://…'},
            ),
            _Field(
              id: 'sponsor-order-input',
              labelText: 'Ordine',
              type: 'number',
              attributes: {
                'min': '0',
                'max': '9999',
                'value': '100',
                'required': 'required',
              },
            ),
          ]),
          div(classes: 'field', [
            label(
              attributes: {'for': 'sponsor-logo-input'},
              [Component.text('Logo ad alta qualità')],
            ),
            input(
              id: 'sponsor-logo-input',
              attributes: {
                'type': 'file',
                'name': 'logo',
                'accept': 'image/png,image/jpeg,image/webp,image/svg+xml',
              },
            ),
            small([
              Component.text(
                'PNG, WebP o SVG; massimo 5 MB. Sfondo trasparente consigliato.',
              ),
            ]),
          ]),
          _Field(
            id: 'sponsor-logo-url-input',
            labelText: 'Oppure URL del logo',
            type: 'url',
            attributes: {'placeholder': 'https://…'},
          ),
          label(classes: 'switch-field', [
            input(
              id: 'sponsor-active-input',
              attributes: {
                'type': 'checkbox',
                'name': 'active',
                'checked': 'checked',
              },
            ),
            span(classes: 'switch-control', []),
            span([Component.text('Mostra nella fascia pubblica')]),
          ]),
          div(classes: 'form-actions', [
            button(
              id: 'sponsor-submit-button',
              classes: 'button button--primary',
              attributes: {'type': 'submit'},
              [Component.text('Aggiungi sponsor')],
            ),
            button(
              id: 'sponsor-cancel-button',
              classes: 'text-button is-hidden',
              attributes: {'type': 'button'},
              [Component.text('Annulla modifica')],
            ),
          ]),
        ]),
        div(classes: 'sponsor-admin-list-wrap', [
          h3([Component.text('Sponsor inseriti')]),
          div(id: 'sponsor-admin-list', classes: 'sponsor-admin-list', [
            p(classes: 'empty-list', [
              Component.text('Nessuno sponsor inserito.'),
            ]),
          ]),
        ]),
      ],
    );
  }
}

class _Field extends StatelessComponent {
  const _Field({
    required this.id,
    required this.labelText,
    required this.type,
    this.attributes = const {},
  });

  final String id;
  final String labelText;
  final String type;
  final Map<String, String> attributes;

  @override
  Component build(BuildContext context) {
    return div(classes: 'field', [
      label(attributes: {'for': id}, [Component.text(labelText)]),
      input(id: id, attributes: {'type': type, 'name': id, ...attributes}),
    ]);
  }
}
