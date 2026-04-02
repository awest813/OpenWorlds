export type MenuTone = "gold" | "azure";

interface TonePalette {
    panelBg: string;
    border: string;
    headerRule: string;
    footerRule: string;
    title: string;
    subtitle: string;
    bodyText: string;
    mutedText: string;
    accent: string;
    backdrop: string;
    shadow: string;
}

const TONES: Record<MenuTone, TonePalette> = {
    gold: {
        panelBg: "linear-gradient(180deg, rgba(16,12,8,0.97), rgba(10,8,6,0.97))",
        border: "1px solid rgba(218, 182, 88, 0.72)",
        headerRule: "1px solid rgba(218, 182, 88, 0.24)",
        footerRule: "1px solid rgba(218, 182, 88, 0.18)",
        title: "#ffe39a",
        subtitle: "#c5af7a",
        bodyText: "#f3ebd8",
        mutedText: "#92825f",
        accent: "#ffd45d",
        backdrop:
            "radial-gradient(circle at 50% 35%, rgba(18, 14, 10, 0.22), rgba(4, 3, 2, 0.72) 65%, rgba(1, 1, 1, 0.78))",
        shadow: "0 20px 70px rgba(0,0,0,0.62), 0 0 40px rgba(255, 196, 70, 0.08)",
    },
    azure: {
        panelBg: "linear-gradient(180deg, rgba(10,16,26,0.97), rgba(8,12,20,0.97))",
        border: "1px solid rgba(126, 183, 255, 0.6)",
        headerRule: "1px solid rgba(126, 183, 255, 0.24)",
        footerRule: "1px solid rgba(126, 183, 255, 0.18)",
        title: "#b6dcff",
        subtitle: "#8eb2d3",
        bodyText: "#d8e7f6",
        mutedText: "#72879d",
        accent: "#7eb8ff",
        backdrop:
            "radial-gradient(circle at 50% 35%, rgba(8, 15, 24, 0.22), rgba(4, 7, 12, 0.72) 65%, rgba(1, 2, 4, 0.8))",
        shadow: "0 20px 70px rgba(0,0,0,0.62), 0 0 40px rgba(126, 183, 255, 0.1)",
    },
};

export interface MenuSurface {
    readonly root: HTMLDivElement;
    readonly panel: HTMLDivElement;
    readonly header: HTMLDivElement;
    readonly title: HTMLDivElement;
    readonly subtitle: HTMLDivElement;
    readonly body: HTMLDivElement;
    readonly footer: HTMLDivElement;
    readonly tone: TonePalette;
    setVisible: (visible: boolean) => void;
}

export interface CreateMenuSurfaceOptions {
    title: string;
    subtitle?: string;
    tone?: MenuTone;
    zIndex: number;
    width: string;
    maxHeight: string;
    onCloseRequest?: () => void;
}

export function createMenuSurface(options: CreateMenuSurfaceOptions): MenuSurface {
    const toneName = options.tone ?? "gold";
    const tone = TONES[toneName];

    const root = el("div", {
        position: "fixed",
        top: "0",
        left: "0",
        width: "100%",
        height: "100%",
        display: "none",
        pointerEvents: "none",
        zIndex: String(options.zIndex),
    });

    const backdrop = el("div", {
        position: "absolute",
        top: "0",
        left: "0",
        width: "100%",
        height: "100%",
        background: tone.backdrop,
        backdropFilter: "blur(3px)",
        pointerEvents: "auto",
    });
    if (options.onCloseRequest) {
        backdrop.addEventListener("click", () => options.onCloseRequest?.());
    }

    const panel = el("div", {
        position: "absolute",
        top: "50%",
        left: "50%",
        transform: "translate(-50%, -50%)",
        width: options.width,
        maxHeight: options.maxHeight,
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
        border: tone.border,
        borderRadius: "14px",
        background: tone.panelBg,
        boxShadow: tone.shadow,
        color: tone.bodyText,
        fontFamily: "monospace",
        lineHeight: "1.5",
        pointerEvents: "auto",
    });
    panel.setAttribute("role", "dialog");

    const header = el("div", {
        padding: "14px 18px 10px",
        borderBottom: tone.headerRule,
        background:
            toneName === "gold"
                ? "linear-gradient(180deg, rgba(255, 215, 120, 0.06), rgba(0,0,0,0))"
                : "linear-gradient(180deg, rgba(126, 183, 255, 0.08), rgba(0,0,0,0))",
    });

    const title = el("div", {
        color: tone.title,
        fontWeight: "bold",
        fontSize: "14px",
        letterSpacing: "0.7px",
        marginBottom: "4px",
        textTransform: "uppercase",
    });
    title.textContent = options.title;

    const subtitle = el("div", {
        color: tone.subtitle,
        fontSize: "11px",
    });
    subtitle.textContent = options.subtitle ?? "";
    subtitle.style.display = options.subtitle ? "" : "none";

    const body = el("div", {
        padding: "12px 16px 14px",
        overflow: "auto",
        fontSize: "12px",
    });

    const footer = el("div", {
        display: "none",
        alignItems: "center",
        gap: "8px",
        flexWrap: "wrap",
        padding: "10px 16px 12px",
        borderTop: tone.footerRule,
        fontSize: "10px",
        color: tone.mutedText,
    });

    header.appendChild(title);
    header.appendChild(subtitle);
    panel.appendChild(header);
    panel.appendChild(body);
    panel.appendChild(footer);
    root.appendChild(backdrop);
    root.appendChild(panel);
    document.body.appendChild(root);

    return {
        root,
        panel,
        header,
        title,
        subtitle,
        body,
        footer,
        tone,
        setVisible: (visible: boolean) => {
            root.style.display = visible ? "" : "none";
        },
    };
}

export function createKeycap(label: string, toneName: MenuTone = "gold"): HTMLSpanElement {
    const tone = TONES[toneName];
    const chip = el("span", {
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        minWidth: "20px",
        padding: "2px 8px",
        borderRadius: "6px",
        border: "1px solid rgba(255,255,255,0.24)",
        background: "rgba(255,255,255,0.06)",
        color: tone.accent,
        fontSize: "10px",
        fontWeight: "bold",
        letterSpacing: "0.3px",
        textTransform: "uppercase",
    });
    chip.textContent = label;
    return chip;
}

function el<K extends keyof HTMLElementTagNameMap>(
    tag: K,
    styles: Partial<CSSStyleDeclaration> = {}
): HTMLElementTagNameMap[K] {
    const elem = document.createElement(tag);
    Object.assign(elem.style, styles);
    return elem;
}
