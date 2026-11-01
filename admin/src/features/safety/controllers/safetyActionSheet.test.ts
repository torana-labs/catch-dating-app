import {describe, expect, it} from "vitest";
import {
  actionButtonLabel,
  buildTakeAction,
  canTakeStep,
  defaultActionMessage,
  safetyJob,
  type ActionDraft,
} from "./safetyActionSheet";

const draft: ActionDraft = {
  kind: "restrict", durationDays: 7, reasonCode: "harassment",
  messageToUser: " Two messages broke our rule. ", notifyReporter: true,
  appealable: true, note: " Two harassing messages. ",
};

describe("safety action sheet", () => {
  it("lets ops warn and restrict, and only the owner suspend or ban", () => {
    expect(safetyJob(["support"])).toBe("ops");
    expect(safetyJob(["admin", "adminOwner"])).toBe("owner");
    expect(canTakeStep("ops", "restrict")).toBe(true);
    expect(canTakeStep("ops", "ban")).toBe(false);
    expect(canTakeStep("owner", "suspend")).toBe(true);
  });

  it("builds the payload and refuses what the server would", () => {
    expect(buildTakeAction({job: "ops", uid: "u1",
      caseTargetPath: "reports/r1", draft})).toEqual({payload: {
      uid: "u1", kind: "restrict", durationDays: 7,
      reasonCode: "harassment", messageToUser: "Two messages broke our rule.",
      caseTargetPath: "reports/r1", notifyReporter: true, appealable: true,
      note: "Two harassing messages."}});
    expect(buildTakeAction({job: "ops", uid: "u1", caseTargetPath: null,
      draft: {...draft, kind: "ban", durationDays: null}}))
      .toEqual({error: "Only the owner can suspend or ban an account."});
    expect(buildTakeAction({job: "owner", uid: "u1", caseTargetPath: null,
      draft: {...draft, kind: "ban", durationDays: 7}}))
      .toEqual({error: "Choose how long this lasts."});
    const noCase = buildTakeAction({job: "ops", uid: "u1",
      caseTargetPath: null, draft});
    expect("payload" in noCase && noCase.payload.notifyReporter).toBe(false);
  });

  it("words the message and the button plainly", () => {
    expect(defaultActionMessage({kind: "restrict", durationDays: 7,
      reasonLabel: "Harassment"})).toBe("Something you did broke our rule " +
      "on harassment. You can't send messages or post in group chats for " +
      "7 days.");
    expect(actionButtonLabel({kind: "restrict", durationDays: 7}))
      .toBe("Restrict for 7 days");
    expect(actionButtonLabel({kind: "ban", durationDays: null})).toBe("Ban");
  });
});
