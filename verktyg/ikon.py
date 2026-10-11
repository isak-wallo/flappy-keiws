"""Ritar app-ikonerna (icon-192.png, icon-512.png): keIWs mellan två
staplar på himlen, i samma färger som banan Ängen. Maskable: det viktiga
ligger inom de mittersta 72 %, så att runda masker inte klipper bort något.

    python verktyg/ikon.py    (kräver Pillow)
"""
import json
import os
import re

from PIL import Image, ImageDraw

ROT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
N = 512

HIMMEL_TOPP = (169, 211, 227)
HIMMEL_BOTTEN = (227, 241, 234)
STAPEL = (143, 186, 166)
GRAS, JORD = (156, 197, 142), (226, 212, 173)


def figuren():
    """keIWs från sidan, vänd åt höger (vrid[3]), och färgerna, ur
    figur_data.js (figurens export), så att ikonen följer figuren."""
    t = open(os.path.join(ROT, 'figur_data.js'), encoding='utf-8').read()
    keiws = t[t.index('keiws: {'):]
    farger = json.loads(re.search(r'farger: (\{.*?\}),', keiws).group(1))
    rader = keiws[keiws.index('vrid: ['):].splitlines()[1:5]
    vrid = [json.loads(rad.strip().rstrip(',')) for rad in rader]
    farg = {namn: tuple(int(h[i:i + 2], 16) for i in (1, 3, 5)) for namn, h in farger.items()}
    return [(x0, y0, x1, y1, farg[f], del_) for x0, y0, x1, y1, f, del_ in vrid[3]]


def rekt(d, x0, y0, x1, y1, farg):
    d.rectangle((round(x0), round(y0), round(x1) - 1, round(y1) - 1), fill=farg)


def rita():
    im = Image.new('RGB', (N, N))
    d = ImageDraw.Draw(im)
    band = 8
    for i in range(band):
        t = i / (band - 1)
        farg = tuple(round(a * (1 - t) + b * t) for a, b in zip(HIMMEL_TOPP, HIMMEL_BOTTEN))
        rekt(d, 0, i * 54, N, (i + 1) * 54, farg)
    mark = 432
    # Raka staplar till vänster och höger med en öppning i mitten
    b = 96
    for x in (-24, N - b + 24):
        rekt(d, x, 0, x + b, 140, STAPEL)
        rekt(d, x, 360, x + b, mark, STAPEL)
    rekt(d, 0, mark, N, N, JORD)
    rekt(d, 0, mark, N, mark + 20, GRAS)
    # keIWs i mitten, armarna uppe (flaxar)
    k = 1.15
    ox, oy = N / 2 - 80 * k, 250 - 102 * k
    for x0, y0, x1, y1, farg, del_ in figuren():
        if del_.endswith('arm'):
            y0, y1 = y0 - 24, y1 - 24
        rekt(d, ox + x0 * k, oy + y0 * k, ox + x1 * k, oy + y1 * k, farg)
    return im


def main():
    im = rita()
    im.save(os.path.join(ROT, 'icon-512.png'))
    im.resize((192, 192), Image.LANCZOS).save(os.path.join(ROT, 'icon-192.png'))


if __name__ == '__main__':
    main()
