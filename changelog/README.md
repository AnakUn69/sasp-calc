# 🛡 SASP MDT — Changelog

---

## Verze 2.4.2026 — MDT téma

### ✨ Nové funkce

#### Druhý vizuální styl — MDT téma
Aplikace nyní podporuje dva přepínatelné vzhled bez reloadu stránky:

- **Terminálový styl** (výchozí) — černozlatý CRT terminál s JetBrains Mono fontem
- **MDT styl** — moderní tmavě modrý (navy) design s Inter fontem, zaoblenými rohy a modrým akcentem `#3b9eff`

Přepínač je dostupný přímo v horním panelu jako ikona <i class="fa-solid fa-palette"></i> (vedle ostatních tlačítek). Preference se ukládá do `localStorage` a obnoví se po reloadu.

**Změny v MDT stylu oproti terminálovému:**
- Nový font **Inter** (Google Fonts) místo JetBrains Mono
- Kompletní přebarvení — navy pozadí, modrý akcent, cyan/zelená/červená pro status barvy
- Zaoblené rohy na všech prvcích: modaly 12px, kartičky 8px, taby 20px (pill), inputy/tlačítka 6px
- Přebarvení všech glow efektů, drop-shadow filtrů, box-shadow a text-shadow z amberové na modrou
- Přebarvení hardcoded barev panelů, header pozadí, inputů, status tečky, separátorů atd.
- CRT efekty a vignette jsou zachovány a reagují na nastavení v Quick Settings i v MDT stylu

---

_AnakUn 2.4.2026_

---

## Verze 1.4.2026 — aktualizace

### ✨ Nové funkce

#### OR-mode toggle — VAZBA / NEBO / POKUTA
Paragrafy obsahující alternativní trest (text obsahuje „nebo") nyní zobrazují přepínač místo obou polí najednou:

- V **charge modalu**: přepínač `[VAZBA] NEBO [POKUTA]` nad inputem — vždy viditelný jen aktivní side
- V **kartičce protokolu**: stejný přepínač přímo na kartičce — překliknutím se druhá hodnota vynuluje
- Při přepnutí se aktivní pole předvyplní minimální sazbou (pokud je zadána v zákoně)
- Potvrzovací tlačítko je disabled dokud není aktivní pole vyplněno v povoleném rozsahu

#### Validace datumu narození
- Pole „Datum narození" akceptuje formáty: `1.1.2001`, `01.01.2001`, `1/1/01`, `01/01/2001` atd. (tečky i lomítka, 1–2 místný den/měsíc, 2 nebo 4 místný rok)
- Živá validace při psaní — pole se obarví červeně při neplatném formátu
- Den max. 31, měsíc max. 12
- Blokuje uložení protokolu při neplatném datu s toast notifikací

#### Normalizace datumu v protokolu
- Datum narození se v textovém výstupu protokolu vždy zobrazí ve formátu `DD.MM.YYYY`
- Dvouciferný rok je automaticky expandován: ≤ 30 → `20xx`, > 30 → `19xx` (např. `98` → `1998`, `01` → `2001`)

#### Načtení protokolu z historie
- V seznamu archivu přidáno zelené tlačítko **NAČÍST** vedle každého záznamu
- V detailu protokolu přidáno tlačítko **NAČÍST DO AKTIVNÍHO PROTOKOLU**
- Po potvrzení dialogu se všechny paragrafy i data suspecta (jméno, datum narození) načtou do aktivního protokolu
- Umožňuje snadno vystavit stejný protokol pro více osob

#### Zvukové efekty (Web Audio API)
Zvuky jsou generovány čistě v prohlížeči přes Web Audio API — bez externích souborů:

- **Spuštění terminálu** — při kliknutí na „Spustit Terminál" se přehraje boot sweep zakončený potvrzovacím beepem
- **Mechanické klávesy při přihlašování** — každé zadané písmeno hesla (tečka v poli) přehraje krátký mechanický click
- **Uvítací animace** — každý znak typovaného uvítacího textu je doprovázen tichým kliknutím klávesy
- Zvuky se odemknou až po prvním kliknutí uživatele (požadavek prohlížeče na user gesture) — proto existuje splash obrazovka „Spustit Terminál"
- Splash obrazovka lze přeskočit nastavením `skipIntro` v Quick Settings

#### Splash obrazovka — „Spustit Terminál"
- Nová první obrazovka před boot sekvencí
- Zobrazuje logo SASP + název aplikace + tlačítko pro start
- Kliknutí na tlačítko odemkne AudioContext a spustí boot animaci se zvukem
- Lze přeskočit přes nastavení (`skipIntro` / `skipLogin`)

---

_AnakUn 1.4.2026_

---

## Verze 1.4.2026

### ✨ Nové funkce

#### CRT a Vignette efekty — přepínatelné v nastavení
Vizuální retro efekty nyní lze ovládat přímo v nastavení (tlačítko <i class="fa-solid fa-sliders"></i> v panelu):

- **Vignette** — tmavý radial gradient na okrajích obrazovky (ztmavení rohů). Lze zapnout/vypnout přepínačem.
- **CRT scanlines** — horizontální scanlines + flicker animace napodobující starý CRT monitor. Lze zapnout/vypnout přepínačem.
- **Intenzita CRT** — 4 úrovně s okamžitou aplikací bez reloadu:
  - **Lehký** — jemné scanlines, pomalý flicker
  - **Střední** — výchozí hodnota, výraznější scanlines
  - **Silný** — husté scanlines, rychlý flicker
  - **Ultra** — maximální intenzita, intenzivní nepravidelný flicker

Nastavení se ukládá do `localStorage` a aplikuje se ihned při startu stránky.

#### Settings modal — přepracován
- Dialog nastavení (ikona <i class="fa-solid fa-sliders"></i>) je nyní výrazně širší a přehlednější
- Přidána sekce **Vizuální efekty** se všemi CRT a vignette přepínači
- Tab „Nastavení" odstraněn z admin panelu — veškeré nastavení je soustředěno v jednom místě

#### Dokumentace — nový modal
- Tlačítko pro zobrazení changelogu/dokumentace (<i class="fa-solid fa-list-check"></i>) otevírá plně stylizovaný modal
- Obsah se načítá ze souboru `changelog/README.md` a renderuje se přes `marked.js`
- Modal je scrollovatelný, uzavírá se křížkem nebo kliknutím mimo obsah

---

### 🔧 Vylepšení

#### Scrollovatelné info modaly
Modaly (About, Help, Nastavení, Changelog) již nepřekrývají obsah na menších rozlišeních — jsou scrollovatelné a zarovnané od vrchu obrazovky.

#### Kliknutí mimo modal = zavření
Kliknutím na tmavé pozadí (backdrop) se automaticky zavřou modaly: About, Help, Nastavení, Changelog.

---

### 🐛 Opravené chyby

- **Toast message** — přepínače „zapnuto/vypnuto" zobrazovaly opačný stav (zobrazovalo „zapnuto" při vypínání a naopak). Opraveno správným předáváním stavového parametru.

---

### ✨ Starší funkce (stejné vydání)

#### Potvrzovací dialogy (vlastní modaly)
Všechna kritická potvrzení jsou nyní řešena přes stylizované in-app modaly místo nativních prohlížečových `confirm()` / `prompt()` dialogů.
- Smazání protokolu z historie
- Smazání zákona nebo sub-položky v admin panelu
- Vymazání aktuálního případu (Nový případ)
- Reset dat na výchozí stav
- Přidání nového zákona — formulářový dialog se dvěma poli (číslo paragrafu + název)

#### Přidávání a editace zákonů — přepracováno
- Tlačítko **+ přidat zákon** přesunuto přímo do záhlaví kategorie
- Tlačítko **+ přidat sub-položku** přesunuto do řádku konkrétního zákona
- Textová tlačítka (`EDITOVAT`, `SMAZAT`, `EDIT`, `✕`) nahrazena ikonkami Font Awesome:
  - <kbd><i class="fa-solid fa-plus"></i></kbd> Přidat
  - <kbd><i class="fa-solid fa-pen-to-square"></i></kbd> Editovat
  - <kbd><i class="fa-solid fa-trash"></i></kbd> Smazat

#### Kliknutí na řádek = otevře modal
Kliknutím kdekoliv na řádek sub-položky v zákoníku se rovnou otevře modal pro zadání trestu — není potřeba hledat tlačítko `+`.

#### Lepší UI Historie protokolů
- Přehlednější karty s datem, jménem suspecta, strážníkem a souhrnem trestu
- Detail protokolu zobrazuje všechny paragrafy ve stylizovaných kartách včetně odznaků (DOŽIVOTÍ, ZP, ŘP)
- Tlačítko pro zkopírování protokolu přímo z detailu

#### Tlačítka About / Help / Nastavení
- Přidána tlačítka přímo v hlavním panelu aplikace
- Rychlé nastavení (přeskočení intra, auto-login) přístupné bez otevírání admin panelu

#### Realtime validace inputů
- Okamžitá kontrola zadávaných hodnot při psaní (vazba v letech, výše pokuty)
- Zobrazení chybové zprávy přímo pod polem při překročení povoleného rozsahu
- Tlačítko „Přidat do protokolu" je deaktivováno dokud nejsou hodnoty v pořádku

#### Opravená logika OR-mode
Paragrafy s alternativním trestem (vazba *nebo* pokuta) správně vyžadují vyplnění alespoň jedné hodnoty.

#### Vlastní šipky u číselných inputů
Nativní prohlížečové spinner šipky nahrazeny vlastními `▲`/`▼` tlačítky (Font Awesome ikonky).

#### Tlačítko „Uložit a zkopírovat" — aktivní až po splnění podmínek
Tlačítko je defaultně disabled a aktivuje se teprve když jsou splněny všechny podmínky:
- protokol obsahuje alespoň jeden záznam
- vyplněno jméno, příjmení a datum narození suspecta
- žádný input v protokolu nemá chybnou hodnotu

#### Automatický focus při otevření charge modalu
Po kliknutí na řádek paragrafu se focus automaticky přesune do prvního inputu modalu.

---

_AnakUn 1.4.2026_

---

### ✨ Nové funkce

#### CRT a Vignette efekty — přepínatelné v nastavení
Vizuální retro efekty nyní lze ovládat přímo v nastavení (tlačítko <i class="fa-solid fa-sliders"></i> v panelu):

- **Vignette** — tmavý radial gradient na okrajích obrazovky (ztmavení rohů). Lze zapnout/vypnout přepínačem.
- **CRT scanlines** — horizontální scanlines + flicker animace napodobující starý CRT monitor. Lze zapnout/vypnout přepínačem.
- **Intenzita CRT** — 4 úrovně s okamžitou aplikací bez reloadu:
  - **Lehký** — jemné scanlines, pomalý flicker
  - **Střední** — výchozí hodnota, výraznější scanlines
  - **Silný** — husté scanlines, rychlý flicker
  - **Ultra** — maximální intenzita, intenzivní nepravidelný flicker

Nastavení se ukládá do `localStorage` a aplikuje se ihned při startu stránky.

#### Settings modal — přepracován
- Dialog nastavení (ikona <i class="fa-solid fa-sliders"></i>) je nyní výrazně širší a přehlednější
- Přidána sekce **Vizuální efekty** se všemi CRT a vignette přepínači
- Tab „Nastavení" odstraněn z admin panelu — veškeré nastavení je soustředěno v jednom místě

#### Dokumentace — nový modal
- Tlačítko pro zobrazení changelogu/dokumentace (<i class="fa-solid fa-list-check"></i>) otevírá plně stylizovaný modal
- Obsah se načítá ze souboru `changelog/README.md` a renderuje se přes `marked.js`
- Modal je scrollovatelný, uzavírá se křížkem nebo kliknutím mimo obsah

---

### 🔧 Vylepšení

#### Scrollovatelné info modaly
Modaly (About, Help, Nastavení, Changelog) již nepřekrývají obsah na menších rozlišeních — jsou scrollovatelné a zarovnané od vrchu obrazovky.

#### Kliknutí mimo modal = zavření
Kliknutím na tmavé pozadí (backdrop) se automaticky zavřou modaly: About, Help, Nastavení, Changelog.

---

### 🐛 Opravené chyby

- **Toast message** — přepínače „zapnuto/vypnuto" zobrazovaly opačný stav (zobrazovalo „zapnuto" při vypínání a naopak). Opraveno správným předáváním stavového parametru.

---

### ✨ Starší funkce (stejné vydání)

#### Potvrzovací dialogy (vlastní modaly)
Všechna kritická potvrzení jsou nyní řešena přes stylizované in-app modaly místo nativních prohlížečových `confirm()` / `prompt()` dialogů.
- Smazání protokolu z historie
- Smazání zákona nebo sub-položky v admin panelu
- Vymazání aktuálního případu (Nový případ)
- Reset dat na výchozí stav
- Přidání nového zákona — formulářový dialog se dvěma poli (číslo paragrafu + název)

#### Přidávání a editace zákonů — přepracováno
- Tlačítko **+ přidat zákon** přesunuto přímo do záhlaví kategorie
- Tlačítko **+ přidat sub-položku** přesunuto do řádku konkrétního zákona
- Textová tlačítka (`EDITOVAT`, `SMAZAT`, `EDIT`, `✕`) nahrazena ikonkami Font Awesome:
  - <kbd><i class="fa-solid fa-plus"></i></kbd> Přidat
  - <kbd><i class="fa-solid fa-pen-to-square"></i></kbd> Editovat
  - <kbd><i class="fa-solid fa-trash"></i></kbd> Smazat

#### Kliknutí na řádek = otevře modal
Kliknutím kdekoliv na řádek sub-položky v zákoníku se rovnou otevře modal pro zadání trestu — není potřeba hledat tlačítko `+`.

#### Lepší UI Historie protokolů
- Přehlednější karty s datem, jménem suspecta, strážníkem a souhrnem trestu
- Detail protokolu zobrazuje všechny paragrafy ve stylizovaných kartách včetně odznaků (DOŽIVOTÍ, ZP, ŘP)
- Tlačítko pro zkopírování protokolu přímo z detailu

#### Tlačítka About / Help / Nastavení
- Přidána tlačítka přímo v hlavním panelu aplikace
- Rychlé nastavení (přeskočení intra, auto-login) přístupné bez otevírání admin panelu

#### Realtime validace inputů
- Okamžitá kontrola zadávaných hodnot při psaní (vazba v letech, výše pokuty)
- Zobrazení chybové zprávy přímo pod polem při překročení povoleného rozsahu
- Tlačítko „Přidat do protokolu" je deaktivováno dokud nejsou hodnoty v pořádku

#### Opravená logika OR-mode
Paragrafy s alternativním trestem (vazba *nebo* pokuta) správně vyžadují vyplnění alespoň jedné hodnoty.

#### Vlastní šipky u číselných inputů
Nativní prohlížečové spinner šipky nahrazeny vlastními `▲`/`▼` tlačítky (Font Awesome ikonky).

#### Tlačítko „Uložit a zkopírovat" — aktivní až po splnění podmínek
Tlačítko je defaultně disabled a aktivuje se teprve když jsou splněny všechny podmínky:
- protokol obsahuje alespoň jeden záznam
- vyplněno jméno, příjmení a datum narození suspecta
- žádný input v protokolu nemá chybnou hodnotu

#### Automatický focus při otevření charge modalu
Po kliknutí na řádek paragrafu se focus automaticky přesune do prvního inputu modalu.

---

_AnakUn 1.4.2026_