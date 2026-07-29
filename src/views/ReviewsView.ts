// ABOUTME: Reviews route: every movie/TV note with a non-empty review, filterable by media type.
// ABOUTME: Sorted by personal rating descending, with poster, meta and star rating per card.
import { setIcon } from "obsidian";
import type { MediaItem, MediaFilter } from "../types";
import { MediaDataService } from "../services/MediaDataService";
import { createStarRating } from "../components/StarRating";
import { credits } from "../media";

export interface ReviewsViewOptions {
	service: MediaDataService;
	onItemClick: (item: MediaItem) => void;
}

export function renderReviews(container: HTMLElement, opts: ReviewsViewOptions): void {
	container.innerHTML = "";
	container.className = "lmv-view lmv-view--reviews";

	let mediaFilter: MediaFilter = "all";

	const h1 = document.createElement("h1");
	h1.className = "lmv-view__title";
	h1.textContent = "My Reviews";
	container.appendChild(h1);

	const filterRow = document.createElement("div");
	filterRow.className = "lmv-btn-group";
	container.appendChild(filterRow);

	const listWrap = document.createElement("div");
	container.appendChild(listWrap);

	const allReviewed = opts.service.items
		.filter((m) => m.review && m.review.trim().length > 0)
		.sort((a, b) => (b.rating ?? 0) - (a.rating ?? 0));

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
			btn.addEventListener("click", () => { mediaFilter = key; buildFilters(); renderList(); });
			filterRow.appendChild(btn);
		});
	};

	const renderList = () => {
		listWrap.innerHTML = "";
		const reviewed = mediaFilter === "all"
			? allReviewed
			: allReviewed.filter((m) => m.mediaType === mediaFilter);

		if (reviewed.length === 0) {
			const empty = document.createElement("div");
			empty.className = "lmv-empty";
			const iconEl = document.createElement("div");
			iconEl.className = "lmv-empty__icon";
			setIcon(iconEl, "file-text");
			const emptyP = document.createElement("p");
			emptyP.textContent = "No reviews yet. Open a title and write your thoughts.";
			empty.appendChild(iconEl);
			empty.appendChild(emptyP);
			listWrap.appendChild(empty);
			return;
		}

		const count = document.createElement("p");
		count.className = "lmv-text-muted";
		count.textContent = `${reviewed.length} review${reviewed.length !== 1 ? "s" : ""}`;
		listWrap.appendChild(count);

		const list = document.createElement("div");
		list.className = "lmv-reviews-list";

		reviewed.forEach((item, i) => {
			const card = document.createElement("div");
			card.className = "lmv-review-card";
			card.style.animationDelay = `${i * 40}ms`;

			const left = document.createElement("div");
			left.className = "lmv-review-card__left";

			if (item.cover) {
				const img = document.createElement("img");
				img.src = item.cover;
				img.alt = item.title;
				img.className = "lmv-review-card__poster";
				img.loading = "lazy";
				left.appendChild(img);
			}

			const right = document.createElement("div");
			right.className = "lmv-review-card__right";

			const header = document.createElement("div");
			header.className = "lmv-review-card__header";

			const title = document.createElement("h3");
			title.className = "lmv-review-card__title";
			title.textContent = item.title;
			header.appendChild(title);

			const meta = document.createElement("span");
			meta.className = "lmv-text-muted";
			const parts: string[] = [item.mediaType === "tv" ? "TV" : "Movie"];
			if (item.year) parts.push(String(item.year));
			const cr = credits(item);
			if (cr.length) parts.push(cr[0]);
			meta.textContent = parts.join(" · ");
			header.appendChild(meta);

			right.appendChild(header);

			if (item.rating != null) {
				right.appendChild(createStarRating({ value: item.rating, readonly: true, size: "sm" }));
			}

			const reviewText = document.createElement("p");
			reviewText.className = "lmv-review-card__text";
			reviewText.textContent = item.review ?? "";
			right.appendChild(reviewText);

			const readMore = document.createElement("button");
			readMore.className = "lmv-btn lmv-btn--ghost lmv-btn--sm";
			readMore.textContent = "View details";
			readMore.addEventListener("click", () => opts.onItemClick(item));
			right.appendChild(readMore);

			card.appendChild(left);
			card.appendChild(right);
			list.appendChild(card);
		});

		listWrap.appendChild(list);
	};

	buildFilters();
	renderList();
}
