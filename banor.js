// Banorna. En bana är bara inställningar: fysik, hinder och färger.
//
// Världen är 360 enheter bred och 640 hög (stående). På skärmar med annan
// form syns lite mer himmel ovanför och mark nedanför, eller lite mer åt
// sidorna (högst 400 enheter bred).
//
// Ny bana: kopiera `angen` (eller gör som `natt`: ta över allt och byt
// det som skiljer), ändra värdena och välj den i app.js.

const BANOR = {
    angen: {
        namn: 'Ängen',

        // --- Fysik (enheter per sekund) ---
        fart: 140,            // hur fort banan rullar förbi
        tyngd: 1250,          // tyngdkraft (enheter/s²)
        flax: -400,           // fart uppåt direkt efter ett flax
        maxFall: 480,         // högsta fallfart

        // --- Hinder ---
        stapelBredd: 56,      // de första staplarna ...
        stapelBredder: [40, 56, 56, 72, 96],   // ... sedan en slumpad av de här
        breddFran: 3,         // (från stapel nummer 3, 0 = första)
        oppningStart: 200,    // öppningen vid första stapeln (lätt i början) ...
        oppningSteg: 5,       // ... krymper så här mycket för varje stapel ...
        oppning: 150,         // ... ner till den här höjden (nås vid stapel 11)
        avstand: 200,         // luft mellan två staplar (från kant till kant)
        kantMarginal: 70,     // öppningen hamnar minst så här långt från tak och mark
        maxHopp: 190,         // öppningen flyttar sig högst så här mycket mellan två staplar
        forstaStapel: 140,    // extra luft före första stapeln

        markHojd: 96,         // marken längst ner

        // Medaljer i kraschrutan: [minst så många poäng, medalj]
        medaljer: [[10, 'brons'], [25, 'silver'], [50, 'guld']],

        // --- Färger: lugna, lite dova pixelfärger ---
        farger: {
            himmelTopp: '#a9d3e3',
            himmelBotten: '#e3f1ea',
            moln: '#f5faf8',
            molnSkugga: '#dcebee',
            kullar: '#b4d4bd',
            kullarNara: '#9fc6a9',
            // Staplarna får en slumpad grön nyans var (aldrig samma två i rad)
            staplar: ['#8fbaa6', '#a6d19a', '#6fa88a', '#b9cf86', '#7db8b0', '#93c47d'],  // salvia, ljust löv, jade, gulgrön, blågrön, gräs
            gras: '#9cc58e',
            grasKant: '#82ad78',
            jord: '#e2d4ad',
            jordRand: '#d4c398',
            siffror: '#ffffff',
            sifferSkugga: '#5f8292'
        }
    }
};

// Stjärnorna finns i varje palett som ett tal, så att de tänds och släcks
// när paletterna glider över: `stjarnLjus` (0 = inga, 1 = alla). Solen och
// månen har egna banor efter klockan (`himlakroppar`).
Object.assign(BANOR.angen.farger, {
    stjarnLjus: 0,
    stjarna: '#f3efd6', stjarnaSvag: '#8c9abb',
    mane: '#efe7c4', maneSkugga: '#d3c99e',
    sol: '#fbe7a1', solKant: '#f3cf72'
});

// Natten: samma fysik och hinder som ängen, men mörkblå himmel med
// stjärnor och måne, och staplar i dovt blått. Ängen glider över i den på
// kvällen (se `dygn`); ?bana=natt i adressen ger bara natt.
BANOR.natt = {
    ...BANOR.angen,
    namn: 'Natten',
    farger: {
        himmelTopp: '#18223b',
        himmelBotten: '#3a5076',
        moln: '#3d5074',
        molnSkugga: '#33445f',
        kullar: '#2b4058',
        kullarNara: '#243749',
        // Dovt blått och lite blågrönt (aldrig samma två i rad)
        staplar: ['#4f6f9a', '#5d82a8', '#46668c', '#6a8fb0', '#4c7d94', '#587aa3'],
        gras: '#3e5f55',
        grasKant: '#33524a',
        jord: '#4d4a63',
        jordRand: '#433f58',
        siffror: '#ffffff',
        sifferSkugga: '#18223b',
        stjarnLjus: 1,
        stjarna: '#f3efd6', stjarnaSvag: '#8c9abb',
        mane: '#efe7c4', maneSkugga: '#d3c99e',
        sol: '#f7b65a', solKant: '#e8894a'
    }
};

// Dygnet på ängen: färgerna följer klockan. [klockslag, palett] – mellan
// två klockslag glider färgerna sakta över från den ena till den andra.
// Skymning 18–21, natt 21–06, gryning 06–08, dag 08–18.
BANOR.angen.paletter = {
    dag: BANOR.angen.farger,
    natt: BANOR.natt.farger,
    // Solnedgång: lila himmel som blir persika mot horisonten, rosa moln
    skymning: {
        himmelTopp: '#474c82',
        himmelBotten: '#efa47c',
        moln: '#e4998c',
        molnSkugga: '#c27f89',
        kullar: '#7a6c89',
        kullarNara: '#655a77',
        staplar: ['#6f8f8e', '#7f9f8a', '#5f7f86', '#8f9a7c', '#6a8a94', '#77917a'],
        gras: '#6f8a6a',
        grasKant: '#5d7660',
        jord: '#a98f86',
        jordRand: '#957b78',
        siffror: '#ffffff',
        sifferSkugga: '#474c82',
        stjarnLjus: 0.25,
        stjarna: '#f3efd6', stjarnaSvag: '#8c9abb',
        mane: '#efe7c4', maneSkugga: '#d3c99e',
        sol: '#f7b65a', solKant: '#e8894a'
    },
    // Soluppgång: svalare, ljusrosa mot horisonten
    gryning: {
        himmelTopp: '#5d6fa0',
        himmelBotten: '#f2c4a6',
        moln: '#f0cec4',
        molnSkugga: '#d5afaf',
        kullar: '#899999',
        kullarNara: '#758789',
        staplar: ['#7aa29a', '#8db594', '#66928a', '#9fb088', '#6f9fa0', '#82aa86'],
        gras: '#7fa57e',
        grasKant: '#6a9070',
        jord: '#c6b39c',
        jordRand: '#b39f8a',
        siffror: '#ffffff',
        sifferSkugga: '#5d6fa0',
        stjarnLjus: 0.15,
        stjarna: '#f3efd6', stjarnaSvag: '#8c9abb',
        mane: '#efe7c4', maneSkugga: '#d3c99e',
        sol: '#f9d27a', solKant: '#efa65c'
    }
};
// Solen och månen följer klockan i raka linjer mellan punkterna
// [klockslag, höjd]: 1 = högt uppe, 0 = vid horisonten, -0.2 = helt nere
// bakom kullarna. Solen går ner 18–20 och upp 06–08, månen tvärtom.
BANOR.angen.himlakroppar = {
    sol: [[6, -0.2], [8, 1], [18, 1], [20, -0.2]],
    mane: [[6, 1], [8, -0.2], [18, -0.2], [20, 1]]
};
BANOR.natt.himlakroppar = { sol: [[0, -0.2]], mane: [[0, 1]] };

BANOR.angen.dygn = [
    [6, 'natt'], [7, 'gryning'], [8, 'dag'],
    [18, 'dag'], [19.5, 'skymning'], [21, 'natt']
];
