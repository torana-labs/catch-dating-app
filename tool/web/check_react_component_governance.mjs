#!/usr/bin/env node
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import {fromRepo} from "../lib/repo_paths.mjs";

const surfaces = {
  admin: {
    root: "admin/src",
    primitiveOwners: [
      "admin/src/shared/ui/",
    ],
  },
  website: {
    root: "website/src",
    primitiveOwners: [
      "website/src/shared/site/",
      "website/src/shared/ui/",
    ],
  },
  webui: {
    root: "packages/web-ui/src",
    primitiveOwners: ["packages/web-ui/src/"],
  },
};

const checkedExtensions = new Set([".tsx", ".jsx", ".ts", ".js"]);
const jsxExtensions = new Set([".tsx", ".jsx"]);
const overrideToken = "react-component-governance-allow";
const debtIdPattern = /[A-Z][A-Z0-9]+(?:-[A-Z0-9]+)*-\d{3,}/u;

const componentFamilies = [
  {
    family: "website-legacy-site-barrel",
    surfaces: ["website"],
    filePathPatterns: [
      {
        pattern: /^website\/src\/components\/site\.tsx$/u,
        description: "legacy website components/site barrel",
      },
    ],
    sourcePatterns: [
      {
        pattern: /(?:from\s+|import\s*\(\s*)["'][^"']*components\/site["']/gu,
        description: "legacy website components/site import",
      },
    ],
    jsxPatterns: [],
    createElementPattern: null,
    guidance: "Import site chrome from shared/site, visual primitives from shared/ui/primitives, and domain adapters from their feature folders; do not recreate the legacy components/site barrel.",
  },
  {
    family: "website-page-shell",
    surfaces: ["website"],
    jsxPatterns: [
      {
        pattern:
          /<div\b[^>]*\bclassName=\{?["'`][^"'`]*\bpage-shell\b[^"'`]*["'`]\}?/gu,
        description: "raw website page shell",
      },
      {
        pattern: /<main\b/gu,
        description: "raw website page main shell",
      },
    ],
    createElementPattern:
      /(?:^|[^\w$.])(?:React\.)?createElement\(\s*["']main["']/gu,
    createElementDescription: "React.createElement(\"main\")",
    guidance: "Use PageShell and WebsitePageMain from shared/site, or a route-specific shared main such as ClaimFlowMain or HostPreviewMain, instead of rendering page-shell wrappers or <main> directly.",
  },
  {
    family: "data-table",
    jsxPatterns: [
      {
        pattern: /<table\b/gu,
        description: "raw <table>",
      },
      {
        pattern: /\brole=["']table["']/gu,
        description: "role=\"table\"",
      },
    ],
    createElementPattern:
      /(?:^|[^\w$.])(?:React\.)?createElement\(\s*["']table["']/gu,
    createElementDescription: "React.createElement(\"table\")",
    guidance: "Use the surface DataTable primitive instead of rendering a table shell directly.",
  },
  {
    family: "admin-workbench-table",
    surfaces: ["admin"],
    sourcePatterns: [
      {
        pattern:
          /["'`][^"'`]*(?<![-\w])workbench-table(?![-\w])[^"'`]*["'`]/gu,
        description: "raw admin workbench table class string",
      },
    ],
    jsxPatterns: [
      {
        pattern:
          /<[^>\s]+\b[^>]*\bclassName=\{?["'`][^"'`]*(?<![-\w])workbench-table(?![-\w])[^"'`]*["'`]\}?/gu,
        description: "raw admin workbench table shell",
      },
    ],
    createElementPattern: null,
    guidance: "Use DataTable variant=\"workbench\" instead of class-configuring admin workbench table shells directly.",
  },
  {
    family: "form-shell",
    jsxPatterns: [
      {
        pattern: /<form\b/gu,
        description: "raw <form>",
      },
    ],
    createElementPattern:
      /(?:^|[^\w$.])(?:React\.)?createElement\(\s*["']form["']/gu,
    createElementDescription: "React.createElement(\"form\")",
    guidance: "Use the surface Form/AdminForm primitive instead of rendering a form shell directly.",
  },
  {
    family: "admin-editor-section-form",
    surfaces: ["admin"],
    sourcePatterns: [
      {
        pattern:
          /["'`][^"'`]*(?<![-\w])(?:publishing-form|editor-section)(?![-\w])[^"'`]*["'`]/gu,
        description: "raw admin editor section or publishing form class string",
      },
    ],
    jsxPatterns: [
      {
        pattern:
          /<[^>\s]+\b[^>]*\bclassName=\{?["'`][^"'`]*(?<![-\w])publishing-form(?![-\w])[^"'`]*["'`]\}?/gu,
        description: "raw admin publishing form shell",
      },
      {
        pattern:
          /<fieldset\b[^>]*\bclassName=\{?["'`][^"'`]*(?<![-\w])editor-section(?![-\w])[^"'`]*["'`]\}?/gu,
        description: "raw admin editor fieldset section",
      },
    ],
    createElementPattern: null,
    guidance: "Use AdminForm variant=\"publishing\", AdminPublishingFormShell, and AdminEditorSection instead of rendering or class-configuring admin editor form shells directly.",
  },
  {
    family: "admin-layout-span",
    surfaces: ["admin"],
    sourcePatterns: [
      {
        pattern:
          /["'`][^"'`]*(?<![-\w])span-2(?![-\w])[^"'`]*["'`]/gu,
        description: "raw admin layout span class string",
      },
    ],
    jsxPatterns: [
      {
        pattern:
          /\bclassName=\{?["'`][^"'`]*(?<![-\w])span-2(?![-\w])[^"'`]*["'`]\}?/gu,
        description: "raw admin layout span class",
      },
    ],
    createElementPattern: null,
    guidance: "Use the shared span={2} layout prop on AdminPanel, Panel, AdminEditorPanel, AdminCard, TextField, or TextareaField instead of passing the raw admin span-2 class from feature code.",
  },
  {
    family: "admin-eyebrow-label",
    surfaces: ["admin"],
    sourcePatterns: [
      {
        pattern:
          /["'`][^"'`]*(?<![-\w])intake-eyebrow(?![-\w])[^"'`]*["'`]/gu,
        description: "raw admin eyebrow label class string",
      },
    ],
    jsxPatterns: [
      {
        pattern:
          /\bclassName=\{?["'`][^"'`]*(?<![-\w])intake-eyebrow(?![-\w])[^"'`]*["'`]\}?/gu,
        description: "raw admin eyebrow label class",
      },
    ],
    createElementPattern: null,
    guidance: "Use AdminEyebrow or an existing primitive prop such as PageHeader eyebrow instead of passing the raw admin intake-eyebrow class from feature code.",
  },
  {
    family: "admin-card-stat-layout",
    surfaces: ["admin"],
    sourcePatterns: [
      {
        pattern:
          /["'`][^"'`]*(?<![-\w])(?:marketing-card-list|marketing-stat-grid|marketing-card-header|marketing-card)(?![-\w])[^"'`]*["'`]/gu,
        description: "raw admin marketing card/stat layout class string",
      },
    ],
    jsxPatterns: [
      {
        pattern:
          /\bclassName=\{?["'`][^"'`]*(?<![-\w])(?:marketing-card-list|marketing-stat-grid|marketing-card-header|marketing-card)(?![-\w])[^"'`]*["'`]\}?/gu,
        description: "raw admin marketing card/stat layout class",
      },
    ],
    createElementPattern: null,
    guidance: "Use AdminCardList, AdminStatGrid, AdminCard, and CardHeader instead of passing raw admin marketing-card layout classes from feature code.",
  },
  {
    family: "admin-marketing-studio-shell",
    surfaces: ["admin"],
    sourcePatterns: [
      {
        pattern:
          /["'`][^"'`]*(?<![-\w])(?:marketing-ops-shell|marketing-studio-shell|marketing-studio-header|marketing-studio-actions|marketing-studio-nav|marketing-tabs)(?![-\w])[^"'`]*["'`]/gu,
        description: "raw admin marketing studio shell class string",
      },
    ],
    jsxPatterns: [
      {
        pattern:
          /\bclassName=\{?["'`][^"'`]*(?<![-\w])(?:marketing-ops-shell|marketing-studio-shell|marketing-studio-header|marketing-studio-actions|marketing-studio-nav|marketing-tabs)(?![-\w])[^"'`]*["'`]\}?/gu,
        description: "raw admin marketing studio shell class",
      },
    ],
    createElementPattern: null,
    guidance: "Use AdminMarketingOpsShell, AdminMarketingStudioHeader, AdminMarketingStudioActions, AdminMarketingStudioNav, and AdminMarketingTabs instead of passing raw admin marketing studio shell classes from feature code.",
  },
  {
    family: "admin-marketing-post-board",
    surfaces: ["admin"],
    sourcePatterns: [
      {
        pattern:
          /["'`][^"'`]*(?<![-\w])(?:marketing-studio-stack|marketing-studio-summary|marketing-studio-filter-row|marketing-post-board|marketing-board-column|marketing-board-list|marketing-post-type)(?![-\w])[^"'`]*["'`]/gu,
        description: "raw admin marketing post-board class string",
      },
    ],
    jsxPatterns: [
      {
        pattern:
          /\bclassName=\{?["'`][^"'`]*(?<![-\w])(?:marketing-studio-stack|marketing-studio-summary|marketing-studio-filter-row|marketing-post-board|marketing-board-column|marketing-board-list|marketing-post-type)(?![-\w])[^"'`]*["'`]\}?/gu,
        description: "raw admin marketing post-board class",
      },
    ],
    createElementPattern: null,
    guidance: "Use AdminMarketingStudioStack, AdminMarketingStudioSummary, AdminMarketingStudioFilterTabs, AdminMarketingPostBoard, AdminMarketingBoardColumn, AdminMarketingBoardList, and AdminMarketingPostTypeBadge instead of passing raw admin marketing post-board classes from feature code.",
  },
  {
    family: "admin-marketing-composer-flow",
    surfaces: ["admin"],
    sourcePatterns: [
      {
        pattern:
          /["'`][^"'`]*(?<![-\w])(?:marketing-composer|marketing-composer-header|marketing-composer-back|marketing-step-strip|marketing-step-chip|marketing-step-layout|marketing-composer-footer)(?![-\w])[^"'`]*["'`]/gu,
        description: "raw admin marketing composer flow class string",
      },
    ],
    jsxPatterns: [
      {
        pattern:
          /\bclassName=\{?["'`][^"'`]*(?<![-\w])(?:marketing-composer|marketing-composer-header|marketing-composer-back|marketing-step-strip|marketing-step-chip|marketing-step-layout|marketing-composer-footer)(?![-\w])[^"'`]*["'`]\}?/gu,
        description: "raw admin marketing composer flow class",
      },
    ],
    createElementPattern: null,
    guidance: "Use AdminMarketingComposer, AdminMarketingComposerHeader, AdminMarketingComposerBackButton, AdminMarketingStepStrip, AdminMarketingStepChip, AdminMarketingStepLayout, and AdminMarketingComposerFooter instead of passing raw admin marketing composer flow classes from feature code.",
  },
  {
    family: "admin-marketing-picker-list",
    surfaces: ["admin"],
    sourcePatterns: [
      {
        pattern:
          /["'`][^"'`]*(?<![-\w])(?:marketing-picker-list|marketing-picker-row)(?![-\w])[^"'`]*["'`]/gu,
        description: "raw admin marketing picker list class string",
      },
    ],
    jsxPatterns: [
      {
        pattern:
          /\bclassName=\{?["'`][^"'`]*(?<![-\w])(?:marketing-picker-list|marketing-picker-row)(?![-\w])[^"'`]*["'`]\}?/gu,
        description: "raw admin marketing picker list class",
      },
    ],
    createElementPattern: null,
    guidance: "Use AdminMarketingPickerList and AdminMarketingPickerRow instead of passing raw admin marketing picker list classes from feature code.",
  },
  {
    family: "admin-marketing-feature-shot",
    surfaces: ["admin"],
    sourcePatterns: [
      {
        pattern:
          /["'`][^"'`]*(?<![-\w])(?:marketing-feature-shot-grid|marketing-feature-shot-card)(?![-\w])[^"'`]*["'`]/gu,
        description: "raw admin marketing feature shot class string",
      },
    ],
    jsxPatterns: [
      {
        pattern:
          /\bclassName=\{?["'`][^"'`]*(?<![-\w])(?:marketing-feature-shot-grid|marketing-feature-shot-card)(?![-\w])[^"'`]*["'`]\}?/gu,
        description: "raw admin marketing feature shot class",
      },
    ],
    createElementPattern: null,
    guidance: "Use AdminMarketingFeatureShotGrid and AdminMarketingFeatureShotCard instead of passing raw admin marketing feature shot classes from feature code.",
  },
  {
    family: "admin-marketing-brand-contract",
    surfaces: ["admin"],
    sourcePatterns: [
      {
        pattern:
          /["'`][^"'`]*(?<![-\w])(?:marketing-brand-contract)(?![-\w])[^"'`]*["'`]/gu,
        description: "raw admin marketing brand contract class string",
      },
    ],
    jsxPatterns: [
      {
        pattern:
          /\bclassName=\{?["'`][^"'`]*(?<![-\w])(?:marketing-brand-contract)(?![-\w])[^"'`]*["'`]\}?/gu,
        description: "raw admin marketing brand contract class",
      },
    ],
    createElementPattern: null,
    guidance: "Use AdminMarketingBrandContract and AdminMarketingBrandContractItem instead of passing raw admin marketing brand contract classes from feature code.",
  },
  {
    family: "admin-marketing-help-compliance",
    surfaces: ["admin"],
    sourcePatterns: [
      {
        pattern:
          /["'`][^"'`]*(?<![-\w])(?:marketing-help-text|marketing-compliance-list)(?![-\w])[^"'`]*["'`]/gu,
        description: "raw admin marketing help or compliance class string",
      },
    ],
    jsxPatterns: [
      {
        pattern:
          /\bclassName=\{?["'`][^"'`]*(?<![-\w])(?:marketing-help-text|marketing-compliance-list)(?![-\w])[^"'`]*["'`]\}?/gu,
        description: "raw admin marketing help or compliance class",
      },
    ],
    createElementPattern: null,
    guidance: "Use AdminMarketingHelpText and AdminMarketingComplianceList instead of passing raw admin marketing help/compliance classes from feature code.",
  },
  {
    family: "admin-marketing-event-library",
    surfaces: ["admin"],
    sourcePatterns: [
      {
        pattern:
          /["'`][^"'`]*(?<![-\w])(?:marketing-event-library-grid|marketing-library-card|marketing-card-link)(?![-\w])[^"'`]*["'`]/gu,
        description: "raw admin marketing event library class string",
      },
    ],
    jsxPatterns: [
      {
        pattern:
          /\bclassName=\{?["'`][^"'`]*(?<![-\w])(?:marketing-event-library-grid|marketing-library-card|marketing-card-link)(?![-\w])[^"'`]*["'`]\}?/gu,
        description: "raw admin marketing event library class",
      },
    ],
    createElementPattern: null,
    guidance: "Use AdminMarketingEventLibraryGrid, AdminMarketingLibraryCard, and AdminMarketingCardLink instead of passing raw admin marketing event library classes from feature code.",
  },
  {
    family: "admin-marketing-media-library",
    surfaces: ["admin"],
    sourcePatterns: [
      {
        pattern:
          /["'`][^"'`]*(?<![-\w])(?:marketing-media-grid|marketing-media-card)(?![-\w])[^"'`]*["'`]/gu,
        description: "raw admin marketing media library class string",
      },
    ],
    jsxPatterns: [
      {
        pattern:
          /\bclassName=\{?["'`][^"'`]*(?<![-\w])(?:marketing-media-grid|marketing-media-card)(?![-\w])[^"'`]*["'`]\}?/gu,
        description: "raw admin marketing media library class",
      },
    ],
    createElementPattern: null,
    guidance: "Use AdminMarketingMediaGrid and AdminMarketingMediaCard instead of passing raw admin marketing media library classes from feature code.",
  },
  {
    family: "admin-marketing-new-post",
    surfaces: ["admin"],
    sourcePatterns: [
      {
        pattern:
          /["'`][^"'`]*(?<![-\w])(?:marketing-new-post-grid|marketing-new-post-card)(?![-\w])[^"'`]*["'`]/gu,
        description: "raw admin marketing new post class string",
      },
    ],
    jsxPatterns: [
      {
        pattern:
          /\bclassName=\{?["'`][^"'`]*(?<![-\w])(?:marketing-new-post-grid|marketing-new-post-card)(?![-\w])[^"'`]*["'`]\}?/gu,
        description: "raw admin marketing new post class",
      },
    ],
    createElementPattern: null,
    guidance: "Use AdminMarketingNewPostGrid and AdminMarketingNewPostCard instead of passing raw admin marketing new post classes from feature code.",
  },
  {
    family: "admin-marketing-guide-shell",
    surfaces: ["admin"],
    sourcePatterns: [
      {
        pattern:
          /["'`][^"'`]*(?<![-\w])(?:marketing-guide-layout|marketing-deliverable)(?![-\w])[^"'`]*["'`]/gu,
        description: "raw admin marketing guide shell class string",
      },
    ],
    jsxPatterns: [
      {
        pattern:
          /\bclassName=\{?["'`][^"'`]*(?<![-\w])(?:marketing-guide-layout|marketing-deliverable)(?![-\w])[^"'`]*["'`]\}?/gu,
        description: "raw admin marketing guide shell class",
      },
    ],
    createElementPattern: null,
    guidance: "Use AdminMarketingGuideLayout and AdminMarketingDeliverable instead of passing raw admin marketing guide shell classes from feature code.",
  },
  {
    family: "admin-marketing-stacked-sections",
    surfaces: ["admin"],
    sourcePatterns: [
      {
        pattern:
          /["'`][^"'`]*(?<![-\w])marketing-stacked-sections(?![-\w])[^"'`]*["'`]/gu,
        description: "raw admin marketing stacked sections class string",
      },
    ],
    jsxPatterns: [
      {
        pattern:
          /\bclassName=\{?["'`][^"'`]*(?<![-\w])marketing-stacked-sections(?![-\w])[^"'`]*["'`]\}?/gu,
        description: "raw admin marketing stacked sections class",
      },
    ],
    createElementPattern: null,
    guidance: "Use AdminMarketingStackedSections instead of passing the raw admin marketing-stacked-sections class from feature code.",
  },
  {
    family: "admin-marketing-app-media",
    surfaces: ["admin"],
    sourcePatterns: [
      {
        pattern:
          /["'`][^"'`]*(?<![-\w])(?:marketing-app-capture-preview|marketing-app-media-paths)(?![-\w])[^"'`]*["'`]/gu,
        description: "raw admin marketing app media class string",
      },
    ],
    jsxPatterns: [
      {
        pattern:
          /\bclassName=\{?["'`][^"'`]*(?<![-\w])(?:marketing-app-capture-preview|marketing-app-media-paths)(?![-\w])[^"'`]*["'`]\}?/gu,
        description: "raw admin marketing app media class",
      },
    ],
    createElementPattern: null,
    guidance: "Use AdminMarketingAppCapturePreview and AdminMarketingAppMediaPaths instead of passing raw admin marketing app media classes from feature code.",
  },
  {
    family: "admin-marketing-field",
    surfaces: ["admin"],
    sourcePatterns: [
      {
        pattern:
          /["'`][^"'`]*(?<![-\w])marketing-field(?![-\w])[^"'`]*["'`]/gu,
        description: "raw admin marketing field class string",
      },
    ],
    jsxPatterns: [
      {
        pattern:
          /\bclassName=\{?["'`][^"'`]*(?<![-\w])marketing-field(?![-\w])[^"'`]*["'`]\}?/gu,
        description: "raw admin marketing field class",
      },
    ],
    createElementPattern: null,
    guidance: "Use AdminTextField, AdminTextareaField, and AdminMarketingSelectField instead of passing the raw admin marketing-field class from feature code.",
  },
  {
    family: "admin-marketing-layout-shell",
    surfaces: ["admin"],
    sourcePatterns: [
      {
        pattern:
          /["'`][^"'`]*(?<![-\w])(?:marketing-grid|marketing-panel|marketing-section|marketing-section-header|marketing-title-input|marketing-edit-grid)(?![-\w])[^"'`]*["'`]/gu,
        description: "raw admin marketing layout shell class string",
      },
    ],
    jsxPatterns: [
      {
        pattern:
          /\bclassName=\{?["'`][^"'`]*(?<![-\w])(?:marketing-grid|marketing-panel|marketing-section|marketing-section-header|marketing-title-input|marketing-edit-grid)(?![-\w])[^"'`]*["'`]\}?/gu,
        description: "raw admin marketing layout shell class",
      },
    ],
    createElementPattern: null,
    guidance: "Use AdminMarketingGrid, AdminMarketingPanel, AdminMarketingTitleInput, AdminMarketingSection, and AdminMarketingEditGrid instead of passing raw admin marketing layout classes from feature code.",
  },
  {
    family: "admin-diff-list",
    surfaces: ["admin"],
    sourcePatterns: [
      {
        pattern:
          /["'`][^"'`]*(?<![-\w])(?:diff-list|diff-row)(?![-\w])[^"'`]*["'`]/gu,
        description: "raw admin diff list class string",
      },
    ],
    jsxPatterns: [
      {
        pattern:
          /\bclassName=\{?["'`][^"'`]*(?<![-\w])(?:diff-list|diff-row)(?![-\w])[^"'`]*["'`]\}?/gu,
        description: "raw admin diff list class",
      },
    ],
    createElementPattern: null,
    guidance: "Use AdminDiffList and AdminDiffRow instead of passing raw admin diff-list/diff-row classes from feature code.",
  },
  {
    family: "admin-publishing-utility-primitives",
    surfaces: ["admin"],
    sourcePatterns: [
      {
        pattern:
          /["'`][^"'`]*(?<![-\w])(?:publishing-loadbar|surface-preview|muted-cell)(?![-\w])[^"'`]*["'`]/gu,
        description: "raw admin publishing utility class string",
      },
    ],
    jsxPatterns: [
      {
        pattern:
          /\bclassName=\{?["'`][^"'`]*(?<![-\w])(?:publishing-loadbar|surface-preview|muted-cell)(?![-\w])[^"'`]*["'`]\}?/gu,
        description: "raw admin publishing utility class",
      },
    ],
    createElementPattern: null,
    guidance: "Use AdminPublishingLoadbar, AdminSurfacePreview, and AdminMutedCell instead of passing raw admin publishing utility classes from feature code.",
  },
  {
    family: "admin-event-supply-shell",
    surfaces: ["admin"],
    sourcePatterns: [
      {
        pattern:
          /["'`][^"'`]*(?<![-\w])(?:admin-panel-actions|event-supply-review-grid|event-supply-detail-stack|event-supply-detail|event-supply-links)(?![-\w])[^"'`]*["'`]/gu,
        description: "raw admin event supply shell class string",
      },
    ],
    jsxPatterns: [
      {
        pattern:
          /\bclassName=\{?["'`][^"'`]*(?<![-\w])(?:admin-panel-actions|event-supply-review-grid|event-supply-detail-stack|event-supply-detail|event-supply-links)(?![-\w])[^"'`]*["'`]\}?/gu,
        description: "raw admin event supply shell class",
      },
    ],
    createElementPattern: null,
    guidance: "Use AdminPanelActions, AdminEventSupplyReviewGrid, AdminEventSupplyDetailStack, AdminEventSupplyDetail, AdminEventSupplyEmptyState, and AdminEventSupplyLinks instead of passing raw admin event supply shell classes from feature code.",
  },
  {
    family: "admin-selected-table-row",
    surfaces: ["admin"],
    sourcePatterns: [
      {
        pattern:
          /["'`][^"'`]*(?<![-\w])selected-row(?![-\w])[^"'`]*["'`]/gu,
        description: "raw admin selected table row class string",
      },
    ],
    jsxPatterns: [
      {
        pattern:
          /\bclassName=\{?["'`][^"'`]*(?<![-\w])selected-row(?![-\w])[^"'`]*["'`]\}?/gu,
        description: "raw admin selected table row class",
      },
    ],
    createElementPattern: null,
    guidance: "Use AdminTableRow selected={...} instead of passing raw selected-row table classes from feature code.",
  },
  {
    family: "admin-marketing-tag-row",
    surfaces: ["admin"],
    sourcePatterns: [
      {
        pattern:
          /["'`][^"'`]*(?<![-\w])marketing-tag-row(?![-\w])[^"'`]*["'`]/gu,
        description: "raw admin marketing tag row class string",
      },
    ],
    jsxPatterns: [
      {
        pattern:
          /\bclassName=\{?["'`][^"'`]*(?<![-\w])marketing-tag-row(?![-\w])[^"'`]*["'`]\}?/gu,
        description: "raw admin marketing tag row class",
      },
    ],
    createElementPattern: null,
    guidance: "Use TagList from AdminPrimitives instead of passing the raw admin marketing-tag-row class from feature code.",
  },
  {
    family: "admin-marketing-query-list",
    surfaces: ["admin"],
    sourcePatterns: [
      {
        pattern:
          /["'`][^"'`]*(?<![-\w])(?:marketing-query-list|marketing-query)(?![-\w])[^"'`]*["'`]/gu,
        description: "raw admin marketing query list class string",
      },
    ],
    jsxPatterns: [
      {
        pattern:
          /\bclassName=\{?["'`][^"'`]*(?<![-\w])(?:marketing-query-list|marketing-query)(?![-\w])[^"'`]*["'`]\}?/gu,
        description: "raw admin marketing query list class",
      },
    ],
    createElementPattern: null,
    guidance: "Use AdminQueryList and AdminQueryRow instead of passing raw admin marketing-query-list/marketing-query classes from feature code.",
  },
  {
    family: "admin-marketing-slide-list",
    surfaces: ["admin"],
    sourcePatterns: [
      {
        pattern:
          /["'`][^"'`]*(?<![-\w])(?:marketing-slide-list|marketing-slide-editor|marketing-slide-editor-topline)(?![-\w])[^"'`]*["'`]/gu,
        description: "raw admin marketing slide editor class string",
      },
    ],
    jsxPatterns: [
      {
        pattern:
          /\bclassName=\{?["'`][^"'`]*(?<![-\w])(?:marketing-slide-list|marketing-slide-editor|marketing-slide-editor-topline)(?![-\w])[^"'`]*["'`]\}?/gu,
        description: "raw admin marketing slide editor class",
      },
    ],
    createElementPattern: null,
    guidance: "Use AdminMarketingSlideList, AdminMarketingSlideEditor, and AdminMarketingSlideEditorTopline instead of passing raw admin marketing-slide editor classes from feature code.",
  },
  {
    family: "admin-marketing-recommendation-list",
    surfaces: ["admin"],
    sourcePatterns: [
      {
        pattern:
          /["'`][^"'`]*(?<![-\w])(?:marketing-recommendation-list|marketing-recommendation-item)(?![-\w])[^"'`]*["'`]/gu,
        description: "raw admin marketing recommendation class string",
      },
    ],
    jsxPatterns: [
      {
        pattern:
          /\bclassName=\{?["'`][^"'`]*(?<![-\w])(?:marketing-recommendation-list|marketing-recommendation-item)(?![-\w])[^"'`]*["'`]\}?/gu,
        description: "raw admin marketing recommendation class",
      },
    ],
    createElementPattern: null,
    guidance: "Use AdminMarketingRecommendationList and AdminMarketingRecommendationItem instead of passing raw admin marketing-recommendation classes from feature code.",
  },
  {
    family: "admin-marketing-audit-list",
    surfaces: ["admin"],
    sourcePatterns: [
      {
        pattern:
          /["'`][^"'`]*(?<![-\w])(?:marketing-audit-list|marketing-audit-row)(?![-\w])[^"'`]*["'`]/gu,
        description: "raw admin marketing audit class string",
      },
    ],
    jsxPatterns: [
      {
        pattern:
          /\bclassName=\{?["'`][^"'`]*(?<![-\w])(?:marketing-audit-list|marketing-audit-row)(?![-\w])[^"'`]*["'`]\}?/gu,
        description: "raw admin marketing audit class",
      },
    ],
    createElementPattern: null,
    guidance: "Use AdminMarketingAuditList and AdminMarketingAuditRow instead of passing raw admin marketing-audit classes from feature code.",
  },
  {
    family: "admin-feature-drop-feature-list",
    surfaces: ["admin"],
    sourcePatterns: [
      {
        pattern:
          /["'`][^"'`]*(?<![-\w])(?:feature-drop-feature-list|feature-drop-feature-editor)(?![-\w])[^"'`]*["'`]/gu,
        description: "raw admin feature-drop feature class string",
      },
    ],
    jsxPatterns: [
      {
        pattern:
          /\bclassName=\{?["'`][^"'`]*(?<![-\w])(?:feature-drop-feature-list|feature-drop-feature-editor)(?![-\w])[^"'`]*["'`]\}?/gu,
        description: "raw admin feature-drop feature class",
      },
    ],
    createElementPattern: null,
    guidance: "Use AdminFeatureDropFeatureList and AdminFeatureDropFeatureEditor instead of passing raw admin feature-drop feature classes from feature code.",
  },
  {
    family: "admin-feature-drop-controls-preview",
    surfaces: ["admin"],
    sourcePatterns: [
      {
        pattern:
          /["'`][^"'`]*(?<![-\w])(?:feature-drop-control-grid|feature-drop-span-2|feature-drop-preview-grid|feature-drop-preview-card)(?![-\w])[^"'`]*["'`]/gu,
        description: "raw admin feature-drop controls/preview class string",
      },
    ],
    jsxPatterns: [
      {
        pattern:
          /\bclassName=\{?["'`][^"'`]*(?<![-\w])(?:feature-drop-control-grid|feature-drop-span-2|feature-drop-preview-grid|feature-drop-preview-card)(?![-\w])[^"'`]*["'`]\}?/gu,
        description: "raw admin feature-drop controls/preview class",
      },
    ],
    createElementPattern: null,
    guidance: "Use AdminFeatureDropControlGrid, AdminFeatureDropWideField, AdminFeatureDropPreviewGrid, and AdminFeatureDropPreviewCard instead of passing raw admin feature-drop controls/preview classes from feature code.",
  },
  {
    family: "admin-marketing-preview-export",
    surfaces: ["admin"],
    sourcePatterns: [
      {
        pattern:
          /["'`][^"'`]*(?<![-\w])(?:marketing-preview-shell|marketing-preview-toolbar|marketing-preview-actions|marketing-export-status)(?![-\w])[^"'`]*["'`]/gu,
        description: "raw admin marketing preview/export class string",
      },
    ],
    jsxPatterns: [
      {
        pattern:
          /\bclassName=\{?["'`][^"'`]*(?<![-\w])(?:marketing-preview-shell|marketing-preview-toolbar|marketing-preview-actions|marketing-export-status)(?![-\w])[^"'`]*["'`]\}?/gu,
        description: "raw admin marketing preview/export class",
      },
    ],
    createElementPattern: null,
    guidance: "Use AdminMarketingPreviewShell, AdminMarketingPreviewToolbar, AdminMarketingPreviewActions, and AdminMarketingExportStatus instead of passing raw admin marketing preview/export classes from feature code.",
  },
  {
    family: "admin-marketing-carousel-preview",
    surfaces: ["admin"],
    sourcePatterns: [
      {
        pattern:
          /["'`][^"'`]*(?<![-\w])(?:marketing-carousel-preview|marketing-preview-slide|marketing-preview-meta|marketing-preview-image|marketing-preview-brand-note|marketing-preview-copy)(?![-\w])[^"'`]*["'`]/gu,
        description: "raw admin marketing carousel preview class string",
      },
    ],
    jsxPatterns: [
      {
        pattern:
          /\bclassName=\{?["'`][^"'`]*(?<![-\w])(?:marketing-carousel-preview|marketing-preview-slide|marketing-preview-meta|marketing-preview-image|marketing-preview-brand-note|marketing-preview-copy)(?![-\w])[^"'`]*["'`]\}?/gu,
        description: "raw admin marketing carousel preview class",
      },
    ],
    createElementPattern: null,
    guidance: "Use AdminMarketingCarouselPreview, AdminMarketingPreviewSlide, AdminMarketingPreviewMeta, AdminMarketingPreviewImage, AdminMarketingPreviewBrandNote, and AdminMarketingPreviewCopy instead of passing raw admin marketing carousel preview classes from feature code.",
  },
  {
    family: "admin-marketing-image-editor",
    surfaces: ["admin"],
    sourcePatterns: [
      {
        pattern:
          /["'`][^"'`]*(?<![-\w])(?:marketing-image-editor|marketing-image-editor-header|marketing-image-controls|marketing-file-button|marketing-image-review-row|marketing-image-thumb|marketing-image-meta-fields|marketing-image-source-note|marketing-image-empty|feature-drop-capture-thumb)(?![-\w])[^"'`]*["'`]/gu,
        description: "raw admin marketing image editor class string",
      },
    ],
    jsxPatterns: [
      {
        pattern:
          /\bclassName=\{?["'`][^"'`]*(?<![-\w])(?:marketing-image-editor|marketing-image-editor-header|marketing-image-controls|marketing-file-button|marketing-image-review-row|marketing-image-thumb|marketing-image-meta-fields|marketing-image-source-note|marketing-image-empty|feature-drop-capture-thumb)(?![-\w])[^"'`]*["'`]\}?/gu,
        description: "raw admin marketing image editor class",
      },
    ],
    createElementPattern: null,
    guidance: "Use AdminMarketingImageEditor, AdminMarketingImageEditorHeader, AdminMarketingImageControls, AdminMarketingFilePickerButton, AdminMarketingImageReviewRow, AdminMarketingImageThumb, AdminFeatureDropCaptureThumb, AdminMarketingImageMetaFields, AdminMarketingImageSourceNote, and AdminMarketingImageEmpty instead of passing raw admin marketing image editor classes from feature code.",
  },
  {
    family: "admin-guardrail-list",
    surfaces: ["admin"],
    sourcePatterns: [
      {
        pattern:
          /["'`][^"'`]*(?<![-\w])guardrail-list(?![-\w])[^"'`]*["'`]/gu,
        description: "raw admin guardrail list class string",
      },
    ],
    jsxPatterns: [
      {
        pattern:
          /\bclassName=\{?["'`][^"'`]*(?<![-\w])guardrail-list(?![-\w])[^"'`]*["'`]\}?/gu,
        description: "raw admin guardrail list class",
      },
    ],
    createElementPattern: null,
    guidance: "Use AdminGuardrailList instead of passing the raw admin guardrail-list class from feature code.",
  },
  {
    family: "admin-intake-source-list",
    surfaces: ["admin"],
    sourcePatterns: [
      {
        pattern:
          /["'`][^"'`]*(?<![-\w])intake-source-list(?![-\w])[^"'`]*["'`]/gu,
        description: "raw admin intake source list class string",
      },
    ],
    jsxPatterns: [
      {
        pattern:
          /\bclassName=\{?["'`][^"'`]*(?<![-\w])intake-source-list(?![-\w])[^"'`]*["'`]\}?/gu,
        description: "raw admin intake source list class",
      },
    ],
    createElementPattern: null,
    guidance: "Use AdminIntakeSourceList instead of passing the raw admin intake-source-list class from feature code.",
  },
  {
    family: "admin-intake-gate-list",
    surfaces: ["admin"],
    sourcePatterns: [
      {
        pattern:
          /["'`][^"'`]*(?<![-\w])(?:intake-gate-list|intake-gate)(?![-\w])[^"'`]*["'`]/gu,
        description: "raw admin intake gate class string",
      },
    ],
    jsxPatterns: [
      {
        pattern:
          /\bclassName=\{?["'`][^"'`]*(?<![-\w])(?:intake-gate-list|intake-gate)(?![-\w])[^"'`]*["'`]\}?/gu,
        description: "raw admin intake gate class",
      },
    ],
    createElementPattern: null,
    guidance: "Use AdminIntakeGateList and AdminIntakeGate instead of passing raw admin intake-gate-list/intake-gate classes from feature code.",
  },
  {
    family: "admin-intake-decision-shell",
    surfaces: ["admin"],
    sourcePatterns: [
      {
        pattern:
          /["'`][^"'`]*(?<![-\w])(?:intake-decision-actions|intake-decision-state|intake-decision-box|marketing-decision-footer)(?![-\w])[^"'`]*["'`]/gu,
        description: "raw admin intake decision shell class string",
      },
    ],
    jsxPatterns: [
      {
        pattern:
          /\bclassName=\{?["'`][^"'`]*(?<![-\w])(?:intake-decision-actions|intake-decision-state|intake-decision-box|marketing-decision-footer)(?![-\w])[^"'`]*["'`]\}?/gu,
        description: "raw admin intake decision shell class",
      },
    ],
    createElementPattern: null,
    guidance: "Use DecisionFooter, AdminDecisionFooterShell, AdminIntakeDecisionActions, AdminIntakeDecisionState, and AdminIntakeDecisionBox instead of passing raw admin intake decision classes from feature code.",
  },
  {
    family: "admin-intake-workspace-shell",
    surfaces: ["admin"],
    sourcePatterns: [
      {
        pattern:
          /["'`][^"'`]*(?<![-\w])(?:intake-workspace-header|intake-workspace-tabs|intake-event-workspace|intake-layout)(?![-\w])[^"'`]*["'`]/gu,
        description: "raw admin intake workspace shell class string",
      },
    ],
    jsxPatterns: [
      {
        pattern:
          /\bclassName=\{?["'`][^"'`]*(?<![-\w])(?:intake-workspace-header|intake-workspace-tabs|intake-event-workspace|intake-layout)(?![-\w])[^"'`]*["'`]\}?/gu,
        description: "raw admin intake workspace shell class",
      },
    ],
    createElementPattern: null,
    guidance: "Use AdminIntakeWorkspaceHeader, AdminIntakeWorkspaceTabs, AdminIntakeLayout, and AdminIntakeEventWorkspaceShell instead of passing raw admin intake workspace shell classes from feature code.",
  },
  {
    family: "admin-organizer-intake-curation-shell",
    surfaces: ["admin"],
    sourcePatterns: [
      {
        pattern:
          /["'`][^"'`]*(?<![-\w])(?:curation-panel|intake-list|policy-gap-columns|location-resolution-form|intake-card|intake-card-header|intake-badges|intake-surface-grid|surface-list|surface-row|intake-checkbox-row|curation-control|curation-control-grid)(?![-\w])[^"'`]*["'`]/gu,
        description: "raw admin organizer intake curation shell class string",
      },
    ],
    jsxPatterns: [
      {
        pattern:
          /\bclassName=\{?["'`][^"'`]*(?<![-\w])(?:curation-panel|intake-list|policy-gap-columns|location-resolution-form|intake-card|intake-card-header|intake-badges|intake-surface-grid|surface-list|surface-row|intake-checkbox-row|curation-control|curation-control-grid)(?![-\w])[^"'`]*["'`]\}?/gu,
        description: "raw admin organizer intake curation shell class",
      },
    ],
    createElementPattern: null,
    guidance: "Use AdminOrganizerIntakeCurationPanel, AdminOrganizerIntakeList, AdminOrganizerIntakeCard, AdminOrganizerIntakeCardHeader, AdminOrganizerIntakeBadges, AdminOrganizerPolicyGapColumns, AdminOrganizerLocationResolutionForm, AdminOrganizerIntakeSurfaceGrid, AdminOrganizerSurfaceList, AdminOrganizerSurfaceRow, AdminOrganizerIntakeCheckboxField, AdminOrganizerCurationControlSection, and AdminOrganizerCurationControlGrid instead of passing raw organizer intake curation classes from feature code.",
  },
  {
    family: "admin-overview-queue-shell",
    surfaces: ["admin"],
    sourcePatterns: [
      {
        pattern:
          /["'`][^"'`]*(?<![-\w])(?:queue-list|queue-heading|queue-items|queue-row|queue-row-actions|queue-decision-button|queue-detail-panel)(?![-\w])[^"'`]*["'`]/gu,
        description: "raw admin overview queue shell class string",
      },
    ],
    jsxPatterns: [
      {
        pattern:
          /\bclassName=\{?["'`][^"'`]*(?<![-\w])(?:queue-list|queue-heading|queue-items|queue-row|queue-row-actions|queue-decision-button|queue-detail-panel)(?![-\w])[^"'`]*["'`]\}?/gu,
        description: "raw admin overview queue shell class",
      },
    ],
    createElementPattern: null,
    guidance: "Use AdminOverviewQueueList, AdminOverviewQueueHeading, AdminOverviewQueueItems, AdminOverviewQueueRow, AdminOverviewQueueRowActions, AdminOverviewQueueDecisionButton, and AdminOverviewQueueDetailPanel instead of passing raw admin overview queue shell classes from feature code.",
  },
  {
    family: "admin-overview-analytics-shell",
    surfaces: ["admin"],
    jsxPatterns: [
      {
        pattern:
          /\bclassName=\{?["'`][^"'`]*(?<![-\w])(?:analytics-clear|main-grid|queue-columns|empty-panel|line-chart|line-area|line-stroke|chart-labels|bar-chart|bar-column|bar|signals|signal-row|signal-track|signal-fill)(?![-\w])[^"'`]*["'`]\}?/gu,
        description: "raw admin overview layout, chart, or signal shell class",
      },
    ],
    createElementPattern: null,
    guidance: "Use AdminOverviewMainGrid, AdminOverviewQueueColumns, AdminOverviewAnalyticsClearButton, AdminOverviewLineChart, AdminOverviewBarChart, and AdminOverviewValueSignals instead of passing raw admin overview layout, chart, or signal classes from feature code.",
  },
  {
    family: "field-layout",
    jsxPatterns: [
      {
        pattern:
          /<div\b[^>]*\bclassName=\{?["'`][^"'`]*\b(?:flow-field-grid|form-grid)\b[^"'`]*["'`]\}?/gu,
        description: "raw field layout grid",
      },
    ],
    createElementPattern: null,
    guidance: "Use the surface FieldGrid/AdminFieldGrid primitive instead of rendering a field layout grid directly.",
  },
  {
    family: "website-operational-step-rail",
    surfaces: ["website"],
    jsxPatterns: [
      {
        pattern:
          /\bclassName=\{?["'`][^"'`]*\boperational-step-rail\b[^"'`]*["'`]\}?/gu,
        description: "raw website operational step rail class",
      },
    ],
    createElementPattern: null,
    guidance: "Use StepRail instead of rendering website operational step rail shells directly.",
  },
  {
    family: "website-choice-controls",
    surfaces: ["website"],
    jsxPatterns: [
      {
        pattern:
          /\bclassName=\{?["'`][^"'`]*\b(?:choice-chip|choice-chip-grid|choice-card)\b[^"'`]*["'`]\}?/gu,
        description: "raw website choice control shell class",
      },
    ],
    createElementPattern: null,
    guidance: "Use ChoiceChip, ChoiceChipGrid, and ChoiceCard instead of rendering website choice-control shells directly.",
  },
  {
    family: "admin-summary-metrics",
    surfaces: ["admin"],
    jsxPatterns: [
      {
        pattern:
          /<(?:section|div)\b[^>]*\bclassName=\{?["'`][^"'`]*\bmetric-grid\b[^"'`]*["'`]\}?/gu,
        description: "raw admin metric grid",
      },
      {
        pattern:
          /<(?:article|div|section|span)\b[^>]*\bclassName=\{?["'`][^"'`]*\b(?:metric-card|metric-tile|metric-value)\b[^"'`]*["'`]\}?/gu,
        description: "raw admin metric card",
      },
    ],
    createElementPattern: null,
    guidance: "Use AdminMetricGrid and AdminMetricCard instead of rendering admin metric summary shells directly.",
  },
  {
    family: "admin-workbench-toolbar",
    surfaces: ["admin"],
    jsxPatterns: [
      {
        pattern:
          /<div\b[^>]*\bclassName=\{?["'`][^"'`]*\bworkbench-toolbar\b[^"'`]*["'`]\}?/gu,
        description: "raw admin workbench toolbar",
      },
      {
        pattern:
          /<AdminToolbar\b[^>]*\bclassName=\{?["'`][^"'`]*\bcompact\b[^"'`]*["'`]\}?/gu,
        description: "raw admin toolbar compact modifier",
      },
    ],
    createElementPattern: null,
    guidance: "Use AdminToolbar and its typed props such as compact instead of rendering admin workbench toolbar shells or class modifiers directly.",
  },
  {
    family: "admin-workbench-layout",
    surfaces: ["admin"],
    sourcePatterns: [
      {
        pattern:
          /["'`][^"'`]*(?<![-\w])(?:admin-directory-screen|admin-detail-screen)(?![-\w])[^"'`]*["'`]/gu,
        description: "raw admin directory/detail screen class string",
      },
    ],
    jsxPatterns: [
      {
        pattern:
          /\bclassName=\{?["'`][^"'`]*(?<![-\w])(?:admin-directory-screen|admin-detail-screen)(?![-\w])[^"'`]*["'`]\}?/gu,
        description: "raw admin directory/detail screen class",
      },
      {
        pattern:
          /<div\b[^>]*\bclassName=\{?["'`][^"'`]*\bworkbench-stack\b[^"'`]*["'`]\}?/gu,
        description: "raw admin workbench stack",
      },
      {
        pattern:
          /<(?:div|section)\b[^>]*\bclassName=\{?["'`][^"'`]*\bpublishing-editor-grid\b[^"'`]*["'`]\}?/gu,
        description: "raw admin editor grid",
      },
      {
        pattern:
          /<(?:article|section|div)\b[^>]*\bclassName=\{?["'`][^"'`]*\bpublishing-editor-panel\b[^"'`]*["'`]\}?/gu,
        description: "raw admin editor panel",
      },
    ],
    createElementPattern: null,
    guidance: "Use AdminDirectoryScreenStack, AdminDetailScreenStack, AdminWorkbenchStack, AdminEditorGrid, and AdminEditorPanel instead of rendering or class-configuring admin workbench/editor layout shells directly.",
  },
  {
    family: "admin-utility-shell",
    surfaces: ["admin"],
    sourcePatterns: [
      {
        pattern:
          /["'`][^"'`]*(?<![-\w])(?:workbench-note|checklist-stack)(?![-\w])[^"'`]*["'`]/gu,
        description: "raw admin utility shell class string",
      },
    ],
    jsxPatterns: [
      {
        pattern:
          /<p\b[^>]*\bclassName=\{?["'`][^"'`]*(?<![-\w])workbench-note(?![-\w])[^"'`]*["'`]\}?/gu,
        description: "raw admin workbench note",
      },
      {
        pattern:
          /<div\b[^>]*\bclassName=\{?["'`][^"'`]*(?<![-\w])checklist-stack(?![-\w])[^"'`]*["'`]\}?/gu,
        description: "raw admin checklist stack",
      },
    ],
    createElementPattern: null,
    guidance: "Use AdminWorkbenchNote and AdminChecklistStack instead of rendering admin utility shells directly.",
  },
  {
    family: "admin-command-list",
    surfaces: ["admin"],
    jsxPatterns: [
      {
        pattern:
          /<div\b[^>]*\bclassName=\{?["'`][^"'`]*\bcommand-stack\b[^"'`]*["'`]\}?/gu,
        description: "raw admin command stack",
      },
      {
        pattern:
          /<div\b[^>]*\bclassName=\{?["'`][^"'`]*\bcommand-row\b[^"'`]*["'`]\}?/gu,
        description: "raw admin command row",
      },
    ],
    createElementPattern: null,
    guidance: "Use AdminCommandStack and AdminCommandRow instead of rendering admin command-list shells directly.",
  },
  {
    family: "admin-intake-tag-list",
    surfaces: ["admin"],
    sourcePatterns: [
      {
        pattern: /["'`][^"'`]*\b(?:intake-tags|intake-tag)\b[^"'`]*["'`]/gu,
        description: "raw admin intake tag class string",
      },
    ],
    jsxPatterns: [
      {
        pattern:
          /<div\b[^>]*\bclassName=\{?["'`][^"'`]*\bintake-tags\b[^"'`]*["'`]\}?/gu,
        description: "raw admin intake tag list",
      },
      {
        pattern:
          /<span\b[^>]*\bclassName=\{?["'`][^"'`]*\bintake-tag\b[^"'`]*["'`]\}?/gu,
        description: "raw admin intake tag",
      },
    ],
    createElementPattern: null,
    guidance: "Use AdminTagList and AdminTag instead of rendering admin intake tag-list shells directly.",
  },
  {
    family: "admin-intake-section-shell",
    surfaces: ["admin"],
    sourcePatterns: [
      {
        pattern:
          /["'`][^"'`]*\b(?:intake-section|intake-section-title|search-candidate-panel|search-candidate-list|search-candidate-card|search-candidate-header|search-candidate-snippet|search-candidate-actions)\b[^"'`]*["'`]/gu,
        description: "raw admin intake/search-candidate shell class string",
      },
    ],
    jsxPatterns: [
      {
        pattern:
          /<div\b[^>]*\bclassName=\{?["'`][^"'`]*\bintake-section\b[^"'`]*["'`]\}?/gu,
        description: "raw admin intake section",
      },
      {
        pattern:
          /<div\b[^>]*\bclassName=\{?["'`][^"'`]*\bintake-section-title\b[^"'`]*["'`]\}?/gu,
        description: "raw admin intake section title",
      },
      {
        pattern:
          /<div\b[^>]*\bclassName=\{?["'`][^"'`]*\bsearch-candidate-panel\b[^"'`]*["'`]\}?/gu,
        description: "raw admin search candidate panel",
      },
      {
        pattern:
          /<div\b[^>]*\bclassName=\{?["'`][^"'`]*\bsearch-candidate-list\b[^"'`]*["'`]\}?/gu,
        description: "raw admin search candidate list",
      },
      {
        pattern:
          /<article\b[^>]*\bclassName=\{?["'`][^"'`]*\bsearch-candidate-card\b[^"'`]*["'`]\}?/gu,
        description: "raw admin search candidate card",
      },
      {
        pattern:
          /<header\b[^>]*\bclassName=\{?["'`][^"'`]*\bsearch-candidate-header\b[^"'`]*["'`]\}?/gu,
        description: "raw admin search candidate header",
      },
      {
        pattern:
          /<p\b[^>]*\bclassName=\{?["'`][^"'`]*\bsearch-candidate-snippet\b[^"'`]*["'`]\}?/gu,
        description: "raw admin search candidate snippet",
      },
      {
        pattern:
          /<div\b[^>]*\bclassName=\{?["'`][^"'`]*\bsearch-candidate-actions\b[^"'`]*["'`]\}?/gu,
        description: "raw admin search candidate actions",
      },
    ],
    createElementPattern: null,
    guidance: "Use AdminIntakeSection, AdminIntakeSectionTitle, and AdminSearchCandidate* primitives instead of rendering admin intake/search-candidate shells directly.",
  },
  {
    family: "admin-row-tag-shell",
    surfaces: ["admin"],
    sourcePatterns: [
      {
        pattern:
          /["'`][^"'`]*(?<![-\w])(?:row-title|tag-row)(?![-\w])[^"'`]*["'`]/gu,
        description: "raw admin row title or tag row class string",
      },
    ],
    jsxPatterns: [
      {
        pattern:
          /<div\b[^>]*\bclassName=\{?["'`][^"'`]*(?<![-\w])row-title(?![-\w])[^"'`]*["'`]\}?/gu,
        description: "raw admin row title shell",
      },
      {
        pattern:
          /<(?:div|span)\b[^>]*\bclassName=\{?["'`][^"'`]*(?<![-\w])tag-row(?![-\w])[^"'`]*["'`]\}?/gu,
        description: "raw admin tag row shell",
      },
    ],
    createElementPattern: null,
    guidance: "Use AdminRowTitle and AdminTagRow instead of rendering admin row title or tag-row shells directly.",
  },
  {
    family: "admin-roadmap-list",
    surfaces: ["admin"],
    sourcePatterns: [
      {
        pattern:
          /["'`][^"'`]*(?<![-\w])(?:roadmap-list|roadmap-list-item)(?![-\w])[^"'`]*["'`]/gu,
        description: "raw admin roadmap list class string",
      },
    ],
    jsxPatterns: [
      {
        pattern:
          /<div\b[^>]*\bclassName=\{?["'`][^"'`]*(?<![-\w])roadmap-list(?![-\w])[^"'`]*["'`]\}?/gu,
        description: "raw admin roadmap list",
      },
      {
        pattern:
          /<div\b[^>]*\bclassName=\{?["'`][^"'`]*(?<![-\w])roadmap-list-item(?![-\w])[^"'`]*["'`]\}?/gu,
        description: "raw admin roadmap list item",
      },
    ],
    createElementPattern: null,
    guidance: "Use AdminRoadmapList and AdminRoadmapListItem instead of rendering admin roadmap-list shells directly.",
  },
  {
    family: "admin-status-display",
    surfaces: ["admin"],
    jsxPatterns: [
      {
        pattern:
          /<div\b[^>]*\bclassName=\{?["'`][^"'`]*\badmin-status-grid\b[^"'`]*["'`]\}?/gu,
        description: "raw admin status grid",
      },
      {
        pattern:
          /<div\b[^>]*\bclassName=\{?["'`][^"'`]*\bstate-row\b[^"'`]*["'`]\}?/gu,
        description: "raw admin state row",
      },
    ],
    createElementPattern: null,
    guidance: "Use AdminStatusGrid and StateRow/AdminStateRow instead of rendering admin status-display shells directly.",
  },
  {
    family: "admin-app-shell-status",
    surfaces: ["admin"],
    jsxPatterns: [
      {
        pattern:
          /<span\b[^>]*\bclassName=\{?["'`][^"'`]*\b(?:admin-env-status|admin-auth-status)\b[^"'`]*["'`]\}?/gu,
        description: "raw admin app-shell status shell",
      },
      {
        pattern: /function\s+(?:FeatureLoadingState|AdminAuthStatus)\b/gu,
        description: "local admin app-shell status component",
      },
    ],
    createElementPattern: null,
    guidance: "Use AdminEnvironmentStatus, AdminAuthStatus, and AdminFeatureLoadingState instead of local admin app-shell status/loading shells.",
  },
  {
    family: "admin-loading-icon",
    surfaces: ["admin"],
    jsxPatterns: [
      {
        pattern:
          /\bclassName=\{?["'`][^"'`]*(?<![-\w])spin(?![-\w])[^"'`]*["'`]\}?/gu,
        description: "raw admin spin class",
      },
      {
        pattern:
          /\bclassName=\{[^}]*["'`]spin["'`][^}]*\}/gu,
        description: "conditional raw admin spin class",
      },
    ],
    createElementPattern: null,
    guidance: "Use AdminLoadingIcon or AdminFeatureLoadingState instead of passing the raw spin animation class from app or feature code.",
  },
  {
    family: "admin-app-auth-shell",
    surfaces: ["admin"],
    jsxPatterns: [
      {
        pattern:
          /\bclassName=\{?["'`][^"'`]*(?<![-\w])(?:app-shell|sidebar|brand-block|brand-mark|brand-copy|brand-title|brand-subtitle|nav-list|sidebar-footer|workspace|topbar|topbar-actions|signin-screen|signin-panel|signin-meta|signin-actions)(?![-\w])[^"'`]*["'`]\}?/gu,
        description: "raw admin app/auth shell class",
      },
    ],
    createElementPattern: null,
    guidance: "Use AdminAppShell, AdminSidebar, AdminBrand*, AdminNavList, AdminSidebarFooter, AdminWorkspace, AdminTopbar, AdminTopbarActions, and AdminSignIn* primitives instead of passing raw admin app/auth shell classes from app or feature code.",
  },
  {
    family: "admin-intake-status-chip",
    surfaces: ["admin"],
    jsxPatterns: [
      {
        pattern:
          /<span\b[^>]*\bclassName=\{?["'`][^"'`]*\bintake-badge\b[^"'`]*["'`]\}?/gu,
        description: "raw admin intake/status badge shell",
      },
    ],
    createElementPattern: null,
    guidance: "Use StatusChip instead of rendering admin intake/status badge shells directly.",
  },
  {
    family: "admin-quality-row",
    surfaces: ["admin"],
    jsxPatterns: [
      {
        pattern:
          /<div\b[^>]*\bclassName=\{?["'`][^"'`]*\bquality-row\b[^"'`]*["'`]\}?/gu,
        description: "raw admin quality-row shell",
      },
    ],
    createElementPattern: null,
    guidance: "Use QualityRow or AlertRow instead of rendering admin quality-row shells directly.",
  },
  {
    family: "admin-quality-list",
    surfaces: ["admin"],
    jsxPatterns: [
      {
        pattern:
          /<div\b[^>]*\bclassName=\{?["'`][^"'`]*\bquality-list\b[^"'`]*["'`]\}?/gu,
        description: "raw admin quality-list shell",
      },
    ],
    createElementPattern: null,
    guidance: "Use QualityList instead of rendering admin quality-list containers directly.",
  },
  {
    family: "admin-filter-bar",
    surfaces: ["admin"],
    jsxPatterns: [
      {
        pattern:
          /<section\b[^>]*\bclassName=\{?["'`][^"'`]*\banalytics-controls\b[^"'`]*["'`]\}?/gu,
        description: "raw admin filter bar",
      },
    ],
    createElementPattern: null,
    guidance: "Use AdminFilterBar instead of rendering admin analytics/filter bar shells directly.",
  },
  {
    family: "admin-empty-state",
    surfaces: ["admin"],
    sourcePatterns: [
      {
        pattern:
          /["'`][^"'`]*(?<![-\w])(?:empty-row|workbench-empty|empty-editor|marketing-empty-state)(?![-\w])[^"'`]*["'`]/gu,
        description: "raw admin empty-state class string",
      },
    ],
    jsxPatterns: [
      {
        pattern:
          /<div\b[^>]*\bclassName=\{?["'`][^"'`]*(?<![-\w])(?:empty-row|workbench-empty|empty-editor|marketing-empty-state)(?![-\w])[^"'`]*["'`]\}?/gu,
        description: "raw admin empty-state shell",
      },
    ],
    createElementPattern: null,
    guidance: "Use EmptyState with the row/workbench/editor/marketing variant instead of rendering or class-configuring admin empty-state shells directly.",
  },
  {
    family: "website-organizer-filter-rail",
    surfaces: ["website"],
    jsxPatterns: [
      {
        pattern:
          /<div\b[^>]*\bclassName=\{?["'`][^"'`]*\borganizer-filter-rail\b[^"'`]*["'`]\}?/gu,
        description: "raw website organizer filter rail",
      },
    ],
    createElementPattern: null,
    guidance: "Use FilterRail instead of rendering website organizer filter rail shells directly.",
  },
  {
    family: "website-stat-strip",
    surfaces: ["website"],
    jsxPatterns: [
      {
        pattern:
          /<div\b[^>]*\bclassName=\{?["'`][^"'`]*\b(?:event-action-card__counts|owner-response-prompt__stats|organizer-search-stats|directory-claim-pressure__stats|listing-panel__metrics)\b[^"'`]*["'`]\}?/gu,
        description: "raw website stat/metric strip",
      },
    ],
    createElementPattern: null,
    guidance: "Use StatStrip instead of rendering website stat or metric strips directly.",
  },
  {
    family: "website-chip-rail",
    surfaces: ["website"],
    jsxPatterns: [
      {
        pattern:
          /<div\b[^>]*\bclassName=\{?["'`][^"'`]*\b(?:host-preview-format-rail|host-preview-chip-row|host-create-flow__chips|product-board__nav)\b[^"'`]*["'`]\}?/gu,
        description: "raw website chip rail",
      },
    ],
    createElementPattern: null,
    guidance: "Use ChipRail instead of rendering website chip/label rail shells directly.",
  },
  {
    family: "website-capture-grid",
    surfaces: ["website"],
    jsxPatterns: [
      {
        pattern:
          /<[^>\s]+\b[^>]*\bclassName=\{?["'`][^"'`]*\b(?:capture-grid|capture-grid--host|capture-card)\b[^"'`]*["'`]\}?/gu,
        description: "raw website capture shell",
      },
    ],
    createElementPattern: null,
    guidance: "Use CaptureGrid, CaptureCard, and their variants instead of rendering website capture shells directly.",
  },
  {
    family: "website-card-grid",
    surfaces: ["website"],
    jsxPatterns: [
      {
        pattern:
          /<div\b[^>]*\bclassName=\{?["'`][^"'`]*\b(?:featured-organizers__grid|listing-grid)\b[^"'`]*["'`]\}?/gu,
        description: "raw website card grid",
      },
    ],
    createElementPattern: null,
    guidance: "Use CardGrid instead of rendering website card grid shells directly.",
  },
  {
    family: "website-empty-state",
    surfaces: ["website"],
    jsxPatterns: [
      {
        pattern:
          /\bclassName=\{?["'`][^"'`]*\b(?:review-signal-lane__empty|public-event-empty|claim-empty-state|listing-review-empty|empty-results)\b[^"'`]*["'`]\}?/gu,
        description: "raw website empty-state variant shell",
      },
    ],
    createElementPattern: null,
    guidance: "Use EmptyState variants instead of rendering or class-configuring website empty-state shells directly.",
  },
  {
    family: "website-status-display",
    surfaces: ["website"],
    jsxPatterns: [
      {
        pattern:
          /<p\b[^>]*\bclassName=\{?["'`][^"'`]*\blisting-share-status\b[^"'`]*["'`]\}?/gu,
        description: "raw website live-status shell",
      },
      {
        pattern:
          /<div\b[^>]*\bclassName=\{?["'`][^"'`]*\broute-loading\b[^"'`]*["'`]\}?/gu,
        description: "raw website route-loading shell",
      },
    ],
    createElementPattern: null,
    guidance: "Use LiveStatus and RouteLoadingState instead of rendering website status/loading shells directly.",
  },
  {
    family: "website-app-download-shell",
    surfaces: ["website"],
    filePathPatterns: [
      {
        pattern: /^website\/src\/features\/marketing\/AppDownloadCtas\.tsx$/u,
        description: "legacy website AppDownloadCtas feature component",
      },
    ],
    sourcePatterns: [
      {
        pattern: /(?:from\s+|import\s*\(\s*)["'][^"']*marketing\/AppDownloadCtas["']/gu,
        description: "legacy website AppDownloadCtas import",
      },
      {
        pattern: /\bfunction\s+AppDownloadCtas\b/gu,
        description: "local website AppDownloadCtas component",
      },
    ],
    jsxPatterns: [
      {
        pattern:
          /<[^>\s]+\b[^>]*\bclassName=\{?["'`][^"'`]*\b(?:app-download-ctas|app-download-ctas--compact|app-download-ctas--panel|app-download-ctas__buttons|app-download-ctas__status|store-button|store-button__mark|store-button__kicker)\b[^"'`]*["'`]\}?/gu,
        description: "raw website app-download CTA shell",
      },
    ],
    createElementPattern: null,
    guidance: "App-download CTAs and store buttons were retired in CAT-218 (record in CAT-224). Rebuild store links on @catch/web-ui components instead of reviving raw app-download or store-button classes.",
  },
  {
    family: "website-badge-status",
    surfaces: ["website"],
    jsxPatterns: [
      {
        pattern:
          /<span\b[^>]*\bclassName=\{?["'`][^"'`]*\b(?:status-badge|review-signal-badge)\b[^"'`]*["'`]\}?/gu,
        description: "raw website status badge shell",
      },
      {
        pattern:
          /<div\b[^>]*\bclassName=\{?["'`][^"'`]*\blisting-badge-row\b[^"'`]*["'`]\}?/gu,
        description: "raw website listing badge row",
      },
    ],
    createElementPattern: null,
    guidance: "Use StatusBadge, ReviewSignalBadge, and BadgeRow instead of rendering website badge/status shells directly.",
  },
  {
    family: "website-identity-display-shell",
    surfaces: ["website"],
    jsxPatterns: [
      {
        pattern:
          /<[^>\s]+\b[^>]*\bclassName=\{?["'`][^"'`]*\b(?:activity-mark|activity-mark--sm|activity-mark--md|activity-mark--lg|profile-strength)\b[^"'`]*["'`]\}?/gu,
        description: "raw website identity display shell",
      },
    ],
    createElementPattern: null,
    guidance: "Use ActivityMark and ProfileStrength instead of rendering website identity display shells directly.",
  },
  {
    family: "website-process-status-panel",
    surfaces: ["website"],
    jsxPatterns: [
      {
        pattern:
          /<[^>\s]+\b[^>]*\bclassName=\{?["'`][^"'`]*\b(?:process-status-panel|process-status-panel__card|process-status-panel__mark|process-status-panel__grid|process-status-panel__actions)\b[^"'`]*["'`]\}?/gu,
        description: "raw website process status panel shell",
      },
    ],
    createElementPattern: null,
    guidance: "Use ProcessStatusPanel instead of rendering website process status panel shells directly.",
  },
  {
    family: "website-ui-label-shell",
    surfaces: ["website"],
    jsxPatterns: [
      {
        pattern:
          /<span\b[^>]*\bclassName=\{?["'`][^"'`]*\bui-label\b[^"'`]*["'`]\}?/gu,
        description: "raw website UI label shell",
      },
    ],
    createElementPattern: null,
    guidance: "Use UiLabel instead of rendering website ui-label spans directly.",
  },
  {
    family: "website-search-form",
    surfaces: ["website"],
    jsxPatterns: [
      {
        pattern:
          /<[^>\s]+\b[^>]*\bclassName=\{?["'`][^"'`]*\b(?:public-search|organizer-search-form)\b[^"'`]*["'`]\}?/gu,
        description: "raw website search-form shell",
      },
      {
        pattern:
          /<[^>\s]+\b[^>]*\bclassName=\{?["'`][^"'`]*\bpublic-search__(?:city|input|go|results|glyph)\b[^"'`]*["'`]\}?/gu,
        description: "raw public search slot",
      },
      {
        pattern:
          /<PublicSearch(?:CityButton|InputField|SubmitButton|ResultsPanel|ResultGlyph)\b/gu,
        description: "direct public search slot composition",
      },
      {
        pattern:
          /<[^>\s]+\b[^>]*\bclassName=\{?["'`][^"'`]*\b(?:public-event-card|public-event-card__art|public-event-card__body|public-event-card__meta|public-event-card__facts)\b[^"'`]*["'`]\}?/gu,
        description: "raw public event-card shell",
      },
    ],
    createElementPattern: null,
    guidance: "Use SearchFormShell for the organizer search form. The public search bar and PublicEventCard were retired in CAT-218 (record in CAT-224); rebuild discovery on @catch/web-ui instead of raw public-search or public-event-card shells.",
  },
  {
    family: "website-section-heading",
    surfaces: ["website"],
    jsxPatterns: [
      {
        pattern:
          /<div\b[^>]*\bclassName=\{?["'`][^"'`]*\bsection-heading\b[^"'`]*["'`]\}?/gu,
        description: "raw website section heading shell",
      },
    ],
    createElementPattern: null,
    guidance: "The section-heading shell and SectionHeader are retired; build section headings from @catch/web-ui parts such as CatchText inside the section.",
  },
  {
    family: "website-action-group",
    surfaces: ["website"],
    jsxPatterns: [
      {
        pattern:
          /<div\b[^>]*\bclassName=\{?["'`][^"'`]*\b(?:flow-actions|hero__actions|host-create-flow__actions)\b[^"'`]*["'`]\}?/gu,
        description: "raw website action group shell",
      },
    ],
    createElementPattern: null,
    guidance: "Use ActionGroup instead of rendering website action group shells directly.",
  },
  {
    family: "website-control-row",
    surfaces: ["website"],
    jsxPatterns: [
      {
        pattern:
          /<div\b[^>]*\bclassName=\{?["'`][^"'`]*\bcontrol-row\b[^"'`]*["'`]\}?/gu,
        description: "raw website control row shell",
      },
    ],
    createElementPattern: null,
    guidance: "Use ControlRow instead of rendering website control row shells directly.",
  },
  {
    family: "website-waitlist-section",
    surfaces: ["website"],
    jsxPatterns: [
      {
        pattern:
          /<section\b[^>]*\bclassName=\{?["'`][^"'`]*\bwaitlist-section\b[^"'`]*["'`]\}?/gu,
        description: "raw website waitlist section shell",
      },
      {
        pattern:
          /<div\b[^>]*\bclassName=\{?["'`][^"'`]*\bwaitlist__intro\b[^"'`]*["'`]\}?/gu,
        description: "raw website waitlist intro shell",
      },
    ],
    createElementPattern: null,
    guidance: "Use WaitlistSection instead of rendering website waitlist section shells directly.",
  },
  {
    family: "website-waitlist-form-shell",
    surfaces: ["website"],
    jsxPatterns: [
      {
        pattern:
          /\bclassName=\{?["'`][^"'`]*\bwaitlist-form\b[^"'`]*["'`]\}?/gu,
        description: "raw website waitlist form shell",
      },
    ],
    createElementPattern: null,
    guidance: "Use WaitlistFormShell instead of passing waitlist-form through a generic Form primitive.",
  },
  {
    family: "website-success-grid",
    surfaces: ["website"],
    jsxPatterns: [
      {
        pattern:
          /<div\b[^>]*\bclassName=\{?["'`][^"'`]*\b(?:event-success-module-grid|listing-success-grid)\b[^"'`]*["'`]\}?/gu,
        description: "raw website Event Success grid shell",
      },
      {
        pattern: /<SuccessGrid\b/gu,
        description: "direct website SuccessGrid composition",
      },
    ],
    createElementPattern: null,
    guidance: "Use EventSuccessModuleGrid or ListingSuccessMetricGrid instead of composing website Event Success grid shells directly.",
  },
  {
    family: "website-claim-shell",
    surfaces: ["website"],
    jsxPatterns: [
      {
        pattern:
          /<section\b[^>]*\bclassName=\{?["'`][^"'`]*\bclaim-band\b[^"'`]*["'`]\}?/gu,
        description: "raw website claim-band section shell",
      },
      {
        pattern:
          /<div\b[^>]*\bclassName=\{?["'`][^"'`]*\b(?:claim-band__grid|claim-band__rail|claim-request-panel|claim-request-panel__heading)\b[^"'`]*["'`]\}?/gu,
        description: "raw website claim shell",
      },
    ],
    createElementPattern: null,
    guidance: "Use ClaimBandSection, ClaimBandGrid, ClaimBandRail, ClaimRequestPanel, and ClaimRequestPanelHeading instead of rendering website claim shells directly.",
  },
  {
    family: "website-content-grid",
    surfaces: ["website"],
    jsxPatterns: [
      {
        pattern:
          /<div\b[^>]*\bclassName=\{?["'`][^"'`]*\b(?:claim-review-grid|format-grid|listing-catch-event-grid|public-event-grid|surface-grid|trust-grid)\b[^"'`]*["'`]\}?/gu,
        description: "raw website content grid shell",
      },
    ],
    createElementPattern: null,
    guidance: "Use ContentGrid instead of rendering website content grid shells directly.",
  },
  {
    family: "website-panel-shell",
    surfaces: ["website"],
    jsxPatterns: [
      {
        pattern:
          /<(?:aside|div)\b[^>]*\bclassName=\{?["'`][^"'`]*\b(?:claim-unlocks|event-ticket|hero-panel|listing-panel)\b[^"'`]*["'`]\}?/gu,
        description: "raw website panel shell",
      },
      {
        pattern:
          /<(?:div|span)\b[^>]*\bclassName=\{?["'`][^"'`]*\bevent-ticket__(?:meta|status)\b[^"'`]*["'`]\}?/gu,
        description: "raw website event-ticket slot",
      },
    ],
    createElementPattern: null,
    guidance: "Use PanelShell, EventTicketStatus, and EventTicketMeta instead of rendering website panel shells directly.",
  },
  {
    family: "website-product-shell",
    surfaces: ["website"],
    jsxPatterns: [
      {
        pattern:
          /<[^>\s]+\b[^>]*\bclassName=\{?["'`][^"'`]*\b(?:host-console|host-console__top|host-console__grid|host-console__timeline|module-stack|product-module-grid|product-module-card|product-board|product-board__nav|product-board__main|product-board__dark)\b[^"'`]*["'`]\}?/gu,
        description: "raw website product shell",
      },
      {
        pattern:
          /<[^>\s]+\b[^>]*\bclassName=\{?["'`][^"'`]*\b(?:host-create-flow__mock|mock-window__bar|host-create-flow__progress|host-create-flow__fields)\b[^"'`]*["'`]\}?/gu,
        description: "raw website host-create mock shell",
      },
    ],
    createElementPattern: null,
    guidance: "Use ProductShell, ProductModuleGrid, ProductBoard*, HostConsole*, ModuleStack, HostCreateMockBar, and HostCreateFieldGrid instead of rendering website product shells directly.",
  },
  {
    family: "website-row-shell",
    surfaces: ["website"],
    jsxPatterns: [
      {
        pattern:
          /<(?:div|section)\b[^>]*\bclassName=\{?["'`][^"'`]*\b(?:evidence-strip|featured-organizers__cta|proof-ledger__rows)\b[^"'`]*["'`]\}?/gu,
        description: "raw website row/list shell",
      },
    ],
    createElementPattern: null,
    guidance: "Use EvidenceStrip, FeaturedOrganizersCta, and ProofLedgerRows instead of rendering website row/list shells directly.",
  },
  {
    family: "website-host-preview-shell",
    surfaces: ["website"],
    jsxPatterns: [
      {
        pattern:
          /<main\b[^>]*\bclassName=\{?["'`][^"'`]*\bhost-preview(?=\s|["'`])/gu,
        description: "raw website host-preview main shell",
      },
      {
        pattern:
          /<[^>\s]+\b[^>]*\bclassName=\{?["'`][^"'`]*\b(?:host-preview-hero|host-preview-hero__media|host-preview-hero__inner|host-preview-hero__copy|host-preview-hero__stores|host-preview-hero__product|host-preview-console|host-preview-offer|host-preview-offer__card|host-preview-badge|host-preview-offer__steps|host-preview-section|host-preview-loop|host-preview-product-split|host-preview-payments|host-preview-live|host-preview-after|host-preview-trust|host-preview-faq|host-preview-apply|host-preview-section__head|host-preview-format-rail|host-preview-chip-row|host-preview-loop__grid|host-preview-product-split__copy|host-preview-roster|host-preview-payment-flow|host-preview-live__grid|host-preview-live__modules|host-preview-trust__grid|host-preview-faq__list)\b[^"'`]*["'`]\}?/gu,
        description: "raw website host-preview shell",
      },
    ],
    createElementPattern: null,
    guidance: "Use HostPreviewMain, HostPreviewHero*, HostPreviewFormatRail, HostPreviewChipRow, HostPreviewOfferShell, HostPreviewSection, HostPreviewApplyShell, and the other HostPreview* primitives instead of rendering host-preview route shells directly.",
  },
  {
    family: "website-host-page-shell",
    surfaces: ["website"],
    jsxPatterns: [
      {
        pattern:
          /<[^>\s]+\b[^>]*\bclassName=\{?["'`][^"'`]*\b(?:host-hero|host-hero__inner|host-hero__copy|host-evidence|surface-section|host-fill-room|proof-ledger)\b[^"'`]*["'`]\}?/gu,
        description: "raw website Host Page shell",
      },
    ],
    createElementPattern: null,
    guidance: "Use HostHeroShell, HostHeroInner, HostHeroCopy, and HostPageSection instead of rendering Host Page route shells directly.",
  },
  {
    family: "website-host-application-shell",
    surfaces: ["website"],
    jsxPatterns: [
      {
        pattern:
          /<[^>\s]+\b[^>]*\bclassName=\{?["'`][^"'`]*\b(?:host-application|host-application__panel|host-application__submitted|submitted-panel__mark|host-application__stage|host-application__review|operational-note|host-application__summary)\b[^"'`]*["'`]\}?/gu,
        description: "raw website Host Application shell",
      },
    ],
    createElementPattern: null,
    guidance: "Use HostApplicationShell, HostApplicationPanel, HostApplicationStage, HostApplicationSubmitted, HostApplicationReview*, OperationalNote, and HostApplicationCompletenessSummary instead of rendering Host Application shells directly.",
  },
  {
    family: "website-host-feature-section-shell",
    surfaces: ["website"],
    jsxPatterns: [
      {
        pattern:
          /<[^>\s]+\b[^>]*\bclassName=\{?["'`][^"'`]*\b(?:host-create-flow|host-create-flow__grid|host-create-flow__rail|host-create-flow__capture|event-success-showcase|event-success-showcase__grid|event-success-stage-rail|privacy-guardrail|host-comparison|host-comparison__split|comparison-table-heading|comparison-table-wrap|phone-capture|phone-capture__device|phone-capture__notch|phone-capture__screen)\b[^"'`]*["'`]\}?/gu,
        description: "raw website host feature section shell",
      },
    ],
    createElementPattern: null,
    guidance: "Use HostFeatureSection, HostFeatureGrid, HostFeatureRail, HostCreateFlowCapture, HostComparisonTable*, PrivacyGuardrail, and PhoneCaptureShell instead of rendering Host feature section shells directly.",
  },
  {
    family: "website-claim-flow-shell",
    surfaces: ["website"],
    jsxPatterns: [
      {
        pattern:
          /<[^>\s]+\b[^>]*\bclassName=\{?["'`][^"'`]*\b(?:claim-flow|claim-flow__hero|claim-flow__intro|claim-flow__summary|claim-flow__workspace|claim-flow__panel|claim-flow__stage|claim-listing-results|claim-result|selected-listing-card|verification-methods|owner-unlock-board)\b[^"'`]*["'`]\}?/gu,
        description: "raw website claim-flow shell",
      },
      {
        pattern:
          /\bclassName=\{?["'`][^"'`]*\b(?:claim-auth-row|claim-auth-row--flow)\b[^"'`]*["'`]\}?/gu,
        description: "raw website claim auth-row shell",
      },
    ],
    createElementPattern: null,
    guidance: "Use ClaimFlowMain, ClaimFlow*, ClaimListingResults, ClaimResultButton, SelectedListingCard, VerificationMethodGrid, OwnerUnlockBoard, and AuthStatusRow variants instead of rendering claim-flow shells directly.",
  },
  {
    family: "website-marketing-section-shell",
    surfaces: ["website"],
    jsxPatterns: [
      {
        pattern:
          /<[^>\s]+\b[^>]*\bclassName=\{?["'`][^"'`]*\b(?:hero--home|home-discovery|format-band|format-card|format-card__mark|featured-organizers|featured-organizers__grid|story-section|proof-section|proof-section--host|proof-section__copy|captures-section|download-section|download-section__copy|trust-section|live-meter)\b[^"'`]*["'`]\}?/gu,
        description: "raw website marketing section shell",
      },
    ],
    createElementPattern: null,
    guidance: "Use HomeHero*, MarketingSection, MarketingSectionCopy, MarketingFormatCard, FeaturedOrganizerCardGrid, and LiveMeter instead of rendering website marketing section shells directly.",
  },
  {
    family: "website-marketing-info-card-shell",
    surfaces: ["website"],
    jsxPatterns: [
      {
        pattern: /<article\b[^>]*\bdata-reveal\b/gu,
        description: "raw website reveal info-card shell",
      },
    ],
    createElementPattern: null,
    guidance: "Use MarketingInfoCardGrid or HostComparisonSummaryCards instead of rendering reveal-card article shells directly.",
  },
  {
    family: "website-marketing-loop-list-shell",
    surfaces: ["website"],
    sourcePatterns: [
      {
        pattern: /from\s+["'][^"']*\/marketing\/LoopList["']/gu,
        description: "legacy website marketing LoopList import",
      },
    ],
    jsxPatterns: [
      {
        pattern:
          /\bclassName=\{?["'`][^"'`]*\bloop-list(?:--host)?\b[^"'`]*["'`]\}?/gu,
        description: "raw website marketing loop-list shell",
      },
      {
        pattern: /function\s+LoopList\b/gu,
        description: "local website marketing LoopList component",
      },
    ],
    createElementPattern: null,
    guidance: "Use MarketingLoopList instead of rendering or importing local website loop-list shells.",
  },
  {
    family: "website-marketing-consent-banner-shell",
    surfaces: ["website"],
    jsxPatterns: [
      {
        pattern:
          /\bclassName=\{?["'`][^"'`]*\bconsent-banner\b[^"'`]*["'`]\}?/gu,
        description: "raw website marketing consent banner shell",
      },
    ],
    createElementPattern: null,
    guidance: "Use MarketingConsentBannerShell for the banner presentation; keep consent state and analytics decisions in the owning feature wrapper.",
  },
  {
    family: "website-featured-organizer-card-shell",
    surfaces: ["website"],
    jsxPatterns: [
      {
        pattern:
          /<FeaturedOrganizersGrid\b|<OrganizerMiniCard\b/gu,
        description: "direct website featured organizer card composition",
      },
      {
        pattern:
          /\bclassName=\{?["'`][^"'`]*\b(?:organizer-mini-card|recommended-organizers)\b[^"'`]*["'`]\}?/gu,
        description: "raw website featured organizer card shell",
      },
    ],
    createElementPattern: null,
    guidance: "Use FeaturedOrganizerCardGrid and RecommendedOrganizersSectionShell instead of composing featured organizer card shells directly.",
  },
  {
    family: "website-listing-shell",
    surfaces: ["website"],
    jsxPatterns: [
      {
        pattern:
          /<[^>\s]+\b[^>]*\bclassName=\{?["'`][^"'`]*\b(?:listing-section|listing-section--events|listing-section--reviews|listing-section--split|listing-section--success|listing-grid|listing-grid--fit|listing-card|listing-event-download|listing-event-stack|listing-event-card|listing-event-meta|listing-event-facts|listing-review-summary|listing-review-workspace|listing-review-lanes|listing-format-row|listing-diagnostics|listing-diagnostics__head|listing-ledger)\b[^"'`]*["'`]\}?/gu,
        description: "raw website organizer listing shell",
      },
      {
        pattern: /<div\b[^>]*\bdata-reveal\b/gu,
        description: "raw website revealed listing intro shell",
      },
    ],
    createElementPattern: null,
    guidance: "Use ListingSection, ListingSectionIntro, ListingFactGrid, ListingNoteGrid, ListingFormatRow, ListingDiagnostics*, ListingEventDownloadPanel, ListingEventEvidenceList, ListingReview*, and ListingSourceLedger instead of rendering organizer listing shells directly.",
  },
  {
    family: "website-listing-card-grid-shell",
    surfaces: ["website"],
    jsxPatterns: [
      {
        pattern:
          /<Listing(?:Grid|Card)\b/gu,
        description: "direct website organizer listing card-grid composition",
      },
    ],
    createElementPattern: null,
    guidance: "Use ListingFactGrid or ListingNoteGrid instead of composing organizer listing grids/cards directly.",
  },
  {
    family: "website-listing-event-section-shell",
    surfaces: ["website"],
    jsxPatterns: [
      {
        pattern:
          /<[^>\s]+\b[^>]*\bclassName=\{?["'`][^"'`]*\b(?:event-action-card|event-action-card__lead|event-action-card__meta|event-action-card__counts|event-action-card__actions)\b[^"'`]*["'`]\}?/gu,
        description: "raw website organizer listing event action-card shell",
      },
      {
        pattern:
          /<ListingEvent(?:Download|Stack|Card|Meta|Facts)\b/gu,
        description: "direct website organizer listing event-shell composition",
      },
    ],
    createElementPattern: null,
    guidance: "Use EventActionCard, ListingEventDownloadPanel, and ListingEventEvidenceList instead of composing organizer listing event shells directly.",
  },
  {
    family: "website-organizer-result-shell",
    surfaces: ["website"],
    jsxPatterns: [
      {
        pattern:
          /<[^>\s]+\b[^>]*\bclassName=\{?["'`][^"'`]*\b(?:organizer-result-card|organizer-result-card__body|organizer-card-topline|organizer-event-highlights|organizer-result-card__footer)\b[^"'`]*["'`]\}?/gu,
        description: "raw website organizer result-card shell",
      },
    ],
    createElementPattern: null,
    guidance: "Use OrganizerResultCard*, OrganizerEventHighlights, and ListingFormatRow instead of rendering organizer result-card shells directly.",
  },
  {
    family: "website-organizer-search-section-shell",
    surfaces: ["website"],
    jsxPatterns: [
      {
        pattern:
          /<[^>\s]+\b[^>]*\bclassName=\{?["'`][^"'`]*\b(?:organizer-search-hero|organizer-search-stats|organizer-result-summary|directory-claim-pressure|directory-claim-pressure__copy|directory-claim-pressure__stats|directory-claim-pressure__list|directory-claim-pressure__cta|organizer-results)\b[^"'`]*["'`]\}?/gu,
        description: "raw website organizer search section shell",
      },
    ],
    createElementPattern: null,
    guidance: "Use OrganizerSearchSection, OrganizerSearchStats, OrganizerResultSummary, DirectoryClaimPressure*, and OrganizerResultCard* primitives instead of rendering organizer search section shells directly.",
  },
  {
    family: "website-listing-hero-shell",
    surfaces: ["website"],
    jsxPatterns: [
      {
        pattern:
          /\bclassName=\{?["'`][^"'`]*\b(?:listing-hero|listing-hero__inner|listing-hero__copy|listing-hero__eyebrow|listing-share-status|listing-panel__metrics)\b[^"'`]*["'`]\}?/gu,
        description: "raw website organizer listing hero shell",
      },
    ],
    createElementPattern: null,
    guidance: "Use ListingHeroShell, ListingHeroInner, ListingHeroCopy, ListingHeroEyebrow, ListingHeroMetrics, and ListingHeroShareStatus instead of rendering organizer listing hero shells directly.",
  },
  {
    family: "website-listing-review-shell",
    surfaces: ["website"],
    jsxPatterns: [
      {
        pattern:
          /\bclassName=\{?["'`][^"'`]*\b(?:review-signal-lane|review-signal-lane__head|review-signal-lane__stack|review-signal-card|review-signal-card__header|review-signal-card__badges|listing-owner-response|owner-response-prompt|owner-response-prompt__stats|listing-review-empty|listing-review-form|listing-review-checkbox)\b[^"'`]*["'`]\}?/gu,
        description: "raw website organizer listing review shell",
      },
    ],
    createElementPattern: null,
    guidance: "The organizer listing review shells were retired in CAT-251 and CAT-252. Render reviews with CatchReviewItem from @catch/web-ui instead of reviving raw review-shell classes.",
  },
  {
    family: "website-listing-claim-shell",
    surfaces: ["website"],
    jsxPatterns: [
      {
        pattern:
          /\bclassName=\{?["'`][^"'`]*\b(?:missing-list|claim-request-form)\b[^"'`]*["'`]\}?/gu,
        description: "raw website organizer listing claim shell",
      },
    ],
    createElementPattern: null,
    guidance: "Use ClaimMissingEvidenceList and ClaimRequestForm instead of rendering organizer listing claim shells directly.",
  },
  {
    family: "website-listing-source-ledger-shell",
    surfaces: ["website"],
    jsxPatterns: [
      {
        pattern: /<ListingLedger\b/gu,
        description: "direct website organizer listing ledger composition",
      },
      {
        pattern:
          /\bclassName=\{?["'`][^"'`]*\bsource-link\b[^"'`]*["'`]\}?/gu,
        description: "raw website organizer listing source-link shell",
      },
    ],
    createElementPattern: null,
    guidance: "Use ListingSourceLedger instead of composing organizer listing source-ledger rows directly.",
  },
];

const args = parseArgs(process.argv.slice(2));
const violations = [];
const overrideNotes = [];
const interactionContractErrors = [];

if (args.selfTest) {
  runSelfTest();
  process.exit(0);
}

if (args.familiesJson) {
  printFamiliesJson();
  process.exit(0);
}
const selectedSurfaces = args.surface === "all" ?
  Object.keys(surfaces) :
  [args.surface];

if (selectedSurfaces.includes("admin")) {
  const componentContracts = JSON.parse(
    fs.readFileSync(fromRepo("design/components/catch.components.json"), "utf8"),
  );
  const adminRegistry = JSON.parse(
    fs.readFileSync(fromRepo("design/admin/components.json"), "utf8"),
  );
  interactionContractErrors.push(
    ...validateAdminInteractionContracts({
      componentContracts,
      adminRegistry,
      readSource: (sourcePath) => {
        const absolutePath = fromRepo(sourcePath);
        return fs.existsSync(absolutePath) ? fs.readFileSync(absolutePath, "utf8") : null;
      },
    }),
  );
}

for (const surfaceName of selectedSurfaces) {
  const surface = surfaces[surfaceName];
  const root = fromRepo(surface.root);
  for (const filePath of walk(root)) {
    const relativePath = relativeToRepo(filePath);
    scanFilePath({relativePath, surfaceName});
    if (isPrimitiveOwner(relativePath, surface.primitiveOwners)) continue;
    scanFile({filePath, relativePath, surfaceName});
  }
}

if (violations.length > 0 || interactionContractErrors.length > 0) {
  if (violations.length > 0) {
    console.error("React component governance violations:");
    for (const violation of violations) {
      console.error(
        `- ${violation.path}:${violation.line}: ${violation.description} bypasses the shared ${violation.family} primitive.`
      );
    }
    console.error("");
    for (const family of componentFamilies) {
      console.error(`- ${family.family}: ${family.guidance}`);
    }
    console.error(
      `\nTemporary exceptions require an adjacent ${overrideToken}: <DEBT-ID-001> <removal note> comment.`,
    );
  }
  if (interactionContractErrors.length > 0) {
    console.error("Admin interaction contract violations:");
    for (const error of interactionContractErrors) console.error(`- ${error}`);
  }
  process.exit(1);
}

if (args.summary || overrideNotes.length > 0) {
  const familyNames = componentFamilies.map((family) => family.family).join(", ");
  console.log(
    `React component governance ok: ${selectedSurfaces.join(", ")} (${familyNames}).`
  );
  if (overrideNotes.length > 0) {
    console.log(`Temporary overrides: ${overrideNotes.length}`);
    for (const override of overrideNotes) {
      console.log(`- ${override.path}:${override.line}: ${override.family}`);
    }
  }
}

function scanFile({filePath, relativePath, surfaceName}) {
  const lines = fs.readFileSync(filePath, "utf8").split(/\r?\n/u);
  const scansJsx = jsxExtensions.has(path.extname(filePath));
  scanLines({lines, relativePath, scansJsx, surfaceName});
}

function scanLines({lines, relativePath, scansJsx, surfaceName}) {
  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index];
    for (const family of componentFamilies) {
      if (family.surfaces && !family.surfaces.includes(surfaceName)) continue;
      if (family.sourcePatterns) {
        for (const sourcePattern of family.sourcePatterns) {
          for (const match of line.matchAll(sourcePattern.pattern)) {
            recordMatch({
              description: sourcePattern.description,
              family,
              index,
              lines,
              relativePath,
              surfaceName,
            });
          }
        }
      }
      if (scansJsx) {
        for (const jsxPattern of family.jsxPatterns) {
          for (const match of line.matchAll(jsxPattern.pattern)) {
            recordMatch({
              description: jsxPattern.description,
              family,
              index,
              lines,
              relativePath,
              surfaceName,
            });
          }
        }
      }
      if (family.createElementPattern) {
        for (const match of line.matchAll(family.createElementPattern)) {
          recordMatch({
            description: family.createElementDescription ?? "React.createElement(...)",
            family,
            index,
            lines,
            relativePath,
            surfaceName,
          });
        }
      }
    }
  }
}

function scanFilePath({relativePath, surfaceName}) {
  for (const family of componentFamilies) {
    if (family.surfaces && !family.surfaces.includes(surfaceName)) continue;
    if (!family.filePathPatterns) continue;
    for (const filePathPattern of family.filePathPatterns) {
      if (!filePathPattern.pattern.test(relativePath)) continue;
      violations.push({
        description: filePathPattern.description,
        family: family.family,
        path: relativePath,
        line: 1,
        surface: surfaceName,
      });
    }
  }
}

function recordMatch({
  description,
  family,
  index,
  lines,
  relativePath,
  surfaceName,
}) {
  if (hasGovernanceOverride(lines, index)) {
    overrideNotes.push({
      family: family.family,
      path: relativePath,
      line: index + 1,
      surface: surfaceName,
    });
    return;
  }
  violations.push({
    description,
    family: family.family,
    path: relativePath,
    line: index + 1,
    surface: surfaceName,
  });
}

function hasGovernanceOverride(lines, index) {
  const candidates = [lines[index - 1] ?? "", lines[index]];
  return candidates.some((line) => isValidGovernanceOverride(line));
}

function isValidGovernanceOverride(line) {
  const tokenIndex = line.indexOf(overrideToken);
  if (tokenIndex === -1) return false;

  const payload = line.slice(tokenIndex + overrideToken.length);
  const match = payload.match(/^\s*:\s*([A-Z][A-Z0-9]+(?:-[A-Z0-9]+)*-\d{3,})\b(.*)$/u);
  if (!match) return false;
  if (!debtIdPattern.test(match[1])) return false;

  return match[2].trim().length >= 8;
}

function isPrimitiveOwner(relativePath, primitiveOwners) {
  return primitiveOwners.some((owner) => relativePath.startsWith(owner));
}

function walk(directory) {
  const files = [];
  if (!fs.existsSync(directory)) return files;
  for (const entry of fs.readdirSync(directory, {withFileTypes: true})) {
    const fullPath = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === "dist" || entry.name === "storybook-static") continue;
      files.push(...walk(fullPath));
      continue;
    }
    if (checkedExtensions.has(path.extname(entry.name))) files.push(fullPath);
  }
  return files;
}

function relativeToRepo(filePath) {
  return path.relative(fromRepo("."), filePath).split(path.sep).join("/");
}

export function validateAdminInteractionContracts({
  componentContracts,
  adminRegistry,
  readSource,
}) {
  const errors = [];
  const fieldRow = componentContracts?.interactionContracts?.field_row;
  const allowedModes = new Set(fieldRow?.modes ?? []);
  if (allowedModes.size === 0) {
    return ["design/components/catch.components.json has no field_row modes"];
  }

  const registryComponents = new Map();
  for (const component of adminRegistry?.components ?? []) {
    if (registryComponents.has(component.exportName)) {
      errors.push(`duplicate admin component export ${component.exportName}`);
    }
    registryComponents.set(component.exportName, component);
    const declaration = component.interactionContract;
    if (!declaration) continue;
    if (declaration.concept !== "field_row") {
      errors.push(`${component.exportName}: unsupported interaction concept ${declaration.concept}`);
    }
    if (!allowedModes.has(declaration.mode)) {
      errors.push(
        `${component.exportName}: interaction mode ${declaration.mode} is not declared by field_row`,
      );
    }
  }

  const adoptions = adminRegistry?.interactionContractAdoptions ?? [];
  if (adoptions.length === 0) {
    errors.push("design/admin/components.json has no interaction contract adoption");
  }
  const adoptionIds = new Set();
  for (const adoption of adoptions) {
    if (adoptionIds.has(adoption.id)) errors.push(`duplicate interaction adoption ${adoption.id}`);
    adoptionIds.add(adoption.id);
    if (adoption.concept !== "field_row") {
      errors.push(`${adoption.id}: unsupported interaction concept ${adoption.concept}`);
      continue;
    }
    const source = readSource(adoption.source);
    if (source === null) {
      errors.push(`${adoption.id}: adoption source does not exist: ${adoption.source}`);
      continue;
    }
    for (const exportName of adoption.components ?? []) {
      const component = registryComponents.get(exportName);
      if (!component) {
        errors.push(`${adoption.id}: ${exportName} is not registered as an admin component`);
        continue;
      }
      if (!component.interactionContract) {
        errors.push(`${adoption.id}: ${exportName} must declare an interaction contract mode`);
        continue;
      }
      if (component.interactionContract.concept !== adoption.concept) {
        errors.push(`${adoption.id}: ${exportName} does not implement ${adoption.concept}`);
      }
      if (!new RegExp(`<${exportName}\\b`, "u").test(source)) {
        errors.push(`${adoption.id}: ${exportName} is not used by ${adoption.source}`);
      }
    }
  }
  return errors;
}

function parseArgs(argv) {
  const parsed = {familiesJson: false, selfTest: false, surface: "all", summary: false};
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--check") {
      continue;
    }
    if (arg === "--families-json") {
      parsed.familiesJson = true;
      continue;
    }
    if (arg === "--self-test") {
      parsed.selfTest = true;
      continue;
    }
    if (arg === "--summary") {
      parsed.summary = true;
      continue;
    }
    if (arg === "--surface") {
      parsed.surface = requiredValue(argv, ++index, arg);
      continue;
    }
    if (arg === "--help" || arg === "-h") {
      printHelp();
      process.exit(0);
    }
    fail(`Unknown argument: ${arg}`);
  }
  if (parsed.surface !== "all" && !surfaces[parsed.surface]) {
    fail(`Unknown surface: ${parsed.surface}`);
  }
  return parsed;
}

function requiredValue(argv, index, flag) {
  const value = argv[index];
  if (!value || value.startsWith("--")) fail(`${flag} requires a value.`);
  return value;
}

function fail(message) {
  console.error(message);
  process.exit(64);
}

function printFamiliesJson() {
  process.stdout.write(`${JSON.stringify({
    version: 1,
    updated: "2026-07-03",
    source: "tool/web/check_react_component_governance.mjs",
    limitation:
      "Known-family blocklist. Passing the scanner does not classify novel component shell families; reviewers must add new families when drift repeats.",
    families: componentFamilies.map((family) => ({
      family: family.family,
      surfaces: family.surfaces ?? ["admin", "website"],
      guidance: family.guidance,
    })),
  }, null, 2)}\n`);
}

function runSelfTest() {
  scanLines({
    lines: [
      "export function Feature() {",
      "  return <table />;",
      "}",
    ],
    relativePath: "website/src/features/example/Example.tsx",
    scansJsx: true,
    surfaceName: "website",
  });
  assert.equal(violations.length, 1);
  assert.equal(violations[0].family, "data-table");
  assert.equal(violations[0].line, 2);

  violations.length = 0;
  overrideNotes.length = 0;
  scanLines({
    lines: [
      "export function Feature() {",
      "  // react-component-governance-allow: WEB-UI-999 remove after DataTable lands",
      "  return <table />;",
      "}",
    ],
    relativePath: "website/src/features/example/Example.tsx",
    scansJsx: true,
    surfaceName: "website",
  });
  assert.equal(violations.length, 0);
  assert.equal(overrideNotes.length, 1);

  violations.length = 0;
  overrideNotes.length = 0;
  scanFilePath({
    relativePath: "website/src/components/site.tsx",
    surfaceName: "website",
  });
  assert.equal(violations.length, 1);
  assert.equal(violations[0].family, "website-legacy-site-barrel");

  violations.length = 0;
  overrideNotes.length = 0;
  scanLines({
    lines: [
      "export function Feature() {",
      "  return <nav className=\"operational-step-rail\" aria-label=\"Steps\" />;",
      "}",
    ],
    relativePath: "website/src/features/example/Example.tsx",
    scansJsx: true,
    surfaceName: "website",
  });
  assert.equal(violations.length, 1);
  assert.equal(violations[0].family, "website-operational-step-rail");
  assert.equal(violations[0].line, 2);

  violations.length = 0;
  overrideNotes.length = 0;
  scanLines({
    lines: [
      "export function Feature() {",
      "  return <button className=\"choice-card is-selected\" />;",
      "}",
    ],
    relativePath: "website/src/features/example/Example.tsx",
    scansJsx: true,
    surfaceName: "website",
  });
  assert.equal(violations.length, 1);
  assert.equal(violations[0].family, "website-choice-controls");
  assert.equal(violations[0].line, 2);

  const interactionFixture = {
    componentContracts: {
      interactionContracts: {field_row: {modes: ["input"]}},
    },
    adminRegistry: {
      interactionContractAdoptions: [
        {
          id: "known_bad_form",
          concept: "field_row",
          source: "admin/src/features/example/Form.tsx",
          components: ["TextField"],
        },
      ],
      components: [{exportName: "TextField"}],
    },
    readSource: () => "export const Form = () => <TextField />;",
  };
  assert.deepEqual(validateAdminInteractionContracts(interactionFixture), [
    "known_bad_form: TextField must declare an interaction contract mode",
  ]);
  interactionFixture.adminRegistry.components[0].interactionContract = {
    concept: "field_row",
    mode: "input",
  };
  assert.deepEqual(validateAdminInteractionContracts(interactionFixture), []);

  console.log("React component governance scanner self-test passed.");
}

function printHelp() {
  console.log(`Usage: node tool/web/check_react_component_governance.mjs [--check] [--surface all|website|admin] [--summary] [--families-json] [--self-test]

Fails when React app/feature code renders governed component families directly
instead of routing them through shared UI primitives. Use --families-json for the
scanner-owned governed-family registry. The registry is a known-family blocklist:
passing it does not classify novel shell families automatically.

Temporary exceptions require an adjacent comment containing:
  ${overrideToken}: <DEBT-ID-001> <removal note>
`);
}
