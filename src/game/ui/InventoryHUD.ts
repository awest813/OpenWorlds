import { getItemDef } from "../loot/ItemDefinitions";
import { PlayerBuild } from "../progression/PlayerBuild";

/**
 * A toggleable inventory panel (press I).
 * Shows current gold balance and all non-zero item stacks.
 */
export class InventoryHUD {
    private readonly panel: HTMLDivElement;
    private visible = false;

    constructor() {
        this.panel = InventoryHUD.el("div", {
            position: "fixed",
            top: "50%",
            left: "50%",
            transform: "translate(-50%, -50%)",
            background: "rgba(0,0,0,0.88)",
            border: "1px solid rgba(220,190,80,0.6)",
            borderRadius: "8px",
            padding: "18px 28px",
            minWidth: "260px",
            fontFamily: "monospace",
            fontSize: "13px",
            color: "#fff",
            userSelect: "none",
            zIndex: "20",
            display: "none",
            pointerEvents: "none",
        });
        document.body.appendChild(this.panel);
    }

    toggle(build: PlayerBuild): void {
        this.visible = !this.visible;
        if (this.visible) {
            this.render(build);
            this.panel.style.display = "";
        } else {
            this.panel.style.display = "none";
        }
    }

    hide(): void {
        this.visible = false;
        this.panel.style.display = "none";
    }

    isVisible(): boolean {
        return this.visible;
    }

    dispose(): void {
        this.panel.remove();
    }

    private render(build: PlayerBuild): void {
        const parts: string[] = [
            `<div style="color:#888;font-size:10px;letter-spacing:1px;margin-bottom:10px">INVENTORY</div>`,
            `<div style="color:#FFD700;margin-bottom:8px">&#9654; Gold: ${build.getGold()}</div>`,
        ];

        const entries = build.getInventoryEntries();
        if (entries.length === 0) {
            parts.push(`<div style="color:#555;font-style:italic">No items collected yet.</div>`);
        } else {
            for (const { itemId, count } of entries) {
                const def = getItemDef(itemId);
                parts.push(
                    `<div style="margin-bottom:4px">${def.displayName} <span style="color:#aaa">×${count}</span></div>`
                );
            }
        }

        parts.push(
            `<div style="color:#555;font-size:10px;margin-top:12px;border-top:1px solid rgba(255,255,255,0.08);padding-top:8px">[ I ] close</div>`
        );
        this.panel.innerHTML = parts.join("");
    }

    private static el<K extends keyof HTMLElementTagNameMap>(
        tag: K,
        styles: Partial<CSSStyleDeclaration> = {}
    ): HTMLElementTagNameMap[K] {
        const elem = document.createElement(tag);
        Object.assign(elem.style, styles);
        return elem;
    }
}
