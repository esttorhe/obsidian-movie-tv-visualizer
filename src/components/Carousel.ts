// ABOUTME: Horizontally scrollable row of media cards with prev/next arrows and a "view all" link.
// ABOUTME: Renders nothing for empty collections so callers can append unconditionally.
import type { MediaItem } from "../types";
import { createMediaCard } from "./MediaCard";

export interface CarouselOptions {
	title: string;
	items: MediaItem[];
	size?: "normal" | "compact" | "poster";
	onCardClick?: (item: MediaItem) => void;
	onFavToggle?: (item: MediaItem) => void;
	onMarkWatched?: (item: MediaItem) => void;
	onViewAll?: () => void;
}

export function createCarousel(opts: CarouselOptions): HTMLElement {
	const { title, items, size = "normal", onCardClick, onFavToggle, onMarkWatched, onViewAll } = opts;

	if (items.length === 0) {
		return document.createElement("div"); // don't render empty carousels
	}

	const section = document.createElement("section");
	section.className = "lmv-carousel";

	const header = document.createElement("div");
	header.className = "lmv-carousel__header";

	const titleEl = document.createElement("h2");
	titleEl.className = "lmv-carousel__title";
	titleEl.textContent = title;
	header.appendChild(titleEl);

	if (onViewAll) {
		const viewAll = document.createElement("button");
		viewAll.className = "lmv-btn lmv-btn--ghost";
		viewAll.textContent = "View all";
		viewAll.addEventListener("click", onViewAll);
		header.appendChild(viewAll);
	}

	section.appendChild(header);

	const wrapper = document.createElement("div");
	wrapper.className = "lmv-carousel__wrapper";

	const track = document.createElement("div");
	track.className = `lmv-carousel__track lmv-carousel__track--${size}`;

	items.forEach((item, i) => {
		const card = createMediaCard({
			item,
			size,
			onClick: onCardClick,
			onFavToggle,
			onMarkWatched,
		});
		card.style.animationDelay = `${i * 40}ms`;
		track.appendChild(card);
	});

	const btnPrev = document.createElement("button");
	btnPrev.className = "lmv-carousel__arrow lmv-carousel__arrow--prev";
	btnPrev.innerHTML = "‹";
	btnPrev.addEventListener("click", () => {
		track.scrollBy({ left: -(track.clientWidth * 0.8), behavior: "smooth" });
	});

	const btnNext = document.createElement("button");
	btnNext.className = "lmv-carousel__arrow lmv-carousel__arrow--next";
	btnNext.innerHTML = "›";
	btnNext.addEventListener("click", () => {
		track.scrollBy({ left: track.clientWidth * 0.8, behavior: "smooth" });
	});

	const updateArrows = () => {
		btnPrev.classList.toggle("lmv-carousel__arrow--hidden", track.scrollLeft <= 0);
		btnNext.classList.toggle(
			"lmv-carousel__arrow--hidden",
			track.scrollLeft + track.clientWidth >= track.scrollWidth - 4
		);
	};

	track.addEventListener("scroll", updateArrows, { passive: true });
	setTimeout(updateArrows, 100);

	wrapper.appendChild(btnPrev);
	wrapper.appendChild(track);
	wrapper.appendChild(btnNext);
	section.appendChild(wrapper);

	return section;
}
