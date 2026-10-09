"""Ritar app-ikonerna (icon-192.png, icon-512.png): keIWs mellan två
staplar på himlen, i samma färger som banan Ängen. Maskable: det viktiga
ligger inom de mittersta 72 %, så att runda masker inte klipper bort något.

    python verktyg/ikon.py    (kräver Pillow)
"""
import os

from PIL import Image, ImageDraw

ROT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
N = 512

HIMMEL_TOPP = (169, 211, 227)
HIMMEL_BOTTEN = (227, 241, 234)
STAPEL = (143, 186, 166)
GRAS, JORD = (156, 197, 142), (226, 212, 173)
BLA, MORK, LJUS, OGA = (86, 133, 215), (64, 101, 168), (108, 153, 228), (16, 22, 40)

# keIWs från sidan, vänd åt höger (som i figurer.js), räknat från kroppens
# hörn. Armarna (y0 52/64) lyfts när den flaxar.
KLOSSAR = [(-44, 52, -8, 88, MORK), (24, 168, 60, 204, MORK),
           (0, 0, 160, 160, BLA),
           (168, 64, 204, 100, BLA), (88, 168, 124, 204, BLA),
           (72, 25, 108, 61, OGA), (116, 25, 152, 61, OGA),
           (72, 99, 108, 135, LJUS)]
ARMAR = {52, 64}


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
    for x0, y0, x1, y1, farg in KLOSSAR:
        if y0 in ARMAR and x1 - x0 == 36 and (x0 < 0 or x0 > 160):
            y0, y1 = y0 - 24, y1 - 24
        rekt(d, ox + x0 * k, oy + y0 * k, ox + x1 * k, oy + y1 * k, farg)
    return im


def main():
    im = rita()
    im.save(os.path.join(ROT, 'icon-512.png'))
    im.resize((192, 192), Image.LANCZOS).save(os.path.join(ROT, 'icon-192.png'))


if __name__ == '__main__':
    main()
