// ABOUTME: Stats route: summary cards and charts for the collection, filterable by media type.
// ABOUTME: Adds TV-relevant breakdowns (shows by network, status distribution) beside movie/genre stats.
import { setIcon } from "obsidian";
import type { MediaFilter, VaultStats } from "../types";
import { MediaDataService } from "../services/MediaDataService";
import { StatsEngine } from "../services/StatsEngine";

const engine = new StatsEngine();

export function renderStats(container: HTMLElement, service: MediaDataService): void {
	container.innerHTML = "";
	container.className = "lmv-view lmv-view--stats";

	let mediaFilter: MediaFilter = "all";

	const h1 = document.createElement("h1");
	h1.className = "lmv-view__title";
	h1.textContent = "Stats";
	container.appendChild(h1);

	const filterRow = document.createElement("div");
	filterRow.className = "lmv-btn-group";
	container.appendChild(filterRow);

	const bodyEl = document.createElement("div");
	container.appendChild(bodyEl);

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
			btn.addEventListener("click", () => { mediaFilter = key; buildFilters(); renderBody(); });
			filterRow.appendChild(btn);
		});
	};

	const renderBody = () => {
		bodyEl.innerHTML = "";
		const items = mediaFilter === "all"
			? service.items
			: service.items.filter((m) => m.mediaType === mediaFilter);
		const stats = engine.computeStats(items);

		if (stats.total === 0) {
			const empty = document.createElement("div");
			empty.className = "lmv-empty";
			const iconEl = document.createElement("div");
			iconEl.className = "lmv-empty__icon";
			setIcon(iconEl, "bar-chart-2");
			const emptyP = document.createElement("p");
			emptyP.textContent = "No data yet.";
			empty.appendChild(iconEl);
			empty.appendChild(emptyP);
			bodyEl.appendChild(empty);
			return;
		}

		bodyEl.appendChild(buildSummary(stats, mediaFilter));

		const chartsGrid = document.createElement("div");
		chartsGrid.className = "lmv-charts-grid";

		const genreEntries = Object.entries(stats.genres).sort((a, b) => b[1] - a[1]).slice(0, 10);
		if (genreEntries.length > 0) {
			chartsGrid.appendChild(buildBarChart("Titles by genre", genreEntries));
		}

		const ratingEntries = Object.entries(stats.ratingDist)
			.sort((a, b) => Number(a[0]) - Number(b[0]))
			.map(([k, v]) => [`${k}/10`, v] as [string, number]);
		if (ratingEntries.length > 0) {
			chartsGrid.appendChild(buildBarChart("My rating distribution", ratingEntries));
		}

		const yearEntries = Object.entries(stats.byYear)
			.sort((a, b) => Number(a[0]) - Number(b[0]))
			.map(([k, v]) => [k, v] as [string, number]);
		if (yearEntries.length > 0) {
			chartsGrid.appendChild(buildTimeline("Titles by year", yearEntries));
		}

		if (stats.topCreators.length > 0) {
			const entries = stats.topCreators.map((d) => [d.name.split(" ").slice(-1)[0], d.count] as [string, number]);
			chartsGrid.appendChild(buildBarChart("Top directors & creators", entries));
		}

		// TV-specific breakdowns
		if (mediaFilter !== "movie") {
			const networkEntries = Object.entries(stats.networks).sort((a, b) => b[1] - a[1]).slice(0, 10);
			if (networkEntries.length > 0) {
				chartsGrid.appendChild(buildBarChart("Shows by network", networkEntries));
			}

			const statusEntries: [string, number][] = [
				["Returning", stats.tvStatus.returning],
				["Ended", stats.tvStatus.ended],
				["Canceled", stats.tvStatus.canceled],
			].filter(([, v]) => (v as number) > 0) as [string, number][];
			if (statusEntries.length > 0) {
				chartsGrid.appendChild(buildBarChart("TV status", statusEntries));
			}
		}

		bodyEl.appendChild(chartsGrid);
	};

	buildFilters();
	renderBody();
}

function buildSummary(stats: VaultStats, mediaFilter: MediaFilter): HTMLElement {
	const summary = document.createElement("div");
	summary.className = "lmv-stats-summary";
	const summaryItems: { icon: string; value: string | number; label: string }[] = [
		{ icon: "layers", value: stats.total, label: "Total titles" },
	];
	if (mediaFilter === "all") {
		summaryItems.push({ icon: "clapperboard", value: stats.movieCount, label: "Movies" });
		summaryItems.push({ icon: "tv", value: stats.tvCount, label: "TV Shows" });
	}
	summaryItems.push(
		{ icon: "check-circle", value: stats.watched, label: "Watched" },
		{ icon: "play-circle", value: stats.watching, label: "Watching" },
		{ icon: "eye", value: stats.unwatched, label: "Unwatched" },
		{ icon: "x-circle", value: stats.dropped, label: "Dropped" },
		{ icon: "heart", value: stats.favorites, label: "Favorites" },
		{ icon: "star", value: stats.avgRating > 0 ? stats.avgRating.toFixed(2) : "—", label: "Avg rating" },
		{ icon: "trending-up", value: stats.avgImdb > 0 ? stats.avgImdb.toFixed(2) : "—", label: "Avg IMDb" },
		{ icon: "clock", value: engine.formatRuntime(stats.totalRuntime), label: "Total time" },
		{ icon: "users", value: stats.creators, label: "Creators" }
	);
	summaryItems.forEach(({ icon, value, label }) => {
		const item = document.createElement("div");
		item.className = "lmv-stats-card";
		const iconEl = document.createElement("div");
		iconEl.className = "lmv-stats-card__icon";
		setIcon(iconEl, icon);
		const valueEl = document.createElement("span");
		valueEl.className = "lmv-stats-card__value";
		valueEl.textContent = String(value);
		const labelEl = document.createElement("span");
		labelEl.className = "lmv-stats-card__label";
		labelEl.textContent = label;
		item.appendChild(iconEl);
		item.appendChild(valueEl);
		item.appendChild(labelEl);
		summary.appendChild(item);
	});
	return summary;
}

function buildBarChart(title: string, entries: [string, number][]): HTMLElement {
	const section = document.createElement("div");
	section.className = "lmv-chart";

	const h = document.createElement("h3");
	h.className = "lmv-chart__title";
	h.textContent = title;
	section.appendChild(h);

	const max = Math.max(...entries.map((e) => e[1]));

	const bars = document.createElement("div");
	bars.className = "lmv-chart__bars";

	entries.forEach(([label, value]) => {
		const row = document.createElement("div");
		row.className = "lmv-chart__row";

		const labelEl = document.createElement("span");
		labelEl.className = "lmv-chart__label";
		labelEl.textContent = label;
		labelEl.title = label;

		const barWrap = document.createElement("div");
		barWrap.className = "lmv-chart__bar-wrap";

		const bar = document.createElement("div");
		bar.className = "lmv-chart__bar";
		const pct = max > 0 ? (value / max) * 100 : 0;
		bar.style.width = "0%";
		setTimeout(() => { bar.style.width = `${pct}%`; }, 50);

		const valEl = document.createElement("span");
		valEl.className = "lmv-chart__value";
		valEl.textContent = String(value);

		barWrap.appendChild(bar);
		row.appendChild(labelEl);
		row.appendChild(barWrap);
		row.appendChild(valEl);
		bars.appendChild(row);
	});

	section.appendChild(bars);
	return section;
}

function buildTimeline(title: string, entries: [string, number][]): HTMLElement {
	const section = document.createElement("div");
	section.className = "lmv-chart lmv-chart--timeline";

	const h = document.createElement("h3");
	h.className = "lmv-chart__title";
	h.textContent = title;
	section.appendChild(h);

	const max = Math.max(...entries.map((e) => e[1]));

	const svgNS = "http://www.w3.org/2000/svg";
	const svg = document.createElementNS(svgNS, "svg");
	svg.setAttribute("viewBox", `0 0 ${entries.length * 20} 60`);
	svg.setAttribute("preserveAspectRatio", "none");
	svg.setAttribute("class", "lmv-sparkline");

	if (entries.length > 1) {
		const points = entries.map((e, i) => {
			const x = i * 20 + 10;
			const y = max > 0 ? 55 - (e[1] / max) * 50 : 55;
			return `${x},${y}`;
		});

		const polyline = document.createElementNS(svgNS, "polyline");
		polyline.setAttribute("points", points.join(" "));
		polyline.setAttribute("fill", "none");
		polyline.setAttribute("stroke", "var(--interactive-accent)");
		polyline.setAttribute("stroke-width", "2");
		polyline.setAttribute("stroke-linecap", "round");
		polyline.setAttribute("stroke-linejoin", "round");
		svg.appendChild(polyline);

		entries.forEach((e, i) => {
			const x = i * 20 + 10;
			const y = max > 0 ? 55 - (e[1] / max) * 50 : 55;
			const circle = document.createElementNS(svgNS, "circle");
			circle.setAttribute("cx", String(x));
			circle.setAttribute("cy", String(y));
			circle.setAttribute("r", "3");
			circle.setAttribute("fill", "var(--interactive-accent)");
			const title = document.createElementNS(svgNS, "title");
			title.textContent = `${e[0]}: ${e[1]}`;
			circle.appendChild(title);
			svg.appendChild(circle);
		});
	}

	section.appendChild(svg);

	const xLabels = document.createElement("div");
	xLabels.className = "lmv-sparkline__labels";
	const step = Math.max(1, Math.floor(entries.length / 8));
	entries.forEach((e, i) => {
		if (i % step === 0 || i === entries.length - 1) {
			const label = document.createElement("span");
			label.textContent = e[0];
			xLabels.appendChild(label);
		}
	});
	section.appendChild(xLabels);

	return section;
}
