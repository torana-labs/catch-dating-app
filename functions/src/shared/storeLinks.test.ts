import {strict as assert} from "node:assert";
import {test} from "node:test";
import {BRAND, type StoreLinks} from "./generated/brand";
import {storeLinkLines} from "./storeLinks";

const ios = "https://apps.apple.com/app/catch-host/id6778927317";
const android =
  "https://play.google.com/store/apps/details?id=com.catchdates.app";
const none: StoreLinks = {ios: null, android: null};
const stores = (consumer: StoreLinks, host: StoreLinks = none) =>
  ({...BRAND.stores, consumer, host});

test("a null store slot adds no line", () => {
  assert.deepEqual(storeLinkLines("consumer", stores(none)), []);
});

test("each set slot adds one line naming the app and the store", () => {
  assert.deepEqual(storeLinkLines("consumer", stores({ios: null, android})),
    [`${BRAND.stores.consumerAppName} on Google Play: ${android}`]);
  assert.deepEqual(storeLinkLines("host", stores(none, {ios, android: null})),
    [`${BRAND.stores.hostAppName} on the App Store: ${ios}`]);
});

test("the default reads the generated brand record", () => {
  const expected = [BRAND.stores.consumer.ios, BRAND.stores.consumer.android]
    .filter((link) => link !== null).length;
  assert.equal(storeLinkLines("consumer").length, expected);
});
