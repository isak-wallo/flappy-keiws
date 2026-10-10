"""Släpper en skarp version på flappy.keiws.com.

GitHub Pages (https://isak-wallo.github.io/flappy-keiws/) är testmiljön och
uppdateras vid varje push, med VERSION i sw.js (v38-test, v39-test ...). Den skarpa
versionen på flappy.keiws.com byts bara när det här skriptet körs med
--skarpt, och får då nästa släppnummer: v1, v2 ... Varje släpp märks med en
tagg i git (slapp-1, slapp-2 ...) på den commit som släpptes.

Har inget i själva spelet ändrats (bara t.ex. texter för sökmotorer) kan man
släppa med --samma-version: då behåller den skarpa versionen sitt nummer och
taggen blir slapp-1.1, slapp-1.2 ...

Skriptet tar appens filer (ASSETS i sw.js, plus sw.js, robots.txt och
sitemap.xml för sökmotorer) från den pushade
koden, alltså samma som ligger på GitHub Pages, inte från arbetskopian. I
den släppta sw.js byts VERSION mot släppnumret, så att startrutan visar t.ex.
v1 i stället för v38-test, och installerade appar hämtar den nya versionen. Inget annat i repot
publiceras.

    python verktyg/slapp.py            # visar vad som är släppt och vad som är nytt
    python verktyg/slapp.py --skarpt   # testar och släpper nästa version
    python verktyg/slapp.py --skarpt --samma-version   # släpper om, samma nummer

Kräver Node och att man loggat in en gång med `npx wrangler login`.
"""
import os
import re
import shutil
import subprocess
import sys

ROT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
WEBB = os.path.join(ROT, 'webb')


def git(*arg):
    return subprocess.run(['git', *arg], cwd=ROT, check=True, capture_output=True,
                          text=True, encoding='utf-8').stdout.strip()


def slapp():
    """Senaste släppet: (nummer, omsläpp, tagg), eller (0, 0, None) om inget släppts.
    slapp-2 ger (2, 0, 'slapp-2'), slapp-2.1 ger (2, 1, 'slapp-2.1')."""
    alla = []
    for t in git('tag', '--list', 'slapp-*').split():
        m = re.fullmatch(r'slapp-(\d+)(?:\.(\d+))?', t)
        if m:
            alla.append((int(m[1]), int(m[2] or 0), t))
    return max(alla) if alla else (0, 0, None)


def version(ref):
    return re.search(r"const VERSION = '(v\d+(?:-test)?)'", git('show', ref + ':sw.js')).group(1)


def status():
    git('fetch', '-q', '--tags', 'origin')
    nr, _, tagg = slapp()
    print('GitHub Pages (test):', version('origin/main'))
    if not tagg:
        print('flappy.keiws.com: inget släppt än, nästa blir v1')
        return
    print('flappy.keiws.com: v%d (%s från %s)' % (nr, tagg, version(tagg)))
    nytt = git('log', '--oneline', tagg + '..origin/main')
    print('Nytt sedan dess:\n' + (nytt or '  inget'))


def bygg(nr):
    """webb/ med appens filer från origin/main och VERSION = vNR."""
    shutil.rmtree(WEBB, ignore_errors=True)
    sw = git('show', 'origin/main:sw.js')
    assets = re.findall(r"'\./([^']*)'", re.search(r'const ASSETS = \[(.*?)\];', sw, re.S).group(1))
    for fil in [f for f in assets if f] + ['sw.js', 'robots.txt', 'sitemap.xml']:
        mal = os.path.join(WEBB, fil)
        os.makedirs(os.path.dirname(mal), exist_ok=True)
        with open(mal, 'wb') as f:
            f.write(subprocess.run(['git', 'show', 'origin/main:' + fil], cwd=ROT, check=True,
                                   capture_output=True).stdout)
    with open(os.path.join(WEBB, 'sw.js'), encoding='utf-8') as f:
        text = f.read()
    with open(os.path.join(WEBB, 'sw.js'), 'w', encoding='utf-8', newline='\n') as f:
        f.write(re.sub(r"const VERSION = 'v\d+(?:-test)?'", "const VERSION = 'v%d'" % nr, text, count=1))


def skarpt():
    git('fetch', '-q', '--tags', 'origin')
    if git('rev-parse', 'HEAD') != git('rev-parse', 'origin/main') or git('status', '--porcelain', '--untracked-files=no'):
        sys.exit('Arbetskopian ska vara lika med origin/main (pusha eller hämta först).')
    nr, om, forra = slapp()
    if '--samma-version' in sys.argv:
        if not forra:
            sys.exit('Inget är släppt än, så det finns ingen version att släppa om.')
        om += 1
        print('Ändrade appfiler sedan %s (ska inte vara spelet):' % forra)
        print(git('diff', '--stat', forra, 'origin/main', '--', '*.js', '*.html', '*.css', '*.json', '*.png') or '  inga')
    else:
        nr, om = nr + 1, 0
    test = version('origin/main')
    subprocess.run([sys.executable, os.path.join(ROT, 'verktyg', 'testa.py')], cwd=ROT, check=True)
    bygg(nr)
    try:
        subprocess.run('npx -y wrangler@4 deploy', shell=True, cwd=ROT, check=True)
    finally:
        shutil.rmtree(WEBB, ignore_errors=True)
    tagg = 'slapp-%d' % nr + ('.%d' % om if om else '')
    git('tag', '-a', tagg, 'origin/main', '-m', ('Omsläpp' if om else 'Släpp') +
        ' v%d på flappy.keiws.com (test %s)' % (nr, test))
    git('push', '-q', 'origin', tagg)
    print('Släppt: v%d på https://flappy.keiws.com (%s, test %s)' % (nr, tagg, test))


if __name__ == '__main__':
    skarpt() if '--skarpt' in sys.argv else status()
