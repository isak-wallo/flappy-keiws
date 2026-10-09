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
// `andning` (startskärmen), `jubel` (när en stapel klaras), `rekord` (när
// man slår sitt rekord) och `krasch` är små animationer i figurpixlar och
// millisekunder. De är bara ritning: träffytan flyttar sig aldrig.
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
            [72, 99, 108, 135, 'kropp', 'mage']     // magklossen under vänster (inre) öga
        ],
        blink: 8,
        // Andas: [kroppen ner, armarna ner, ms] per ruta. Kroppen med ögon
        // och mage sjunker, armarna hänger efter en ruta, benen står still.
        // Blinkar i rutorna `blink`, precis när kroppen börjar sjunka.
        andning: {
            rutor: [
                [0, 0, 100], [0, 0, 100], [0, 0, 100], [0, 0, 100], [0, 0, 100], [0, 0, 100],
                [2, 0, 110], [4, 2, 110], [4, 4, 110], [4, 6, 120], [4, 6, 120],
                [4, 4, 130], [4, 4, 130], [4, 4, 130],
                [2, 4, 110], [0, 2, 110], [0, 0, 110], [0, 0, 100],
                [0, 0, 100], [0, 0, 100], [0, 0, 100], [0, 0, 100],
                [0, 0, 100], [0, 0, 100], [0, 0, 100], [0, 0, 100]
            ],
            blink: [6, 7]
        },
        // Jublar: armarna hoppar upp [lyft, ms] och keIWs kisar av glädje
        // de första `blinkMs`.
        jubel: {
            armar: [[-24, 80], [-36, 140], [-24, 90], [-12, 80]],
            blinkMs: 220
        },
        // Nytt rekord: ett litet skutt [upp, ms] med armarna rakt upp, och
        // blundar av glädje när den är som högst (upp ≤ `blinkUnder`).
        rekord: {
            skutt: [[-16, 80], [-28, 90], [-16, 80], [0, 80], [-12, 90], [0, 200]],
            armar: -36,
            blinkUnder: -16
        },
        // Krasch: armarna rakt upp, och en liten studs [upp, ms] mot marken.
        krasch: {
            armar: -36,
            studs: [[-16, 60], [-24, 80], [-16, 60], [0, 60], [-8, 60], [0, 60]]
        },
        mitt: [80, 102],
        traff: [6, 6, 154, 198]        // kropp + ben, lite indragen
    }
};
