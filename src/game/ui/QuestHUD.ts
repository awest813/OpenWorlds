import { QuestManager } from "../quest/QuestManager";
import { QuestState } from "../quest/QuestData";

/**
 * DOM overlay panels for the RPG layer.
 *
 * Manages:
 *  - Active quest tracker  (top-right)
 *  - Interact prompt       (lower-centre, above the combat ability row)
 *  - Transient notification (centre screen, auto-fades)
 */
export class QuestHUD {
    private readonly root: HTMLDivElement;

    // Quest tracker (top-right)
    private readonly questPanel: HTMLDivElement;
    private readonly questTitle: HTMLDivElement;
    private readonly questObj: HTMLDivElement;

    // Interact prompt (lower-centre)
    private readonly interactPrompt: HTMLDivElement;

    // Notification (centre screen)
    private readonly notification: HTMLDivElement;
    private notifTimer = 0;

    constructor() {
        this.root = QuestHUD.el("div", {
            position: "fixed",
            top: "0",
            left: "0",
            width: "100%",
            height: "100%",
            pointerEvents: "none",
            fontFamily: "monospace",
            fontSize: "13px",
            color: "#fff",
            userSelect: "none",
            zIndex: "15",
        });

        // ── Quest tracker (top-right) ────────────────────────────────────────
        this.questPanel = QuestHUD.el("div", {
            position: "absolute",
            top: "12px",
            right: "12px",
            background: "rgba(0,0,0,0.55)",
            border: "1px solid rgba(220,190,80,0.45)",
            borderRadius: "6px",
            padding: "8px 14px",
            minWidth: "220px",
            display: "none",
        });

        const qLabel = QuestHUD.el("div", {
            color: "#888",
            fontSize: "10px",
            letterSpacing: "1px",
            marginBottom: "4px",
        });
        qLabel.textContent = "ACTIVE QUEST";

        this.questTitle = QuestHUD.el("div", {
            color: "#FFD700",
            fontWeight: "bold",
            fontSize: "13px",
            marginBottom: "4px",
        });

        this.questObj = QuestHUD.el("div", { fontSize: "12px", color: "#ffd83c" });

        this.questPanel.appendChild(qLabel);
        this.questPanel.appendChild(this.questTitle);
        this.questPanel.appendChild(this.questObj);

        // ── Interact prompt (lower-centre) ───────────────────────────────────
        this.interactPrompt = QuestHUD.el("div", {
            position: "absolute",
            bottom: "172px",
            left: "50%",
            transform: "translateX(-50%)",
            background: "rgba(0,0,0,0.6)",
            border: "1px solid rgba(255,255,255,0.25)",
            borderRadius: "5px",
            padding: "5px 16px",
            fontSize: "13px",
            display: "none",
            whiteSpace: "nowrap",
        });

        // ── Notification (centre screen) ─────────────────────────────────────
        this.notification = QuestHUD.el("div", {
            position: "absolute",
            top: "28%",
            left: "50%",
            transform: "translateX(-50%)",
            background: "rgba(0,0,0,0.8)",
            border: "1px solid rgba(120,230,120,0.5)",
            borderRadius: "8px",
            padding: "14px 30px",
            color: "#7eff7e",
            fontSize: "16px",
            textAlign: "center",
            display: "none",
            letterSpacing: "1px",
            lineHeight: "1.6",
        });

        this.root.appendChild(this.questPanel);
        this.root.appendChild(this.interactPrompt);
        this.root.appendChild(this.notification);
        document.body.appendChild(this.root);
    }

    /** Call every frame to keep all panels in sync. */
    update(
        dt: number,
        questManager: QuestManager,
        nearbyNpcName: string | null,
        gatherPrompt: string | null = null
    ): void {
        this.updateQuestPanel(questManager);
        this.updateInteractPrompt(nearbyNpcName, gatherPrompt);
        if (this.notifTimer > 0) {
            this.notifTimer -= dt;
            if (this.notifTimer <= 0) {
                this.notification.style.display = "none";
            }
        }
    }

    /** Show a transient notification in the centre of the screen. */
    showNotification(text: string, duration = 3.5): void {
        this.notification.innerHTML = text.replace(/\n/g, "<br>");
        this.notification.style.display = "";
        this.notifTimer = duration;
    }

    dispose(): void {
        this.root.remove();
    }

    // ── Private ──────────────────────────────────────────────────────────────

    private updateQuestPanel(qm: QuestManager): void {
        const active = qm.getActiveQuest();
        if (!active) {
            this.questPanel.style.display = "none";
            return;
        }
        this.questPanel.style.display = "";
        this.questTitle.textContent = active.def.title;

        if (active.state === QuestState.Completable) {
            this.questObj.textContent = `✓ Return to ${active.def.giver}`;
            this.questObj.style.color = "#7eff7e";
        } else {
            const { required, description } = active.def.objective;
            this.questObj.textContent = `${description}: ${active.progress}/${required}`;
            this.questObj.style.color = "#ffd83c";
        }
    }

    private updateInteractPrompt(npcName: string | null, gatherPrompt: string | null): void {
        if (npcName) {
            this.interactPrompt.textContent = `[ T ]  Talk to ${npcName}`;
            this.interactPrompt.style.display = "";
        } else if (gatherPrompt) {
            this.interactPrompt.textContent = `[ T ]  ${gatherPrompt}`;
            this.interactPrompt.style.display = "";
        } else {
            this.interactPrompt.style.display = "none";
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
