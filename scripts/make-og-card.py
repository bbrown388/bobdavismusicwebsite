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
ZOOM = 1.40               # 1.0 = fit height exactly; higher crops tighter and frees him to move
SUBJECT_X = 0.85          # see THE EASTER EGG below; 0.00 frames him better but loses the bill
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
BILL = (972, 485, 1058, 565)   # original hero pixels, measured off a 3x crop
BILL_LIT = 0.82                # how much veil to lift over it; 1.0 would flatten it into a hole
BILL_GLOW = 58                 # feather radius, so it emerges rather than being cut out

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
    bx0, by0, bx1, by1 = [round(v * scale) for v in BILL]
    bx0, bx1 = bx0 - left, bx1 - left
    by0, by1 = by0 - top, by1 - top
    if bx1 <= PANEL:
        hole = Image.new('L', (W, H), 0)
        ImageDraw.Draw(hole).ellipse((bx0 - 26, by0 - 22, bx1 + 26, by1 + 22),
                                     fill=round(255 * BILL_LIT))
        hole = hole.filter(ImageFilter.GaussianBlur(BILL_GLOW))
        veil_mask = ImageChops.subtract(veil_mask, hole)
        print(f'  easter egg: bill lit at x {bx0}-{bx1}, y {by0}-{by1}')
    else:
        print(f'  easter egg SKIPPED: bill would be clipped by {bx1 - PANEL}px at this framing')

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
