// Flappy keIWs — flaxa mellan staplarna.
//
// Figurerna står i figurer.js och banorna i banor.js. Här finns spelet:
// loop, fysik, kollisioner, ritning och skalet (layout, helskärm, SW).

document.addEventListener('DOMContentLoaded', () => {
    const app = document.getElementById('app');
    const canvas = document.getElementById('spel');
    const ctx = canvas.getContext('2d');
    const ruta = document.getElementById('ruta');
    const menyknapp = document.getElementById('menyknapp');

    // Kugghjulet (15×15 pixlar, åtta kuggar) och texten "Meny"
    menyknapp.innerHTML = (() => {
        const bild = ['......###......', '...#..###..#...', '..###.###.###..',
                      '.#############.', '..###########..', '...####.####...',
                      '######...######', '#####.....#####', '######...######',
                      '...####.####...', '..###########..', '.#############.',
                      '..###.###.###..', '...#..###..#...', '......###......'];
        let rutor = '';
        bild.forEach((rad, y) => {
            for (let x = 0; x < rad.length; x++) {
                if (rad[x] === '#') rutor += '<rect x="' + x + '" y="' + y + '" width="1" height="1"/>';
            }
        });
        return '<svg width="30" height="30" viewBox="0 0 15 15" shape-rendering="crispEdges" fill="currentColor">' +
            rutor + '</svg>' + pixeltext('Meny', 3);
    })();

    // --- Val (blir inställningar längre fram) ---
    const figur = FIGURER.keiws;

    // ?bana=natt (eller angen) i adressen väljer bana, annars ängen.
    const BANA_I_ADRESS = (/[?&]bana=(\w+)/.exec(location.search) || [])[1];
    const bana = BANOR[BANA_I_ADRESS] || BANOR.angen;

    // Färgerna följer klockan om banan har ett dygn (skymning, natt,
    // gryning, dag), se `dygn` i banor.js. ?klocka=19.5 i adressen låtsas
    // att klockan är 19.30, för att se hur det ser ut.
    const KLOCKA_I_ADRESS = (/[?&]klocka=([\d.]+)/.exec(location.search) || [])[1];
    // Tid i menyn: auto (följer klockan) eller en fast tid på dygnet.
    const TIDER = [['auto', 'Auto'], ['dag', 'Dag', 12], ['skymning', 'Skymning', 19.5],
                   ['natt', 'Natt', 0], ['gryning', 'Gryning', 7]];
    const TID_NYCKEL = 'flappy-keiws-tid';
    let tidVal = lasVal(TID_NYCKEL, TIDER.map(t => t[0]), 'auto');
    function klockslag() {
        if (KLOCKA_I_ADRESS !== undefined) return parseFloat(KLOCKA_I_ADRESS) % 24;
        const fast = TIDER.find(t => t[0] === tidVal);
        if (fast && fast[2] !== undefined) return fast[2];
        const d = new Date();
        return d.getHours() + d.getMinutes() / 60 + d.getSeconds() / 3600;
    }
    let F = fargerNu();               // färgerna just nu (räknas om varje sekund)

    // --- Världen ---
    const VARLD_B = 360;             // världens bredd (enheter)
    const VARLD_H = 640;             // världens höjd
    const MAX_B = 400;               // högst så här bred vy (dator/platta)
    const MARK_Y = VARLD_H - bana.markHojd;
    const FIGUR_X = 100;             // figuren står still i x, banan rullar
    const START_Y = 280;             // där figuren svävar innan man börjar
    const STEG = 1 / 120;            // fast tidssteg för fysiken (s)
    const VISA_KRASCH_EFTER = 0.5;   // s efter landning innan rutan visas
    const REKORD_JUBEL = 1;          // så många gånger figuren jublar när rekordet slås
    const OMSTART_SPARR = 400;       // ms innan man kan starta om efter krasch
    const BAST_NYCKEL = 'flappy-keiws-bast';

    // Skala och vy: s = skärmpixlar per världsenhet, vyX0/vyY0 = världens
    // koordinat i skärmens övre vänstra hörn.
    let s = 1, vyB = VARLD_B, vyH = VARLD_H, vyX0 = 0, vyY0 = 0;

    // --- Spelets tillstånd: 'start' -> 'spelar' -> 'krasch' -> 'start' ---
    // ('paus' när man lämnar appen mitt i en runda, tillbaka till 'spelar')
    let tillstand = 'start';
    let lageBorjade = 0;             // tid när start eller spelar började
    let vriderTillbaka = false;      // start efter en runda: vrid tillbaka framåt
    let vaknarVid = null;            // tid när figuren väcktes (ruskar igång sig)
    let jublaPaStart = false;        // tillbaka efter nytt rekord: jubla först
    let tid = 0;                     // s sedan sidan startade (för gungning m.m.)
    let rullat = 0;                  // hur långt banan rullat (för marken)
    let staplar = [];                // { x, mittY, passerad }
    let poang = 0;
    let bast = lasBast();
    let nyttRekord = false;
    let rutaVisadVid = 0;            // performance.now() när kraschrutan visades
    let landadTid = null;            // s sedan figuren landade efter krasch
    let laddaOmSen = false;          // ny version finns: ladda om vid nästa start
    let poangTid = 99;               // s sedan senaste poängen (siffran studsar)
    let version = '';                // appens version (cachens namn), visas i startrutan

    const fig = {
        y: START_Y,
        v: 0,
        flaxTid: 1,                  // s sedan senaste flaxet
        jubelTid: 99,                // s sedan senaste klarade stapeln
        rekordTid: 99                // s sedan rekordet slogs
    };

    // ------------------------------------------------------------------
    // Hjälpfunktioner
    // ------------------------------------------------------------------

    function rand(a, b) { return a + Math.random() * (b - a); }

    function lasBast() {
        try { return parseInt(localStorage.getItem(BAST_NYCKEL), 10) || 0; }
        catch (e) { return 0; }
    }

    function sparaBast(n) {
        try { localStorage.setItem(BAST_NYCKEL, String(n)); } catch (e) {}
    }

    // Ett sparat val ur en lista (annars `annars`), och spara ett val.
    function lasVal(nyckel, tillatna, annars) {
        try {
            const v = localStorage.getItem(nyckel);
            return tillatna.includes(v) ? v : annars;
        } catch (e) { return annars; }
    }

    function sparaVal(nyckel, v) {
        try { localStorage.setItem(nyckel, v); } catch (e) {}
    }

    // Blandar två färger '#rrggbb' (t = 0..1).
    function blanda(a, b, t) {
        const pa = parseInt(a.slice(1), 16), pb = parseInt(b.slice(1), 16);
        const kanal = sh => Math.round(((pa >> sh) & 255) * (1 - t) + ((pb >> sh) & 255) * t);
        return '#' + ((kanal(16) << 16) | (kanal(8) << 8) | kanal(0)).toString(16).padStart(6, '0');
    }

    // Blanda två paletter: färger (även listor av färger) och tal.
    function blandaPalett(a, b, t) {
        if (t <= 0) return a;
        if (t >= 1) return b;
        const ut = {};
        for (const k in a) {
            const x = a[k], y = b[k];
            if (y === undefined) ut[k] = x;
            else if (Array.isArray(x)) ut[k] = x.map((f, i) => blanda(f, y[i % y.length], t));
            else if (typeof x === 'number') ut[k] = x + (y - x) * t;
            else ut[k] = blanda(x, y, t);
        }
        return ut;
    }

    // Färgerna just nu: banans egna, eller dygnets efter klockan.
    // Var på dygnet är vi? punkter = [[klockslag, värde], ...] i ordning.
    // Ger [värdet före, värdet efter, t 0–1 mellan dem], runt midnatt också.
    function iDygnet(punkter, h) {
        if (punkter.length === 1) return [punkter[0][1], punkter[0][1], 0];
        if (h < punkter[0][0]) h += 24;
        for (let i = 0; i < punkter.length; i++) {
            const [ta, a] = punkter[i];
            const [tb0, b] = punkter[(i + 1) % punkter.length];
            const tb = i === punkter.length - 1 ? tb0 + 24 : tb0;
            if (h >= ta && h < tb) return [a, b, (h - ta) / (tb - ta)];
        }
        return [punkter[0][1], punkter[0][1], 0];
    }

    function fargerNu() {
        if (!bana.dygn) return bana.farger;
        const [a, b, t] = iDygnet(bana.dygn, klockslag());
        return blandaPalett(bana.paletter[a], bana.paletter[b], t);
    }

    // Solens och månens höjd just nu (rak linje mellan punkterna).
    function hojdNu(namn) {
        const banan = bana.himlakroppar && bana.himlakroppar[namn];
        if (!banan) return undefined;
        const [a, b, t] = iDygnet(banan, klockslag());
        return a + (b - a) * t;
    }
    let solHojd = hojdNu('sol'), maneHojd = hojdNu('mane');

    // Ritar en rektangel i världskoordinater, avrundad till hela
    // skärmpixlar så att allt blir skarpt (pixelstil).
    function rekt(x, y, b, h, farg) {
        const X0 = Math.round((x - vyX0) * s), Y0 = Math.round((y - vyY0) * s);
        const X1 = Math.round((x + b - vyX0) * s), Y1 = Math.round((y + h - vyY0) * s);
        if (X1 <= X0 || Y1 <= Y0) return;
        ctx.fillStyle = farg;
        ctx.fillRect(X0, Y0, X1 - X0, Y1 - Y0);
    }

    // ------------------------------------------------------------------
    // Figuren
    // ------------------------------------------------------------------

    // Figurens träffyta i världen: [x0, y0, x1, y1].
    function figurTraff(y) {
        const k = figur.skala, t = figur.traff;
        return [
            FIGUR_X + (t[0] - figur.mitt[0]) * k, y + (t[1] - figur.mitt[1]) * k,
            FIGUR_X + (t[2] - figur.mitt[0]) * k, y + (t[3] - figur.mitt[1]) * k
        ];
    }

    // Avstånd från figurens mittpunkt ner till träffytans underkant.
    const FIGUR_UNDER = (figur.traff[3] - figur.mitt[1]) * figur.skala;
    const FIGUR_OVER = (figur.mitt[1] - figur.traff[1]) * figur.skala;

    // Värdet i en animation med steg [värde, ms] efter `s` sekunder, eller
    // null när den är slut.
    function stegVid(steg, s) {
        let t = s * 1000;
        for (const [varde, ms] of steg) {
            if (t < ms) return varde;
            t -= ms;
        }
        return null;
    }

    // Hela figuren lyfts så här mycket (figurpixlar): studs när den slår i
    // marken. Bara ritning, träffytan står kvar.
    function figurHopp() {
        if (tillstand === 'krasch' && landadTid !== null && figur.krasch) {
            return stegVid(figur.krasch.studs, landadTid) || 0;
        }
        return 0;
    }

    // Armarnas läge (figurpixlar, negativt = uppåt). Armarna flyttas i hela
    // steg om 12 px, som i animationerna.
    function armLyft() {
        if (tillstand === 'krasch') return figur.krasch ? figur.krasch.armar : -12;
        let lyft = 0;
        if (fig.flaxTid < 0.08) lyft = -24;
        else if (fig.flaxTid < 0.18) lyft = -12;
        else if (fig.v > 380) lyft = -12;    // faller fort: armarna upp
        return Math.min(lyft, jubelLyft());  // det som är högst upp vinner
    }

    // Startskärmens animationer efter varandra (figur.start), längd i ms.
    const animMs = namn => figur.animationer[namn].reduce((s, r) => s + r.tid, 0);
    const START_MS = figur.start ? figur.start.reduce((s, namn) => s + animMs(namn), 0) : 0;
    const KAN_SOVA = !!(figur.somnaEfter && figur.animationer &&
        figur.animationer.somnar && figur.animationer.sover && figur.animationer.vaknar);
    // ?somna=2 i adressen: somnar redan efter 2 s (för att prova och testa)
    const SOMNA_EFTER = +((/[?&]somna=([\d.]+)/.exec(location.search) || [])[1] || figur.somnaEfter);

    // När somnar figuren (ms in i startanimationerna)? Vid första ledigt
    // läge (slutet på en animation) efter SOMNA_EFTER sekunder.
    const SOMNAR_MS = (() => {
        if (!KAN_SOVA) return Infinity;
        let ms = 0;
        while (ms < SOMNA_EFTER * 1000) {
            for (const namn of figur.start) {
                ms += animMs(namn);
                if (ms >= SOMNA_EFTER * 1000) break;
            }
        }
        return ms;
    })();

    // Rutan i en animation `ms` in i den (sista rutan om den är slut,
    // eller om igen om loop).
    function rutaI(namn, ms, loop) {
        const rutor = figur.animationer[namn];
        if (loop) ms %= animMs(namn);
        for (const r of rutor) {
            if (ms < r.tid) return r.rekt;
            ms -= r.tid;
        }
        return rutor[rutor.length - 1].rekt;
    }

    // Ska figuren ritas med en färdig ruta ur exporten just nu? Ger
    // { lage, rekt } eller null (då ritas sidovyn med klossar och roller).
    //  - spelar: vrider sig från framifrån till sidan de första stegen,
    //    och gör ett glädjeskutt (jubel) när man slår sitt rekord
    //  - start: vrider sig tillbaka (om den kom från en runda), sedan
    //    andas och vinkar den framifrån, om och om igen
    function figurRuta() {
        if (!figur.vrid) return null;
        const steg = figur.vridMs / 1000;
        let t = tid - lageBorjade;
        if (tillstand === 'spelar') {
            const i = 1 + Math.floor(t / steg);       // vrid[1], vrid[2], sen sidan
            if (i < 3) return { lage: 'vrid', rekt: figur.vrid[i] };
            const ms = fig.rekordTid * 1000;
            if (figur.animationer.jubel && ms < REKORD_JUBEL * animMs('jubel')) {
                return { lage: 'jubel', rekt: rutaI('jubel', ms, true) };
            }
            return null;
        }
        if (tillstand === 'krasch') return krockRuta();
        if (tillstand !== 'start') return null;
        if (vaknarVid !== null) {
            return { lage: 'vaknar', rekt: rutaI('vaknar', (tid - vaknarVid) * 1000, false) };
        }
        if (vriderTillbaka) {
            const i = 2 - Math.floor(t / steg);       // vrid[2], vrid[1], sen framifrån
            if (i >= 1) return { lage: 'vrid', rekt: figur.vrid[i] };
            t -= 2 * steg;
        }
        if (jublaPaStart && figur.animationer.rekordjubel) {
            const ms = t * 1000, langd = animMs('rekordjubel');
            if (ms < langd) return { lage: 'rekordjubel', rekt: rutaI('rekordjubel', ms, false) };
            t -= langd / 1000;
        }
        if (!START_MS) return { lage: 'fram', rekt: figur.vrid[0] };
        const sov = t * 1000 - SOMNAR_MS;
        if (sov >= 0) {
            const somnar = animMs('somnar');
            return sov < somnar ? { lage: 'somnar', rekt: rutaI('somnar', sov, false) }
                                : { lage: 'sover', rekt: rutaI('sover', sov - somnar, true) };
        }
        let ms = (t * 1000) % START_MS;
        for (const namn of figur.start) {
            for (const r of figur.animationer[namn]) {
                if (ms < r.tid) return { lage: namn, rekt: r.rekt };
                ms -= r.tid;
            }
        }
        return { lage: 'fram', rekt: figur.vrid[0] };
    }

    // Krocken: smäll, fladdrar medan den faller, studsar mot marken och blir
    // sedan yr. Smällen spelas klart även om den landar direkt.
    function krockRuta() {
        const a = figur.animationer;
        if (!a || !a.krock || !a.faller || !a.landar || !a.yr) return null;
        const krockSlut = lageBorjade + animMs('krock') / 1000;
        const landat = landadTid === null ? Infinity : Math.max(tid - landadTid, krockSlut);
        if (tid < landat) {
            const ms = (tid - lageBorjade) * 1000;
            return ms < animMs('krock') ? { lage: 'krock', rekt: rutaI('krock', ms, false) }
                : { lage: 'faller', rekt: rutaI('faller', ms - animMs('krock'), true) };
        }
        const ms = (tid - landat) * 1000;
        return ms < animMs('landar') ? { lage: 'landar', rekt: rutaI('landar', ms, false) }
            : { lage: 'yr', rekt: rutaI('yr', ms - animMs('landar'), true) };
    }

    // Ritar en färdig ruta ur exporten: [x0, y0, x1, y1, färg, del]
    function ritaRektar(rektar, y) {
        const k = figur.skala, m = figur.mitt;
        for (const [x0, y0, x1, y1, farg] of rektar) {
            rekt(FIGUR_X + (x0 - m[0]) * k, y + (y0 - m[1]) * k,
                 (x1 - x0) * k, (y1 - y0) * k, figur.farger[farg]);
        }
    }

    // Jubel efter en klarad stapel: armarna hoppar upp en stund.
    function jubelLyft() {
        const ju = figur.jubel;
        if (!ju) return 0;
        let t = fig.jubelTid * 1000;
        for (const [lyft, ms] of ju.armar) {
            if (t < ms) return lyft;
            t -= ms;
        }
        return 0;
    }

    function jublar() {
        return figur.jubel && fig.jubelTid * 1000 < figur.jubel.blinkMs;
    }

    // Svävande ben sackar efter lite nedåt precis efter ett flax.
    function benSack() {
        if (tillstand !== 'spelar') return 0;
        if (fig.flaxTid < 0.1) return 8;
        if (fig.flaxTid < 0.2) return 4;
        return 0;
    }

    // Blundar ögonen? Kisar vid krasch och av glädje när den jublar, och
    // blinkar ibland. (På startskärmen blinkar den i sina animationer.)
    function blundar() {
        if (tillstand === 'krasch') return true;
        return jublar() || (tid % 3.2) < 0.12;
    }

    function ritaFigur(y) {
        const ruta = figurRuta();
        if (ruta) { ritaRektar(ruta.rekt, y); return; }
        const k = figur.skala, m = figur.mitt;
        const lyft = armLyft(), sack = benSack(), blund = blundar();
        y += figurHopp() * k;
        for (const [x0, y0, x1, y1, roll, farg] of figur.klossar) {
            let a = y0, b = y1;
            if (roll === 'arm') { a += lyft; b += lyft; }
            if (roll === 'ben') { a += sack; b += sack; }
            if (roll === 'oga' && blund) {
                // Ögat blir ett streck mitt i ögat
                const mittY = (a + b) / 2;
                a = mittY - figur.blink / 2; b = mittY + figur.blink / 2;
            }
            rekt(FIGUR_X + (x0 - m[0]) * k, y + (a - m[1]) * k,
                 (x1 - x0) * k, (b - a) * k, figur.farger[farg]);
        }
    }

    // ------------------------------------------------------------------
    // Staplarna
    // ------------------------------------------------------------------

    // Öppningens höjd för stapel nummer n (0 = första): stor i början och
    // krymper med bana.oppningSteg per stapel ner till bana.oppning.
    function oppningFor(n) {
        return Math.max(bana.oppning, bana.oppningStart - bana.oppningSteg * n);
    }

    // En grön nyans ur banans lista, aldrig samma som förra stapeln.
    // Stapelns färg är ett nummer i F.staplar, så att den följer med när
    // färgerna glider över i skymningen.
    function stapelFarg(forra) {
        const n = F.staplar.length;
        let f;
        do { f = Math.floor(Math.random() * n); }
        while (n > 1 && forra && f === forra.farg);
        return f;
    }

    // Stapelns bredd: samma i början, sedan en slumpad ur banans lista.
    function stapelBreddFor(n) {
        const lista = bana.stapelBredder;
        if (!lista || n < bana.breddFran) return bana.stapelBredd;
        return lista[Math.floor(Math.random() * lista.length)];
    }

    function nyStapel(x, forra) {
        const nr = forra ? forra.nr + 1 : 0;
        const oppning = oppningFor(nr);
        const halv = oppning / 2;
        const min = bana.kantMarginal + halv;
        const max = MARK_Y - bana.kantMarginal - halv;
        let lo = min, hi = max;
        if (forra) {
            lo = Math.max(min, forra.mittY - bana.maxHopp);
            hi = Math.min(max, forra.mittY + bana.maxHopp);
        }
        return { x, nr, b: stapelBreddFor(nr), oppning, farg: stapelFarg(forra),
                 mittY: rand(lo, hi), passerad: false };
    }

    // Lägger till staplar till höger tills det finns en precis utanför vyn.
    function fyllPaStaplar() {
        const hoger = vyX0 + vyB;
        let sista = staplar[staplar.length - 1];
        if (!sista) {
            sista = nyStapel(hoger + bana.forstaStapel);
            staplar.push(sista);
        }
        while (sista.x < hoger + 20) {
            sista = nyStapel(sista.x + sista.b + bana.avstand, sista);
            staplar.push(sista);
        }
    }

    // De två delarna av en stapel (ovanför och under öppningen) som
    // träffytor: [x0, y0, x1, y1].
    function stapelDelar(p) {
        const b = p.b, halv = p.oppning / 2;
        return [
            [p.x, -10000, p.x + b, p.mittY - halv],
            [p.x, p.mittY + halv, p.x + b, MARK_Y]
        ];
    }

    function overlappar(a, b) {
        return a[0] < b[2] && a[2] > b[0] && a[1] < b[3] && a[3] > b[1];
    }

    // Raka, enfärgade staplar
    function ritaStapel(p) {
        const b = p.b, halv = p.oppning / 2;
        const farg = F.staplar[p.farg % F.staplar.length];
        rekt(p.x, vyY0, b, p.mittY - halv - vyY0, farg);
        rekt(p.x, p.mittY + halv, b, MARK_Y - (p.mittY + halv), farg);
    }

    // ------------------------------------------------------------------
    // Bakgrund och mark
    // ------------------------------------------------------------------

    function ritaHimmel() {
        // Himlen i några få band i stället för en mjuk gradient (pixelstil)
        const BAND = 8;
        const h = (MARK_Y - vyY0) / BAND;
        for (let i = 0; i < BAND; i++) {
            rekt(vyX0, vyY0 + i * h, vyB, h + 1, blanda(F.himmelTopp, F.himmelBotten, i / (BAND - 1)));
        }
    }

    // Stjärnor: fasta platser på himlen som glider väldigt sakta, några
    // blinkar lite. Hur många som syns styrs av F.stjarnLjus (0–1). Platserna räknas fram en
    // gång med en enkel slump med frö, så de ligger likadant varje gång.
    const ANTAL_STJARNOR = 36;
    const STJARNOR = [];
    (function () {
        let fro = 7;
        const slump = () => (fro = (fro * 16807) % 2147483647) / 2147483647;
        for (let i = 0; i < ANTAL_STJARNOR; i++) {
            STJARNOR.push({ x: slump() * 460, y: -120 + slump() * 520, stor: slump() < 0.25, fas: slump() * 6.3 });
        }
    })();

    function ritaStjarnor() {
        const antal = Math.round(ANTAL_STJARNOR * (F.stjarnLjus || 0));
        const varv = vyB + 100;
        for (let i = 0; i < antal; i++) {
            const st = STJARNOR[i];
            if (st.y < vyY0 || st.y > MARK_Y - 90) continue;
            let x = (st.x - rullat * 0.02) % varv;
            if (x < 0) x += varv;
            x += vyX0 - 50;
            const ljus = Math.sin(tid * 1.3 + st.fas) > -0.6;
            const k = st.stor ? 4 : 2;
            rekt(x, st.y, k, k, ljus ? F.stjarna : F.stjarnaSvag);
        }
    }

    // Månen och solen: pixliga runda skivor (8×8). Månen har kratrar ('o')
    // och står till höger, solen har en kant ('k') och står till vänster.
    // De är så långt bort att de inte rullar med banan, men går upp och
    // ner med klockan (`himlakroppar` i banor.js). Kullarna och marken ritas
    // efter, så de går ner bakom dem.
    const MANE = [
        '..####..',
        '.######.',
        '##o#####',
        '#oo#####',
        '########',
        '#####oo#',
        '.####o#.',
        '..####..'
    ];

    const SOL = [
        '..kkkk..',
        '.k####k.',
        'k######k',
        'k######k',
        'k######k',
        'k######k',
        '.k####k.',
        '..kkkk..'
    ];

    // Ritar en himlakropp med vänsterkanten i x0 och höjden hojd (0 =
    // nere vid horisonten, 1 = högt upp).
    function ritaHimlakropp(bild, x0, hojd, farger) {
        if (hojd === undefined) return;
        const k = 6;
        const topp = Math.max(vyY0, 0) + 70, horisont = MARK_Y - 90;   // horisont = kullarnas topp
        const y0 = horisont - hojd * (horisont - topp);
        if (y0 > MARK_Y || y0 + 8 * k < vyY0) return;
        bild.forEach((rad, y) => {
            for (let x = 0; x < rad.length; x++) {
                if (rad[x] !== '.') rekt(x0 + x * k, y0 + y * k, k, k, farger[rad[x]]);
            }
        });
    }

    function ritaMane() {
        ritaHimlakropp(MANE, vyX0 + vyB - 90, maneHojd, { '#': F.mane, o: F.maneSkugga });
    }

    function ritaSol() {
        ritaHimlakropp(SOL, vyX0 + 40, solHojd, { '#': F.sol, k: F.solKant });
    }

    // Molnen ligger utspridda och glider sakta förbi (en tiondel av farten).
    const MOLN = [
        { x: 30, y: 110, b: 64 },
        { x: 200, y: 60, b: 88 },
        { x: 330, y: 170, b: 56 },
        { x: 120, y: 250, b: 48 }
    ];

    function ritaMoln() {
        const varv = vyB + 200;
        for (const m of MOLN) {
            let x = (m.x - rullat * 0.1) % varv;
            if (x < 0) x += varv;
            x += vyX0 - 100;
            const b = m.b;
            rekt(x, m.y + 8, b, 16, F.moln);
            rekt(x + b * 0.25, m.y, b * 0.5, 8, F.moln);
            rekt(x + 8, m.y + 24, b - 16, 4, F.molnSkugga);
        }
    }

    // Kullar i två lager som rullar långsammare än marken (djupkänsla).
    function ritaKullar(fart, bas, amp, frekv, farg) {
        const K = 8;                                 // kolumnbredd = en "pixel"
        const off = rullat * fart;
        const forsta = Math.floor((vyX0 + off) / K) * K;
        for (let vx = forsta; vx < vyX0 + off + vyB + K; vx += K) {
            const h = bas + amp * Math.sin(vx * frekv) + amp * 0.5 * Math.sin(vx * frekv * 2.3 + 1);
            const hh = Math.round(h / 4) * 4;
            rekt(vx - off, MARK_Y - hh, K, hh, farg);
        }
    }

    function ritaMark() {
        const botten = vyY0 + vyH;
        rekt(vyX0, MARK_Y, vyB, botten - MARK_Y, F.jord);
        rekt(vyX0, MARK_Y, vyB, 12, F.gras);
        // Grästuvor och ränder i jorden som rullar med banan
        const steg = 24;
        const off = rullat % steg;
        for (let x = vyX0 - off - steg; x < vyX0 + vyB + steg; x += steg) {
            rekt(x, MARK_Y + 12, 12, 4, F.grasKant);
            rekt(x + 12, MARK_Y + 32, 12, 4, F.jordRand);
            rekt(x, MARK_Y + 56, 12, 4, F.jordRand);
        }
    }

    // ------------------------------------------------------------------
    // Poäng i pixelsiffror (3×5)
    // ------------------------------------------------------------------

    const SIFFROR = [
        '111101101101111', '010110010010111', '111001111100111', '111001111001111',
        '101101111001001', '111100111001111', '111100111101111', '111001001001001',
        '111101111101111', '111101111001111'
    ];

    // Siffran hoppar upp en stund när man får poäng: [upp, s] per steg
    const STUDS = [[-4, 0.05], [-8, 0.07], [-4, 0.05]];
    function poangStuds() {
        let t = poangTid;
        for (const [dy, langd] of STUDS) {
            if (t < langd) return dy;
            t -= langd;
        }
        return 0;
    }

    // Poängen blinkar i guld en stund när rekordet slås.
    const REKORD_BLINK = 1.6, REKORD_GULD = '#f8d648';
    function ritaPoang(n, mittX, y, k) {
        const rekord = tillstand === 'spelar' && fig.rekordTid < REKORD_BLINK &&
            Math.floor(fig.rekordTid / 0.16) % 2 === 0;
        const farg = rekord ? REKORD_GULD : F.siffror;
        const text = String(n);
        const b = text.length * 4 * k - k;
        let x = mittX - b / 2;
        for (const c of text) {
            const monster = SIFFROR[+c];
            for (let i = 0; i < 15; i++) {
                if (monster[i] === '1') {
                    const px = x + (i % 3) * k, py = y + Math.floor(i / 3) * k;
                    rekt(px + 3, py + 3, k, k, F.sifferSkugga);
                }
            }
            for (let i = 0; i < 15; i++) {
                if (monster[i] === '1') {
                    rekt(x + (i % 3) * k, y + Math.floor(i / 3) * k, k, k, farg);
                }
            }
            x += 4 * k;
        }
    }

    // ------------------------------------------------------------------
    // Rutan med text (start och krasch)
    // ------------------------------------------------------------------

    // Texten ritas i pixeltypsnittet (typsnitt.js): skärmpixlar per pixel
    const TEXT_STOR = 4, TEXT = 2;

    function visaStartruta() {
        ruta.innerHTML =
            '<h1>' + pixeltext('Flappy keIWs', TEXT_STOR) + '</h1>' +
            '<p>' + pixeltext('Tryck för att flyga', TEXT) + '</p>' +
            (bast > 0 ? '<p class="liten">' + pixeltext('Bäst: ' + bast, TEXT) + '</p>' : '') +
            (version ? '<p class="version">' + pixeltext(version, 1) + '</p>' : '');
        ruta.classList.remove('dold', 'meny');
        menyknapp.classList.remove('dold');
        menyOppen = false;
        placeraRuta();
    }

    // ------------------------------------------------------------------
    // Menyn (kugghjulet på startskärmen): tid på dygnet och nollställ rekord
    // ------------------------------------------------------------------

    let menyOppen = false;
    let nollstallFraga = false;      // första trycket på "Nollställ rekord"

    function visaMeny() {
        const tidNamn = TIDER.find(t => t[0] === tidVal)[1];
        const rekord = nollstallFraga ? 'Säker? Tryck igen'
            : bast > 0 ? 'Nollställ rekord: ' + bast : 'Inget rekord än';
        ruta.innerHTML =
            '<h1>' + pixeltext('Meny', TEXT_STOR) + '</h1>' +
            '<div class="val" data-val="tid">' + pixeltext('Tid: ' + tidNamn, TEXT) + '</div>' +
            '<div class="val' + (nollstallFraga ? ' varning' : '') + '" data-val="rekord">' +
                pixeltext(rekord, TEXT) + '</div>' +
            '<div class="val" data-val="klar">' + pixeltext('Klar', TEXT) + '</div>';
        ruta.classList.remove('dold');
        ruta.classList.add('meny');
        menyknapp.classList.add('dold');
        menyOppen = true;
        placeraRuta();
    }

    function stangMeny() {
        nollstallFraga = false;
        visaStartruta();
    }

    // Ett tryck när menyn är öppen: på ett val, annars stängs menyn.
    function tryckIMeny(mal) {
        const val = mal && mal.closest && mal.closest('[data-val]');
        const vad = val ? val.dataset.val : 'klar';
        if (vad === 'tid') {
            const i = TIDER.findIndex(t => t[0] === tidVal);
            tidVal = TIDER[(i + 1) % TIDER.length][0];
            sparaVal(TID_NYCKEL, tidVal);
            F = fargerNu();
            solHojd = hojdNu('sol');
            maneHojd = hojdNu('mane');
            nollstallFraga = false;
            visaMeny();
        } else if (vad === 'rekord') {
            if (bast === 0) return;
            if (!nollstallFraga) { nollstallFraga = true; visaMeny(); return; }
            bast = 0;
            sparaBast(0);
            nollstallFraga = false;
            visaMeny();
        } else {
            stangMeny();
        }
    }

    function visaPausruta() {
        ruta.innerHTML =
            '<h1>' + pixeltext('Paus', TEXT_STOR) + '</h1>' +
            '<p class="liten">' + pixeltext('Poäng: ' + poang, TEXT) + '</p>' +
            '<p>' + pixeltext('Tryck för att fortsätta', TEXT) + '</p>';
        ruta.classList.remove('dold');
        placeraRuta();
        rutaVisadVid = performance.now();
    }

    // Medaljerna ritas som små pixelbilder (SVG med raka kanter).
    // m = metallen, l = blänk, d = skugga, b = bandet.
    const MEDALJ_BILD = [
        '..bb.bb..',
        '..bb.bb..',
        '...bbb...',
        '..mmmmm..',
        '.mllmmmm.',
        '.mlmmmmd.',
        '.mmmmmmd.',
        '.mmmmmdd.',
        '..mdddd..'
    ];
    const MEDALJ_FARGER = {
        brons: { m: '#c48a5c', l: '#e2b48c', d: '#9a6440' },
        silver: { m: '#bfcbd1', l: '#eef3f5', d: '#8fa0a8' },
        guld: { m: '#e3bd4f', l: '#f7e39a', d: '#b38c2c' }
    };
    const MEDALJ_NAMN = { brons: 'Brons', silver: 'Silver', guld: 'Guld' };

    // Bästa medaljen för n poäng, eller null.
    function medaljFor(n) {
        let basta = null;
        for (const [min, namn] of bana.medaljer || []) {
            if (n >= min) basta = namn;
        }
        return basta;
    }

    function medaljSvg(namn) {
        const f = Object.assign({ b: '#5f8292' }, MEDALJ_FARGER[namn]);
        let rutor = '';
        MEDALJ_BILD.forEach((rad, y) => {
            for (let x = 0; x < rad.length; x++) {
                if (rad[x] !== '.') {
                    rutor += '<rect x="' + x + '" y="' + y + '" width="1" height="1" fill="' + f[rad[x]] + '"/>';
                }
            }
        });
        return '<svg class="medalj" viewBox="0 0 9 9" shape-rendering="crispEdges">' + rutor + '</svg>';
    }

    function visaKraschruta() {
        const medalj = medaljFor(poang);
        ruta.innerHTML =
            '<p class="liten">' + pixeltext('Poäng', TEXT) + '</p>' +
            '<h1>' + pixeltext(String(poang), TEXT_STOR) + '</h1>' +
            (medalj ? '<p class="liten">' + medaljSvg(medalj) + pixeltext(MEDALJ_NAMN[medalj], TEXT) + '</p>' : '') +
            (nyttRekord ? '<p>' + pixeltext('Nytt rekord!', TEXT) + '</p>'
                        : '<p class="liten">' + pixeltext('Bäst: ' + bast, TEXT) + '</p>') +
            '<p class="liten">' + pixeltext('Tryck för att spela igen', TEXT) + '</p>';
        ruta.classList.remove('dold');
        placeraRuta();
        rutaVisadVid = performance.now();
    }

    function gomRuta() {
        ruta.classList.add('dold');
    }

    // ------------------------------------------------------------------
    // Spelets gång
    // ------------------------------------------------------------------

    function flaxa() {
        fig.v = bana.flax;
        fig.flaxTid = 0;
    }

    function borja() {
        tillstand = 'spelar';
        menyknapp.classList.add('dold');
        lageBorjade = tid;
        vaknarVid = null;
        jublaPaStart = false;
        poang = 0;
        nyttRekord = false;
        staplar = [];
        fyllPaStaplar();
        gomRuta();
        flaxa();
    }

    function krascha() {
        tillstand = 'krasch';
        lageBorjade = tid;
        landadTid = null;
        if (fig.v < 0) fig.v = 0;
        if (poang > bast) {
            bast = poang;
            nyttRekord = true;
            sparaBast(bast);
        }
    }

    function tillbakaTillStart() {
        if (laddaOmSen) { window.location.reload(); return; }
        tillstand = 'start';
        lageBorjade = tid;
        vriderTillbaka = true;
        jublaPaStart = nyttRekord;
        staplar = [];
        fig.y = START_Y;
        fig.v = 0;
        visaStartruta();
    }

    // Pausa när man byter app eller flik mitt i en runda
    function pausa() {
        if (tillstand !== 'spelar') return;
        tillstand = 'paus';
        visaPausruta();
    }

    function fortsatt() {
        tillstand = 'spelar';
        gomRuta();
        flaxa();
    }

    // Sover figuren (eller håller på att somna) på startskärmen?
    function sover() {
        const r = tillstand === 'start' && vaknarVid === null ? figurRuta() : null;
        return !!r && (r.lage === 'somnar' || r.lage === 'sover');
    }

    function tryck() {
        if (menyOppen) return;
        if (tillstand === 'start') {
            if (vaknarVid !== null) return;          // ruskar igång sig, vänta
            if (sover()) { vaknarVid = tid; return; }
            borja();
        } else if (tillstand === 'spelar') {
            flaxa();
        } else if (tillstand === 'paus') {
            if (performance.now() - rutaVisadVid > OMSTART_SPARR) fortsatt();
        } else if (tillstand === 'krasch') {
            if (!ruta.classList.contains('dold') &&
                performance.now() - rutaVisadVid > OMSTART_SPARR) {
                tillbakaTillStart();
            }
        }
    }

    function uppdatera(dt) {
        tid += dt;
        if (Math.floor(tid) !== Math.floor(tid - dt)) {                 // varje sekund
            F = fargerNu();
            solHojd = hojdNu('sol');
            maneHojd = hojdNu('mane');
        }
        if (tillstand === 'paus') return;   // allt står still
        fig.flaxTid += dt;
        poangTid += dt;
        fig.jubelTid += dt;
        fig.rekordTid += dt;

        if (tillstand === 'start') {
            // Vaknat och ruskat färdigt: flyg iväg
            if (vaknarVid !== null && (tid - vaknarVid) * 1000 >= animMs('vaknar')) borja();
            rullat += bana.fart * dt;
            // Svävar sakta (andas och vinkar gör den i figurRuta)
            fig.y = START_Y + Math.sin(tid * 1.6) * 3;
            return;
        }

        if (tillstand === 'spelar') {
            rullat += bana.fart * dt;
            fig.v = Math.min(fig.v + bana.tyngd * dt, bana.maxFall);
            fig.y += fig.v * dt;

            // Taket: överkanten av skärmen (staplarna fortsätter ändå uppåt)
            if (fig.y - FIGUR_OVER < vyY0) {
                fig.y = vyY0 + FIGUR_OVER;
                fig.v = 0;
            }

            for (const p of staplar) p.x -= bana.fart * dt;
            while (staplar.length && staplar[0].x + staplar[0].b < vyX0) staplar.shift();
            fyllPaStaplar();

            const traff = figurTraff(fig.y);
            for (const p of staplar) {
                if (!p.passerad && p.x + p.b < traff[0]) {
                    p.passerad = true;
                    poang++;
                    fig.jubelTid = 0;
                    if (poang === bast + 1) fig.rekordTid = 0;   // slog rekordet (även 0)
                    poangTid = 0;
                }
                for (const del of stapelDelar(p)) {
                    if (overlappar(traff, del)) { krascha(); return; }
                }
            }
            if (fig.y + FIGUR_UNDER >= MARK_Y) {
                fig.y = MARK_Y - FIGUR_UNDER;
                krascha();
            }
            return;
        }

        // Krasch: figuren faller ner till marken, sedan visas rutan
        if (landadTid === null) {
            fig.v = Math.min(fig.v + bana.tyngd * dt, bana.maxFall);
            fig.y += fig.v * dt;
            if (fig.y + FIGUR_UNDER >= MARK_Y) {
                fig.y = MARK_Y - FIGUR_UNDER;
                landadTid = 0;
            }
        } else {
            landadTid += dt;
            if (landadTid >= VISA_KRASCH_EFTER && ruta.classList.contains('dold')) {
                visaKraschruta();
            }
        }
    }

    function rita() {
        ritaHimmel();
        ritaStjarnor();
        ritaSol();
        ritaMane();
        ritaMoln();
        ritaKullar(0.15, 70, 16, 0.012, F.kullar);
        ritaKullar(0.3, 36, 10, 0.021, F.kullarNara);
        for (const p of staplar) ritaStapel(p);
        ritaMark();
        ritaFigur(fig.y);
        // Poängen överst, men inte bakom krasch- och pausrutan (där står den)
        if (tillstand !== 'start' && ruta.classList.contains('dold')) {
            ritaPoang(poang, VARLD_B / 2, Math.max(vyY0, 0) + 40 + poangStuds(), 8);
        }
    }

    // Fast tidssteg: fysiken räknas i lika stora steg oavsett skärmens
    // uppdateringsfrekvens, så spelet känns likadant på 60 och 120 Hz.
    let senast = null, ackumulerat = 0;
    function frame(t) {
        if (senast === null) senast = t;
        ackumulerat += Math.min((t - senast) / 1000, 0.1);
        senast = t;
        while (ackumulerat >= STEG) {
            uppdatera(STEG);
            ackumulerat -= STEG;
        }
        rita();
        requestAnimationFrame(frame);
    }

    // ------------------------------------------------------------------
    // Layout
    // ------------------------------------------------------------------

    // Spelytan fyller höjden och är högst MAX_B/VARLD_H så bred som den är
    // hög (på dator/platta blir det en stående remsa i mitten).
    function layout() {
        const fonsterB = window.innerWidth, fonsterH = window.innerHeight;
        const b = Math.min(fonsterB, Math.floor(fonsterH * MAX_B / VARLD_H));
        const h = fonsterH;
        app.style.width = b + 'px';
        app.style.height = h + 'px';
        app.style.left = Math.floor((fonsterB - b) / 2) + 'px';

        const dpr = window.devicePixelRatio || 1;
        canvas.width = Math.round(b * dpr);
        canvas.height = Math.round(h * dpr);
        canvas.style.width = b + 'px';
        canvas.style.height = h + 'px';

        s = Math.min(canvas.width / VARLD_B, canvas.height / VARLD_H);
        vyB = canvas.width / s;
        vyH = canvas.height / s;
        vyX0 = (VARLD_B - vyB) / 2;
        // Extra höjd (långa telefoner) blir mest himmel, lite mark
        vyY0 = (VARLD_H - vyH) * 0.7;
        placeraRuta();
        rita();
    }

    // Textrutan står med underkanten strax ovanför figurens högsta punkt på
    // startskärmen (Z:na när den sover, armen när den vinkar), hur många
    // rader texten än blir.
    const FIGUR_TOPP = (() => {
        let topp = 0;
        const pa_start = (figur.start || []).concat(KAN_SOVA ? ['somnar', 'sover', 'vaknar'] : [])
            .concat(figur.animationer.rekordjubel ? ['rekordjubel'] : []);
        for (const namn of pa_start) {
            for (const r of figur.animationer[namn]) {
                for (const kloss of r.rekt) topp = Math.min(topp, kloss[1]);
            }
        }
        return START_Y - 3 + (topp - figur.mitt[1]) * figur.skala;   // 3 = svävandet
    })();

    function placeraRuta() {
        const dpr = window.devicePixelRatio || 1;
        const botten = (FIGUR_TOPP - 12 - vyY0) * s / dpr;   // 12 enheter luft
        // ... men aldrig så högt att rutan går utanför skärmen (låga skärmar)
        ruta.style.top = Math.round(Math.max(botten, ruta.offsetHeight + 8)) + 'px';
    }

    let layoutVantar = false;
    function layoutSnart() {
        if (layoutVantar) return;
        layoutVantar = true;
        requestAnimationFrame(() => { layoutVantar = false; layout(); });
    }
    window.addEventListener('resize', layoutSnart);
    window.addEventListener('orientationchange', layoutSnart);

    // ------------------------------------------------------------------
    // Styrning
    // ------------------------------------------------------------------

    // Helskärm på mobil: begärs en gång vid första trycket (inte i
    // installerad app, där behövs det inte).
    const STANDALONE = window.matchMedia('(display-mode: standalone)').matches;
    let helskarmForsokt = false;
    function forsokHelskarm() {
        if (helskarmForsokt || STANDALONE) return;
        helskarmForsokt = true;
        const el = document.documentElement;
        if (!el.requestFullscreen) return;
        el.requestFullscreen({ navigationUI: 'hide' }).then(() => {
            if (screen.orientation && screen.orientation.lock) {
                screen.orientation.lock('portrait').catch(() => {});
            }
        }).catch(() => {});
    }

    window.addEventListener('pointerdown', e => {
        e.preventDefault();
        if (e.pointerType === 'touch') forsokHelskarm();
        if (menyOppen) { tryckIMeny(e.target); return; }
        if (e.target.closest && e.target.closest('#menyknapp')) {
            if (tillstand === 'start' && vaknarVid === null) visaMeny();
            return;
        }
        tryck();
    }, { passive: false });

    window.addEventListener('keydown', e => {
        if (e.repeat) return;
        if (menyOppen) {
            if (e.code === 'Escape' || e.code === 'Space' || e.code === 'Enter') {
                e.preventDefault();
                stangMeny();
            }
            return;
        }
        if (e.code === 'Space' || e.code === 'ArrowUp' || e.code === 'KeyW' || e.code === 'Enter') {
            e.preventDefault();
            tryck();
        }
    });

    document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'hidden') pausa();
    });
    window.addEventListener('pagehide', pausa);

    // Ingen zoom, ingen högerklicksmeny
    document.addEventListener('gesturestart', e => e.preventDefault());
    document.addEventListener('contextmenu', e => e.preventDefault());

    // ------------------------------------------------------------------
    // Start
    // ------------------------------------------------------------------

    // Testkrok: med ?test i adressen kan ett testskript läsa spelets läge
    if (/[?&]test\b/.test(location.search)) {
        window.spelet = {
            get tillstand() { return tillstand; },
            get poang() { return poang; },
            get menyOppen() { return menyOppen; },
            get tidVal() { return tidVal; },
            get bast() { return bast; },
            get figurLage() { const r = figurRuta(); return r ? r.lage : 'sida'; },
            get version() { return version; },
            get fig() { return fig; },
            get staplar() { return staplar; },
            get farger() { return F; },
            bana, FIGUR_X, MARK_Y
        };
    }

    layout();
    visaStartruta();
    requestAnimationFrame(frame);

    // Versionen = namnet på service workerns cache (flappy-keiws-v8 -> v8).
    // Gamla cacher tas bort när en ny version tar över, så den högsta är den
    // som körs.
    if ('caches' in window) {
        caches.keys().then(namn => {
            const nr = namn.map(n => /^flappy-keiws-v(\d+)$/.exec(n))
                .filter(Boolean).map(m => +m[1]);
            if (!nr.length) return;
            version = 'v' + Math.max(...nr);
            if (tillstand === 'start' && !menyOppen) visaStartruta();
        }).catch(() => {});
    }

    // Service worker: ny version laddas in direkt om man inte spelar,
    // annars när man kommer tillbaka till startläget.
    if ('serviceWorker' in navigator) {
        navigator.serviceWorker.register('sw.js').then(reg => {
            reg.addEventListener('updatefound', () => {
                const nw = reg.installing;
                if (!nw) return;
                nw.addEventListener('statechange', () => {
                    if (nw.state === 'installed' && navigator.serviceWorker.controller) {
                        if (tillstand === 'start') window.location.reload();
                        else laddaOmSen = true;
                    }
                });
            });
        }).catch(() => {});
    }
});
