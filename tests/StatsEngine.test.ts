// ABOUTME: Unit tests for the stats/aggregation engine across mixed movie/TV collections.
// ABOUTME: Covers counts, averages, total runtime, creator/actor cards, networks, TV status and formatting.
import { describe, it, expect } from "vitest";
import { StatsEngine } from "../src/services/StatsEngine";
import { makeMovie, makeTv } from "./helpers";

const engine = new StatsEngine();

const collection = [
	makeMovie({ id: "Ran", title: "Ran", year: 1985, genre: ["Drama"], director: ["Kurosawa"], rating: 10, scoreImdb: 8.2, runtime: 162, last: "2024-01-01", favorite: true, cast: ["Nakadai"] }),
	makeMovie({ id: "Ikiru", title: "Ikiru", year: 1952, genre: ["Drama"], director: ["Kurosawa"], rating: 9, scoreImdb: 8.3, runtime: 143 }),
	makeTv({ id: "Severance", title: "Severance", year: 2022, genre: ["Drama", "Sci-Fi"], creator: ["Erickson"], network: "Apple TV+", status: "returning", episodeRuntime: 50, episodes: 19, rating: 8, cast: ["Scott"] }),
	makeTv({ id: "Chernobyl", title: "Chernobyl", year: 2019, genre: ["Drama"], creator: ["Mazin"], network: "HBO", status: "ended", episodeRuntime: 60, episodes: 5, timesWatched: 1 }),
];

describe("computeStats", () => {
	const stats = engine.computeStats(collection);

	it("counts totals and per-type breakdown", () => {
		expect(stats.total).toBe(4);
		expect(stats.movieCount).toBe(2);
		expect(stats.tvCount).toBe(2);
	});

	it("counts watched, unwatched and favorites across both types", () => {
		expect(stats.watched).toBe(2); // Ran (last), Chernobyl (timesWatched)
		expect(stats.unwatched).toBe(2);
		expect(stats.favorites).toBe(1);
	});

	it("counts watching and dropped titles apart from watched and unwatched", () => {
		const withStatuses = engine.computeStats([
			...collection,
			makeTv({ id: "Lost", title: "Lost", currentEpisode: 2, last: "2024-02-01", watchStatus: "dropped" }),
			makeTv({ id: "Andor", title: "Andor", currentEpisode: 5 }),
		]);
		expect(withStatuses.dropped).toBe(1);
		expect(withStatuses.watching).toBe(1);
		expect(withStatuses.watched).toBe(2);
		expect(withStatuses.unwatched).toBe(2);
	});

	it("averages rating and imdb over rated items only", () => {
		expect(stats.avgRating).toBeCloseTo((10 + 9 + 8) / 3, 5);
		expect(stats.avgImdb).toBeCloseTo((8.2 + 8.3) / 2, 5);
	});

	it("sums total runtime counting TV episode runtime * episode count", () => {
		// 162 + 143 + 50*19 + 60*5 = 162 + 143 + 950 + 300
		expect(stats.totalRuntime).toBe(1555);
	});

	it("aggregates genres, networks and TV status", () => {
		expect(stats.genres["Drama"]).toBe(4);
		expect(stats.genres["Sci-Fi"]).toBe(1);
		expect(stats.networks["Apple TV+"]).toBe(1);
		expect(stats.networks["HBO"]).toBe(1);
		expect(stats.tvStatus.returning).toBe(1);
		expect(stats.tvStatus.ended).toBe(1);
		expect(stats.tvStatus.canceled).toBe(0);
	});

	it("counts unique creators and ranks top creators", () => {
		expect(stats.creators).toBe(3); // Kurosawa, Erickson, Mazin
		expect(stats.topCreators[0]).toMatchObject({ name: "Kurosawa", count: 2 });
	});
});

describe("cards + carousels", () => {
	it("merges directors and creators into creator cards", () => {
		const cards = engine.creatorCards(collection);
		const kurosawa = cards.find((c) => c.name === "Kurosawa");
		expect(kurosawa?.count).toBe(2);
		expect(cards.some((c) => c.name === "Erickson")).toBe(true);
	});

	it("builds actor cards from cast across both types", () => {
		const cards = engine.actorCards(collection);
		expect(cards.map((c) => c.name).sort()).toEqual(["Nakadai", "Scott"]);
	});

	it("selects in-progress TV shows for continue-watching", () => {
		const inProgress = makeTv({ id: "P", title: "P", episodes: 10, currentEpisode: 3, last: "2024-05-01" });
		const finished = makeTv({ id: "F", title: "F", episodes: 10, currentEpisode: 10 });
		const result = engine.continueWatching([...collection, inProgress, finished], 10);
		expect(result.map((m) => m.id)).toEqual(["P"]);
	});

	it("leaves dropped shows out of continue-watching", () => {
		const dropped = makeTv({ id: "D", title: "D", episodes: 10, currentEpisode: 3, last: "2024-05-01", watchStatus: "dropped" });
		expect(engine.continueWatching([...collection, dropped], 10).map((m) => m.id)).toEqual([]);
	});
});

describe("formatting", () => {
	it("formats aggregate runtime with days/hours/minutes", () => {
		expect(engine.formatRuntime(1555)).toBe("1d 1h 55m");
		expect(engine.formatRuntime(0)).toBe("0m");
	});

	it("formats a single title's runtime compactly", () => {
		expect(engine.formatItemRuntime(162)).toBe("2h 42m");
		expect(engine.formatItemRuntime(60)).toBe("1h");
		expect(engine.formatItemRuntime(45)).toBe("45m");
		expect(engine.formatItemRuntime(undefined)).toBe("");
	});
});
