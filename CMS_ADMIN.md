# Fantasavuto CMS

L'area `/admin` è il centro di gestione della stagione.

## Sezioni

- **Dashboard**: stato rapido di stagione, giornata, squadre, competizioni, sponsor e risultati.
- **Giornate**: pubblicazione dei vincitori e storico già esistente.
- **Squadre**: anagrafica squadra/fantallenatore; le squadre attive vengono suggerite nel form del vincitore.
- **Competizioni**: creazione, visibilità, ordine, nome, tagline, descrizione e colore delle competizioni.
- **Regolamento**: sezioni Markdown e stagione del regolamento.
- **Premi**: premi generali o associati alle competizioni.
- **Sponsor**: singoli sponsor e configurazione globale della barra sponsor.
- **Impostazioni**: nome lega, stagione, edizione e giornata corrente.

## Firestore

### `siteSettings/current`

Configurazione generale del sito:

- `leagueName`
- `season`
- `editionLabel`
- `currentMatchday`
- `sponsorBarEnabled`
- `sponsorBarTitle`
- `sponsorBarDescription`
- `sponsorBarSpeedSeconds`
- `updatedAt`

### `teams/{id}`

- `name`
- `manager`
- `logoUrl`
- `active`
- `order`
- `season`
- `createdAt`
- `updatedAt`

### `competitions/{id}`

Le quattro competizioni iniziali vengono create automaticamente, ma l'admin può aggiungerne altre.

L'ID della competizione è uno slug permanente, per esempio:

- `campionato`
- `champions-savuto`
- `coppa-calabria`
- `supercoppa-savuto`

Lo slug può contenere solo lettere minuscole, numeri e trattini. Non va cambiato dopo che la competizione ha risultati o premi associati.

Campi:

- `name`
- `tagline`
- `description`
- `accent`
- `active`
- `order`
- `season`
- `createdAt`
- `updatedAt`

Le nuove competizioni attive appaiono automaticamente nella home. Per quelle non storiche viene usata la pagina pubblica generica `/competizioni/dettaglio?id=<slug>`, quindi non serve un nuovo deploy per ogni competizione.

## Barra sponsor

La sezione Sponsor ha due livelli:

1. **Barra sponsor**: abilita/disabilita l'intera fascia pubblica, titolo, descrizione e velocità di scorrimento.
2. **Singoli sponsor**: nome, logo, link, ordine e visibilità.

Nascondere la barra non elimina gli sponsor. Riattivandola, gli sponsor attivi tornano visibili nello stesso ordine.

### Logo e Firebase Storage

Per il logo ci sono due modalità:

- **upload file**: usa Firebase Storage;
- **URL HTTPS del logo**: non richiede Firebase Storage.

Gli upload file vengono ottimizzati automaticamente nel browser prima di raggiungere Firebase Storage:

- PNG/JPG/WebP pesanti vengono convertiti in **WebP**;
- dimensione massima di rendering: **640 × 320 px**, senza deformare il logo;
- trasparenza mantenuta;
- qualità WebP adattiva con obiettivo di circa **180 KB o meno**;
- SVG già leggeri vengono mantenuti in formato vettoriale;
- nome oggetto versionato con timestamp;
- `Cache-Control: public,max-age=31536000,immutable` per una cache browser di un anno.

Dopo la selezione del file il CMS mostra il peso originale e il peso ottimizzato, per esempio `1.99 MB → 84 KB`.

Al primo accesso dell'admin il CMS applica automaticamente la cache lunga ai loghi già presenti in `sponsors/*`.

Nel pannello Sponsor è disponibile anche **Ottimizza loghi esistenti**. Il comando:

1. scarica ogni logo già collegato a uno sponsor tramite `storagePath`;
2. converte PNG/JPG/WebP pesanti in WebP con gli stessi limiti dei nuovi upload;
3. carica prima la nuova versione con cache di un anno;
4. aggiorna `logoUrl` e `storagePath` in Firestore;
5. elimina il vecchio oggetto solo dopo che Firestore è stato aggiornato correttamente;
6. mostra a fine processo il peso complessivo prima/dopo e il risparmio ottenuto.

I file già WebP sotto circa 180 KB e gli SVG leggeri vengono lasciati invariati e ricevono solo la cache lunga. Se una singola conversione fallisce, lo sponsor continua a usare il vecchio logo.

Nel pannello Sponsor è disponibile anche il pulsante **Verifica Storage**. Il test carica una piccola immagine temporanea e la elimina subito; serve a distinguere tra bucket non attivato, regole non pubblicate e problemi di autorizzazione.

Se Storage non è ancora stato attivato:

1. Firebase Console → **Storage**;
2. premi **Inizia / Get started** e crea il bucket del progetto;
3. dalla root del repository pubblica le regole:

```bash
firebase deploy --only storage --project fantasavuto
```

Le regole consentono agli admin autorizzati di caricare immagini sotto `sponsors/*` fino a 5 MB.

## Deploy

Dopo il merge:

```bash
git pull origin main
rm -rf build/jaspr
dart pub get
dart run jaspr_cli:jaspr build --sitemap-domain https://fantasavuto.web.app
ls -lah build/jaspr/index.html
firebase deploy --only hosting --project fantasavuto
```

Per questa ottimizzazione non cambiano le Security Rules: è sufficiente il deploy Hosting. Verificare sempre l'esistenza di `build/jaspr/index.html` prima del deploy.
