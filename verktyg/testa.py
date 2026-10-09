"""Testar spelet i en riktig webbläsare (headless Chrome via Playwright).

Startar en egen lokal webbserver för repot, öppnar spelet med ?test (då
finns window.spelet att läsa) och kontrollerar att:

  - inga JavaScript-fel uppstår,
  - startrutan visas och figuren vinkar,
  - en bot som läser spelets läge klarar sig förbi några staplar
    (banan går att spela, poängen räknas, staplarna är olika breda) och
    figuren jublar när rekordet slås,
  - spelet pausar när man lämnar sidan och fortsätter efter ett tryck,
  - versionen (cachens namn) syns i startrutan,
  - figuren kraschar när boten slutar flaxa (smäll, landar, blir yr),
    kraschrutan visas och
    man kommer tillbaka till start,
  - nattbanan fungerar och klockan styr färgerna (dag, skymning, natt,
    gryning),
  - figuren somnar på startskärmen, vaknar och ruskar på sig vid ett tryck
    och flyger sedan iväg av sig själv,
  - sidan också går att öppna i datorformat (bred skärm).

    python verktyg/testa.py                 # ca 30 s, skriver OK/FEL
    python verktyg/testa.py --sekunder 60   # låt boten spela längre
    python verktyg/testa.py --bilder ut     # spara skärmbilder i mappen ut/
    python verktyg/testa.py --visa          # kör med synligt webbläsarfönster

Kräver Playwright för Python (pip install playwright). Chrome används om det
finns installerat, annars Playwrights egen Chromium (playwright install
chromium). Avslutas med kod 0 om allt gick bra, annars 1.
"""
import argparse
import functools
import http.server
import os
import sys
import threading
import time

from playwright.sync_api import sync_playwright

ROT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
MIN_POANG = 3          # så många staplar ska boten minst klara

# Boten: flaxar när figuren är under öppningens mitt och på väg nedåt.
# window.botPa = false får den att sluta (för att testa krasch).
BOT = r"""
() => {
  const S = window.spelet;
  window.botPa = true;
  window.botFlax = 0;
  const loop = () => {
    if (window.botPa && S.tillstand === 'spelar') {
      const b = S.bana;
      const p = S.staplar.find(p => p.x + p.b > S.FIGUR_X - 30);
      const mal = p ? p.mittY + 15 : 300;
      if (S.fig.y > mal && S.fig.v > 0) {
        window.dispatchEvent(new PointerEvent('pointerdown', { pointerType: 'mouse', bubbles: true }));
        window.botFlax++;
      }
    }
    requestAnimationFrame(loop);
  };
  loop();
}
"""

# Låtsas att sidan göms eller visas igen (som när man byter app)
DOLJ = r"""() => {
  Object.defineProperty(document, 'visibilityState', { value: 'hidden', configurable: true });
  document.dispatchEvent(new Event('visibilitychange'));
}"""
VISA = r"""() => {
  delete document.visibilityState;
  document.dispatchEvent(new Event('visibilitychange'));
}"""


class TystHandler(http.server.SimpleHTTPRequestHandler):
    def log_message(self, *args):
        pass


def starta_server():
    handler = functools.partial(TystHandler, directory=ROT)
    server = http.server.ThreadingHTTPServer(('127.0.0.1', 0), handler)
    threading.Thread(target=server.serve_forever, daemon=True).start()
    return server, 'http://127.0.0.1:%d/' % server.server_address[1]


def starta_webblasare(p, visa):
    try:
        return p.chromium.launch(channel='chrome', headless=not visa)
    except Exception:
        return p.chromium.launch(headless=not visa)


def main():
    arg = argparse.ArgumentParser(description='Testar Flappy keIWs i headless Chrome.')
    arg.add_argument('--sekunder', type=int, default=20, help='hur länge boten spelar (s)')
    arg.add_argument('--bilder', help='mapp att spara skärmbilder i')
    arg.add_argument('--visa', action='store_true', help='visa webbläsarfönstret')
    a = arg.parse_args()

    fel = []
    def kolla(villkor, text):
        print(('  OK   ' if villkor else '  FEL  ') + text)
        if not villkor:
            fel.append(text)

    def bild(sida, namn):
        if a.bilder:
            os.makedirs(a.bilder, exist_ok=True)
            sida.screenshot(path=os.path.join(a.bilder, namn))

    server, url = starta_server()
    print('Testar', url)
    with sync_playwright() as p:
        b = starta_webblasare(p, a.visa)

        # --- Mobil, stående ---
        sida = b.new_page(viewport={'width': 390, 'height': 844}, device_scale_factor=3,
                          has_touch=True, is_mobile=True)
        jsfel = []
        sida.on('pageerror', lambda e: jsfel.append(str(e)))
        sida.on('console', lambda m: jsfel.append(m.text) if m.type == 'error' else None)
        # Gammalt rekord 2, så att boten slår det och figuren jublar
        sida.add_init_script("localStorage.setItem('flappy-keiws-bast', '2')")
        sida.goto(url + '?test')
        sida.wait_for_function('window.spelet !== undefined', timeout=5000)
        sida.evaluate("""window.sagJubel = false; window.bredder = {}; window.lagen = {};
            (function kolla() {
            window.lagen[spelet.figurLage] = true;
            if (spelet.figurLage === 'jubel') window.sagJubel = true;
            for (const p of spelet.staplar) window.bredder[p.b] = true;
            requestAnimationFrame(kolla); })()""")
        time.sleep(0.5)
        kolla(sida.evaluate('spelet.tillstand') == 'start', 'spelet börjar i startläget')
        kolla(sida.is_visible('#ruta'), 'startrutan visas')
        bild(sida, '1-start.png')
        try:
            sida.wait_for_function("spelet.figurLage === 'vinka'", timeout=8000)
            vinkar = True
        except Exception:
            vinkar = False
        kolla(vinkar, 'figuren vinkar på startskärmen')
        bild(sida, '1a-vinkar.png')

        sida.evaluate(BOT)
        sida.keyboard.press('Space')
        time.sleep(0.3)
        kolla(sida.evaluate('spelet.tillstand') == 'spelar' and sida.evaluate('spelet.figurLage') == 'sida',
              'ett tryck startar spelet, figuren har vridit sig åt sidan')

        # Paus: låtsas att sidan göms (byter app), figuren ska stå still
        sida.evaluate(DOLJ)
        time.sleep(0.1)
        y1 = sida.evaluate('spelet.fig.y')
        time.sleep(0.5)
        y2 = sida.evaluate('spelet.fig.y')
        kolla(sida.evaluate('spelet.tillstand') == 'paus' and y1 == y2
              and 'Paus' in sida.inner_text('#ruta'),
              'spelet pausar när sidan göms och figuren står still')
        bild(sida, '1b-paus.png')
        sida.evaluate(VISA)
        sida.keyboard.press('Space')
        time.sleep(0.2)
        kolla(sida.evaluate('spelet.tillstand') == 'spelar' and not sida.is_visible('#ruta'),
              'ett tryck efter paus fortsätter spelet')
        slut = time.time() + a.sekunder
        while time.time() < slut and sida.evaluate('spelet.tillstand') == 'spelar':
            time.sleep(0.5)
        poang = sida.evaluate('spelet.poang')
        tillstand = sida.evaluate('spelet.tillstand')
        bild(sida, '2-spelar.png')
        kolla(poang >= MIN_POANG, 'boten klarade %d staplar på %d s (minst %d), %s'
              % (poang, a.sekunder, MIN_POANG,
                 'kraschade inte' if tillstand == 'spelar' else 'kraschade sen'))
        if poang >= 3:
            kolla(sida.evaluate('window.sagJubel'), 'figuren jublar när rekordet slås')
        bredder = sida.evaluate('Object.keys(window.bredder).map(Number).sort((a, b) => a - b)')
        kolla(len(bredder) >= 2, 'staplarna är olika breda (%s)' % ', '.join(map(str, bredder)))

        # Sluta flaxa -> krasch -> kraschruta -> tillbaka till start
        sida.evaluate('window.botPa = false')
        if sida.evaluate('spelet.tillstand') == 'start':
            sida.keyboard.press('Space')
        try:
            sida.wait_for_function("spelet.tillstand === 'krasch'", timeout=8000)
            sida.wait_for_selector('#ruta:not(.dold)', timeout=5000)
            kraschad = True
        except Exception:
            kraschad = False
        kolla(kraschad, 'figuren kraschar utan flax och kraschrutan visas')
        if kraschad:
            text = sida.inner_text('#ruta')
            sida.wait_for_function("spelet.figurLage === 'yr'", timeout=3000)
            lagen = sida.evaluate('window.lagen')
            kolla(all(l in lagen for l in ('krock', 'landar', 'yr')),
                  'figuren krockar, studsar mot marken och blir yr')
            kolla('Poäng' in text, 'kraschrutan visar poängen')
            if poang >= 10:
                kolla(sida.is_visible('#ruta svg.medalj')
                      and any(m in text for m in ('Brons', 'Silver', 'Guld')),
                      'kraschrutan visar en medalj (%d poäng)' % sida.evaluate('spelet.poang'))
            bild(sida, '3-krasch.png')
            time.sleep(0.6)                                  # spärren mot för snabb omstart
            sida.keyboard.press('Space')
            time.sleep(0.2)
            kolla(sida.evaluate('spelet.tillstand') == 'start', 'tryck efter krasch går tillbaka till start')

        # Version: andra laddningen har en cache, då står versionen i startrutan
        sida.reload()
        sida.wait_for_function('window.spelet && spelet.version !== ""', timeout=5000)
        v = sida.evaluate('spelet.version')
        kolla(v in sida.inner_text('#ruta'), 'versionen (%s) syns i startrutan' % v)
        bild(sida, '5-version.png')

        kolla(not jsfel, 'inga JavaScript-fel' + (': ' + ' | '.join(jsfel) if jsfel else ''))

        # --- Natten (vald i adressen) och dygnet (klockan styr färgerna) ---
        natt = b.new_page(viewport={'width': 390, 'height': 844}, device_scale_factor=2)
        nattfel = []
        natt.on('pageerror', lambda e: nattfel.append(str(e)))
        natt.goto(url + '?test&bana=natt')
        natt.wait_for_function('window.spelet !== undefined', timeout=5000)
        kolla(natt.evaluate('spelet.bana.namn') == 'Natten', 'nattbanan går att välja (?bana=natt)')
        himmel = {}
        for klocka in ('12', '19.5', '23', '7'):
            natt.goto(url + '?test&klocka=' + klocka)
            natt.wait_for_function('window.spelet !== undefined', timeout=5000)
            natt.keyboard.press('Space')
            time.sleep(1.2)
            himmel[klocka] = natt.evaluate('spelet.farger.himmelTopp')
            bild(natt, '6-klocka-%s.png' % klocka)
        dag = sida.evaluate('spelet.bana.paletter.dag.himmelTopp')
        nattF = sida.evaluate('spelet.bana.paletter.natt.himmelTopp')
        kolla(himmel['12'] == dag and himmel['23'] == nattF
              and himmel['19.5'] not in (dag, nattF) and himmel['7'] not in (dag, nattF),
              'klockan styr färgerna (dag 12, skymning 19.30, natt 23, gryning 7)')
        kolla(not nattfel, 'inga JavaScript-fel på natten' + (': ' + ' | '.join(nattfel) if nattfel else ''))

        # --- Somnar och vaknar (?somna=1: somnar efter 1 s i stället för 25) ---
        sov = b.new_page(viewport={'width': 390, 'height': 844}, device_scale_factor=2)
        sovfel = []
        sov.on('pageerror', lambda e: sovfel.append(str(e)))
        sov.goto(url + '?test&somna=1')
        sov.wait_for_function('window.spelet !== undefined', timeout=5000)
        try:
            sov.wait_for_function("spelet.figurLage === 'sover'", timeout=15000)
            sover = True
        except Exception:
            sover = False
        kolla(sover, 'figuren somnar på startskärmen')
        bild(sov, '7-sover.png')
        sov.keyboard.press('Space')
        time.sleep(0.1)
        kolla(sov.evaluate('spelet.figurLage') == 'vaknar' and sov.evaluate('spelet.tillstand') == 'start',
              'ett tryck väcker figuren, den ruskar på sig innan den flyger')
        sov.keyboard.press('Space')                   # räknas inte under ruskningen
        bild(sov, '7a-vaknar.png')
        time.sleep(0.8)
        kolla(sov.evaluate('spelet.tillstand') == 'spelar', 'efter ruskningen flyger den iväg av sig själv')
        kolla(not sovfel, 'inga JavaScript-fel när den sover' + (': ' + ' | '.join(sovfel) if sovfel else ''))

        # --- Dator, bred skärm ---
        dator = b.new_page(viewport={'width': 1280, 'height': 800})
        datorfel = []
        dator.on('pageerror', lambda e: datorfel.append(str(e)))
        dator.goto(url)
        time.sleep(0.8)
        bredd = dator.evaluate("document.getElementById('app').getBoundingClientRect().width")
        kolla(bredd <= 800 * 400 / 640 + 1, 'på dator blir spelytan en stående remsa (%d px bred)' % bredd)
        kolla(not datorfel, 'inga JavaScript-fel på dator')
        bild(dator, '4-dator.png')

        b.close()
    server.shutdown()

    print()
    if fel:
        print('FEL: %d av testerna gick inte igenom.' % len(fel))
        sys.exit(1)
    print('Allt OK.')


if __name__ == '__main__':
    main()
