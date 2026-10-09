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
        stapelBredd: 56,
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

// Natten: samma fysik och hinder som ängen, men mörkblå himmel med
// stjärnor och måne, och staplar i dovt blått. Spelet väljer den själv
// på kvällen och natten (se NATT_FRAN/NATT_TILL i app.js).
BANOR.natt = {
    ...BANOR.angen,
    namn: 'Natten',

    stjarnor: 36,         // så många stjärnor som blinkar på himlen
    mane: true,

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
        stjarna: '#f3efd6',
        stjarnaSvag: '#8c9abb',
        mane: '#efe7c4',
        maneSkugga: '#d3c99e'
    }
};
