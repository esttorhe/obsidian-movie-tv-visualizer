// ABOUTME: Pure accessor helpers over the Movie/TvShow union so views can treat both uniformly.
// ABOUTME: No Obsidian runtime imports — safe to unit test and reuse across engines and views.
import type { MediaItem, Movie, TvShow, WatchStatus } from "./types";

const WATCH_STATUS_LABEL: Record<WatchStatus, string> = {
	unwatched: "Unwatched",
	watching: "Watching",
	watched: "Watched",
	dropped: "Dropped",
};

const WATCH_STATUS_ICON: Record<WatchStatus, string> = {
	unwatched: "circle",
	watching: "play-circle",
	watched: "check-circle",
	dropped: "x-circle",
};

export function isMovie(item: MediaItem): item is Movie {
	return item.mediaType === "movie";
}

export function isTv(item: MediaItem): item is TvShow {
	return item.mediaType === "tv";
}

// Normalized "credits" for the Creators view and sorting: directors for movies, creators for TV.
export function credits(item: MediaItem): string[] {
	return isMovie(item) ? item.director : item.creator;
}

// Per-title runtime used for card meta and the runtime filter:
// a movie's full runtime, or a TV show's per-episode runtime.
export function displayRuntime(item: MediaItem): number | undefined {
	return isMovie(item) ? item.runtime : item.episodeRuntime;
}

// Total viewing time contributed to aggregate stats: a movie's runtime,
// or a TV show's per-episode runtime multiplied by its episode count.
export function totalRuntime(item: MediaItem): number {
	if (isMovie(item)) return item.runtime ?? 0;
	const per = item.episodeRuntime ?? 0;
	const eps = item.episodes ?? 0;
	return per * eps;
}

export function isWatched(item: MediaItem): boolean {
	return item.watchStatus === "watched";
}

// Started but stopped for good — deliberately neither watched nor waiting to be watched.
export function isDropped(item: MediaItem): boolean {
	return item.watchStatus === "dropped";
}

export function isWatching(item: MediaItem): boolean {
	return item.watchStatus === "watching";
}

export function watchStatusLabel(status: WatchStatus): string {
	return WATCH_STATUS_LABEL[status];
}

export function watchStatusIcon(status: WatchStatus): string {
	return WATCH_STATUS_ICON[status];
}

export function mediaLabel(item: MediaItem): string {
	return isMovie(item) ? "Movie" : "TV Show";
}

// Human-readable "you're on S2E4" style progress for a TV show, or null if none recorded.
export function progressLabel(show: TvShow): string | null {
	if (show.currentSeason == null && show.currentEpisode == null) return null;
	const s = show.currentSeason ?? 1;
	const e = show.currentEpisode ?? 1;
	return `S${s}E${e}`;
}

// Fraction (0–1) of a TV show watched, best-effort from currentEpisode over total episodes.
export function tvProgressFraction(show: TvShow): number | null {
	if (show.episodes == null || show.episodes <= 0) return null;
	if (show.currentEpisode == null) return null;
	return Math.max(0, Math.min(1, show.currentEpisode / show.episodes));
}
