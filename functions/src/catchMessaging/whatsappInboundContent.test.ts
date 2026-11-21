import assert from "node:assert/strict";
import {test} from "node:test";
import {
  catchInboundPlaceholder,
  catchSupportInboundText,
} from "./whatsappInboundContent";

const placeholder = (type: string, content: unknown, extra = {}) =>
  catchInboundPlaceholder(type, {type, [type]: content, ...extra});

test("media and replies become short Support placeholders", () => {
  assert.equal(placeholder("image", {id: "m1"}), "[photo]");
  assert.equal(placeholder("image", {caption: "  My\nticket "}),
    "[photo] My ticket");
  assert.equal(placeholder("audio", {voice: true}), "[voice note]");
  assert.equal(placeholder("audio", {}), "[audio]");
  assert.equal(placeholder("video", {caption: "Start line"}),
    "[video] Start line");
  assert.equal(placeholder("document", {filename: "receipt.pdf"}),
    "[document: receipt.pdf]");
  assert.equal(placeholder("document", {}), "[document]");
  assert.equal(placeholder("sticker", {}), "[sticker]");
  assert.equal(placeholder("location", {latitude: 1, longitude: 2}),
    "[location]");
  assert.equal(placeholder("location", {name: "Lakeside Park"}),
    "[location: Lakeside Park]");
  assert.equal(catchInboundPlaceholder("contacts",
    {type: "contacts", contacts: [{}, {}]}), "[2 contacts]");
  assert.equal(placeholder("button", {text: "Yes, I'm coming"}),
    "Yes, I'm coming");
  assert.equal(placeholder("interactive",
    {type: "list_reply", list_reply: {title: "Saturday run"}}),
  "Saturday run");
  assert.equal(placeholder("interactive",
    {type: "button_reply", button_reply: {title: "Refund"}}), "Refund");
  assert.equal(placeholder("unsupported", {}),
    "[message type WhatsApp could not show]");
});

test("reactions and system notices are not shown", () => {
  assert.equal(placeholder("reaction", {emoji: "👍"}), null);
  assert.equal(placeholder("system", {}), null);
  assert.equal(catchSupportInboundText({messageType: "reaction",
    text: null}), null);
});

test("long captions and file names are bounded", () => {
  const text = placeholder("document", {filename: "a".repeat(400)})!;
  assert.ok(text.length < 320);
  assert.ok(text.endsWith("…]"));
});

test("Support text: the body, the stored placeholder, or a type fallback",
  () => {
    assert.equal(catchSupportInboundText({messageType: "text",
      text: "Where is my ticket?"}), "Where is my ticket?");
    assert.equal(catchSupportInboundText({messageType: "text", text: " "}),
      null);
    assert.equal(catchSupportInboundText({messageType: "image",
      text: "[photo] receipt"}), "[photo] receipt");
    // Receipts stored before placeholders existed have no text.
    assert.equal(catchSupportInboundText({messageType: "audio", text: null}),
      "[audio]");
    assert.equal(catchSupportInboundText({messageType: null, text: "x"}),
      null);
  });
