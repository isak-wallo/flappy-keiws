# Idéer

Allt vi kan bygga vidare på, ungefär i den ordning det känns rimligt.
Små steg: en sak i taget, testa (`python verktyg/testa.py`), pusha, spela på
telefonen. Bocka av (`[x]`) och flytta gjort till "Gjort" längst ner. Nya
idéer skrivs in där de passar.

## 1. Mer liv i keIWs

Bara klossar som flyttas, ingen rotation. Armarna flyttas i hopp, alltid
minst 8 px utanför kroppen och aldrig över den. Lägen i jämna px.
Nya animationer görs i figurens eget ritverktyg, exporteras och läses in
med `verktyg/las_figur.py`.


## 2. Spelkänsla

- [ ] **"Redo?"-stund** innan första stapeln: figuren svävar på plats tills
  första trycket (finns delvis: startläget).
- [ ] Justera fysiken efter mer spelande (`banor.js`: tyngd, flax, fart,
  öppning).

## 3. Fler banor

En bana är bara data i `banor.js` (fysik, hinder, färger).

- [ ] **Vinter**: snö som faller sakta, vita kullar, staplar i isblått.
- [ ] **Höst**: staplar i rost, senap och brunt, löv som blåser förbi.
- [ ] **Banval** i startrutan, **rekord per bana** (natt och dag delar
  rekord i dag, de har samma fysik och hinder).
- [ ] **Upplåsning**: nästa bana öppnas när man klarar t.ex. 15 staplar på
  den förra.
- [ ] Svårighet som ökar lite under banan (fart eller avstånd), per bana.

## 4. Hinder och saker längs vägen

- [ ] **Glidande staplar** som sakta går upp och ner (i senare banor).
- [ ] **Något att plocka**: en liten kloss eller stjärna i öppningen som
  ger extrapoäng.
- [ ] **Ond** (keIWs onda dubbelgångare) som fiende: samma kropp men
  svart-grå med arga röda ögon som trappar ner mot mitten (#1e1e24,
  #121216, ögon #e02424, ljus #484a52). Kan flyga emot en i
  öppningarna i senare banor, eller vara en egen figur att välja.
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

## Teknik och arbetssätt

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
- [x] keIWs flyger åt höger (sidovyn speglad), bestämt 2026-10-09.
- [x] keIWs andas på startskärmen (kroppen sjunker 0–4 px, armarna hänger
  efter, blinkar) och jublar med armarna när man klarar en stapel.
- [x] Magklossen under vänster öga (det inre när keIWs tittar åt höger).
- [x] Paus när man byter app eller flik mitt i en runda.
- [x] Poängsiffran studsar när man klarar en stapel.
- [x] Versionsnummer i startrutans hörn.
- [x] Medaljer i kraschrutan: brons 10, silver 25, guld 50.
- [x] Tydligare krasch: armarna rakt upp och en liten studs mot marken.
- [x] Skutt med armarna upp när man slår sitt rekord.
- [x] Eget pixeltypsnitt (5×7, gemener och åäö) i textrutorna.
- [x] Nattbana med stjärnor och måne.
- [x] Dygnet följer klockan: skymning 18–21 (solen går ner, månen upp),
  natt 21–06, gryning 06–08, dag 08–18. Färgerna glider över.
- [x] Figuren läses in från sin export (`verktyg/las_figur.py` →
  `figur_data.js`) i stället för handkopierade mått.
- [x] keIWs står framifrån på startskärmen, andas och vinkar ibland, vrider
  sig åt höger när man trycker igång och tillbaka efter en runda.
- [x] keIWs somnar på startskärmen efter ca 25 s utan tryck och sover med
  Z-klossar. Ett tryck: vaknar och ruskar igång sig (0,5 s, tryck under
  tiden räknas inte), vrider sig och flyger iväg av sig själv.
- [x] Olika breda staplar (40–96) från fjärde stapeln.
- [x] Glädjeskuttet vid nytt rekord är figurens egen jubelanimation ur
  exporten.
- [x] Solen syns på dagen. Solen och månen går upp och ner i raka linjer
  efter klockan (solen ner 18–20, upp 06–08).
