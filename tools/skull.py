"""
Procedural spinning chrome skull -> animated GIF.

100% original: the skull is built from signed distance functions (spheres,
ellipsoids, boxes) and ray-marched with numpy. No external art is used.

    python3 tools/skull.py            # writes public/img/gfx/skull.gif + skull.png
    python3 tools/skull.py --size 160 --frames 40

Needs: python3, numpy, pillow  (pip install numpy pillow)
"""
import argparse
import math
import os

import numpy as np
from PIL import Image, ImageFilter

HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(HERE, "..", "public", "img", "gfx")


# ---------------------------------------------------------------- SDF helpers
def length(x, y, z):
    return np.sqrt(x * x + y * y + z * z)


def sd_ellipsoid(px, py, pz, cx, cy, cz, rx, ry, rz):
    x, y, z = (px - cx) / rx, (py - cy) / ry, (pz - cz) / rz
    k0 = np.sqrt(x * x + y * y + z * z)
    x2, y2, z2 = (px - cx) / (rx * rx), (py - cy) / (ry * ry), (pz - cz) / (rz * rz)
    k1 = np.sqrt(x2 * x2 + y2 * y2 + z2 * z2) + 1e-9
    return k0 * (k0 - 1.0) / k1


def sd_round_box(px, py, pz, bx, by, bz, r):
    qx, qy, qz = np.abs(px) - bx + r, np.abs(py) - by + r, np.abs(pz) - bz + r
    outside = length(np.maximum(qx, 0), np.maximum(qy, 0), np.maximum(qz, 0))
    inside = np.minimum(np.maximum(qx, np.maximum(qy, qz)), 0)
    return outside + inside - r


def smin(a, b, k):
    h = np.clip(0.5 + 0.5 * (b - a) / k, 0, 1)
    return b * (1 - h) + a * h - k * h * (1 - h)


def smax(a, b, k):  # smooth subtraction helper: max(a, -b) softly -> smax(a, -b)
    return -smin(-a, -b, k)


def teeth(px, py, pz, cy, cz, radius, half_h, spread=0.82, step=0.17):
    """A row of rounded teeth placed along an arc in the xz plane."""
    ang = np.arctan2(px, pz - cz)
    a = np.clip(np.round(ang / step) * step, -spread, spread)
    ca, sa = np.cos(-a), np.sin(-a)
    lx = px * ca + (pz - cz) * sa
    lz = -px * sa + (pz - cz) * ca
    return sd_round_box(lx, py - cy, lz - radius, 0.031, half_h, 0.05, 0.022)


def skull_sdf(px, py, pz, jaw_open=0.0):
    """Returns (distance, material). material 1 = chrome bone, 2 = glowing eye."""
    # cranium sits high and back; the face hangs below and in front of it
    d = sd_ellipsoid(px, py, pz, 0, 0.40, -0.14, 0.75, 0.70, 0.87)
    d = smin(d, sd_ellipsoid(px, py, pz, 0, 0.16, 0.30, 0.64, 0.40, 0.46), 0.14)   # frontal bone / brow
    d = smax(d, -(py + 0.36 - 0.25 * np.clip(-pz, 0, 1)), 0.08)                     # flat-ish skull base
    for s in (-1, 1):                                                              # temples
        d = smax(d, -sd_ellipsoid(px, py, pz, s * 1.06, 0.02, 0.20, 0.36, 0.36, 0.40), 0.10)
    # face: maxilla, cheekbones and the zygomatic arches running back to the ears
    d = smin(d, sd_ellipsoid(px, py, pz, 0, -0.25, 0.34, 0.40, 0.27, 0.40), 0.12)
    for s in (-1, 1):
        d = smin(d, sd_ellipsoid(px, py, pz, s * 0.47, -0.10, 0.34, 0.19, 0.14, 0.26), 0.07)
        d = smin(d, sd_ellipsoid(px, py, pz, s * 0.60, -0.14, 0.02, 0.08, 0.07, 0.34), 0.06)
        d = smin(d, sd_ellipsoid(px, py, pz, s * 0.50, -0.22, -0.16, 0.18, 0.18, 0.24), 0.10)  # temporal / ear mass
    # eye sockets: big, deep, slightly drooping at the outside
    for s in (-1, 1):
        d = smax(d, -sd_ellipsoid(px, py, pz, s * 0.27, 0.05, 0.70, 0.205, 0.195, 0.42), 0.035)
        d = smax(d, -sd_ellipsoid(px, py, pz, s * 0.36, 0.00, 0.66, 0.11, 0.12, 0.30), 0.035)
    # nasal cavity: inverted heart
    for s in (-1, 1):
        d = smax(d, -sd_ellipsoid(px, py, pz, s * 0.048, -0.22, 0.72, 0.075, 0.12, 0.30), 0.02)
    d = smax(d, -sd_ellipsoid(px, py, pz, 0, -0.31, 0.74, 0.04, 0.05, 0.28), 0.02)
    # upper teeth
    d = smin(d, teeth(px, py, pz, -0.535, 0.24, 0.40, 0.075), 0.012)

    # mandible, hinged near the ears so it can chatter
    hy, hz = -0.40, -0.18
    c, s_ = math.cos(jaw_open), math.sin(jaw_open)
    jy = (py - hy) * c - (pz - hz) * s_ + hy
    jz = (py - hy) * s_ + (pz - hz) * c + hz
    jaw = sd_ellipsoid(px, jy, jz, 0, -0.80, 0.18, 0.48, 0.18, 0.47)
    jaw = smax(jaw, -sd_ellipsoid(px, jy, jz, 0, -0.72, 0.02, 0.35, 0.34, 0.42), 0.04)
    jaw = smin(jaw, sd_ellipsoid(px, jy, jz, 0, -0.86, 0.58, 0.15, 0.09, 0.09), 0.06)  # chin
    for s in (-1, 1):
        # ramus: tilted plate from the jaw angle up to the ear
        ry_, rz_ = jy + 0.52, jz + 0.12
        ct_, st_ = math.cos(0.22), math.sin(0.22)
        jaw = smin(jaw, sd_round_box(px - s * 0.46, ry_ * ct_ - rz_ * st_, ry_ * st_ + rz_ * ct_, 0.05, 0.30, 0.12, 0.05), 0.07)
    jaw = smin(jaw, teeth(px, jy, jz, -0.672, 0.22, 0.38, 0.062), 0.012)
    d = np.minimum(d, jaw)

    # glowing eyes deep in the sockets
    eye = np.minimum(
        length(px - 0.26, py - 0.03, pz - 0.50) - 0.08,
        length(px + 0.26, py - 0.03, pz - 0.50) - 0.08,
    )
    mat = np.where(eye < d, 2, 1)
    return np.minimum(d, eye), mat


# ---------------------------------------------------------------- rendering
def env_color(rx, ry, rz):
    """Retro chrome environment: white-cyan horizon, deep-blue sky, dark floor with a hot-pink glow."""
    y = ry
    sky_t = np.clip(y, 0, 1) ** 0.55
    sky = np.stack([
        0.92 * (1 - sky_t) + 0.06 * sky_t,
        0.98 * (1 - sky_t) + 0.16 * sky_t,
        1.00 * (1 - sky_t) + 0.62 * sky_t,
    ], -1)
    band = (np.sin(y * 30.0) > 0.90) & (y > 0.10)
    sky = np.where(band[..., None], sky * 0.6, sky)
    g = np.clip(-y, 0, 1)
    pink = np.clip((g - 0.45) / 0.55, 0, 1) ** 1.5
    ground = np.stack([
        0.08 + 0.70 * pink,
        0.06 + 0.06 * pink,
        0.20 + 0.42 * pink,
    ], -1)
    return np.where((y >= 0)[..., None], sky, ground)


def render_frame(size, angle, tilt, jaw_open, ss=2):
    n = size * ss
    ys, xs = np.mgrid[0:n, 0:n]
    u = (xs + 0.5) / n * 2 - 1
    v = -((ys + 0.5) / n * 2 - 1)
    cam_z = 4.2
    fov = 0.315
    ro = np.stack([np.zeros_like(u), np.zeros_like(u) + 0.02, np.full_like(u, cam_z)], -1)
    rd = np.stack([u * fov, v * fov - 0.0, -np.ones_like(u)], -1)
    rd /= np.linalg.norm(rd, axis=-1, keepdims=True)

    # rotate the world instead of the camera: object rotation by angle (y) and tilt (x)
    ca, sa = math.cos(angle), math.sin(angle)
    ct, st = math.cos(tilt), math.sin(tilt)

    def to_obj(p):
        x, y, z = p[..., 0], p[..., 1], p[..., 2]
        # undo tilt (x axis)
        y2 = y * ct + z * st
        z2 = -y * st + z * ct
        # undo spin (y axis)
        x3 = x * ca - z2 * sa
        z3 = x * sa + z2 * ca
        return x3, y2, z3

    def to_world_dir(dx, dy, dz):
        x3 = dx * ca + dz * sa
        z2 = -dx * sa + dz * ca
        y = dy * ct - z2 * st
        z = dy * st + z2 * ct
        return x3, y, z

    flat_ro = ro.reshape(-1, 3)
    flat_rd = rd.reshape(-1, 3)
    t = np.full(flat_ro.shape[0], 2.4)
    hit = np.zeros(flat_ro.shape[0], bool)
    alive = np.ones(flat_ro.shape[0], bool)
    for _ in range(110):
        idx = np.nonzero(alive)[0]
        if idx.size == 0:
            break
        p = flat_ro[idx] + flat_rd[idx] * t[idx, None]
        d, _m = skull_sdf(*to_obj(p), jaw_open=jaw_open)
        t[idx] += d * 0.85
        done = d < 0.0015
        hit[idx[done]] = True
        far = t[idx] > 6.2
        alive[idx[done | far]] = False

    img = np.zeros((flat_ro.shape[0], 3))
    emis = np.zeros((flat_ro.shape[0], 3))
    hi = np.nonzero(hit)[0]
    p = flat_ro[hi] + flat_rd[hi] * t[hi, None]
    ox, oy, oz = to_obj(p)
    e = 0.002
    d0, mat = skull_sdf(ox, oy, oz, jaw_open)
    nx = skull_sdf(ox + e, oy, oz, jaw_open)[0] - skull_sdf(ox - e, oy, oz, jaw_open)[0]
    ny = skull_sdf(ox, oy + e, oz, jaw_open)[0] - skull_sdf(ox, oy - e, oz, jaw_open)[0]
    nz = skull_sdf(ox, oy, oz + e, jaw_open)[0] - skull_sdf(ox, oy, oz - e, jaw_open)[0]
    nl = np.sqrt(nx * nx + ny * ny + nz * nz) + 1e-9
    nx, ny, nz = nx / nl, ny / nl, nz / nl
    # ambient occlusion in object space
    ao = np.ones_like(d0)
    for i, h in enumerate((0.04, 0.09, 0.16, 0.26)):
        dd = skull_sdf(ox + nx * h, oy + ny * h, oz + nz * h, jaw_open)[0]
        ao -= (h - dd) * (1.6 / (i + 1))
    ao = np.clip(ao, 0.05, 1)
    # normals to world space
    wnx, wny, wnz = to_world_dir(nx, ny, nz)
    rdv = flat_rd[hi]
    dot = rdv[:, 0] * wnx + rdv[:, 1] * wny + rdv[:, 2] * wnz
    rx, ry, rz = rdv[:, 0] - 2 * dot * wnx, rdv[:, 1] - 2 * dot * wny, rdv[:, 2] - 2 * dot * wnz
    env = env_color(rx, ry, rz)
    key = np.array([-0.55, 0.65, 0.55]); key /= np.linalg.norm(key)
    fill = np.array([0.75, -0.15, 0.45]); fill /= np.linalg.norm(fill)
    dk = np.clip(wnx * key[0] + wny * key[1] + wnz * key[2], 0, 1)
    df = np.clip(wnx * fill[0] + wny * fill[1] + wnz * fill[2], 0, 1)
    spec = np.clip(rx * key[0] + ry * key[1] + rz * key[2], 0, 1) ** 40
    fres = (1 - np.clip(-dot, 0, 1)) ** 3
    albedo = np.array([0.86, 0.88, 0.97])
    light = dk[:, None] * np.array([0.78, 0.95, 1.0]) + df[:, None] * np.array([1.0, 0.22, 0.75]) * 0.40 + 0.09
    col = albedo * light * ao[:, None] ** 1.3 + env * 0.38 * ao[:, None]
    col += spec[:, None] * 1.1
    col += fres[:, None] * np.array([0.10, 1.00, 0.45]) * 0.45  # neon green rim
    is_eye = mat == 2
    eye_col = np.array([1.0, 0.10, 0.22])
    col[is_eye] = eye_col * 1.4
    img[hi] = col
    emis[hi[is_eye]] = eye_col

    img = img.reshape(n, n, 3)
    emis = emis.reshape(n, n, 3)
    to_img = lambda a: Image.fromarray((np.clip(a, 0, 1) * 255).astype(np.uint8))
    base = to_img(img).resize((size, size), Image.LANCZOS)
    glow = to_img(emis).resize((size, size), Image.LANCZOS).filter(ImageFilter.GaussianBlur(size / 26))
    out = np.asarray(base, dtype=np.float32) + np.asarray(glow, dtype=np.float32) * 1.6
    return Image.fromarray(np.clip(out, 0, 255).astype(np.uint8))


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--size", type=int, default=128)
    ap.add_argument("--frames", type=int, default=36)
    ap.add_argument("--ms", type=int, default=70)
    ap.add_argument("--colors", type=int, default=96)
    ap.add_argument("--out", default=OUT)
    a = ap.parse_args()
    os.makedirs(a.out, exist_ok=True)
    frames = []
    for i in range(a.frames):
        ang = i / a.frames * 2 * math.pi
        jaw = 0.07 * max(0.0, math.sin(ang * 3)) ** 2  # chatters three times per spin
        frames.append(render_frame(a.size, ang, 0.10, jaw))
        print(f"skull frame {i + 1}/{a.frames}", end="\r")
    print()
    # one shared palette for every frame keeps the GIF small and flicker-free
    strip = Image.new("RGB", (a.size, a.size * len(frames)))
    for i, f in enumerate(frames):
        strip.paste(f, (0, i * a.size))
    pal = strip.quantize(colors=a.colors, method=Image.Quantize.MEDIANCUT, dither=Image.Dither.NONE)
    q = [f.quantize(palette=pal, dither=Image.Dither.FLOYDSTEINBERG) for f in frames]
    path = os.path.join(a.out, "skull.gif")
    q[0].save(path, save_all=True, append_images=q[1:], duration=a.ms, loop=0, optimize=True, disposal=1)
    frames[0].save(os.path.join(a.out, "skull.png"), optimize=True)
    print("wrote", path, os.path.getsize(path), "bytes")


if __name__ == "__main__":
    main()
