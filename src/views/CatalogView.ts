// ABOUTME: The catalog grid view: filterable, sortable, paginated grid of movies and TV shows.
// ABOUTME: Wires the filter sidebar and the filter/sort engines to a lazily rendered card grid.
import { setIcon } from "obsidian";
import type { MediaItem, FilterState, SortKey, SortDirection, ViewMode } from "../types";
import { MediaDataService } from "../services/MediaDataService";
import { FilterEngine } from "../services/FilterEngine";
import { SortEngine } from "../services/SortEngine";
import { createMediaCard } from "../components/MediaCard";
import { createFilterSidebar } from "../components/FilterSidebar";

const filterEngine = new FilterEngine();
const sortEngine = new SortEngine();
const PAGE_SIZE = 48;

export interface CatalogViewOptions {
	service: MediaDataService;
	onItemClick: (item: MediaItem) => void;
	onFavToggle: (item: MediaItem) => void;
	onMarkWatched: (item: MediaItem) => void;
	initialFilter?: Partial<FilterState>;
	initialTitle?: string;
}

export class CatalogView {
	private container!: HTMLElement;
	private grid!: HTMLElement;
	private countEl!: HTMLElement;
	private filter: FilterState;
	private sort: { key: SortKey; direction: SortDirection } = { key: "title", direction: "asc" };
	private viewMode: ViewMode = "grid-large";
	private opts: CatalogViewOptions;
	private sidebarOpen = true;
	private observer?: IntersectionObserver;
	private sortedItems: MediaItem[] = [];
	private renderedCount = 0;
	private gridEl?: HTMLElement;

	constructor(opts: CatalogViewOptions) {
		this.opts = opts;
		this.filter = {
			mediaType: "all",
			genres: [],
			status: "all",
			...opts.initialFilter,
		};
	}

	render(container: HTMLElement): void {
		this.container = container;
		container.innerHTML = "";
		container.className = "lmv-view lmv-view--catalog";

		const toolbar = document.createElement("div");
		toolbar.className = "lmv-toolbar";

		const leftTools = document.createElement("div");
		leftTools.className = "lmv-toolbar__left";

		const toggleSidebar = document.createElement("button");
		toggleSidebar.className = "lmv-btn lmv-btn--icon-plain";
		toggleSidebar.title = "Filters";
		setIcon(toggleSidebar, "sliders-horizontal");
		toggleSidebar.addEventListener("click", () => {
			this.sidebarOpen = !this.sidebarOpen;
			layout.classList.toggle("lmv-layout--no-sidebar", !this.sidebarOpen);
		});
		leftTools.appendChild(toggleSidebar);

		const searchInput = document.createElement("input");
		searchInput.type = "text";
		searchInput.placeholder = "Search title, director, creator, actor...";
		searchInput.className = "lmv-search-input";
		searchInput.value = this.filter.query ?? "";
		let searchTimeout: ReturnType<typeof setTimeout>;
		searchInput.addEventListener("input", () => {
			clearTimeout(searchTimeout);
			searchTimeout = setTimeout(() => {
				this.filter = { ...this.filter, query: searchInput.value };
				this.renderGrid();
			}, 200);
		});
		leftTools.appendChild(searchInput);

		this.countEl = document.createElement("span");
		this.countEl.className = "lmv-toolbar__count";
		leftTools.appendChild(this.countEl);

		toolbar.appendChild(leftTools);
		container.appendChild(toolbar);

		const layout = document.createElement("div");
		layout.className = `lmv-layout${this.sidebarOpen ? "" : " lmv-layout--no-sidebar"}`;

		const sidebarWrapper = document.createElement("div");
		sidebarWrapper.className = "lmv-layout__sidebar";

		const renderSidebar = () => {
			sidebarWrapper.innerHTML = "";
			const sidebar = createFilterSidebar({
				filter: this.filter,
				sort: this.sort,
				viewMode: this.viewMode,
				genres: this.opts.service.getAllGenres(),
				networks: this.opts.service.getAllNetworks(),
				onFilterChange: (f) => { this.filter = f; this.renderGrid(); renderSidebar(); },
				onSortChange: (key, dir) => { this.sort = { key, direction: dir }; this.renderGrid(); renderSidebar(); },
				onViewModeChange: (mode) => { this.viewMode = mode; this.renderGrid(); renderSidebar(); },
			});
			sidebarWrapper.appendChild(sidebar);
		};
		renderSidebar();

		layout.appendChild(sidebarWrapper);

		const gridWrapper = document.createElement("div");
		gridWrapper.className = "lmv-layout__content";
		this.grid = gridWrapper;
		layout.appendChild(gridWrapper);

		container.appendChild(layout);

		this.renderGrid();
	}

	private renderGrid(): void {
		this.observer?.disconnect();
		this.observer = undefined;

		this.grid.innerHTML = "";
		this.renderedCount = 0;

		const items = this.opts.service.items;
		const filtered = filterEngine.apply(items, this.filter);
		this.sortedItems = sortEngine.sort(filtered, this.sort.key, this.sort.direction);

		this.countEl.textContent = `${this.sortedItems.length} title${this.sortedItems.length !== 1 ? "s" : ""}`;

		if (this.sortedItems.length === 0) {
			const empty = document.createElement("div");
			empty.className = "lmv-empty";
			empty.innerHTML = `<p class="lmv-empty__msg">No results for these filters.</p>`;
			this.grid.appendChild(empty);
			return;
		}

		const modeClass = {
			"grid-large": "lmv-grid lmv-grid--large",
			"grid-compact": "lmv-grid lmv-grid--compact",
			"list": "lmv-list",
			"poster": "lmv-grid lmv-grid--poster",
		}[this.viewMode];

		this.gridEl = document.createElement("div");
		this.gridEl.className = modeClass;
		this.grid.appendChild(this.gridEl);

		this.renderNextBatch();
	}

	private renderNextBatch(): void {
		if (!this.gridEl) return;

		const size = this.viewMode === "grid-large" ? "normal"
			: this.viewMode === "grid-compact" ? "compact"
			: this.viewMode === "list" ? "list"
			: "poster";

		const start = this.renderedCount;
		const end = Math.min(start + PAGE_SIZE, this.sortedItems.length);
		const fragment = document.createDocumentFragment();

		for (let i = start; i < end; i++) {
			const card = createMediaCard({
				item: this.sortedItems[i],
				size,
				onClick: this.opts.onItemClick,
				onFavToggle: this.opts.onFavToggle,
				onMarkWatched: this.opts.onMarkWatched,
			});
			fragment.appendChild(card);
		}

		this.gridEl.appendChild(fragment);
		this.renderedCount = end;

		if (this.renderedCount >= this.sortedItems.length) return;

		const sentinel = document.createElement("div");
		sentinel.className = "lmv-sentinel";
		this.grid.appendChild(sentinel);

		this.observer = new IntersectionObserver((entries) => {
			if (entries[0].isIntersecting) {
				this.observer?.disconnect();
				this.observer = undefined;
				sentinel.remove();
				this.renderNextBatch();
			}
		}, { root: this.grid, rootMargin: "200px" });

		this.observer.observe(sentinel);
	}
}
