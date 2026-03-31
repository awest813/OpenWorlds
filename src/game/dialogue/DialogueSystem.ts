import { InputManager } from "../input/InputManager";

export interface DialogueChoice {
    label: string;
    onSelect: () => void;
}

export interface DialogueLine {
    speaker: string;
    text: string;
    /** When present, renders clickable buttons instead of a "continue" hint. */
    choices?: DialogueChoice[];
}

/**
 * Lightweight DOM-based dialogue panel.
 *
 * Supports linear sequences and simple choice branches — enough for
 * greeting → quest offer → quest turn-in flows without a full narrative engine.
 *
 * Keyboard: T / Space / Enter advances a plain (no-choice) line.
 * Choices: rendered as clickable buttons (pointer-events: auto).
 */
export class DialogueSystem {
    private readonly root: HTMLDivElement;
    private readonly panel: HTMLDivElement;
    private readonly speakerEl: HTMLDivElement;
    private readonly textEl: HTMLDivElement;
    private readonly choicesEl: HTMLDivElement;
    private readonly hintEl: HTMLDivElement;

    private lines: DialogueLine[] = [];
    private currentLine = 0;
    private open = false;
    private onComplete: (() => void) | null = null;

    constructor() {
        this.root = DialogueSystem.el("div", {
            position: "fixed",
            top: "0",
            left: "0",
            width: "100%",
            height: "100%",
            pointerEvents: "none",
            zIndex: "20",
        });

        // Dialogue panel (bottom-centre, pointer-events: auto so buttons work)
        this.panel = DialogueSystem.el("div", {
            position: "absolute",
            bottom: "190px",
            left: "50%",
            transform: "translateX(-50%)",
            width: "clamp(460px, 52%, 700px)",
            background: "rgba(8,6,4,0.92)",
            border: "1px solid rgba(220,190,80,0.7)",
            borderRadius: "10px",
            padding: "16px 22px",
            pointerEvents: "auto",
            display: "none",
            fontFamily: "monospace",
        });

        this.speakerEl = DialogueSystem.el("div", {
            color: "#FFD700",
            fontWeight: "bold",
            fontSize: "14px",
            marginBottom: "8px",
            letterSpacing: "1px",
        });

        this.textEl = DialogueSystem.el("div", {
            color: "#e8e0d0",
            fontSize: "14px",
            lineHeight: "1.65",
            marginBottom: "14px",
        });

        this.choicesEl = DialogueSystem.el("div", {
            display: "none",
            gap: "12px",
            justifyContent: "flex-end",
        });

        this.hintEl = DialogueSystem.el("div", {
            color: "#666",
            fontSize: "11px",
            textAlign: "right",
        });
        this.hintEl.textContent = "[ T / Space to continue ]";

        this.panel.appendChild(this.speakerEl);
        this.panel.appendChild(this.textEl);
        this.panel.appendChild(this.choicesEl);
        this.panel.appendChild(this.hintEl);
        this.root.appendChild(this.panel);
        document.body.appendChild(this.root);
    }

    /** Start a dialogue sequence. onComplete fires after the last line is dismissed. */
    show(lines: DialogueLine[], onComplete?: () => void): void {
        this.lines = lines;
        this.currentLine = 0;
        this.open = true;
        this.onComplete = onComplete ?? null;
        this.renderLine();
        this.panel.style.display = "";
    }

    /** Handle keyboard advance. Call every frame when dialogue is active. */
    update(input: InputManager): void {
        if (!this.open) return;
        const line = this.lines[this.currentLine];
        if (line.choices) return; // choices are handled via button clicks
        if (
            input.isJustPressed("t") ||
            input.isJustPressed(" ") ||
            input.isJustPressed("Enter")
        ) {
            this.advance();
        }
    }

    isActive(): boolean {
        return this.open;
    }

    close(): void {
        this.open = false;
        this.panel.style.display = "none";
    }

    dispose(): void {
        this.root.remove();
    }

    // ── Private ──────────────────────────────────────────────────────────────

    private advance(): void {
        this.currentLine++;
        if (this.currentLine >= this.lines.length) {
            this.close();
            this.onComplete?.();
        } else {
            this.renderLine();
        }
    }

    private renderLine(): void {
        const line = this.lines[this.currentLine];
        this.speakerEl.textContent = line.speaker.toUpperCase();
        this.textEl.textContent = line.text;

        this.choicesEl.innerHTML = "";

        if (line.choices && line.choices.length > 0) {
            this.hintEl.style.display = "none";
            this.choicesEl.style.display = "flex";
            for (const choice of line.choices) {
                const btn = DialogueSystem.makeChoiceBtn(choice.label, () => {
                    choice.onSelect();
                    this.advance();
                });
                this.choicesEl.appendChild(btn);
            }
        } else {
            this.hintEl.style.display = "";
            this.choicesEl.style.display = "none";
        }
    }

    private static makeChoiceBtn(label: string, onClick: () => void): HTMLButtonElement {
        const btn = document.createElement("button");
        btn.textContent = label;
        Object.assign(btn.style, {
            background: "rgba(220,190,80,0.15)",
            border: "1px solid rgba(220,190,80,0.6)",
            borderRadius: "5px",
            color: "#FFD700",
            fontFamily: "monospace",
            fontSize: "13px",
            padding: "6px 18px",
            cursor: "pointer",
        });
        btn.addEventListener("mouseenter", () => {
            btn.style.background = "rgba(220,190,80,0.35)";
        });
        btn.addEventListener("mouseleave", () => {
            btn.style.background = "rgba(220,190,80,0.15)";
        });
        btn.addEventListener("click", onClick);
        return btn;
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
