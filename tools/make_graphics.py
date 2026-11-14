"""
Generates every original graphic on westonwhat.com (except the skull, see skull.py).

    python3 tools/make_graphics.py            # everything
    python3 tools/make_graphics.py buttons    # just one group: tile fire construction new
                                              # buttons icons favicon og arcade samples

All art here is drawn procedurally or pixel-by-pixel from the strings below, so it is
original and yours to reuse. Needs: python3, numpy, pillow.
"""
import math
import os
import sys

import numpy as np
from PIL import Image, ImageDraw, ImageFilter

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from pixelfont import draw_text, draw_text_centered, text_width  # noqa: E402

ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..")
IMG = os.path.join(ROOT, "public", "img")

PAL = {
    "k": (0, 0, 0), "w": (255, 255, 255), "g": (57, 255, 106), "G": (11, 122, 44),
    "c": (0, 240, 255), "b": (42, 92, 255), "B": (10, 26, 107), "p": (255, 47, 180),
    "P": (138, 15, 98), "y": (255, 210, 61), "o": (255, 138, 31), "r": (255, 51, 85),
    "s": (184, 194, 224), "S": (91, 100, 136), "v": (155, 92, 255),
}

ICONS = {
    "skull": """
................
.....ssssss.....
...sswwwwwwss...
..swwwwwwwwwws..
.swwwwwwwwwwwws.
.swwwwwwwwwwwws.
.swkkkwwwwkkkws.
.swkrkwwwwkrkws.
.swkkkwwwwkkkws.
.swwwwwkkwwwwws.
..swwwwkkwwwws..
...sswwwwwwss...
...skwkwwkwks...
...swwwwwwwws...
....ssssssss....
................""",
    "monitor": """
................
.ssssssssssssss.
.sBBBBBBBBBBBBS.
.sBgggBBBBBBBBS.
.sBBBBBBBBBBBBS.
.sBggggggBBBBBS.
.sBBBBBBBBBBBBS.
.sBgggBBBBBBBBS.
.sBBBBBBBBgBBBS.
.sSSSSSSSSSSSSS.
......sSSs......
.....ssssss.....
...ssssssssss...
...SSSSSSSSSS...
................
................""",
    "joystick": """
................
......rrrr......
.....rrwrrr.....
.....rrrrrr.....
......rrrr......
.......ss.......
.......ss.......
.......ss.......
.......ss.......
..BBBBBBBBBBBB..
.BbbbbbbbbbbbbB.
.BbppbbbbbbccbB.
.BbppbbbbbbccbB.
.BbbbbbbbbbbbbB.
..BBBBBBBBBBBB..
................""",
    "camera": """
................
................
....SSS.........
..ssssssssssss..
.ssSSSssssssyys.
.sssssBBBBsssss.
.ssssBccccBssss.
.ssssBcwccBssss.
.ssssBccccBssss.
.ssssBccccBssss.
.sssssBBBBsssss.
.SSSSSSSSSSSSSS.
................
................
................
................""",
    "notebook": """
................
...wwwwwwwwwww..
..kwwwwwwwwwww..
...wbbbbbbbbww..
..kwwwwwwwwwww..
...wbbbbbbwwww..
..kwwwwwwwwwww..
...wbbbbbbbbww..
..kwwwwwwwwwww..
...wbbbbbwwwww..
..kwwwwwwwwwww..
...wbbbbbbbwww..
..kwwwwwwwwwww..
...sssssssssss..
................
................""",
    "folder": """
................
................
................
.yyyyy..........
yoooooy.........
yyyyyyyyyyyyyyy.
yoooooooooooooy.
yoooooooooooooy.
yoooooooooooooy.
yoooooooooooooy.
yoooooooooooooy.
yoooooooooooooy.
yoooooooooooooy.
yyyyyyyyyyyyyyy.
................
................""",
    "globe": """
................
.....bbbbbb.....
...bbggbbbbbb...
..bbgggbbbggbb..
.bbbgggggbbgggb.
.bbbbgggbbbbggb.
.bbbbbggbbbbbbb.
.bbbbbbgbbbbbbb.
.bbggbbbbbggbbb.
.bgggggbbbgggbb.
.bbggggbbbbggbb.
..bbbggbbbbbbb..
...bbbgbbbbbb...
.....bbbbbb.....
................
................""",
    "note": """
................
.......pppppppp.
.......pppppppp.
.......p......p.
.......p......p.
.......p......p.
.......p......p.
.......p......p.
.......p......p.
.....ppp....ppp.
....pppp...pppp.
....pppp...pppp.
.....pp.....pp..
................
................
................""",
    "gear": """
................
.......ss.......
...s..ssss..s...
..ssssssssssss..
...ssssssssss...
...sssSSSSsss...
.sssssSkkSsssss.
.ssssSkkkkSssss.
.ssssSkkkkSssss.
.sssssSkkSsssss.
...sssSSSSsss...
...ssssssssss...
..ssssssssssss..
...s..ssss..s...
.......ss.......
................""",
    "floppy": """
................
.BBBBBBBBBBBBBB.
.BBBssssssBBBBB.
.BBBsskkssBBBBB.
.BBBsskkssBBBBB.
.BBBssssssBBBBB.
.BBBBBBBBBBBBBB.
.BBwwwwwwwwwwBB.
.BBwkkkkkkkkwBB.
.BBwwwwwwwwwwBB.
.BBwkkkkkwwwwBB.
.BBwwwwwwwwwwBB.
.BBBBBBBBBBBBBB.
................
................
................""",
    "file": """
................
...wwwwwwwss....
...wwwwwwwsss...
...wwwwwwwwwww..
...wkkkkkkkkww..
...wwwwwwwwwww..
...wkkkkkkkwww..
...wwwwwwwwwww..
...wkkkkkkkkww..
...wwwwwwwwwww..
...wkkkkkwwwww..
...wwwwwwwwwww..
...wwwwwwwwwww..
...SSSSSSSSSSS..
................
................""",
    "star": """
.......yy.......
.......yy.......
......yyyy......
......yyyy......
yyyyyyyyyyyyyyyy
.yyyyyyyyyyyyyy.
...yyyyyyyyyy...
....yyyyyyyy....
....yyyyyyyy....
...yyyyyyyyyy...
...yyyy..yyyy...
..yyy......yyy..
..yy........yy..
.yy..........yy.
................
................""",
    "warning": """
.......yy.......
......yyyy......
......ykky......
.....yykkyy.....
.....yykkyy.....
....yyykkyyy....
....yyykkyyy....
...yyyykkyyyy...
...yyyyyyyyyy...
..yyyyykkyyyyy..
..yyyyykkyyyyy..
.yyyyyyyyyyyyyy.
yyyyyyyyyyyyyyyy
................
................
................""",
    "lock": """
................
.....ssssss.....
....ss....ss....
....s......s....
....s......s....
....s......s....
..yyyyyyyyyyyy..
..yooooooooooy..
..yooookkooooy..
..yooookkooooy..
..yoooookooooy..
..yooooooooooy..
..yyyyyyyyyyyy..
................
................
................""",
}


def icon_image(name, scale=1):
    rows = [r for r in ICONS[name].strip("\n").split("\n")]
    assert len(rows) == 16 and all(len(r) == 16 for r in rows), (name, [len(r) for r in rows])
    im = Image.new("RGBA", (16, 16), (0, 0, 0, 0))
    px = im.load()
    for y, row in enumerate(rows):
        for x, ch in enumerate(row):
            if ch != ".":
                px[x, y] = PAL[ch] + (255,)
    if scale != 1:
        im = im.resize((16 * scale, 16 * scale), Image.NEAREST)
    return im


def save_gif(frames, path, ms, transparent_black=False, colors=64):
    """Quantize RGB frames to one shared palette and save a looping GIF."""
    w, h = frames[0].size
    strip = Image.new("RGB", (w, h * len(frames)))
    for i, f in enumerate(frames):
        strip.paste(f.convert("RGB"), (0, i * h))
    pal = strip.quantize(colors=colors, method=Image.Quantize.MEDIANCUT, dither=Image.Dither.NONE)
    q = [f.convert("RGB").quantize(palette=pal, dither=Image.Dither.NONE) for f in frames]
    kw = {}
    if transparent_black:
        p = pal.getpalette()[: 3 * colors]
        dists = [sum(p[i * 3: i * 3 + 3]) for i in range(len(p) // 3)]
        kw["transparency"] = int(np.argmin(dists))
    q[0].save(path, save_all=True, append_images=q[1:], duration=ms, loop=0, optimize=False, disposal=2, **kw)
    frames[0].convert("RGB").save(path[:-4] + ".png", optimize=True)


def bevel(img, light, dark, inset=0):
    d = ImageDraw.Draw(img)
    w, h = img.size
    d.line([(inset, inset), (w - 1 - inset, inset)], fill=light)
    d.line([(inset, inset), (inset, h - 1 - inset)], fill=light)
    d.line([(inset, h - 1 - inset), (w - 1 - inset, h - 1 - inset)], fill=dark)
    d.line([(w - 1 - inset, inset), (w - 1 - inset, h - 1 - inset)], fill=dark)


# ------------------------------------------------------------------ tile
def make_tile():
    t = Image.new("RGB", (64, 64), (0, 0, 0))
    d = ImageDraw.Draw(t)
    d.line([(0, 0), (63, 0)], fill=(6, 10, 34))
    d.line([(0, 0), (0, 63)], fill=(6, 10, 34))
    px = t.load()
    for (x, y, c) in [(13, 21, (28, 42, 107)), (44, 9, (20, 30, 80)), (37, 47, (60, 79, 168)), (55, 33, (20, 30, 80)),
                      (24, 57, (40, 20, 80))]:
        px[x, y] = c
    t.save(os.path.join(IMG, "gfx", "tile.png"), optimize=True)


# ------------------------------------------------------------------ fire
def make_fire():
    W, H, N = 192, 26, 20
    rng = np.random.default_rng(1999)
    seeds = rng.random((N, W))
    decays = rng.random((N, H + 2, W))
    buf = np.zeros((H + 2, W))
    frames = []
    pal = []
    for i in range(256):  # black -> deep red -> orange -> yellow -> white
        t = i / 255
        r = min(1, t * 2.4); g = min(1, max(0, t * 2.0 - 0.6)); b = max(0, t * 3 - 2.2)
        pal.append((int(r * 255), int(g * 255), int(min(1, b) * 255)))
    pal = np.array(pal, dtype=np.uint8)
    for step in range(N * 30):  # randomness repeats every N frames, so the fire settles into a perfect loop
        k = step % N
        buf[-2:] = (seeds[k] > 0.45) * 1.0
        b1, b2 = buf[1:H + 1], buf[2:H + 2]
        avg = (np.roll(b1, 1, 1) + b1 + np.roll(b1, -1, 1) + b2) / 4.0
        buf[:H] = np.clip(avg - (0.024 + 0.034 * decays[k, :H]), 0, 1)
        if step >= N * 29:
            vals = (np.clip(buf[:H] * 1.35, 0, 1) * 255).astype(np.uint8)
            frames.append(Image.fromarray(pal[vals]))
    save_gif(frames, os.path.join(IMG, "gfx", "fire.gif"), 70, transparent_black=True, colors=32)


# ------------------------------------------------------------------ under construction
def make_construction():
    W, H, N = 150, 44, 8
    frames = []
    for f in range(N):
        im = Image.new("RGB", (W, H), (0, 0, 0))
        px = im.load()
        for y in range(H):
            for x in range(W):
                if x < 5 or x >= W - 5 or y < 5 or y >= H - 5:
                    stripe = ((x + y + f * 2) // 6) % 2 == 0
                    px[x, y] = (255, 210, 61) if stripe else (0, 0, 0)
        d = ImageDraw.Draw(im)
        d.rectangle([5, 5, W - 6, H - 6], fill=(14, 10, 0))
        blink = f % 4 < 2
        ic = icon_image("warning").convert("RGB")
        if not blink:
            ic = Image.eval(ic, lambda v: v // 3)
        im.paste(ic, (11, 14), icon_image("warning"))
        draw_text(im, 34, 12, "UNDER", (255, 210, 61), shadow=(90, 50, 0))
        draw_text(im, 34, 23, "CONSTRUCTION", (255, 210, 61), shadow=(90, 50, 0))
        lamp = (255, 51, 85) if blink else (80, 10, 20)
        d.rectangle([W - 17, 13, W - 12, 18], fill=lamp)
        d.rectangle([W - 17, 25, W - 12, 30], fill=(80, 10, 20) if blink else (255, 51, 85))
        frames.append(im)
    save_gif(frames, os.path.join(IMG, "gfx", "construction.gif"), 140, colors=16)


def make_new():
    frames = []
    for f in range(2):
        im = Image.new("RGB", (27, 11), (255, 51, 85) if f == 0 else (255, 210, 61))
        draw_text(im, 2, 2, "NEW!", (255, 255, 255) if f == 0 else (0, 0, 0))
        frames.append(im)
    save_gif(frames, os.path.join(IMG, "gfx", "new.gif"), 450, colors=8)


# ------------------------------------------------------------------ 88x31 buttons
def button_base(bg, border):
    im = Image.new("RGB", (88, 31), bg)
    d = ImageDraw.Draw(im)
    d.rectangle([0, 0, 87, 30], outline=border)
    bevel(im, tuple(min(255, c + 90) for c in bg), tuple(c // 3 for c in bg), inset=1)
    return im


def make_buttons():
    out = os.path.join(IMG, "buttons")
    os.makedirs(out, exist_ok=True)

    # westonwhat.com link-back button (animated)
    frames = []
    for f in range(16):
        im = button_base((0, 0, 0), (255, 47, 180))
        sk = icon_image("skull")
        im.paste(sk.convert("RGB"), (5, 8), sk)

        def sweep(x, y, f=f):
            t = ((x - f * 6) % 64) / 64
            a = np.array([255, 47, 180]); b = np.array([0, 240, 255])
            m = 0.5 + 0.5 * math.cos(t * 2 * math.pi)
            return tuple(int(v) for v in a * m + b * (1 - m))
        draw_text(im, 25, 6, "WESTON", sweep, shadow=(40, 0, 40))
        draw_text(im, 25, 17, "WHAT.COM", (57, 255, 106) if f % 8 < 7 else (255, 255, 255))
        frames.append(im)
    save_gif(frames, os.path.join(out, "westonwhat.gif"), 90, colors=48)

    def two_line(name, bg, border, l1, c1, l2, c2, icon=None):
        im = button_base(bg, border)
        cx = None
        if icon:
            ic = icon_image(icon)
            im.paste(ic.convert("RGB"), (5, 8), ic)
            x1 = 24 + (60 - text_width(l1)) // 2
            x2 = 24 + (60 - text_width(l2)) // 2
            draw_text(im, x1, 6, l1, c1)
            draw_text(im, x2, 17, l2, c2)
        else:
            draw_text_centered(im, 6, l1, c1, cx=cx)
            draw_text_centered(im, 17, l2, c2, cx=cx)
        im.save(os.path.join(out, name + ".png"), optimize=True)

    # Y2K: big letters
    im = button_base((10, 26, 107), (0, 240, 255))
    draw_text_centered(im, 3, "Y2K", (255, 210, 61), scale=2, shadow=(0, 0, 0))
    draw_text_centered(im, 20, "COMPLIANT", (255, 255, 255))
    im.save(os.path.join(out, "y2k.png"), optimize=True)

    two_line("no-cookies", (60, 0, 18), (255, 51, 85), "NO COOKIES", (255, 255, 255), "NO TRACKING", (255, 210, 61))
    two_line("any-browser", (0, 50, 60), (0, 240, 255), "WORKS IN", (255, 255, 255), "ANY BROWSER", (0, 240, 255))
    two_line("best-at-2am", (30, 8, 60), (155, 92, 255), "BEST VIEWED", (155, 92, 255), "AT 2:00 AM", (57, 255, 106))
    two_line("zero-deps", (0, 0, 0), (57, 255, 106), "ZERO", (57, 255, 106), "DEPENDENCIES", (255, 255, 255))

    # Atom feed button with a broadcast icon
    im = button_base((70, 30, 0), (255, 138, 31))
    d = ImageDraw.Draw(im)
    d.rectangle([5, 8, 20, 23], fill=(255, 138, 31))
    d.rectangle([7, 19, 8, 20], fill=(255, 255, 255))
    for r in (5, 9):
        d.arc([7 - r, 20 - r, 7 + r, 20 + r], 270, 360, fill=(255, 255, 255), width=2)
    draw_text(im, 27, 6, "ATOM", (255, 255, 255))
    draw_text(im, 27, 17, "FEED", (255, 210, 61))
    im.save(os.path.join(out, "atom-feed.png"), optimize=True)

    # secret reward button
    frames = []
    for f in range(6):
        im = button_base((20, 0, 0), (255, 51, 85))
        draw_text_centered(im, 6, "I FOUND THE", (255, 255, 255))
        draw_text_centered(im, 17, "BASEMENT", (255, 51, 85) if f % 3 else (255, 210, 61))
        frames.append(im)
    save_gif(frames, os.path.join(out, "found-the-basement.gif"), 260, colors=16)


# ------------------------------------------------------------------ icons
def make_icons():
    out = os.path.join(IMG, "icons")
    os.makedirs(out, exist_ok=True)
    for name in ICONS:
        icon_image(name).save(os.path.join(out, name + ".png"), optimize=True)


# ------------------------------------------------------------------ favicon
def make_favicon():
    sk = icon_image("skull")
    bg = Image.new("RGBA", (16, 16), (0, 0, 0, 255))
    bg.alpha_composite(sk)
    ico = [bg.resize((s, s), Image.NEAREST) for s in (16, 32, 48)]
    ico[0].save(os.path.join(ROOT, "public", "favicon.ico"), sizes=[(16, 16), (32, 32), (48, 48)], append_images=ico[1:])
    big = Image.new("RGB", (180, 180), (0, 0, 0))
    big.paste(sk.resize((160, 160), Image.NEAREST), (10, 10), sk.resize((160, 160), Image.NEAREST))
    big.save(os.path.join(ROOT, "public", "apple-touch-icon.png"), optimize=True)
    # SVG favicon: crisp pixel rects
    rows = ICONS["skull"].strip("\n").split("\n")
    rects = ['<rect width="16" height="16" fill="#000"/>']
    for y, row in enumerate(rows):
        for x, ch in enumerate(row):
            if ch != ".":
                c = "#%02x%02x%02x" % PAL[ch]
                rects.append(f'<rect x="{x}" y="{y}" width="1" height="1" fill="{c}"/>')
    svg = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" shape-rendering="crispEdges">' + "".join(rects) + "</svg>\n"
    open(os.path.join(ROOT, "public", "favicon.svg"), "w").write(svg)


# ------------------------------------------------------------------ social preview
def make_og():
    import skull as skullmod
    W, H = 1200, 630
    im = Image.new("RGB", (W, H), (0, 0, 0))
    tile = Image.open(os.path.join(IMG, "gfx", "tile.png")).resize((128, 128), Image.NEAREST)
    for y in range(0, H, 128):
        for x in range(0, W, 128):
            im.paste(tile, (x, y))
    sk = skullmod.render_frame(400, 0.45, 0.10, 0.03, ss=2)
    mask = Image.fromarray((np.asarray(sk).max(axis=2) > 6).astype(np.uint8) * 255)
    im.paste(sk, (50, 115), mask)

    glow = Image.new("RGB", (W, H), (0, 0, 0))

    def grad(x, y):
        t = min(1, max(0, (x - 470) / 680))
        return (int(255 * (1 - t) + 0 * t), int(47 * (1 - t) + 240 * t), int(180 * (1 - t) + 255 * t))
    for layer in (glow, im):
        draw_text(layer, 478, 190, "WESTONWHAT", grad, scale=11)
        draw_text(layer, 478, 290, ".COM", grad, scale=11)
    glow = glow.filter(ImageFilter.GaussianBlur(14))
    im = Image.fromarray(np.clip(np.asarray(im, dtype=np.int32) + (np.asarray(glow, dtype=np.int32) * 0.9).astype(np.int32), 0, 255).astype(np.uint8))
    draw_text(im, 482, 400, "WESTON'S HIDEOUT AND TERMINAL", (57, 255, 106), scale=3)
    draw_text(im, 482, 440, "ONLINE SINCE 1999 (SPIRITUALLY)", (155, 92, 255), scale=3)
    # scanlines
    a = np.asarray(im).copy()
    a[::3] = (a[::3] * 0.55).astype(np.uint8)
    Image.fromarray(a).save(os.path.join(IMG, "og-image.png"), optimize=True)


# ------------------------------------------------------------------ arcade attract-mode thumbnails
def lcd_bg(W, H, cell, c1, c2):
    im = Image.new("RGB", (W, H), c1)
    d = ImageDraw.Draw(im)
    for x in range(0, W, cell):
        d.line([(x, 0), (x, H)], fill=c2)
    for y in range(0, H, cell):
        d.line([(0, y), (W, y)], fill=c2)
    return im


def make_arcade():
    out = os.path.join(IMG, "arcade")
    os.makedirs(out, exist_ok=True)
    W, H = 160, 120

    # SNAKE: a snake doing laps around a loop
    cell = 8
    path = []
    x0, y0, x1, y1 = 2, 2, 17, 12
    for x in range(x0, x1): path.append((x, y0))
    for y in range(y0, y1): path.append((x1, y))
    for x in range(x1, x0, -1): path.append((x, y1))
    for y in range(y1, y0, -1): path.append((x0, y))
    frames = []
    L = 11
    for f in range(len(path)):
        im = lcd_bg(W, H, cell, (2, 14, 6), (5, 26, 12))
        d = ImageDraw.Draw(im)
        if f % 6 < 4:
            d.rectangle([9 * cell + 1, 7 * cell + 1, 10 * cell - 2, 8 * cell - 2], fill=(255, 47, 180))
        for i in range(L):
            cx, cy = path[(f - i) % len(path)]
            col = (57, 255, 106) if i else (190, 255, 200)
            d.rectangle([cx * cell + 1, cy * cell + 1, (cx + 1) * cell - 2, (cy + 1) * cell - 2], fill=col)
        frames.append(im)
    save_gif(frames, os.path.join(out, "snake.gif"), 80, colors=16)

    # MINEFIELD: cells get revealed, then the board resets
    rng = np.random.default_rng(7)
    cols, rows, cs = 10, 7, 14
    ox, oy = (W - cols * cs) // 2, (H - rows * cs) // 2 + 2
    mines = set()
    while len(mines) < 9:
        mines.add((int(rng.integers(cols)), int(rng.integers(rows))))
    order = [(c, r) for r in range(rows) for c in range(cols) if (c, r) not in mines]
    rng.shuffle(order)
    numcol = {1: (0, 240, 255), 2: (57, 255, 106), 3: (255, 47, 180), 4: (255, 210, 61), 5: (255, 51, 85)}
    frames = []
    steps = 14
    for f in range(steps + 4):
        im = Image.new("RGB", (W, H), (0, 0, 0))
        d = ImageDraw.Draw(im)
        shown = set(order[: min(f, steps) * 4])
        for r in range(rows):
            for c in range(cols):
                x, y = ox + c * cs, oy + r * cs
                if (c, r) in shown:
                    d.rectangle([x, y, x + cs - 1, y + cs - 1], fill=(6, 12, 40), outline=(20, 34, 90))
                    n = sum((c + dx, r + dy) in mines for dx in (-1, 0, 1) for dy in (-1, 0, 1))
                    if n:
                        draw_text(im, x + 5, y + 4, str(n), numcol.get(n, (255, 255, 255)))
                else:
                    d.rectangle([x, y, x + cs - 1, y + cs - 1], fill=(42, 60, 150))
                    d.line([(x, y), (x + cs - 1, y)], fill=(110, 140, 255))
                    d.line([(x, y), (x, y + cs - 1)], fill=(110, 140, 255))
                    d.line([(x, y + cs - 1), (x + cs - 1, y + cs - 1)], fill=(10, 20, 60))
                    d.line([(x + cs - 1, y), (x + cs - 1, y + cs - 1)], fill=(10, 20, 60))
                    if f > steps and (c, r) in mines:
                        sk = icon_image("skull").resize((12, 12), Image.NEAREST)
                        im.paste(sk.convert("RGB"), (x + 1, y + 1), sk)
        frames.append(im)
    save_gif(frames, os.path.join(out, "minefield.gif"), 160, colors=32)

    # BRICKOUT: ball bouncing under a wall of bricks
    frames = []
    bx, by, vx, vy = 40.0, 80.0, 4.0, -4.0
    N = 60
    trail = []
    colors = [(255, 51, 85), (255, 138, 31), (255, 210, 61), (57, 255, 106), (0, 240, 255), (155, 92, 255)]
    for f in range(N):
        im = Image.new("RGB", (W, H), (0, 0, 0))
        d = ImageDraw.Draw(im)
        for r, col in enumerate(colors):
            for c in range(10):
                x = 2 + c * 16
                y = 10 + r * 7
                d.rectangle([x, y, x + 13, y + 4], fill=col)
                d.line([(x, y), (x + 13, y)], fill=tuple(min(255, v + 80) for v in col))
        bx += vx; by += vy
        if bx < 3 or bx > W - 4: vx = -vx
        if by < 54: vy = -vy
        if by > H - 14: vy = -vy
        px_ = int(max(0, min(W - 30, bx - 15)))
        d.rectangle([px_, H - 9, px_ + 30, H - 6], fill=(184, 194, 224))
        trail.append((bx, by))
        for i, (tx, ty) in enumerate(trail[-4:]):
            v = 40 + i * 50
            d.rectangle([tx - 1, ty - 1, tx + 1, ty + 1], fill=(v, v, v))
        d.rectangle([bx - 2, by - 2, bx + 2, by + 2], fill=(255, 255, 255))
        frames.append(im)
    save_gif(frames, os.path.join(out, "brickout.gif"), 50, colors=32)

    # empty slot: static noise + OUT OF ORDER
    frames = []
    rng = np.random.default_rng(3)
    for f in range(6):
        noise = (rng.random((H, W)) * 120).astype(np.uint8)
        im = Image.fromarray(np.stack([noise * 0.6, noise * 0.7, noise], -1).astype(np.uint8))
        d = ImageDraw.Draw(im)
        d.rectangle([28, 48, 131, 70], fill=(0, 0, 0), outline=(255, 51, 85))
        draw_text_centered(im, 56, "OUT OF ORDER", (255, 51, 85) if f % 2 == 0 else (255, 210, 61))
        frames.append(im)
    save_gif(frames, os.path.join(out, "empty-slot.gif"), 110, colors=32)


# ------------------------------------------------------------------ sample photos (placeholders)
def exif_for(date, title):
    ex = Image.Exif()
    ex[0x010F] = "westonwhat sample generator"  # Make
    ex[0x0110] = "make_graphics.py"            # Model
    ex[0x010E] = title                           # ImageDescription
    ex[0x0132] = date
    ifd = ex.get_ifd(0x8769)
    ifd[0x9003] = date                           # DateTimeOriginal
    return ex


def stamp_sample(im):
    draw_text(im, im.width - text_width("SAMPLE IMAGE") * 3 - 24, im.height - 21 - 18, "SAMPLE IMAGE", (255, 255, 255), scale=3, shadow=(0, 0, 0))


def make_samples():
    base = os.path.join(ROOT, "content", "photos")
    a1 = os.path.join(base, "sample-procedural-nights")
    a2 = os.path.join(base, "sample-test-patterns")
    os.makedirs(a1, exist_ok=True)
    os.makedirs(a2, exist_ok=True)
    W, H = 1600, 1067
    yy, xx = np.mgrid[0:H, 0:W]

    # 1. synth sunset
    sky = np.zeros((H, W, 3))
    t = yy / (H * 0.62)
    sky[..., 0] = 30 + 225 * np.clip(t, 0, 1) ** 1.6
    sky[..., 1] = 10 + 60 * np.clip(t - 0.4, 0, 1)
    sky[..., 2] = 80 + 100 * (1 - np.clip(t, 0, 1))
    cx, cy, R = W / 2, H * 0.50, 260
    dist = np.sqrt((xx - cx) ** 2 + (yy - cy) ** 2)
    sun = dist < R
    stripes = ((yy - (cy - R)) / R > 0.9) & (((yy // 14) % 3) == 0)
    sunc = np.stack([255 + 0 * yy, 210 - 170 * np.clip((yy - (cy - R)) / (2 * R), 0, 1), 60 + 0 * yy], -1)
    sky = np.where((sun & ~stripes)[..., None], sunc, sky)
    horizon = int(H * 0.62)
    floor = yy >= horizon
    sky[floor] = (8, 0, 24)
    img = Image.fromarray(np.clip(sky, 0, 255).astype(np.uint8))
    d = ImageDraw.Draw(img)
    rng = np.random.default_rng(42)
    pts = [(0, horizon)]
    for x in range(0, W + 40, 40):
        pts.append((x, horizon - int(abs(math.sin(x / 210) * 120 + rng.random() * 50))))
    pts.append((W, horizon))
    d.polygon(pts, fill=(20, 0, 50))
    for i in range(1, 26):
        z = i / 25
        y = horizon + int((H - horizon) * z ** 2.2)
        d.line([(0, y), (W, y)], fill=(255, 47, 180), width=2)
    for k in range(-24, 25):
        d.line([(W / 2 + k * 18, horizon), (W / 2 + k * 160, H)], fill=(255, 47, 180), width=2)
    stamp_sample(img)
    img.save(os.path.join(a1, "01-synth-sunset.jpg"), quality=86, exif=exif_for("2026:10:01 19:42:00", "Sample: synth sunset"))

    # 2. night city
    img = Image.new("RGB", (W, H), (2, 2, 14))
    d = ImageDraw.Draw(img)
    for _ in range(260):
        x, y = rng.integers(W), rng.integers(int(H * 0.5))
        v = int(rng.integers(60, 200))
        d.point((x, y), fill=(v, v, min(255, v + 40)))
    x = 0
    while x < W:
        bw = int(rng.integers(60, 170)); bh = int(rng.integers(200, 700))
        top = H - bh
        d.rectangle([x, top, x + bw, H], fill=(8, 8, 26))
        for wy in range(top + 14, H - 10, 18):
            for wx in range(x + 8, x + bw - 10, 14):
                if rng.random() < 0.33:
                    c = [(255, 210, 61), (0, 240, 255), (255, 47, 180), (200, 200, 255)][int(rng.integers(4))]
                    d.rectangle([wx, wy, wx + 6, wy + 9], fill=c)
        if rng.random() < 0.3:
            d.line([(x + bw // 2, top), (x + bw // 2, top - 60)], fill=(80, 80, 120), width=3)
            d.ellipse([x + bw // 2 - 5, top - 66, x + bw // 2 + 5, top - 56], fill=(255, 51, 85))
        x += bw + int(rng.integers(0, 12))
    stamp_sample(img)
    img.save(os.path.join(a1, "02-night-city.jpg"), quality=86, exif=exif_for("2026:10:03 02:13:00", "Sample: night city"))

    # 3. neon tunnel (portrait)
    PW, PH = 1067, 1600
    py_, px_ = np.mgrid[0:PH, 0:PW]
    u = (px_ - PW / 2) / (PW / 2)
    v = (py_ - PH / 2) / (PH / 2)
    m = np.maximum(np.abs(u), np.abs(v) * 0.67) + 1e-3
    depth = 1 / m
    ring = (np.sin(depth * 6.0) > 0.92)
    col = np.zeros((PH, PW, 3))
    hue = (depth * 0.15) % 1
    col[..., 0] = 255 * (0.5 + 0.5 * np.cos(2 * np.pi * (hue + 0.0)))
    col[..., 1] = 255 * (0.5 + 0.5 * np.cos(2 * np.pi * (hue + 0.33))) * 0.6
    col[..., 2] = 255 * (0.5 + 0.5 * np.cos(2 * np.pi * (hue + 0.66)))
    fade = np.clip(m * 1.4, 0, 1)[..., None]
    out = np.where(ring[..., None], col * fade, col * 0.06 * fade)
    img = Image.fromarray(out.astype(np.uint8))
    stamp_sample(img)
    img.save(os.path.join(a1, "03-neon-tunnel.jpg"), quality=86, exif=exif_for("2026:10:07 23:59:00", "Sample: neon tunnel"))

    # 4. test card
    img = Image.new("RGB", (W, H), (20, 20, 20))
    d = ImageDraw.Draw(img)
    bars = [(192, 192, 192), (192, 192, 0), (0, 192, 192), (0, 192, 0), (192, 0, 192), (192, 0, 0), (0, 0, 192)]
    bw = W // len(bars)
    for i, c in enumerate(bars):
        d.rectangle([i * bw, 0, (i + 1) * bw, int(H * 0.67)], fill=c)
    for i in range(8):
        v = int(i * 255 / 7)
        d.rectangle([i * W // 8, int(H * 0.67), (i + 1) * W // 8, int(H * 0.78)], fill=(v, v, v))
    d.rectangle([0, int(H * 0.78), W, H], fill=(8, 8, 30))
    d.ellipse([W / 2 - 300, H * 0.36 - 300, W / 2 + 300, H * 0.36 + 300], outline=(255, 255, 255), width=6)
    d.line([(W / 2, 40), (W / 2, H * 0.72)], fill=(255, 255, 255), width=3)
    d.line([(W / 2 - 360, H * 0.36), (W / 2 + 360, H * 0.36)], fill=(255, 255, 255), width=3)
    d.rectangle([W / 2 - 330, H * 0.36 - 38, W / 2 + 330, H * 0.36 + 38], fill=(0, 0, 0))
    draw_text_centered(img, int(H * 0.36) - 21, "SAMPLE IMAGE", (255, 255, 255), scale=6)
    draw_text_centered(img, int(H * 0.86), "REPLACE ME WITH A REAL PHOTO", (0, 240, 255), scale=4)
    img.save(os.path.join(a2, "01-test-card.jpg"), quality=88, exif=exif_for("2026:09:12 12:00:00", "Sample: test card"))

    # 5. plasma
    tt = 0.7
    v = (np.sin(xx / 61.0 + tt) + np.sin(yy / 47.0 - tt) + np.sin((xx + yy) / 89.0) +
         np.sin(np.sqrt((xx - W / 2) ** 2 + (yy - H / 2) ** 2) / 43.0))
    hue = (v / 8 + 0.5)
    col = np.stack([128 + 127 * np.sin(np.pi * hue * 4), 40 + 40 * np.sin(np.pi * hue * 4 + 2), 128 + 127 * np.sin(np.pi * hue * 4 + 4)], -1)
    img = Image.fromarray(col.astype(np.uint8))
    stamp_sample(img)
    img.save(os.path.join(a2, "02-plasma.jpg"), quality=86, exif=exif_for("2026:09:20 21:30:00", "Sample: plasma"))

    # 6. mandelbrot
    re = (xx - W * 0.62) / (H * 0.42)
    im_ = (yy - H / 2) / (H * 0.42)
    c = re + 1j * im_
    z = np.zeros_like(c)
    n = np.zeros(c.shape)
    alive = np.ones(c.shape, bool)
    for i in range(80):
        z[alive] = z[alive] ** 2 + c[alive]
        esc = np.abs(z) > 2
        n[alive & esc] = i
        alive &= ~esc
    t = n / 80
    col = np.stack([255 * t ** 0.5, 47 * t + 200 * t ** 3, 180 * t ** 0.3], -1)
    col[alive] = 0
    img = Image.fromarray(np.clip(col, 0, 255).astype(np.uint8))
    stamp_sample(img)
    img.save(os.path.join(a2, "03-mandelbrot.jpg"), quality=86, exif=exif_for("2026:09:28 03:03:00", "Sample: mandelbrot"))


GROUPS = {
    "tile": make_tile, "fire": make_fire, "construction": make_construction, "new": make_new,
    "buttons": make_buttons, "icons": make_icons, "favicon": make_favicon, "og": make_og,
    "arcade": make_arcade, "samples": make_samples,
}

if __name__ == "__main__":
    for d in ("gfx", "buttons", "icons", "arcade"):
        os.makedirs(os.path.join(IMG, d), exist_ok=True)
    wanted = sys.argv[1:] or list(GROUPS)
    for g in wanted:
        print("making", g)
        GROUPS[g]()
