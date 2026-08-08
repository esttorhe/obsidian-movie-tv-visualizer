// ABOUTME: Pure filter engine that narrows a mixed movie/TV collection by the active FilterState.
// ABOUTME: Media-type, genre, status, year, rating, runtime, credit, cast, network and text filters.
import type { MediaItem, FilterState } from "../types";
import { credits, displayRuntime, isWatched, isWatching, isDropped, isTv } from "../media";

export class FilterEngine {
	apply(items: MediaItem[], filter: FilterState): MediaItem[] {
		let result = items;

		if (filter.mediaType && filter.mediaType !== "all") {
			result = result.filter((m) => m.mediaType === filter.mediaType);
		}

		if (filter.query && filter.query.trim()) {
			const q = filter.query.toLowerCase();
			result = result.filter(
				(m) =>
					m.title.toLowerCase().includes(q) ||
					credits(m).some((d) => d.toLowerCase().includes(q)) ||
					m.cast.some((c) => c.toLowerCase().includes(q)) ||
					m.genre.some((g) => g.toLowerCase().includes(q)) ||
					(m.plot ?? "").toLowerCase().includes(q)
			);
		}

		if (filter.genres.length > 0) {
			result = result.filter((m) =>
				filter.genres.some((g) =>
					m.genre.some((mg) => mg.toLowerCase() === g.toLowerCase())
				)
			);
		}

		switch (filter.status) {
			case "unwatched":
				result = result.filter((m) => m.watchStatus === "unwatched");
				break;
			case "watching":
				result = result.filter((m) => isWatching(m));
				break;
			case "watched":
				result = result.filter((m) => isWatched(m));
				break;
			case "dropped":
				result = result.filter((m) => isDropped(m));
				break;
			case "favorites":
				result = result.filter((m) => m.favorite);
				break;
		}

		if (filter.yearMin != null) result = result.filter((m) => (m.year ?? 0) >= filter.yearMin!);
		if (filter.yearMax != null) result = result.filter((m) => (m.year ?? 9999) <= filter.yearMax!);

		if (filter.ratingMin != null) result = result.filter((m) => m.rating != null && m.rating >= filter.ratingMin!);
		if (filter.ratingMax != null) result = result.filter((m) => m.rating != null && m.rating <= filter.ratingMax!);

		if (filter.imdbMin != null) result = result.filter((m) => m.scoreImdb != null && m.scoreImdb >= filter.imdbMin!);

		if (filter.runtimeFilter) {
			switch (filter.runtimeFilter) {
				case "short": result = result.filter((m) => (displayRuntime(m) ?? 999) < 90); break;
				case "long": result = result.filter((m) => (displayRuntime(m) ?? 0) > 150); break;
				case "normal": result = result.filter((m) => {
					const r = displayRuntime(m) ?? 120;
					return r >= 90 && r <= 150;
				}); break;
			}
		}

		if (filter.credit) {
			const d = filter.credit.toLowerCase();
			result = result.filter((m) => credits(m).some((md) => md.toLowerCase() === d));
		}

		if (filter.cast) {
			const c = filter.cast.toLowerCase();
			result = result.filter((m) => m.cast.some((mc) => mc.toLowerCase() === c));
		}

		if (filter.network) {
			const n = filter.network.toLowerCase();
			result = result.filter((m) => isTv(m) && (m.network ?? "").toLowerCase() === n);
		}

		return result;
	}
}
