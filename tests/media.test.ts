// ABOUTME: Unit tests for the shared media accessors that let views treat movies and TV shows alike.
// ABOUTME: Covers credits, runtime normalization, watched state and TV progress helpers.
import { describe, it, expect } from "vitest";
import {
	isMovie,
	isTv,
	credits,
	displayRuntime,
	totalRuntime,
	isWatched,
	mediaLabel,
	progressLabel,
	tvProgressFraction,
} from "../src/media";
import { makeMovie, makeTv } from "./helpers";

describe("type guards and credits", () => {
	it("discriminates the union", () => {
		expect(isMovie(makeMovie())).toBe(true);
		expect(isTv(makeTv())).toBe(true);
		expect(isMovie(makeTv())).toBe(false);
	});

	it("returns directors for movies and creators for TV", () => {
		expect(credits(makeMovie({ director: ["Kurosawa"] }))).toEqual(["Kurosawa"]);
		expect(credits(makeTv({ creator: ["Erickson"] }))).toEqual(["Erickson"]);
	});
});

describe("runtime accessors", () => {
	it("uses full runtime for movies and per-episode runtime for TV", () => {
		expect(displayRuntime(makeMovie({ runtime: 120 }))).toBe(120);
		expect(displayRuntime(makeTv({ episodeRuntime: 50 }))).toBe(50);
	});

	it("computes total viewing time across the whole show", () => {
		expect(totalRuntime(makeMovie({ runtime: 120 }))).toBe(120);
		expect(totalRuntime(makeTv({ episodeRuntime: 50, episodes: 10 }))).toBe(500);
		expect(totalRuntime(makeTv({ episodeRuntime: 50 }))).toBe(0);
		expect(totalRuntime(makeMovie({}))).toBe(0);
	});
});

describe("watched + labels", () => {
	it("treats a last-watched date or positive count as watched", () => {
		expect(isWatched(makeMovie({ last: "2024-01-01" }))).toBe(true);
		expect(isWatched(makeMovie({ timesWatched: 2 }))).toBe(true);
		expect(isWatched(makeMovie({}))).toBe(false);
	});

	it("labels media type", () => {
		expect(mediaLabel(makeMovie())).toBe("Movie");
		expect(mediaLabel(makeTv())).toBe("TV Show");
	});
});

describe("tv progress", () => {
	it("builds a SxEx progress label when progress is recorded", () => {
		expect(progressLabel(makeTv({ currentSeason: 2, currentEpisode: 4 }))).toBe("S2E4");
		expect(progressLabel(makeTv({ currentEpisode: 3 }))).toBe("S1E3");
		expect(progressLabel(makeTv({}))).toBeNull();
	});

	it("computes a clamped progress fraction", () => {
		expect(tvProgressFraction(makeTv({ episodes: 10, currentEpisode: 5 }))).toBe(0.5);
		expect(tvProgressFraction(makeTv({ episodes: 10, currentEpisode: 99 }))).toBe(1);
		expect(tvProgressFraction(makeTv({ currentEpisode: 5 }))).toBeNull();
		expect(tvProgressFraction(makeTv({ episodes: 0, currentEpisode: 1 }))).toBeNull();
	});
});
