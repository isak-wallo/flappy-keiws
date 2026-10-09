// Figurerna man kan flyga med.
//
// Måtten kommer från figurens egen export (figur_data.js, skriven av
// verktyg/las_figur.py): rektanglar i samma mått som i figurens
// pixelanimationer, räknat från kroppens övre vänstra hörn. Spelet skalar
// ner dem med `skala` (världsenheter per figurpixel) och ritar dem skarpt.
//
// Två sätt att rita figuren:
//
// 1. Färdiga lägen och animationer ur exporten, ruta för ruta: på
//    startskärmen står figuren framifrån (`idle`, `vinka` i ordningen
//    `start`), somnar efter `somnaEfter` s (`somnar`, sedan `sover` i
//    loop), vaknar och ruskar på sig vid ett tryck (`vaknar`) och vrider
//    sig åt höger när den börjar flyga (`vrid`, ett steg per `vridMs`).
//    Efter ett nytt rekord jublar den framifrån med konfetti (`rekordjubel`)
//    när den kommer tillbaka till startskärmen.
//    Slår man sitt rekord gör den ett glädjeskutt åt höger (`jubel`). Vid
//    en krock: smällen (`krock`), fladdrar medan den faller (`faller`),
//    studsar mot marken (`landar`) och blir yr med stjärnor (`yr`).
//
// 2. Medan den flyger: sidovyn (`vrid[3]`) som `klossar` med en roll var,
//    som spelet flyttar själv:
//      'kropp' – står still (kropp och mage)
//      'arm'   – flyttas upp och ner när figuren flaxar (i hela steg, 12 px)
//      'oga'   – kan blinka och kisa (blir ett `blink` px högt streck)
//      'ben'   – svävande ben som sackar efter lite nedåt vid ett flax
//    `jubel` (när en stapel klaras) och `krasch` (figurer utan egen
//    krockanimation: armar upp och studs) är små animationer i figurpixlar och millisekunder. De är
//    bara ritning: träffytan flyttar sig aldrig.
//
// `traff` är träffytan för kollisioner, lite mindre än kroppen så att det
// känns rättvist. Armarna räknas inte.
//
// Ny figur: lägg till ett objekt här och välj det i app.js.

// Vilken roll varje del i exporten får när spelet flyttar den.
const DEL_ROLL = {
    kropp: 'kropp', mage: 'kropp', oga: 'oga',
    nara_arm: 'arm', bortre_arm: 'arm', nara_ben: 'ben', bortre_ben: 'ben'
};

// En figur ur exporten: färger, lägen och animationer, plus sidovyn som
// klossar med roller.
function figurUrExport(d) {
    return {
        farger: d.farger,
        vrid: d.vrid,
        animationer: { idle: d.idle, vinka: d.vinka, jubel: d.jubel, somnar: d.somnar, sover: d.sover, vaknar: d.vaknar,
            rekordjubel: d.rekordjubel, krock: d.krock, faller: d.faller, landar: d.landar, yr: d.yr },
        klossar: d.vrid[3].map(([x0, y0, x1, y1, farg, del]) =>
            [x0, y0, x1, y1, DEL_ROLL[del], farg])
    };
}

const FIGURER = {
    // keIWs: fyrkantig kropp (160 px), armar, ben och ögon är lika stora
    // klossar (36 px) som svävar med 8 px mellanrum. Från sidan tittar den
    // åt höger, dit den flyger. Armen och benet framåt i skugga.
    keiws: Object.assign(figurUrExport(FIGUR_DATA.keiws), {
        namn: 'keIWs',
        skala: 0.24,
        blink: 8,
        // Startskärmen: animationerna i den här ordningen, om och om igen.
        // Ett andetag är ca 2,8 s, en vinkning ca 2,4 s.
        start: ['idle', 'vinka', 'idle', 'idle', 'idle'],
        vridMs: 90,
        // Somnar om ingen trycker på så här många sekunder (vid nästa
        // ledigt läge i startanimationerna), sover sedan i loop. Ett tryck
        // när den sover: vaknar och ruskar igång sig, flyger sedan iväg.
        somnaEfter: 25,
        // Jublar: armarna hoppar upp [lyft, ms] och keIWs kisar av glädje
        // de första `blinkMs`.
        jubel: {
            armar: [[-24, 80], [-36, 140], [-24, 90], [-12, 80]],
            blinkMs: 220
        },
        mitt: [80, 102],
        traff: [6, 6, 154, 198]        // kropp + ben, lite indragen
    })
};
