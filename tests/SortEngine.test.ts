// ABOUTME: Unit tests for the sort engine across mixed movie/TV collections.
// ABOUTME: Covers title, year, score, rating, runtime and credit keys with missing-value handling.
import { describe, it, expect } from "vitest";
import { SortEngine } from "../src/services/SortEngine";
import { makeMovie, makeTv } from "./helpers";

const engine = new SortEngine();

const items = [
	makeMovie({ id: "Ran", title: "Ran", year: 1985, scoreImdb: 8.2, rating: 10, runtime: 162, director: ["Kurosawa"] }),
	makeTv({ id: "Fleabag", title: "Fleabag", year: 2016, scoreImdb: 8.7, rating: 9, episodeRuntime: 27, creator: ["Waller-Bridge"] }),
	makeMovie({ id: "Heat", title: "Heat", year: 1995, runtime: 170, director: ["Mann"] }),
];

describe("SortEngine", () => {
	it("sorts by title ascending and descending", () => {
		expect(engine.sort(items, "title", "asc").map((m) => m.id)).toEqual(["Fleabag", "Heat", "Ran"]);
		expect(engine.sort(items, "title", "desc").map((m) => m.id)).toEqual(["Ran", "Heat", "Fleabag"]);
	});

	it("sorts by year", () => {
		expect(engine.sort(items, "year", "asc").map((m) => m.id)).toEqual(["Ran", "Heat", "Fleabag"]);
	});

	it("sorts by imdb pushing missing scores last on desc", () => {
		expect(engine.sort(items, "scoreImdb", "desc").map((m) => m.id)).toEqual(["Fleabag", "Ran", "Heat"]);
	});

	it("sorts by rating with missing ratings last on desc", () => {
		expect(engine.sort(items, "rating", "desc").map((m) => m.id)).toEqual(["Ran", "Fleabag", "Heat"]);
	});

	it("sorts by runtime using per-title runtime for both types", () => {
		expect(engine.sort(items, "runtime", "asc").map((m) => m.id)).toEqual(["Fleabag", "Ran", "Heat"]);
	});

	it("sorts by credits (director/creator) alphabetically", () => {
		expect(engine.sort(items, "credits", "asc").map((m) => m.id)).toEqual(["Ran", "Heat", "Fleabag"]);
	});

	it("does not mutate the input array", () => {
		const before = items.map((m) => m.id);
		engine.sort(items, "title", "desc");
		expect(items.map((m) => m.id)).toEqual(before);
	});
});
