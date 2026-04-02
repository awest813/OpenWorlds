/**
 * Toggleable in-game control reference (keyboard + mouse).
 * Kept in sync with README "Controls" section.
 */
export class ControlsOverlay {
    private readonly root: HTMLDivElement;
    private visible = false;

    constructor() {
        this.root = document.createElement("div");
        this.root.setAttribute("role", "dialog");
        this.root.setAttribute("aria-label", "Controls");
        const s = this.root.style;
        s.position = "fixed";
        s.top = "50%";
        s.left = "50%";
        s.transform = "translate(-50%, -50%)";
        s.zIndex = "18";
        s.display = "none";
        s.width = "min(420px, calc(100vw - 32px))";
        s.maxHeight = "min(520px, calc(100vh - 48px))";
        s.overflow = "auto";
        s.padding = "18px 22px";
        s.background = "rgba(8,6,4,0.94)";
        s.border = "1px solid rgba(220,190,80,0.65)";
        s.borderRadius = "10px";
        s.color = "#e8e0d0";
        s.fontFamily = "monospace";
        s.fontSize = "13px";
        s.lineHeight = "1.55";
        s.boxShadow = "0 8px 32px rgba(0,0,0,0.5)";

        const title = document.createElement("div");
        title.textContent = "Controls";
        Object.assign(title.style, {
            color: "#FFD700",
            fontWeight: "bold",
            fontSize: "15px",
            marginBottom: "12px",
            letterSpacing: "1px",
        });
        this.root.appendChild(title);

        const rows: [string, string][] = [
            ["W A S D", "Move"],
            ["Mouse", "Camera look"],
            ["J / LMB", "Attack"],
            ["Space", "Dodge"],
            ["E", "Dash Strike"],
            ["Q", "Spin Slash"],
            ["F / Tab", "Cycle target"],
            ["T", "Interact / talk"],
            ["Enter / Space / T", "Advance dialogue"],
            ["I", "Toggle inventory"],
            ["C", "Cycle class"],
            ["1–9", "Unlock skill (when available)"],
            ["P", "Screenshot"],
            ["V", "Toggle physics debug"],
            ["H", "Toggle this panel"],
            ["Esc", "Release mouse (after click-to-capture)"],
            ["R", "Quick reset (reload)"],
        ];

        for (const [key, action] of rows) {
            const row = document.createElement("div");
            Object.assign(row.style, {
                display: "grid",
                gridTemplateColumns: "140px 1fr",
                gap: "10px",
                marginBottom: "6px",
            });
            const k = document.createElement("span");
            k.textContent = key;
            Object.assign(k.style, { color: "#c9b87a" });
            const a = document.createElement("span");
            a.textContent = action;
            row.appendChild(k);
            row.appendChild(a);
            this.root.appendChild(row);
        }

        const hint = document.createElement("div");
        hint.textContent = "Press H to close";
        Object.assign(hint.style, {
            marginTop: "14px",
            fontSize: "11px",
            opacity: "0.75",
        });
        this.root.appendChild(hint);

        document.body.appendChild(this.root);
    }

    update(input: { isJustPressed: (key: string) => boolean }): void {
        if (input.isJustPressed("h") || input.isJustPressed("H")) {
            this.visible = !this.visible;
            this.root.style.display = this.visible ? "block" : "none";
        }
    }

    dispose(): void {
        this.root.remove();
    }
}
