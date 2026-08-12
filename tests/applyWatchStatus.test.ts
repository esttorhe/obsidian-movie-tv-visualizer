// ABOUTME: Tests that writing an item's watchStatus keeps the legacy `watched` boolean in sync.
// ABOUTME: Every note in the vault still carries `watched`, so a stale value contradicts the note.
import { describe, it, expect } from "vitest";
import { applyWatchStatusToFrontmatter } from "../src/parse";

describe("applyWatchStatusToFrontmatter", () => {
	it("sets watched: true when the status becomes watched", () => {
		const fm: Record<string, unknown> = { watched: false, watchStatus: "watching" };

		applyWatchStatusToFrontmatter(fm, "watched");

		expect(fm.watchStatus).toBe("watched");
		expect(fm.watched).toBe(true);
	});

	it("clears watched when the status moves back off watched", () => {
		const fm: Record<string, unknown> = { watched: true, watchStatus: "watched" };

		applyWatchStatusToFrontmatter(fm, "unwatched");

		expect(fm.watchStatus).toBe("unwatched");
		expect(fm.watched).toBe(false);
	});

	it("treats dropped as not watched", () => {
		const fm: Record<string, unknown> = { watched: true, watchStatus: "watched" };

		applyWatchStatusToFrontmatter(fm, "dropped");

		expect(fm.watchStatus).toBe("dropped");
		expect(fm.watched).toBe(false);
	});

	it("treats watching as not watched", () => {
		const fm: Record<string, unknown> = { watched: true, watchStatus: "watched" };

		applyWatchStatusToFrontmatter(fm, "watching");

		expect(fm.watched).toBe(false);
	});

	it("leaves unrelated frontmatter fields alone", () => {
		const fm: Record<string, unknown> = { watched: false, rating: 8, title: "Film" };

		applyWatchStatusToFrontmatter(fm, "watched");

		expect(fm.rating).toBe(8);
		expect(fm.title).toBe("Film");
	});
});
