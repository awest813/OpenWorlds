import { PlayerBuild } from "../progression/PlayerBuild";
import { PlayerClassId } from "../progression/PlayerClass";
import {
    getSkillNode,
    getSkillNodesForClass,
    SkillNodeDefinition,
    SkillNodeId,
    SkillTreeState,
} from "../progression/SkillTree";
import { createKeycap, createMenuSurface, MenuSurface } from "./MenuTheme";

/**
 * Full class skill list with ranks, prerequisites, and 1–9 hotkey mapping for unlockable nodes.
 */
export class SkillTreePanel {
    private readonly surface: MenuSurface;
    private readonly classLine: HTMLDivElement;
    private readonly list: HTMLDivElement;
    private visible = false;

    constructor() {
        this.surface = createMenuSurface({
            title: "Skill Tree",
            subtitle: "Class talents and progression path",
            tone: "azure",
            zIndex: 29,
            width: "min(560px, calc(100vw - 34px))",
            maxHeight: "min(650px, calc(100vh - 44px))",
            onCloseRequest: () => this.hide(),
        });
        this.surface.panel.setAttribute("aria-label", "Skill tree");
        this.surface.body.style.padding = "10px 12px 12px";
        this.surface.body.style.display = "flex";
        this.surface.body.style.flexDirection = "column";
        this.surface.body.style.gap = "10px";

        this.classLine = document.createElement("div");
        Object.assign(this.classLine.style, {
            color: this.surface.tone.subtitle,
            fontSize: "11px",
            padding: "8px 10px",
            border: "1px solid rgba(255,255,255,0.11)",
            borderRadius: "9px",
            background: "rgba(255,255,255,0.04)",
        });

        this.list = document.createElement("div");
        Object.assign(this.list.style, {
            overflow: "auto",
            padding: "2px",
            flex: "1",
            display: "flex",
            flexDirection: "column",
            gap: "8px",
        });

        this.surface.body.appendChild(this.classLine);
        this.surface.body.appendChild(this.list);

        this.surface.footer.style.display = "flex";
        this.surface.footer.textContent = "";
        this.surface.footer.appendChild(createKeycap("K", "azure"));
        this.surface.footer.appendChild(this.inlineLabel("Close"));
        this.surface.footer.appendChild(this.inlineDivider());
        this.surface.footer.appendChild(createKeycap("1-9", "azure"));
        this.surface.footer.appendChild(this.inlineLabel("Unlock the matching listed skill"));
    }

    update(playerBuild: PlayerBuild): void {
        if (this.visible) {
            this.refresh(playerBuild);
        }
    }

    /** Close without toggling (e.g. when entering dialogue). */
    hide(): void {
        this.visible = false;
        this.surface.setVisible(false);
    }

    show(playerBuild: PlayerBuild): void {
        this.visible = true;
        this.surface.setVisible(true);
        this.refresh(playerBuild);
    }

    toggle(playerBuild: PlayerBuild): void {
        if (this.visible) {
            this.hide();
        } else {
            this.show(playerBuild);
        }
    }

    isVisible(): boolean {
        return this.visible;
    }

    dispose(): void {
        this.surface.root.remove();
    }

    private refresh(playerBuild: PlayerBuild): void {
        const tree = playerBuild.skillTree;
        const classId = tree.getClassId();
        const sp = tree.getSkillPoints();
        this.classLine.textContent = `${playerBuild.getClassDisplayName()}  ·  ${sp} skill point${sp === 1 ? "" : "s"}`;

        const unlockable = playerBuild.listUnlockableSkillNodes();
        const hotkeyById = new Map<SkillNodeId, number>();
        unlockable.forEach((n, i) => {
            if (i < 9) hotkeyById.set(n.id, i + 1);
        });

        this.list.replaceChildren();
        for (const node of getSkillNodesForClass(classId)) {
            this.list.appendChild(this.makeRow(node, tree, classId, hotkeyById));
        }
    }

    private makeRow(
        node: SkillNodeDefinition,
        tree: SkillTreeState,
        classId: PlayerClassId,
        hotkeyById: Map<SkillNodeId, number>
    ): HTMLDivElement {
        const rank = tree.getRank(node.id);
        const maxed = rank >= node.maxRank;
        const canUnlock = tree.canUnlock(node.id);
        const row = document.createElement("div");
        Object.assign(row.style, {
            padding: "10px 11px",
            border: "1px solid rgba(255,255,255,0.1)",
            borderRadius: "10px",
            background: canUnlock ? "rgba(126, 183, 255, 0.09)" : "rgba(255,255,255,0.03)",
        });

        const titleRow = document.createElement("div");
        Object.assign(titleRow.style, { display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" });

        const hotkey = hotkeyById.get(node.id);
        if (hotkey !== undefined && !maxed) {
            const badge = createKeycap(String(hotkey), "azure");
            titleRow.appendChild(badge);
        } else if (!maxed) {
            const pad = document.createElement("span");
            pad.textContent = " ";
            pad.style.minWidth = "32px";
            titleRow.appendChild(pad);
        }

        const name = document.createElement("span");
        name.textContent = node.displayName;
        Object.assign(name.style, {
            fontWeight: "bold",
            color: maxed ? "#7eff9a" : "#e8f0ff",
        });
        titleRow.appendChild(name);

        const rankLbl = document.createElement("span");
        rankLbl.textContent = `${rank}/${node.maxRank}`;
        Object.assign(rankLbl.style, {
            color: "#9eb3c8",
            fontSize: "10px",
            border: "1px solid rgba(255,255,255,0.15)",
            borderRadius: "999px",
            padding: "1px 7px",
            lineHeight: "1.4",
        });
        titleRow.appendChild(rankLbl);

        row.appendChild(titleRow);

        const desc = document.createElement("div");
        desc.textContent = node.description;
        Object.assign(desc.style, { color: "#9aacbc", fontSize: "11px", marginTop: "4px" });
        row.appendChild(desc);

        const status = document.createElement("div");
        status.textContent = this.statusText(node, tree, classId, maxed);
        Object.assign(status.style, {
            marginTop: "5px",
            fontSize: "10px",
            color: canUnlock ? "#c8e3ff" : "#7e93a8",
        });
        row.appendChild(status);

        return row;
    }

    private statusText(node: SkillNodeDefinition, tree: SkillTreeState, classId: PlayerClassId, maxed: boolean): string {
        if (maxed) return "Unlocked";
        if (tree.canUnlock(node.id)) return `Cost ${node.cost} SP — press matching number key to unlock`;
        if (node.requires !== undefined && tree.getRank(node.requires) < 1) {
            const req = getSkillNode(classId, node.requires);
            return `Locked — requires ${req?.displayName ?? "prerequisite"}`;
        }
        if (tree.getSkillPoints() < node.cost) {
            return `Need ${node.cost} SP (have ${tree.getSkillPoints()})`;
        }
        return "Locked";
    }

    private inlineLabel(text: string): HTMLSpanElement {
        const span = document.createElement("span");
        span.textContent = text;
        return span;
    }

    private inlineDivider(): HTMLSpanElement {
        const span = document.createElement("span");
        span.textContent = "·";
        span.style.opacity = "0.8";
        return span;
    }
}
