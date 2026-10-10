"""Släpper en skarp version på flappy.keiws.com.

GitHub Pages (https://isak-wallo.github.io/flappy-keiws/) är testmiljön och
uppdateras vid varje push, med VERSION i sw.js (v38-test, v39-test ...). Den skarpa
versionen på flappy.keiws.com byts bara när det här skriptet körs med
--skarpt, och får då nästa släppnummer: v1, v2 ... Varje släpp märks med en
tagg i git (slapp-1, slapp-2 ...) på den commit som släpptes.

Skriptet tar appens filer (ASSETS i sw.js, plus sw.js) från den pushade
koden, alltså samma som ligger på GitHub Pages, inte från arbetskopian. I
den släppta sw.js byts VERSION mot släppnumret, så att startrutan visar t.ex.
v1 i stället för v38-test, och installerade appar hämtar den nya versionen. Inget annat i repot
publiceras.

    python verktyg/slapp.py            # visar vad som är släppt och vad som är nytt
    python verktyg/slapp.py --skarpt   # testar och släpper nästa version

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
    """Senaste släppet: (nummer, tagg), eller (0, None) om inget släppts."""
    nr = [int(t.split('-')[1]) for t in git('tag', '--list', 'slapp-*').split() if t.split('-')[1].isdigit()]
    return (max(nr), 'slapp-%d' % max(nr)) if nr else (0, None)


def version(ref):
    return re.search(r"const VERSION = '(v\d+(?:-test)?)'", git('show', ref + ':sw.js')).group(1)


def status():
    git('fetch', '-q', '--tags', 'origin')
    nr, tagg = slapp()
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
    for fil in [f for f in assets if f] + ['sw.js']:
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
    nr = slapp()[0] + 1
    test = version('origin/main')
    subprocess.run([sys.executable, os.path.join(ROT, 'verktyg', 'testa.py')], cwd=ROT, check=True)
    bygg(nr)
    try:
        subprocess.run('npx -y wrangler@4 deploy', shell=True, cwd=ROT, check=True)
    finally:
        shutil.rmtree(WEBB, ignore_errors=True)
    tagg = 'slapp-%d' % nr
    git('tag', '-a', tagg, 'origin/main', '-m', 'Släpp v%d på flappy.keiws.com (test %s)' % (nr, test))
    git('push', '-q', 'origin', tagg)
    print('Släppt: v%d på https://flappy.keiws.com (%s, test %s)' % (nr, tagg, test))


if __name__ == '__main__':
    skarpt() if '--skarpt' in sys.argv else status()
