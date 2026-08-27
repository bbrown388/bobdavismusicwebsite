"""Generate per-platform redirect pages under /listen/2dollabill/<platform>/.

WHY THESE EXIST
Radio label copy goes onto pages that PERSIST and are NOT editable after submission. CD Tex
keeps a delivery page in its repertoire indefinitely. So any bare platform URL put on those
forms is frozen forever, and at submission time some of those URLs do not exist yet: Spotify
assigns no public album url until release, and Amazon had not ingested as of 27 Aug.

A redirect Bob owns solves both halves. It can be submitted TODAY pointing at HyperFollow,
then repointed at the real platform url the moment it exists, with no vendor involved. It also
records the click in this site's Analytics before handing off, which a raw distrokid.com
HyperFollow link never can.

TO REPOINT A LINK: change DEST in the PLATFORMS table below and re-run this script. Nothing
else needs touching.

    python tools/make-listen-redirects.py
"""

import io, os

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
SONG = "2 Dolla Bill"
SLUG = "2dollabill"
HYPERFOLLOW = "https://distrokid.com/hyperfollow/bobdavis1/2-dolla-bill/"
APPLE = "https://music.apple.com/us/album/2-dolla-bill-single/6799347250"

# platform key -> (label, DEST, note about when to change it)
PLATFORMS = {
    "spotify": (
        "Spotify", HYPERFOLLOW,
        "PENDING. Spotify assigns no public album url before release. HyperFollow serves the "
        "pre-save now and flips to real links at release, so this is correct in both periods. "
        "REPOINT to the open.spotify.com album url once it exists, after 2 Oct 2026."),
    "apple": (
        "Apple Music", APPLE,
        "LIVE. Direct url, verified 26 Aug. Album id 6799347250. Deliberately NOT the "
        "HyperFollow url carrying DistroKid's affiliate token at=1001lry3."),
    "itunes": (
        "iTunes", APPLE + "?app=itunes",
        "LIVE. Apple folded the iTunes Store into Apple Music; ?app=itunes is how DistroKid "
        "itself distinguishes them."),
    "amazon": (
        "Amazon Music", HYPERFOLLOW,
        "PENDING. Amazon IS a selected store but had not ingested as of 27 Aug; Amazon "
        "typically exposes a catalogue page at release rather than during preorder. REPOINT "
        "once it appears."),
}

TEMPLATE = """<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>__SONG__ on __LABEL__ | Bob Davis</title>
<meta name="description" content="Listen to __SONG__ by Bob Davis on __LABEL__.">

<!-- Search engines should index the destination, not this hop. -->
<meta name="robots" content="noindex, follow">
<link rel="canonical" href="https://bobdavismusic.com/">

<meta property="og:title" content="__SONG__ | Bob Davis">
<meta property="og:description" content="The debut single from Bob Davis. Out October 2.">
<meta property="og:image" content="https://bobdavismusic.com/images/2-dolla-bill-cover.jpg">
<meta property="og:url" content="https://bobdavismusic.com/listen/__SLUG__/__KEY__/">
<meta name="twitter:card" content="summary_large_image">

<!-- GENERATED FILE. Do not hand-edit; change tools/make-listen-redirects.py and re-run.

     PER-PLATFORM PERMANENT REDIRECT for radio label copy and anything else that persists and
     cannot be edited later. Submitted once, repointable forever.

     DESTINATION STATUS: __NOTE__ -->

<!-- No-JS fallback. Long enough that JS normally wins the race. -->
<noscript><meta http-equiv="refresh" content="0; url=__DEST__"></noscript>

<!-- Deliberately NOT async. Async means gtag.js may still be loading when the event below
     runs, leaving it queued while the redirect fires, so the hit is never sent. On a page
     whose only job is to record the click before handing off, blocking is the right trade. -->
<script src="https://www.googletagmanager.com/gtag/js?id=G-X1W0TNHM51"></script>
<script>
  window.dataLayer = window.dataLayer || [];
  function gtag(){dataLayer.push(arguments);}
  gtag('js', new Date());
  gtag('config', 'G-X1W0TNHM51');
</script>

<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body {
    background: #0d0608;
    color: #E8DCC8;
    font-family: Georgia, serif;
    min-height: 100vh;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 32px 20px;
    text-align: center;
  }
  img {
    width: 100%;
    max-width: 260px;
    height: auto;
    border-radius: 8px;
    box-shadow: 0 10px 40px rgba(0,0,0,0.6);
  }
  h1 { font-size: 22px; letter-spacing: 1px; margin: 22px 0 4px; color: #E7B24B; }
  .artist { font-size: 13px; letter-spacing: 3px; text-transform: uppercase; color: #b49a86; }
  .status { font-size: 14px; color: #907860; margin-top: 26px; font-style: italic; }
  a.manual { color: #C9A227; font-size: 14px; margin-top: 14px; display: inline-block; }
  a.manual:hover { color: #FFD700; }
  @media (prefers-color-scheme: light) {
    body { background: #f3e9d6; color: #3a2a1c; }
    h1 { color: #8a5a10; }
    .artist, .status { color: #7a5030; }
  }
</style>
</head>
<body>

  <img src="../../../images/2-dolla-bill-cover.jpg" alt="__SONG__ single cover" width="900" height="900">
  <h1>__SONG__</h1>
  <p class="artist">Bob Davis</p>
  <p class="status">Taking you to __LABEL__...</p>
  <a class="manual" id="manual" href="__DEST__">Continue to __LABEL__</a>

<script>
(function () {
  var DEST = '__DEST__';
  var gone = false;

  function go() {
    if (gone) return;
    gone = true;
    location.replace(DEST);
  }

  // Viewer-local midnight, matching the homepage and the parent redirect. The release rolls
  // by listener time zone, so a single fixed instant mislabels the event outside Central.
  var released = new Date() >= new Date(2026, 9, 2, 0, 0, 0);

  // Platform recorded separately so Bob can see WHICH service the click was headed for.
  gtag('event', released ? 'listen_click' : 'presave_click', {
    single: '__SONG__',
    source: 'platform_redirect',
    platform: '__KEY__',
    event_callback: go,
    event_timeout: 900
  });

  setTimeout(go, 1500);
  document.getElementById('manual').addEventListener('click', function () { gone = true; });
})();
</script>

</body>
</html>
"""

written = []
for key, (label, dest, note) in PLATFORMS.items():
    d = os.path.join(ROOT, "listen", SLUG, key)
    os.makedirs(d, exist_ok=True)
    html = TEMPLATE
    for tok, val in [("__SONG__", SONG), ("__SLUG__", SLUG), ("__KEY__", key),
                     ("__LABEL__", label), ("__NOTE__", note), ("__DEST__", dest)]:
        html = html.replace(tok, val)
    p = os.path.join(d, "index.html")
    io.open(p, "w", encoding="utf-8", newline="\n").write(html)
    written.append((key, dest))
    print("  /listen/%s/%s/  ->  %s" % (SLUG, key, dest))

print("\n  %d pages written." % len(written))
