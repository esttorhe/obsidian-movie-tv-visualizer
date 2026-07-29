// ABOUTME: Core data model for the plugin: the Movie/TvShow discriminated union and shared UI state types.
// ABOUTME: Movies and TV shows share a common base and are distinguished by the `mediaType` discriminator.
import type { TFile } from "obsidian";

export type MediaType = "movie" | "tv";

export type TvStatus = "returning" | "ended" | "canceled";

export interface MediaBase {
	// Identity
	mediaType: MediaType;
	id: string;
	title: string;
	titleOriginal?: string;
	file: TFile;
	imdbId?: string;

	// Production (shared)
	year?: number;
	country?: string;
	language?: string;
	writer: string[];
	cast: string[];
	genre: string[];
	productionCompany?: string;

	// Scores
	scoreImdb?: number;
	scoreRT?: number;
	scoreMetacritic?: number;
	rating?: number; // user 1–10

	// Visual
	cover?: string;
	coverBackdrop?: string;
	trailer?: string;

	// User state
	favorite: boolean;
	watchlist?: string; // ISO date
	last?: string; // ISO date last watched
	timesWatched: number;
	review?: string;
	mood?: string;

	// Meta
	plot?: string;
	awards?: string;
	tags: string[];
	created?: string;
	categories: string[];
}

export interface Movie extends MediaBase {
	mediaType: "movie";
	runtime?: number; // minutes
	director: string[];
}

export interface TvShow extends MediaBase {
	mediaType: "tv";
	creator: string[];
	yearEnd?: number;
	status?: TvStatus;
	seasons?: number;
	episodes?: number;
	episodeRuntime?: number; // minutes per episode
	network?: string;
	currentSeason?: number;
	currentEpisode?: number;
}

export type MediaItem = Movie | TvShow;

export type MediaFilter = "all" | "movie" | "tv";

export type SortKey =
	| "title"
	| "year"
	| "scoreImdb"
	| "scoreRT"
	| "rating"
	| "runtime"
	| "last"
	| "watchlist"
	| "timesWatched"
	| "credits";

export type SortDirection = "asc" | "desc";

export type ViewMode = "grid-large" | "grid-compact" | "list" | "poster";

export type StatusFilter = "all" | "unwatched" | "watched" | "favorites";

export interface FilterState {
	mediaType: MediaFilter;
	genres: string[];
	status: StatusFilter;
	yearMin?: number;
	yearMax?: number;
	ratingMin?: number;
	ratingMax?: number;
	imdbMin?: number;
	runtimeFilter?: "short" | "normal" | "long";
	credit?: string; // director or creator, exact match
	cast?: string;
	network?: string;
	query?: string;
}

export interface SortState {
	key: SortKey;
	direction: SortDirection;
}

export interface RouteState {
	path: string;
	params: Record<string, string>;
}

export interface Playlist {
	id: string;
	name: string;
	description?: string;
	itemIds: string[];
	created: string;
}

export interface VaultStats {
	total: number;
	movieCount: number;
	tvCount: number;
	watched: number;
	unwatched: number;
	favorites: number;
	avgRating: number;
	avgImdb: number;
	totalRuntime: number; // minutes
	creators: number;
	genres: Record<string, number>;
	byYear: Record<number, number>;
	ratingDist: Record<number, number>;
	topCreators: { name: string; count: number; avgRating: number }[];
	networks: Record<string, number>;
	tvStatus: Record<TvStatus, number>;
}

export interface CreatorCard {
	name: string;
	count: number;
	avgRating: number;
	avgImdb: number;
	items: MediaItem[];
	cover?: string;
}

export interface ActorCard {
	name: string;
	count: number;
	avgRating: number;
	avgImdb: number;
	items: MediaItem[];
	cover?: string;
}
