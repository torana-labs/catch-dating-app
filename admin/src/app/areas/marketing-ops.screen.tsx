import {lazy} from "react";
import type {AdminAreaRender} from "../adminAreaKit";
import {marketingPathForTab} from "./marketing-ops";

const MarketingOpsScreen = lazy(() => import("../../features/marketing/ui/MarketingOpsScreen").then((m) => ({default: m.MarketingOpsScreen})));

const render: AdminAreaRender = ({navigate, route, setError, setMarketingDirty, setNotice}) => (
  <MarketingOpsScreen
    activeTab={route.marketingTab}
    composerStep={route.composerStep}
    onComposerStepChange={(step) => {
      const draftId = route.params.draftId ?? null;
      if (draftId) navigate(`/marketing/drafts/${encodeURIComponent(draftId)}/${step}`);
    }}
    onDraftOpen={(draftId, step) => navigate(`/marketing/drafts/${encodeURIComponent(draftId)}/${step}`)}
    onError={setError}
    onNotice={setNotice}
    onTabChange={(tab) => navigate(marketingPathForTab(tab))}
    onUnsavedChangesChange={setMarketingDirty}
    selectedDraftId={route.params.draftId ?? null}
  />
);

export default render;
