# Changing the hero photo

The share card is DERIVED from the hero, so changing the hero is two steps, not one.

```
# 1. drop the new photo in
cp <new photo> images/hero-bill.jpg

# 2. rebuild the card from it
python scripts/make-og-card.py
```

Then commit both files together and open the staging PR. **Never merge to main yourself**; a hook
enforces that and Bob does the merge.

## Everywhere Bob's face appears, and whether this covers it

| Where | File | Rebuilt by the script? |
|---|---|---|
| Site hero | `images/hero-bill.jpg` | it IS the source |
| Share card, home + merch | `images/og-card-2026.jpg` | **yes** |
| Google knowledge graph | the `image` field in index.html's JSON-LD | points at the card, so yes |
| `/live` page header | `images/championship-finale.jpg` | no, and correctly so: a specific event photo |
| Jokes & Strokes show page | `images/bob-davis-hero.png` | no, a specific past show |
| Radio one-sheet on Drive | `2-Dolla-Bill-Bob-Davis-ONESHEET.pdf` | **not affected**: it carries the cover art and the BD monogram, no photo of Bob |

Unreferenced and safe to ignore: `images/bob-davis-full.jpg`, `images/bd-mark.png` (used by the
card generator, not by any page), and `images/og-default.jpg`, the retired 10 Aug card kept only so
old cached previews still resolve.

## The two traps

**Platforms cache `og:image` by URL.** Facebook, LinkedIn and iMessage will keep serving the old
picture if the file is replaced at the same path. When the card changes materially, give it a NEW
filename and update the three references: `og:image`, `twitter:image`, and the JSON-LD `image`
field. That is why the current one is `og-card-2026.jpg` rather than a reused `og-default.jpg`.

After deploying, force a re-scrape so existing shares update:
- Facebook: developers.facebook.com/tools/debug/ then "Scrape Again"
- LinkedIn: linkedin.com/post-inspector/
- X and iMessage refresh on their own once the URL changes

**The card cannot be full-bleed with this hero.** `hero-bill.jpg` is 1104x933. Scaled to cover a
1200-wide canvas it is exactly 1200 wide, so there is no horizontal slack and the subject is pinned
centre-frame, directly under where the type has to go. The generator scales to the HEIGHT instead
and tapers the photo into the ground. A future hero that is wider than 1.91:1 could be full-bleed,
and the layout would be worth revisiting then.
