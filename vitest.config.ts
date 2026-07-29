// ABOUTME: Vitest configuration for the plugin's pure-logic unit tests.
// ABOUTME: Runs in a node environment; source modules under test avoid Obsidian runtime imports.
import { defineConfig } from "vitest/config";

export default defineConfig({
	test: {
		environment: "node",
		include: ["tests/**/*.test.ts"],
	},
});
