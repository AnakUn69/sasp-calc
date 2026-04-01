# 🛡 SASP MDT — Changelog


### ✨ Nové funkce

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

---

### 🔧 Vylepšení

#### Kliknutí na řádek = otevře modal
Kliknutím kdekoliv na řádek sub-položky v zákoníku se rovnou otevře modal pro zadání trestu — není potřeba hledat tlačítko `+`.

#### Lepší UI Historie protokolů
- Přehlednější karty s datem, jménem suspecta, strážníkem a souhrnem trestu
- Detail protokolu zobrazuje všechny paragrafy ve stylizovaných kartách včetně odznaků (DOŽIVOTÍ, ZP, ŘP)
- Tlačítko pro zkopírování protokolu přímo z detailu

#### Tlačítka About / Help / Nastavení
- Přidána tlačítka přímo v hlavním panelu aplikace
- Rychlé nastavení (přeskočení intra, auto-login) přístupné bez otevírání admin panelu
- Stejná tlačítka dostupná i na přihlašovací obrazovce

#### Realtime validace inputů
- Okamžitá kontrola zadávaných hodnot při psaní (vazba v letech, výše pokuty)
- Zobrazení chybové zprávy přímo pod polem při překročení povoleného rozsahu
- Tlačítko „Přidat do protokolu" je deaktivováno dokud nejsou hodnoty v pořádku

#### Opravená logika OR-mode
Paragrafy s alternativním trestem (vazba *nebo* pokuta) správně vyžadují vyplnění alespoň jedné hodnoty — obě zároveň nejsou povinné.

#### Vlastní šipky u číselných inputů
Nativní prohlížečové spinner šipky nahrazeny vlastními `▲`/`▼` tlačítky (Font Awesome ikonky). Fungují ve všech číselných polích — charge modal, admin panel, input dialog.

#### Tlačítko „Uložit a zkopírovat" — aktivní až po splnění podmínek
Tlačítko je defaultně disabled a aktivuje se teprve když jsou splněny všechny podmínky:
- protokol obsahuje alespoň jeden záznam
- vyplněno jméno, příjmení a datum narození suspecta
- žádný input v protokolu nemá chybnou hodnotu (mimo povolený rozsah)

#### Automatický focus při otevření charge modalu
Po kliknutí na řádek paragrafu se focus automaticky přesune do prvního inputu modalu.

---