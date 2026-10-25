import {AlertTriangle} from "lucide-react";
import {lazy, Suspense, useState} from "react";
import {useNavigate} from "react-router";

import {
  AdminButton,
  AdminGuardrailList,
  AdminIntakeReviewWorkbench,
  AdminToolbar,
  AdminWorkbenchNote,
  Panel,
} from "../../../../shared/ui/AdminPrimitives";
import {unavailableOperationRecordLabel} from
  "../../../../shared/operations/operationReadDiagnostics";
import {useAdminFeedback} from
  "../../../../shared/feedback/AdminFeedbackContext";
import {
  type OrganizerIntakeController,
  useOrganizerIntakeController,
} from "../controllers/useOrganizerIntakeController";
import {organizerIntakeWorkbench} from "./organizerIntakeWorkbench";
import {useOrganizerListingReviewController} from
  "../controllers/useOrganizerListingReviewController";
import {renderOrganizerListingReview} from "./organizerListingReviewPanels";
import {useListingEventImportsController} from
  "../controllers/useListingEventImportsController";
import {renderListingEventImports} from "./listingEventImportPanels";
import {useSupplyIntakePolicyController} from
  "../controllers/useSupplyIntakePolicyController";
import {renderSupplyIntakePolicies} from "./supplyIntakePolicyPanels";

const LazyOrganizerIntakeDiagnostics = lazy(async () => {
  const module = await import("./organizerIntakeDiagnostics");
  return {
    default: module.organizerIntakeDiagnostics.OrganizerIntakeDiagnostics,
  };
});

export function OrganizerIntakeScreen() {
  return (
    <Suspense
      fallback={(
        <AdminIntakeReviewWorkbench
          detail={null}
          items={[]}
          queueMeta="Loading live projection"
          queueTitle="Organizer intake"
          readOnly
          selectedId={null}
          state="loading"
          onSelect={() => undefined}
        />
      )}
    >
      <OrganizerIntakeLoadedScreen />
    </Suspense>
  );
}

function OrganizerIntakeLoadedScreen() {
  const navigate = useNavigate();
  const {setError: onError, setNotice: onNotice} = useAdminFeedback();
  const controller = useOrganizerIntakeController({
    onError,
    onNotice,
    onOrganizerDraftCreated: (organizerId) =>
      navigate(`/organizers/${encodeURIComponent(organizerId)}`),
  });
  const listingReview = useOrganizerListingReviewController({onError, onNotice});
  const eventImports = useListingEventImportsController({onError, onNotice});
  const policies = useSupplyIntakePolicyController({onError, onNotice});
  return (
    <>
      {renderOrganizerListingReview(listingReview)}
      {renderListingEventImports(eventImports)}
      {renderSupplyIntakePolicies(policies)}
      <OrganizerIntakeWorkspace controller={controller} />
    </>
  );
}

export function OrganizerIntakeWorkspace({
  controller,
  nowMs,
}: {
  controller: OrganizerIntakeController;
  nowMs?: number;
}) {
  const [showDiagnostics, setShowDiagnostics] = useState(false);
  if (!showDiagnostics) {
    return (
      <>
        <OrganizerUnavailableRecords controller={controller} />
        <organizerIntakeWorkbench.OrganizerTaskWorkbench
          controller={controller}
          nowMs={nowMs}
          onShowDiagnostics={() => setShowDiagnostics(true)}
        />
      </>
    );
  }
  if (!controller.diagnosticsBridge) {
    return (
      <>
        <OrganizerUnavailableRecords controller={controller} />
        <organizerIntakeWorkbench.OrganizerTaskWorkbench
          controller={controller}
          nowMs={nowMs}
          onShowDiagnostics={() => setShowDiagnostics(false)}
        />
      </>
    );
  }
  return (
    <>
      <OrganizerUnavailableRecords controller={controller} />
      <AdminToolbar>
        <AdminWorkbenchNote>
          Diagnostics preserves generated pipeline, policy, crawl, curation,
          and import evidence without forcing it into the daily decision path.
        </AdminWorkbenchNote>
        <AdminButton onClick={() => setShowDiagnostics(false)}>
          Back to review queue
        </AdminButton>
      </AdminToolbar>
      <Suspense fallback={<AdminWorkbenchNote>Loading diagnostics...</AdminWorkbenchNote>}>
        <LazyOrganizerIntakeDiagnostics
          bridge={controller.diagnosticsBridge}
          controller={controller}
        />
      </Suspense>
    </>
  );
}

function OrganizerUnavailableRecords({controller}: {
  controller: OrganizerIntakeController;
}) {
  const records = controller.bridge.unavailableRecords ?? [];
  if (!records.length) return null;
  return (
    <Panel title="Unavailable intake records" action="Read-only diagnostics"
      icon={<AlertTriangle size={18} strokeWidth={1.9} />}>
      <AdminWorkbenchNote>
        {records.length} unavailable record(s) in the selected organizer runs.
        Healthy rows remain inspectable. Queue counts cover healthy rows;
        publication totals are unavailable while records cannot be read.
      </AdminWorkbenchNote>
      <AdminGuardrailList>
        {records.slice(0, 10).map((record) => (
          <AdminWorkbenchNote key={record.documentId} title={record.documentId}>
            {unavailableOperationRecordLabel(record)}
          </AdminWorkbenchNote>
        ))}
      </AdminGuardrailList>
      {records.length > 10 ? (
        <AdminWorkbenchNote>
          Showing 10 of {records.length} unavailable records.
        </AdminWorkbenchNote>
      ) : null}
    </Panel>
  );
}
