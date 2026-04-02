import { createKeycap, createMenuSurface, MenuSurface } from "./MenuTheme";

/**
 * Toggleable in-game control reference (keyboard + mouse).
 * Kept in sync with README "Controls" section.
 */
export class ControlsOverlay {
    private readonly surface: MenuSurface;
    private visible = false;

    constructor() {
        this.surface = createMenuSurface({
            title: "Controls",
            subtitle: "Keyboard and mouse bindings",
            tone: "gold",
            zIndex: 28,
            width: "min(560px, calc(100vw - 34px))",
            maxHeight: "min(620px, calc(100vh - 42px))",
            onCloseRequest: () => this.hide(),
        });
        this.surface.panel.setAttribute("aria-label", "Controls");

        this.surface.body.style.display = "flex";
        this.surface.body.style.flexDirection = "column";
        this.surface.body.style.gap = "7px";
        this.surface.body.style.padding = "10px 14px 14px";

        const sections: { heading: string; rows: [string, string][] }[] = [
            {
                heading: "Movement",
                rows: [
                    ["W A S D", "Move"],
                    ["Shift", "Sprint (hold)"],
                    ["Ctrl", "Walk (hold)"],
                    ["Mouse", "Camera look"],
                    ["Esc", "Release mouse after pointer lock"],
                ],
            },
            {
                heading: "Combat",
                rows: [
                    ["J / LMB", "Attack"],
                    ["Space", "Dodge"],
                    ["E", "Dash Strike"],
                    ["Q", "Spin Slash"],
                    ["F / Tab", "Cycle target"],
                ],
            },
            {
                heading: "Interaction & Menus",
                rows: [
                    ["T", "Interact / talk"],
                    ["Enter / Space / T", "Advance dialogue"],
                    ["I", "Toggle inventory"],
                    ["K", "Toggle skill tree panel"],
                    ["1-9", "Unlock skill by panel order"],
                    ["C", "Cycle class"],
                    ["H", "Toggle controls overlay"],
                ],
            },
            {
                heading: "Utility",
                rows: [
                    ["P", "Screenshot"],
                    ["V", "Toggle physics debug"],
                    ["R", "Quick reset (reload)"],
                ],
            },
        ];

        for (const section of sections) {
            const group = this.makeSection(section.heading, section.rows);
            this.surface.body.appendChild(group);
        }

        this.surface.footer.style.display = "flex";
        this.surface.footer.textContent = "";
        this.surface.footer.appendChild(createKeycap("H", "gold"));
        const closeHint = document.createElement("span");
        closeHint.textContent = "Close";
        this.surface.footer.appendChild(closeHint);
        this.surface.footer.appendChild(document.createTextNode(" · "));
        this.surface.footer.appendChild(createKeycap("Esc", "gold"));
        const escHint = document.createElement("span");
        escHint.textContent = "Dismiss";
        this.surface.footer.appendChild(escHint);
    }

    dispose(): void {
        this.surface.root.remove();
    }

    toggle(): void {
        if (this.visible) {
            this.hide();
        } else {
            this.show();
        }
    }

    hide(): void {
        this.visible = false;
        this.surface.setVisible(false);
    }

    show(): void {
        this.visible = true;
        this.surface.setVisible(true);
    }

    isVisible(): boolean {
        return this.visible;
    }

    private makeSection(titleText: string, rows: [string, string][]): HTMLDivElement {
        const group = document.createElement("div");
        Object.assign(group.style, {
            border: "1px solid rgba(255,255,255,0.1)",
            borderRadius: "10px",
            background: "rgba(255,255,255,0.03)",
            overflow: "hidden",
        });

        const title = document.createElement("div");
        title.textContent = titleText.toUpperCase();
        Object.assign(title.style, {
            padding: "6px 10px",
            borderBottom: "1px solid rgba(255,255,255,0.09)",
            color: this.surface.tone.subtitle,
            fontSize: "10px",
            letterSpacing: "0.8px",
        });
        group.appendChild(title);

        const body = document.createElement("div");
        Object.assign(body.style, { padding: "4px 8px" });

        for (const [key, action] of rows) {
            const row = document.createElement("div");
            Object.assign(row.style, {
                display: "grid",
                gridTemplateColumns: "170px 1fr",
                gap: "10px",
                alignItems: "center",
                minHeight: "24px",
                padding: "2px 2px",
            });

            const keySlot = document.createElement("div");
            Object.assign(keySlot.style, { display: "flex", gap: "5px", flexWrap: "wrap" });
            keySlot.appendChild(createKeycap(key, "gold"));

            const actionLabel = document.createElement("span");
            actionLabel.textContent = action;
            actionLabel.style.color = this.surface.tone.bodyText;

            row.appendChild(keySlot);
            row.appendChild(actionLabel);
            body.appendChild(row);
        }

        group.appendChild(body);
        return group;
    }
}
