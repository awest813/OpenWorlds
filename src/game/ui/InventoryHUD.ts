import { getItemDef } from "../loot/ItemDefinitions";
import { PlayerBuild } from "../progression/PlayerBuild";
import { createKeycap, createMenuSurface, MenuSurface } from "./MenuTheme";

/**
 * A toggleable inventory panel (press I).
 * Shows current gold balance and all non-zero item stacks.
 */
export class InventoryHUD {
    private readonly surface: MenuSurface;
    private readonly summary: HTMLDivElement;
    private readonly itemsList: HTMLDivElement;
    private visible = false;

    constructor() {
        this.surface = createMenuSurface({
            title: "Inventory",
            subtitle: "Pack contents and currency",
            tone: "gold",
            zIndex: 30,
            width: "min(460px, calc(100vw - 36px))",
            maxHeight: "min(560px, calc(100vh - 42px))",
            onCloseRequest: () => this.hide(),
        });
        this.surface.panel.setAttribute("aria-label", "Inventory");
        this.surface.body.style.padding = "12px 14px 14px";
        this.surface.body.style.display = "flex";
        this.surface.body.style.flexDirection = "column";
        this.surface.body.style.gap = "10px";

        this.summary = InventoryHUD.el("div", {
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: "12px",
            border: "1px solid rgba(255,255,255,0.12)",
            borderRadius: "10px",
            background: "rgba(255,255,255,0.04)",
            padding: "9px 10px",
            color: this.surface.tone.bodyText,
            fontSize: "12px",
        });

        this.itemsList = InventoryHUD.el("div", {
            display: "flex",
            flexDirection: "column",
            gap: "8px",
        });

        this.surface.body.appendChild(this.summary);
        this.surface.body.appendChild(this.itemsList);

        this.surface.footer.style.display = "flex";
        this.surface.footer.textContent = "";
        this.surface.footer.appendChild(createKeycap("I", "gold"));
        const closeHint = InventoryHUD.el("span");
        closeHint.textContent = "Close";
        this.surface.footer.appendChild(closeHint);
    }

    toggle(build: PlayerBuild): void {
        this.visible = !this.visible;
        if (this.visible) {
            this.render(build);
            this.surface.setVisible(true);
        } else {
            this.surface.setVisible(false);
        }
    }

    hide(): void {
        this.visible = false;
        this.surface.setVisible(false);
    }

    isVisible(): boolean {
        return this.visible;
    }

    dispose(): void {
        this.surface.root.remove();
    }

    private render(build: PlayerBuild): void {
        this.summary.replaceChildren();
        const goldLabel = InventoryHUD.el("span", { color: this.surface.tone.subtitle });
        goldLabel.textContent = "Gold";
        const goldValue = InventoryHUD.el("span", {
            color: this.surface.tone.accent,
            fontWeight: "bold",
            fontSize: "13px",
        });
        goldValue.textContent = build.getGold().toString();
        this.summary.appendChild(goldLabel);
        this.summary.appendChild(goldValue);

        this.itemsList.replaceChildren();
        const entries = build.getInventoryEntries();
        if (entries.length === 0) {
            const empty = InventoryHUD.el("div", {
                color: this.surface.tone.mutedText,
                fontStyle: "italic",
                border: "1px dashed rgba(255,255,255,0.2)",
                borderRadius: "8px",
                padding: "12px",
                textAlign: "center",
            });
            empty.textContent = "No items collected yet.";
            this.itemsList.appendChild(empty);
        } else {
            for (const { itemId, count } of entries) {
                const def = getItemDef(itemId);
                const row = InventoryHUD.el("div", {
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    gap: "8px",
                    border: "1px solid rgba(255,255,255,0.08)",
                    borderRadius: "8px",
                    background: "rgba(255,255,255,0.03)",
                    padding: "8px 10px",
                });
                const name = InventoryHUD.el("span", { color: this.surface.tone.bodyText });
                name.textContent = def.displayName;
                const qty = InventoryHUD.el("span", {
                    color: this.surface.tone.subtitle,
                    fontWeight: "bold",
                    fontSize: "11px",
                });
                qty.textContent = `x${count}`;
                row.appendChild(name);
                row.appendChild(qty);
                this.itemsList.appendChild(row);
            }
        }
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
