"""Regenerate the Open Graph share card from the site's current hero photo.

    python scripts/make-og-card.py

RUN THIS WHENEVER images/hero-bill.jpg CHANGES, then commit both files together.

WHY THIS SCRIPT EXISTS
    The card and the hero drifted apart. images/og-default.jpg was made on 10 Aug 2026 and showed
    a cowboy hat and a black suit jacket indoors; the hero was replaced on 28 Sep with a snapback,
    sunglasses and a guitar against brick. Anyone who saw a shared link and then opened the site
    saw two different artists. They were separate files and nothing kept them in step, so the fix
    is not a better card, it is a card that is DERIVED from the hero.

LAYOUT, and why it is this shape rather than full-bleed
    The hero is 1104x933. Scaling it to cover a 1200-wide canvas makes it exactly 1200 wide, so
    there is no horizontal slack at all and the subject is pinned centre-frame. A centred subject
    and a dark panel for type want the same pixels, so a full-bleed version cannot give both a lit
    face and readable type no matter how hard the veil is pushed.

    Scaling to the HEIGHT instead gives 745x630, which leaves real slack, so he sits left of the
    type. The edge between them is a 380px smoothstep taper that begins inside the photo, so there
    is no line anywhere showing where the picture stops and the ground starts.

    Colours and faces come from index.html rather than being chosen here: --hero-fade #0d0608,
    --gold #E5B777, and Cinzel for the display caps (vendored beside this script so the render does
    not depend on a network fetch).
"""
import os

from PIL import Image, ImageChops, ImageDraw, ImageFilter, ImageFont

HERE = os.path.dirname(os.path.abspath(__file__))
SITE = os.path.dirname(HERE)
HERO = os.path.join(SITE, 'images', 'hero-bill.jpg')
OUT = os.path.join(SITE, 'images', 'og-card-2026.jpg')

W, H = 1200, 630          # the size every platform crops from; do not change casually
BG = (0x0d, 0x06, 0x08)   # --hero-fade
GOLD = (0xE5, 0xB7, 0x77)  # --gold

PANEL = 790               # where the photo's own pixels end
TAPER = 540               # length of the gradient, reaching solid at PANEL

# ZOOM is what makes SUBJECT_X mean anything. At 1.0 the photo is scaled to the canvas height and
# is 745px wide, NARROWER than the 790px panel, so there is no horizontal slack and he is pinned to
# the left edge however the crop is set. Scaling past the panel width creates the slack that lets
# him be positioned, at the cost of cropping tighter top and bottom.
ZOOM = 1.40               # Bob's pick. Wide enough to keep the guitar in frame; tighter
                          # crops reduce the card to a man against a wall.
SUBJECT_X = 0.42          # SOLVED, not chosen: puts his face at x 300, clear of the taper.
                          # A fixed fraction cannot survive a zoom change. At 1.90 the same 0.00
                          # that works here took the leftmost 790px of a 1416px photo, which is
                          # foliage and his back, and put his face exactly where the taper goes
                          # darkest. It cut his head in half and I shipped it without looking.
SUBJECT_Y = 0.42          # matches index.html's hero background-position of 50% 42%

# THE EASTER EGG
#   There is a $2 bill folded in quarters and tucked under the strings at the nut, really there in
#   the photograph at x 972-1058, y 485-565 of the 1104x933 original. Bob put it there and spotted
#   it here: "everything else fades out but that pops up but almost looks like part of or in the
#   middle of part of the logo."
#
#   So the veil is not flat. A feathered ellipse is subtracted from it over the bill, and as the
#   photograph tapers into the ground the bill is the last thing still lit. NOTHING IS COMPOSITED.
#   The bill stays exactly where the camera found it; only the darkness around it is painted. A
#   pasted-in bill would not be an Easter egg, it would be a graphic.
#
#   IT COSTS FRAMING, and that is the whole trade. The bill sits at the photograph's right edge,
#   which is exactly where the type has to live, so it only fits inside PANEL when the crop window
#   moves right, which pushes him left. 0.85 is the measured limit: at 0.80 the bill is clipped by
#   7px. Set SUBJECT_X = 0.00 to put him just left of centre again and lose the egg.
#   IT IS MASKED TO THE BILL'S OWN OUTLINE, not to a glow. A blurred ellipse read as a lighting
#   effect rather than as a banknote. Bob: "I would want the crisp lines and corners of the bill,
#   not like a spotlight look."
#
#   The outline is DETECTED, not traced by hand: scripts/trace-bill.py thresholds the paper against
#   its surroundings and saves scripts/bill-mask.png at hero resolution. A hand-drawn quadrilateral
#   was close but wrong at the edges, which does not matter for a soft glow and matters a great deal
#   for a crisp one. The real shape has a stepped right edge where the strings cross it and a soft
#   bottom corner, and no four-sided approximation has either.
#
#   Two traps the detection had to clear, both recorded in that script: Otsu picked a threshold
#   BELOW the tan mortar, so the bill's blob merged with the wall, and even at a higher threshold a
#   mortar joint touched the paper through a bridge a few pixels tall, which an opening severs.
BILL_MASK = 'bill-mask.png'    # hero-resolution, beside this script
BILL_LIT = 1.00                # lift inside the outline. Lower it to reduce the light difference
BILL_FEATHER = 2.0             # edge softness in px. 0-2 crisp, 4-6 blended, 10+ back to a glow

TAGLINE = ('SMOKE IN THE AIR,', 'TRUTH IN THE LYRICS')


def smoothstep(t):
    t = min(1.0, max(0.0, t))
    return t * t * (3 - 2 * t)


def main():
    im = Image.open(HERO).convert('RGB')
    scale = (H / im.height) * ZOOM
    im = im.resize((round(im.width * scale), round(im.height * scale)), Image.LANCZOS)

    card = Image.new('RGB', (W, H), BG)
    left = max(0, round((im.width - PANEL) * SUBJECT_X))
    top = max(0, round((im.height - H) * SUBJECT_Y))
    card.paste(im.crop((left, top, min(im.width, left + PANEL), top + H)), (0, 0))

    ramp = Image.new('L', (W, 1))
    for x in range(W):
        ramp.putpixel((x, 0), round(255 * smoothstep((x - (PANEL - TAPER)) / TAPER)))
    veil_mask = ramp.resize((W, H), Image.BILINEAR)

    # Lift the veil over the bill so it survives the fade. Same scale and crop as the photo, so it
    # tracks automatically if ZOOM or SUBJECT_X move.
    # The mask is scaled and cropped by exactly the same numbers as the photo, so the lit region
    # stays on the bill automatically if ZOOM or SUBJECT_X ever move.
    bm = Image.open(os.path.join(HERE, BILL_MASK)).convert('L')
    bm = bm.resize((round(bm.width * scale), round(bm.height * scale)), Image.LANCZOS)
    hole = Image.new('L', (W, H), 0)
    hole.paste(bm.crop((left, top, min(bm.width, left + PANEL), top + H)), (0, 0))
    bbox = hole.getbbox()
    if bbox and bbox[2] <= PANEL:
        if BILL_LIT < 1.0:
            hole = Image.eval(hole, lambda v: round(v * BILL_LIT))
        if BILL_FEATHER:
            hole = hole.filter(ImageFilter.GaussianBlur(BILL_FEATHER))
        veil_mask = ImageChops.subtract(veil_mask, hole)
        print(f'  easter egg: bill lit at x {bbox[0]}-{bbox[2]}, y {bbox[1]}-{bbox[3]}, '
              f'feather {BILL_FEATHER}px, lift {BILL_LIT:.0%}')
    else:
        print('  easter egg SKIPPED: the bill falls outside PANEL at this framing')

    card = Image.composite(Image.new('RGB', (W, H), BG), card, veil_mask)

    d = ImageDraw.Draw(card)
    cz = os.path.join(HERE, 'Cinzel.ttf')
    f_name = ImageFont.truetype(cz, 70)
    f_tag = ImageFont.truetype(cz, 24)
    # 0.44, measured not guessed. At 70px "BOB DAVIS" is 376px wide, so 0.52 left a 9px right
    # margin. 0.44 gives 42px and, more usefully, starts the wordmark at x=782 against a PANEL
    # edge of 790: the type begins exactly where the photo's pixels end, which is the closest the
    # two can sit without the taper being incomplete underneath the letters.
    cx = round(PANEL + (W - PANEL) * 0.44)

    mark = Image.open(os.path.join(SITE, 'images', 'bd-mark.png')).convert('RGBA')
    mh = 132
    mark = mark.resize((round(mark.width * mh / mark.height), mh), Image.LANCZOS)
    card.paste(mark, (cx - mark.width // 2, 100), mark)

    d.text((cx, 310), 'BOB DAVIS', font=f_name, fill=(255, 255, 255), anchor='ma')

    # PIL has no letter-spacing, so the tagline is tracked a character at a time.
    track = 4
    for i, line in enumerate(TAGLINE):
        wpx = sum(d.textlength(c, font=f_tag) + track for c in line) - track
        x = cx - wpx / 2
        for c in line:
            d.text((x, 420 + i * 36), c, font=f_tag, fill=GOLD)
            x += d.textlength(c, font=f_tag) + track

    card.save(OUT, quality=88, optimize=True, progressive=True)
    print(f'wrote {os.path.relpath(OUT, SITE)}  {W}x{H}  {os.path.getsize(OUT) // 1024} KB')
    print('Remember: platforms cache og:image by URL. If the card changes materially,')
    print('rename it and update the meta tags, or old previews will keep serving.')


if __name__ == '__main__':
    main()
