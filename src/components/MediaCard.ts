// ABOUTME: Renders a single movie or TV show card in grid/compact/list/poster layouts.
// ABOUTME: Shows a media-type badge, per-episode/movie runtime, scores and TV season/episode progress.
import { setIcon } from "obsidian";
import type { MediaItem } from "../types";
import { createStarRating } from "./StarRating";
import { StatsEngine } from "../services/StatsEngine";
import { credits, displayRuntime, isWatched, isTv, isMovie, progressLabel } from "../media";

const stats = new StatsEngine();

export type CardSize = "normal" | "compact" | "list" | "poster";

export interface MediaCardOptions {
	item: MediaItem;
	size?: CardSize;
	onClick?: (item: MediaItem) => void;
	onFavToggle?: (item: MediaItem) => void;
	onMarkWatched?: (item: MediaItem) => void;
}

export function createMediaCard(opts: MediaCardOptions): HTMLElement {
	const { item, size = "normal", onClick, onFavToggle, onMarkWatched } = opts;

	const card = document.createElement("div");
	card.className = `lmv-card lmv-card--${size}${isWatched(item) ? " lmv-card--watched" : ""}`;
	card.dataset.id = item.id;

	if (size === "list") {
		renderListCard(card, item, onClick, onFavToggle, onMarkWatched);
	} else {
		renderGridCard(card, item, size, onClick, onFavToggle, onMarkWatched);
	}

	return card;
}

function typeBadge(item: MediaItem): HTMLElement {
	const badge = document.createElement("span");
	badge.className = `lmv-card__badge lmv-card__badge--type lmv-card__badge--${item.mediaType}`;
	setIcon(badge, isMovie(item) ? "clapperboard" : "tv");
	badge.title = isMovie(item) ? "Movie" : "TV Show";
	return badge;
}

function renderGridCard(
	card: HTMLElement,
	item: MediaItem,
	size: CardSize,
	onClick?: (m: MediaItem) => void,
	onFavToggle?: (m: MediaItem) => void,
	onMarkWatched?: (m: MediaItem) => void
): void {
	const watched = isWatched(item);

	// Poster
	const poster = document.createElement("div");
	poster.className = "lmv-card__poster";

	if (item.cover) {
		const img = document.createElement("img");
		img.src = item.cover;
		img.alt = item.title;
		img.loading = "lazy";
		img.className = "lmv-card__img";
		img.onerror = () => { img.style.display = "none"; poster.classList.add("lmv-card__poster--fallback"); };
		poster.appendChild(img);
	} else {
		poster.classList.add("lmv-card__poster--fallback");
	}

	poster.appendChild(typeBadge(item));

	if (item.favorite) {
		const fav = document.createElement("span");
		fav.className = "lmv-card__badge lmv-card__badge--fav";
		setIcon(fav, "heart");
		poster.appendChild(fav);
	}

	if (watched) {
		const watchedBadge = document.createElement("span");
		watchedBadge.className = "lmv-card__badge lmv-card__badge--watched";
		setIcon(watchedBadge, "check-circle");
		poster.appendChild(watchedBadge);
	}

	// TV progress pill
	if (isTv(item)) {
		const prog = progressLabel(item);
		if (prog) {
			const pill = document.createElement("span");
			pill.className = "lmv-card__progress";
			pill.textContent = prog;
			poster.appendChild(pill);
		}
	}

	// Overlay (hover)
	if (size !== "compact" && size !== "poster") {
		const overlay = document.createElement("div");
		overlay.className = "lmv-card__overlay";

		const plot = document.createElement("p");
		plot.className = "lmv-card__plot";
		plot.textContent = item.plot ?? "";
		overlay.appendChild(plot);

		const actions = document.createElement("div");
		actions.className = "lmv-card__actions";

		const btnFav = document.createElement("button");
		btnFav.className = `lmv-btn lmv-btn--icon${item.favorite ? " lmv-btn--active" : ""}`;
		btnFav.title = item.favorite ? "Remove from favorites" : "Add to favorites";
		setIcon(btnFav, "heart");
		btnFav.addEventListener("click", (e) => {
			e.stopPropagation();
			onFavToggle?.(item);
		});

		const btnWatched = document.createElement("button");
		btnWatched.className = `lmv-btn lmv-btn--icon${watched ? " lmv-btn--active" : ""}`;
		btnWatched.title = watched ? "Mark as unwatched" : "Mark as watched";
		setIcon(btnWatched, watched ? "check-circle" : "circle");
		btnWatched.addEventListener("click", (e) => {
			e.stopPropagation();
			onMarkWatched?.(item);
		});

		actions.appendChild(btnFav);
		actions.appendChild(btnWatched);
		overlay.appendChild(actions);
		poster.appendChild(overlay);
	}

	card.appendChild(poster);

	if (size === "poster") {
		card.addEventListener("click", () => onClick?.(item));
		return;
	}

	// Body
	const body = document.createElement("div");
	body.className = "lmv-card__body";

	const titleEl = document.createElement("h3");
	titleEl.className = "lmv-card__title";
	titleEl.textContent = item.title;
	body.appendChild(titleEl);

	if (size !== "compact") {
		const meta = document.createElement("div");
		meta.className = "lmv-card__meta";

		const parts: string[] = [];
		if (item.year) parts.push(yearRange(item));
		const rt = displayRuntime(item);
		if (rt) parts.push(stats.formatItemRuntime(rt) + (isTv(item) ? "/ep" : ""));
		meta.textContent = parts.join(" · ");
		body.appendChild(meta);

		// Scores
		const scores = document.createElement("div");
		scores.className = "lmv-card__scores";
		if (item.scoreImdb != null) {
			const imdb = document.createElement("span");
			imdb.className = "lmv-score lmv-score--imdb";
			imdb.innerHTML = `<span class="lmv-score__src">IMDb</span>${item.scoreImdb.toFixed(1)}`;
			scores.appendChild(imdb);
		}
		if (item.scoreRT != null) {
			const rtEl = document.createElement("span");
			rtEl.className = "lmv-score lmv-score--rt";
			rtEl.innerHTML = `<span class="lmv-score__src">RT</span>${item.scoreRT}%`;
			scores.appendChild(rtEl);
		}
		if (scores.children.length) body.appendChild(scores);

		if (item.rating != null) {
			body.appendChild(createStarRating({ value: item.rating, readonly: true, size: "sm" }));
		}

		if (item.genre.length) {
			const genres = document.createElement("div");
			genres.className = "lmv-card__genres";
			item.genre.slice(0, 3).forEach((g) => {
				const chip = document.createElement("span");
				chip.className = "lmv-chip";
				chip.textContent = g;
				genres.appendChild(chip);
			});
			body.appendChild(genres);
		}
	} else {
		const meta = document.createElement("div");
		meta.className = "lmv-card__meta";
		const parts: string[] = [];
		if (item.year) parts.push(yearRange(item));
		if (item.scoreImdb != null) parts.push(item.scoreImdb.toFixed(1));
		meta.textContent = parts.join(" · ");
		body.appendChild(meta);
	}

	card.appendChild(body);
	card.addEventListener("click", () => onClick?.(item));
}

function renderListCard(
	card: HTMLElement,
	item: MediaItem,
	onClick?: (m: MediaItem) => void,
	onFavToggle?: (m: MediaItem) => void,
	onMarkWatched?: (m: MediaItem) => void
): void {
	const posterWrap = document.createElement("div");
	posterWrap.className = "lmv-card__poster lmv-card__poster--list";

	if (item.cover) {
		const img = document.createElement("img");
		img.src = item.cover;
		img.alt = item.title;
		img.loading = "lazy";
		img.className = "lmv-card__img";
		posterWrap.appendChild(img);
	} else {
		posterWrap.classList.add("lmv-card__poster--fallback");
	}
	posterWrap.appendChild(typeBadge(item));

	const info = document.createElement("div");
	info.className = "lmv-card__info";

	const header = document.createElement("div");
	header.className = "lmv-card__header";

	const title = document.createElement("h3");
	title.className = "lmv-card__title";
	title.textContent = item.title;
	header.appendChild(title);

	const actions = document.createElement("div");
	actions.className = "lmv-card__actions";

	const btnFav = document.createElement("button");
	btnFav.className = `lmv-btn lmv-btn--icon${item.favorite ? " lmv-btn--active" : ""}`;
	setIcon(btnFav, "heart");
	btnFav.addEventListener("click", (e) => { e.stopPropagation(); onFavToggle?.(item); });

	const watched = isWatched(item);
	const btnWatched = document.createElement("button");
	btnWatched.className = `lmv-btn lmv-btn--icon${watched ? " lmv-btn--active" : ""}`;
	btnWatched.title = watched ? "Mark as unwatched" : "Mark as watched";
	setIcon(btnWatched, watched ? "check-circle" : "circle");
	btnWatched.addEventListener("click", (e) => { e.stopPropagation(); onMarkWatched?.(item); });

	actions.appendChild(btnFav);
	actions.appendChild(btnWatched);
	header.appendChild(actions);
	info.appendChild(header);

	const meta = document.createElement("div");
	meta.className = "lmv-card__meta";
	const metaParts: string[] = [];
	const cr = credits(item);
	if (cr.length) metaParts.push(cr[0]);
	if (item.year) metaParts.push(yearRange(item));
	const rt = displayRuntime(item);
	if (rt) metaParts.push(stats.formatItemRuntime(rt) + (isTv(item) ? "/ep" : ""));
	if (isTv(item)) {
		const prog = progressLabel(item);
		if (prog) metaParts.push(prog);
	}
	meta.textContent = metaParts.join(" · ");
	info.appendChild(meta);

	const scores = document.createElement("div");
	scores.className = "lmv-card__scores";
	if (item.scoreImdb != null) {
		const s = document.createElement("span");
		s.className = "lmv-score lmv-score--imdb";
		s.innerHTML = `<span class="lmv-score__src">IMDb</span>${item.scoreImdb.toFixed(1)}`;
		scores.appendChild(s);
	}
	if (item.scoreRT != null) {
		const s = document.createElement("span");
		s.className = "lmv-score lmv-score--rt";
		s.innerHTML = `<span class="lmv-score__src">RT</span>${item.scoreRT}%`;
		scores.appendChild(s);
	}
	if (item.rating != null) {
		scores.appendChild(createStarRating({ value: item.rating, readonly: true, size: "sm" }));
	}
	if (scores.children.length) info.appendChild(scores);

	if (item.genre.length) {
		const genres = document.createElement("div");
		genres.className = "lmv-card__genres";
		item.genre.slice(0, 4).forEach((g) => {
			const chip = document.createElement("span");
			chip.className = "lmv-chip";
			chip.textContent = g;
			genres.appendChild(chip);
		});
		info.appendChild(genres);
	}

	if (item.plot) {
		const plot = document.createElement("p");
		plot.className = "lmv-card__plot lmv-card__plot--list";
		plot.textContent = item.plot;
		info.appendChild(plot);
	}

	card.appendChild(posterWrap);
	card.appendChild(info);
	card.addEventListener("click", () => onClick?.(item));
}

function yearRange(item: MediaItem): string {
	if (item.mediaType === "tv") {
		const start = item.year != null ? String(item.year) : "";
		if (item.yearEnd != null && item.yearEnd !== item.year) return `${start}–${item.yearEnd}`;
		if (item.status === "returning" && start) return `${start}–`;
		return start;
	}
	return item.year != null ? String(item.year) : "";
}
