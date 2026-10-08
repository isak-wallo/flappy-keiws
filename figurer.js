// Figurerna man kan flyga med.
//
// En figur är klossar (rektanglar) i samma mått som i figurernas
// pixelanimationer (512×304 px per bild), räknat från kroppens övre
// vänstra hörn. Spelet skalar ner dem med `skala`
// (världsenheter per figurpixel) och ritar dem skarpt, så att figuren ser
// ut som i animationerna.
//
// Varje kloss har en `roll`:
//   'kropp' – står still
//   'arm'   – flyttas upp och ner när figuren flaxar (i hela steg, 12 px,
//             som i animationerna: armar sträcks aldrig ut)
//   'oga'   – kan blinka och kisa (blir ett `blink` px högt streck)
//   'ben'   – svävande ben som sackar efter lite nedåt vid ett flax
//
// `traff` är träffytan för kollisioner, lite mindre än kroppen så att det
// känns rättvist. Armarna räknas inte.
//
// Ny figur: lägg till ett objekt här och välj det i app.js.

const FIGURER = {
    // keIWs från sidan (som i figurens egna ritskript), men speglad så att
    // den tittar åt höger, dit den flyger.
    // Fyrkantig kropp (160 px), armar, ben och ögon är lika stora klossar
    // (36 px) som svävar med 8 px mellanrum. Bortre arm och ben i skugga.
    keiws: {
        namn: 'keIWs',
        skala: 0.24,
        farger: {
            kropp: '#5685d7',    // keIWs-blå
            skugga: '#4065a8',   // bortre arm och ben
            mage: '#6c99e4',     // magklossen, lite ljusare
            oga: '#101628'       // nästan svart, lite blå
        },
        // [x0, y0, x1, y1, roll, färg] – ritas i den här ordningen
        klossar: [
            [-44, 52, -8, 88, 'arm', 'skugga'],     // bortre arm (bakom)
            [24, 168, 60, 204, 'ben', 'skugga'],    // bortre ben
            [0, 0, 160, 160, 'kropp', 'kropp'],     // kroppen
            [168, 64, 204, 100, 'arm', 'kropp'],    // närmre arm (framför)
            [88, 168, 124, 204, 'ben', 'kropp'],    // närmre ben
            [72, 25, 108, 61, 'oga', 'oga'],        // ögonen, framme vid kanten
            [116, 25, 152, 61, 'oga', 'oga'],
            [116, 99, 152, 135, 'kropp', 'mage']    // magklossen under främre ögat
        ],
        blink: 8,
        mitt: [80, 102],
        traff: [6, 6, 154, 198]        // kropp + ben, lite indragen
    }
};
