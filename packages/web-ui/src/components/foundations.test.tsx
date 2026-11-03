import {cleanup, render, screen} from "@testing-library/react";
import {afterEach, describe, expect, it} from "vitest";
import {CatchGap} from "./CatchGap";
import {CatchInset} from "./CatchInset";
import {CatchPageBody} from "./CatchPageBody";
import {CatchSectionList} from "./CatchSectionList";
import {CatchLegacyText} from "./CatchLegacyText";

afterEach(cleanup);

describe("CatchLegacyText", () => {
  it("renders a paragraph in its role by default", () => {
    render(<CatchLegacyText variant="bodyM">Doors open at eight.</CatchLegacyText>);

    const text = screen.getByText("Doors open at eight.");
    expect(text.tagName).toBe("P");
    expect(text.dataset.variant).toBe("bodyM");
    expect(text.hasAttribute("data-color")).toBe(false);
    expect(text.hasAttribute("style")).toBe(false);
  });

  it("renders the semantic element the caller chooses", () => {
    render(<CatchLegacyText as="h2" variant="titleL">Tonight</CatchLegacyText>);

    expect(screen.getByRole("heading", {level: 2, name: "Tonight"}).dataset.variant).toBe("titleL");
  });

  it("records color, alignment and line clamp overrides", () => {
    render(
      <CatchLegacyText color="danger" maxLines={2} textAlign="center" variant="supporting">
        Payment failed
      </CatchLegacyText>,
    );

    const text = screen.getByText("Payment failed");
    expect(text.dataset.color).toBe("danger");
    expect(text.dataset.align).toBe("center");
    expect(text.hasAttribute("data-max-lines")).toBe(true);
    expect(text.style.getPropertyValue("--catch-text-max-lines")).toBe("2");
  });

  it("ignores a non-positive line clamp", () => {
    render(<CatchLegacyText maxLines={0} variant="bodyS">Unclamped</CatchLegacyText>);

    expect(screen.getByText("Unclamped").hasAttribute("data-max-lines")).toBe(false);
  });
});

describe("CatchGap", () => {
  it("defaults to a vertical, stretched flow", () => {
    render(<CatchGap data-testid="gap" size="related"><span>A</span><span>B</span></CatchGap>);

    const gap = screen.getByTestId("gap");
    expect(gap.tagName).toBe("DIV");
    expect(gap.dataset).toMatchObject({
      crossAxis: "stretch",
      direction: "vertical",
      mainAxis: "start",
      size: "related",
    });
    expect(gap.hasAttribute("data-wrap")).toBe(false);
  });

  it("carries direction, alignment, wrap and element", () => {
    render(
      <CatchGap
        as="ul"
        crossAxisAlignment="center"
        data-testid="gap"
        direction="horizontal"
        mainAxisAlignment="spaceBetween"
        size="inline"
        wrap
      >
        <li>One</li>
      </CatchGap>,
    );

    const gap = screen.getByTestId("gap");
    expect(gap.tagName).toBe("UL");
    expect(gap.dataset).toMatchObject({
      crossAxis: "center",
      direction: "horizontal",
      mainAxis: "spaceBetween",
      size: "inline",
      wrap: "true",
    });
  });
});

describe("CatchInset", () => {
  it("pads by a semantic inset role", () => {
    render(<CatchInset as="section" data-testid="inset" padding="contentRelaxed">Body</CatchInset>);

    const inset = screen.getByTestId("inset");
    expect(inset.tagName).toBe("SECTION");
    expect(inset.dataset.padding).toBe("contentRelaxed");
  });
});

describe("CatchPageBody", () => {
  it("applies the page gutter and default insets", () => {
    render(<CatchPageBody data-testid="body">Page</CatchPageBody>);

    const body = screen.getByTestId("body");
    expect(body.hasAttribute("data-gutter")).toBe(true);
    expect(body.hasAttribute("data-constrained")).toBe(false);
    expect(body.hasAttribute("data-pt")).toBe(false);
    expect(body.hasAttribute("data-pb")).toBe(false);
  });

  it("records gutter, width and inset overrides", () => {
    render(
      <CatchPageBody as="main" constrainToContentWidth gutter={false} pb="s8" pt="s3">
        Page
      </CatchPageBody>,
    );

    const body = screen.getByRole("main");
    expect(body.hasAttribute("data-gutter")).toBe(false);
    expect(body.hasAttribute("data-constrained")).toBe(true);
    expect(body.dataset).toMatchObject({pb: "s8", pt: "s3"});
  });
});

describe("CatchSectionList", () => {
  it("separates sections by the section gap by default", () => {
    render(
      <CatchSectionList data-testid="list" emptyStateOmitted>
        <section>First</section>
        <section>Second</section>
      </CatchSectionList>,
    );

    expect(screen.getByTestId("list").dataset.gap).toBe("section");
  });

  it("renders the caller's empty state when there are no sections", () => {
    render(
      <CatchSectionList emptyBuilder={() => <p>No sections yet</p>} emptyStateOmitted={false}>
        {[]}
        {null}
      </CatchSectionList>,
    );

    expect(screen.getByText("No sections yet")).toBeTruthy();
  });

  it("renders nothing when empty content is explicitly omitted", () => {
    const {container} = render(<CatchSectionList emptyStateOmitted>{false}</CatchSectionList>);

    expect(container.childElementCount).toBe(0);
  });
});
