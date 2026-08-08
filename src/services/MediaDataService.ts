// ABOUTME: Indexes vault notes categorized as movies or TV shows into an in-memory MediaItem map.
// ABOUTME: Watches metadata/vault changes and writes user edits back via fileManager.processFrontMatter.
import { App, TFile } from "obsidian";
import type { MediaItem, TvShow, VaultStats, CreatorCard, ActorCard } from "../types";
import { buildMediaItem } from "../parse";
import { credits, isTv } from "../media";
import { StatsEngine } from "./StatsEngine";

type MovieMutable = Partial<Pick<MediaItem, "rating" | "favorite" | "watchStatus" | "last" | "timesWatched" | "review" | "mood">>;
type TvMutable = Partial<Pick<TvShow, "currentSeason" | "currentEpisode">>;
type MediaMutation = MovieMutable & TvMutable;

export class MediaDataService {
	private app: App;
	private _items: Map<string, MediaItem> = new Map();
	private stats = new StatsEngine();
	private listeners: Set<() => void> = new Set();
	private eventRef: ReturnType<App["metadataCache"]["on"]> | null = null;
	private vaultEventRef: ReturnType<App["vault"]["on"]> | null = null;

	constructor(app: App) {
		this.app = app;
	}

	async init(): Promise<void> {
		await this.indexAll();

		this.eventRef = this.app.metadataCache.on("changed", (file) => {
			if (file.extension !== "md") return;
			this.indexFile(file);
			this.notify();
		});

		this.vaultEventRef = this.app.vault.on("delete", (file) => {
			if (!(file instanceof TFile)) return;
			if (this._items.has(file.basename)) {
				this._items.delete(file.basename);
				this.notify();
			}
		});
	}

	destroy(): void {
		if (this.eventRef) this.app.metadataCache.offref(this.eventRef);
		if (this.vaultEventRef) this.app.vault.offref(this.vaultEventRef);
	}

	private async indexAll(): Promise<void> {
		const files = this.app.vault.getMarkdownFiles();
		for (const file of files) {
			this.indexFile(file);
		}
	}

	private indexFile(file: TFile): void {
		const cache = this.app.metadataCache.getFileCache(file);
		if (!cache?.frontmatter) {
			this._items.delete(file.basename);
			return;
		}

		const item = buildMediaItem(cache.frontmatter as Record<string, unknown>, file.basename, file);
		if (!item) {
			this._items.delete(file.basename);
			return;
		}
		this._items.set(file.basename, item);
	}

	get items(): MediaItem[] {
		return Array.from(this._items.values());
	}

	getById(id: string): MediaItem | undefined {
		return this._items.get(id);
	}

	getByCredit(name: string): MediaItem[] {
		return this.items.filter((m) =>
			credits(m).some((d) => d.toLowerCase() === name.toLowerCase())
		);
	}

	search(query: string): MediaItem[] {
		const q = query.toLowerCase();
		return this.items.filter(
			(m) =>
				m.title.toLowerCase().includes(q) ||
				credits(m).some((d) => d.toLowerCase().includes(q)) ||
				m.cast.some((c) => c.toLowerCase().includes(q)) ||
				m.genre.some((g) => g.toLowerCase().includes(q)) ||
				(m.plot ?? "").toLowerCase().includes(q)
		);
	}

	getAllGenres(): string[] {
		const set = new Set<string>();
		for (const m of this.items) m.genre.forEach((g) => set.add(g));
		return Array.from(set).sort();
	}

	getAllCredits(): string[] {
		const set = new Set<string>();
		for (const m of this.items) credits(m).forEach((d) => set.add(d));
		return Array.from(set).sort();
	}

	getAllNetworks(): string[] {
		const set = new Set<string>();
		for (const m of this.items) {
			if (isTv(m) && m.network) set.add(m.network);
		}
		return Array.from(set).sort();
	}

	getCreatorCards(): CreatorCard[] {
		return this.stats.creatorCards(this.items);
	}

	getActorCards(): ActorCard[] {
		return this.stats.actorCards(this.items);
	}

	getStats(): VaultStats {
		return this.stats.computeStats(this.items);
	}

	async updateField(item: MediaItem, updates: MediaMutation): Promise<void> {
		await this.app.fileManager.processFrontMatter(item.file, (fm) => {
			if (updates.rating !== undefined) fm.rating = updates.rating;
			if (updates.favorite !== undefined) fm.favorite = updates.favorite;
			if (updates.watchStatus !== undefined) fm.watchStatus = updates.watchStatus;
			if (updates.last !== undefined) fm.last = updates.last;
			if (updates.timesWatched !== undefined) fm.timesWatched = updates.timesWatched;
			if (updates.review !== undefined) fm.review = updates.review;
			if (updates.mood !== undefined) fm.mood = updates.mood;
			if (updates.currentSeason !== undefined) fm.currentSeason = updates.currentSeason;
			if (updates.currentEpisode !== undefined) fm.currentEpisode = updates.currentEpisode;
		});
	}

	subscribe(fn: () => void): () => void {
		this.listeners.add(fn);
		return () => this.listeners.delete(fn);
	}

	private notify(): void {
		this.listeners.forEach((fn) => fn());
	}
}
