// ABOUTME: Catalog sidebar with media-type, view mode, sort, status, genre, runtime and network controls.
// ABOUTME: Emits immutable FilterState updates back to the CatalogView on every change.
import type { FilterState, SortKey, SortDirection, ViewMode, MediaFilter } from "../types";

export interface FilterSidebarOptions {
	filter: FilterState;
	sort: { key: SortKey; direction: SortDirection };
	viewMode: ViewMode;
	genres: string[];
	networks: string[];
	onFilterChange: (f: FilterState) => void;
	onSortChange: (key: SortKey, dir: SortDirection) => void;
	onViewModeChange: (mode: ViewMode) => void;
}

export function createFilterSidebar(opts: FilterSidebarOptions): HTMLElement {
	const { filter, sort, viewMode, genres, networks, onFilterChange, onSortChange, onViewModeChange } = opts;

	const sidebar = document.createElement("div");
	sidebar.className = "lmv-sidebar";

	// Media-type filter
	const typeSection = buildSection(sidebar, "Type");
	const typeOptions: { value: MediaFilter; label: string }[] = [
		{ value: "all", label: "All" },
		{ value: "movie", label: "Movies" },
		{ value: "tv", label: "TV Shows" },
	];
	const typeGroup = document.createElement("div");
	typeGroup.className = "lmv-status-group";
	typeOptions.forEach(({ value, label }) => {
		const btn = document.createElement("button");
		btn.className = `lmv-status-btn${filter.mediaType === value ? " lmv-status-btn--active" : ""}`;
		btn.textContent = label;
		btn.addEventListener("click", () => {
			typeGroup.querySelectorAll(".lmv-status-btn").forEach((b) => b.classList.remove("lmv-status-btn--active"));
			btn.classList.add("lmv-status-btn--active");
			onFilterChange({ ...filter, mediaType: value });
		});
		typeGroup.appendChild(btn);
	});
	typeSection.appendChild(typeGroup);

	// View mode toggle
	const viewGroup = buildSection(sidebar, "View");
	const viewModes: { mode: ViewMode; label: string; icon: string }[] = [
		{ mode: "grid-large", label: "Grid", icon: "⊞" },
		{ mode: "grid-compact", label: "Compact", icon: "⊟" },
		{ mode: "list", label: "List", icon: "≡" },
		{ mode: "poster", label: "Posters", icon: "▦" },
	];
	const vmGroup = document.createElement("div");
	vmGroup.className = "lmv-view-mode-group";
	viewModes.forEach(({ mode, label, icon }) => {
		const btn = document.createElement("button");
		btn.className = `lmv-view-mode-btn${viewMode === mode ? " lmv-view-mode-btn--active" : ""}`;
		btn.title = label;
		btn.textContent = icon;
		btn.addEventListener("click", () => {
			vmGroup.querySelectorAll(".lmv-view-mode-btn").forEach((b) => b.classList.remove("lmv-view-mode-btn--active"));
			btn.classList.add("lmv-view-mode-btn--active");
			onViewModeChange(mode);
		});
		vmGroup.appendChild(btn);
	});
	viewGroup.appendChild(vmGroup);

	// Sort
	const sortSection = buildSection(sidebar, "Sort");
	const sortKeys: { key: SortKey; label: string }[] = [
		{ key: "title", label: "Title" },
		{ key: "year", label: "Year" },
		{ key: "scoreImdb", label: "IMDb" },
		{ key: "scoreRT", label: "RT" },
		{ key: "rating", label: "My rating" },
		{ key: "runtime", label: "Runtime" },
		{ key: "last", label: "Last watched" },
		{ key: "watchlist", label: "Added" },
		{ key: "credits", label: "Director / Creator" },
	];

	const sortSelect = document.createElement("select");
	sortSelect.className = "lmv-select";
	sortKeys.forEach(({ key, label }) => {
		const opt = document.createElement("option");
		opt.value = key;
		opt.textContent = label;
		opt.selected = sort.key === key;
		sortSelect.appendChild(opt);
	});

	const sortDirBtn = document.createElement("button");
	sortDirBtn.className = "lmv-btn lmv-btn--sm";
	sortDirBtn.textContent = sort.direction === "asc" ? "↑ Asc" : "↓ Desc";

	sortSelect.addEventListener("change", () => {
		onSortChange(sortSelect.value as SortKey, sort.direction);
	});

	sortDirBtn.addEventListener("click", () => {
		const newDir = sort.direction === "asc" ? "desc" : "asc";
		sortDirBtn.textContent = newDir === "asc" ? "↑ Asc" : "↓ Desc";
		onSortChange(sort.key, newDir);
	});

	sortSection.appendChild(sortSelect);
	sortSection.appendChild(sortDirBtn);

	// Status filter
	const statusSection = buildSection(sidebar, "Status");
	const statuses: { value: FilterState["status"]; label: string }[] = [
		{ value: "all", label: "All" },
		{ value: "unwatched", label: "Unwatched" },
		{ value: "watching", label: "Watching" },
		{ value: "watched", label: "Watched" },
		{ value: "dropped", label: "Dropped" },
		{ value: "favorites", label: "Favorites" },
	];
	const statusGroup = document.createElement("div");
	statusGroup.className = "lmv-status-group";
	statuses.forEach(({ value, label }) => {
		const btn = document.createElement("button");
		btn.className = `lmv-status-btn${filter.status === value ? " lmv-status-btn--active" : ""}`;
		btn.textContent = label;
		btn.addEventListener("click", () => {
			statusGroup.querySelectorAll(".lmv-status-btn").forEach((b) => b.classList.remove("lmv-status-btn--active"));
			btn.classList.add("lmv-status-btn--active");
			onFilterChange({ ...filter, status: value });
		});
		statusGroup.appendChild(btn);
	});
	statusSection.appendChild(statusGroup);

	// Genre filter
	if (genres.length > 0) {
		const genreSection = buildSection(sidebar, "Genre");
		const genreGrid = document.createElement("div");
		genreGrid.className = "lmv-genre-grid";
		genres.forEach((genre) => {
			const chip = document.createElement("button");
			chip.className = `lmv-chip lmv-chip--filter${filter.genres.includes(genre) ? " lmv-chip--active" : ""}`;
			chip.textContent = genre;
			chip.addEventListener("click", () => {
				const selected = filter.genres.includes(genre)
					? filter.genres.filter((g) => g !== genre)
					: [...filter.genres, genre];
				chip.classList.toggle("lmv-chip--active", selected.includes(genre));
				onFilterChange({ ...filter, genres: selected });
			});
			genreGrid.appendChild(chip);
		});
		genreSection.appendChild(genreGrid);
	}

	// Network filter (TV)
	if (networks.length > 0) {
		const networkSection = buildSection(sidebar, "Network");
		const netGrid = document.createElement("div");
		netGrid.className = "lmv-genre-grid";
		networks.forEach((network) => {
			const chip = document.createElement("button");
			chip.className = `lmv-chip lmv-chip--filter${filter.network === network ? " lmv-chip--active" : ""}`;
			chip.textContent = network;
			chip.addEventListener("click", () => {
				const next = filter.network === network ? undefined : network;
				onFilterChange({ ...filter, network: next });
			});
			netGrid.appendChild(chip);
		});
		networkSection.appendChild(netGrid);
	}

	// Runtime filter
	const runtimeSection = buildSection(sidebar, "Runtime");
	const runtimes: { value: FilterState["runtimeFilter"] | ""; label: string }[] = [
		{ value: "", label: "All" },
		{ value: "short", label: "Short (<90m)" },
		{ value: "normal", label: "Normal (90–150m)" },
		{ value: "long", label: "Long (>150m)" },
	];
	const rtGroup = document.createElement("div");
	rtGroup.className = "lmv-status-group";
	runtimes.forEach(({ value, label }) => {
		const btn = document.createElement("button");
		btn.className = `lmv-status-btn${(filter.runtimeFilter ?? "") === value ? " lmv-status-btn--active" : ""}`;
		btn.textContent = label;
		btn.addEventListener("click", () => {
			rtGroup.querySelectorAll(".lmv-status-btn").forEach((b) => b.classList.remove("lmv-status-btn--active"));
			btn.classList.add("lmv-status-btn--active");
			onFilterChange({ ...filter, runtimeFilter: (value || undefined) as FilterState["runtimeFilter"] });
		});
		rtGroup.appendChild(btn);
	});
	runtimeSection.appendChild(rtGroup);

	// Reset
	const resetBtn = document.createElement("button");
	resetBtn.className = "lmv-btn lmv-btn--ghost lmv-btn--full";
	resetBtn.textContent = "Clear filters";
	resetBtn.addEventListener("click", () => {
		onFilterChange({ mediaType: "all", genres: [], status: "all" });
	});
	sidebar.appendChild(resetBtn);

	return sidebar;
}

function buildSection(parent: HTMLElement, title: string): HTMLElement {
	const section = document.createElement("div");
	section.className = "lmv-sidebar__section";

	const h = document.createElement("h4");
	h.className = "lmv-sidebar__section-title";
	h.textContent = title;
	section.appendChild(h);

	parent.appendChild(section);
	return section;
}
