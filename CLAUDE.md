# Flappy keIWs — flaxa mellan staplarna

En Flappy Bird-variant (PWA) i pixelstil, med figuren keIWs. Här finns
poäng, krasch och rekord. Språk i appen och i koden (kommentarer, namn,
commit-meddelanden) är **svenska**. Håll det så.

Lokala, privata anteckningar (om de finns) ligger i `CLAUDE.local.md`, som
inte checkas in. **Idéer och planer** står i `IDEER.md` — läs den när
det ska byggas vidare, bocka av det som blir gjort och skriv in nya idéer
där.

## Git: jobba alltid direkt mot `main`

- Gör alla ändringar direkt på `main`. **Skapa aldrig nya grenar** och inga
  pull requests om det inte uttryckligen efterfrågas.
- När en ändring är klar: kör `python verktyg/testa.py`, bumpa `VERSION` i
  `sw.js` (om appens filer ändrats), commit och `git push origin main`
  direkt — det är så den når GitHub Pages.
- Repot är publikt: länka inte till privata repon i README, kommentarer
  eller commit-meddelanden.

## Hosting

- GitHub Pages från `main` (rot): https://isak-wallo.github.io/flappy-keiws/
- **Inget byggsteg, inga dependencies** — ren vanilla JS/CSS/HTML.
- **Bumpa `VERSION` i `sw.js` vid varje ändring**, annars fastnar installerade
  appar på gammal cache. Nya filer måste också läggas i `ASSETS` i `sw.js`.

## Vad spelet gör

- **Stående**, en figur (`keiws`), inga ljud.
- **Menyn**: kugghjulet (`#menyknapp`, bara på startskärmen) öppnar en
  meny i textrutan (`visaMeny`, `tryckIMeny`, `menyOppen`; rutan blir
  tryckbar med klassen `meny`). Val: **Tid** (Auto/Dag/Skymning/Natt/
  Gryning, `TIDER`, sparas i `flappy-keiws-tid`, en fast tid låtsas vara
  klockslaget i `klockslag()`; `?klocka=` i adressen går före) och
  **Nollställ rekord** (andra trycket bekräftar). Ett tryck utanför valen,
  "Klar", Esc/mellanslag/Enter stänger. Plats för fler val (högst ca fyra).
- En bana, `angen`, vars **färger följer klockan** (`dygn` i banor.js):
  dag 08–18, skymning 18–21 (persika/lila, solen går ner, månen upp),
  natt 21–06 (stjärnor, måne, blå staplar), gryning 06–08. Paletterna står i
  `angen.paletter` och glider över i varandra (`fargerNu`, `blandaPalett`,
  räknas om varje sekund, även mitt i en runda). Stjärnorna styrs av
  talet `stjarnLjus` i paletten. Solen och månen har egna raka banor efter
  klockan (`angen.himlakroppar`, `hojdNu`): solen uppe 08–18, ner 18–20,
  upp 06–08; månen tvärtom. Höjd 0 = kullarnas topp.
  `?klocka=19.5` i adressen låtsas att klockan är 19.30. `?bana=natt` ger
  bara natt (banan `natt`, utan dygn).
- Tryck/klick/mellanslag/pil upp/W/Enter = flaxa. Lägen: `start` (figuren
  gungar, ruta "Tryck för att flyga") → `spelar` → `krasch` (figuren faller
  till marken, blundar; efter `VISA_KRASCH_EFTER` visas poäng/bäst) → tryck
  (efter `OMSTART_SPARR`) → `start`. Byter man app eller flik under
  `spelar` blir det `paus` (allt står still, ruta "Paus"), ett tryck
  fortsätter med ett flax.
- Versionen (t.ex. "v9") står litet i startrutans hörn. Den läses från
  service workerns cachenamn (`caches.keys()`), så den behöver bara
  bumpas i `sw.js`.
- Medaljer i kraschrutan efter `bana.medaljer` (brons 10, silver 25,
  guld 50), ritade som små SVG-pixelbilder (`MEDALJ_BILD`).
- Poäng i egna 3×5-pixelsiffror på canvasen (siffran studsar till vid
  varje poäng, `STUDS`/`poangStuds`); bästa resultatet i
  `localStorage` (`flappy-keiws-bast`). Texterna i rutan (`#ruta`) är DOM,
  men ritade i pixeltypsnittet (`pixeltext`, storlek `TEXT_STOR`/`TEXT`
  skärmpixlar per pixel).
- Lugna, lite dova pixelfärger (himmel i band, moln, två lager kullar,
  raka staplar i olika gröna nyanser, sandmark).

## Filer

| Fil | Roll |
|-----|------|
| `index.html` | Canvas `#spel` + textrutan `#ruta`. Laddar `figur_data.js`, `figurer.js`, `banor.js`, `typsnitt.js`, `app.js` i den ordningen. |
| `typsnitt.js` | `TYPSNITT`: eget pixeltypsnitt (versaler 7 rutor, gemener 5, svansar 2 under, åäö) och `pixeltext(text, px)`, som ger HTML med ett SVG per ord plus osynlig riktig text. Saknas ett tecken ritas `?` — lägg till det i `tecken`. |
| `figur_data.js` | **Genererad** av `verktyg/las_figur.py` från figurens export (keiws.json): `FIGUR_DATA` med färger, `vrid[0..3]` (framifrån → sidan åt höger), blink, animationerna `idle`, `vinka`, `jubel`, `somnar`, `sover`, `vaknar`, `rekordjubel` (exportens `jubel_fram`), krocken `krock`, `faller`, `landar`, `yr` (ur exportens `*_hoger`), och Ond. Ändra inte för hand. |
| `figurer.js` | `FIGURER`: bygger figurerna ur `FIGUR_DATA` (`figurUrExport`): färdiga lägen/animationer, och sidovyn som `klossar` med roller `kropp`/`arm`/`oga`/`ben` (`DEL_ROLL`). Plus spelets egna värden: `skala`, `blink`, `start` (ordningen på startskärmens animationer), `vridMs`, `somnaEfter`, `jubel`, `mitt`, träffyta `traff`. |
| `verktyg/las_figur.py` | Läser figurens export och skriver om `figur_data.js`: `python verktyg/las_figur.py SÖKVÄG/keiws.json`. Kör testerna och bumpa `VERSION` efteråt. |
| `banor.js` | `BANOR`: en bana = fysik (fart, tyngd, flax, maxFall), hinder (bredd, öppning i början och sen, avstånd, marginaler), medaljer och färger. `natt` tar över allt från `angen` (`...BANOR.angen`) och byter färger. `angen.dygn` + `angen.paletter` (dag, skymning, natt, gryning) styr färgerna efter klockan. Stapelns färg är ett nummer i `farger.staplar`, så den följer med. |
| `app.js` | Spelet: loop, fysik, kollisioner, ritning, poäng, layout, styrning, helskärm, SW-registrering. Väljer figur och bana högst upp (`figur`, `bana`). |
| `style.css` | Fullskärm, textrutan i pixelstil. |
| `sw.js` | Service worker (cache-first + tyst bakgrundsuppdatering). Bumpa `VERSION`. |
| `manifest.json` | PWA-manifest (`standalone`, `portrait`). |
| `icon-192.png`, `icon-512.png` | Ikoner, ritade av `verktyg/ikon.py` (Pillow). |
| `verktyg/testa.py` | Testar spelet i headless Chrome (Playwright): egen lokal server, bot som spelar via testkroken, paus, krasch och omstart, medalj, nattbanan och att klockan styr färgerna, version i startrutan, JS-fel, datorformat. Exit 0 = OK. `--bilder MAPP` sparar skärmbilder, `--sekunder N`, `--visa`. |
| `IDEER.md` | Idélista och ordning för vidareutveckling. Inte en del av appen (ligger inte i `ASSETS`). |

## Stilregler för figurerna

Bara fyrkantiga klossar som flyttas — ingen rotation, inget som sträcks ut.
keIWs: alla klossar 36 px, kroppen 160×160, 8 px mellanrum överallt
(kropp–arm, kropp–ben, mellan ögonen från sidan). Lägen i jämna px, helst
steg om 12. Bortre arm och ben ritas mörkare bakom kroppen, magklossen sitter
rakt under vänster öga (från sidan åt höger: det inre ögat), armarna hamnar aldrig över kroppen.

## Arkitektur i `app.js`

- **Världen** är 360×640 enheter. Vyn skalas så att hela världen syns
  (`s` = skärmpixlar per enhet); är skärmen högre syns mer himmel (70 %) och
  mark (30 %), är den bredare syns mer åt sidorna — men spelytan är högst
  `MAX_B` (400) enheter bred, så på dator/platta blir den en stående remsa
  i mitten. `vyX0/vyY0/vyB/vyH` = vad som syns, i världskoordinater.
- **Pixelstil:** allt ritas med `rekt()`, som avrundar till hela
  skärmpixlar (canvasen är i enhetens pixlar, `devicePixelRatio`). Inga
  bilder, ingen rotation (då blir kanterna suddiga).
- **Fast tidssteg** (`STEG` = 1/120 s, ackumulator i `frame`), max 0,1 s per
  bildruta — spelet känns likadant på 60 och 120 Hz.
- **Figuren** står still i x (`FIGUR_X`), banan rullar. Armarna flyttas i
  hela steg om 12 figurpixlar vid flax (`armLyft`). Svävande ben sackar
  8/4 px nedåt efter ett flax (`benSack`). Ögonen blinkar och blundar vid
  krasch (`blundar`). På startskärmen och när den vrider sig ritas färdiga
  rutor ur exporten (`figurRuta`, `ritaRektar`): framifrån andas den och
  vinkar ibland (`figur.start`). Efter `somnaEfter` s utan tryck somnar den
  (vid slutet av en animation, `SOMNAR_MS`) och sover i loop; ett tryck då
  väcker den (`vaknarVid`, animationen `vaknar`, tryck räknas inte under
  tiden) och sedan startar spelet av sig självt. `?somna=2` i adressen
  somnar efter 2 s. När man trycker igång vrider den sig åt
  höger i tre steg (`vridMs`), och efter en runda vrider den sig tillbaka
  framåt (`vriderTillbaka`), och efter ett nytt rekord jublar den
  framifrån med konfetti (`jublaPaStart`, animationen `rekordjubel`). Medan den flyger ritas sidovyn med klossar och
  roller. När en stapel klaras jublar den med
  armarna och kisar (`jubelLyft`, `jublar`, `figur.jubel`). Slår man sitt
  rekord gör den ett glädjeskutt ur exporten (animationen `jubel`, i
  `figurRuta`, styrs av `fig.rekordTid`, `REKORD_JUBEL` gånger i rad;
  poängen blinkar i guld under tiden, `REKORD_BLINK`). Vid krasch (`krockRuta`):
  smällen `krock` (spelas klart även om den landar direkt), `faller` i
  loop medan den faller, `landar` (studs) och sedan `yr` i loop med
  stjärnor. Figurer utan krockanimation sträcker upp armarna och studsar
  (`figur.krasch`, `figurHopp`). Allt det är bara ritning:
  träffytan påverkas inte. Animationer är listor med `[värde, ms]`
  (`stegVid`).
- **Staplar** (raka, enfärgade — inga rör med kapsyl) fylls på till höger
  (`fyllPaStaplar`); öppningen slumpas men flyttar sig högst `maxHopp`
  mellan två staplar. **Lätt i början:** öppningen är `oppningStart` (200)
  vid första stapeln och krymper med `oppningSteg` (5) per stapel ner till
  `oppning` (150) (`oppningFor`, varje stapel minns sin `oppning`). Bredden är `stapelBredd` de första
  `breddFran` staplarna, sedan slumpad ur `stapelBredder` (`stapelBreddFor`,
  sparas i stapelns `b`). Varje
  stapel får en slumpad grön nyans ur `farger.staplar` (`stapelFarg`, aldrig
  samma två i rad). Kollision = rektanglar (`stapelDelar`, `figurTraff`).
  Taket är skärmens överkant.
- **Ny SW-version** laddas in direkt i startläget, annars först när man
  kommer tillbaka till start (`laddaOmSen`) — aldrig mitt i en runda.
- **Testkrok:** med `?test` i adressen finns `window.spelet` (tillstånd,
  poäng, figur, staplar, bana) så att `verktyg/testa.py` kan läsa läget och
  spela.

## Bygga ut (förberett)

- **Ny figur**: nytt objekt i `FIGURER` (gärna `figurUrExport` på en figur i
  `FIGUR_DATA`), byt `figur` i `app.js`. Senare: figurval i startrutan.
  Ond finns redan i `FIGUR_DATA.ond` (lägen, inga egna animationer).
- **Ändrad figur**: kör `verktyg/las_figur.py` på den nya exporten.
- **Ny bana**: kopiera `angen` i `BANOR`, ändra värden/färger. Senare:
  banval, svårighet som ökar under banan, nya hindertyper.
- Ljud är medvetet bortvalt tills vidare.
