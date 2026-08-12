// ABOUTME: Pure frontmatter coercion helpers and the note-to-MediaItem builder for movies and TV shows.
// ABOUTME: Uses only a type-only Obsidian import so it can be unit tested outside the Obsidian runtime.
import type { TFile } from "obsidian";
import type { MediaItem, Movie, TvShow, MediaType, TvStatus, WatchStatus } from "./types";

// item.title falls back to the note's filename when there's no explicit `title`
// frontmatter field, and that filename may carry a capture-timestamp prefix
// (`YYYYMMDDHHmm <Title>`). That's fine for display, but it must never leak into
// an external search query (IMDb, etc.) — strip it there specifically.
export function cleanSearchTitle(title: string): string {
	return title.replace(/^\d{12}\s+/, "").trim();
}

// Strip [[wikilink]] syntax from a string
export function stripWikilink(s: string): string {
	return s.replace(/^\[\[/, "").replace(/\]\]$/, "");
}

// Coerce a frontmatter value to string[]
export function toStringArray(val: unknown): string[] {
	if (val === null || val === undefined || val === "") return [];
	if (Array.isArray(val)) {
		return val
			.filter((v) => v !== null && v !== undefined && v !== "")
			.map((v) => stripWikilink(String(v)));
	}
	return [stripWikilink(String(val))];
}

export function toNumber(val: unknown): number | undefined {
	if (val === null || val === undefined || val === "") return undefined;
	const n = Number(val);
	return isNaN(n) ? undefined : n;
}

// Parses ISO 8601 duration (PT1H49M, PT109M) or "1h 49m" text → minutes
export function parseRuntime(val: unknown): number | undefined {
	if (val === null || val === undefined || val === "") return undefined;
	if (typeof val === "number") return isNaN(val) ? undefined : val;
	const s = String(val).trim();
	// ISO 8601: PT2H30M, PT90M, PT1H
	const iso = s.match(/^PT(?:(\d+)H)?(?:(\d+)M)?(?:\d+S)?$/i);
	if (iso && (iso[1] || iso[2])) {
		const h = parseInt(iso[1] ?? "0");
		const m = parseInt(iso[2] ?? "0");
		const total = h * 60 + m;
		return total > 0 ? total : undefined;
	}
	// Text: "2h 30m", "1h", "90m", "1 hr 30 min"
	const text = s.match(/(?:(\d+)\s*h(?:r|our)?s?)?\s*(?:(\d+)\s*m(?:in)?)?/i);
	if (text && (text[1] || text[2])) {
		const h = parseInt(text[1] ?? "0");
		const m = parseInt(text[2] ?? "0");
		const total = h * 60 + m;
		return total > 0 ? total : undefined;
	}
	const n = parseInt(s);
	return isNaN(n) ? undefined : n;
}

export function toStr(val: unknown): string | undefined {
	if (val === null || val === undefined || val === "") return undefined;
	return String(val);
}

export function toBool(val: unknown): boolean {
	return val === true || val === "true";
}

export function parseTvStatus(val: unknown): TvStatus | undefined {
	const s = toStr(val);
	if (!s) return undefined;
	const norm = s.trim().toLowerCase();
	if (norm.includes("cancel")) return "canceled";
	if (norm.includes("end") || norm === "finished" || norm === "completed") return "ended";
	if (norm.includes("return") || norm === "ongoing" || norm === "continuing" || norm === "airing")
		return "returning";
	return undefined;
}

const VALID_WATCH_STATUSES: WatchStatus[] = ["unwatched", "watching", "watched", "dropped"];

// Resolve your personal watch status. An explicit, recognized `watchStatus` wins;
// otherwise it's inferred from progress signals, so notes written before the field
// existed keep reporting the same state they always did.
export function parseWatchStatus(val: unknown, fm: Record<string, unknown>): WatchStatus {
	const raw = toStr(val)?.trim().toLowerCase().replace(/\s+/g, "-");
	if (raw) {
		if (VALID_WATCH_STATUSES.includes(raw as WatchStatus)) return raw as WatchStatus;
		if (raw === "dnf" || raw === "did-not-finish" || raw === "abandoned" ||
			raw === "gave-up" || raw === "quit" || raw === "stopped") return "dropped";
		if (raw === "seen" || raw === "finished" || raw === "completed" || raw === "done") return "watched";
		if (raw === "currently-watching" || raw === "in-progress") return "watching";
		if (raw === "to-watch" || raw === "plan-to-watch" || raw === "want-to-watch" || raw === "backlog")
			return "unwatched";
	}
	if (toStr(fm.last) || (toNumber(fm.timesWatched) ?? 0) > 0) return "watched";
	// `watched` predates `watchStatus`; a note carrying only the old flag is still watched.
	if (toBool(fm.watched)) return "watched";
	if ((toNumber(fm.currentSeason) ?? 0) > 0 || (toNumber(fm.currentEpisode) ?? 0) > 0) return "watching";
	return "unwatched";
}

// Write a watch status to a frontmatter object, keeping the legacy `watched`
// boolean in step. The two fields are read by different consumers — the vault's
// own notes and Bases views still key off `watched`, while this plugin uses
// `watchStatus` — so updating one alone leaves a note that contradicts itself.
export function applyWatchStatusToFrontmatter(
	fm: Record<string, unknown>,
	watchStatus: WatchStatus,
): void {
	fm.watchStatus = watchStatus;
	fm.watched = watchStatus === "watched";
}

// Decide the media type from a note's `categories` list.
// Returns undefined for notes that are neither movies nor TV shows.
export function detectMediaType(categories: string[]): MediaType | undefined {
	const lc = categories.map((c) => c.toLowerCase());
	const isTv = lc.some((c) => c === "tv shows" || c === "tv" || c.includes("tv show") || c.includes("tv series"));
	if (isTv) return "tv";
	const isMovie = lc.some((c) => c === "movies" || c.includes("movies") || c.includes("movie"));
	if (isMovie) return "movie";
	return undefined;
}

// Build a MediaItem (Movie or TvShow) from a note's frontmatter object.
// Returns null when the note is not categorized as a movie or TV show.
export function buildMediaItem(
	fm: Record<string, unknown>,
	id: string,
	file: TFile
): MediaItem | null {
	const categories = toStringArray(fm.categories);
	const mediaType = detectMediaType(categories);
	if (!mediaType) return null;

	const rawTitle = toStr(fm.title) ?? id;

	const base = {
		id,
		title: rawTitle,
		titleOriginal: toStr(fm.titleOriginal) ?? rawTitle,
		file,
		imdbId: toStr(fm.imdbId),

		year: toNumber(fm.year),
		country: toStr(fm.country),
		language: toStr(fm.language),
		writer: toStringArray(fm.writer),
		cast: toStringArray(fm.cast),
		genre: toStringArray(fm.genre),
		productionCompany: toStr(fm.productionCompany),

		scoreImdb: toNumber(fm.scoreImdb),
		scoreRT: toNumber(fm.scoreRT),
		scoreMetacritic: toNumber(fm.scoreMetacritic),
		rating: toNumber(fm.rating),

		cover: toStr(fm.cover),
		coverBackdrop: toStr(fm.coverBackdrop),
		trailer: toStr(fm.trailer),

		favorite: toBool(fm.favorite),
		watchStatus: parseWatchStatus(fm.watchStatus, fm),
		watchlist: toStr(fm.watchlist),
		last: toStr(fm.last),
		timesWatched: toNumber(fm.timesWatched) ?? 0,
		review: toStr(fm.review),
		mood: toStr(fm.mood),

		plot: toStr(fm.plot),
		awards: toStr(fm.awards),
		tags: toStringArray(fm.tags),
		created: toStr(fm.created),
		categories,
	};

	if (mediaType === "movie") {
		const movie: Movie = {
			...base,
			mediaType: "movie",
			runtime: parseRuntime(fm.runtime),
			director: toStringArray(fm.director),
		};
		return movie;
	}

	const show: TvShow = {
		...base,
		mediaType: "tv",
		creator: toStringArray(fm.creator),
		yearEnd: toNumber(fm.yearEnd),
		status: parseTvStatus(fm.status),
		seasons: toNumber(fm.seasons),
		episodes: toNumber(fm.episodes),
		episodeRuntime: parseRuntime(fm.episodeRuntime),
		network: toStr(fm.network),
		currentSeason: toNumber(fm.currentSeason),
		currentEpisode: toNumber(fm.currentEpisode),
	};
	return show;
}
