// ABOUTME: Shared test fixtures — a fake TFile and builders for Movie/TvShow items used across specs.
// ABOUTME: Keeps individual test files focused on assertions rather than object construction.
import type { TFile } from "obsidian";
import type { Movie, TvShow } from "../src/types";
import { parseWatchStatus } from "../src/parse";

export function fakeFile(basename: string): TFile {
	return { basename, extension: "md", path: `${basename}.md` } as unknown as TFile;
}

export function makeMovie(overrides: Partial<Movie> = {}): Movie {
	return {
		mediaType: "movie",
		id: overrides.id ?? overrides.title ?? "Movie",
		title: overrides.title ?? "Movie",
		file: fakeFile(overrides.id ?? overrides.title ?? "Movie"),
		writer: [],
		cast: [],
		genre: [],
		favorite: false,
		timesWatched: 0,
		// Inferred from the overrides exactly as the parser infers it from frontmatter,
		// so a fixture that sets `last` or `timesWatched` reads as watched without saying so.
		watchStatus: parseWatchStatus(overrides.watchStatus, overrides as Record<string, unknown>),
		tags: [],
		categories: ["Movies"],
		director: [],
		...overrides,
	};
}

export function makeTv(overrides: Partial<TvShow> = {}): TvShow {
	return {
		mediaType: "tv",
		id: overrides.id ?? overrides.title ?? "Show",
		title: overrides.title ?? "Show",
		file: fakeFile(overrides.id ?? overrides.title ?? "Show"),
		writer: [],
		cast: [],
		genre: [],
		favorite: false,
		timesWatched: 0,
		watchStatus: parseWatchStatus(overrides.watchStatus, overrides as Record<string, unknown>),
		tags: [],
		categories: ["TV Shows"],
		creator: [],
		...overrides,
	};
}
