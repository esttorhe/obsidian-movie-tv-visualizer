# Movie & TV Visualizer

A visual catalog plugin for [Obsidian](https://obsidian.md) that turns your movie **and TV show** notes into a full-featured media dashboard — hero banners, carousels, top lists, director/creator stats, tier lists, season/episode progress tracking, and more.

> **No external services required.** Everything is read directly from the frontmatter of your vault notes.

This plugin is a fork of and derivative work based on [**LDR | Movie Visualizer**](https://github.com/ldr-devx/ldr-obsidian-movie-visualizer) by **LDR_Dev** (MIT licensed). It preserves the original movie experience and extends the whole plugin to treat movies and TV shows as one unified, filterable collection. See [Attribution & License](#attribution--license).

---

## Features

Everything works across **both** movies and TV shows, in one catalog and one dashboard, filterable by media type.

### Dashboard
- **Hero banner** — features your last-watched or highest-rated title (movie or show) with backdrop
- **Stats bar** — total, movies, TV shows, watched, favorites, avg personal rating, avg IMDb, unique creators
- **Carousels** — Continue Watching (in-progress TV), Recently Watched, Recently Added, Favorites, Top IMDb, My Highest Rated

### Catalog
- Grid of every movie and show
- **Media-type filter: All / Movies / TV Shows**
- Filter by genre, status (watched / unwatched / favorites), year range, rating, IMDb, runtime bucket, network, director/creator, cast, and free-text search
- Sort by title, year, IMDb, RT, rating, runtime, last watched, added, director/creator
- Four display modes: Large Grid, Compact Grid, List, Poster

### Top List
- Rank by **Combined**, **My Rating**, **IMDb**, or **RT**
- **Media-type filter (All / Movies / TV)** plus genre filter
- Top 10 / 20 / 30, and Rank / Grid / Compact / Poster views
- Drag-and-drop custom ordering, persisted per vault; podium for the top 3

### Directors & Creators
- One unified view merging movie **directors** and TV **creators** into creator cards
- Movie count, average personal rating, average IMDb per person
- Click through to a person's combined filmography (movies + shows)

### Actors
- Cards for every cast member across movies and shows, sortable and searchable

### Detail view
- **Movies** get the classic layout: poster, backdrop, scores, cast, plot, awards, trailer embed, review, mood
- **TV shows** get a dedicated **season/episode progress panel** — shows "you're on S2E4", a progress bar, and lets you set the current season/episode or bump to the next episode, all written back to frontmatter

### Tier List
- Drag-and-drop tiering of movies and shows together, with custom tier labels/colors
- Media-type badge on each item; PNG export of the whole board; state persisted per vault

### Reviews
- Every title with a `review`, sorted by rating, filterable by media type

### Stats
- Titles by genre, rating distribution, titles by year, top directors & creators
- **TV-specific breakdowns:** shows by network and TV status distribution (returning / ended / canceled)
- Filterable to All / Movies / TV Shows

### Search & Playlists
- Global text search across title, director/creator, cast, genre and plot — filterable by media type
- User playlists spanning both movies and shows

---

## Installation

There is no GitHub release yet, so install via **BRAT** (Beta Reviewers Auto-update Tool):

1. Install the **BRAT** community plugin from Obsidian's Community Plugins browser and enable it.
2. In BRAT: **Add Beta Plugin** → paste this repository URL:
   `https://github.com/esttorhe/obsidian-movie-tv-visualizer`
3. Enable **Movie & TV Visualizer** in **Settings → Community Plugins**.
4. Click the **clapperboard** ribbon icon, or run the command **Open Media Visualizer**.

### Build from source

```bash
git clone https://github.com/esttorhe/obsidian-movie-tv-visualizer.git
cd obsidian-movie-tv-visualizer
npm install
npm run build   # tsc typecheck + esbuild production bundle → main.js
npm test        # run the vitest unit suite
```

Copy `main.js`, `styles.css`, and `manifest.json` into
`<your-vault>/.obsidian/plugins/movie-tv-visualizer/` and enable the plugin.

---

## Frontmatter reference

The plugin indexes **any note** whose frontmatter `categories` marks it as a movie or a TV show.

- Movies: `categories` contains `Movies` (case-insensitive, e.g. `movies`).
- TV shows: `categories` contains `TV Shows` / `TV` / `TV Series` (case-insensitive). If a note is tagged as both, it is treated as a **TV show**.

Only the `categories` field is truly required — every other field is optional and handled gracefully when missing.

### Movies

Movies keep the exact same contract as the original LDR plugin, so your existing movie notes work unchanged.

```yaml
---
title: Ran
titleOriginal: 乱
imdbId: tt0089881

year: 1985
runtime: PT2H42M      # ISO 8601 duration, or plain minutes (162), or "2h 42m"
country: Japan
language: Japanese
director:
  - Akira Kurosawa
writer:
  - Akira Kurosawa
cast:
  - Tatsuya Nakadai
genre:
  - Drama
  - War
productionCompany: Herald Ace

scoreImdb: 8.2
scoreRT: 97
scoreMetacritic: 96
rating: 10             # your personal score 1–10 (supports 0.5 steps)

cover: https://...     # poster image URL
coverBackdrop: https://...
trailer: https://...

favorite: true
watchlist: 2024-01-15  # ISO date — when you added it
last: 2024-03-20       # ISO date — last time you watched it
timesWatched: 2
review: A towering achievement in world cinema.
mood: contemplative

plot: In feudal Japan, an aging warlord retires...
awards: Nominated for 4 Oscars.
tags:
  - criterion
categories:
  - Movies
---
```

### TV shows

TV shows reuse every movie field where the concept is the same, and add TV-specific fields.

```yaml
---
title: Severance
titleOriginal: Severance
imdbId: tt11280740

year: 2022             # first-aired year
yearEnd: 2025          # optional — last-aired year; omit for still-running shows
country: United States
language: English
creator:               # string[] — the TV parallel to a movie's `director`
  - Dan Erickson
writer:
  - Dan Erickson
cast:
  - Adam Scott
  - Britt Lower
genre:
  - Drama
  - Sci-Fi
productionCompany: Red Hour Productions

status: returning      # returning | ended | canceled (spellings are normalized)
seasons: 2
episodes: 19           # total episode count
episodeRuntime: PT50M  # per-episode runtime — same parsing as movie `runtime`
network: Apple TV+

scoreImdb: 8.7
scoreRT: 94
scoreMetacritic: 83
rating: 9

cover: https://...
coverBackdrop: https://...
trailer: https://...

favorite: false
watchlist: 2024-01-10
last: 2025-03-21
timesWatched: 1
review: A meticulously crafted workplace nightmare.
mood: unsettling

# Season/episode progress — powers the "you're on S2E4" panel in the detail view.
currentSeason: 2
currentEpisode: 4

plot: A team whose memories are surgically divided between work and life...
awards: Multiple Emmy nominations.
tags:
  - prestige
categories:
  - TV Shows
---
```

**TV field notes (for filling in notes going forward):**

| Field | Type | Notes |
|---|---|---|
| `creator` | string[] | Parallel to a movie's `director`. Feeds the unified "Directors & Creators" view and credit sorting. |
| `yearEnd` | number (optional) | Last-aired year; the UI shows `2022–2025`, or `2022–` for `returning` shows. |
| `status` | `returning` \| `ended` \| `canceled` | Common spellings (ongoing, continuing, cancelled, finished…) are normalized. |
| `seasons` | number | Season count. |
| `episodes` | number | Total episodes; used for the progress bar and total-watch-time stats. |
| `episodeRuntime` | duration/minutes | Per-episode runtime; parsed exactly like movie `runtime` (ISO-8601 or plain minutes). |
| `network` | string | Powers the network filter and the "Shows by network" stat. |
| `currentSeason` / `currentEpisode` | number | Your progress. The detail view reads and writes these when you set progress or hit "Next episode". |

Aggregate "total time" counts a movie's `runtime`, and a show's `episodeRuntime × episodes`.

---

## Obsidian Clipper integration

The included `clipper.json` has **two** templates for the [Obsidian Clipper](https://obsidian.md/clipper) extension:

- **IMDb Movie** — clips an IMDb movie page (`categories: [Movies]`, saved under `Movies/`).
- **IMDb TV Show** — clips an IMDb series page (`categories: [TV Shows]`, saved under `TV Shows/`).

Both trigger on `imdb.com/title/`; pick the matching template from the Clipper's template selector when you clip.

> ⚠️ **Selectors are best-effort, not verified.** IMDb TV series pages have a different DOM structure than movie pages, and IMDb changes its markup frequently. The TV template's selectors (especially `seasons`, and `network` which IMDb does not expose consistently) may need adjustment, and some fields may come in blank — fill `status`, `network`, `seasons`, `episodes` and progress in by hand as needed. Treat the clipper as a starting point, not a guarantee.

---

## Obsidian Base view

`Media.base` is a companion [Bases](https://help.obsidian.md/bases) database file covering both media types. It includes pre-built table views: **All**, **Movies**, **TV Shows**, **Currently Watching**, **To-watch**, **Favorites**, **Last Watched**, **By Creator**, **By Genre**, **By Actor**.

Copy `Media.base` to any folder inside your vault (e.g. `Media/Media.base`).

---

## Compatibility

| Target | Status |
|---|---|
| Obsidian 1.4.0+ | Supported |
| Desktop | Supported |
| Mobile | Supported |

---

## Attribution & License

This plugin is a **derivative work** of [**LDR | Movie Visualizer**](https://github.com/ldr-devx/ldr-obsidian-movie-visualizer) by **LDR_Dev**, used under the MIT License. The original plugin provided the movie catalog, views, styling and Obsidian API patterns; this fork adds a unified movie/TV data model, TV indexing, season/episode progress tracking, media-type filtering across the views, and TV-oriented stats, clipper and base templates.

Licensed under the [MIT License](LICENSE):

- Copyright (c) 2026 LDR_Dev — original work
- Copyright (c) 2026 Esteban Torres — movie/TV extensions

```bash
npm run dev    # esbuild watch mode
npm run build  # production build
npm test       # unit tests
```
