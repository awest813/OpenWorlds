import { InputManager } from "../input/InputManager";
import { PlayerBuild } from "../progression/PlayerBuild";
import { PlayerClassId } from "../progression/PlayerClass";
import {
    getSkillNode,
    getSkillNodesForClass,
    SkillNodeDefinition,
    SkillNodeId,
    SkillTreeState,
} from "../progression/SkillTree";

/**
 * Full class skill list with ranks, prerequisites, and 1–9 hotkey mapping for unlockable nodes.
 */
export class SkillTreePanel {
    private readonly root: HTMLDivElement;
    private readonly classLine: HTMLDivElement;
    private readonly list: HTMLDivElement;
    private visible = false;

    constructor() {
        this.root = document.createElement("div");
        this.root.setAttribute("role", "dialog");
        this.root.setAttribute("aria-label", "Skill tree");
        const s = this.root.style;
        s.position = "fixed";
        s.top = "50%";
        s.left = "50%";
        s.transform = "translate(-50%, -50%)";
        s.zIndex = "19";
        s.width = "min(440px, calc(100vw - 32px))";
        s.maxHeight = "min(560px, calc(100vh - 48px))";
        s.overflow = "hidden";
        s.padding = "0";
        s.background = "rgba(10,12,18,0.96)";
        s.border = "1px solid rgba(140,190,255,0.45)";
        s.borderRadius = "10px";
        s.color = "#d8e4f0";
        s.fontFamily = "monospace";
        s.fontSize = "12px";
        s.lineHeight = "1.45";
        s.boxShadow = "0 8px 36px rgba(0,0,0,0.55)";
        s.flexDirection = "column";
        s.display = "none";

        const header = document.createElement("div");
        Object.assign(header.style, {
            padding: "14px 18px 10px",
            borderBottom: "1px solid rgba(140,190,255,0.2)",
        });
        const title = document.createElement("div");
        title.textContent = "Skill tree";
        Object.assign(title.style, {
            color: "#9ec8ff",
            fontWeight: "bold",
            fontSize: "14px",
            marginBottom: "6px",
            letterSpacing: "0.5px",
        });
        this.classLine = document.createElement("div");
        Object.assign(this.classLine.style, { color: "#a8b8c8", fontSize: "11px" });
        header.appendChild(title);
        header.appendChild(this.classLine);

        this.list = document.createElement("div");
        Object.assign(this.list.style, {
            overflow: "auto",
            padding: "10px 16px 14px",
            flex: "1",
        });

        const foot = document.createElement("div");
        foot.textContent = "Press K to close  ·  Keys 1–9 purchase the next available skill in list order";
        Object.assign(foot.style, {
            padding: "8px 16px 12px",
            fontSize: "10px",
            color: "#6a7a8a",
            borderTop: "1px solid rgba(140,190,255,0.15)",
        });

        this.root.appendChild(header);
        this.root.appendChild(this.list);
        this.root.appendChild(foot);
        document.body.appendChild(this.root);
    }

    update(input: InputManager, playerBuild: PlayerBuild): void {
        if (input.isJustPressed("k") || input.isJustPressed("K")) {
            this.visible = !this.visible;
            this.root.style.display = this.visible ? "flex" : "none";
            if (this.visible) this.refresh(playerBuild);
        }
        else if (this.visible) {
            this.refresh(playerBuild);
        }
    }

    /** Close without toggling (e.g. when entering dialogue). */
    hide(): void {
        this.visible = false;
        this.root.style.display = "none";
    }

    dispose(): void {
        this.root.remove();
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
        const row = document.createElement("div");
        Object.assign(row.style, {
            marginBottom: "10px",
            paddingBottom: "10px",
            borderBottom: "1px solid rgba(255,255,255,0.06)",
        });

        const titleRow = document.createElement("div");
        Object.assign(titleRow.style, { display: "flex", alignItems: "baseline", gap: "8px", flexWrap: "wrap" });

        const hotkey = hotkeyById.get(node.id);
        if (hotkey !== undefined && !maxed) {
            const badge = document.createElement("span");
            badge.textContent = `[${hotkey}]`;
            Object.assign(badge.style, {
                color: "#ffd83c",
                fontWeight: "bold",
                minWidth: "28px",
            });
            titleRow.appendChild(badge);
        } else if (!maxed) {
            const pad = document.createElement("span");
            pad.textContent = " ";
            pad.style.minWidth = "28px";
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
        rankLbl.textContent = ` ${rank}/${node.maxRank}`;
        Object.assign(rankLbl.style, { color: "#8899aa", fontSize: "11px" });
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
            color: tree.canUnlock(node.id) ? "#ffd83c" : "#6a7a88",
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
}
