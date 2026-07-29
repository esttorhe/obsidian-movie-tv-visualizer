// ABOUTME: Dashboard route: hero banner, stats bar and themed carousels across movies and TV shows.
// ABOUTME: Includes a TV "continue watching" row driven by recorded season/episode progress.
import type { MediaItem } from "../types";
import { MediaDataService } from "../services/MediaDataService";
import { StatsEngine } from "../services/StatsEngine";
import { createHeroSection } from "../components/HeroSection";
import { createCarousel } from "../components/Carousel";

const engine = new StatsEngine();

export interface DashboardViewOptions {
	service: MediaDataService;
	onItemClick: (item: MediaItem) => void;
	onFavToggle: (item: MediaItem) => void;
	onMarkWatched: (item: MediaItem) => void;
	onViewAll: (route: string) => void;
}

export function renderDashboard(container: HTMLElement, opts: DashboardViewOptions): void {
	container.innerHTML = "";
	container.className = "lmv-view lmv-view--dashboard";

	const items = opts.service.items;

	if (items.length === 0) {
		const empty = document.createElement("div");
		empty.className = "lmv-empty";
		empty.innerHTML = `
			<h2>Nothing here yet</h2>
			<p>Add notes categorized as <code>Movies</code> or <code>TV Shows</code>, or use the Obsidian Clipper on IMDb.</p>
		`;
		container.appendChild(empty);
		return;
	}

	const stats = opts.service.getStats();

	const heroItem =
		engine.recentlyWatched(items, 1)[0] ??
		engine.topByRating(items, 1)[0] ??
		engine.topByImdb(items, 1)[0] ??
		items[0];

	if (heroItem) {
		container.appendChild(createHeroSection({
			item: heroItem,
			onDetail: opts.onItemClick,
			onFavToggle: opts.onFavToggle,
		}));
	}

	const statsBar = document.createElement("div");
	statsBar.className = "lmv-stats-bar";

	const statsItems = [
		{ value: stats.total, label: "Total" },
		{ value: stats.movieCount, label: "Movies" },
		{ value: stats.tvCount, label: "TV Shows" },
		{ value: stats.watched, label: "Watched" },
		{ value: stats.favorites, label: "Favorites" },
		{ value: stats.avgRating > 0 ? stats.avgRating.toFixed(1) : "—", label: "My rating" },
		{ value: stats.avgImdb > 0 ? stats.avgImdb.toFixed(1) : "—", label: "IMDb" },
		{ value: stats.creators, label: "Creators" },
	];

	statsItems.forEach(({ value, label }) => {
		const item = document.createElement("div");
		item.className = "lmv-stats-bar__item";
		item.innerHTML = `<span class="lmv-stats-bar__value">${value}</span><span class="lmv-stats-bar__label">${label}</span>`;
		statsBar.appendChild(item);
	});

	container.appendChild(statsBar);

	const carouselContainer = document.createElement("div");
	carouselContainer.className = "lmv-dashboard__carousels";

	const carousels = [
		{ title: "Continue watching", items: engine.continueWatching(items, 20), route: "catalog" },
		{ title: "Recently watched", items: engine.recentlyWatched(items, 20), route: "watched" },
		{ title: "Recently added", items: engine.recentlyAdded(items, 20), route: "catalog" },
		{ title: "My favorites", items: engine.favorites(items, 20), route: "favorites" },
		{ title: "Top IMDb in my collection", items: engine.topByImdb(items, 20), route: "top" },
		{ title: "My highest rated", items: engine.topByRating(items, 20), route: "top" },
	];

	carousels.forEach(({ title, items: carouselItems, route }) => {
		const carousel = createCarousel({
			title,
			items: carouselItems,
			size: "normal",
			onCardClick: opts.onItemClick,
			onFavToggle: opts.onFavToggle,
			onMarkWatched: opts.onMarkWatched,
			onViewAll: () => opts.onViewAll(route),
		});
		if (carousel.childNodes.length > 0) {
			carouselContainer.appendChild(carousel);
		}
	});

	container.appendChild(carouselContainer);

	if (stats.totalRuntime > 0) {
		const runtime = document.createElement("div");
		runtime.className = "lmv-runtime-badge";
		const h = Math.floor(stats.totalRuntime / 60);
		const d = Math.floor(h / 24);
		runtime.textContent = `Approx. ${d}d ${h % 24}h of movies & shows in your collection`;
		container.appendChild(runtime);
	}
}
