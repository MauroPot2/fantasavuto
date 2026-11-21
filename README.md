# Fantasavuto

Portale web del Fantacalcio del Savuto, realizzato con Jaspr e distribuito come sito statico tramite Firebase Hosting. I contenuti pubblici e l'area amministrativa condividono dati gestiti in Firestore.

## Funzionalità

- Homepage con competizioni, premi e risultati in evidenza
- Archivio dei vincitori
- Regolamento suddiviso in sezioni modificabili
- Gestione di sponsor, loghi e collegamenti
- Area amministrativa con accesso Google e autorizzazioni Firestore

## Stack e struttura

Dart, Jaspr, Firebase Authentication, Firestore, Storage e Hosting.

- `lib/`: pagine e componenti Jaspr
- `web/`: stili e integrazione Firebase lato browser
- `firestore.rules`, `storage.rules`: regole di accesso
- `test/`: verifiche delle utility
- `CMS_ADMIN.md`: indicazioni operative per i contenuti

## Sviluppo locale

~~~bash
dart pub get
dart run build_runner build --delete-conflicting-outputs
dart run jaspr_cli:jaspr serve
~~~

Il progetto Firebase è indicato in `.firebaserc`. Per usare autenticazione e area riservata occorre completare la configurazione Web in `web/firebase-config.js`.

## Autorizzazioni

L'accesso amministrativo richiede un account Google con email verificata e un documento `admins/{email}` in Firestore. L'ID del documento deve essere l'indirizzo email in minuscolo. Solo gli amministratori possono scrivere contenuti e caricare sponsor; l'allowlist viene gestita da Firebase Console.

Prima di pubblicare regole nuove, verificare che esista almeno un amministratore autorizzato.

## Build, test e deploy

~~~bash
node --test test/site-utils.test.mjs
dart run jaspr_cli:jaspr build --sitemap-domain https://fantasavuto.web.app
npm run seo:sitemap
firebase hosting:channel:deploy review --project fantasavuto
~~~

Dopo la verifica della preview:

~~~bash
firebase deploy --only firestore:rules,storage,hosting
~~~

## Indicizzazione

Il sito include metadata per pagina, URL canonici, sitemap e regole di esclusione per le sezioni private. Il dominio configurato è `https://fantasavuto.web.app`. Verificare periodicamente che il regolamento pubblicato sia completo e che la sitemap includa soltanto le pagine pubbliche effettive.

## Gestione e costi

La soluzione non richiede un server applicativo dedicato. I costi dipendono dall'uso di Hosting, Firestore e Storage e vanno monitorati nella console Firebase.
