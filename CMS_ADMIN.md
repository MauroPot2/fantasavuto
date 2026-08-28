# Fantasavuto CMS

L'area `/admin` è il centro di gestione della stagione.

## Sezioni

- **Dashboard**: stato rapido di stagione, giornata, squadre, competizioni, sponsor e risultati.
- **Giornate**: pubblicazione dei vincitori e storico già esistente.
- **Squadre**: anagrafica squadra/fantallenatore; le squadre attive vengono suggerite nel form del vincitore.
- **Competizioni**: visibilità, ordine, tagline, descrizione e colore delle quattro competizioni ufficiali.
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

Gli ID restano stabili per non rompere URL e storico:

- `campionato`
- `champions-savuto`
- `campione-inverno`
- `coppa-sponsor`

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

Al primo accesso admin il CMS inizializza automaticamente `siteSettings/current` e le quattro competizioni se non esistono.

## Barra sponsor

La sezione Sponsor ha due livelli:

1. **Barra sponsor**: abilita/disabilita l'intera fascia pubblica, titolo, descrizione e velocità di scorrimento.
2. **Singoli sponsor**: nome, logo, link, ordine e visibilità, usando la gestione già presente.

Nascondere la barra non elimina gli sponsor. Riattivandola, gli sponsor attivi tornano visibili nello stesso ordine.

## Deploy

Dopo il merge:

```bash
git pull origin main
rm -rf build/jaspr
dart pub get
dart run jaspr_cli:jaspr build --sitemap-domain https://fantasavuto.web.app
ls -lah build/jaspr/index.html
firebase deploy --only firestore:rules,storage,hosting --project fantasavuto
```

Verificare sempre l'esistenza di `build/jaspr/index.html` prima del deploy dell'hosting.
