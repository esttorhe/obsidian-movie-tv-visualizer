// ABOUTME: The root ItemView: nav sidebar plus a client-side router across all movie/TV views.
// ABOUTME: Owns the data service, persisted rank/all/tier orders, and shared item mutation handlers.
import { ItemView, WorkspaceLeaf, setIcon } from "obsidian";
import type { MediaItem } from "./types";
import { MediaDataService } from "./services/MediaDataService";
import { renderDashboard } from "./views/DashboardView";
import { CatalogView } from "./views/CatalogView";
import { renderMediaDetail } from "./views/MediaDetailView";
import { renderTopList } from "./views/TopListView";
import { renderCreators } from "./views/CreatorsView";
import { renderActors } from "./views/ActorsView";
import { renderPlaylists } from "./views/PlaylistView";
import { renderReviews } from "./views/ReviewsView";
import { renderStats } from "./views/StatsView";
import { renderSearch } from "./views/SearchView";
import { renderTierList, TierListData } from "./views/TierListView";

export const MEDIA_VIEW_TYPE = "movie-tv-visualizer";

type Route =
	| "dashboard"
	| "catalog"
	| "favorites"
	| "unwatched"
	| "watched"
	| "search"
	| "top"
	| "creators"
	| "actors"
	| "playlists"
	| "reviews"
	| "stats"
	| "tierlist"
	| "detail";

interface NavItem {
	id: Route;
	label: string;
	icon: string;
}

const NAV_ITEMS: NavItem[] = [
	{ id: "dashboard", label: "Dashboard", icon: "home" },
	{ id: "search", label: "Search", icon: "search" },
	{ id: "catalog", label: "Catalog", icon: "grid-2x2" },
	{ id: "favorites", label: "Favorites", icon: "heart" },
	{ id: "unwatched", label: "Unwatched", icon: "eye-off" },
	{ id: "watched", label: "Watched", icon: "check-circle" },
	{ id: "top", label: "Top Lists", icon: "trophy" },
	{ id: "creators", label: "Directors & Creators", icon: "clapperboard" },
	{ id: "actors", label: "Actors", icon: "users" },
	{ id: "playlists", label: "Playlists", icon: "list" },
	{ id: "reviews", label: "My Reviews", icon: "file-text" },
	{ id: "stats", label: "Stats", icon: "bar-chart-2" },
	{ id: "tierlist", label: "Tier List", icon: "layout-list" },
];

const PLUGIN_DIR = ".obsidian/plugins/movie-tv-visualizer";
const RANK_ORDER_PATH = `${PLUGIN_DIR}/rank-order.json`;
const ALL_ORDER_PATH = `${PLUGIN_DIR}/all-order.json`;
const TIERLIST_PATH = `${PLUGIN_DIR}/tierlist.json`;

export class MediaVisualizerView extends ItemView {
	private service!: MediaDataService;
	private currentRoute: Route = "dashboard";
	private navEl!: HTMLElement;
	private viewContentEl!: HTMLElement;
	private unsubscribe?: () => void;
	private rankOrder: string[] = [];
	private allOrder: string[] = [];
	private tierListData: TierListData = { tiers: [] };

	constructor(leaf: WorkspaceLeaf) {
		super(leaf);
	}

	getViewType(): string {
		return MEDIA_VIEW_TYPE;
	}

	getDisplayText(): string {
		return "Movie & TV Visualizer";
	}

	getIcon(): string {
		return "clapperboard";
	}

	async onOpen(): Promise<void> {
		this.service = new MediaDataService(this.app);
		await this.service.init();

		this.rankOrder = await this.readJson<string[]>(RANK_ORDER_PATH, []);
		this.allOrder = await this.readJson<string[]>(ALL_ORDER_PATH, []);
		this.tierListData = await this.readJson<TierListData>(TIERLIST_PATH, { tiers: [] });

		const root = this.containerEl.children[1] as HTMLElement;
		root.empty();
		root.addClass("lmv-root");

		this.navEl = root.createDiv("lmv-nav");
		this.buildNav();

		this.viewContentEl = root.createDiv("lmv-content");

		this.unsubscribe = this.service.subscribe(() => {
			if (this.currentRoute !== "detail") this.renderRoute(this.currentRoute);
		});

		this.renderRoute("dashboard");
	}

	async onClose(): Promise<void> {
		this.unsubscribe?.();
		this.service?.destroy();
	}

	private async readJson<T>(path: string, fallback: T): Promise<T> {
		try {
			const raw = await this.app.vault.adapter.read(path);
			return JSON.parse(raw) as T;
		} catch {
			return fallback;
		}
	}

	private buildNav(): void {
		this.navEl.empty();

		const logo = this.navEl.createDiv("lmv-nav__logo");
		const logoIcon = logo.createSpan("lmv-nav__logo-icon");
		setIcon(logoIcon, "clapperboard");
		logo.createSpan("lmv-nav__logo-text").setText("Movie & TV");

		const stats = this.service.getStats();
		const badge = this.navEl.createDiv("lmv-nav__badge");
		badge.innerHTML = `<span>${stats.movieCount} movies · ${stats.tvCount} shows</span>`;

		const items = this.navEl.createDiv("lmv-nav__items");
		NAV_ITEMS.forEach(({ id, label, icon }) => {
			const item = items.createDiv(`lmv-nav__item${this.currentRoute === id ? " lmv-nav__item--active" : ""}`);
			item.dataset.route = id;

			const iconEl = item.createSpan("lmv-nav__item-icon");
			setIcon(iconEl, icon);

			item.createSpan("lmv-nav__item-label").setText(label);

			item.addEventListener("click", () => {
				if (id === this.currentRoute) return;
				this.navigateTo(id);
			});
		});
	}

	private navigateTo(route: Route, data?: unknown): void {
		this.currentRoute = route;

		this.navEl.querySelectorAll(".lmv-nav__item").forEach((el) => {
			const r = (el as HTMLElement).dataset.route;
			el.classList.toggle("lmv-nav__item--active", r === route);
		});

		this.viewContentEl.classList.add("lmv-content--exit");
		setTimeout(() => {
			this.viewContentEl.classList.remove("lmv-content--exit");
			this.renderRoute(route, data);
			this.viewContentEl.classList.add("lmv-content--enter");
			setTimeout(() => this.viewContentEl.classList.remove("lmv-content--enter"), 300);
		}, 150);
	}

	private renderRoute(route: Route, data?: unknown): void {
		const nav = (r: Route, d?: unknown) => this.navigateTo(r, d);

		const handlers = {
			onItemClick: (item: MediaItem) => this.openDetail(item),
			onFavToggle: async (item: MediaItem) => {
				const newVal = !item.favorite;
				item.favorite = newVal;
				await this.service.updateField(item, { favorite: newVal });
			},
			onMarkWatched: async (item: MediaItem) => {
				const alreadyWatched = !!(item.last || item.timesWatched > 0);
				if (alreadyWatched) {
					item.last = "";
					item.timesWatched = 0;
					await this.service.updateField(item, { last: "", timesWatched: 0 });
				} else {
					const today = new Date().toISOString().split("T")[0];
					const newCount = item.timesWatched + 1;
					item.last = today;
					item.timesWatched = newCount;
					await this.service.updateField(item, { last: today, timesWatched: newCount });
				}
			},
		};

		switch (route) {
			case "dashboard":
				renderDashboard(this.viewContentEl, {
					service: this.service,
					...handlers,
					onViewAll: (r) => nav(r as Route),
				});
				break;

			case "catalog":
				new CatalogView({ service: this.service, ...handlers }).render(this.viewContentEl);
				break;

			case "favorites":
				new CatalogView({
					service: this.service,
					...handlers,
					initialFilter: { mediaType: "all", genres: [], status: "favorites" },
				}).render(this.viewContentEl);
				break;

			case "unwatched":
				new CatalogView({
					service: this.service,
					...handlers,
					initialFilter: { mediaType: "all", genres: [], status: "unwatched" },
				}).render(this.viewContentEl);
				break;

			case "watched":
				new CatalogView({
					service: this.service,
					...handlers,
					initialFilter: { mediaType: "all", genres: [], status: "watched" },
				}).render(this.viewContentEl);
				break;

			case "search":
				renderSearch(this.viewContentEl, { service: this.service, ...handlers });
				break;

			case "top":
				renderTopList(this.viewContentEl, {
					service: this.service,
					...handlers,
					customOrder: this.rankOrder,
					onSaveOrder: async (ids: string[]) => {
						this.rankOrder = ids;
						await this.app.vault.adapter.write(RANK_ORDER_PATH, JSON.stringify(ids));
					},
					allOrder: this.allOrder,
					onSaveAllOrder: async (ids: string[]) => {
						this.allOrder = ids;
						await this.app.vault.adapter.write(ALL_ORDER_PATH, JSON.stringify(ids));
					},
				});
				break;

			case "creators":
				renderCreators(this.viewContentEl, { service: this.service, ...handlers });
				break;

			case "actors":
				renderActors(this.viewContentEl, { service: this.service, ...handlers });
				break;

			case "playlists":
				renderPlaylists(this.viewContentEl, { app: this.app, service: this.service, ...handlers });
				break;

			case "reviews":
				renderReviews(this.viewContentEl, { service: this.service, onItemClick: handlers.onItemClick });
				break;

			case "stats":
				renderStats(this.viewContentEl, this.service);
				break;

			case "tierlist":
				renderTierList(this.viewContentEl, {
					service: this.service,
					onItemClick: (item) => this.openDetail(item),
					savedData: this.tierListData,
					onSave: async (dataToSave) => {
						this.tierListData = dataToSave;
						await this.app.vault.adapter.write(TIERLIST_PATH, JSON.stringify(dataToSave));
					},
				});
				break;

			case "detail":
				if (data instanceof Object && "id" in data) {
					const item = this.service.getById((data as MediaItem).id);
					if (item) {
						renderMediaDetail(this.viewContentEl, {
							item,
							service: this.service,
							onBack: () => nav("catalog"),
							onItemClick: handlers.onItemClick,
							onFavToggle: handlers.onFavToggle,
						});
					}
				}
				break;
		}
	}

	private openDetail(item: MediaItem): void {
		this.currentRoute = "detail";
		this.navEl.querySelectorAll(".lmv-nav__item").forEach((el) => {
			el.classList.remove("lmv-nav__item--active");
		});

		this.viewContentEl.classList.add("lmv-content--exit");
		setTimeout(() => {
			this.viewContentEl.classList.remove("lmv-content--exit");
			renderMediaDetail(this.viewContentEl, {
				item,
				service: this.service,
				onBack: () => this.navigateTo("catalog"),
				onItemClick: (m) => this.openDetail(m),
				onFavToggle: async (m) => {
					await this.service.updateField(m, { favorite: !m.favorite });
				},
			});
			this.viewContentEl.classList.add("lmv-content--enter");
			setTimeout(() => this.viewContentEl.classList.remove("lmv-content--enter"), 300);
		}, 150);
	}
}
