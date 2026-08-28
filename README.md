# Fantasavuto

Landing responsive e area amministrativa del Fantacalcio del Savuto, realizzate
con Jaspr e pensate per Firebase Hosting (`fantasavuto.web.app`).

## Cosa include

- home editoriale con competizioni e vincitore di giornata dinamico;
- regolamento nativo, leggibile anche da telefono e modificabile in Markdown;
- area admin protetta con accesso Google e allowlist Firestore;
- gestione completa degli sponsor: caricamento logo, link, ordine, visibilità,
  modifica ed eliminazione;
- fascia sponsor automatica: non appare senza loghi attivi, resta statica con un
  solo sponsor e scorre in loop da due sponsor in poi;
- regole Firestore e Storage con scrittura riservata agli amministratori;
- hosting statico, intestazioni di sicurezza e nessuna Cloud Function.

## Struttura

| Percorso | Contenuto |
| --- | --- |
| `/` | Landing e contenuti della giornata |
| `/regolamento` | Regolamento pubblico |
| `/admin` | Gestione riservata |
| `lib/` | Componenti e pagine Jaspr |
| `web/` | Stili, favicon e integrazione Firebase browser |
| `firestore.rules` | Permessi e validazione dei contenuti |
| `storage.rules` | Permessi e limiti per i loghi sponsor |

## Avvio locale

Prerequisiti: Dart SDK compatibile con Dart 3.10+, Firebase CLI e un browser.

```bash
dart pub get
dart run build_runner build --delete-conflicting-outputs
dart run jaspr_cli:jaspr serve
```

Se modifichi classi Jaspr che richiedono nuova generazione, rilancia
`build_runner` prima del server.

## Collegamento a Firebase

Il progetto Firebase previsto è già indicato come `fantasavuto` in
`.firebaserc`. Mancano soltanto gli identificativi specifici dell'app Web.

1. In Firebase Console apri **Impostazioni progetto → Le tue app**.
2. Registra, se necessario, un'app Web e copia la configurazione proposta.
3. Inserisci `apiKey`, `messagingSenderId` e `appId` in
   `web/firebase-config.js`. Gli altri valori sono già predisposti.
4. In **Authentication → Sign-in method** abilita Google.
5. Crea Firestore e Cloud Storage, se non sono ancora attivi.
6. Pubblica inizialmente regole e sito seguendo i comandi più sotto.

La configurazione Web di Firebase identifica il progetto ma non concede
privilegi amministrativi: l'accesso ai dati è protetto dalle regole incluse.

## Primo amministratore

La prima volta:

1. visita `/admin` e accedi con Google;
2. la pagina mostrerà l'UID dell'account non ancora autorizzato;
3. nella Firebase Console crea il documento Firestore `admins/<UID>`;
4. aggiungi, facoltativamente, campi descrittivi come `name` ed `email`;
5. ricarica `/admin`.

Il client non può creare o modificare documenti nella collezione `admins`.
L'abilitazione iniziale passa quindi volutamente dalla Console Firebase.

## Build e deploy

```bash
dart run jaspr_cli:jaspr build --sitemap-domain https://fantasavuto.web.app
firebase use fantasavuto
firebase deploy --only firestore:rules,storage,hosting
```

Per verificare una versione prima di pubblicarla sul dominio principale:

```bash
firebase hosting:channel:deploy review --project fantasavuto
```

Il build statico viene generato in `build/jaspr`, già configurato come cartella
pubblica in `firebase.json`.

Al primo deploy delle regole Storage, Firebase può chiedere di abilitare i
permessi necessari alla verifica dell'allowlist presente in Firestore.

## Modello dati

| Documento/collezione | Uso |
| --- | --- |
| `siteContent/currentWinner` | giornata, squadra, allenatore, punteggio e data |
| `siteContent/regulation` | stagione e testo Markdown del regolamento |
| `sponsors/{id}` | nome, logo, link, ordine e stato pubblico |
| `admins/{uid}` | allowlist degli amministratori |
| Storage `sponsors/*` | file dei loghi caricati dall'admin |

Il regolamento attuale del vecchio Google Site è disponibile soprattutto come
immagini. Nel nuovo sito è presente una sintesi iniziale; il testo integrale va
trascritto e pubblicato una volta dall'area admin per renderlo davvero
ricercabile e accessibile.

## Verifiche rapide

```bash
node --test test/site-utils.test.mjs
node --check web/firebase-app.js
```

I test coprono escaping del Markdown, URL esterni, ordinamento sponsor e nomi
file sicuri. Prima della pubblicazione definitiva è opportuno eseguire anche
`dart analyze` e il build Jaspr nel proprio ambiente Dart.

## Costi

L'architettura non usa server o Cloud Functions: Firebase Hosting serve i file
statici e Firestore/Storage vengono interrogati solo per i contenuti dinamici.
Per il traffico tipico di una lega locale l'impatto dovrebbe essere molto
contenuto, ma va comunque tenuto sotto controllo dalla sezione **Usage and
billing** della Console Firebase.
# fantasavuto
