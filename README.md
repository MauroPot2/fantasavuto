# Fantasavuto

Landing responsive e area amministrativa del Fantacalcio del Savuto, realizzate
con Jaspr e pensate per Firebase Hosting (`fantasavuto.web.app`).

## Cosa include

- home editoriale con competizioni cliccabili, premi e vincitore dinamico;
- archivio dei vincitori separato per ciascuna competizione;
- regolamento nativo diviso in sezioni Markdown modificabili singolarmente;
- gestione completa dei premi dall’area admin;
- area admin protetta con accesso Google e allowlist Firestore basata su email;
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
| `/competizioni/<nome>` | Storico dei vincitori della competizione |
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

## Amministratori tramite email

Gli amministratori vengono autorizzati direttamente dalla Firebase Console,
senza dover conoscere o copiare alcun UID.

Per aggiungere un amministratore:

1. apri **Firestore Database** nella Firebase Console;
2. apri o crea la collezione `admins`;
3. crea un documento usando come **ID documento l'indirizzo email in minuscolo**,
   per esempio `nome@gmail.com`;
4. aggiungi un campo descrittivo qualsiasi, per esempio `name: "Mario Rossi"`;
5. l'utente può quindi visitare `/admin` e accedere con lo stesso account Google.

L'indirizzo viene normalizzato in minuscolo sia nel client sia nelle Security
Rules. L'accesso è concesso solo se Firebase Authentication considera verificata
l'email dell'account.

Per revocare un amministratore è sufficiente eliminare il relativo documento da
`admins`.

Il client non può creare, modificare, elencare o eliminare documenti nella
collezione `admins`: la gestione dell'allowlist resta riservata alla Console
Firebase.

> Prima di pubblicare le nuove regole, crea almeno il documento `admins/<tua-email>`
> per non perdere temporaneamente l'accesso al pannello con il vecchio documento
> basato su UID.

## Build e deploy

```bash
dart run jaspr_cli:jaspr build --sitemap-domain https://fantasavuto.web.app
npm run seo:sitemap
firebase use fantasavuto
firebase deploy --only firestore:rules,storage,hosting
```

Il passaggio `npm run seo:sitemap` rimuove dalla sitemap le route riservate o
generiche che non devono essere proposte ai motori di ricerca, come `/admin` e
`/competizioni/dettaglio` senza un ID di competizione.

Per verificare una versione prima di pubblicarla sul dominio principale:

```bash
firebase hosting:channel:deploy review --project fantasavuto
```

Il build statico viene generato in `build/jaspr`, già configurato come cartella
pubblica in `firebase.json`.

Al primo deploy delle regole Storage, Firebase può chiedere di abilitare i
permessi necessari alla verifica dell'allowlist presente in Firestore.

## SEO e Google Search Console

Il sito usa come origine canonica `https://fantasavuto.web.app` e include:

- title e description specifici per home, regolamento e competizioni;
- URL canonical per evitare duplicati;
- metadata Open Graph e Twitter;
- `robots.txt` con riferimento alla sitemap;
- dati strutturati `WebSite`, `WebPage` e `CollectionPage`;
- `noindex,nofollow` per l'area amministrativa;
- sitemap ripulita dalle route non destinate all'indicizzazione.

Dopo il deploy, in Google Search Console aggiungi la proprietà con prefisso URL
`https://fantasavuto.web.app`, completa la verifica richiesta da Google e invia:

```text
https://fantasavuto.web.app/sitemap.xml
```

Poi usa **Controllo URL** sulla home e richiedi l'indicizzazione. Le nuove pagine
pubbliche possono essere controllate nello stesso modo.

## Modello dati

| Documento/collezione | Uso |
| --- | --- |
| `siteContent/currentWinner` | risultato mostrato in primo piano nella home |
| `siteContent/regulation` | stagione e data di aggiornamento |
| `competitionWinners/{id}` | storico dei vincitori per competizione |
| `regulationSections/{id}` | paragrafi del regolamento, ordine e visibilità |
| `prizes/{id}` | premi, valore, competizione, ordine e visibilità |
| `sponsors/{id}` | nome, logo, link, ordine e stato pubblico |
| `admins/{email}` | allowlist degli amministratori, con email normalizzata in minuscolo |
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
