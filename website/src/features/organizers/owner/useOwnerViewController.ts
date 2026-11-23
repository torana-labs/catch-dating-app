import {useMutation} from "@tanstack/react-query";
import {useEffect, useMemo, useState} from "react";
import {ownerViewBackends, type OwnerViewBackends} from "./ownerViewBackends";
import {useLiveRead} from "../../../shared/query/useLiveRead";
import type {OwnerCapability, OwnerFollowerMessages, OwnerLink, OwnerReview, OwnerTrackingSettings, OwnerViewData} from
  "./ownerViewTypes";

/** The owner view's five tabs, each shown only when the role has one of its capabilities. */
export type OwnerTab = "insights" | "links" | "page" | "audience" | "settings";

const tabCapabilities: Record<OwnerTab, readonly OwnerCapability[]> = {
  insights: ["insights"],
  links: ["links"],
  page: ["about", "photos"],
  audience: ["reviews", "messageFollowers"],
  settings: ["settings", "openInHost"],
};
const tabOrder: readonly OwnerTab[] = ["insights", "links", "page", "audience", "settings"];

/** Tabs a role sees, in order. */
export function ownerTabsFor(capabilities: readonly OwnerCapability[]): OwnerTab[] {
  return tabOrder.filter((tab) => tabCapabilities[tab].some((capability) => capabilities.includes(capability)));
}

type Notice = {panel: OwnerTab; text: "saved" | "failed"; what: string} | null;

const requestId = () => (globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random()}`)
  .replace(/[^A-Za-z0-9_-]/gu, "").slice(0, 100);

const newLinkId = () => `link-${requestId().slice(0, 24)}`;

/**
 * The owner view on a claimed organiser's own page (#1109). A signed-out
 * visitor gets a quiet sign-in prompt; a signed-in member of the team gets
 * the owner bar and the panels their role allows; anyone else sees only the
 * public page. Writes go through the existing organiser commands, and the
 * view re-reads after each one; the public page catches up within its
 * 60-second cache.
 */
export function useOwnerViewController({backends = ownerViewBackends, claimed, initialTab, initialUid, organizerId,
  replyName, reviews: pageReviews}: {
  backends?: OwnerViewBackends;
  claimed: boolean;
  /** The page's published reviews, as the server rendered them from the read model. */
  reviews: readonly OwnerReview[];
  /** Who a reply shows as until the page's next read carries it. */
  replyName: string;
  /** Opens the bar on this tab (stories and tests). */
  initialTab?: OwnerTab;
  /** Stories start signed in or out without a Firebase runtime. */
  initialUid?: string | null;
  organizerId: string;
}) {
  const [uid, setUid] = useState<string | null>(initialUid ?? null);
  useEffect(() => (initialUid === undefined && claimed ? backends.watchUser(setUid) : undefined),
    [backends, claimed, initialUid]);

  // The page as this reader sees it, live from hostOrganizerOwnerViews
  // (#2306): a save shows when its trigger rewrites the row.
  const view = useLiveRead<OwnerViewData>(claimed && uid !== null ? `${uid}/${organizerId}` : null,
    (onValue, onError) => backends.watchView(organizerId, uid!, onValue, onError));
  const data: OwnerViewData | null = view.data ?? null;
  const tabs = useMemo(() => (data ? ownerTabsFor(data.capabilities) : []), [data]);
  const can = (capability: OwnerCapability) => data?.capabilities.includes(capability) ?? false;

  const [open, setOpen] = useState(initialTab !== undefined);
  const [tab, setTab] = useState<OwnerTab>(initialTab ?? "insights");
  const [notice, setNotice] = useState<Notice>(null);
  useEffect(() => {
    if (tabs.length && !tabs.includes(tab)) setTab(tabs[0]);
  }, [tabs, tab]);

  // Link editor: a local draft of every link, saved in one replace.
  const [linkDraft, setLinkDraft] = useState<OwnerLink[] | null>(null);
  const links = linkDraft ?? data?.links ?? [];
  const editLinks = (next: OwnerLink[]) => {setLinkDraft(next); setNotice(null);};
  const linksMutation = useMutation({retry: false, gcTime: 0,
    mutationFn: (next: OwnerLink[]) => backends.manage({organizerId, requestId: requestId(), action: "setLinks", links: next})});

  // About and photos.
  const [aboutDraft, setAboutDraft] = useState<string | null>(null);
  const aboutMutation = useMutation({retry: false, gcTime: 0,
    mutationFn: (text: string) => backends.saveAbout(organizerId, text)});
  const photosMutation = useMutation({retry: false, gcTime: 0,
    mutationFn: (photoIds: string[]) => backends.manage({organizerId, requestId: requestId(), action: "setPhotoOrder", photoIds})});

  // Reviews and replies: the page's own reviews, with replies sent here shown
  // at once until the page's next read carries them.
  const [replies, setReplies] = useState<Record<string, string>>({});
  const reviewItems = useMemo(() => pageReviews.map((review) => replies[review.id] === undefined ? review :
    {...review, ownerResponse: {message: replies[review.id], hostName: review.ownerResponse?.hostName ?? replyName}}),
  [pageReviews, replies, replyName]);
  const [replyTo, setReplyTo] = useState<string | null>(null);
  const [replyText, setReplyText] = useState("");
  const replyMutation = useMutation({retry: false, gcTime: 0,
    mutationFn: (input: {reviewId: string; message: string}) => backends.replyToReview(input.reviewId, input.message)});

  // Message followers, in the feed and, when ticked, on WhatsApp too.
  const [messageText, setMessageText] = useState("");
  const [messageWhatsapp, setMessageWhatsapp] = useState(false);
  const [lastDelivery, setLastDelivery] = useState<OwnerFollowerMessages["delivery"] | null>(null);
  const messageMutation = useMutation({retry: false, gcTime: 0,
    mutationFn: (input: {text: string; requestId: string; whatsapp: boolean}) =>
      backends.manage({organizerId, requestId: input.requestId, action: "sendFollowerMessage", text: input.text,
        ...(input.whatsapp ? {channels: ["app", "whatsapp"]} : {})})});

  // Tracking settings.
  // Live, so a save elsewhere shows here without a reload.
  const tracking = useLiveRead<OwnerTrackingSettings>(open && tab === "settings" && can("settings") ?
    `${uid}/${organizerId}` : null, (onValue, onError) => backends.watchTracking(organizerId, onValue, onError));
  const [pixelDraft, setPixelDraft] = useState<string | null>(null);
  const [gaDraft, setGaDraft] = useState<string | null>(null);
  const trackingMutation = useMutation({retry: false, gcTime: 0,
    mutationFn: (input: {expectedRevision: number; metaPixelId: string | null; googleMeasurementId: string | null}) =>
      backends.saveTracking({organizerId, ...input})});

  useEffect(() => {
    setLinkDraft(null); setAboutDraft(null); setReplyTo(null); setReplyText(""); setMessageText("");
    setMessageWhatsapp(false); setLastDelivery(null);
    setPixelDraft(null); setGaDraft(null); setNotice(null);
  }, [organizerId, uid]);

  // The listener carries the saved result; nothing to refetch.
  const refresh = async () => undefined;
  async function run(panel: OwnerTab, what: string, action: () => Promise<unknown>, after?: () => void) {
    setNotice(null);
    try {
      await action();
      after?.();
      setNotice({panel, text: "saved", what});
      await refresh();
    } catch {
      setNotice({panel, text: "failed", what});
    }
  }

  const clicksByLink = new Map((data?.insights.links ?? []).map((row) => [row.linkId, row.clicks]));
  const moveLink = (index: number, by: -1 | 1) => {
    const next = [...links];
    const target = index + by;
    if (target < 0 || target >= next.length) return;
    [next[index], next[target]] = [next[target], next[index]];
    editLinks(next);
  };
  const photoIds = (data?.photos ?? []).map((photo) => photo.id);
  const pixel = pixelDraft ?? tracking.data?.metaPixelId ?? "";
  const ga = gaDraft ?? tracking.data?.googleMeasurementId ?? "";

  return {
    /** Nothing to show: not a claimed page, or a signed-in visitor who is not on the team. */
    hidden: !claimed || (uid !== null && !data),
    signedOut: claimed && uid === null,
    data,
    role: data?.role ?? null,
    can,
    tabs,
    tab,
    setTab: (next: string) => {setTab(next as OwnerTab); setNotice(null);},
    open,
    toggle: () => setOpen((value) => !value),
    notice,
    links: {
      items: links.map((link, index) => ({link, index, clicks: clicksByLink.get(link.id) ?? 0})),
      dirty: linkDraft !== null,
      busy: linksMutation.isPending,
      add: () => editLinks([...links, {id: newLinkId(), label: "", subtitle: null, url: "https://", icon: null,
        pinned: false, showUntil: null}]),
      change: (index: number, patch: Partial<OwnerLink>) =>
        editLinks(links.map((link, at) => (at === index ? {...link, ...patch} : link))),
      remove: (index: number) => editLinks(links.filter((_, at) => at !== index)),
      moveUp: (index: number) => moveLink(index, -1),
      moveDown: (index: number) => moveLink(index, 1),
      save: () => void run("links", "links", () => linksMutation.mutateAsync(links.map((link) => ({
        ...link, label: link.label.trim(), subtitle: link.subtitle?.trim() || null, url: link.url.trim(),
      }))), () => setLinkDraft(null)),
    },
    about: {
      text: aboutDraft ?? data?.about ?? "",
      change: (value: string) => {setAboutDraft(value); setNotice(null);},
      dirty: aboutDraft !== null && aboutDraft.trim() !== (data?.about ?? "") && aboutDraft.trim().length > 0,
      busy: aboutMutation.isPending,
      save: () => void run("page", "about", () => aboutMutation.mutateAsync((aboutDraft ?? "").trim()),
        () => setAboutDraft(null)),
    },
    photos: {
      items: data?.photos ?? [],
      busy: photosMutation.isPending,
      makeCover: (id: string) => void run("page", "photos",
        () => photosMutation.mutateAsync([id, ...photoIds.filter((photoId) => photoId !== id)])),
    },
    reviews: {
      items: reviewItems,
      ready: true,
      replyTo,
      replyText,
      start: (reviewId: string, current: string) => {setReplyTo(reviewId); setReplyText(current); setNotice(null);},
      cancel: () => {setReplyTo(null); setReplyText("");},
      changeReply: setReplyText,
      busy: replyMutation.isPending,
      send: () => {
        if (!replyTo || !replyText.trim()) return;
        const reviewId = replyTo;
        const message = replyText.trim();
        void run("audience", "reply", () => replyMutation.mutateAsync({reviewId, message}),
          () => {setReplies((current) => ({...current, [reviewId]: message})); setReplyTo(null); setReplyText("");});
      },
    },
    followers: {
      text: messageText,
      change: (value: string) => {setMessageText(value); setNotice(null);},
      used: data?.followerMessages.used ?? 0,
      limit: data?.followerMessages.limit ?? 2,
      usedUp: (data?.followerMessages.used ?? 0) >= (data?.followerMessages.limit ?? 2),
      busy: messageMutation.isPending,
      /** WhatsApp shows only when the number and its follower template are ready. */
      whatsappAvailable: data?.followerMessages.whatsappAvailable === true,
      whatsapp: messageWhatsapp && data?.followerMessages.whatsappAvailable === true,
      setWhatsapp: (value: boolean) => {setMessageWhatsapp(value); setNotice(null);},
      /** Counts from the last send, until the view changes. */
      delivery: lastDelivery,
      send: () => {
        const text = messageText.trim();
        if (!text) return;
        const whatsapp = messageWhatsapp && data?.followerMessages.whatsappAvailable === true;
        setLastDelivery(null);
        void run("audience", "message", async () => {
          const result = await messageMutation.mutateAsync({text, requestId: requestId(), whatsapp});
          setLastDelivery(result.followerMessages?.delivery ?? null);
        }, () => setMessageText(""));
      },
    },
    tracking: {
      ready: tracking.status === "success",
      canEdit: tracking.data?.canEdit ?? false,
      live: tracking.data?.live ?? false,
      notLiveReason: tracking.data?.notLiveReason ?? null,
      pixel,
      ga,
      changePixel: (value: string) => {setPixelDraft(value); setNotice(null);},
      changeGa: (value: string) => {setGaDraft(value.toUpperCase()); setNotice(null);},
      busy: trackingMutation.isPending,
      save: () => {
        if (!tracking.data) return;
        void run("settings", "tracking", () => trackingMutation.mutateAsync({expectedRevision: tracking.data.revision,
          metaPixelId: pixel.trim() || null, googleMeasurementId: ga.trim() || null}),
        () => {setPixelDraft(null); setGaDraft(null);});
      },
    },
  };
}

export type OwnerViewController = ReturnType<typeof useOwnerViewController>;
