# westonwhat.com

**W.H.A.T. :: Weston's Hideout And Terminal.** A personal node on the old internet, online since 1999 (spiritually).

It's a static website. You write Markdown files and drop photos into folders. A small build script turns everything into plain HTML, and Cloudflare Pages hosts it for free.

- No database, no server, no accounts, no trackers, no cookies.
- No npm packages. The build script needs only Node.js (version 18 or newer).
- Deploying is covered in **[DEPLOY.md](DEPLOY.md)**.

---

## Quick start

```bash
npm run dev        # preview at http://localhost:8080. Rebuilds and reloads when you save a file.
npm run build      # writes the finished site to dist/
npm run portable   # same, but with relative links so dist/index.html opens by double-click
```

`npm run dev` also shows posts marked `draft: true`. The real build leaves them out.

If something is wrong with a content file, the build stops and tells you which file and what to fix. Notes such as oversized photos are printed at the end of every build.

---

## Where everything lives

```
content/                  ← everything you edit day to day
  site.json               site title, tagline, nav labels, marquee, system messages, status lights, footer buttons
  home.md                 the WELCOME.TXT text on the front page
  logo.txt                the ASCII-art logo
  about.md                the profile card on the front page
  files.md                the note at the top of the FILES page
  files/                  one Markdown file per download on the FILES page
  links.md                the LINKS page
  basement.md             the secret page (shh)
  posts/                  logbook entries, one Markdown file each
  games/                  one Markdown file per arcade cabinet
  photos/<album>/         one folder per album, with the images inside
public/                   ← copied to the site as-is
  css/style.css           the whole look. Colors are at the top.
  js/site.js              skull, photo viewer, display settings, Easter eggs
  js/music.js             the basement music player (synthesized in the browser)
  downloads/              files people can download from the FILES page
  js/prefs.js             applies saved display settings before the page paints
  games/<name>/           self-hosted games
  img/                    graphics: gfx/ (skull, fire, construction), buttons/ (88x31), icons/, arcade/
  fonts/                  VT323 + Press Start 2P (open licenses, see FONT-LICENSES.txt)
engine/                   ← the build script and local preview server (no need to touch)
tools/                    ← Python scripts that drew the site's graphics (optional)
dist/                     ← generated. Never edit; it's rebuilt every time.
```

---

## How to…

### Write a logbook entry

Make a file in `content/posts/` whose name starts with the date:

```
content/posts/2026-11-02-a-short-title.md
```

```markdown
---
title: A short title
date: 2026-11-02 22:15
tags: [music, late-night]
mood: optional, LiveJournal style
music: optional, shown as "Listening"
---
Your post, in Markdown. Use ## for headings.
```

- The address comes from the file name: this one becomes `/log/a-short-title/`.
- `draft: true` keeps it off the live site.
- `summary: …` sets the preview text. Otherwise the first lines are used.
- Entries newer than two weeks get a blinking NEW badge.
- New entries appear in the Atom feed (`/feed.xml`) automatically.
- Images: put them in `public/img/` and write `![description](/img/your-file.gif)`.
- Raw HTML works too. For a scrolling banner, use
  `<p class="scroller"><span>your text</span></p>`. Unlike the old `<marquee>` tag, it pauses on hover and stays still for visitors who turned motion off.
- `content/posts/2026-10-27-formatting-test.md` shows everything the logbook can render.

### Add photos

1. Make a folder: `content/photos/summer-2026/`. The folder name becomes the address, `/photos/summer-2026/`.
2. Drop images in: `.jpg`, `.png`, `.gif` or `.webp`.
3. That's it. Titles and captions are optional:

```json
// content/photos/summer-2026/album.json
{
  "title": "Summer 2026",
  "description": "One line about the album.",
  "sort": "date",
  "cover": "IMG_0042.jpg",
  "captions": {
    "IMG_0042.jpg": "Short caption",
    "IMG_0043.jpg": { "caption": "Caption", "alt": "What the photo shows, for screen readers" }
  }
}
```

(Real JSON doesn't allow `//` comments. Leave that first line out.)

- `sort` can be `name` (the default, by file name), `date` (oldest first, using the camera's EXIF date) or `date-desc`.
- The date, camera and exposure come from the photo's EXIF data automatically.
- **Location privacy:** phone photos often contain GPS coordinates. The build removes GPS data from the *published copy* and leaves your original file untouched. It prints a note when it does this. The setting is `photos.stripLocation` in `site.json`.
- **Size:** export photos at around 2000px wide, JPEG quality 80. That's usually under 1 MB. The build warns about anything over 4 MB, and Cloudflare refuses files over 25 MB.
- An optional `notes.md` in the album folder adds a paragraph of text above the grid.
- Delete the two `sample-…` folders once you have your own albums.

There is **no upload button** on the website. Photos are added by putting files in the folder and deploying. A real browser upload system would need storage (Cloudflare R2), a small server-side function, and a login so only you can upload. That's doable later; see *Static site vs. a site you log into* below.

### Add a game

Each cabinet is one file in `content/games/`. Copy `content/games/_template.md`, which documents every field. Files starting with `_` are ignored.

**A game you host yourself** (a folder of HTML/JS files):

1. Put the game in `public/games/space-blaster/`, with its start page at `public/games/space-blaster/index.html`.
2. Create `content/games/space-blaster.md`:

```markdown
---
title: SPACE BLASTER
src: /games/space-blaster/
thumb: /img/arcade/space-blaster.gif
description: One or two sentences for the cabinet.
controls: Arrow keys to move, Space to fire.
touch: no
aspect: 4:3
credit: Made by Someone (MIT license)
---
Longer notes shown under the game.
```

**A game hosted somewhere else** (an embed URL, for example from itch.io):

```markdown
---
title: SOMEONE'S GAME
src: https://example.itch.io/embed-upload/1234567
touch: partial
---
```

- The address must start with `https://`, and the other site has to allow embedding. Many sites give you a special "embed" URL for this.
- The build automatically adds the site to the security policy that controls which pages can be embedded, so you don't edit that by hand.

**Things to know:**

- Games run in a sandboxed frame. The default sandbox lets games run scripts and save high scores. For a game you don't fully trust, add `sandbox: allow-scripts allow-pointer-lock` to its file. That isolates it completely, but it can no longer save anything.
- `touch: no` labels the cabinet KEYBOARD ONLY, so phone visitors know what to expect.
- Thumbnails are 160×120. A static PNG works. An animated GIF looks like an arcade attract screen.
- `type: placeholder` shows an OUT OF ORDER cabinet with no game.
- **The three starter games** (Snake, Minefield, Brickout) are original and yours to keep. To remove one, delete `content/games/<name>.md` and `public/games/<name>/`. The arcade thumbnails live in `public/img/arcade/`.

### Add a download (the FILES page)

The FILES page lists files people can download, such as game save files.

1. Put the file in `public/downloads/`.
2. Copy `content/files/pokemon-blue-random.md`, rename it, and edit it:

```markdown
---
title: Pokémon Blue (full color, random)
file: /downloads/pokemon-blue-full-color-random.st1
game: Pokémon Blue
kind: Save state
emulator: optional, the emulator it was made with
date: 2026-10-29
order: 2
---
Optional notes about the file go here.
```

The size is filled in automatically. Files must be under 25 MB. `content/files.md` is the short note at the top of the page.

### Change the profile card (front page)

Edit `content/about.md`. The profile card on the front page shows `handle`, `status` and every other line in that settings block. A line that still says `[edit me]` is left off the page until you change it. Delete a line to remove it.

### Update links

Edit `content/links.md`.

- Each `## Heading` becomes a folder window.
- Write links as `- [Name](https://address): one line about it`.
- For a wall of 88×31 buttons, save the buttons in `public/img/buttons/` and add a section that contains only button images. The commented example at the bottom of the file shows how.
- The "TAKE ME SOMEWHERE" button jumps to a random link on the page.

### Change the title, tagline, messages or look

- **Words:** `content/site.json` holds the title, tagline, the green system line, nav labels and blurbs, marquee items, status lights, footer text, and footer buttons.
- **Front page welcome:** `content/home.md`.
- **Logo:** `content/logo.txt` is plain text. Paste in any ASCII art. To make new lettering, use a FIGlet generator (search "figlet online"); the current logo uses the *poison* font. If the new logo is a different width, adjust the number in `.logo__ascii` in `style.css`. The comment there explains it.
- **Colors and fonts:** the top of `public/css/style.css`. Every color on the site comes from those variables.

### Add graphics and animated GIFs

- Put files in `public/img/` and reference them as `/img/...`.
- Only use art you made, art you have permission for, or art with a license that allows reuse. Old GIF archives are fun to browse, but most of those GIFs have no clear license.
- Everything currently on the site is original. The skull, fire, buttons, icons, thumbnails and sample photos were all drawn by the scripts in `tools/` (needs Python 3 with `numpy` and `pillow`):

```bash
python3 tools/skull.py --size 160 --frames 40   # re-render the spinning skull
python3 tools/make_graphics.py buttons          # just the 88x31 buttons (see the file for other groups)
```

- Optional: save a still `.png` next to an animated `.gif`, with the same name (`spinner.gif` + `spinner.png`). Visitors who turn motion off then see the still version of that GIF wherever the site shows it. The scripts in `tools/` write both.

---

## What's real and what's sample content

| Thing | Status |
|---|---|
| Layout, navigation, all pages | Real and working |
| Skull secret, Konami code, display settings, photo viewer, webring button, copy buttons, 404 page | Real and working |
| Visit counter | Real, but counts **this visitor's** visits in **their** browser. Nothing is collected. There is no global hit count. |
| STATUS.SYS lights, "UPTIME", "56,600 bps" | Decorative jokes. The uptime is real arithmetic from 1999-01-01. |
| Logbook entries | **Sample.** Three entries marked with a SAMPLE badge. Delete them. |
| Photo albums | **Sample.** Generated placeholder images. Delete the `sample-…` folders. |
| FILES profile | **Placeholder.** Everything in `[edit me]` brackets is yours to fill in. |
| Links | Real sites about the old web, chosen as starters. Swap in your own. |
| Arcade | Three original working games plus one example "out of order" slot (`slot-04.md`). |

---

## Static site vs. a site you log into

This site is **static**: you change files, the site rebuilds, and visitors get plain HTML. It's free, fast, and has nothing to hack. The trade-off is that you publish from your computer or GitHub, not from a form on the website.

You could later add a private "write a post" or "upload photos" page. On Cloudflare that would mean:

- **Cloudflare Access** in front of an `/admin` page, so only your email can sign in. Free for small teams.
- A **Pages Function / Worker** that receives the post or upload.
- Somewhere to keep it: **R2** for photos, or **D1** (a small database) for posts. Alternatively, the function could commit the file to your GitHub repo so the normal build picks it up.

Each piece has a free tier, but it adds moving parts and things to secure. Worth doing once you know you'd use it. The fake alternative (a form that looks like it saves but forgets on refresh) is deliberately not included.

---

## Secrets (spoilers!)

- **Poke the skull** seven times. A link to the basement appears. The basement has the music player (FUNKZONE ALPHA). It never starts by itself: you press PLAY.
- **Konami code** (↑ ↑ ↓ ↓ ← → ← → B A) anywhere: 1999 MODE. Comic Sans, rainbow titles, skull cursor trail. Once unlocked, it can also be toggled in DISPLAY.CPL.
- **View source** on any page.
- **Any wrong address** gets the blue screen of death. Press any key.
- `/basement/` isn't linked from the menu, and search engines are asked not to index it.

---

## Accessibility and motion

- The **DISPLAY.CPL** button in the status bar lets visitors turn off scanlines, change the phosphor color, and stop all motion. Settings are saved in their browser only.
- With motion off (or with the system "reduce motion" setting), every GIF swaps to a still frame and all animation stops.
- Every page was checked with the axe accessibility checker at desktop and phone sizes, and reported zero violations.
- Keyboard: every control is reachable. A "Skip to content" link appears on Tab. Minefield is fully keyboard-playable.

---

## Credits and licenses

- **Fonts:** VT323 and Press Start 2P, both under the SIL Open Font License (`public/fonts/FONT-LICENSES.txt`).
- **Graphics, games and code:** made for this site. They're yours.
- **ASCII logo:** set in the FIGlet *poison* font.
