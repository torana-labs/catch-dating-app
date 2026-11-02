import {readFileSync} from "node:fs";
import {describe, expect, it} from "vitest";

const operatorWorkflowSources = [
  "../../features/organizers/ui/organizerDetailPanels.tsx",
  "../../features/events/ui/eventPublishingDirectoryPanels.tsx",
  "../../features/events/ui/eventPublishingEditorPanels.tsx",
  "../../features/events/ui/eventPublishingSupplyPanels.tsx",
];

const implementationTelemetry = [
  "Cloud Firestore",
  "adminGet",
  "adminList",
  "adminRecord",
  "adminUpdate",
  "adminSearch.tokens",
  "adminAuditLogs/",
  "eventIntakeDashboards/",
  "eventIntakeReviewDecisions/",
  "publicRouteReservations",
  "Publishing contract",
  "Event contract",
  "Event intake contract",
  "Mutation boundary",
];

describe("operator-facing workflow copy", () => {
  it("keeps backend implementation telemetry out of primary task surfaces", () => {
    for (const relativePath of operatorWorkflowSources) {
      const source = readFileSync(new URL(relativePath, import.meta.url), "utf8");
      for (const implementationDetail of implementationTelemetry) {
        expect(source, `${relativePath} exposes ${implementationDetail}`)
          .not.toContain(implementationDetail);
      }
    }
  });
});
