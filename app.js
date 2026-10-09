// Flappy keIWs — flaxa mellan staplarna.
//
// Figurerna står i figurer.js och banorna i banor.js. Här finns spelet:
// loop, fysik, kollisioner, ritning och skalet (layout, helskärm, SW).

document.addEventListener('DOMContentLoaded', () => {
    const app = document.getElementById('app');
    const canvas = document.getElementById('spel');
    const ctx = canvas.getContext('2d');
    const ruta = document.getElementById('ruta');

    // --- Val (blir inställningar längre fram) ---
    const figur = FIGURER.keiws;

    // Banan följer klockan: natt från NATT_FRAN till NATT_TILL, annars ängen.
    // ?bana=natt (eller angen) i adressen väljer själv. Byts bara på
    // startskärmen (valjBana), aldrig mitt i en runda.
    const NATT_FRAN = 20, NATT_TILL = 8;
    const BANA_I_ADRESS = (/[?&]bana=(\w+)/.exec(location.search) || [])[1];
    function banaNu() {
        if (BANOR[BANA_I_ADRESS]) return BANOR[BANA_I_ADRESS];
        const h = new Date().getHours();
        return (h >= NATT_FRAN || h < NATT_TILL) ? BANOR.natt : BANOR.angen;
    }
    let bana = banaNu();
    let F = bana.farger;

    // --- Världen ---
    const VARLD_B = 360;             // världens bredd (enheter)
    const VARLD_H = 640;             // världens höjd
    const MAX_B = 400;               // högst så här bred vy (dator/platta)
    let MARK_Y = VARLD_H - bana.markHojd;
    const FIGUR_X = 100;             // figuren står still i x, banan rullar
    const START_Y = 280;             // där figuren svävar innan man börjar
    const STEG = 1 / 120;            // fast tidssteg för fysiken (s)
    const VISA_KRASCH_EFTER = 0.5;   // s efter landning innan rutan visas
    const OMSTART_SPARR = 400;       // ms innan man kan starta om efter krasch
    const BAST_NYCKEL = 'flappy-keiws-bast';

    // Skala och vy: s = skärmpixlar per världsenhet, vyX0/vyY0 = världens
    // koordinat i skärmens övre vänstra hörn.
    let s = 1, vyB = VARLD_B, vyH = VARLD_H, vyX0 = 0, vyY0 = 0;

    // --- Spelets tillstånd: 'start' -> 'spelar' -> 'krasch' -> 'start' ---
    // ('paus' när man lämnar appen mitt i en runda, tillbaka till 'spelar')
    let tillstand = 'start';
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

    // Blandar två färger '#rrggbb' (t = 0..1).
    function blanda(a, b, t) {
        const pa = parseInt(a.slice(1), 16), pb = parseInt(b.slice(1), 16);
        const kanal = sh => Math.round(((pa >> sh) & 255) * (1 - t) + ((pb >> sh) & 255) * t);
        return 'rgb(' + kanal(16) + ',' + kanal(8) + ',' + kanal(0) + ')';
    }

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

    // Skutt vid nytt rekord (bara medan man spelar), annars null.
    function rekordSkutt() {
        if (tillstand !== 'spelar' || !figur.rekord) return null;
        return stegVid(figur.rekord.skutt, fig.rekordTid);
    }

    // Hela figuren lyfts så här mycket (figurpixlar): skutt vid rekord och
    // studs när den slår i marken. Bara ritning, träffytan står kvar.
    function figurHopp() {
        if (tillstand === 'spelar') return rekordSkutt() || 0;
        if (tillstand === 'krasch' && landadTid !== null && figur.krasch) {
            return stegVid(figur.krasch.studs, landadTid) || 0;
        }
        return 0;
    }

    // Armarnas läge (figurpixlar, negativt = uppåt). Armarna flyttas i hela
    // steg om 12 px, som i animationerna.
    function armLyft() {
        if (tillstand === 'krasch') return figur.krasch ? figur.krasch.armar : -12;
        if (tillstand === 'start') { const a = andning(); return a ? a.arm : 0; }
        let lyft = 0;
        if (fig.flaxTid < 0.08) lyft = -24;
        else if (fig.flaxTid < 0.18) lyft = -12;
        else if (fig.v > 380) lyft = -12;    // faller fort: armarna upp
        if (rekordSkutt() !== null) lyft = Math.min(lyft, figur.rekord.armar);
        return Math.min(lyft, jubelLyft());  // det som är högst upp vinner
    }

    // Andningen på startskärmen: { kropp, arm, blink } för just nu, eller
    // null om figuren inte har någon andning.
    function andning() {
        const an = figur.andning;
        if (!an) return null;
        let total = 0;
        for (const r of an.rutor) total += r[2];
        let t = (tid * 1000) % total;
        for (let i = 0; i < an.rutor.length; i++) {
            const [kropp, arm, ms] = an.rutor[i];
            if (t < ms) return { kropp, arm, blink: an.blink.includes(i) };
            t -= ms;
        }
        return null;
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

    // Hur långt kroppen (med ögon och mage) har sjunkit när figuren andas.
    function kroppSank() {
        if (tillstand !== 'start') return 0;
        const a = andning();
        return a ? a.kropp : 0;
    }

    // Svävande ben sackar efter lite nedåt precis efter ett flax.
    function benSack() {
        if (tillstand !== 'spelar') return 0;
        if (fig.flaxTid < 0.1) return 8;
        if (fig.flaxTid < 0.2) return 4;
        return 0;
    }

    // Blundar ögonen? Kisar vid krasch och av glädje när den jublar,
    // blinkar i takt med andningen på startskärmen och annars ibland.
    function blundar() {
        if (tillstand === 'krasch') return true;
        if (tillstand === 'start') {
            const a = andning();
            if (a) return a.blink;
        }
        const skutt = rekordSkutt();
        if (skutt !== null && skutt <= figur.rekord.blinkUnder) return true;
        return jublar() || (tid % 3.2) < 0.12;
    }

    function ritaFigur(y) {
        const k = figur.skala, m = figur.mitt;
        const lyft = armLyft(), sack = benSack(), blund = blundar(), sank = kroppSank();
        y += figurHopp() * k;
        for (const [x0, y0, x1, y1, roll, farg] of figur.klossar) {
            let a = y0, b = y1;
            if (roll === 'arm') { a += lyft; b += lyft; }
            if (roll === 'ben') { a += sack; b += sack; }
            if (roll === 'kropp' || roll === 'oga') { a += sank; b += sank; }
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
    function stapelFarg(forra) {
        const lista = F.staplar;
        let f;
        do { f = lista[Math.floor(Math.random() * lista.length)]; }
        while (lista.length > 1 && forra && f === forra.farg);
        return f;
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
        return { x, nr, oppning, farg: stapelFarg(forra), mittY: rand(lo, hi), passerad: false };
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
            sista = nyStapel(sista.x + bana.stapelBredd + bana.avstand, sista);
            staplar.push(sista);
        }
    }

    // De två delarna av en stapel (ovanför och under öppningen) som
    // träffytor: [x0, y0, x1, y1].
    function stapelDelar(p) {
        const b = bana.stapelBredd, halv = p.oppning / 2;
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
        const b = bana.stapelBredd, halv = p.oppning / 2;
        rekt(p.x, vyY0, b, p.mittY - halv - vyY0, p.farg);
        rekt(p.x, p.mittY + halv, b, MARK_Y - (p.mittY + halv), p.farg);
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

    // Stjärnor (bara på banor med `stjarnor`): fasta platser på himlen som
    // glider väldigt sakta, några blinkar lite. Platserna räknas fram en
    // gång med en enkel slump med frö, så de ligger likadant varje gång.
    const STJARNOR = [];
    (function () {
        let fro = 7;
        const slump = () => (fro = (fro * 16807) % 2147483647) / 2147483647;
        for (let i = 0; i < 80; i++) {
            STJARNOR.push({ x: slump() * 460, y: -120 + slump() * 520, stor: slump() < 0.25, fas: slump() * 6.3 });
        }
    })();

    function ritaStjarnor() {
        if (!bana.stjarnor) return;
        const varv = vyB + 100;
        for (let i = 0; i < bana.stjarnor && i < STJARNOR.length; i++) {
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

    // Månen: en pixlig rund skiva med några kratrar ('o'), högt upp till
    // höger. Den är så långt bort att den står still.
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

    function ritaMane() {
        if (!bana.mane) return;
        const k = 6;
        const x0 = vyX0 + vyB - 90, y0 = Math.max(vyY0, 0) + 70;
        MANE.forEach((rad, y) => {
            for (let x = 0; x < rad.length; x++) {
                if (rad[x] === '.') continue;
                rekt(x0 + x * k, y0 + y * k, k, k, rad[x] === 'o' ? F.maneSkugga : F.mane);
            }
        });
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

    function ritaPoang(n, mittX, y, k) {
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
                    rekt(x + (i % 3) * k, y + Math.floor(i / 3) * k, k, k, F.siffror);
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
        ruta.classList.remove('dold');
    }

    function visaPausruta() {
        ruta.innerHTML =
            '<h1>' + pixeltext('Paus', TEXT_STOR) + '</h1>' +
            '<p class="liten">' + pixeltext('Poäng: ' + poang, TEXT) + '</p>' +
            '<p>' + pixeltext('Tryck för att fortsätta', TEXT) + '</p>';
        ruta.classList.remove('dold');
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
        poang = 0;
        nyttRekord = false;
        staplar = [];
        fyllPaStaplar();
        gomRuta();
        flaxa();
    }

    function krascha() {
        tillstand = 'krasch';
        landadTid = null;
        if (fig.v < 0) fig.v = 0;
        if (poang > bast) {
            bast = poang;
            nyttRekord = true;
            sparaBast(bast);
        }
    }

    // Byt bana om klockan säger det (bara på startskärmen)
    function valjBana() {
        const ny = banaNu();
        if (ny === bana) return;
        bana = ny;
        F = bana.farger;
        MARK_Y = VARLD_H - bana.markHojd;
    }

    function tillbakaTillStart() {
        if (laddaOmSen) { window.location.reload(); return; }
        valjBana();
        tillstand = 'start';
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

    function tryck() {
        if (tillstand === 'start') {
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
        if (tillstand === 'paus') return;   // allt står still
        fig.flaxTid += dt;
        poangTid += dt;
        fig.jubelTid += dt;
        fig.rekordTid += dt;

        if (tillstand === 'start') {
            if (Math.floor(tid / 30) !== Math.floor((tid - dt) / 30)) valjBana();   // var 30:e s
            rullat += bana.fart * dt;
            // Svävar sakta och andas (andningen ritas i ritaFigur)
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
            while (staplar.length && staplar[0].x + bana.stapelBredd < vyX0) staplar.shift();
            fyllPaStaplar();

            const traff = figurTraff(fig.y);
            for (const p of staplar) {
                if (!p.passerad && p.x + bana.stapelBredd < traff[0]) {
                    p.passerad = true;
                    poang++;
                    fig.jubelTid = 0;
                    if (bast > 0 && poang === bast + 1) fig.rekordTid = 0;   // slog rekordet
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
        ritaMane();
        ritaMoln();
        ritaKullar(0.15, 70, 16, 0.012, F.kullar);
        ritaKullar(0.3, 36, 10, 0.021, F.kullarNara);
        for (const p of staplar) ritaStapel(p);
        ritaMark();
        ritaFigur(fig.y);
        if (tillstand !== 'start') {
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
        rita();
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
        tryck();
    }, { passive: false });

    window.addEventListener('keydown', e => {
        if (e.repeat) return;
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
            get version() { return version; },
            get fig() { return fig; },
            get staplar() { return staplar; },
            get bana() { return bana; },
            get MARK_Y() { return MARK_Y; },
            FIGUR_X
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
            if (tillstand === 'start') visaStartruta();
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
