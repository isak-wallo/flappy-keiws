"""Läser figurens export (keiws.json) och skriver figur_data.js till spelet.

Exporten har figuren som rektanglar [x0, y0, x1, y1, färg, del] för varje
läge och animationsruta, relativt kroppens övre vänstra hörn. Spelet tar
lägena där figuren vrider sig åt höger (framifrån -> från sidan), blink för
dem, animationerna där den står framifrån (idle, vinka, somnar, sover,
vaknar, rekordjubel), jublar och krockar åt höger (krock, faller, landar, yr),
och Ond (samma lägen med egna färger och arga ögon).

    python verktyg/las_figur.py SÖKVÄG/TILL/keiws.json

Kör testerna och bumpa VERSION i sw.js efteråt, som vid alla ändringar.
"""
import json
import os
import sys

ROT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
UT = os.path.join(ROT, 'figur_data.js')


def rad(r):
    return json.dumps(r, ensure_ascii=False, separators=(', ', ': '))


def lagen(lista, ind):
    return '[\n' + ',\n'.join(ind + '    [' + ', '.join(rad(r) for r in lage) + ']'
                              for lage in lista) + '\n' + ind + ']'


def animation(rutor, ind):
    return '[\n' + ',\n'.join(ind + '    { tid: %d, rekt: [%s] }' % (r['tid'], ', '.join(rad(x) for x in r['rekt']))
                              for r in rutor) + '\n' + ind + ']'


def figur(farger, l, anim, ind='    '):
    i2 = ind + '    '
    delar = [
        i2 + 'farger: ' + rad(farger),
        i2 + '// vrid[0] = framifrån ... vrid[3] = från sidan, tittar åt höger\n' +
        i2 + 'vrid: ' + lagen(l['hoger'], i2),
        i2 + 'blink: ' + lagen([l['blink_hoger'][str(i)] for i in range(4)], i2),
    ]
    for namn, rutor in anim.items():
        delar.append(i2 + namn + ': ' + animation(rutor, i2))
    return '{\n' + ',\n'.join(delar) + '\n' + ind + '}'


def main():
    if len(sys.argv) != 2:
        print(__doc__)
        sys.exit(1)
    d = json.load(open(sys.argv[1], encoding='utf-8'))
    a = d['animationer']
    # Jubel i flykten: det större flygjublet om exporten har det
    anim = {'idle': a['idle'], 'vinka': a['vinka'],
            'jubel': a.get('jubel_flyg_hoger', a['jubel_hoger'])}
    for namn in ('somnar', 'sover', 'vaknar'):     # sömnen, om exporten har den
        if namn in a:
            anim[namn] = a[namn]
    if 'jubel_fram' in a:                           # rekordjubel framifrån
        anim['rekordjubel'] = a['jubel_fram']
    for namn in ('krock', 'faller', 'landar', 'yr'):  # krocken, åt höger
        if namn + '_hoger' in a:
            anim[namn] = a[namn + '_hoger']
    keiws = figur(d['farger'], d['lagen'], anim)
    ond = figur(d['farger_ond'], d['lagen_ond'], {})
    js = ('// Figurerna som rektanglar [x0, y0, x1, y1, färg, del], relativt kroppens\n'
          '// övre vänstra hörn (x1/y1 räknas inte med). Genererad av\n'
          '// verktyg/las_figur.py från figurens export – ändra inte för hand.\n\n'
          'const FIGUR_DATA = {\n'
          '    keiws: ' + keiws + ',\n'
          '    ond: ' + ond + '\n'
          '};\n')
    open(UT, 'w', encoding='utf-8', newline='\n').write(js)
    print('Skrev', UT, '(%d tecken)' % len(js))


if __name__ == '__main__':
    main()
