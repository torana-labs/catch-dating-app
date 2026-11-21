import {describe, expect, it} from "vitest";
import {linkedParts} from "./linkedParts";

describe("linkedParts", () => {
  it("swaps each named slot for its link and keeps the words around it", () => {
    const chat = {label: "WhatsApp us", href: "#chat"};
    expect(linkedParts("Prefer a person? {chat} or call.", {chat})).toEqual(["Prefer a person? ", chat, " or call."]);
    expect(linkedParts("{chat}", {chat})).toEqual([chat]);
    expect(linkedParts("No slot {missing} here.", {})).toEqual(["No slot ", "{missing}", " here."]);
  });
});
