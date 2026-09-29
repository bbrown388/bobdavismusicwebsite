"""Detect the folded $2 bill in the hero photo and save its outline as a mask.

    python scripts/trace-bill.py

RUN THIS WHENEVER images/hero-bill.jpg CHANGES, BEFORE make-og-card.py. The mask is tied to one
specific photograph. A new hero silently invalidates it, and the card will light whatever happens
to sit at those coordinates instead, which is worse than having no Easter egg at all.

If a new hero has no bill in it, delete bill-mask.png; make-og-card.py just skips the effect.

WHY DETECT RATHER THAN HAND-TRACE
    The first version used four hand-picked corners. Bob: "You don't quite have the edges." He was
    right, and it only became visible once the mask was crisp: a soft glow forgives a sloppy
    outline, a hard edge advertises it. The paper's real shape has a stepped right edge where the
    strings cross it and a soft bottom corner, and no quadrilateral has either.

TWO TRAPS, both worth keeping in mind if this is ever re-tuned
    1. Otsu chose a threshold of 124, which sits BELOW the tan mortar running down frame left, so
       the bill's blob merged with the wall and the contour wandered off across the brick. The 70th
       percentile inside a tight window lands at 175, above the mortar and below the paper.
    2. Even then a mortar joint touched the paper through a bridge a few pixels tall. An opening
       severs it without eating the bill's own corners, which are far thicker.
"""
import os

import cv2
import numpy as np
from PIL import Image

HERE = os.path.dirname(os.path.abspath(__file__))
SITE = os.path.dirname(HERE)
HERO = os.path.join(SITE, 'images', 'hero-bill.jpg')
OUT = os.path.join(HERE, 'bill-mask.png')
TMP = os.environ.get('TEMP', HERE)

WIN = (950, 474, 1068, 582)   # search window in hero pixels; re-aim this for a new photo
PCT = 70                      # threshold percentile inside the window


def main():
    img = cv2.imread(HERO)
    if img is None:
        raise SystemExit(f'cannot read {HERO}')
    x0, y0, x1, y1 = WIN
    patch = img[y0:y1, x0:x1]
    gray = cv2.cvtColor(patch, cv2.COLOR_BGR2GRAY)

    t = np.percentile(gray, PCT)
    m = (gray >= t).astype(np.uint8) * 255
    m = cv2.morphologyEx(m, cv2.MORPH_CLOSE, np.ones((5, 5), np.uint8), iterations=2)
    # Sever the thin mortar bridge at frame left. See trap 2 above.
    m = cv2.morphologyEx(m, cv2.MORPH_OPEN, np.ones((7, 7), np.uint8), iterations=1)

    n, labels, stats, _ = cv2.connectedComponentsWithStats(m, 8)
    if n < 2:
        raise SystemExit('nothing bright enough found in the window')
    best = 1 + int(np.argmax(stats[1:, cv2.CC_STAT_AREA]))
    blob = (labels == best).astype(np.uint8) * 255

    # Fill the holes the strings punch through the paper.
    ff = blob.copy()
    cv2.floodFill(ff, np.zeros((blob.shape[0] + 2, blob.shape[1] + 2), np.uint8), (0, 0), 255)
    blob = blob | cv2.bitwise_not(ff)

    cnt = max(cv2.findContours(blob, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)[0],
              key=cv2.contourArea)
    bx, by, bw, bh = cv2.boundingRect(cnt)
    print(f'  threshold {t:.0f}, area {int(cv2.contourArea(cnt))} px, '
          f'bbox {bw}x{bh} at hero ({x0 + bx}, {y0 + by})')
    if bx == 0 or by == 0 or bx + bw >= gray.shape[1] or by + bh >= gray.shape[0]:
        print('  WARNING: the blob touches the window edge, so it is probably still leaking '
              'into the wall. Tighten WIN or raise PCT.')

    full = np.zeros(img.shape[:2], np.uint8)
    full[y0:y1, x0:x1] = blob
    Image.fromarray(full).save(OUT)
    print(f'  wrote {os.path.relpath(OUT, SITE)} at hero resolution '
          f'{img.shape[1]}x{img.shape[0]}')

    ov = patch.copy()
    cv2.drawContours(ov, [cnt], -1, (0, 0, 255), 1)
    ov = cv2.resize(ov, (ov.shape[1] * 6, ov.shape[0] * 6), interpolation=cv2.INTER_NEAREST)
    check = os.path.join(TMP, 'trace-bill-check.jpg')
    cv2.imwrite(check, ov, [cv2.IMWRITE_JPEG_QUALITY, 92])
    print(f'  eyeball the trace at {check} before trusting it')


if __name__ == '__main__':
    main()
