// ABOUTME: Search route: global text search across title, credits, cast, genre and plot, with a media filter.
// ABOUTME: Results render as a card grid, filterable to All / Movies / TV Shows.
import { setIcon } from "obsidian";
import type { MediaItem, MediaFilter } from "../types";
import { MediaDataService } from "../services/MediaDataService";
import { createMediaCard } from "../components/MediaCard";

export interface SearchViewOptions {
	service: MediaDataService;
	onItemClick: (item: MediaItem) => void;
	onFavToggle: (item: MediaItem) => void;
	onMarkWatched: (item: MediaItem) => void;
	initialQuery?: string;
}

export function renderSearch(container: HTMLElement, opts: SearchViewOptions): void {
	container.innerHTML = "";
	container.className = "lmv-view lmv-view--search";

	let mediaFilter: MediaFilter = "all";

	const searchWrap = document.createElement("div");
	searchWrap.className = "lmv-search-hero";

	const input = document.createElement("input");
	input.type = "text";
	input.placeholder = "Search title, director, creator, actor, genre...";
	input.className = "lmv-search-hero__input";
	input.value = opts.initialQuery ?? "";
	searchWrap.appendChild(input);

	container.appendChild(searchWrap);

	const filterRow = document.createElement("div");
	filterRow.className = "lmv-btn-group lmv-search__filters";
	container.appendChild(filterRow);

	const resultsEl = document.createElement("div");
	resultsEl.className = "lmv-search__results";
	container.appendChild(resultsEl);

	const buildFilters = () => {
		filterRow.innerHTML = "";
		const configs: { key: MediaFilter; label: string }[] = [
			{ key: "all", label: "All" },
			{ key: "movie", label: "Movies" },
			{ key: "tv", label: "TV Shows" },
		];
		configs.forEach(({ key, label }) => {
			const btn = document.createElement("button");
			btn.className = `lmv-btn lmv-btn--sm${mediaFilter === key ? " lmv-btn--primary" : " lmv-btn--ghost"}`;
			btn.textContent = label;
			btn.addEventListener("click", () => { mediaFilter = key; buildFilters(); renderResults(input.value); });
			filterRow.appendChild(btn);
		});
	};

	const renderResults = (query: string) => {
		resultsEl.innerHTML = "";

		if (!query.trim()) {
			const hint = document.createElement("p");
			hint.className = "lmv-search__hint";
			hint.textContent = "Type to search your collection...";
			resultsEl.appendChild(hint);
			return;
		}

		let results = opts.service.search(query);
		if (mediaFilter !== "all") results = results.filter((m) => m.mediaType === mediaFilter);

		const countEl = document.createElement("p");
		countEl.className = "lmv-text-muted";
		countEl.textContent = results.length > 0
			? `${results.length} result${results.length !== 1 ? "s" : ""} for "${query}"`
			: `No results for "${query}"`;
		resultsEl.appendChild(countEl);

		if (results.length === 0) {
			const empty = document.createElement("div");
			empty.className = "lmv-empty";
			const iconEl = document.createElement("div");
			iconEl.className = "lmv-empty__icon";
			setIcon(iconEl, "search");
			empty.appendChild(iconEl);
			resultsEl.appendChild(empty);
			return;
		}

		const grid = document.createElement("div");
		grid.className = "lmv-grid lmv-grid--large";
		results.forEach((item, i) => {
			const card = createMediaCard({
				item,
				size: "normal",
				onClick: opts.onItemClick,
				onFavToggle: opts.onFavToggle,
				onMarkWatched: opts.onMarkWatched,
			});
			card.style.animationDelay = `${i * 30}ms`;
			card.classList.add("lmv-card--enter");
			grid.appendChild(card);
		});
		resultsEl.appendChild(grid);

		requestAnimationFrame(() => {
			grid.querySelectorAll(".lmv-card--enter").forEach((el, i) => {
				setTimeout(() => el.classList.add("lmv-card--visible"), i * 30);
			});
		});
	};

	let timeout: ReturnType<typeof setTimeout>;
	input.addEventListener("input", () => {
		clearTimeout(timeout);
		timeout = setTimeout(() => renderResults(input.value), 200);
	});

	setTimeout(() => input.focus(), 100);

	buildFilters();
	renderResults(input.value);
}
