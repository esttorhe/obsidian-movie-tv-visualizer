// ABOUTME: Pure aggregation engine: vault stats, creator/actor cards and the dashboard carousels.
// ABOUTME: Operates on a mixed movie/TV collection via the shared media accessors; no Obsidian imports.
import type { MediaItem, VaultStats, CreatorCard, ActorCard, TvStatus } from "../types";
import { credits, totalRuntime, isWatched, isMovie, isTv } from "../media";

export class StatsEngine {
	topByRating(items: MediaItem[], n: number): MediaItem[] {
		return [...items]
			.filter((m) => m.rating != null)
			.sort((a, b) => (b.rating ?? 0) - (a.rating ?? 0))
			.slice(0, n);
	}

	topByImdb(items: MediaItem[], n: number): MediaItem[] {
		return [...items]
			.filter((m) => m.scoreImdb != null)
			.sort((a, b) => (b.scoreImdb ?? 0) - (a.scoreImdb ?? 0))
			.slice(0, n);
	}

	recentlyAdded(items: MediaItem[], n: number): MediaItem[] {
		return [...items]
			.filter((m) => m.watchlist != null)
			.sort((a, b) => (b.watchlist ?? "").localeCompare(a.watchlist ?? ""))
			.slice(0, n);
	}

	recentlyWatched(items: MediaItem[], n: number): MediaItem[] {
		return [...items]
			.filter((m) => m.last != null)
			.sort((a, b) => (b.last ?? "").localeCompare(a.last ?? ""))
			.slice(0, n);
	}

	favorites(items: MediaItem[], n?: number): MediaItem[] {
		const favs = items
			.filter((m) => m.favorite)
			.sort((a, b) => (b.rating ?? 0) - (a.rating ?? 0));
		return n ? favs.slice(0, n) : favs;
	}

	// In-progress TV shows: have recorded progress but aren't finished.
	continueWatching(items: MediaItem[], n: number): MediaItem[] {
		return items
			.filter((m) => {
				if (!isTv(m)) return false;
				if (m.currentEpisode == null && m.currentSeason == null) return false;
				if (m.episodes != null && m.currentEpisode != null && m.currentEpisode >= m.episodes) return false;
				return true;
			})
			.sort((a, b) => (b.last ?? "").localeCompare(a.last ?? ""))
			.slice(0, n);
	}

	creatorCards(items: MediaItem[]): CreatorCard[] {
		return buildCards(items, (m) => credits(m)) as CreatorCard[];
	}

	actorCards(items: MediaItem[]): ActorCard[] {
		return buildCards(items, (m) => m.cast) as ActorCard[];
	}

	computeStats(items: MediaItem[]): VaultStats {
		const watched = items.filter((m) => isWatched(m));
		const favorites = items.filter((m) => m.favorite);
		const rated = items.filter((m) => m.rating != null);
		const imdbRated = items.filter((m) => m.scoreImdb != null);

		const genres: Record<string, number> = {};
		const byYear: Record<number, number> = {};
		const ratingDist: Record<number, number> = {};
		const networks: Record<string, number> = {};
		const tvStatus: Record<TvStatus, number> = { returning: 0, ended: 0, canceled: 0 };
		const creatorMap = new Map<string, { count: number; ratings: number[] }>();

		for (const m of items) {
			m.genre.forEach((g) => { genres[g] = (genres[g] ?? 0) + 1; });
			if (m.year) byYear[m.year] = (byYear[m.year] ?? 0) + 1;
			if (m.rating != null) {
				const r = Math.round(m.rating);
				ratingDist[r] = (ratingDist[r] ?? 0) + 1;
			}
			for (const d of credits(m)) {
				if (!creatorMap.has(d)) creatorMap.set(d, { count: 0, ratings: [] });
				const entry = creatorMap.get(d)!;
				entry.count++;
				if (m.rating != null) entry.ratings.push(m.rating);
			}
			if (isTv(m)) {
				if (m.network) networks[m.network] = (networks[m.network] ?? 0) + 1;
				if (m.status) tvStatus[m.status] = (tvStatus[m.status] ?? 0) + 1;
			}
		}

		const topCreators = Array.from(creatorMap.entries())
			.map(([name, { count, ratings }]) => ({
				name,
				count,
				avgRating: ratings.length ? ratings.reduce((a, b) => a + b, 0) / ratings.length : 0,
			}))
			.sort((a, b) => b.count - a.count)
			.slice(0, 10);

		return {
			total: items.length,
			movieCount: items.filter(isMovie).length,
			tvCount: items.filter(isTv).length,
			watched: watched.length,
			unwatched: items.length - watched.length,
			favorites: favorites.length,
			avgRating: rated.length ? rated.reduce((a, m) => a + m.rating!, 0) / rated.length : 0,
			avgImdb: imdbRated.length ? imdbRated.reduce((a, m) => a + m.scoreImdb!, 0) / imdbRated.length : 0,
			totalRuntime: items.reduce((a, m) => a + totalRuntime(m), 0),
			creators: creatorMap.size,
			genres,
			byYear,
			ratingDist,
			topCreators,
			networks,
			tvStatus,
		};
	}

	formatRuntime(minutes: number): string {
		const d = Math.floor(minutes / (60 * 24));
		const h = Math.floor((minutes % (60 * 24)) / 60);
		const m = minutes % 60;
		const parts: string[] = [];
		if (d > 0) parts.push(`${d}d`);
		if (h > 0) parts.push(`${h}h`);
		if (m > 0) parts.push(`${m}m`);
		return parts.join(" ") || "0m";
	}

	formatItemRuntime(minutes: number | undefined): string {
		if (!minutes) return "";
		const h = Math.floor(minutes / 60);
		const m = minutes % 60;
		if (h === 0) return `${m}m`;
		return m === 0 ? `${h}h` : `${h}h ${m}m`;
	}
}

function buildCards(
	items: MediaItem[],
	keysOf: (m: MediaItem) => string[]
): (CreatorCard | ActorCard)[] {
	const map = new Map<string, MediaItem[]>();
	for (const m of items) {
		for (const key of keysOf(m)) {
			if (!map.has(key)) map.set(key, []);
			map.get(key)!.push(m);
		}
	}
	const cards: (CreatorCard | ActorCard)[] = [];
	for (const [name, list] of map.entries()) {
		const ratings = list.filter((m) => m.rating != null).map((m) => m.rating!);
		const imdbs = list.filter((m) => m.scoreImdb != null).map((m) => m.scoreImdb!);
		cards.push({
			name,
			count: list.length,
			avgRating: ratings.length ? ratings.reduce((a, b) => a + b, 0) / ratings.length : 0,
			avgImdb: imdbs.length ? imdbs.reduce((a, b) => a + b, 0) / imdbs.length : 0,
			items: list.sort((a, b) => (b.scoreImdb ?? 0) - (a.scoreImdb ?? 0)),
			cover: list[0]?.cover,
		});
	}
	return cards.sort((a, b) => b.count - a.count);
}
