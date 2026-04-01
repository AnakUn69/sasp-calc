# SASP Penal Code Terminal

Webová aplikace pro práci s trestním zákoníkem (MDT styl) pro SASP.
Slouží k rychlému vyhledání paragrafů, výběru konkrétní sazby a sestavení protokolu případu se součtem vazby/pokut a upozorněními na procesní podmínky.

---

## Obsah

- [Přehled](#přehled)
- [Rychlý start](#rychlý-start)
- [Přihlášení a relace](#přihlášení-a-relace)
- [Workflow aplikace](#workflow-aplikace)
- [Protokol – práce se sazbami](#protokol--práce-se-sazbami)
- [Identita suspecta](#identita-suspecta)
- [Uložení a kopírování protokolu](#uložení-a-kopírování-protokolu)
- [Historie protokolů](#historie-protokolů)
- [Admin panel](#admin-panel)
- [Nastavení](#nastavení)
- [Datový model laws.json](#datový-model-lawsjson)
- [Vysvětlení minJ / maxJ / isLife](#vysvětlení-minj--maxj--islife)
- [Validace při přidání do protokolu](#validace-při-přidání-do-protokolu)
- [Ukládání a správa dat](#ukládání-a-správa-dat)
- [Export a import dat](#export-a-import-dat)
- [localStorage klíče](#localstorage-klíče)
- [Struktura repozitáře](#struktura-repozitáře)

---

## Přehled

### Co aplikace dělá

- Přihlašovací obrazovka s údaji strážníka (číslo odznaku, jméno, příjmení) ukládanými do `localStorage`.
- Animovaná uvítací sekvence s typewriter efektem "Vítejte strážníku {jméno příjmení}".
- Načte trestní zákoník ze souboru `data/laws.json` (nebo z `localStorage`).
- Umožňuje filtrování podle kategorií a fulltextové hledání.
- U každé sub-položky paragrafu zobrazí editovatelné pole pro zadání délky vazby a/nebo pokuty přímo v kartě.
- Při přidání do protokolu provádí validace (minimum/maximum sazby, povinná data).
- Formulář pro identitu suspecta (jméno, příjmení, datum narození) v pravém panelu.
- Upozorňuje na procesní podmínky:
  - povinnost odebrat ZP / RP,
  - nutnost přítomnosti státního zástupce (trest nad 20 let nebo doživotí).
- Tlačítko "Uložit & Zkopírovat protokol" — uloží do historie a zkopíruje do schránky.
- Zkopírovaný protokol obsahuje hlavičku se zasahujícím strážníkem, sekci identity suspecta a patičku s autorizací.
- Historie protokolů uložená v `localStorage` s možností zobrazit nebo smazat jednotlivé záznamy.
- Admin panel pro správu zákonů, export/import dat a nastavení.

### Technický stack

| Oblast | Použití |
|---|---|
| Frontend | HTML + CSS + Vanilla JavaScript |
| Persistenční vrstva | `localStorage` |
| Zdroj dat zákonů | `data/laws.json` |
| Font | JetBrains Mono |
| Ikony | Font Awesome 6.5.2 |
| Provoz | statická webová aplikace |

---

## Rychlý start

### Varianta A: jednoduché spuštění

```bash
npx serve .
```

Potom otevřete URL, kterou server vypíše (typicky `http://localhost:3000`).

### Varianta B: Python HTTP server

```bash
python -m http.server 3000
```

Potom otevřete `http://localhost:3000`.

> Doporučení: používejte HTTP server, protože aplikace načítá JSON přes `fetch`.

---

## Přihlášení a relace

### Přihlašovací obrazovka

Při prvním spuštění se zobrazí přihlašovací overlay s poli:

| Pole | Popis |
|---|---|
| Číslo odznaku | Identifikátor strážníka |
| Jméno | Křestní jméno |
| Příjmení | Příjmení |
| Heslo | Animovaná sekvence ●●●●●●●● (dekorativní) |

Po přihlášení se údaje uloží do `localStorage` (`sasp_officer_v1`) a zobrazí se uvítací animace s typewriter efektem. Terminal header zobrazuje **Přihlášený uživatel: Jméno Příjmení**.

### Auto-login

Pokud je v nastavení zapnutá volba **Přeskočit přihlašování**, aplikace při startu automaticky načte uložené přihlašovací údaje z `localStorage` a přeskočí login i boot sekvenci rovnou do terminálu.

---

## Workflow aplikace

```mermaid
flowchart TD
  A[Start aplikace] --> B{skipLogin + uložené creds?}
  B -- Ano --> Z[Auto-login → terminál]
  B -- Ne --> C{skipIntro?}
  C -- Ano --> D[Login overlay]
  C -- Ne --> E[Boot sekvence]
  E --> D
  D --> F[Uvítací animace]
  F --> G[Terminál]
  G --> H[Vyhledávání + filtrace + výběr sazeb]
  H --> I[Editace sazeb v kartě]
  I --> J[Validace vstupu]
  J --> K[Přidání do protokolu]
  K --> L[Vyplnění identity suspecta]
  L --> M[Uložit & Zkopírovat protokol]
  M --> N[Záznam uložen do historie]
```

---

## Protokol – práce se sazbami

### Inline editace sazeb

Každá karta paragrafu v protokolu zobrazuje editovatelná vstupní pole přímo v kartě:

- **Vazba** (roky) — zobrazuje se pokud `hasJ = true`
- **Pokuta** ($) — zobrazuje se pokud `hasF = true`

Hodnoty se validují v reálném čase:
- hodnota nižší než `minJ` → červené zvýraznění pole
- hodnota vyšší než `maxJ` → červené zvýraznění pole
- hodnota `0` u povinné sazby → červené zvýraznění pole

Součty vazby a pokuty v patičce pravého panelu se aktualizují okamžitě při psaní.

---

## Identita suspecta

Pravý panel obsahuje na vrcholu formulář pro údaje zadržené osoby:

| Pole | ID |
|---|---|
| Jméno | `#suspectFirst` |
| Příjmení | `#suspectLast` |
| Datum narození | `#suspectBirth` |

Všechna tři pole jsou **povinná** při uložení protokolu — bez jejich vyplnění nelze protokol uložit ani zkopírovat.

---

## Uložení a kopírování protokolu

Tlačítko **Uložit & Zkopírovat protokol** provede dvě akce najednou:

1. Uloží záznam do `localStorage` (`sasp_protocol_history_v1`)
2. Zkopíruje text protokolu do schránky

### Formát zkopírovaného protokolu

```
════════════════════════════════════════
         PROTOKOL PŘÍPADU
════════════════════════════════════════

ZASAHUJÍCÍ STRÁŽNÍK
Odznak : BADGE
Jméno  : Jméno Příjmení

────────────────────────────────────────
IDENTITA SUSPECTA
Jméno        : Jméno Příjmení
Datum narození: DD.MM.YYYY
────────────────────────────────────────

... paragrafy a sazby ...

════════════════════════════════════════
CELKEM VAZBA : X let
CELKEM POKUTA: X $
════════════════════════════════════════

AUTORIZOVAL: Jméno Příjmení | Odznak: BADGE
```

---

## Historie protokolů

Tlačítko **Historie** (v patičce pravého panelu) otevře overlay s přehledem uložených protokolů.

| Akce | Popis |
|---|---|
| ZOBRAZIT | Zobrazí plný text protokolu |
| SMAZAT | Odstraní záznam z `localStorage` |

- Maximálně **50 záznamů** — starší záznamy se automaticky mažou (FIFO).
- Záznamy jsou seřazeny od nejnovějšího.

---

## Admin panel

Otevře se kliknutím na ikonu ozubeného kola (nebo tlačítko Admin). Obsahuje tři záložky:

### Správa zákonů

- Editace kategorií, paragrafů a sub-položek.
- Přidávání a mazání záznamů.

### Export / Import

- **Export** — stáhne aktuální data zákonů jako JSON soubor.
- **Import** — nahraje JSON soubor (akceptuje objekt s klíčem `categories` nebo přímo pole).
- **Reset** — obnoví data ze souboru `data/laws.json`.

### Nastavení

Viz sekce [Nastavení](#nastavení) níže.

---

## Nastavení

Záložka **Nastavení** v admin panelu nabízí:

| Volba | Výchozí | Popis |
|---|---|---|
| Přeskočit intro | vypnuto | Přeskočí boot sekvenci a jde přímo na login |
| Přeskočit přihlašování (auto-login) | vypnuto | Pokud jsou uložené přihlašovací údaje, přeskočí i login |

Pod togglem auto-login se zobrazí hint s aktuálně uloženými údaji strážníka: `⬸ Uložené údaje: Jméno Příjmení (BADGE)`.

Nastavení se ukládá do `localStorage` (`sasp_settings_v1`).

---

## Datový model laws.json

### Ukázka struktury

```json
{
  "version": "2026.1",
  "categories": [
    {
      "id": "persons",
      "name": "Trestné činy proti osobám",
      "icon": "⚔️",
      "laws": [
        {
          "id": "par7",
          "number": 7,
          "title": "§7 Ublížení na zdraví",
          "description": "...",
          "subs": [
            {
              "label": "a)",
              "text": "...",
              "minJ": 1,
              "maxJ": 5,
              "isLife": false,
              "hasJ": true,
              "hasF": false,
              "fixedFine": null,
              "fixedJail": null,
              "removeZP": false,
              "removeRP": false
            }
          ]
        }
      ]
    }
  ]
}
```

### Root objekt

| Pole | Typ | Význam |
|---|---|---|
| `version` | `string` | Verze datového balíku zákonů |
| `categories` | `array` | Seznam kategorií |

### Kategorie

| Pole | Typ | Význam |
|---|---|---|
| `id` | `string` | Strojový identifikátor kategorie (např. `persons`, `traffic`) |
| `name` | `string` | Název kategorie pro UI |
| `icon` | `string` | Ikona používaná v UI/adminu |
| `laws` | `array` | Seznam paragrafů v kategorii |

### Paragraf (`law`)

| Pole | Typ | Význam |
|---|---|---|
| `id` | `string` | Unikátní identifikátor paragrafu (např. `par37`) |
| `number` | `number` | Číselné označení paragrafu |
| `title` | `string` | Název paragrafu |
| `description` | `string` | Doplňující text pod hlavičkou |
| `subs` | `array` | Varianty sazeb daného paragrafu |

### Sub-položka (`sub`)

| Pole | Typ | Význam |
|---|---|---|
| `label` | `string` | Označení varianty (`a)`, `b)`, `-`) |
| `text` | `string` | Právní/popisný text varianty |
| `minJ` | `number` | Minimální vazba v letech |
| `maxJ` | `number` | Maximální vazba v letech |
| `isLife` | `boolean` | Varianta obsahuje/doznačuje doživotí |
| `hasJ` | `boolean` | Varianta má vazbu (aktivní vstup LET) |
| `hasF` | `boolean` | Varianta má pokutu (aktivní vstup $) |
| `fixedFine` | `number \| null` | Fixní pokuta, pokud je daná přesně |
| `fixedJail` | `number \| null` | Fixní vazba, pokud je daná přesně |
| `removeZP` | `boolean` | Nutnost odebrání zbrojního průkazu |
| `removeRP` | `boolean` | Nutnost odebrání řidičského průkazu |

---

## Vysvětlení minJ / maxJ / isLife

### Základní pravidla

- `minJ` a `maxJ` se používají pouze pokud `hasJ = true`.
- `minJ = 0` a `maxJ = 0` typicky znamená přestupek bez vazby.
- `maxJ = 99` se používá jako hraniční hodnota u sazeb s možností doživotí.
- `isLife = true` zapíná režim doživotí v UI i souhrnu protokolu.

### Praktické mapování textu zákona do dat

| Text sazby | minJ | maxJ | isLife | hasJ |
|---|---:|---:|---:|---:|
| odnětím svobody od 1 do 5 let | 1 | 5 | false | true |
| pokutou do 5 000 $ | 0 | 0 | false | false |
| odnětím svobody od 25 let po doživotí | 25 | 99 | true | true |
| odnětím svobody na doživotí | 0 | 99 | true | true |

---

## Validace při přidání do protokolu

Při kliknutí na `+` aplikace provádí následující kontroly:

| Kontrola | Podmínka | Výsledek |
|---|---|---|
| Podminimální trest | `hasJ && !isLife && minJ > 0 && jVal < minJ` | Zablokování přidání + hláška |
| Nadmaximální trest | `hasJ && maxJ > 0 && maxJ < 99 && jVal > maxJ` | Zablokování přidání + hláška |
| Chybějící vazba | `hasJ && !isLife && jVal === 0 && !fixedJail` | Zablokování přidání + hláška |
| Povinné odebrání dokladů | `removeZP \|\| removeRP` | Potvrzovací dialog |
| Přítomnost SZ | `isLife \|\| jVal > 20` | Potvrzovací dialog |

Při inline editaci sazeb v protokolu se hodnoty validují v reálném čase — pole s chybnou hodnotou (včetně 0) se zvýrazní červeně.

Při uložení protokolu jsou povinné všechny 3 pole identity suspecta (jméno, příjmení, datum narození).

---

## Ukládání a správa dat

### Priorita zdrojů zákonů

1. `localStorage` (`sasp_laws_v3`) pokud existuje.
2. Jinak soubor `data/laws.json`.

### Admin funkce

- Editace zákonů a sub-položek.
- Export aktuálního JSON.
- Import JSON.
- Reset na výchozí data ze souboru.

---

## Export a import dat

### Exportovaný formát

```json
{
  "version": "2026.1",
  "categories": [
    "..."
  ]
}
```

### Poznámky k importu

- Aplikace akceptuje oba tvary:
  - objekt s klíčem `categories`,
  - nebo přímo pole kategorií.
- Po úspěšném importu se data uloží do `localStorage`.

---

## localStorage klíče

| Klíč | Obsah |
|---|---|
| `sasp_officer_v1` | `{ badge, firstName, lastName }` — přihlašovací údaje strážníka |
| `sasp_laws_v3` | Aktuální data zákonů (kategorie + paragrafy) |
| `sasp_protocol_history_v1` | Pole uložených protokolů (max 50, FIFO) |
| `sasp_settings_v1` | `{ skipIntro: bool, skipLogin: bool }` — nastavení aplikace |

---

## Struktura repozitáře

```text
.
├─ index.html
├─ README.md
├─ css/
│  └─ style.css
├─ data/
│  └─ laws.json
└─ js/
   └─ app.js
```

| Soubor | Účel |
|---|---|
| `index.html` | Hlavní stránka aplikace |
| `js/app.js` | Logika aplikace (přihlášení, animace, data, validace, protokol, history, admin) |
| `data/laws.json` | Zdroj právních dat |
| `css/style.css` | Vizuální styl aplikace (CRT téma, JetBrains Mono) |