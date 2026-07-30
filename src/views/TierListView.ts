// ABOUTME: Tier List route: drag-and-drop ranking of movies and TV shows into custom labelled tiers.
// ABOUTME: Tier labels/colors and assignments are persisted; supports PNG export of the whole board.
import { setIcon } from "obsidian";
import type { MediaItem } from "../types";
import { MediaDataService } from "../services/MediaDataService";

export interface TierEntry {
	id: string;
	label: string;
	color: string;
	itemIds: string[];
}

export interface TierListData {
	tiers: TierEntry[];
}

export interface TierListOptions {
	service: MediaDataService;
	onItemClick: (item: MediaItem) => void;
	savedData?: TierListData;
	onSave?: (data: TierListData) => void;
}

let _idSeq = 0;
function uid(): string {
	return `tier-${Date.now()}-${_idSeq++}`;
}

const DEFAULT_TIER_DEFS = [
	{ label: "S", color: "#ff7f7f" },
	{ label: "A", color: "#ffbf7f" },
	{ label: "B", color: "#ffdf7f" },
	{ label: "C", color: "#bfdf7f" },
	{ label: "D", color: "#7fbfbf" },
];

export function renderTierList(container: HTMLElement, opts: TierListOptions): void {
	container.innerHTML = "";
	container.className = "lmv-view lmv-view--tierlist";

	// Native HTML5 drag-and-drop only auto-scrolls the window/document, not an inner
	// scrollable pane like this one — so dragging near the top/bottom edge here would
	// otherwise do nothing. Drive it manually off drag events, which bubble to `container`.
	const autoScroll = attachAutoScroll(container);
	container.addEventListener("dragstart", autoScroll.onDragStart);
	container.addEventListener("dragover", autoScroll.onDragOver);
	container.addEventListener("dragend", autoScroll.onDragEnd);

	const items = opts.service.items;
	const itemMap = new Map(items.map((m) => [m.id, m]));

	let tiers: TierEntry[] = opts.savedData?.tiers?.length
		? opts.savedData.tiers.map((t) => ({ ...t, itemIds: t.itemIds.filter((id) => itemMap.has(id)) }))
		: DEFAULT_TIER_DEFS.map((def) => ({ id: uid(), ...def, itemIds: [] }));

	const save = () => opts.onSave?.({ tiers });

	const assignedIds = (): Set<string> => {
		const s = new Set<string>();
		tiers.forEach((t) => t.itemIds.forEach((id) => s.add(id)));
		return s;
	};

	const toolbar = document.createElement("div");
	toolbar.className = "lmv-tierlist__toolbar";
	container.appendChild(toolbar);

	const tiersEl = document.createElement("div");
	tiersEl.className = "lmv-tierlist__tiers";
	container.appendChild(tiersEl);

	const poolSection = document.createElement("div");
	poolSection.className = "lmv-tierlist__pool-section";
	container.appendChild(poolSection);

	const spacer = document.createElement("div");
	spacer.style.flex = "1";
	toolbar.appendChild(spacer);

	const addBtn = document.createElement("button");
	addBtn.className = "lmv-btn lmv-btn--sm lmv-btn--ghost";
	setIcon(addBtn, "plus");
	addBtn.appendChild(document.createTextNode(" Add tier"));
	addBtn.addEventListener("click", () => {
		tiers.push({ id: uid(), label: "New", color: "#9b9bcc", itemIds: [] });
		save();
		renderAll();
	});
	toolbar.appendChild(addBtn);

	const exportBtn = document.createElement("button");
	exportBtn.className = "lmv-btn lmv-btn--sm lmv-btn--ghost";
	setIcon(exportBtn, "camera");
	exportBtn.appendChild(document.createTextNode(" Save image"));
	exportBtn.addEventListener("click", () => exportTierList(tiers, itemMap));
	toolbar.appendChild(exportBtn);

	const resetBtn = document.createElement("button");
	resetBtn.className = "lmv-btn lmv-btn--sm lmv-btn--ghost lmv-btn--danger";
	setIcon(resetBtn, "rotate-ccw");
	resetBtn.appendChild(document.createTextNode(" Reset"));
	resetBtn.title = "Reset tier list to defaults (all titles go back to pool)";
	resetBtn.addEventListener("click", () => {
		if (!confirm("Reset the entire tier list? All assignments will be cleared.")) return;
		tiers = DEFAULT_TIER_DEFS.map((def) => ({ id: uid(), ...def, itemIds: [] }));
		save();
		renderAll();
	});
	toolbar.appendChild(resetBtn);

	const poolHeader = document.createElement("div");
	poolHeader.className = "lmv-tierlist__pool-header";
	const poolLabelEl = document.createElement("span");
	poolLabelEl.className = "lmv-tierlist__pool-title";
	poolLabelEl.textContent = "Unranked";
	poolHeader.appendChild(poolLabelEl);
	poolSection.appendChild(poolHeader);

	const poolEl = document.createElement("div");
	poolEl.className = "lmv-tierlist__pool";
	poolSection.appendChild(poolEl);

	const onDropToTier = (tierId: string, itemId: string, sourceTierId: string) => {
		if (sourceTierId !== "pool") {
			const src = tiers.find((t) => t.id === sourceTierId);
			if (src) src.itemIds = src.itemIds.filter((id) => id !== itemId);
		}
		const dst = tiers.find((t) => t.id === tierId);
		if (dst && !dst.itemIds.includes(itemId)) dst.itemIds.push(itemId);
		save();
		renderAll();
	};

	const onDropToPool = (itemId: string, sourceTierId: string) => {
		if (sourceTierId === "pool") return;
		const src = tiers.find((t) => t.id === sourceTierId);
		if (src) src.itemIds = src.itemIds.filter((id) => id !== itemId);
		save();
		renderAll();
	};

	const renderTierRow = (tier: TierEntry, idx: number): HTMLElement => {
		const row = document.createElement("div");
		row.className = "lmv-tierlist__row";

		const labelCell = document.createElement("div");
		labelCell.className = "lmv-tierlist__label";
		labelCell.style.backgroundColor = tier.color;

		const labelText = document.createElement("span");
		labelText.className = "lmv-tierlist__label-text";
		labelText.textContent = tier.label;
		labelCell.appendChild(labelText);

		const editIcon = document.createElement("span");
		editIcon.className = "lmv-tierlist__label-edit-icon";
		setIcon(editIcon, "pencil");
		labelCell.appendChild(editIcon);

		labelCell.addEventListener("click", () =>
			showTierEditor(tier, () => { save(); renderAll(); })
		);
		row.appendChild(labelCell);

		const itemsCell = document.createElement("div");
		itemsCell.className = "lmv-tierlist__movies";
		attachDropZone(itemsCell, (itemId, sourceTierId) =>
			onDropToTier(tier.id, itemId, sourceTierId)
		);
		tier.itemIds.forEach((id) => {
			const item = itemMap.get(id);
			if (item) itemsCell.appendChild(createItem(item, tier.id, opts.onItemClick));
		});
		row.appendChild(itemsCell);

		const controls = document.createElement("div");
		controls.className = "lmv-tierlist__row-controls";

		if (idx > 0) {
			const upBtn = document.createElement("button");
			upBtn.className = "lmv-btn lmv-btn--icon-plain";
			upBtn.title = "Move up";
			setIcon(upBtn, "chevron-up");
			upBtn.addEventListener("click", () => {
				[tiers[idx - 1], tiers[idx]] = [tiers[idx], tiers[idx - 1]];
				save(); renderAll();
			});
			controls.appendChild(upBtn);
		}

		if (idx < tiers.length - 1) {
			const downBtn = document.createElement("button");
			downBtn.className = "lmv-btn lmv-btn--icon-plain";
			downBtn.title = "Move down";
			setIcon(downBtn, "chevron-down");
			downBtn.addEventListener("click", () => {
				[tiers[idx], tiers[idx + 1]] = [tiers[idx + 1], tiers[idx]];
				save(); renderAll();
			});
			controls.appendChild(downBtn);
		}

		const delBtn = document.createElement("button");
		delBtn.className = "lmv-btn lmv-btn--icon-plain";
		delBtn.title = "Delete tier (titles return to pool)";
		setIcon(delBtn, "trash-2");
		delBtn.addEventListener("click", () => {
			tiers = tiers.filter((t) => t.id !== tier.id);
			save(); renderAll();
		});
		controls.appendChild(delBtn);

		row.appendChild(controls);
		return row;
	};

	const renderAll = () => {
		tiersEl.innerHTML = "";
		tiers.forEach((tier, i) => tiersEl.appendChild(renderTierRow(tier, i)));

		poolEl.innerHTML = "";
		attachDropZone(poolEl, (itemId, sourceTierId) => onDropToPool(itemId, sourceTierId));

		const assigned = assignedIds();
		const pool = items
			.filter((m) => !assigned.has(m.id))
			.sort((a, b) => a.title.localeCompare(b.title));

		poolLabelEl.textContent = `Unranked (${pool.length})`;

		if (pool.length === 0) {
			const msg = document.createElement("p");
			msg.className = "lmv-tierlist__pool-empty";
			msg.textContent = "All titles ranked!";
			poolEl.appendChild(msg);
		} else {
			pool.forEach((item) => poolEl.appendChild(createItem(item, "pool", opts.onItemClick)));
		}
	};

	renderAll();
}

function createItem(
	item: MediaItem,
	sourceTierId: string,
	onClick: (m: MediaItem) => void
): HTMLElement {
	const el = document.createElement("div");
	el.className = "lmv-tierlist__item";
	el.draggable = true;
	el.title = item.title;

	if (item.cover) {
		const img = document.createElement("img");
		img.src = item.cover;
		img.alt = item.title;
		img.loading = "lazy";
		el.appendChild(img);
	} else {
		const fb = document.createElement("div");
		fb.className = "lmv-tierlist__item-fallback";
		fb.textContent = item.title.slice(0, 2).toUpperCase();
		el.appendChild(fb);
	}

	const badge = document.createElement("span");
	badge.className = `lmv-tierlist__item-type lmv-tierlist__item-type--${item.mediaType}`;
	setIcon(badge, item.mediaType === "movie" ? "clapperboard" : "tv");
	el.appendChild(badge);

	el.addEventListener("dragstart", (e) => {
		e.dataTransfer!.setData("text/plain", JSON.stringify({ itemId: item.id, sourceTierId }));
		e.dataTransfer!.effectAllowed = "move";
		setTimeout(() => el.classList.add("lmv-tierlist__item--dragging"), 0);
	});
	el.addEventListener("dragend", () => el.classList.remove("lmv-tierlist__item--dragging"));
	el.addEventListener("click", () => onClick(item));

	return el;
}

const AUTOSCROLL_EDGE_ZONE = 60; // px from the container's top/bottom edge that triggers scrolling
const AUTOSCROLL_MAX_SPEED = 18; // px per animation frame at the very edge

interface AutoScrollController {
	onDragStart: () => void;
	onDragOver: (e: DragEvent) => void;
	onDragEnd: () => void;
}

function attachAutoScroll(scrollEl: HTMLElement): AutoScrollController {
	let pointerY: number | null = null;
	let rafId: number | null = null;

	const tick = () => {
		if (pointerY != null) {
			const rect = scrollEl.getBoundingClientRect();
			const distFromTop = pointerY - rect.top;
			const distFromBottom = rect.bottom - pointerY;
			if (distFromTop >= 0 && distFromTop < AUTOSCROLL_EDGE_ZONE) {
				scrollEl.scrollTop -= AUTOSCROLL_MAX_SPEED * (1 - distFromTop / AUTOSCROLL_EDGE_ZONE);
			} else if (distFromBottom >= 0 && distFromBottom < AUTOSCROLL_EDGE_ZONE) {
				scrollEl.scrollTop += AUTOSCROLL_MAX_SPEED * (1 - distFromBottom / AUTOSCROLL_EDGE_ZONE);
			}
		}
		rafId = requestAnimationFrame(tick);
	};

	return {
		onDragStart: () => {
			pointerY = null;
			if (rafId == null) rafId = requestAnimationFrame(tick);
		},
		onDragOver: (e: DragEvent) => {
			pointerY = e.clientY;
		},
		onDragEnd: () => {
			pointerY = null;
			if (rafId != null) {
				cancelAnimationFrame(rafId);
				rafId = null;
			}
		},
	};
}

function attachDropZone(
	el: HTMLElement,
	onDrop: (itemId: string, sourceTierId: string) => void
): void {
	el.addEventListener("dragover", (e) => {
		e.preventDefault();
		el.classList.add("lmv-tierlist__drop--active");
	});
	el.addEventListener("dragleave", (e) => {
		if (!el.contains(e.relatedTarget as Node))
			el.classList.remove("lmv-tierlist__drop--active");
	});
	el.addEventListener("drop", (e) => {
		e.preventDefault();
		el.classList.remove("lmv-tierlist__drop--active");
		try {
			const { itemId, sourceTierId } = JSON.parse(e.dataTransfer!.getData("text/plain"));
			onDrop(itemId, sourceTierId);
		} catch { /* ignore bad data */ }
	});
}

const PRESET_COLORS = [
	"#ff7f7f", "#ff4d4d", "#cc0000",
	"#ffbf7f", "#ff8c00", "#cc5500",
	"#ffef7f", "#ffd700", "#b8a000",
	"#bfff7f", "#80cc00", "#559900",
	"#7fffff", "#00bfbf", "#007a7a",
	"#7fbfff", "#1e90ff", "#0055cc",
	"#bf7fff", "#8844ee", "#550099",
	"#ff7fbf", "#ee44aa", "#aa0066",
	"#ffffff", "#aaaaaa", "#555555",
];

function showTierEditor(tier: TierEntry, onDone: () => void): void {
	document.querySelectorAll(".lmv-tierlist__modal-overlay").forEach((el) => el.remove());

	const overlay = document.createElement("div");
	overlay.className = "lmv-tierlist__modal-overlay";

	const modal = document.createElement("div");
	modal.className = "lmv-tierlist__modal";

	const header = document.createElement("div");
	header.className = "lmv-tierlist__modal-header";
	const title = document.createElement("span");
	title.className = "lmv-tierlist__modal-title";
	title.textContent = "Edit tier";
	header.appendChild(title);
	modal.appendChild(header);

	const nameLabel = document.createElement("span");
	nameLabel.className = "lmv-tierlist__editor-label";
	nameLabel.textContent = "Name";
	modal.appendChild(nameLabel);

	const labelInput = document.createElement("input");
	labelInput.type = "text";
	labelInput.value = tier.label;
	labelInput.className = "lmv-input lmv-tierlist__label-input";
	labelInput.maxLength = 12;
	labelInput.placeholder = "Tier name";
	modal.appendChild(labelInput);

	const colorLabel = document.createElement("span");
	colorLabel.className = "lmv-tierlist__editor-label";
	colorLabel.textContent = "Color";
	modal.appendChild(colorLabel);

	const previewRow = document.createElement("div");
	previewRow.className = "lmv-tierlist__editor-preview-row";

	const preview = document.createElement("div");
	preview.className = "lmv-tierlist__color-preview";
	preview.style.backgroundColor = tier.color;
	previewRow.appendChild(preview);

	const hexInput = document.createElement("input");
	hexInput.type = "text";
	hexInput.value = tier.color;
	hexInput.className = "lmv-input lmv-tierlist__hex-input";
	hexInput.placeholder = "#rrggbb";
	hexInput.maxLength = 7;
	previewRow.appendChild(hexInput);

	const nativePicker = document.createElement("input");
	nativePicker.type = "color";
	nativePicker.value = tier.color;
	nativePicker.className = "lmv-tierlist__native-picker";

	const pickerBtn = document.createElement("button");
	pickerBtn.className = "lmv-btn lmv-btn--sm lmv-btn--ghost lmv-tierlist__picker-btn";
	pickerBtn.title = "Custom color";
	setIcon(pickerBtn, "pipette");
	pickerBtn.appendChild(nativePicker);
	previewRow.appendChild(pickerBtn);
	modal.appendChild(previewRow);

	let selectedColor = tier.color;
	const applyColor = (hex: string) => {
		selectedColor = hex;
		preview.style.backgroundColor = hex;
		hexInput.value = hex;
		nativePicker.value = hex;
		modal.querySelectorAll(".lmv-tierlist__swatch").forEach((s) =>
			s.classList.toggle("lmv-tierlist__swatch--active", (s as HTMLElement).dataset.hex === hex)
		);
	};

	hexInput.addEventListener("input", () => {
		const v = hexInput.value.trim();
		if (/^#[0-9a-fA-F]{6}$/.test(v)) applyColor(v);
	});
	nativePicker.addEventListener("input", () => applyColor(nativePicker.value));

	const palette = document.createElement("div");
	palette.className = "lmv-tierlist__palette";
	PRESET_COLORS.forEach((hex) => {
		const swatch = document.createElement("button");
		swatch.className = "lmv-tierlist__swatch";
		swatch.dataset.hex = hex;
		swatch.style.backgroundColor = hex;
		swatch.title = hex;
		if (hex === tier.color) swatch.classList.add("lmv-tierlist__swatch--active");
		swatch.addEventListener("click", (e) => {
			e.stopPropagation();
			applyColor(hex);
		});
		palette.appendChild(swatch);
	});
	modal.appendChild(palette);

	const actions = document.createElement("div");
	actions.className = "lmv-tierlist__editor-actions";

	const cancelBtn = document.createElement("button");
	cancelBtn.className = "lmv-btn lmv-btn--sm lmv-btn--ghost";
	cancelBtn.textContent = "Cancel";
	cancelBtn.addEventListener("click", () => overlay.remove());
	actions.appendChild(cancelBtn);

	const okBtn = document.createElement("button");
	okBtn.className = "lmv-btn lmv-btn--sm lmv-btn--primary";
	okBtn.textContent = "Apply";
	okBtn.addEventListener("click", () => {
		tier.label = labelInput.value.trim() || tier.label;
		tier.color = selectedColor;
		overlay.remove();
		onDone();
	});
	actions.appendChild(okBtn);
	modal.appendChild(actions);

	overlay.appendChild(modal);
	document.body.appendChild(overlay);

	overlay.addEventListener("click", (e) => {
		if (e.target === overlay) overlay.remove();
	});

	labelInput.focus();
	labelInput.select();
}

async function exportTierList(tiers: TierEntry[], itemMap: Map<string, MediaItem>): Promise<void> {
	const LABEL_W = 90;
	const ITEM_W = 66;
	const ITEM_H = 99;
	const GAP = 3;
	const PAD = 6;
	const ROW_H = ITEM_H + PAD * 2;
	const MIN_W = 900;

	const maxItems = Math.max(...tiers.map((t) => t.itemIds.length), 1);
	const canvasW = Math.max(MIN_W, LABEL_W + maxItems * (ITEM_W + GAP) + PAD * 2);
	const canvasH = tiers.length * ROW_H;

	const canvas = document.createElement("canvas");
	canvas.width = canvasW;
	canvas.height = canvasH;
	const ctx = canvas.getContext("2d")!;

	ctx.fillStyle = "#1a1a2e";
	ctx.fillRect(0, 0, canvasW, canvasH);

	const imgCache = new Map<string, HTMLImageElement>();
	const allIds = [...new Set(tiers.flatMap((t) => t.itemIds))];

	await Promise.allSettled(
		allIds.map(async (id) => {
			const item = itemMap.get(id);
			if (!item?.cover) return;
			try {
				const res = await fetch(item.cover);
				const blob = await res.blob();
				const objectUrl = URL.createObjectURL(blob);
				await new Promise<void>((resolve) => {
					const img = new Image();
					img.onload = () => { imgCache.set(id, img); URL.revokeObjectURL(objectUrl); resolve(); };
					img.onerror = () => { URL.revokeObjectURL(objectUrl); resolve(); };
					img.src = objectUrl;
				});
			} catch { /* fall back to text */ }
		})
	);

	tiers.forEach((tier, rowIdx) => {
		const y = rowIdx * ROW_H;

		ctx.fillStyle = "#0f172a";
		ctx.fillRect(LABEL_W, y, canvasW - LABEL_W, ROW_H);

		ctx.fillStyle = tier.color;
		ctx.fillRect(0, y, LABEL_W, ROW_H);

		const fontSize = tier.label.length > 6 ? 14 : tier.label.length > 3 ? 18 : 24;
		ctx.fillStyle = "#000000";
		ctx.font = `bold ${fontSize}px sans-serif`;
		ctx.textAlign = "center";
		ctx.textBaseline = "middle";
		ctx.fillText(tier.label, LABEL_W / 2, y + ROW_H / 2, LABEL_W - 8);

		tier.itemIds.forEach((id, i) => {
			const x = LABEL_W + PAD + i * (ITEM_W + GAP);
			const imgY = y + PAD;
			const img = imgCache.get(id);

			if (img) {
				ctx.drawImage(img, x, imgY, ITEM_W, ITEM_H);
			} else {
				const item = itemMap.get(id);
				ctx.fillStyle = "#2d2d4e";
				ctx.fillRect(x, imgY, ITEM_W, ITEM_H);
				if (item) {
					ctx.fillStyle = "#aaaacc";
					ctx.font = "bold 11px sans-serif";
					ctx.textAlign = "center";
					ctx.textBaseline = "middle";
					const words = item.title.split(" ");
					const line1 = words.slice(0, Math.ceil(words.length / 2)).join(" ");
					const line2 = words.slice(Math.ceil(words.length / 2)).join(" ");
					ctx.fillText(line1, x + ITEM_W / 2, imgY + ITEM_H / 2 - 8, ITEM_W - 4);
					if (line2) ctx.fillText(line2, x + ITEM_W / 2, imgY + ITEM_H / 2 + 8, ITEM_W - 4);
				}
			}
		});

		ctx.strokeStyle = "#334155";
		ctx.lineWidth = 1;
		ctx.beginPath();
		ctx.moveTo(0, y + ROW_H - 0.5);
		ctx.lineTo(canvasW, y + ROW_H - 0.5);
		ctx.stroke();
	});

	ctx.strokeStyle = "#334155";
	ctx.lineWidth = 2;
	ctx.beginPath();
	ctx.moveTo(LABEL_W - 1, 0);
	ctx.lineTo(LABEL_W - 1, canvasH);
	ctx.stroke();

	canvas.toBlob((blob) => {
		if (!blob) return;
		const url = URL.createObjectURL(blob);
		const a = document.createElement("a");
		a.href = url;
		a.download = "media-tierlist.png";
		document.body.appendChild(a);
		a.click();
		document.body.removeChild(a);
		setTimeout(() => URL.revokeObjectURL(url), 1000);
	}, "image/png");
}
