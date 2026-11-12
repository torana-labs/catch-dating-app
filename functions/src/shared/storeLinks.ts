import {BRAND, type StoreLinks} from "./generated/brand";

/** The app a message points to: Catch for guests, Catch Host for hosts. */
export type StoreApp = "consumer" | "host";

type StoreRecord = {
  readonly consumerAppName: string;
  readonly hostAppName: string;
  readonly consumer: StoreLinks;
  readonly host: StoreLinks;
};

/**
 * Plain-text lines naming each store the app is on, from
 * packages/brand/brand.json. A null slot (the app is not on that store yet)
 * adds no line, so a message written today gains links as they go live.
 * @param {StoreApp} app The app to link.
 * @param {StoreRecord} stores The brand record's stores.
 * @return {string[]} Zero, one or two lines.
 */
export function storeLinkLines(app: StoreApp,
  stores: StoreRecord = BRAND.stores): string[] {
  const name = app === "consumer" ? stores.consumerAppName : stores.hostAppName;
  const links = stores[app];
  return [
    ...(links.ios ? [`${name} on the App Store: ${links.ios}`] : []),
    ...(links.android ? [`${name} on Google Play: ${links.android}`] : []),
  ];
}
