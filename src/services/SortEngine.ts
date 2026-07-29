// ABOUTME: Pure sort engine that orders a mixed movie/TV collection by a SortKey and direction.
// ABOUTME: Uses the shared credit/runtime accessors so movies and TV shows sort consistently.
import type { MediaItem, SortKey, SortDirection } from "../types";
import { credits, displayRuntime } from "../media";

export class SortEngine {
	sort(items: MediaItem[], key: SortKey, direction: SortDirection): MediaItem[] {
		const copy = [...items];
		const dir = direction === "asc" ? 1 : -1;

		copy.sort((a, b) => {
			let va: number | string = 0;
			let vb: number | string = 0;

			switch (key) {
				case "title":
					va = a.title.toLowerCase();
					vb = b.title.toLowerCase();
					break;
				case "year":
					va = a.year ?? 0;
					vb = b.year ?? 0;
					break;
				case "scoreImdb":
					va = a.scoreImdb ?? -1;
					vb = b.scoreImdb ?? -1;
					break;
				case "scoreRT":
					va = a.scoreRT ?? -1;
					vb = b.scoreRT ?? -1;
					break;
				case "rating":
					va = a.rating ?? -1;
					vb = b.rating ?? -1;
					break;
				case "runtime":
					va = displayRuntime(a) ?? 0;
					vb = displayRuntime(b) ?? 0;
					break;
				case "last":
					va = a.last ?? "";
					vb = b.last ?? "";
					break;
				case "watchlist":
					va = a.watchlist ?? "";
					vb = b.watchlist ?? "";
					break;
				case "timesWatched":
					va = a.timesWatched;
					vb = b.timesWatched;
					break;
				case "credits":
					va = (credits(a)[0] ?? "").toLowerCase();
					vb = (credits(b)[0] ?? "").toLowerCase();
					break;
			}

			if (typeof va === "string" && typeof vb === "string") {
				return va < vb ? -dir : va > vb ? dir : 0;
			}
			return ((va as number) - (vb as number)) * dir;
		});

		return copy;
	}
}
