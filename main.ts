// ABOUTME: Plugin entrypoint: registers the Media Visualizer view, ribbon icon and open command.
// ABOUTME: Reveals an existing leaf if open, otherwise opens the view in a new tab.
import { Plugin, WorkspaceLeaf } from "obsidian";
import { MediaVisualizerView, MEDIA_VIEW_TYPE } from "./src/MediaVisualizerView";

export default class MovieTvVisualizerPlugin extends Plugin {
	async onload(): Promise<void> {
		this.registerView(MEDIA_VIEW_TYPE, (leaf: WorkspaceLeaf) => new MediaVisualizerView(leaf));

		this.addRibbonIcon("clapperboard", "Movie & TV Visualizer", () => {
			this.activateView();
		});

		this.addCommand({
			id: "open-media-visualizer",
			name: "Open Media Visualizer",
			callback: () => this.activateView(),
		});
	}

	onunload(): void {
		this.app.workspace.detachLeavesOfType(MEDIA_VIEW_TYPE);
	}

	private async activateView(): Promise<void> {
		const existing = this.app.workspace.getLeavesOfType(MEDIA_VIEW_TYPE);
		if (existing.length > 0) {
			this.app.workspace.revealLeaf(existing[0]);
			return;
		}

		const leaf = this.app.workspace.getLeaf("tab");
		await leaf.setViewState({ type: MEDIA_VIEW_TYPE, active: true });
		this.app.workspace.revealLeaf(leaf);
	}
}
