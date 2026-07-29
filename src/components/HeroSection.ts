// ABOUTME: Large hero banner for the dashboard featuring one movie or TV show with backdrop and actions.
// ABOUTME: Shows credits (director/creator), scores, plot and a media-type-aware meta line.
import type { MediaItem } from "../types";
import { StatsEngine } from "../services/StatsEngine";
import { credits, displayRuntime, isTv, mediaLabel } from "../media";

const stats = new StatsEngine();

export interface HeroSectionOptions {
	item: MediaItem;
	onDetail?: (item: MediaItem) => void;
	onFavToggle?: (item: MediaItem) => void;
}

export function createHeroSection(opts: HeroSectionOptions): HTMLElement {
	const { item, onDetail, onFavToggle } = opts;
	const hero = document.createElement("div");
	hero.className = "lmv-hero";

	const bgSrc = item.coverBackdrop ?? item.cover;
	if (bgSrc) {
		const bg = document.createElement("div");
		bg.className = "lmv-hero__bg-wrap";
		const img = document.createElement("img");
		img.src = bgSrc;
		img.alt = "";
		img.className = "lmv-hero__bg-img";
		bg.appendChild(img);
		const grad = document.createElement("div");
		grad.className = "lmv-hero__bg-grad";
		bg.appendChild(grad);
		hero.appendChild(bg);
	}

	const content = document.createElement("div");
	content.className = "lmv-hero__content";

	if (item.cover) {
		const poster = document.createElement("img");
		poster.src = item.cover;
		poster.alt = item.title;
		poster.className = "lmv-hero__poster";
		content.appendChild(poster);
	}

	const info = document.createElement("div");
	info.className = "lmv-hero__info";

	const kicker = document.createElement("span");
	kicker.className = "lmv-hero__kicker";
	kicker.textContent = mediaLabel(item);
	info.appendChild(kicker);

	const title = document.createElement("h1");
	title.className = "lmv-hero__title";
	title.textContent = item.title;
	info.appendChild(title);

	if (item.titleOriginal && item.titleOriginal !== item.title) {
		const orig = document.createElement("p");
		orig.className = "lmv-hero__title-orig";
		orig.textContent = item.titleOriginal;
		info.appendChild(orig);
	}

	const meta = document.createElement("div");
	meta.className = "lmv-hero__meta";
	const metaParts: string[] = [];
	if (item.year) metaParts.push(String(item.year));
	if (isTv(item)) {
		if (item.seasons) metaParts.push(`${item.seasons} season${item.seasons !== 1 ? "s" : ""}`);
		const rt = displayRuntime(item);
		if (rt) metaParts.push(`${stats.formatItemRuntime(rt)}/ep`);
		if (item.network) metaParts.push(item.network);
	} else {
		const rt = displayRuntime(item);
		if (rt) metaParts.push(stats.formatItemRuntime(rt));
		if (item.country) metaParts.push(item.country);
	}
	meta.textContent = metaParts.join(" · ");
	info.appendChild(meta);

	const cr = credits(item);
	if (cr.length) {
		const dir = document.createElement("p");
		dir.className = "lmv-hero__director";
		dir.textContent = `${isTv(item) ? "Created by" : "Dir."} ${cr.join(", ")}`;
		info.appendChild(dir);
	}

	if (item.genre.length) {
		const genres = document.createElement("div");
		genres.className = "lmv-hero__genres";
		item.genre.slice(0, 4).forEach((g) => {
			const chip = document.createElement("span");
			chip.className = "lmv-chip lmv-chip--sm";
			chip.textContent = g;
			genres.appendChild(chip);
		});
		info.appendChild(genres);
	}

	const scores = document.createElement("div");
	scores.className = "lmv-hero__scores";
	if (item.scoreImdb != null) {
		const s = document.createElement("span");
		s.className = "lmv-score-pill";
		s.innerHTML = `<span class="lmv-score-pill__src">IMDb</span><span class="lmv-score-pill__val">${item.scoreImdb.toFixed(1)}</span>`;
		scores.appendChild(s);
	}
	if (item.scoreRT != null) {
		const s = document.createElement("span");
		s.className = "lmv-score-pill lmv-score-pill--rt";
		s.innerHTML = `<span class="lmv-score-pill__src">RT</span><span class="lmv-score-pill__val">${item.scoreRT}%</span>`;
		scores.appendChild(s);
	}
	if (scores.children.length) info.appendChild(scores);

	if (item.plot) {
		const plot = document.createElement("p");
		plot.className = "lmv-hero__plot";
		plot.textContent = item.plot;
		info.appendChild(plot);
	}

	const actions = document.createElement("div");
	actions.className = "lmv-hero__actions";

	const btnDetail = document.createElement("button");
	btnDetail.className = "lmv-btn lmv-btn--primary";
	btnDetail.textContent = "View details";
	btnDetail.addEventListener("click", () => onDetail?.(item));
	actions.appendChild(btnDetail);

	const btnFav = document.createElement("button");
	btnFav.className = `lmv-btn lmv-btn--ghost${item.favorite ? " lmv-btn--active" : ""}`;
	btnFav.textContent = item.favorite ? "In favorites" : "Add to favorites";
	btnFav.addEventListener("click", () => onFavToggle?.(item));
	actions.appendChild(btnFav);

	info.appendChild(actions);
	content.appendChild(info);
	hero.appendChild(content);

	return hero;
}
