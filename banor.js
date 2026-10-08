// Banorna. En bana är bara inställningar: fysik, hinder och färger.
//
// Världen är 360 enheter bred och 640 hög (stående). På skärmar med annan
// form syns lite mer himmel ovanför och mark nedanför, eller lite mer åt
// sidorna (högst 400 enheter bred).
//
// Ny bana: kopiera `angen`, ändra värdena och välj den i app.js.

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
