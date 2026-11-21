import {cleanup, render, screen} from "@testing-library/react";
import {afterEach, describe, expect, it} from "vitest";
import {CatchLinkedText} from "./CatchLinkedText";

afterEach(cleanup);

describe("CatchLinkedText", () => {
  it("is one paragraph whose links sit inside the sentence", () => {
    render(<CatchLinkedText parts={["Prefer a person? ", {label: "WhatsApp us", href: "#chat", newTab: true}, " or ", {label: "book a walkthrough", href: "/walkthrough/", arrow: true}, "."]} />);
    const paragraph = screen.getByText(/Prefer a person\?/u);
    expect(paragraph.tagName).toBe("P");
    expect(paragraph.textContent).toBe("Prefer a person? WhatsApp us or book a walkthrough.");
    const chat = screen.getByRole("link", {name: "WhatsApp us"});
    expect(chat.getAttribute("target")).toBe("_blank");
    expect(screen.getByRole("link", {name: "book a walkthrough"}).querySelector("svg")).not.toBeNull();
    expect(screen.queryByRole("button")).toBeNull();
  });
});
