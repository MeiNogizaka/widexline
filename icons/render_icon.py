#!/usr/bin/env python3
"""Render Widexline icons: original window chrome plus a W in the page pane."""

from __future__ import annotations

import math
import struct
import zlib
from pathlib import Path

OUTER = (21, 32, 43, 255)
SIDE = (56, 68, 77, 255)
BLUE = (29, 155, 240, 255)
PAGE = (231, 233, 234, 255)
W_COLOR = (21, 32, 43, 255)


def clamp(v: float, lo: float = 0.0, hi: float = 1.0) -> float:
    return lo if v < lo else hi if v > hi else v


def mix(a: tuple[int, ...], b: tuple[int, ...], t: float) -> tuple[int, ...]:
    t = clamp(t)
    return tuple(int(round(x + (y - x) * t)) for x, y in zip(a, b))


def sd_round_box(px: float, py: float, cx: float, cy: float, hw: float, hh: float, r: float) -> float:
    dx = abs(px - cx) - (hw - r)
    dy = abs(py - cy) - (hh - r)
    ox = max(dx, 0.0)
    oy = max(dy, 0.0)
    return math.hypot(ox, oy) + min(max(dx, dy), 0.0) - r


def coverage(sd: float) -> float:
    return clamp(0.5 - sd)


def point_in_poly(x: float, y: float, poly: list[tuple[float, float]]) -> bool:
    inside = False
    n = len(poly)
    j = n - 1
    for i in range(n):
        xi, yi = poly[i]
        xj, yj = poly[j]
        if ((yi > y) != (yj > y)) and (x < (xj - xi) * (y - yi) / ((yj - yi) or 1e-9) + xi):
            inside = not inside
        j = i
    return inside


def sd_poly(px: float, py: float, poly: list[tuple[float, float]]) -> float:
    n = len(poly)
    min_d2 = 1e9
    inside = False
    j = n - 1
    for i in range(n):
        xi, yi = poly[i]
        xj, yj = poly[j]
        ex, ey = xj - xi, yj - yi
        wx, wy = px - xi, py - yi
        t = clamp((wx * ex + wy * ey) / (ex * ex + ey * ey or 1e-9))
        dx, dy = wx - ex * t, wy - ey * t
        min_d2 = min(min_d2, dx * dx + dy * dy)
        if ((yi > py) != (yj > py)) and (px < (xj - xi) * (py - yi) / ((yj - yi) or 1e-9) + xi):
            inside = not inside
        j = i
    return math.sqrt(min_d2) * (-1.0 if inside else 1.0)


def w_polygon(x0: float, y0: float, x1: float, y1: float) -> list[tuple[float, float]]:
    def p(u: float, v: float) -> tuple[float, float]:
        return (x0 + (x1 - x0) * u, y0 + (y1 - y0) * v)

    # Bold geometric W, even-odd outline.
    return [
        p(0.06, 0.10),
        p(0.24, 0.90),
        p(0.40, 0.90),
        p(0.50, 0.38),
        p(0.60, 0.90),
        p(0.76, 0.90),
        p(0.94, 0.10),
        p(0.78, 0.10),
        p(0.68, 0.62),
        p(0.50, 0.18),
        p(0.32, 0.62),
        p(0.22, 0.10),
    ]


def render(size: int) -> list[bytearray]:
    ss = 4 if size <= 48 else 3
    n = size * ss
    buf = [bytearray(n * 4) for _ in range(n)]
    s = n / 128.0

    outer_cx, outer_cy = 64.0 * s, 64.0 * s
    outer_hw, outer_hh = 64.0 * s, 64.0 * s
    outer_r = 22.0 * s

    side_x0, side_x1 = 12.0 * s, 27.5 * s
    side_y0, side_y1 = 15.0 * s, 112.0 * s
    side_r = 5.0 * s

    page_x0, page_x1 = 36.0 * s, 115.5 * s
    page_y0, page_y1 = 12.0 * s, 115.0 * s
    page_r = 10.0 * s
    bar_h = 24.0 * s

    w_poly = w_polygon(page_x0 + 10 * s, page_y0 + bar_h + 8 * s, page_x1 - 10 * s, page_y1 - 10 * s)

    for y in range(n):
        py = y + 0.5
        row = buf[y]
        for x in range(n):
            px = x + 0.5
            pixel = (0, 0, 0, 0)

            outer = coverage(sd_round_box(px, py, outer_cx, outer_cy, outer_hw, outer_hh, outer_r))
            if outer > 0:
                pixel = mix((0, 0, 0, 0), OUTER, outer)

                side_cx = (side_x0 + side_x1) / 2
                side_cy = (side_y0 + side_y1) / 2
                side = coverage(
                    sd_round_box(px, py, side_cx, side_cy, (side_x1 - side_x0) / 2, (side_y1 - side_y0) / 2, side_r)
                )
                if side > 0:
                    pixel = mix(pixel, SIDE, side)

                page_cx = (page_x0 + page_x1) / 2
                page_cy = (page_y0 + page_y1) / 2
                page = coverage(
                    sd_round_box(
                        px, py, page_cx, page_cy, (page_x1 - page_x0) / 2, (page_y1 - page_y0) / 2, page_r
                    )
                )
                if page > 0:
                    in_bar = py < page_y0 + bar_h
                    fill = BLUE if in_bar else PAGE
                    # Soft bar edge
                    if abs(py - (page_y0 + bar_h)) < 0.8:
                        t = clamp(((page_y0 + bar_h) - py) / 1.2 + 0.5)
                        fill = mix(PAGE, BLUE, t)
                    pixel = mix(pixel, fill, page)

                    if not in_bar:
                        letter = coverage(sd_poly(px, py, w_poly))
                        if letter > 0:
                            pixel = mix(pixel, W_COLOR, letter * page)

            i = x * 4
            row[i : i + 4] = bytes(pixel)
    return downsample(buf, n, size, ss)


def downsample(buf: list[bytearray], n: int, size: int, ss: int) -> list[bytearray]:
    out = [bytearray(size * 4) for _ in range(size)]
    area = ss * ss
    for y in range(size):
        for x in range(size):
            acc = [0, 0, 0, 0]
            for dy in range(ss):
                row = buf[y * ss + dy]
                for dx in range(ss):
                    i = (x * ss + dx) * 4
                    for c in range(4):
                        acc[c] += row[i + c]
            o = x * 4
            out[y][o : o + 4] = bytes(v // area for v in acc)
    return out


def write_png(path: Path, rows: list[bytearray], size: int) -> None:
    raw = bytearray()
    for row in rows:
        raw.append(0)
        raw.extend(row)

    def chunk(tag: bytes, data: bytes) -> bytes:
        return struct.pack(">I", len(data)) + tag + data + struct.pack(">I", zlib.crc32(tag + data) & 0xFFFFFFFF)

    ihdr = struct.pack(">IIBBBBB", size, size, 8, 6, 0, 0, 0)
    path.write_bytes(
        b"\x89PNG\r\n\x1a\n"
        + chunk(b"IHDR", ihdr)
        + chunk(b"IDAT", zlib.compress(bytes(raw), 9))
        + chunk(b"IEND", b"")
    )


def main() -> None:
    dest = Path(__file__).resolve().parent
    for size in (16, 32, 48, 128):
        rows = render(size)
        out = dest / f"icon{size}.png"
        write_png(out, rows, size)
        print(f"wrote {out} ({out.stat().st_size} bytes)")


if __name__ == "__main__":
    main()
