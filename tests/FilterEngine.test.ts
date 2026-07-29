// ABOUTME: Unit tests for the filter engine across mixed movie/TV collections.
// ABOUTME: Covers media-type, genre, status, year, rating, runtime, credit, cast and network filters.
import { describe, it, expect } from "vitest";
import { FilterEngine } from "../src/services/FilterEngine";
import type { FilterState } from "../src/types";
import { makeMovie, makeTv } from "./helpers";

const engine = new FilterEngine();

function base(overrides: Partial<FilterState> = {}): FilterState {
	return { mediaType: "all", genres: [], status: "all", ...overrides };
}

const collection = [
	makeMovie({ id: "Ran", title: "Ran", year: 1985, genre: ["Drama"], director: ["Kurosawa"], rating: 10, scoreImdb: 8.2, runtime: 162, last: "2024-01-01" }),
	makeMovie({ id: "Heat", title: "Heat", year: 1995, genre: ["Crime"], director: ["Mann"], cast: ["Pacino"], runtime: 170 }),
	makeTv({ id: "Severance", title: "Severance", year: 2022, genre: ["Drama"], creator: ["Erickson"], network: "Apple TV+", episodeRuntime: 50, favorite: true }),
	makeTv({ id: "Fleabag", title: "Fleabag", year: 2016, genre: ["Comedy"], creator: ["Waller-Bridge"], network: "BBC", episodeRuntime: 27, timesWatched: 3 }),
];

describe("FilterEngine media-type filter", () => {
	it("filters to movies only", () => {
		const r = engine.apply(collection, base({ mediaType: "movie" }));
		expect(r.map((m) => m.id).sort()).toEqual(["Heat", "Ran"]);
	});

	it("filters to TV only", () => {
		const r = engine.apply(collection, base({ mediaType: "tv" }));
		expect(r.map((m) => m.id).sort()).toEqual(["Fleabag", "Severance"]);
	});

	it("returns everything for 'all'", () => {
		expect(engine.apply(collection, base()).length).toBe(4);
	});
});

describe("FilterEngine common filters", () => {
	it("filters by genre across both media types", () => {
		const r = engine.apply(collection, base({ genres: ["Drama"] }));
		expect(r.map((m) => m.id).sort()).toEqual(["Ran", "Severance"]);
	});

	it("filters watched vs unwatched using media accessors", () => {
		expect(engine.apply(collection, base({ status: "watched" })).map((m) => m.id).sort()).toEqual(["Fleabag", "Ran"]);
		expect(engine.apply(collection, base({ status: "unwatched" })).map((m) => m.id).sort()).toEqual(["Heat", "Severance"]);
	});

	it("filters favorites", () => {
		expect(engine.apply(collection, base({ status: "favorites" })).map((m) => m.id)).toEqual(["Severance"]);
	});

	it("filters by year range", () => {
		expect(engine.apply(collection, base({ yearMin: 2000 })).map((m) => m.id).sort()).toEqual(["Fleabag", "Severance"]);
		expect(engine.apply(collection, base({ yearMax: 1999 })).map((m) => m.id).sort()).toEqual(["Heat", "Ran"]);
	});

	it("filters by minimum imdb and rating range", () => {
		expect(engine.apply(collection, base({ imdbMin: 8 })).map((m) => m.id)).toEqual(["Ran"]);
		expect(engine.apply(collection, base({ ratingMin: 9 })).map((m) => m.id)).toEqual(["Ran"]);
	});

	it("filters by runtime bucket using per-title runtime", () => {
		// Both TV shows have short per-episode runtimes (27m, 50m); movies are long.
		expect(engine.apply(collection, base({ runtimeFilter: "short" })).map((m) => m.id).sort()).toEqual(["Fleabag", "Severance"]);
		expect(engine.apply(collection, base({ runtimeFilter: "long" })).map((m) => m.id).sort()).toEqual(["Heat", "Ran"]);
	});

	it("filters by credit (director or creator)", () => {
		expect(engine.apply(collection, base({ credit: "kurosawa" })).map((m) => m.id)).toEqual(["Ran"]);
		expect(engine.apply(collection, base({ credit: "Erickson" })).map((m) => m.id)).toEqual(["Severance"]);
	});

	it("filters by cast and network", () => {
		expect(engine.apply(collection, base({ cast: "Pacino" })).map((m) => m.id)).toEqual(["Heat"]);
		expect(engine.apply(collection, base({ network: "BBC" })).map((m) => m.id)).toEqual(["Fleabag"]);
	});

	it("matches free-text query across titles, credits and cast", () => {
		expect(engine.apply(collection, base({ query: "waller" })).map((m) => m.id)).toEqual(["Fleabag"]);
		expect(engine.apply(collection, base({ query: "sev" })).map((m) => m.id)).toEqual(["Severance"]);
	});
});
