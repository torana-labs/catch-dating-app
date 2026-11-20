import {describe, expect, it} from "vitest";
import {describeAiFallbackTest, type AiFallbackTestResult} from "./aiFallbackTestRepository";

const base: AiFallbackTestResult = {ok: true, dryRun: false, failedStep: null, refusal: null, httpStatus: null,
  modelId: "claude-opus-5-5", inputTokens: 320, outputTokens: 30, costMicros: 1880, durationMs: 2400};

describe("describeAiFallbackTest", () => {
  it("says what a passing call used", () => {
    expect(describeAiFallbackTest(base)).toBe(
      "It works: claude-opus-5-5 answered in 2.4 s, 320 tokens in, 30 out, US$0.0019.");
    expect(describeAiFallbackTest({...base, dryRun: true})).toMatch(/token exchange succeeded/u);
  });

  it("names the failing step with its status or refusal", () => {
    expect(describeAiFallbackTest({...base, ok: false, failedStep: "token_exchange", httpStatus: 401}))
      .toBe("Anthropic refused the token exchange (HTTP 401).");
    expect(describeAiFallbackTest({...base, ok: false, failedStep: "budget", refusal: "ai_daily_limit"}))
      .toBe("The monthly cap or today's test limit refused it (ai_daily_limit).");
    expect(describeAiFallbackTest({...base, ok: false, failedStep: "config"}))
      .toBe("The federation settings are not set on this project.");
  });
});
