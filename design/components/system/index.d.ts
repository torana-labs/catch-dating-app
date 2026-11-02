// Catch design system: types for every component (React). Flutter mirrors these names and props.
import * as React from "react";
type LucideIcon = React.ForwardRefExoticComponent<any>;

// ---- context ----
/** What sits behind a component. Components read it to pick their own fill, outline and ink. */
export type Ground = "ground" | "tile" | "nested" | "colour" | "night" | "night-tile";
export type Theme = "day" | "night";
export type SizeClass = "compact" | "medium" | "expanded";
/** Event formats. Each has a full-strength colour that means "this event". Quizzes and trivia are games. */
export type Format = "run" | "dinner" | "games" | "courts" | "nights-out";
/** Colours a person or a placeholder can take: the formats plus indigo, which is never an event colour. */
export type PaletteColour = Format | "indigo";
/** app: the apps and the website. quiet: Admin, the quietest register: plain-type headings, neutral badges, one-line table cells, a text sidebar. */
export type Register = "app" | "quiet";
interface CatchContextValue {
    theme: Theme;
    register?: Register;
    sizeClass: SizeClass;
    ground: Ground;
    format?: Format;
    reducedMotion: boolean;
}
export declare function useCatch(): CatchContextValue;
/** The ground a component sits on. */
export declare function useGround(): Ground;
export interface RootProps {
    /** Day screens are white; night is for the door, the live console and staff screens. */
    theme?: Theme;
    /** "auto" measures the root's own width. */
    size?: SizeClass | "auto";
    /** The event this screen is about: accent buttons, markers and badges pick up its colour. */
    format?: Format;
    /** quiet for Admin. Everything inside reads it from CSS (data-register), so screens never restyle parts themselves. */
    register?: Register;
    children?: React.ReactNode;
    className?: string;
    style?: React.CSSProperties;
}
/**
 * Sets the theme and size class for everything inside it. Wrap each screen (or the whole app) once.
 * Flutter: CatchRoot(theme:, sizeClass:) above MaterialApp's home.
 */
export declare function Root({ theme, size, format, register, children, className, style }: RootProps): React.JSX.Element;
/** Re-provides context with a new ground (and optionally a format or theme). Used by Surface. */
export declare function GroundProvider({ ground, format, theme, children }: {
    ground: Ground;
    format?: Format;
    theme?: Theme;
    children?: React.ReactNode;
}): React.JSX.Element;
export declare function cx(...parts: Array<string | false | null | undefined>): string;
/** Night grounds collapse to one switch for components that only care about light versus dark. */
export declare const isNight: (g: Ground) => g is "night" | "night-tile";
/**
 * For any row of a variable number of items: whether it overflows, and which ends hide content.
 * Components use it to fade the hidden edge or change mode, so overflow is handled inside the component,
 * never by the screen that uses it.
 */
export declare function useOverflow<T extends HTMLElement>(): [React.RefObject<T | null>, {
    overflows: boolean;
    edges?: "start" | "end" | "both";
}];

// ---- tokens ----
export declare const tokens: {
    readonly colors: {
        readonly ground: {
            readonly day: "#ffffff";
            readonly night: "#141114";
        };
        readonly tile: {
            readonly day: "#f3f3f1";
            readonly night: "#231e23";
        };
        readonly nested: {
            readonly day: "#ffffff";
            readonly night: "#2e2630";
        };
        readonly paper: {
            readonly day: "#f6f0e8";
            readonly night: "#f6f0e8";
        };
        readonly map: {
            readonly day: "#edebe6";
            readonly night: "#2a252a";
        };
        readonly scrim: {
            readonly day: "rgba(20, 17, 20, 0.45)";
            readonly night: "rgba(0, 0, 0, 0.6)";
        };
        readonly ink: {
            readonly day: "#141114";
            readonly night: "#f6efe6";
        };
        readonly "ink-2": {
            readonly day: "#5a5450";
            readonly night: "#bdb3a7";
        };
        readonly "ink-3": {
            readonly day: "#767069";
            readonly night: "#948a80";
        };
        readonly "on-primary": {
            readonly day: "#ffffff";
            readonly night: "#141114";
        };
        readonly primary: {
            readonly day: "#141114";
            readonly night: "#f6efe6";
        };
        readonly line: {
            readonly day: "rgba(20, 17, 20, 0.1)";
            readonly night: "rgba(246, 239, 230, 0.12)";
        };
        readonly "control-line": {
            readonly day: "rgba(20, 17, 20, 0.18)";
            readonly night: "rgba(246, 239, 230, 0.28)";
        };
        readonly "field-line": {
            readonly day: "rgba(20, 17, 20, 0.22)";
            readonly night: "rgba(246, 239, 230, 0.25)";
        };
        readonly focus: {
            readonly day: "#141114";
            readonly night: "#f6efe6";
        };
        readonly track: {
            readonly day: "#eeedea";
            readonly night: "rgba(246, 239, 230, 0.14)";
        };
        readonly "switch-off": {
            readonly day: "#d9d6d1";
            readonly night: "rgba(246, 239, 230, 0.22)";
        };
        readonly "format-run": {
            readonly day: "#f07a55";
            readonly night: "#f07a55";
        };
        readonly "format-dinner": {
            readonly day: "#f08aa0";
            readonly night: "#f08aa0";
        };
        readonly "format-games": {
            readonly day: "#f5c451";
            readonly night: "#f5c451";
        };
        readonly "format-courts": {
            readonly day: "#5ccb9f";
            readonly night: "#5ccb9f";
        };
        readonly "format-nights-out": {
            readonly day: "#e58ac8";
            readonly night: "#e58ac8";
        };
        readonly indigo: {
            readonly day: "#8c9bf2";
            readonly night: "#8c9bf2";
        };
        readonly "on-format": {
            readonly day: "#141114";
            readonly night: "#141114";
        };
        readonly "tint-mint": {
            readonly day: "#ddf3ea";
            readonly night: "#1f3a2e";
        };
        readonly "tint-yellow": {
            readonly day: "#fff4d6";
            readonly night: "#3a321a";
        };
        readonly "tint-coral": {
            readonly day: "#fde7df";
            readonly night: "#3a2420";
        };
        readonly "tint-indigo": {
            readonly day: "#e8ebfd";
            readonly night: "#22263f";
        };
        readonly "tint-pink": {
            readonly day: "#fde4ea";
            readonly night: "#3a2129";
        };
        readonly "deep-mint": {
            readonly day: "#1f7a57";
            readonly night: "#5ccb9f";
        };
        readonly "deep-yellow": {
            readonly day: "#8a6410";
            readonly night: "#f5c451";
        };
        readonly "deep-coral": {
            readonly day: "#b5451f";
            readonly night: "#f07a55";
        };
        readonly "deep-indigo": {
            readonly day: "#4c5bc4";
            readonly night: "#8c9bf2";
        };
        readonly "deep-pink": {
            readonly day: "#b23a5a";
            readonly night: "#f08aa0";
        };
    };
    readonly shadows: {
        readonly "shadow-float": {
            readonly day: "0 1px 2px rgba(20, 17, 20, 0.06), 0 10px 28px rgba(20, 17, 20, 0.1)";
            readonly night: "0 1px 2px rgba(0, 0, 0, 0.4), 0 12px 32px rgba(0, 0, 0, 0.45)";
        };
        readonly "shadow-sheet": {
            readonly day: "0 -8px 32px rgba(20, 17, 20, 0.16)";
            readonly night: "0 -8px 32px rgba(0, 0, 0, 0.5)";
        };
        readonly "shadow-dialog": {
            readonly day: "0 24px 64px rgba(20, 17, 20, 0.24)";
            readonly night: "0 30px 80px rgba(0, 0, 0, 0.6)";
        };
    };
    readonly space: {
        readonly "space-2": 2;
        readonly "space-4": 4;
        readonly "space-6": 6;
        readonly "space-8": 8;
        readonly "space-12": 12;
        readonly "space-16": 16;
        readonly "space-20": 20;
        readonly "space-24": 24;
        readonly "space-28": 28;
        readonly "space-32": 32;
        readonly "space-40": 40;
        readonly "space-48": 48;
        readonly "space-64": 64;
    };
    readonly radius: {
        readonly "radius-xs": 6;
        readonly "radius-sm": 10;
        readonly "radius-md": 16;
        readonly "radius-lg": 20;
        readonly "radius-xl": 24;
        readonly "radius-pill": 999;
    };
    readonly size: {
        readonly "control-lg": "48px";
        readonly "control-md": "40px";
        readonly "control-sm": "32px";
        readonly "field-lg": "52px";
        readonly "field-md": "44px";
        readonly "chip-md": "38px";
        readonly "chip-sm": "32px";
        readonly "badge-md": "28px";
        readonly "badge-sm": "22px";
        readonly "icon-button-lg": "44px";
        readonly "touch-min": "44px";
        readonly "avatar-xs": "24px";
        readonly "avatar-sm": "28px";
        readonly "avatar-md": "40px";
        readonly "avatar-lg": "48px";
        readonly "avatar-xl": "64px";
        readonly "avatar-xxl": "104px";
        readonly "switch-w": "52px";
        readonly "switch-h": "32px";
    };
    readonly stroke: {
        readonly "stroke-hairline": "1px";
        readonly "stroke-control": "1.5px";
        readonly "stroke-focus": "2px";
        readonly "stroke-selected": "2px";
        readonly "stroke-meter-sm": "4px";
        readonly "stroke-meter-md": "6px";
        readonly "stroke-meter-lg": "8px";
    };
    readonly duration: {
        readonly "duration-instant": "100ms";
        readonly "duration-quick": "160ms";
        readonly "duration-standard": "240ms";
        readonly "duration-emphasized": "360ms";
        readonly "duration-slow": "500ms";
        readonly "duration-pulse": "1600ms";
        readonly "duration-shimmer": "1200ms";
    };
    readonly easing: {
        readonly "ease-standard": "cubic-bezier(0.2, 0, 0, 1)";
        readonly "ease-enter": "cubic-bezier(0, 0, 0, 1)";
        readonly "ease-exit": "cubic-bezier(0.3, 0, 1, 1)";
        readonly "ease-spring": "cubic-bezier(0.34, 1.36, 0.64, 1)";
    };
    readonly layout: {
        readonly "bp-medium": "600px";
        readonly "bp-expanded": "840px";
        readonly "rail-w": "96px";
        readonly "sidebar-w": "240px";
        readonly "pane-list": "360px";
        readonly "pane-lane": "600px";
        readonly "pane-preview": "320px";
        readonly "pane-live": "360px";
        readonly "live-cap": "1040px";
        readonly "gutter-compact": "20px";
        readonly "gutter-medium": "32px";
        readonly "gutter-expanded": "48px";
        readonly "section-gap-compact": "28px";
        readonly "section-gap-wide": "40px";
    };
    readonly opacity: {
        readonly "opacity-disabled": "0.4";
        readonly "opacity-hover": "0.04";
        readonly "opacity-pressed": "0.08";
        readonly "opacity-on-colour": "0.55";
    };
    readonly type: {
        readonly "display-hero": {
            readonly family: "display";
            readonly size: 96;
            readonly lineHeight: 0.9;
            readonly weight: 760;
            readonly letterSpacing: "-0.045em";
        };
        readonly "display-xl": {
            readonly family: "display";
            readonly size: 64;
            readonly lineHeight: 0.95;
            readonly weight: 760;
            readonly letterSpacing: "-0.04em";
        };
        readonly "display-lg": {
            readonly family: "display";
            readonly size: 48;
            readonly lineHeight: 1;
            readonly weight: 760;
            readonly letterSpacing: "-0.03em";
        };
        readonly "display-title": {
            readonly family: "display";
            readonly size: 38;
            readonly lineHeight: 1;
            readonly weight: 760;
            readonly letterSpacing: "-0.03em";
        };
        readonly "display-section": {
            readonly family: "display";
            readonly size: 30;
            readonly lineHeight: 1.05;
            readonly weight: 760;
            readonly letterSpacing: "-0.02em";
        };
        readonly "display-sm": {
            readonly family: "display";
            readonly size: 24;
            readonly lineHeight: 1.1;
            readonly weight: 760;
            readonly letterSpacing: "-0.01em";
        };
        readonly "display-xs": {
            readonly family: "display";
            readonly size: 20;
            readonly lineHeight: 1.1;
            readonly weight: 760;
            readonly letterSpacing: "0";
        };
        readonly "body-lead": {
            readonly family: "sans";
            readonly size: 20;
            readonly lineHeight: 1.5;
            readonly weight: 400;
            readonly letterSpacing: "0";
        };
        readonly "body-input": {
            readonly family: "sans";
            readonly size: 16;
            readonly lineHeight: 1.5;
            readonly weight: 400;
            readonly letterSpacing: "0";
        };
        readonly body: {
            readonly family: "sans";
            readonly size: 15;
            readonly lineHeight: 1.45;
            readonly weight: 400;
            readonly letterSpacing: "0";
        };
        readonly "body-small": {
            readonly family: "sans";
            readonly size: 14;
            readonly lineHeight: 1.43;
            readonly weight: 400;
            readonly letterSpacing: "0";
        };
        readonly "body-meta": {
            readonly family: "sans";
            readonly size: 13;
            readonly lineHeight: 1.38;
            readonly weight: 400;
            readonly letterSpacing: "0";
        };
        readonly "title-bar": {
            readonly family: "sans";
            readonly size: 17;
            readonly lineHeight: 1.3;
            readonly weight: 700;
            readonly letterSpacing: "0";
        };
        readonly "title-row": {
            readonly family: "sans";
            readonly size: 16;
            readonly lineHeight: 1.35;
            readonly weight: 600;
            readonly letterSpacing: "0";
        };
        readonly "label-button": {
            readonly family: "sans";
            readonly size: 15;
            readonly lineHeight: 1.3;
            readonly weight: 600;
            readonly letterSpacing: "0";
        };
        readonly "label-action": {
            readonly family: "sans";
            readonly size: 14;
            readonly lineHeight: 1.3;
            readonly weight: 600;
            readonly letterSpacing: "0";
        };
        readonly "label-kicker": {
            readonly family: "sans";
            readonly size: 13;
            readonly lineHeight: 1.35;
            readonly weight: 600;
            readonly letterSpacing: "0";
        };
        readonly "label-badge": {
            readonly family: "sans";
            readonly size: 12;
            readonly lineHeight: 1.2;
            readonly weight: 700;
            readonly letterSpacing: "0";
        };
        readonly "label-code": {
            readonly family: "sans";
            readonly size: 13;
            readonly lineHeight: 1.35;
            readonly weight: 500;
            readonly letterSpacing: "0.12em";
        };
    };
};
export type TypeRole = keyof typeof tokens.type;

// ---- icons ----
export declare const iconRoles: {
    back: LucideIcon;
    forward: LucideIcon;
    close: LucideIcon;
    clear: LucideIcon;
    disclosure: LucideIcon;
    expand: LucideIcon;
    collapse: LucideIcon;
    goTo: LucideIcon;
    openExternal: LucideIcon;
    more: LucideIcon;
    home: LucideIcon;
    explore: LucideIcon;
    chat: LucideIcon;
    conversations: LucideIcon;
    person: LucideIcon;
    people: LucideIcon;
    ticket: LucideIcon;
    ticketConfirmed: LucideIcon;
    activity: LucideIcon;
    forms: LucideIcon;
    organizer: LucideIcon;
    business: LucideIcon;
    grid: LucideIcon;
    list: LucideIcon;
    dragHandle: LucideIcon;
    collapsePanel: LucideIcon;
    expandPanel: LucideIcon;
    collapseSidebar: LucideIcon;
    expandSidebar: LucideIcon;
    tonight: LucideIcon;
    tomorrow: LucideIcon;
    weekend: LucideIcon;
    thisWeek: LucideIcon;
    anytime: LucideIcon;
    night: LucideIcon;
    twilight: LucideIcon;
    location: LucideIcon;
    nearMe: LucideIcon;
    fitToView: LucideIcon;
    map: LucideIcon;
    city: LucideIcon;
    editLocation: LucideIcon;
    directions: LucideIcon;
    route: LucideIcon;
    meetingPoint: LucideIcon;
    arrivals: LucideIcon;
    taxi: LucideIcon;
    hotel: LucideIcon;
    luggage: LucideIcon;
    add: LucideIcon;
    create: LucideIcon;
    remove: LucideIcon;
    removeItem: LucideIcon;
    search: LucideIcon;
    noResults: LucideIcon;
    filters: LucideIcon;
    sort: LucideIcon;
    edit: LucideIcon;
    note: LucideIcon;
    delete: LucideIcon;
    archive: LucideIcon;
    copy: LucideIcon;
    share: LucideIcon;
    link: LucideIcon;
    download: LucideIcon;
    upload: LucideIcon;
    send: LucideIcon;
    saveChanges: LucideIcon;
    bookmark: LucideIcon;
    like: LucideIcon;
    refresh: LucideIcon;
    sync: LucideIcon;
    restart: LucideIcon;
    undo: LucideIcon;
    redo: LucideIcon;
    swap: LucideIcon;
    moveUp: LucideIcon;
    moveDown: LucideIcon;
    shuffle: LucideIcon;
    play: LucideIcon;
    pause: LucideIcon;
    addToCalendar: LucideIcon;
    addPhoto: LucideIcon;
    addPerson: LucideIcon;
    addToList: LucideIcon;
    signOut: LucideIcon;
    keyboard: LucideIcon;
    hideKeyboard: LucideIcon;
    tap: LucideIcon;
    show: LucideIcon;
    hide: LucideIcon;
    check: LucideIcon;
    success: LucideIcon;
    selected: LucideIcon;
    unselected: LucideIcon;
    info: LucideIcon;
    help: LucideIcon;
    tip: LucideIcon;
    warning: LucideIcon;
    error: LucideIcon;
    loading: LucideIcon;
    pending: LucideIcon;
    expired: LucideIcon;
    time: LucideIcon;
    timer: LucideIcon;
    history: LucideIcon;
    recurring: LucideIcon;
    live: LucideIcon;
    offline: LucideIcon;
    imageError: LucideIcon;
    block: LucideIcon;
    locked: LucideIcon;
    unlocked: LucideIcon;
    lockedUntil: LucideIcon;
    verified: LucideIcon;
    protected: LucideIcon;
    safety: LucideIcon;
    safetyAlert: LucideIcon;
    host: LucideIcon;
    admin: LucideIcon;
    celebrate: LucideIcon;
    spark: LucideIcon;
    magic: LucideIcon;
    instant: LucideIcon;
    announce: LucideIcon;
    notifications: LucideIcon;
    notificationsOn: LucideIcon;
    notificationsOff: LucideIcon;
    rating: LucideIcon;
    feedback: LucideIcon;
    quote: LucideIcon;
    flag: LucideIcon;
    event: LucideIcon;
    date: LucideIcon;
    eventConfirmed: LucideIcon;
    eventUnavailable: LucideIcon;
    seat: LucideIcon;
    checkIn: LucideIcon;
    personRemoved: LucideIcon;
    findPerson: LucideIcon;
    handle: LucideIcon;
    email: LucideIcon;
    emailRead: LucideIcon;
    phone: LucideIcon;
    mobile: LucideIcon;
    birthday: LucideIcon;
    height: LucideIcon;
    measure: LucideIcon;
    female: LucideIcon;
    male: LucideIcon;
    genders: LucideIcon;
    kids: LucideIcon;
    smokeFree: LucideIcon;
    drinks: LucideIcon;
    dining: LucideIcon;
    fitness: LucideIcon;
    education: LucideIcon;
    work: LucideIcon;
    language: LucideIcon;
    web: LucideIcon;
    sustainability: LucideIcon;
    mind: LucideIcon;
    wave: LucideIcon;
    support: LucideIcon;
    partner: LucideIcon;
    membership: LucideIcon;
    key: LucideIcon;
    password: LucideIcon;
    qrCode: LucideIcon;
    scanQr: LucideIcon;
    payment: LucideIcon;
    paymentUnavailable: LucideIcon;
    card: LucideIcon;
    wallet: LucideIcon;
    pricing: LucideIcon;
    receipt: LucideIcon;
    balance: LucideIcon;
    insights: LucideIcon;
    chart: LucideIcon;
    trend: LucideIcon;
    pace: LucideIcon;
    pulse: LucideIcon;
    hierarchy: LucideIcon;
    data: LucideIcon;
    document: LucideIcon;
    imageFile: LucideIcon;
    photo: LucideIcon;
    photos: LucideIcon;
    checklist: LucideIcon;
    taskDone: LucideIcon;
    review: LucideIcon;
    rules: LucideIcon;
    labs: LucideIcon;
    library: LucideIcon;
    browse: LucideIcon;
    bot: LucideIcon;
    brand: LucideIcon;
    settings: LucideIcon;
    appUpdate: LucideIcon;
    cleanup: LucideIcon;
    activitySocialRun: LucideIcon;
    activityRunning: LucideIcon;
    activityWalking: LucideIcon;
    activityPickleball: LucideIcon;
    activityPadel: LucideIcon;
    activityTennis: LucideIcon;
    activityBadminton: LucideIcon;
    activityCycling: LucideIcon;
    activitySpinClass: LucideIcon;
    activityYoga: LucideIcon;
    activityStrengthTraining: LucideIcon;
    activityPubQuiz: LucideIcon;
    activityBarCrawl: LucideIcon;
    activityDinner: LucideIcon;
    activitySinglesMixer: LucideIcon;
    activityOpenActivity: LucideIcon;
    playbookBadge: LucideIcon;
    playbookFirstHello: LucideIcon;
    playbookHelpMeSayHi: LucideIcon;
    playbookStarterPods: LucideIcon;
    playbookRotations: LucideIcon;
    playbookMissions: LucideIcon;
    playbookCountdownReveals: LucideIcon;
    playbookMatchClues: LucideIcon;
    playbookBalancePreview: LucideIcon;
    playbookDoorCheckIn: LucideIcon;
    playbookOpeners: LucideIcon;
    playbookWelcomeScript: LucideIcon;
    playbookGuestFeedback: LucideIcon;
    playbookRecap: LucideIcon;
    playbookSafetyLayer: LucideIcon;
};
export type IconName = keyof typeof iconRoles;
export declare const mirroredIcons: ReadonlySet<string>;
export declare const iconDescriptions: Record<string, string>;

// ---- Icon ----
export type IconSize = 16 | 18 | 20 | 24;
export interface IconProps extends Omit<React.SVGAttributes<SVGSVGElement>, "name"> {
    /** A role from the registry (back, close, ticket, activityRun…), never a raw glyph name. */
    name: IconName;
    size?: IconSize;
    /** Read aloud. Without it the icon is decorative and hidden from screen readers. */
    label?: string;
}
/** A Lucide icon chosen by role. Takes the colour of the text around it. */
export declare function Icon({ name, size, label, className, ...rest }: IconProps): React.JSX.Element | null;

// ---- Text ----
/** Roles that change size with the screen. A page title is 38 on phones, 48 on tablets, 64 on desktops. */
declare const RESPONSIVE: {
    readonly "page-title": {
        readonly compact: "display-title";
        readonly medium: "display-section";
        readonly expanded: "display-section";
    };
    readonly "section-title": {
        readonly compact: "display-sm";
        readonly medium: "display-sm";
        readonly expanded: "display-section";
    };
    readonly hero: {
        readonly compact: "display-lg";
        readonly medium: "display-xl";
        readonly expanded: "display-hero";
    };
};
export type TextVariant = TypeRole | keyof typeof RESPONSIVE;
export type TextTone = "primary" | "secondary" | "tertiary" | "success" | "warning" | "danger" | "info" | "inherit";
export interface TextProps extends React.HTMLAttributes<HTMLElement> {
    /** The text role (registry: CatchTextVariant). Pick a role, never a size. */
    variant?: TextVariant;
    tone?: TextTone;
    /** The element to render. Defaults by role: display roles are headings, the rest spans. */
    as?: "h1" | "h2" | "h3" | "p" | "span" | "label" | "div" | "strong";
    align?: "start" | "center" | "end";
    /** Clamp to this many lines with an ellipsis. */
    maxLines?: number;
    /** Tabular figures, for scores, prices and times that change. */
    numeric?: boolean;
    htmlFor?: string;
}
/**
 * Every piece of text. Pick a variant (a role), never a size: the role carries size, line height, weight,
 * tracking and family. Colour comes from what the text sits on unless a tone is given.
 */
export declare function Text({ variant, tone, as, align, maxLines, numeric, className, style, children, ...rest }: TextProps): React.JSX.Element;

// ---- Surface ----
export type SurfaceBlock = "plain" | "tile" | "spotlight" | "floating" | "band";
export interface SurfaceProps extends Omit<React.HTMLAttributes<HTMLElement>, "color"> {
    /** plain: no box. tile: the grey block. spotlight: one per screen, in an event colour or ink. floating: white with a shadow.
     * band: a full-width section of a web page, edge to edge, with its content held to the page width. */
    block?: SurfaceBlock;
    /** Spotlight colour: an event format, or "ink". Band colour: a palette colour, "ink" (night) or "tile". Ignored for other blocks. */
    color?: Format | "ink" | "tile";
    /** sm 12, md 16 (tile default), lg 20 (spotlight default), none. */
    padding?: "none" | "sm" | "md" | "lg";
    /** Makes the whole block a button or link, with press feedback. */
    onPress?: () => void;
    href?: string;
    as?: "div" | "section" | "article" | "aside" | "li";
    /** Width over height: the block holds a fixed shape (a colour block, a picture's place) and its content sits at the bottom. */
    aspect?: number;
}
/**
 * The five blocks every screen is built from, and the only thing that draws a filled box.
 * It tells its children what they sit on: chips, fields and nested blocks inside a tile switch
 * to the lighter tint; inside a coloured spotlight they go white; inside ink they go night.
 * A Surface inside a tile becomes a nested block automatically (white, 16 corners).
 */
export declare function Surface({ block, color, padding, onPress, href, as, aspect, className, children, style, ...rest }: SurfaceProps): React.JSX.Element;

// ---- Button ----
export type ButtonVariant = "primary" | "secondary" | "ghost" | "quiet" | "accent" | "danger";
export type ButtonSize = "lg" | "md" | "sm";
export interface ButtonProps extends Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, "type"> {
    /** The words on the button. Children work too. */
    label?: React.ReactNode;
    /** primary: the one main action. secondary: outlined, or white on a tile. ghost: outlined on colour or photos.
     * quiet: text only. accent: the event colour. danger: destructive. */
    variant?: ButtonVariant;
    /** lg 48, md 40, sm 32. The touch target never drops below 44. */
    size?: ButtonSize;
    /** Stretch to the container's width. */
    fill?: boolean;
    leadingIcon?: IconName;
    trailingIcon?: IconName;
    /** Shows a spinner and keeps the width; the button stays focusable but inert. */
    loading?: boolean;
    /** Registry name for the action. onClick works too. */
    onPressed?: (() => void) | null;
    /** Render as a link. */
    href?: string;
    type?: "button" | "submit" | "reset";
}
/**
 * Every button with words on it. Its look adapts to what it sits on: primary is ink on day and
 * paper on night; secondary loses its outline on a tile; accent takes the event colour of its spotlight.
 */
export declare const Button: React.ForwardRefExoticComponent<ButtonProps & React.RefAttributes<HTMLButtonElement>>;

// ---- IconButton ----
export interface IconButtonProps extends Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, "type"> {
    type?: "button" | "submit";
    icon: IconName;
    /** Required: what the button does, read aloud. */
    label: string;
    /** outlined: the default circle. filled: ink (or paper on night). ghost: no outline. overlay: over photos. */
    variant?: "outlined" | "filled" | "ghost" | "overlay";
    /** lg 44, md 40, sm 32. */
    size?: "lg" | "md" | "sm";
    shape?: "round" | "square";
    /** A count dot in the corner. */
    badge?: number;
    /** For toggles like save and follow. */
    pressed?: boolean;
    onPressed?: (() => void) | null;
    href?: string;
}
/** Back, close, share, more and every other icon-only action. Always labelled. */
export declare function IconButton({ icon, label, variant, size, shape, badge, pressed, onPressed, onClick, href, className, disabled, type, ...rest }: IconButtonProps): React.JSX.Element;

// ---- Chip ----
export interface ChipProps extends Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, "type"> {
    label: React.ReactNode;
    /** filter and choice toggle; input can be removed; link goes somewhere; tag is passive. */
    kind?: "filter" | "choice" | "input" | "link" | "tag";
    selected?: boolean;
    /** md 38, sm 32. */
    size?: "md" | "sm";
    /** A coloured dot before the label: an event format. */
    dot?: Format;
    leadingIcon?: IconName;
    /** A leading avatar or other element. */
    leading?: React.ReactNode;
    count?: number;
    /** When selected, fill with the dot's format colour instead of ink. */
    colourWhenSelected?: boolean;
    onPressed?: (() => void) | null;
    onRemove?: () => void;
    href?: string;
}
/**
 * Small round labels you tap: filters, choices, removable inputs, links. On a grey tile they turn
 * white without an outline; on night they use the night look.
 */
export declare function Chip({ label, kind, selected, size, dot, leadingIcon, leading, count, colourWhenSelected, onPressed, onClick, onRemove, href, className, disabled, ...rest }: ChipProps): React.JSX.Element;

// ---- Badge ----
export type BadgeTone = "neutral" | "success" | "warning" | "danger" | "info" | "social" | "format";
export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
    label: React.ReactNode;
    /** What it means. Colour follows meaning, never the screen. */
    tone?: BadgeTone;
    /** soft: the pale tint (status). solid: full strength (neutral solid is ink; format solid is the event colour).
     * outline: a dashed edge and no fill, for something still waiting (no reply yet). */
    emphasis?: "soft" | "solid" | "outline";
    /** sm 22 (rows), md 28 (posters and heroes). */
    size?: "sm" | "md";
    icon?: IconName;
    /** A leading dot; live pulses. */
    dot?: boolean | "live";
    /** For tone "format": which event colour. Defaults to the spotlight it sits in. */
    format?: Format;
}
/**
 * Passive labels: status, counts, "Live · 9:04". On a coloured spotlight a soft neutral badge turns white;
 * on night it uses the night tints.
 */
export declare function Badge({ label, tone, emphasis, size, icon, dot, format, className, ...rest }: BadgeProps): React.JSX.Element;

// ---- Avatar ----
export type AvatarSize = "xs" | "sm" | "md" | "lg" | "xl" | "xxl";
export interface AvatarProps extends React.HTMLAttributes<HTMLSpanElement> {
    /** xs 24, sm 28, md 40, lg 48, xl 64, xxl 104. */
    size?: AvatarSize;
    /** Used for initials, the colour and the accessible name. */
    name?: string;
    imageUrl?: string;
    /** Override the initials taken from the name. */
    initials?: string;
    /** Fill colour for initials. Defaults to one picked from the name, so a person keeps their colour. */
    color?: PaletteColour | "ink";
    /** A ring in the colour of whatever is behind it; stacks turn it on. */
    ring?: boolean;
    status?: "online" | "checked-in" | "away";
    /** Make the avatar a link or a button (open a profile, switch organiser). */
    href?: string;
    onPress?: () => void;
    /** What tapping does, read aloud: "Switch organiser". */
    pressLabel?: string;
    /** square: an organiser's logo. round: a person (the default). */
    shape?: "round" | "square";
}
/** A person: photo, or initials on a colour that stays the same for them everywhere. */
export declare function Avatar({ size, name, imageUrl, initials, color, ring, status, href, onPress, pressLabel, shape, className, style, ...rest }: AvatarProps): React.JSX.Element;
export interface AvatarStackProps extends React.HTMLAttributes<HTMLSpanElement> {
    people: Array<Pick<AvatarProps, "name" | "imageUrl" | "initials" | "color">>;
    size?: AvatarSize;
    /** How many to show before "+N". */
    max?: number;
    /** The real total, when people holds only a sample. */
    total?: number;
}
/** Overlapping avatars with a +N count, for who's going and teams. */
export declare function AvatarStack({ people, size, max, total, className, ...rest }: AvatarStackProps): React.JSX.Element;

// ---- Marker ----
export interface MarkerProps extends React.HTMLAttributes<HTMLSpanElement> {
    /** dot: status or format. ring: a step not reached. check: done. number: a numbered step. */
    kind?: "dot" | "ring" | "check" | "number";
    /** 8, 10 or 12 for dots; checks and numbers are 20. */
    size?: 8 | 10 | 12;
    tone?: "ink" | "muted" | "success" | "warning" | "danger" | "info" | "format";
    format?: Format;
    /** Pulses: the step happening now, a live session. */
    live?: boolean;
    value?: number;
}
/** Dots, rings and checks: status lights, timeline steps, legend keys, page dots. */
export declare function Marker({ kind, size, tone, format, live, value, className, ...rest }: MarkerProps): React.JSX.Element;

// ---- Field ----
export type FieldKind = "text" | "phone" | "number" | "email" | "textarea" | "select" | "date" | "search" | "code";
export interface FieldProps extends Omit<React.InputHTMLAttributes<HTMLInputElement & HTMLTextAreaElement & HTMLSelectElement>, "size" | "prefix"> {
    label?: string;
    /** Under the field, until there is an error. */
    help?: string;
    error?: string;
    kind?: FieldKind;
    /** lg 52, md 44. */
    size?: "lg" | "md";
    prefix?: React.ReactNode;
    suffix?: React.ReactNode;
    leadingIcon?: IconName;
    /** Shows a character count against maxLength. */
    counter?: boolean;
    /** For kind "select". */
    options?: Array<{
        value: string;
        label: string;
    }>;
    /** For kind "code": how many boxes. */
    length?: number;
    rows?: number;
}
/** Text, phone, number, choice and code entry, with label, help and error built in. */
export declare function Field({ label, help, error, kind, size, prefix, suffix, leadingIcon, counter, options, length, rows, id, className, value, defaultValue, maxLength, ...rest }: FieldProps): React.JSX.Element;

// ---- Controls ----
export interface SwitchProps extends Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, "onChange" | "type"> {
    on?: boolean;
    defaultOn?: boolean;
    onChange?: (on: boolean) => void;
    /** Without a visible label nearby, give one here. */
    label?: string;
    busy?: boolean;
}
/** On and off for a setting that applies at once. 52 × 32, spring thumb. */
export declare function Switch({ on, defaultOn, onChange, label, busy, className, disabled, ...rest }: SwitchProps): React.JSX.Element;
export interface CheckProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "type" | "size"> {
    kind?: "checkbox" | "radio";
    label: React.ReactNode;
    note?: React.ReactNode;
    mixed?: boolean;
    error?: boolean;
}
/** Checkboxes and radio buttons with a label and an optional note, for forms. */
export declare function Check({ kind, label, note, mixed, error, className, id, ...rest }: CheckProps): React.JSX.Element;
export interface SegmentedProps extends Omit<React.HTMLAttributes<HTMLDivElement>, "onChange"> {
    /** Items with an href render as links (tabs that open other screens). */
    items: Array<{
        value: string;
        label: React.ReactNode;
        count?: number;
        href?: string;
    }>;
    value?: string;
    defaultValue?: string;
    onChange?: (value: string) => void;
    /** md 40, sm 32. */
    size?: "md" | "sm";
    /** Fill the width with equal items. */
    fill?: boolean;
    label?: string;
}
/** Two to five views of the same thing. The selected pill slides. */
export declare function Segmented({ items, value, defaultValue, onChange, size, fill, label, className, ...rest }: SegmentedProps): React.JSX.Element;
export interface StepperProps extends Omit<React.HTMLAttributes<HTMLDivElement>, "onChange"> {
    value?: number;
    defaultValue?: number;
    min?: number;
    max?: number;
    step?: number;
    onChange?: (value: number) => void;
    /** What is being counted, read aloud: "tickets". */
    label: string;
    /** Show the value between the buttons, formatted. */
    format?: (value: number) => React.ReactNode;
}
/** Minus, value, plus. For tickets, capacity and counts. */
export declare function Stepper({ value, defaultValue, min, max, step, onChange, label, format, className, ...rest }: StepperProps): React.JSX.Element;
export interface RatingProps extends Omit<React.HTMLAttributes<HTMLElement>, "onChange" | "defaultValue"> {
    /** 0 to max. */
    value?: number;
    defaultValue?: number;
    max?: number;
    onChange?: (value: number) => void;
    /** Show a score instead of asking for one (a review, an organiser's average). */
    readOnly?: boolean;
    /** md: big tappable tiles, for rating a night. sm: small inline stars beside a review. Defaults by readOnly. */
    size?: "md" | "sm";
    /** What is being rated, read aloud: "last night". */
    label: string;
}
/** Stars, to give a score or to show one. Filled stars take the games yellow wherever they sit. */
export declare function Rating({ value, defaultValue, max, onChange, readOnly, size, label, className, ...rest }: RatingProps): React.JSX.Element;
export interface CalendarProps {
    /** The month shown first, "2026-11". */
    month: string;
    /** The chosen day, "2026-11-03". */
    value?: string;
    defaultValue?: string;
    onChange?: (day: string) => void;
    /** Days before this can't be picked: "2026-10-27". */
    min?: string;
    /** Days that already have something on: a dot under the number. */
    marked?: string[];
    /** Repeats shown as rings, such as every Tuesday after the chosen day. */
    repeats?: string[];
    label: string;
}
/** A month of days, Monday first, for picking any date past the strip: arrows step a month at a time. */
export declare function Calendar({ month, value, defaultValue, onChange, min, marked, repeats, label }: CalendarProps): React.JSX.Element;
export interface SliderProps extends Omit<React.HTMLAttributes<HTMLDivElement>, "onChange" | "defaultValue"> {
    min?: number;
    max?: number;
    step?: number;
    /** One number, or [low, high] for a range. */
    value?: number | [number, number];
    defaultValue?: number | [number, number];
    onChange?: (value: number | [number, number]) => void;
    label: string;
}
/** A single value or a range, on a track. Keyboard: arrows move a thumb by one step. */
export declare function Slider({ min, max, step, value, defaultValue, onChange, label, className, ...rest }: SliderProps): React.JSX.Element;

// ---- ChoiceCard ----
export interface ChoiceCardProps extends Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, "title" | "type"> {
    title: React.ReactNode;
    subtitle?: React.ReactNode;
    /** row: full width with a radio or check on the right. tile: a square-ish card in a grid. day: a date in a strip. add: dashed, to add one more. */
    layout?: "row" | "tile" | "day" | "add";
    selected?: boolean;
    /** single shows a radio, multi a check. */
    selection?: "single" | "multi";
    /** When selected, fill with this event colour instead of an ink outline. */
    format?: Format;
    icon?: IconName;
    /** A small mark in the corner, such as "4 of 4". */
    meta?: React.ReactNode;
    /** A yellow ring: this one needs the host. */
    attention?: boolean;
    /** Registry name for the action. */
    onTap?: (() => void) | null;
}
/**
 * Bigger tappable boxes that hold one choice: pace groups, formats you like, the day picker, ticket types,
 * tables in the live room. Selected cards take an ink outline, or their event colour when given a format.
 */
export declare function ChoiceCard({ title, subtitle, layout, selected, selection, format, icon, meta, attention, onTap, onClick, className, disabled, ...rest }: ChoiceCardProps): React.JSX.Element;

// ---- Display ----
export interface MeterProps extends React.HTMLAttributes<HTMLDivElement> {
    /** 0 to max. */
    value: number;
    max?: number;
    /** progress: a bar. cap: a bar with a limit mark (the Catch bill). segments: equal steps (step 4 of 5).
     * stack: shares of a whole, each in its own colour, with a legend (where bookings came from). */
    kind?: "progress" | "cap" | "segments" | "stack";
    /** For kind "stack": the parts, in order. */
    parts?: Array<{
        label: string;
        value: number;
        fill?: "ink" | "muted" | Format | "indigo";
    }>;
    /** 4, 6 or 8. */
    thickness?: 4 | 6 | 8;
    fill?: "ink" | "format" | "success" | "warning" | "danger";
    format?: Format;
    /** Read aloud, and shown above the bar when visible is true. */
    label: string;
    showLabel?: boolean;
    /** For kind "cap": where the limit sits, 0 to max. */
    limit?: number;
}
/** Progress, caps and steps. The track takes its colour from what the meter sits on. Fills ease when the value changes. */
export declare function Meter({ value, max, kind, thickness, fill, format, label, showLabel, limit, parts, className, ...rest }: MeterProps): React.JSX.Element;
export interface BarChartProps extends React.HTMLAttributes<HTMLDivElement> {
    bars: Array<{
        label: string;
        value: number; /** A bar still filling (this week). */
        partial?: boolean;
    }>;
    /** Read aloud: what the bars count. */
    label: string;
    height?: number;
}
/** Simple bars with their values on top and labels underneath. The last bar can be marked as still filling. */
export declare function BarChart({ bars, label, height, className, ...rest }: BarChartProps): React.JSX.Element;
export interface ImageProps extends Omit<React.HTMLAttributes<HTMLDivElement>, "children"> {
    src?: string;
    alt: string;
    /** Width over height: 1, 4/3, 16/9, 3/4. */
    aspect?: number;
    /** cover fills and crops; contain shows all of it. */
    fit?: "cover" | "contain";
    /** Corners follow the block it sits in unless set. */
    radius?: "none" | "sm" | "md" | "lg" | "xl";
    /** The placeholder colour while loading or when the picture fails. */
    placeholder?: PaletteColour | "tile";
    /** photo, or a video with a play button and a duration. */
    kind?: "photo" | "video";
    duration?: string;
    onPlay?: () => void;
    /** Run edge to edge past the screen's gutters, square-cornered: a hero at the top of a screen. */
    bleed?: boolean;
    /** Words over the bottom of the picture on a dark fade: a title ("Trivia") and a caption ("October · 212 players"). */
    title?: string;
    caption?: string;
}
/** Photos and videos with a coloured placeholder, a fade-in, and a play button for videos. */
export declare function Image({ src, alt, aspect, fit, radius, placeholder, kind, duration, onPlay, bleed, title, caption, className, style, ...rest }: ImageProps): React.JSX.Element;
export interface SkeletonProps extends React.HTMLAttributes<HTMLSpanElement> {
    /** line: a line of text. block: a box. circle: an avatar. */
    shape?: "line" | "block" | "circle";
    width?: number | string;
    height?: number | string;
}
/** A placeholder shaped like what is loading. Shimmers; stays still with reduced motion. */
export declare function Skeleton({ shape, width, height, className, style, ...rest }: SkeletonProps): React.JSX.Element;
export declare function Spinner({ size, label }: {
    size?: "sm" | "md";
    label?: string;
}): React.JSX.Element;

// ---- Layout ----
type Gap = 0 | 2 | 4 | 6 | 8 | 12 | 16 | 20 | 24 | 28 | 32 | 40 | 48 | 64 | "section";
export interface StackProps extends React.HTMLAttributes<HTMLElement> {
    direction?: "column" | "row";
    /** A spacing token. "section" is 28 on phones and 40 wider. */
    gap?: Gap;
    align?: "start" | "center" | "end" | "stretch" | "baseline";
    justify?: "start" | "center" | "end" | "between";
    wrap?: boolean;
    /** Children share the width equally (rows only). */
    equal?: boolean;
    /** Rows only: stack into a column below this size class (a two-column web section on a phone). */
    collapseBelow?: "medium" | "expanded";
    as?: "div" | "section" | "header" | "footer" | "ul" | "ol" | "nav" | "main" | "aside";
}
/** Lays children out in a column or a row with a token gap. Use it instead of hand-written flex boxes. */
export declare function Stack({ direction, gap, align, justify, wrap, equal, collapseBelow, as, className, children, ...rest }: StackProps): React.JSX.Element;
interface ShellValue {
    scrolled: boolean;
    inShell: boolean;
    onBodyScroll?: (e: React.UIEvent<HTMLElement>) => void;
}
export declare const useShell: () => ShellValue;
export interface AppShellProps {
    theme?: Theme;
    /** quiet for Admin: see Root. */
    register?: Register;
    /** The event this screen is about. */
    format?: Format;
    /** auto measures the frame; or force a size class. */
    size?: SizeClass | "auto";
    /** phone draws a 390 × 844 frame with a status-bar inset; tablet 834 × 1112; desktop 1280 × 800; fluid fills its parent. */
    frame?: "phone" | "tablet" | "desktop" | "fluid";
    /** A Navigation element; placed at the bottom, in a rail or a sidebar by size class. */
    navigation?: React.ReactNode;
    topBar?: React.ReactNode;
    dock?: React.ReactNode;
    /** Overlays (Sheet, Dialog, Toast) rendered over the screen. */
    overlay?: React.ReactNode;
    /** Override the frame's height, to show a whole scrolling screen at once on a design canvas. */
    height?: number;
    children?: React.ReactNode;
    className?: string;
}
/**
 * A whole screen: theme, size class, navigation placement, top bar, scrolling body, dock and overlays.
 * The top bar learns when the body has scrolled, so it can collapse or show its line.
 */
export declare function AppShell({ theme, register, format, size, frame, navigation, topBar, dock, overlay, height, children, className }: AppShellProps): React.JSX.Element;
export interface ScreenBodyProps extends React.HTMLAttributes<HTMLElement> {
    /** Cap the content at the 600 px reading lane and centre it. */
    lane?: boolean;
    /** Section rhythm between children: 28 on phones, 40 wider. */
    rhythm?: "section" | "tight" | "none";
    /** Drop the side gutters (for full-bleed heroes and rails). */
    bleed?: boolean;
}
/** The scrolling content of a screen: gutters (20 / 32 / 48) and the gap between sections. */
export declare function ScreenBody({ lane, rhythm, bleed, className, children, onScroll, ...rest }: ScreenBodyProps): React.JSX.Element;
export type PanePattern = "feed" | "list-detail" | "editor" | "operations" | "browse" | "reading" | "wide-table" | "queue";
export interface PaneLayoutProps extends React.HTMLAttributes<HTMLDivElement> {
    pattern: PanePattern;
    /** The main content: the feed, the list, the form, the live console, the grid or the page.
     * Children work too, in order: main, then the detail (list-detail, editor) or the aside (feed, reading, operations). */
    main?: React.ReactNode;
    /** list-detail and queue: the selected item. editor: the live preview.
     * queue: a work queue. The table fills the width and the selected item opens in a 440 px inspector on the right
     * (480 from 1,440); below 1,200 the inspector replaces the table, with a back control. */
    detail?: React.ReactNode;
    /** feed, reading and operations: the side pane (booking card, live guests, today's numbers).
     * editor: the step list, on the left on desktops and hidden below (the top bar shows the step instead). */
    aside?: React.ReactNode;
    /** list-detail on phones: show the detail instead of the list. */
    detailOpen?: boolean;
}
/**
 * One layout widget for the seven screen patterns. It decides the columns and pane widths for the size class
 * (list 360, reading lane 600, preview 320, live pane 360, live cap 1040) and what folds away on phones.
 */
export declare function PaneLayout({ pattern, main, detail, aside, detailOpen, className, children, ...rest }: PaneLayoutProps): React.JSX.Element;
/**
 * Run a navigation as a shared-element transition where the browser supports it. Give the card and the
 * page hero the same `transitionName`; Flutter uses a Hero with the same tag.
 */
export declare function withViewTransition(update: () => void): void;

// ---- Rows ----
export interface DateTileProps {
    day: string;
    date: string | number;
    format?: Format;
    size?: "md" | "sm";
}
/** A day and date on the event's colour: 56 × 64 in rows, 44 × 48 small. */
export declare function DateTile({ day, date, format, size }: DateTileProps): React.JSX.Element;
export interface ListRowProps extends Omit<React.HTMLAttributes<HTMLElement>, "title"> {
    title: React.ReactNode;
    subtitle?: React.ReactNode;
    /** A third line: meta, or a progress meter via `progress`. */
    meta?: React.ReactNode;
    metaTone?: "secondary" | "success";
    /** Longer text that wraps under the title (a review, a message). */
    body?: React.ReactNode;
    /** Leading slot shortcuts. Or pass any element as `leading`. */
    avatar?: AvatarProps;
    date?: DateTileProps;
    icon?: IconName;
    /** Tint behind the leading icon: a format colour or a status. */
    iconTone?: Format | "neutral" | "success" | "warning" | "danger" | "info";
    marker?: MarkerProps;
    time?: string;
    rank?: number;
    leading?: React.ReactNode;
    /** A badge right after the title. */
    badge?: BadgeProps;
    /** A value on the right ("Meher", "₹7,400"). */
    value?: React.ReactNode;
    /** Status text on the right of the title line ("Tonight", "Full"). */
    status?: React.ReactNode;
    statusTone?: "secondary" | "success" | "warning" | "danger";
    /** Any control on the right: a Switch, Button, Badge or Check. Children work too. */
    trailing?: React.ReactNode;
    /** A small action button on the right. */
    action?: {
        label: string;
        onPressed?: () => void;
        variant?: "secondary" | "primary";
    };
    /** A chevron; on by default when the row links somewhere. */
    chevron?: boolean;
    progress?: {
        value: number;
        max?: number;
        label: string;
    };
    /** compact 10, regular 12, roomy 14 vertical padding. */
    density?: "compact" | "regular" | "roomy";
    /** Let the title and second line wrap instead of ending in "…". */
    wrap?: boolean;
    /** Where children go: on the right (a control), or under the text (chips, a strip of badges, buttons). */
    childrenSlot?: "trailing" | "below";
    unread?: boolean;
    selected?: boolean;
    done?: boolean;
    disabled?: boolean;
    href?: string;
    onPress?: () => void;
}
/**
 * One row for every list: events, people, guests, settings, tasks, notifications, plan steps, scores and bills.
 * Leading and trailing slots take anything; lines between rows come from the List around it.
 */
export declare function ListRow({ title, subtitle, meta, metaTone, body: text, avatar, date, icon, iconTone, marker, time, rank, leading, badge, value, status, statusTone, trailing: trailingProp, action, chevron, progress, density, wrap, childrenSlot, unread, selected, done, disabled, href, onPress, className, children, ...rest }: ListRowProps): React.JSX.Element;
export interface SectionHeaderProps {
    title: React.ReactNode;
    kicker?: React.ReactNode;
    count?: number;
    action?: {
        label: string;
        href?: string;
        onPressed?: () => void;
    };
    /** A short grey note on the right instead of an action: "3 before doors". */
    note?: React.ReactNode;
    /** h2 by default. */
    as?: "h2" | "h3";
}
/** A section title with an optional kicker, count and a quiet action ("All 4"). Resizes with the screen. */
export declare function SectionHeader({ title, kicker, count, action, note, as }: SectionHeaderProps): React.JSX.Element;
export interface SectionProps extends Omit<React.HTMLAttributes<HTMLElement>, "title"> {
    title?: React.ReactNode;
    kicker?: React.ReactNode;
    count?: number;
    action?: SectionHeaderProps["action"];
    note?: React.ReactNode;
    /** between: a line between rows (the rule today). all: also under the last row. none. */
    dividers?: "between" | "all" | "none";
    /** plain rows on the page, or rows inside a grey tile. */
    container?: "plain" | "tile";
    /** Join the rows' leading markers with a line: a run of show, messages in order, a journey.
     * The line is ink below a filled ink marker (done) and grey below the rest. */
    timeline?: boolean;
    /** Shown instead of children when there are none. */
    empty?: React.ReactNode;
    footer?: React.ReactNode;
    /** One list flowing down into 2 or 3 columns (a scoreboard, a long roll call). Columns read top to bottom and
     * separate the rows, so a list in columns draws no lines. Folds back to one column on phones. */
    columns?: 2 | 3;
}
/** A titled group of rows (or anything). Owns the lines between its rows. */
export declare function Section({ title, kicker, count, action, note, dividers, container, timeline, empty, footer, columns, children, className, ...rest }: SectionProps): React.JSX.Element;
export interface StatProps extends Omit<React.HTMLAttributes<HTMLDivElement>, "color"> {
    label: React.ReactNode;
    value: React.ReactNode;
    note?: React.ReactNode;
    noteTone?: "secondary" | "success" | "warning" | "danger";
    /** tile: a grey block (the default). inline: no box, for strips. fact: a small tile whose value is words
     * (When · Tue 3 Nov · 7:30 PM), for the facts row on event pages and tickets. */
    layout?: "tile" | "inline" | "fact";
    meter?: {
        value: number;
        max?: number;
        label: string;
    };
}
/** A number with a label: booked, checked in, revenue. Tiles on their own, inline inside spotlights and strips. */
export declare function Stat({ label, value, note, noteTone, layout, meter, className, ...rest }: StatProps): React.JSX.Element;
export interface NoticeProps extends Omit<React.HTMLAttributes<HTMLDivElement>, "title"> {
    tone?: "info" | "success" | "warning" | "danger" | "neutral";
    title?: React.ReactNode;
    children?: React.ReactNode;
    icon?: IconName | false;
    action?: {
        label: string;
        href?: string;
        onPressed?: () => void;
    };
    /** inline: a tinted block in the flow. banner: full width at the top of a screen. */
    layout?: "inline" | "banner";
    onDismiss?: () => void;
}
/** A tinted message about status: help, a warning, something that went wrong, something that worked. */
export declare function Notice({ tone, title, children, icon, action, layout, onDismiss, className, ...rest }: NoticeProps): React.JSX.Element;
export interface EmptyStateProps extends Omit<React.HTMLAttributes<HTMLDivElement>, "title"> {
    /** done: a queue you have cleared ("All caught up"). */
    kind?: "empty" | "error" | "offline" | "no-results" | "done";
    icon?: IconName;
    title: React.ReactNode;
    body?: React.ReactNode;
    action?: {
        label: string;
        href?: string;
        onPressed?: () => void;
    };
}
/** What a list or screen says when there is nothing to show, or when loading failed. */
export declare function EmptyState({ kind, icon, title, body, action, className, ...rest }: EmptyStateProps): React.JSX.Element;
export interface MetaItem {
    label: React.ReactNode;
    value: React.ReactNode;
    tone?: "secondary" | "success" | "warning" | "danger";
    /** The value links somewhere (the organiser, the source page). */
    href?: string;
    /** Spans the whole row (a description, an address). */
    wide?: boolean;
}
export interface MetaRowProps extends React.HTMLAttributes<HTMLElement> {
    items: MetaItem[];
    /** grid: label over value, in columns (a record's facts). inline: value only, dot-separated on one line (a row's meta). */
    layout?: "grid" | "inline";
    columns?: 1 | 2 | 3 | 4;
}
/** Facts about one record, read at a glance: label over value in columns, or one dot-separated line. */
export declare function MetaRow({ items, layout, columns, className, ...rest }: MetaRowProps): React.JSX.Element;

// ---- Bars ----
type Act = {
    label: string;
    href?: string;
    onPressed?: () => void;
};
export interface TopBarProps {
    /** The seven page tops. tab-home: a tab's own screen. tool: a sub-screen with back. subject: over a hero.
     * step: a step in a flow, with progress. live: night console. moment: a full-screen moment with close only.
     * site: the website header, with the wordmark (title), links and actions such as "Get the app". */
    variant?: "tab-home" | "tool" | "subject" | "step" | "live" | "moment" | "site";
    title?: React.ReactNode;
    kicker?: React.ReactNode;
    /** Back (tool, subject, step, live) or close (moment). */
    back?: Act & {
        close?: boolean;
    };
    /** A text action on the right (tool): "Reset", "Preview", "Save". */
    action?: Act;
    /** Icon buttons or a button on the right. */
    actions?: React.ReactNode;
    /** step: where we are. */
    step?: {
        index: number;
        total: number;
    };
    /** live: the badge, such as "Live · 9:04 PM". */
    live?: React.ReactNode;
    /** site: page links beside the wordmark ("For organisers", "Explore"); they fold away on phones. */
    links?: Act[];
    /** site: where the wordmark goes. */
    homeHref?: string;
    /** Children work as actions too (icon buttons or a button on the right). */
    children?: React.ReactNode;
}
/** The top of every screen. Six variants cover every screen; on scroll it gains a line (and subject bars turn solid). */
export declare function TopBar({ variant, title, kicker, back, action, actions: actionProp, step, live, links, homeHref, children }: TopBarProps & {
    children?: React.ReactNode;
}): React.JSX.Element;
export interface PaneHeaderProps {
    title: React.ReactNode;
    /** A breadcrumb before the title: the wedding, the list this item belongs to. */
    kicker?: React.ReactNode;
    /** Shown after the title, muted: how many rows the pane holds. */
    count?: number;
    /** A muted line after the title: what the pane holds at a glance ("oldest 3 days · 6 ready to decide"). */
    note?: React.ReactNode;
    back?: Act & {
        close?: boolean;
    };
    /** Where this item sits in its list, with previous and next: a detail pane beside a queue ("1 of 23"). */
    position?: {
        label: string;
        previous?: Act;
        next?: Act;
    };
    /** The view of a list (waiting, mine, done): a small select in the bar. */
    views?: {
        items: Array<{
            value: string;
            label: string;
            count?: number;
        }>;
        value: string;
        label?: string;
    };
    /** A second row under the bar: filter chips with counts, and search. The same for every queue and directory. */
    filters?: {
        chips?: Array<{
            label: string;
            count?: number;
            selected?: boolean;
        }>;
        search?: {
            placeholder: string;
            value?: string;
        };
    };
    /** Small actions on the right. */
    children?: React.ReactNode;
}
/**
 * The header of one pane in a list and detail layout. Every pane header is the same 56 px row, in the same type,
 * on the same line as the navigation's header, with one hairline under all of them. Put it first in the pane.
 */
export declare function PaneHeader({ title, kicker, count, note, back, position, views, filters, children }: PaneHeaderProps): React.JSX.Element;
export interface NavItem {
    value: string;
    label: string;
    icon: IconName;
    href?: string;
    badge?: number;
    /** Sidebar: a heading drawn above the first item of each section ("Work", "Records", "Settings"). The rail draws a rule. */
    section?: string;
    /** Bottom bar: when any item is pinned, only pinned items show, followed by More. */
    pinned?: boolean;
}
/** Who the app is acting as (the organiser, with a switcher) or who is signed in (the footer). */
export interface NavIdentity {
    title: string;
    note?: string;
    avatar?: AvatarProps;
    href?: string;
    /** Shows the up-down mark: tapping switches organiser. */
    switcher?: boolean;
}
export interface NavigationProps {
    items: NavItem[];
    value: string;
    onChange?: (value: string) => void;
    /** auto follows the shell: a bottom bar on phones, a rail on tablets, a sidebar on desktops. */
    layout?: "auto" | "bottom" | "rail" | "sidebar";
    /** Sidebar and rail: an organiser switcher or the app's mark. */
    header?: React.ReactNode | NavIdentity;
    /** Sidebar and rail: "New event". */
    primaryAction?: {
        label: string;
        icon?: IconName;
        href?: string;
        onPressed?: () => void;
    };
    footer?: React.ReactNode | NavIdentity;
    label?: string;
    /** Bottom bar with pinned items: where More goes (a sheet or a page listing every destination). */
    more?: {
        label?: string;
        href?: string;
        onPressed?: () => void;
        badge?: number;
    };
}
/** The app's tabs, drawn as a bottom bar, a 96 px rail or a 240 px sidebar from one list of items. */
export declare function Navigation({ items: allItems, value, onChange, layout, header, primaryAction, footer, label, more }: NavigationProps): React.JSX.Element;
export interface DockProps {
    primary: Pick<ButtonProps, "label" | "onPressed" | "href" | "disabled" | "loading" | "leadingIcon" | "trailingIcon" | "variant">;
    secondary?: Pick<ButtonProps, "label" | "onPressed" | "href" | "disabled">;
    /** Left side: a price, a date, a count. Replaces the secondary action. */
    summary?: React.ReactNode;
    /** auto: a bar fixed to the bottom on phones, a floating card on wide screens.
     * pane: the decision bar at the foot of a detail pane (a review, a claim, a report). It stays in view while the pane scrolls. */
    placement?: "auto" | "bar" | "card" | "pane";
    /** Children work as the summary too. */
    children?: React.ReactNode;
    /** pane: the refusing action (Reject, Decline), drawn as a quiet danger button before the secondary. */
    danger?: Pick<ButtonProps, "label" | "onPressed" | "href" | "disabled">;
    /** pane: a one-line note field above the actions ("Why? Only your team sees this"). */
    note?: {
        label: string;
        placeholder?: string;
        value?: string;
        required?: boolean;
    };
    /** pane: what happens after the decision ("Then: Harbor Social · 3 left"), with keyboard hints. */
    next?: React.ReactNode;
}
/** The bottom action bar: one primary action, with a secondary action or a summary beside it. */
export declare function Dock({ primary, secondary, summary: summaryProp, placement, children, danger, note, next }: DockProps): React.JSX.Element;

// ---- Cards ----
export interface EventCardProps {
    /** poster: the event's colour, big title, counts. cover: a photo with the title under it. compact: small, for rails.
     * external: an event hosted elsewhere, as a tile that links out (no event page). */
    variant?: "poster" | "cover" | "compact" | "external";
    title: React.ReactNode;
    format: Format;
    /** "Trivia", "Social run". */
    formatLabel?: React.ReactNode;
    /** The pill on posters and covers: "Tonight · doors 7:30", "Sat 8:00 PM". */
    when?: React.ReactNode;
    place?: React.ReactNode;
    /** Top-right flag on covers: "Sold out", "Live now". */
    flag?: React.ReactNode;
    /** Poster counts: [{value: 26, label: "booked"}]. */
    counts?: Array<{
        value: React.ReactNode;
        label: React.ReactNode;
    }>;
    people?: Array<Pick<AvatarProps, "name" | "imageUrl">>;
    peopleTotal?: number;
    price?: React.ReactNode;
    imageUrl?: string;
    /** external: where it is hosted, such as "Luma". */
    source?: string;
    status?: "on-sale" | "sold-out" | "cancelled" | "live" | "past";
    href?: string;
    onPress?: () => void;
    /** Shared-element name: the card grows into the event page hero with the same name. */
    transitionName?: string;
}
/** An event as a card. The poster takes its format colour; the cover is photo-led; external events only link out. */
export declare function EventCard({ variant, title, format, formatLabel, when, place, flag, counts, people, peopleTotal, price, imageUrl, source, status, href, onPress, transitionName }: EventCardProps): React.JSX.Element;
export interface OrganiserCardProps {
    name: React.ReactNode;
    /** Two letters for the logo square when there is no image. */
    initials?: string;
    logoUrl?: string;
    color?: Format;
    meta?: React.ReactNode;
    following?: boolean;
    onFollow?: () => void;
    href?: string;
}
/** An organiser: logo, name, a line about them, and follow. Used for "Hosted by" and organiser lists. */
export declare function OrganiserCard({ name, initials, logoUrl, color, meta, following, onFollow, href }: OrganiserCardProps): React.JSX.Element;
export interface TicketProps {
    title: React.ReactNode;
    format: Format;
    organiser?: React.ReactNode;
    formatLabel?: React.ReactNode;
    facts: Array<{
        label: React.ReactNode;
        value: React.ReactNode;
    }>;
    /** The code guests show at the door. */
    code?: string;
    guest?: React.ReactNode;
    status?: "valid" | "used" | "refunded";
}
/** The guest's ticket: the event in its colour, the facts, and the code to show at the door. */
export declare function Ticket({ title, format, organiser, formatLabel, facts, code, guest, status }: TicketProps): React.JSX.Element;

// ---- Overlays ----
export interface SheetProps {
    open: boolean;
    onClose?: () => void;
    title?: React.ReactNode;
    kicker?: React.ReactNode;
    /** A text action in the header, such as "Reset". */
    action?: {
        label: string;
        onPressed?: () => void;
    };
    /** The bottom action, usually one primary Button. */
    dock?: React.ReactNode;
    /** auto: a bottom sheet on phones, a centred panel on wider screens. */
    placement?: "auto" | "bottom" | "center";
    /** Draw inside the nearest positioned parent instead of over the page (for designs and previews). */
    contained?: boolean;
    /** false: no dimming and the screen behind stays usable (a result over a scanner). */
    scrim?: boolean;
    /** success: the sheet itself says it worked (check-in confirmed). */
    tone?: "default" | "success";
    children?: React.ReactNode;
    label?: string;
}
/**
 * A quick task over the screen it belongs to: filters, choosing a ticket, adding to calendar. Drag the grabber
 * down or tap outside to close. Becomes a centred panel on tablets and desktops.
 */
export declare function Sheet({ open, onClose, title, kicker, action, dock, placement, contained, scrim, tone, children, label }: SheetProps): React.JSX.Element | null;
export interface DialogProps {
    open: boolean;
    onClose?: () => void;
    title: React.ReactNode;
    body?: React.ReactNode;
    /** The action that answers the question: "Cancel the event". */
    confirm: Pick<ButtonProps, "label" | "onPressed" | "loading">;
    /** Usually "Keep it" or "Not now". */
    cancel?: Pick<ButtonProps, "label" | "onPressed">;
    /** destructive turns the confirm button into the danger style. */
    tone?: "default" | "destructive";
    contained?: boolean;
}
/** A question that must be answered before going on. Keep it for confirmations and destructive steps. */
export declare function Dialog({ open, onClose, title, body, confirm, cancel, tone, contained }: DialogProps): React.JSX.Element | null;
export interface ToastProps {
    open: boolean;
    message: React.ReactNode;
    tone?: "neutral" | "success" | "danger";
    icon?: IconName;
    action?: {
        label: string;
        onPressed?: () => void;
    };
    /** Hides itself after this many ms (0 keeps it). */
    duration?: number;
    onClose?: () => void;
    contained?: boolean;
}
/** A short note that something happened ("Rhea checked in", "Saved"), with an optional undo. Slides up, then leaves. */
export declare function Toast({ open, message, tone, icon, action, duration, onClose, contained }: ToastProps): React.JSX.Element | null;
export interface MenuItem {
    label: string;
    icon?: IconName;
    danger?: boolean;
    onPressed?: () => void;
}
export interface MenuProps {
    items: MenuItem[];
    /** The button that opens it; defaults to a "More" icon button. */
    label?: string;
    defaultOpen?: boolean;
}
/** Overflow actions behind a "More" button: a popover on wide screens, a sheet on phones. */
export declare function Menu({ items, label, defaultOpen }: MenuProps): React.JSX.Element;

// ---- Misc ----
export interface ChatMessageProps {
    /** mine: right, ink. theirs: left, grey. host: an announcement in the event colour. system: a centred line.
     * (Named sender because hosts such as the design canvas reserve a "from" attribute.) */
    sender?: "mine" | "theirs" | "host" | "system";
    /** Older name for sender. */
    from?: "mine" | "theirs" | "host" | "system";
    children: React.ReactNode;
    author?: AvatarProps & {
        name: string;
    };
    time?: string;
    status?: "sending" | "sent" | "failed" | "read";
    /** Group consecutive messages: hides the avatar and name on all but the first. */
    continued?: boolean;
    format?: Format;
}
/** One message in a group or one-to-one chat. */
export declare function ChatMessage({ sender, from: legacyFrom, children, author, time, status, continued, format }: ChatMessageProps): React.JSX.Element;
export interface ChatComposerProps {
    placeholder?: string;
    onSend?: (text: string) => void;
    /** Read-only chats show this note instead of the field. */
    closedNote?: React.ReactNode;
    onAttach?: () => void;
}
/** The message field at the bottom of a chat; becomes a note when the chat is closed. */
export declare function ChatComposer({ placeholder, onSend, closedNote, onAttach }: ChatComposerProps): React.JSX.Element;
export interface MapPin {
    /** 0 to 100 across and down the map. */
    x: number;
    y: number;
    label?: string;
    format?: Format;
    selected?: boolean;
}
export interface MapPreviewProps {
    pins: MapPin[];
    /** Width over height. */
    aspect?: number;
    /** A walking or running route through these points (0–100). */
    route?: Array<[number, number]>;
    label: string;
    onOpen?: () => void;
    /** Pins become buttons: tap one to pick it (the map view of Explore). Not with onOpen. */
    onPinPress?: (index: number) => void;
}
/** A static map: streets on the map ground, format-coloured pins with labels, an optional route. Opens the full map. */
export declare function MapPreview({ pins, aspect, route, label, onOpen, onPinPress }: MapPreviewProps): React.JSX.Element;
export interface AccordionProps {
    items: Array<{
        title: React.ReactNode;
        body: React.ReactNode;
    }>;
    /** Several open at once, or one. */
    multiple?: boolean;
    defaultOpen?: number[];
    /** lg for website FAQs. */
    size?: "md" | "lg";
}
/** Questions and answers that open in place: FAQs and "Good to know". Lines between items, like any list. */
export declare function Accordion({ items, multiple, defaultOpen, size }: AccordionProps): React.JSX.Element;
export interface RailProps extends React.HTMLAttributes<HTMLDivElement> {
    /** Width of each item in px, or auto to fit each item (chips). */
    itemWidth?: number | "auto";
    /** auto: scroll on phones and tablets, wrap into a grid on desktops. */
    wrap?: "auto" | "never" | "always";
    label: string;
}
/** A horizontal row of cards that scrolls with snapping and a peek of the next item. */
export declare function Rail({ itemWidth, wrap, label, className, children, ...rest }: RailProps): React.JSX.Element;
export interface TableColumn<T> {
    key: keyof T & string;
    label: string;
    align?: "start" | "center" | "end";
    width?: string;
    /** What the cell value is. text: a string, or {text, tone}. title: {title, subtitle}, two lines.
     * marker: Marker props plus a label read aloud (a reply, a status). badge: Badge props. number: right-aligned figures. */
    kind?: "text" | "title" | "marker" | "badge" | "number";
    render?: (row: T) => React.ReactNode;
    /** The column the rows are ordered by: an arrow after the label. Queues sort oldest first. */
    sort?: "asc" | "desc";
}
export interface TableProps<T> {
    columns: TableColumn<T>[];
    rows: T[];
    /** A function, or the field that names each row. Defaults to key, then id, then the row's position. */
    rowKey?: ((row: T) => string) | (keyof T & string);
    label: string;
    /** On phones each row becomes a list row: the first column is the title, the second the subtitle, the last the value. */
    onRowPress?: (row: T) => void;
    /** The row open in the inspector beside the table. */
    selectedKey?: string;
    /** A checkbox column for acting on several rows at once. */
    selectable?: boolean;
    /** The keys of the checked rows. */
    checked?: string[];
    onCheck?: (keys: string[]) => void;
    /** Shown above the table while rows are checked: what you can do to all of them ("Approve 3", "Assign"). */
    bulk?: React.ReactNode | Array<{
        label: string;
        onPressed?: () => void;
        variant?: "secondary" | "primary";
    }>;
    /** compact rows (8 px) for long queues; regular (12 px) otherwise. */
    density?: "compact" | "regular";
}
/** Wide data for tablets and desktops; folds into list rows on phones. */
export declare function Table<T extends Record<string, unknown>>({ columns, rows, rowKey, label, onRowPress, selectedKey, selectable, checked, onCheck, bulk, density }: TableProps<T>): React.JSX.Element;
