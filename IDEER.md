# Idéer

Allt vi kan bygga vidare på, ungefär i den ordning det känns rimligt.
Små steg: en sak i taget, testa (`python verktyg/testa.py`), pusha, spela på
telefonen. Bocka av (`[x]`) och flytta gjort till "Gjort" längst ner. Nya
idéer skrivs in där de passar.

## Att bestämma

- [ ] **Åt vilket håll flyger keIWs?** keIWs vrider sig alltid åt vänster i
  sina animationer. I spelet är sidovyn just nu speglad så att den tittar åt
  höger (som i Flappy Bird). Alternativet är att banan rullar åt andra
  hållet och keIWs flyger åt vänster, utan spegling.

## 1. Mer liv i keIWs

Bara klossar som flyttas, ingen rotation. Armarna flyttas i hopp, alltid
minst 8 px utanför kroppen och aldrig över den. Lägen i jämna px.

- [ ] **Andas på startskärmen**, framifrån: kroppen med ögon och mage går ner
  0 → 2 → 4 px, armarna en ruta efter 0 → 2 → 4 → 6 → 4, benen står still.
  Ca 110–130 ms per ruta, ett andetag ca 2,8 s. Blinkar (8 px streck) i två
  rutor precis när kroppen börjar sjunka.
- [ ] **Vinkar på startskärmen** ibland: höger arm (framifrån) hoppar
  upp bredvid huvudet och vinkar tre gånger (130 ms per läge), vänster arm
  gungar 0/4 px i takt, blicken flyttas 4 px mot handen, kisar ca 300 ms
  innan armen hoppar ner.
- [ ] **Vrider sig** från framifrån till sidled när man trycker igång: tre
  steg à 90 ms. Ögon, ben och bortre arm flyttas jämnt mellan lägena
  (avrundat till 2 px), bortre arm och ben blir mörka efter halva vridningen.
  Kräver figurens framvy och mellanlägen i `figurer.js`.
- [ ] **Jublar** när man klarar en stapel, eller vid nytt rekord: armarna
  upp, ett litet skutt (dy −16, −28, −16, 0, −12, 0 à 80–90 ms), blinkar
  högst upp.
- [ ] **Tydligare krasch**: blundar redan; kanske armarna rakt upp och en
  liten studs mot marken.

## 2. Spelkänsla

- [ ] **Paus** när man byter app eller flik mitt i en runda (i dag kastas
  man tillbaka mitt i luften). Visa "Paus – tryck för att fortsätta".
- [ ] **"Redo?"-stund** innan första stapeln: figuren svävar på plats tills
  första trycket (finns delvis: startläget).
- [ ] **Pixeltypsnitt** i textrutan, så att texten matchar siffrorna (egna
  bokstäver i 3×5 eller 5×7, ritade på canvas).
- [ ] **Medaljer** i kraschrutan: brons 10, silver 25, guld 50.
- [ ] **Liten visuell bekräftelse** när en stapel passeras (siffran studsar).
- [ ] Justera fysiken efter mer spelande (`banor.js`: tyngd, flax, fart,
  öppning).

## 3. Fler banor

En bana är bara data i `banor.js` (fysik, hinder, färger).

- [ ] **Natt**: mörkblå himmel, pixelstjärnor, måne, staplar i dovt blått.
- [ ] **Vinter**: snö som faller sakta, vita kullar, staplar i isblått.
- [ ] **Höst**: staplar i rost, senap och brunt, löv som blåser förbi.
- [ ] **Banval** i startrutan, **rekord per bana**.
- [ ] **Upplåsning**: nästa bana öppnas när man klarar t.ex. 15 staplar på
  den förra.
- [ ] Svårighet som ökar lite under banan (fart eller avstånd), per bana.

## 4. Hinder och saker längs vägen

- [ ] **Glidande staplar** som sakta går upp och ner (i senare banor).
- [ ] **Olika breda** staplar som omväxling.
- [ ] **Något att plocka**: en liten kloss eller stjärna i öppningen som
  ger extrapoäng.
- [ ] Bakgrunder från keIWs-animationerna, t.ex. **vindkraftverk** som snurrar
  långt bak, eller kyltorn på en bana.

## 5. Det sociala

- [ ] **Dagens bana**: slumpen styrs av datumet, så alla får samma staplar
  samma dag och kan jämföra poäng utan server. Eget rekord för dagens bana.
- [ ] **Dela resultat** med telefonens dela-meny (Web Share API), med en bild
  ur spelet.

## 6. Senare

- [ ] **Ljud**: korta pixelpip som genereras i koden (Web Audio, inga
  ljudfiler) för flax, poäng och krasch. Med av/på-knapp, av från början?
- [ ] **Figurval**, om fler figurer dyker upp.
- [ ] **Inställningar** (lite): lätt/normal, ljud av/på.
- [ ] **Versionsnummer** litet i ett hörn av startrutan (samma som `VERSION`
  i `sw.js`), så man ser att telefonen har senaste versionen.

## Teknik och arbetssätt

- [ ] **Figurens mått automatiskt**: ett exportskript i figurens eget repo
  som skriver klossarna (alla vridningar) som JSON, som spelet läser in i
  stället för handkopierade mått i `figurer.js`.
- [ ] **Dela upp `app.js`** när den växer (t.ex. ritning, textrutor, banor),
  fortfarande utan byggsteg.
- [ ] **Slump med frö** (seedad), behövs för "Dagens bana" och gör testerna
  upprepbara.
- [ ] Testskriptet: fler kontroller när det kommer nya funktioner (paus,
  banval, rekord per bana).

## Gjort

- [x] Första spelbara versionen: en bana, en figur, poäng och rekord.
- [x] Raka staplar i stället för rör, i olika gröna nyanser.
- [x] Lätt i början: öppningen 200 → 150, 5 per stapel. Lite långsammare fall.
- [x] keIWs som figur.
- [x] Testskript: `verktyg/testa.py`.
