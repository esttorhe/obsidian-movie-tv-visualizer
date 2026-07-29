// ABOUTME: Creators route: unified cards for movie directors and TV creators with counts and averages.
// ABOUTME: Clicking a creator opens their combined filmography via a credit-filtered catalog.
import { setIcon } from "obsidian";
import type { MediaItem } from "../types";
import { MediaDataService } from "../services/MediaDataService";
import { CatalogView } from "./CatalogView";

export interface CreatorsViewOptions {
	service: MediaDataService;
	onItemClick: (item: MediaItem) => void;
	onFavToggle: (item: MediaItem) => void;
	onMarkWatched: (item: MediaItem) => void;
}

export function renderCreators(container: HTMLElement, opts: CreatorsViewOptions): void {
	container.innerHTML = "";
	container.className = "lmv-view lmv-view--directors";

	const creators = opts.service.getCreatorCards();

	if (creators.length === 0) {
		const empty = document.createElement("div");
		empty.className = "lmv-empty";
		const iconEl = document.createElement("div");
		iconEl.className = "lmv-empty__icon";
		setIcon(iconEl, "clapperboard");
		const emptyP = document.createElement("p");
		emptyP.textContent = "No directors or creators found. Add a 'director' or 'creator' field to your notes.";
		empty.appendChild(iconEl);
		empty.appendChild(emptyP);
		container.appendChild(empty);
		return;
	}

	const h1 = document.createElement("h1");
	h1.className = "lmv-view__title";
	h1.textContent = "Directors & Creators";
	container.appendChild(h1);

	const searchInput = document.createElement("input");
	searchInput.type = "text";
	searchInput.placeholder = "Search director or creator...";
	searchInput.className = "lmv-search-input lmv-search-input--standalone";
	container.appendChild(searchInput);

	const grid = document.createElement("div");
	grid.className = "lmv-director-grid";

	const renderGrid = (query = "") => {
		grid.innerHTML = "";
		const filtered = query
			? creators.filter((d) => d.name.toLowerCase().includes(query.toLowerCase()))
			: creators;

		filtered.forEach((creator, i) => {
			const card = document.createElement("div");
			card.className = "lmv-director-card";
			card.style.animationDelay = `${i * 25}ms`;

			const cover = document.createElement("div");
			cover.className = "lmv-director-card__cover";
			if (creator.cover) {
				const img = document.createElement("img");
				img.src = creator.cover;
				img.alt = creator.name;
				img.loading = "lazy";
				cover.appendChild(img);
			}

			const info = document.createElement("div");
			info.className = "lmv-director-card__info";

			const name = document.createElement("h3");
			name.className = "lmv-director-card__name";
			name.textContent = creator.name;
			info.appendChild(name);

			const stats = document.createElement("div");
			stats.className = "lmv-director-card__stats";
			stats.innerHTML = `
				<span>${creator.count} title${creator.count !== 1 ? "s" : ""}</span>
				${creator.avgRating > 0 ? `<span>★ ${creator.avgRating.toFixed(1)}</span>` : ""}
				${creator.avgImdb > 0 ? `<span>IMDb ${creator.avgImdb.toFixed(1)}</span>` : ""}
			`;
			info.appendChild(stats);

			card.appendChild(cover);
			card.appendChild(info);

			card.addEventListener("click", () => {
				renderCreatorFilmography(container, creator.name, opts);
			});

			grid.appendChild(card);
		});
	};

	let searchTimeout: ReturnType<typeof setTimeout>;
	searchInput.addEventListener("input", () => {
		clearTimeout(searchTimeout);
		searchTimeout = setTimeout(() => renderGrid(searchInput.value), 200);
	});

	renderGrid();
	container.appendChild(grid);
}

function renderCreatorFilmography(
	container: HTMLElement,
	creator: string,
	opts: CreatorsViewOptions
): void {
	container.innerHTML = "";
	container.className = "lmv-view lmv-view--catalog";

	const back = document.createElement("button");
	back.className = "lmv-btn lmv-btn--ghost lmv-detail__back";
	back.textContent = "← Directors & Creators";
	back.addEventListener("click", () => renderCreators(container, opts));
	container.appendChild(back);

	const catalogView = new CatalogView({
		service: opts.service,
		onItemClick: opts.onItemClick,
		onFavToggle: opts.onFavToggle,
		onMarkWatched: opts.onMarkWatched,
		initialFilter: { mediaType: "all", genres: [], status: "all", credit: creator },
		initialTitle: `Works by ${creator}`,
	});

	const inner = document.createElement("div");
	inner.style.flex = "1";
	container.appendChild(inner);
	catalogView.render(inner);
}
