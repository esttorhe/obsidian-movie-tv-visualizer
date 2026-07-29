// ABOUTME: Unit tests for the frontmatter coercion helpers and the movie/TV item builder.
// ABOUTME: Covers wikilinks, malformed runtimes, missing fields and media-type detection.
import { describe, it, expect } from "vitest";
import {
	stripWikilink,
	toStringArray,
	toNumber,
	parseRuntime,
	toStr,
	toBool,
	parseTvStatus,
	detectMediaType,
	buildMediaItem,
} from "../src/parse";
import { fakeFile } from "./helpers";

describe("coercion helpers", () => {
	it("strips wikilink syntax", () => {
		expect(stripWikilink("[[Akira Kurosawa]]")).toBe("Akira Kurosawa");
		expect(stripWikilink("plain")).toBe("plain");
	});

	it("coerces to string arrays and strips wikilinks per element", () => {
		expect(toStringArray(["[[A]]", "B"])).toEqual(["A", "B"]);
		expect(toStringArray("Solo")).toEqual(["Solo"]);
		expect(toStringArray(null)).toEqual([]);
		expect(toStringArray("")).toEqual([]);
		expect(toStringArray([1, 2])).toEqual(["1", "2"]);
	});

	it("drops empty entries inside arrays", () => {
		expect(toStringArray(["A", "", null, "B"])).toEqual(["A", "B"]);
	});

	it("coerces numbers, returning undefined for junk", () => {
		expect(toNumber("8.2")).toBe(8.2);
		expect(toNumber(97)).toBe(97);
		expect(toNumber("")).toBeUndefined();
		expect(toNumber(null)).toBeUndefined();
		expect(toNumber("not-a-number")).toBeUndefined();
	});

	it("coerces booleans from real and string values", () => {
		expect(toBool(true)).toBe(true);
		expect(toBool("true")).toBe(true);
		expect(toBool(false)).toBe(false);
		expect(toBool("nope")).toBe(false);
		expect(toBool(undefined)).toBe(false);
	});

	it("returns undefined string for empty values", () => {
		expect(toStr("x")).toBe("x");
		expect(toStr("")).toBeUndefined();
		expect(toStr(null)).toBeUndefined();
		expect(toStr(0)).toBe("0");
	});
});

describe("parseRuntime", () => {
	it("parses ISO 8601 durations", () => {
		expect(parseRuntime("PT2H42M")).toBe(162);
		expect(parseRuntime("PT90M")).toBe(90);
		expect(parseRuntime("PT1H")).toBe(60);
	});

	it("parses plain minutes and numbers", () => {
		expect(parseRuntime(162)).toBe(162);
		expect(parseRuntime("162")).toBe(162);
	});

	it("parses human text durations", () => {
		expect(parseRuntime("2h 30m")).toBe(150);
		expect(parseRuntime("1h")).toBe(60);
		expect(parseRuntime("45m")).toBe(45);
	});

	it("returns undefined for malformed or empty runtime strings", () => {
		expect(parseRuntime("")).toBeUndefined();
		expect(parseRuntime(null)).toBeUndefined();
		expect(parseRuntime(undefined)).toBeUndefined();
		expect(parseRuntime("garbage")).toBeUndefined();
	});
});

describe("parseTvStatus", () => {
	it("normalizes assorted status spellings", () => {
		expect(parseTvStatus("Returning Series")).toBe("returning");
		expect(parseTvStatus("ongoing")).toBe("returning");
		expect(parseTvStatus("Ended")).toBe("ended");
		expect(parseTvStatus("Canceled")).toBe("canceled");
		expect(parseTvStatus("cancelled")).toBe("canceled");
		expect(parseTvStatus("")).toBeUndefined();
		expect(parseTvStatus("weird")).toBeUndefined();
	});
});

describe("detectMediaType", () => {
	it("detects movies case-insensitively", () => {
		expect(detectMediaType(["Movies"])).toBe("movie");
		expect(detectMediaType(["movies"])).toBe("movie");
		expect(detectMediaType(["My Movies list"])).toBe("movie");
	});

	it("detects TV shows case-insensitively and prefers TV when both present", () => {
		expect(detectMediaType(["TV Shows"])).toBe("tv");
		expect(detectMediaType(["tv"])).toBe("tv");
		expect(detectMediaType(["tv series"])).toBe("tv");
		expect(detectMediaType(["TV Shows", "Movies"])).toBe("tv");
	});

	it("returns undefined for unrelated categories", () => {
		expect(detectMediaType(["Books"])).toBeUndefined();
		expect(detectMediaType([])).toBeUndefined();
	});
});

describe("buildMediaItem", () => {
	const file = fakeFile("Ran");

	it("builds a movie with runtime and director", () => {
		const item = buildMediaItem(
			{
				title: "Ran",
				year: 1985,
				runtime: "PT2H42M",
				director: ["[[Akira Kurosawa]]"],
				categories: ["Movies"],
				scoreImdb: "8.2",
				favorite: "true",
			},
			"Ran",
			file
		);
		expect(item).not.toBeNull();
		expect(item!.mediaType).toBe("movie");
		if (item!.mediaType === "movie") {
			expect(item!.runtime).toBe(162);
			expect(item!.director).toEqual(["Akira Kurosawa"]);
		}
		expect(item!.year).toBe(1985);
		expect(item!.scoreImdb).toBe(8.2);
		expect(item!.favorite).toBe(true);
	});

	it("builds a TV show with creator, seasons and progress", () => {
		const item = buildMediaItem(
			{
				title: "Severance",
				year: 2022,
				creator: ["Dan Erickson"],
				status: "Returning Series",
				seasons: 2,
				episodes: 19,
				episodeRuntime: "PT50M",
				network: "Apple TV+",
				currentSeason: 2,
				currentEpisode: 4,
				categories: ["TV Shows"],
			},
			"Severance",
			fakeFile("Severance")
		);
		expect(item!.mediaType).toBe("tv");
		if (item!.mediaType === "tv") {
			expect(item!.creator).toEqual(["Dan Erickson"]);
			expect(item!.status).toBe("returning");
			expect(item!.seasons).toBe(2);
			expect(item!.episodes).toBe(19);
			expect(item!.episodeRuntime).toBe(50);
			expect(item!.network).toBe("Apple TV+");
			expect(item!.currentSeason).toBe(2);
			expect(item!.currentEpisode).toBe(4);
		}
	});

	it("falls back to the note id for a missing title and tolerates missing fields", () => {
		const item = buildMediaItem({ categories: ["Movies"] }, "Untitled Note", file);
		expect(item!.title).toBe("Untitled Note");
		expect(item!.timesWatched).toBe(0);
		expect(item!.favorite).toBe(false);
		if (item!.mediaType === "movie") {
			expect(item!.director).toEqual([]);
			expect(item!.runtime).toBeUndefined();
		}
	});

	it("returns null for notes that are neither movies nor TV shows", () => {
		expect(buildMediaItem({ categories: ["Books"] }, "A Book", file)).toBeNull();
		expect(buildMediaItem({}, "No Categories", file)).toBeNull();
	});
});
