import { CombatController, CombatPhase } from "../combat/CombatController";
import { TargetSystem } from "../combat/TargetSystem";
import { HealthComponent } from "../combat/HealthComponent";
import { EncounterManager, EncounterState } from "../encounter/EncounterManager";
import { COMBAT_CONFIG } from "../combat/CombatConfig";
import { PlayerProgression } from "../progression/PlayerProgression";
import { PlayerBuild } from "../progression/PlayerBuild";
import { formatLootSummary } from "../loot/LootTables";

/**
 * Minimal DOM overlay HUD for the combat prototype.
 *
 * Layout:
 *  ┌──────────────────────────────────────────────────────────────┐
 *  │  [state text – top-left]      [target – top-centre]          │
 *  │                                                               │
 *  │               [encounter banner – centre]                     │
 *  │                                                               │
 *  │                    [combo dots – bottom-centre]               │
 *  │              [E ability]  [Q ability] – bottom-centre         │
 *  │  [player HP – bottom-left]          [encounter – bottom-right]│
 *  └──────────────────────────────────────────────────────────────┘
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

    // Ability slots (E = Dash Strike, Q = Spin Slash)
    private readonly abilityRow: HTMLDivElement;
    private readonly dashPanel: HTMLDivElement;
    private readonly dashCdFill: HTMLDivElement;
    private readonly dashLabel: HTMLSpanElement;
    private readonly spinPanel: HTMLDivElement;
    private readonly spinCdFill: HTMLDivElement;
    private readonly spinLabel: HTMLSpanElement;

    // Player health (bottom-left)
    private readonly playerHpPanel: HTMLDivElement;
    private readonly playerHpFill: HTMLDivElement;
    private readonly playerHpText: HTMLSpanElement;

    // XP bar (bottom-left, above HP — MMO-style progression readout)
    private readonly xpPanel: HTMLDivElement;
    private readonly xpFill: HTMLDivElement;
    private readonly xpText: HTMLSpanElement;

    // Encounter status (bottom-right)
    private readonly encounterPanel: HTMLDivElement;
    private readonly encounterText: HTMLSpanElement;

    // Centre banner (clear / defeat message)
    private readonly bannerPanel: HTMLDivElement;
    private bannerTimer = 0;

    // Debug state
    private readonly stateLabel: HTMLDivElement;

    // Class / loot / skill summary (top-left stack)
    private readonly buildPanel: HTMLDivElement;
    private readonly buildClassLine: HTMLSpanElement;
    private readonly buildResourcesLine: HTMLSpanElement;
    private readonly buildSkillHint: HTMLSpanElement;

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
            bottom: "80px",
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

        // ── Ability row (bottom-centre, below dots) ──────────────────────
        this.abilityRow = CombatHUD.el("div", {
            position: "absolute",
            bottom: "24px",
            left: "50%",
            transform: "translateX(-50%)",
            display: "flex",
            gap: "10px",
        });

        // Dash Strike slot (E)
        this.dashPanel = CombatHUD.makeAbilityPanel();
        this.dashLabel = this.dashPanel.querySelector("span")!;
        this.dashCdFill = this.dashPanel.querySelector("div > div")!;

        // Spin Slash slot (Q)
        this.spinPanel = CombatHUD.makeAbilityPanel();
        this.spinLabel = this.spinPanel.querySelector("span")!;
        this.spinCdFill = this.spinPanel.querySelector("div > div")!;

        this.abilityRow.appendChild(this.dashPanel);
        this.abilityRow.appendChild(this.spinPanel);

        // ── Player health (bottom-left) ───────────────────────────────────
        this.playerHpPanel = CombatHUD.el("div", {
            position: "absolute",
            bottom: "42px",
            left: "12px",
            background: "rgba(0,0,0,0.55)",
            border: "1px solid rgba(255,255,255,0.2)",
            borderRadius: "6px",
            padding: "6px 12px",
            minWidth: "160px",
        });
        const playerHpLabel = CombatHUD.el("span", {
            display: "block",
            color: "#aaa",
            fontSize: "11px",
            marginBottom: "3px",
        });
        playerHpLabel.textContent = "PLAYER HP";
        const playerHpTrack = CombatHUD.el("div", {
            height: "8px",
            background: "rgba(255,255,255,0.15)",
            borderRadius: "4px",
            overflow: "hidden",
            marginBottom: "3px",
        });
        this.playerHpFill = CombatHUD.el("div", {
            height: "100%",
            width: "100%",
            background: "#44cc44",
            borderRadius: "4px",
            transition: "width 0.1s, background 0.2s",
        });
        this.playerHpText = CombatHUD.el("span", {
            color: "#ccc",
            fontSize: "11px",
        }) as HTMLSpanElement;
        playerHpTrack.appendChild(this.playerHpFill);
        this.playerHpPanel.appendChild(playerHpLabel);
        this.playerHpPanel.appendChild(playerHpTrack);
        this.playerHpPanel.appendChild(this.playerHpText);

        // ── XP bar (bottom-left, above HP) ─────────────────────────────────
        this.xpPanel = CombatHUD.el("div", {
            position: "absolute",
            bottom: "108px",
            left: "12px",
            background: "rgba(0,0,0,0.55)",
            border: "1px solid rgba(120,180,255,0.35)",
            borderRadius: "6px",
            padding: "6px 12px",
            minWidth: "200px",
        });
        const xpLabel = CombatHUD.el("span", {
            display: "block",
            color: "#8ab4ff",
            fontSize: "11px",
            marginBottom: "3px",
        });
        xpLabel.textContent = "EXPERIENCE";
        const xpTrack = CombatHUD.el("div", {
            height: "6px",
            background: "rgba(255,255,255,0.12)",
            borderRadius: "3px",
            overflow: "hidden",
            marginBottom: "3px",
        });
        this.xpFill = CombatHUD.el("div", {
            height: "100%",
            width: "0%",
            background: "linear-gradient(90deg, #3a6ea5, #7eb8ff)",
            borderRadius: "3px",
            transition: "width 0.12s",
        });
        this.xpText = CombatHUD.el("span", {
            color: "#aac8ff",
            fontSize: "11px",
        }) as HTMLSpanElement;
        xpTrack.appendChild(this.xpFill);
        this.xpPanel.appendChild(xpLabel);
        this.xpPanel.appendChild(xpTrack);
        this.xpPanel.appendChild(this.xpText);

        // ── Encounter status (bottom-right) ───────────────────────────────
        this.encounterPanel = CombatHUD.el("div", {
            position: "absolute",
            bottom: "12px",
            right: "12px",
            background: "rgba(0,0,0,0.45)",
            borderRadius: "4px",
            padding: "4px 8px",
            textAlign: "right",
            fontSize: "12px",
        });
        this.encounterText = CombatHUD.el("span", { color: "#aaa" }) as HTMLSpanElement;
        this.encounterPanel.appendChild(this.encounterText);

        // ── Centre banner (clear / defeat) ─────────────────────────────────
        this.bannerPanel = CombatHUD.el("div", {
            position: "absolute",
            top: "40%",
            left: "50%",
            transform: "translate(-50%, -50%)",
            background: "rgba(0,0,0,0.75)",
            border: "1px solid rgba(255,255,255,0.3)",
            borderRadius: "10px",
            padding: "18px 36px",
            textAlign: "center",
            display: "none",
            fontSize: "22px",
            letterSpacing: "2px",
        });

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

        this.buildPanel = CombatHUD.el("div", {
            position: "absolute",
            top: "44px",
            left: "12px",
            background: "rgba(0,0,0,0.5)",
            border: "1px solid rgba(140,200,255,0.35)",
            borderRadius: "6px",
            padding: "6px 10px",
            maxWidth: "320px",
            fontSize: "11px",
            lineHeight: "1.45",
            color: "#c8d8e8",
        });
        this.buildClassLine = CombatHUD.el("span", { display: "block", color: "#9ec8ff", marginBottom: "2px" }) as HTMLSpanElement;
        this.buildResourcesLine = CombatHUD.el("span", { display: "block", color: "#b0c4d8" }) as HTMLSpanElement;
        this.buildSkillHint = CombatHUD.el("span", { display: "block", color: "#8899aa", marginTop: "4px", fontSize: "10px" }) as HTMLSpanElement;
        this.buildPanel.appendChild(this.buildClassLine);
        this.buildPanel.appendChild(this.buildResourcesLine);
        this.buildPanel.appendChild(this.buildSkillHint);

        // ── Controls hint (bottom-left, below HP) ─────────────────────────
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
        hint.innerHTML =
            "WASD move &nbsp;|&nbsp; J / LMB attack &nbsp;|&nbsp; E dash-strike &nbsp;|&nbsp; Q spin-slash &nbsp;|&nbsp; Space dodge &nbsp;|&nbsp; F target &nbsp;|&nbsp; T talk &nbsp;|&nbsp; C class &nbsp;|&nbsp; 1–9 skills &nbsp;|&nbsp; R reset";

        // ── Assemble ──────────────────────────────────────────────────────
        this.root.appendChild(this.targetPanel);
        this.root.appendChild(this.comboPanel);
        this.root.appendChild(this.abilityRow);
        this.root.appendChild(this.xpPanel);
        this.root.appendChild(this.playerHpPanel);
        this.root.appendChild(this.encounterPanel);
        this.root.appendChild(this.bannerPanel);
        this.root.appendChild(this.stateLabel);
        this.root.appendChild(this.buildPanel);
        this.root.appendChild(hint);
        document.body.appendChild(this.root);
    }

    /** Call once per frame after combat systems have updated. */
    update(
        combat: CombatController,
        targeting: TargetSystem,
        playerHealth: HealthComponent,
        encounter: EncounterManager,
        progression: PlayerProgression,
        playerBuild: PlayerBuild
    ): void {
        this.updateTarget(targeting);
        this.updateCombo(combat);
        this.updateAbilities(combat);
        this.updateXp(progression);
        this.updatePlayerHp(playerHealth);
        this.updateEncounter(encounter);
        this.updateState(combat);
        this.updateBuildPanel(playerBuild);
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

    private updateAbilities(combat: CombatController): void {
        const phase = combat.getPhase();

        // Dash Strike (E)
        CombatHUD.refreshAbilitySlot(
            combat.dashStrike,
            this.dashLabel,
            this.dashCdFill,
            phase === CombatPhase.UsingAbility && combat.dashStrike.cooldownRemaining >= combat.dashStrike.cooldown - 0.05,
            "E"
        );

        // Spin Slash (Q)
        CombatHUD.refreshAbilitySlot(
            combat.spinSlash,
            this.spinLabel,
            this.spinCdFill,
            phase === CombatPhase.UsingAbility && combat.spinSlash.cooldownRemaining >= combat.spinSlash.cooldown - 0.05,
            "Q"
        );
    }

    private updateXp(progression: PlayerProgression): void {
        const frac = progression.getXpBarFraction();
        this.xpFill.style.width = `${(frac * 100).toFixed(0)}%`;
        const toward = progression.getXpTowardNext();
        const need = progression.getXpToNextLevel();
        this.xpText.textContent = `Lv ${progression.getLevel()}  ·  ${toward} / ${need} XP`;
    }

    private updatePlayerHp(health: HealthComponent): void {
        const pct = health.percent * 100;
        this.playerHpFill.style.width = `${pct.toFixed(0)}%`;
        // Colour shifts: green → yellow → red as HP drops
        if (pct > 50) {
            this.playerHpFill.style.background = "#44cc44";
        } else if (pct > 25) {
            this.playerHpFill.style.background = "#ccaa22";
        } else {
            this.playerHpFill.style.background = "#cc3030";
        }
        this.playerHpText.textContent = `${health.hp} / ${health.maxHp}`;

        // Show defeat banner once
        if (health.isDead && this.bannerPanel.style.display === "none") {
            this.showBanner("⚔  DEFEATED  ⚔", "#ff6060");
        }
    }

    private updateEncounter(encounter: EncounterManager): void {
        if (encounter.isClear()) {
            const loot = encounter.getLastLoot();
            const lootSuffix =
                loot && loot.drops.length > 0 ? `  ·  ${formatLootSummary(loot.drops)}` : "";
            this.encounterText.textContent = `✓ ENCOUNTER CLEAR  +${encounter.getReward().xp} XP${lootSuffix}`;
            this.encounterText.style.color = "#7eff7e";
        } else {
            this.encounterText.textContent = "● ENCOUNTER ACTIVE";
            this.encounterText.style.color = "#aaa";
        }

        // Show clear banner once
        if (encounter.getState() === EncounterState.Clear && this.bannerPanel.style.display === "none") {
            const loot = encounter.getLastLoot();
            const lootLine =
                loot && loot.drops.length > 0 ? `\n${formatLootSummary(loot.drops)}` : "";
            this.showBanner(`✓  ENCOUNTER CLEAR\n+${encounter.getReward().xp} XP${lootLine}\n\nPress R to replay`, "#7eff7e");
        }
    }

    private updateBuildPanel(playerBuild: PlayerBuild): void {
        const sp = playerBuild.skillTree.getSkillPoints();
        const unlockable = playerBuild.listUnlockableSkillNodes();
        this.buildClassLine.textContent = `Class: ${playerBuild.getClassDisplayName()}  (C cycle)`;
        this.buildResourcesLine.textContent = `Gold ${playerBuild.getGold()}  ·  Skill points ${sp}`;
        if (unlockable.length > 0) {
            const preview = unlockable
                .slice(0, 3)
                .map((n, i) => `${i + 1}:${n.displayName}`)
                .join("  ");
            this.buildSkillHint.textContent = `Skills: keys 1–9 buy (next: ${preview}${unlockable.length > 3 ? "…" : ""})`;
        } else if (sp > 0) {
            this.buildSkillHint.textContent = "Skills: unlock prerequisites to spend points.";
        } else {
            this.buildSkillHint.textContent = "Skills: level up for points.";
        }
    }

    private showBanner(text: string, color: string): void {
        this.bannerPanel.style.display = "";
        this.bannerPanel.style.color = color;
        this.bannerPanel.innerHTML = text.replace(/\n/g, "<br>");
    }

    private updateState(combat: CombatController): void {
        this.stateLabel.textContent = `Combat: ${combat.getPhase()}`;
    }

    // ── Static helpers ────────────────────────────────────────────────────

    /** Build an ability slot panel (label + cooldown bar). */
    private static makeAbilityPanel(): HTMLDivElement {
        const panel = CombatHUD.el("div", {
            background: "rgba(0,0,0,0.55)",
            border: "1px solid rgba(255,255,255,0.2)",
            borderRadius: "6px",
            padding: "4px 14px",
            textAlign: "center",
            minWidth: "140px",
        });
        const label = CombatHUD.el("span", { display: "block", marginBottom: "3px" }) as HTMLSpanElement;
        const cdTrack = CombatHUD.el("div", {
            height: "4px",
            background: "rgba(255,255,255,0.15)",
            borderRadius: "2px",
            overflow: "hidden",
        });
        const cdFill = CombatHUD.el("div", {
            height: "100%",
            width: "0%",
            background: "#60b0ff",
            borderRadius: "2px",
            transition: "width 0.05s",
        });
        cdTrack.appendChild(cdFill);
        panel.appendChild(label);
        panel.appendChild(cdTrack);
        return panel;
    }

    private static refreshAbilitySlot(
        ability: { displayName: string; isReady(): boolean; getCooldownFraction(): number; cooldownRemaining: number },
        label: HTMLSpanElement,
        cdFill: HTMLDivElement,
        isActive: boolean,
        key: string
    ): void {
        const frac = ability.getCooldownFraction();
        const ready = ability.isReady();

        if (ready) {
            label.textContent = `${key}  ${ability.displayName}  ●READY`;
            label.style.color = "#7eff7e";
        } else if (isActive) {
            label.textContent = `${key}  ${ability.displayName}  ►ACTIVE`;
            label.style.color = "#ffd83c";
        } else {
            label.textContent = `${key}  ${ability.displayName}  ${ability.cooldownRemaining.toFixed(1)}s`;
            label.style.color = "#aaa";
        }
        cdFill.style.width = `${(frac * 100).toFixed(0)}%`;
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
