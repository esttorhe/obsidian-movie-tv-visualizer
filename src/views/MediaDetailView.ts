// ABOUTME: Full detail route for one movie or TV show, with distinct movie and TV layouts.
// ABOUTME: TV shows get a season/episode progress panel that writes currentSeason/currentEpisode back.
import { setIcon } from "obsidian";
import type { MediaItem, TvShow } from "../types";
import { MediaDataService } from "../services/MediaDataService";
import { StatsEngine } from "../services/StatsEngine";
import { createStarRating } from "../components/StarRating";
import { createCarousel } from "../components/Carousel";
import { credits, displayRuntime, isTv, isWatched, mediaLabel, tvProgressFraction } from "../media";
import { cleanSearchTitle } from "../parse";

const stats = new StatsEngine();

const PLAYLISTS_KEY = "mtv-playlists";

export interface MediaDetailOptions {
	item: MediaItem;
	service: MediaDataService;
	onBack: () => void;
	onItemClick: (item: MediaItem) => void;
	onFavToggle: (item: MediaItem) => void;
}

export function renderMediaDetail(container: HTMLElement, opts: MediaDetailOptions): void {
	container.innerHTML = "";
	container.className = "lmv-view lmv-view--detail";

	const { item, service, onBack, onItemClick, onFavToggle } = opts;

	const header = document.createElement("div");
	header.className = "lmv-detail__header";

	const back = document.createElement("button");
	back.className = "lmv-btn lmv-btn--ghost lmv-detail__back";
	setIcon(back, "arrow-left");
	back.addEventListener("click", onBack);
	header.appendChild(back);

	const bgSrc = item.coverBackdrop ?? item.cover;
	if (bgSrc) {
		const bgWrap = document.createElement("div");
		bgWrap.className = "lmv-detail__header-bg";
		const bgImg = document.createElement("img");
		bgImg.src = bgSrc;
		bgImg.alt = "";
		bgImg.className = "lmv-detail__header-bg-img";
		bgWrap.appendChild(bgImg);
		const bgGrad = document.createElement("div");
		bgGrad.className = "lmv-detail__header-bg-grad";
		bgWrap.appendChild(bgGrad);
		header.appendChild(bgWrap);
	}

	const inner = document.createElement("div");
	inner.className = "lmv-detail__header-inner";

	const posterWrap = document.createElement("div");
	posterWrap.className = "lmv-detail__poster-wrap";
	if (item.cover) {
		const poster = document.createElement("img");
		poster.src = item.cover;
		poster.alt = item.title;
		poster.className = "lmv-detail__poster";
		posterWrap.appendChild(poster);
	}
	inner.appendChild(posterWrap);

	const info = document.createElement("div");
	info.className = "lmv-detail__info";

	const kicker = document.createElement("span");
	kicker.className = "lmv-detail__kicker";
	kicker.textContent = mediaLabel(item);
	info.appendChild(kicker);

	const title = document.createElement("h1");
	title.className = "lmv-detail__title";
	title.textContent = item.title;
	info.appendChild(title);

	if (item.titleOriginal && item.titleOriginal !== item.title) {
		const orig = document.createElement("p");
		orig.className = "lmv-detail__title-orig";
		orig.textContent = item.titleOriginal;
		info.appendChild(orig);
	}

	const metaLine = document.createElement("div");
	metaLine.className = "lmv-detail__meta-line";
	const metaParts: string[] = [];
	const cr = credits(item);
	if (cr.length) metaParts.push(`${isTv(item) ? "Created by" : "Dir."} ${cr.join(", ")}`);
	if (item.year) metaParts.push(yearRange(item));
	const rt = displayRuntime(item);
	if (isTv(item)) {
		if (item.seasons) metaParts.push(`${item.seasons} season${item.seasons !== 1 ? "s" : ""}`);
		if (item.episodes) metaParts.push(`${item.episodes} episodes`);
		if (rt) metaParts.push(`${stats.formatItemRuntime(rt)}/ep`);
		if (item.network) metaParts.push(item.network);
		if (item.status) metaParts.push(statusLabel(item.status));
	} else {
		if (rt) metaParts.push(stats.formatItemRuntime(rt));
		if (item.country) metaParts.push(item.country);
		if (item.language) metaParts.push(item.language.toUpperCase());
	}
	metaLine.textContent = metaParts.join(" · ");
	info.appendChild(metaLine);

	if (item.genre.length) {
		const genres = document.createElement("div");
		genres.className = "lmv-detail__genres";
		item.genre.forEach((g) => {
			const chip = document.createElement("span");
			chip.className = "lmv-chip lmv-chip--sm";
			chip.textContent = g;
			genres.appendChild(chip);
		});
		info.appendChild(genres);
	}

	const scoresRow = document.createElement("div");
	scoresRow.className = "lmv-detail__scores";
	if (item.scoreImdb != null) scoresRow.appendChild(buildScoreBadge("IMDb", item.scoreImdb.toFixed(1), "imdb"));
	if (item.scoreRT != null) scoresRow.appendChild(buildScoreBadge("RT", `${item.scoreRT}%`, "rt"));
	if (item.scoreMetacritic != null) scoresRow.appendChild(buildScoreBadge("MC", String(item.scoreMetacritic), "meta"));
	if (scoresRow.children.length) info.appendChild(scoresRow);

	const ratingSection = document.createElement("div");
	ratingSection.className = "lmv-detail__rating-section";
	const ratingLabel = document.createElement("label");
	ratingLabel.className = "lmv-label";
	ratingLabel.textContent = "My rating";
	ratingSection.appendChild(ratingLabel);
	ratingSection.appendChild(createStarRating({
		value: item.rating,
		readonly: false,
		size: "lg",
		onChange: async (val) => { await service.updateField(item, { rating: val }); },
	}));
	info.appendChild(ratingSection);

	// Actions
	const actions = document.createElement("div");
	actions.className = "lmv-detail__actions";

	const favBtn = document.createElement("button");
	favBtn.className = `lmv-btn lmv-btn--sm${item.favorite ? " lmv-btn--active" : ""}`;
	favBtn.textContent = item.favorite ? "In favorites" : "Add to favorites";
	setIcon(favBtn, "heart");
	favBtn.addEventListener("click", async () => {
		const newVal = !item.favorite;
		await service.updateField(item, { favorite: newVal });
		item.favorite = newVal;
		favBtn.textContent = newVal ? "In favorites" : "Add to favorites";
		setIcon(favBtn, "heart");
		favBtn.classList.toggle("lmv-btn--active", newVal);
		onFavToggle(item);
	});
	actions.appendChild(favBtn);

	const watched = isWatched(item);
	const watchedBtn = document.createElement("button");
	watchedBtn.className = `lmv-btn lmv-btn--sm${watched ? " lmv-btn--active" : ""}`;
	watchedBtn.textContent = watched
		? `Watched${item.timesWatched > 1 ? ` (${item.timesWatched}x)` : ""}`
		: "Mark as watched";
	setIcon(watchedBtn, watched ? "check-circle" : "circle");
	watchedBtn.addEventListener("click", async () => {
		if (isWatched(item)) {
			await service.updateField(item, { last: "", timesWatched: 0 });
			item.last = "";
			item.timesWatched = 0;
			watchedBtn.textContent = "Mark as watched";
			watchedBtn.classList.remove("lmv-btn--active");
			setIcon(watchedBtn, "circle");
		} else {
			const today = new Date().toISOString().split("T")[0];
			const newCount = item.timesWatched + 1;
			await service.updateField(item, { last: today, timesWatched: newCount });
			item.last = today;
			item.timesWatched = newCount;
			watchedBtn.textContent = `Watched${newCount > 1 ? ` (${newCount}x)` : ""}`;
			watchedBtn.classList.add("lmv-btn--active");
			setIcon(watchedBtn, "check-circle");
		}
	});
	actions.appendChild(watchedBtn);

	const playlistBtn = document.createElement("button");
	playlistBtn.className = "lmv-btn lmv-btn--sm";
	setIcon(playlistBtn, "list-plus");
	playlistBtn.title = "Add to playlist";
	playlistBtn.addEventListener("click", () => showAddToPlaylistModal(container, item));
	actions.appendChild(playlistBtn);

	if (item.trailer) {
		const trailerBtn = document.createElement("a");
		trailerBtn.href = item.trailer;
		trailerBtn.className = "lmv-btn lmv-btn--sm";
		setIcon(trailerBtn, "play");
		trailerBtn.append(" Trailer");
		trailerBtn.target = "_blank";
		trailerBtn.rel = "noopener noreferrer";
		actions.appendChild(trailerBtn);
	}

	{
		// item.title falls back to the note's filename — which carries this vault's
		// capture-timestamp prefix — when there's no explicit `title` frontmatter
		// field, so it must be cleaned before it's used in a search query.
		const imdbHref = item.imdbId
			? `https://www.imdb.com/title/${item.imdbId}`
			: `https://www.imdb.com/find/?q=${encodeURIComponent([cleanSearchTitle(item.title), item.year].filter(Boolean).join(" "))}`;
		const imdbBtn = document.createElement("a");
		imdbBtn.href = imdbHref;
		imdbBtn.className = "lmv-btn lmv-btn--sm lmv-btn--ghost";
		imdbBtn.textContent = "IMDb";
		imdbBtn.target = "_blank";
		imdbBtn.rel = "noopener noreferrer";
		actions.appendChild(imdbBtn);
	}

	info.appendChild(actions);
	inner.appendChild(info);
	header.appendChild(inner);
	container.appendChild(header);

	// Body
	const body = document.createElement("div");
	body.className = "lmv-detail__body";

	// TV progress panel
	if (isTv(item)) {
		buildTvProgressPanel(body, item, service);
	}

	if (item.plot) {
		const s = buildBodySection(body, "Synopsis");
		const p = document.createElement("p");
		p.className = "lmv-detail__plot";
		p.textContent = item.plot;
		s.appendChild(p);
	}

	if (item.cast.length) {
		const s = buildBodySection(body, "Cast");
		const castEl = document.createElement("div");
		castEl.className = "lmv-detail__cast";
		item.cast.forEach((actor) => {
			const chip = document.createElement("span");
			chip.className = "lmv-chip lmv-chip--sm";
			chip.textContent = actor;
			castEl.appendChild(chip);
		});
		s.appendChild(castEl);
	}

	if (item.awards) {
		const s = buildBodySection(body, "Awards");
		const p = document.createElement("p");
		p.className = "lmv-text-muted";
		p.textContent = item.awards;
		s.appendChild(p);
	}

	const moodSection = buildBodySection(body, "Mood");
	const moodInput = document.createElement("input");
	moodInput.type = "text";
	moodInput.className = "lmv-input lmv-input--sm";
	moodInput.placeholder = "e.g. contemplative, epic, tense...";
	moodInput.value = item.mood ?? "";
	let moodTimeout: ReturnType<typeof setTimeout>;
	moodInput.addEventListener("input", () => {
		clearTimeout(moodTimeout);
		moodTimeout = setTimeout(async () => {
			await service.updateField(item, { mood: moodInput.value });
		}, 600);
	});
	moodSection.appendChild(moodInput);

	const reviewSection = buildBodySection(body, "My review");
	const textarea = document.createElement("textarea");
	textarea.className = "lmv-detail__review";
	textarea.placeholder = "Write your review...";
	textarea.value = item.review ?? "";
	textarea.rows = 5;
	let reviewTimeout: ReturnType<typeof setTimeout>;
	textarea.addEventListener("input", () => {
		clearTimeout(reviewTimeout);
		reviewTimeout = setTimeout(async () => {
			await service.updateField(item, { review: textarea.value });
		}, 800);
	});
	reviewSection.appendChild(textarea);

	container.appendChild(body);

	if (item.trailer) {
		const embedId = getYouTubeId(item.trailer);
		if (embedId) {
			const trailerSection = buildBodySection(body, "Trailer");
			const iframe = document.createElement("iframe");
			iframe.src = `https://www.youtube.com/embed/${embedId}`;
			iframe.className = "lmv-detail__trailer-embed";
			iframe.setAttribute("allowfullscreen", "");
			iframe.setAttribute("allow", "accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture");
			iframe.setAttribute("loading", "lazy");
			trailerSection.appendChild(iframe);
		}
	}

	// More from director/creator
	if (cr.length) {
		const person = cr[0];
		const related = service.getByCredit(person).filter((m) => m.id !== item.id);
		if (related.length > 0) {
			const more = document.createElement("div");
			more.className = "lmv-detail__more";
			more.appendChild(createCarousel({
				title: `More from ${person}`,
				items: related,
				size: "compact",
				onCardClick: onItemClick,
			}));
			container.appendChild(more);
		}
	}
}

function buildTvProgressPanel(parent: HTMLElement, show: TvShow, service: MediaDataService): void {
	const section = buildBodySection(parent, "Progress");
	section.classList.add("lmv-detail__progress");

	const state = document.createElement("p");
	state.className = "lmv-detail__progress-state";

	const bar = document.createElement("div");
	bar.className = "lmv-detail__progress-bar";
	const fill = document.createElement("div");
	fill.className = "lmv-detail__progress-fill";
	bar.appendChild(fill);

	const renderState = () => {
		const s = show.currentSeason ?? 1;
		const e = show.currentEpisode ?? 0;
		if (show.currentSeason == null && show.currentEpisode == null) {
			state.textContent = "Not started yet.";
		} else {
			state.textContent = `You're on S${s}E${e}${show.episodes ? ` of ${show.episodes} episodes` : ""}.`;
		}
		const frac = tvProgressFraction(show);
		fill.style.width = frac != null ? `${Math.round(frac * 100)}%` : "0%";
	};
	renderState();

	const controls = document.createElement("div");
	controls.className = "lmv-detail__progress-controls";

	const seasonField = buildNumberField("Season", show.currentSeason, async (val) => {
		show.currentSeason = val;
		await service.updateField(show, { currentSeason: val });
		renderState();
	});
	const episodeField = buildNumberField("Episode", show.currentEpisode, async (val) => {
		show.currentEpisode = val;
		await service.updateField(show, { currentEpisode: val });
		renderState();
	});
	controls.appendChild(seasonField);
	controls.appendChild(episodeField);

	const nextBtn = document.createElement("button");
	nextBtn.className = "lmv-btn lmv-btn--sm lmv-btn--primary";
	setIcon(nextBtn, "plus");
	nextBtn.appendChild(document.createTextNode(" Next episode"));
	nextBtn.addEventListener("click", async () => {
		const nextEp = (show.currentEpisode ?? 0) + 1;
		const season = show.currentSeason ?? 1;
		show.currentEpisode = nextEp;
		show.currentSeason = season;
		await service.updateField(show, { currentEpisode: nextEp, currentSeason: season });
		const epInput = episodeField.querySelector("input") as HTMLInputElement | null;
		if (epInput) epInput.value = String(nextEp);
		const seInput = seasonField.querySelector("input") as HTMLInputElement | null;
		if (seInput) seInput.value = String(season);
		renderState();
	});
	controls.appendChild(nextBtn);

	section.appendChild(state);
	section.appendChild(bar);
	section.appendChild(controls);
}

function buildNumberField(label: string, value: number | undefined, onChange: (v: number) => void): HTMLElement {
	const wrap = document.createElement("label");
	wrap.className = "lmv-detail__progress-field";
	const span = document.createElement("span");
	span.textContent = label;
	wrap.appendChild(span);
	const input = document.createElement("input");
	input.type = "number";
	input.min = "0";
	input.className = "lmv-input lmv-input--sm lmv-input--num";
	input.value = value != null ? String(value) : "";
	let timeout: ReturnType<typeof setTimeout>;
	input.addEventListener("input", () => {
		clearTimeout(timeout);
		timeout = setTimeout(() => {
			const n = parseInt(input.value);
			if (!isNaN(n) && n >= 0) onChange(n);
		}, 400);
	});
	wrap.appendChild(input);
	return wrap;
}

function statusLabel(status: TvShow["status"]): string {
	switch (status) {
		case "returning": return "Returning";
		case "ended": return "Ended";
		case "canceled": return "Canceled";
		default: return "";
	}
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

function buildScoreBadge(label: string, value: string, mod: string): HTMLElement {
	const el = document.createElement("div");
	el.className = `lmv-score-badge lmv-score-badge--${mod}`;
	el.innerHTML = `<span class="lmv-score-badge__val">${value}</span><span class="lmv-score-badge__src">${label}</span>`;
	return el;
}

function buildBodySection(parent: HTMLElement, title: string): HTMLElement {
	const section = document.createElement("div");
	section.className = "lmv-detail__section";
	const h = document.createElement("h3");
	h.className = "lmv-detail__section-title";
	h.textContent = title;
	section.appendChild(h);
	parent.appendChild(section);
	return section;
}

function getYouTubeId(url: string): string | null {
	const m = url.match(/(?:youtube\.com\/(?:watch\?(?:.*&)?v=|embed\/)|youtu\.be\/)([A-Za-z0-9_-]{11})/);
	return m ? m[1] : null;
}

function showAddToPlaylistModal(container: HTMLElement, item: MediaItem): void {
	const raw = localStorage.getItem(PLAYLISTS_KEY);
	const playlists = raw ? JSON.parse(raw) : [];

	const overlay = document.createElement("div");
	overlay.className = "lmv-modal-overlay";

	const dialog = document.createElement("div");
	dialog.className = "lmv-modal";

	const title = document.createElement("h2");
	title.textContent = "Add to playlist";
	dialog.appendChild(title);

	if (playlists.length === 0) {
		const msg = document.createElement("p");
		msg.className = "lmv-text-muted";
		msg.textContent = "No playlists yet. Create one from the Playlists section.";
		dialog.appendChild(msg);
	} else {
		const list = document.createElement("div");
		list.className = "lmv-modal__list";
		playlists.forEach((pl: { id: string; name: string; itemIds: string[] }) => {
			const row = document.createElement("button");
			row.className = "lmv-modal__list-item";
			const alreadyIn = pl.itemIds.includes(item.id);
			row.textContent = alreadyIn ? `${pl.name} (already added)` : pl.name;
			row.disabled = alreadyIn;
			row.addEventListener("click", () => {
				const all = JSON.parse(localStorage.getItem(PLAYLISTS_KEY) ?? "[]");
				const target = all.find((p: { id: string }) => p.id === pl.id);
				if (target && !target.itemIds.includes(item.id)) {
					target.itemIds.push(item.id);
					localStorage.setItem(PLAYLISTS_KEY, JSON.stringify(all));
				}
				overlay.remove();
			});
			list.appendChild(row);
		});
		dialog.appendChild(list);
	}

	const cancelBtn = document.createElement("button");
	cancelBtn.className = "lmv-btn lmv-btn--ghost";
	cancelBtn.textContent = "Close";
	cancelBtn.addEventListener("click", () => overlay.remove());
	dialog.appendChild(cancelBtn);

	overlay.appendChild(dialog);
	overlay.addEventListener("click", (e) => { if (e.target === overlay) overlay.remove(); });
	container.appendChild(overlay);
}
