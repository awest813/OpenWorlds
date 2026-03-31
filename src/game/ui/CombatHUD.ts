import { CombatController, CombatPhase } from "../combat/CombatController";
import { TargetSystem } from "../combat/TargetSystem";
import { COMBAT_CONFIG } from "../combat/CombatConfig";

/**
 * Minimal DOM overlay HUD for the combat prototype.
 *
 * Layout:
 *  ┌──────────────────────────────────────────────────────┐
 *  │  [state text – top-left]    [target – top-centre]    │
 *  │                                                       │
 *  │                                                       │
 *  │        [combo dots – bottom-centre]                   │
 *  │              [ability – bottom-centre]                │
 *  └──────────────────────────────────────────────────────┘
 *
 * Everything is pointer-events:none so mouse input passes through to the
 * canvas.
 */
export class CombatHUD {
    private readonly root: HTMLDivElement;

    // Target panel
    private readonly targetPanel: HTMLDivElement;
    private readonly targetName: HTMLSpanElement;
    private readonly targetHpFill: HTMLDivElement;
    private readonly targetHpText: HTMLSpanElement;

    // Combo dots
    private readonly comboPanel: HTMLDivElement;
    private readonly comboDots: HTMLSpanElement[];

    // Ability
    private readonly abilityPanel: HTMLDivElement;
    private readonly abilityCdFill: HTMLDivElement;
    private readonly abilityLabel: HTMLSpanElement;

    // Debug state
    private readonly stateLabel: HTMLDivElement;

    constructor() {
        this.root = CombatHUD.el("div", {
            position: "fixed",
            top: "0",
            left: "0",
            width: "100%",
            height: "100%",
            pointerEvents: "none",
            fontFamily: "monospace",
            fontSize: "14px",
            color: "#fff",
            userSelect: "none",
            zIndex: "10",
        });

        // ── Target panel (top-centre) ────────────────────────────────────
        this.targetPanel = CombatHUD.el("div", {
            position: "absolute",
            top: "24px",
            left: "50%",
            transform: "translateX(-50%)",
            background: "rgba(0,0,0,0.55)",
            border: "1px solid rgba(255,220,60,0.7)",
            borderRadius: "6px",
            padding: "6px 14px",
            minWidth: "180px",
            textAlign: "center",
            display: "none",
        });
        this.targetName = CombatHUD.el("span", {
            display: "block",
            color: "#ffd83c",
            fontWeight: "bold",
            marginBottom: "4px",
            letterSpacing: "1px",
        }) as HTMLSpanElement;

        const hpRow = CombatHUD.el("div", { display: "flex", alignItems: "center", gap: "6px" });
        const hpTrack = CombatHUD.el("div", {
            flex: "1",
            height: "8px",
            background: "rgba(255,255,255,0.15)",
            borderRadius: "4px",
            overflow: "hidden",
        });
        this.targetHpFill = CombatHUD.el("div", {
            height: "100%",
            width: "100%",
            background: "#e03030",
            borderRadius: "4px",
            transition: "width 0.1s",
        });
        this.targetHpText = CombatHUD.el("span", { color: "#ccc", whiteSpace: "nowrap" }) as HTMLSpanElement;
        hpTrack.appendChild(this.targetHpFill);
        hpRow.appendChild(hpTrack);
        hpRow.appendChild(this.targetHpText);
        this.targetPanel.appendChild(this.targetName);
        this.targetPanel.appendChild(hpRow);

        // ── Combo dots (bottom-centre) ───────────────────────────────────
        this.comboPanel = CombatHUD.el("div", {
            position: "absolute",
            bottom: "60px",
            left: "50%",
            transform: "translateX(-50%)",
            display: "flex",
            gap: "10px",
        });
        this.comboDots = [];
        for (let i = 0; i < COMBAT_CONFIG.COMBO_COUNT; i++) {
            const dot = CombatHUD.el("span", {
                display: "inline-block",
                width: "14px",
                height: "14px",
                borderRadius: "50%",
                border: "2px solid rgba(255,255,255,0.5)",
                background: "transparent",
                transition: "background 0.05s",
            }) as HTMLSpanElement;
            this.comboPanel.appendChild(dot);
            this.comboDots.push(dot);
        }

        // ── Ability panel (bottom-centre, below dots) ────────────────────
        this.abilityPanel = CombatHUD.el("div", {
            position: "absolute",
            bottom: "24px",
            left: "50%",
            transform: "translateX(-50%)",
            background: "rgba(0,0,0,0.55)",
            border: "1px solid rgba(255,255,255,0.2)",
            borderRadius: "6px",
            padding: "4px 14px",
            textAlign: "center",
            minWidth: "160px",
        });
        this.abilityLabel = CombatHUD.el("span", { display: "block", marginBottom: "3px" }) as HTMLSpanElement;
        const cdTrack = CombatHUD.el("div", {
            height: "4px",
            background: "rgba(255,255,255,0.15)",
            borderRadius: "2px",
            overflow: "hidden",
        });
        this.abilityCdFill = CombatHUD.el("div", {
            height: "100%",
            width: "0%",
            background: "#60b0ff",
            borderRadius: "2px",
            transition: "width 0.05s",
        });
        cdTrack.appendChild(this.abilityCdFill);
        this.abilityPanel.appendChild(this.abilityLabel);
        this.abilityPanel.appendChild(cdTrack);

        // ── Debug state label (top-left) ─────────────────────────────────
        this.stateLabel = CombatHUD.el("div", {
            position: "absolute",
            top: "12px",
            left: "12px",
            background: "rgba(0,0,0,0.45)",
            borderRadius: "4px",
            padding: "4px 8px",
            color: "#aaa",
            fontSize: "12px",
        });

        // ── Controls hint (bottom-left) ───────────────────────────────────
        const hint = CombatHUD.el("div", {
            position: "absolute",
            bottom: "12px",
            left: "12px",
            background: "rgba(0,0,0,0.45)",
            borderRadius: "4px",
            padding: "4px 8px",
            color: "#888",
            fontSize: "11px",
            lineHeight: "1.6",
        });
        hint.innerHTML = "WASD move &nbsp;|&nbsp; J / LMB attack &nbsp;|&nbsp; E dash-strike &nbsp;|&nbsp; Space dodge &nbsp;|&nbsp; F target";

        // ── Assemble ──────────────────────────────────────────────────────
        this.root.appendChild(this.targetPanel);
        this.root.appendChild(this.comboPanel);
        this.root.appendChild(this.abilityPanel);
        this.root.appendChild(this.stateLabel);
        this.root.appendChild(hint);
        document.body.appendChild(this.root);
    }

    /** Call once per frame after combat systems have updated. */
    update(combat: CombatController, targeting: TargetSystem): void {
        this.updateTarget(targeting);
        this.updateCombo(combat);
        this.updateAbility(combat);
        this.updateState(combat);
    }

    dispose(): void {
        this.root.remove();
    }

    // ── Private updaters ──────────────────────────────────────────────────

    private updateTarget(targeting: TargetSystem): void {
        const t = targeting.getCurrentTarget();
        if (t === null) {
            this.targetPanel.style.display = "none";
            return;
        }
        this.targetPanel.style.display = "";
        this.targetName.textContent = t.displayName.toUpperCase();
        const pct = t.health.percent * 100;
        this.targetHpFill.style.width = `${pct.toFixed(0)}%`;
        this.targetHpText.textContent = `${t.health.hp}/${t.health.maxHp}`;
    }

    private updateCombo(combat: CombatController): void {
        const step = combat.getComboStep();
        const phase = combat.getPhase();
        const inCombo =
            phase === CombatPhase.HitWindow ||
            phase === CombatPhase.Lockout ||
            phase === CombatPhase.ChainWindow;

        for (let i = 0; i < this.comboDots.length; i++) {
            const dot = this.comboDots[i];
            if (inCombo && i <= step) {
                dot.style.background = "rgba(255,200,40,0.9)";
                dot.style.borderColor = "rgba(255,200,40,1)";
            } else {
                dot.style.background = "transparent";
                dot.style.borderColor = "rgba(255,255,255,0.4)";
            }
        }
    }

    private updateAbility(combat: CombatController): void {
        const ability = combat.dashStrike;
        const frac = ability.getCooldownFraction();
        const ready = ability.isReady();
        const phase = combat.getPhase();
        const active = phase === CombatPhase.UsingAbility;

        if (ready) {
            this.abilityLabel.textContent = `E  ${ability.displayName}  ●READY`;
            this.abilityLabel.style.color = "#7eff7e";
        } else if (active) {
            this.abilityLabel.textContent = `E  ${ability.displayName}  ►ACTIVE`;
            this.abilityLabel.style.color = "#ffd83c";
        } else {
            const remaining = (ability.cooldownRemaining).toFixed(1);
            this.abilityLabel.textContent = `E  ${ability.displayName}  ${remaining}s`;
            this.abilityLabel.style.color = "#aaa";
        }
        // Cooldown bar shows remaining fraction (drains as CD ticks down)
        this.abilityCdFill.style.width = `${(frac * 100).toFixed(0)}%`;
    }

    private updateState(combat: CombatController): void {
        this.stateLabel.textContent = `Combat: ${combat.getPhase()}`;
    }

    // ── Utility ───────────────────────────────────────────────────────────

    private static el<K extends keyof HTMLElementTagNameMap>(
        tag: K,
        styles: Partial<CSSStyleDeclaration> = {}
    ): HTMLElementTagNameMap[K] {
        const elem = document.createElement(tag);
        Object.assign(elem.style, styles);
        return elem;
    }
}
