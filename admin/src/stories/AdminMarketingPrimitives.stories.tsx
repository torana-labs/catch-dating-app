import {CatchBadge, CatchField} from "@catch/web-ui";
import type {Meta, StoryObj} from "@storybook/react-vite";
import {
  CheckCircle2,
  Download,
  Edit3,
  FileImage,
  Image as ImageIcon,
  Megaphone,
  Palette,
  Send,
  Sparkles,
  Upload,
} from "lucide-react";
import {
  AdminButton,
  AdminCard,
  AdminEyebrow,
  AdminMarketingAppCapturePreview,
  AdminMarketingAppMediaPaths,
  AdminMarketingAuditList,
  AdminMarketingAuditRow,
  AdminMarketingBoardColumn,
  AdminMarketingBoardList,
  AdminMarketingBrandContract,
  AdminMarketingBrandContractItem,
  AdminMarketingCardLink,
  AdminMarketingCarouselPreview,
  AdminMarketingComplianceList,
  AdminMarketingComposer,
  AdminMarketingComposerBackButton,
  AdminMarketingComposerFooter,
  AdminMarketingComposerHeader,
  AdminMarketingDeliverable,
  AdminMarketingEventLibraryGrid,
  AdminMarketingExportStatus,
  AdminMarketingFeatureShotCard,
  AdminMarketingFeatureShotGrid,
  AdminMarketingFilePickerButton,
  AdminMarketingGuideLayout,
  AdminMarketingHelpText,
  AdminMarketingImageControls,
  AdminMarketingImageEditor,
  AdminMarketingImageEditorHeader,
  AdminMarketingImageEmpty,
  AdminMarketingImageMetaFields,
  AdminMarketingImageReviewRow,
  AdminMarketingImageSourceNote,
  AdminMarketingImageThumb,
  AdminMarketingLibraryCard,
  AdminMarketingMediaCard,
  AdminMarketingMediaGrid,
  AdminMarketingNewPostCard,
  AdminMarketingNewPostGrid,
  AdminMarketingOpsShell,
  AdminMarketingPanel,
  AdminMarketingPickerList,
  AdminMarketingPickerRow,
  AdminMarketingPostBoard,
  AdminMarketingPostTypeBadge,
  AdminMarketingPreviewActions,
  AdminMarketingPreviewBrandNote,
  AdminMarketingPreviewCopy,
  AdminMarketingPreviewImage,
  AdminMarketingPreviewMeta,
  AdminMarketingPreviewShell,
  AdminMarketingPreviewSlide,
  AdminMarketingPreviewToolbar,
  AdminMarketingRecommendationItem,
  AdminMarketingRecommendationList,
  AdminMarketingSection,
  AdminMarketingSectionHeader,
  AdminMarketingSlideEditor,
  AdminMarketingSlideEditorTopline,
  AdminMarketingSlideList,
  AdminMarketingStackedSections,
  AdminMarketingStepChip,
  AdminMarketingStepLayout,
  AdminMarketingStepStrip,
  AdminMarketingStudioActions,
  AdminMarketingStudioFilterTabs,
  AdminMarketingStudioHeader,
  AdminMarketingStudioNav,
  AdminMarketingStudioStack,
  AdminMarketingStudioSummary,
  AdminMarketingStudioSummaryItem,
  AdminMarketingTabs,
  AdminMarketingTitleInput,
  AdminPanel,
  AdminStateRow,
  AdminTagList,
  AdminWorkspace,
  EmptyState,
  QualityList,
  QualityRow,
} from "../shared/ui/AdminPrimitives";

const imageData =
  "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 320 180'%3E%3Crect width='320' height='180' fill='%23f6f1e8'/%3E%3Ccircle cx='88' cy='84' r='42' fill='%236756ff'/%3E%3Crect x='154' y='54' width='110' height='18' rx='9' fill='%23191824'/%3E%3Crect x='154' y='88' width='78' height='14' rx='7' fill='%237c7a86'/%3E%3Crect x='154' y='118' width='96' height='14' rx='7' fill='%23d96c52'/%3E%3C/svg%3E";

const meta = {
  title: "Admin Dashboard/Marketing Primitives",
  parameters: {
    catchComponentRegistry: {
      path: "design/admin/components.json",
    },
  },
} satisfies Meta;

export default meta;

type Story = StoryObj<typeof meta>;

export const AdminMarketingOpsShellStory: Story = {
  name: "Marketing ops shell",
  parameters: {
    catchComponent: {
      id: "shared_admin_marketing_ops_shell",
      states: ["default", "studio"],
    },
  },
  render: () => (
    <AdminWorkspace>
      <AdminMarketingOpsShell>
        <AdminMarketingStudioHeader eyebrow="Marketing" title="Campaign review">
          Review generated posts, visual assets, and export readiness.
        </AdminMarketingStudioHeader>
      </AdminMarketingOpsShell>
      <AdminMarketingOpsShell variant="studio">
        <AdminMarketingStudioHeader eyebrow="Studio" title="Launch workspace" />
      </AdminMarketingOpsShell>
    </AdminWorkspace>
  ),
};

export const AdminMarketingStudioHeaderStory: Story = {
  name: "Studio header",
  parameters: {
    catchComponent: {
      id: "shared_admin_marketing_studio_header",
      states: ["with-actions", "copy"],
    },
  },
  render: () => (
    <AdminWorkspace>
      <AdminMarketingStudioHeader
        actions={<AdminButton variant="primary">New draft</AdminButton>}
        eyebrow="Marketing studio"
        title="Post board"
      >
        Plan, review, and export launch marketing content.
      </AdminMarketingStudioHeader>
    </AdminWorkspace>
  ),
};

export const AdminMarketingStudioActionsStory: Story = {
  name: "Studio actions",
  parameters: {
    catchComponent: {
      id: "shared_admin_marketing_studio_actions",
      states: ["buttons"],
    },
  },
  render: () => (
    <AdminWorkspace>
      <AdminMarketingStudioActions>
        <AdminButton>Import assets</AdminButton>
        <AdminButton variant="primary">Create draft</AdminButton>
      </AdminMarketingStudioActions>
    </AdminWorkspace>
  ),
};

export const AdminMarketingStudioNavStory: Story = {
  name: "Studio nav",
  parameters: {
    catchComponent: {
      id: "shared_admin_marketing_studio_nav",
      states: ["tabs-and-actions"],
    },
  },
  render: () => (
    <AdminWorkspace>
      <AdminMarketingStudioNav>
        <AdminMarketingTabs
          ariaLabel="Marketing views"
          options={[
            {id: "board", label: "Board"},
            {id: "library", label: "Library"},
            {id: "exports", label: "Exports"},
          ]}
          value="board"
          onChange={() => undefined}
        />
        <AdminButton icon={<Download size={16} />}>Export</AdminButton>
      </AdminMarketingStudioNav>
    </AdminWorkspace>
  ),
};

export const AdminMarketingTabsStory: Story = {
  name: "Marketing tabs",
  parameters: {
    catchComponent: {
      id: "shared_admin_marketing_tabs",
      states: ["selected", "disabled"],
    },
  },
  render: () => (
    <AdminWorkspace>
      <AdminMarketingTabs
        ariaLabel="Marketing sections"
        options={[
          {id: "drafts", label: "Drafts"},
          {id: "published", label: "Published"},
          {disabled: true, id: "archive", label: "Archive"},
        ]}
        value="drafts"
        onChange={() => undefined}
      />
    </AdminWorkspace>
  ),
};

export const AdminMarketingStudioStackStory: Story = {
  name: "Studio stack",
  parameters: {
    catchComponent: {
      id: "shared_admin_marketing_studio_stack",
      states: ["sections"],
    },
  },
  render: () => (
    <AdminWorkspace>
      <AdminMarketingStudioStack>
        <AdminMarketingStudioSummary>
          <AdminMarketingStudioSummaryItem label="Ready" value="6" />
          <AdminMarketingStudioSummaryItem label="Needs review" value="3" />
        </AdminMarketingStudioSummary>
        <AdminMarketingPostBoard>
          <AdminMarketingBoardColumn count="2" title="Draft">
            <AdminMarketingBoardList>
              <AdminCard>Organizer launch card</AdminCard>
            </AdminMarketingBoardList>
          </AdminMarketingBoardColumn>
        </AdminMarketingPostBoard>
      </AdminMarketingStudioStack>
    </AdminWorkspace>
  ),
};

export const AdminMarketingStudioSummaryStory: Story = {
  name: "Studio summary",
  parameters: {
    catchComponent: {
      id: "shared_admin_marketing_studio_summary",
      states: ["items"],
    },
  },
  render: () => (
    <AdminWorkspace>
      <AdminMarketingStudioSummary>
        <AdminMarketingStudioSummaryItem label="Drafts" value="12" />
        <AdminMarketingStudioSummaryItem label="Ready" value="6" />
        <AdminMarketingStudioSummaryItem label="Blocked" value="1" />
      </AdminMarketingStudioSummary>
    </AdminWorkspace>
  ),
};

export const AdminMarketingStudioSummaryItemStory: Story = {
  name: "Studio summary item",
  parameters: {
    catchComponent: {
      id: "shared_admin_marketing_studio_summary_item",
      states: ["label-value"],
    },
  },
  render: () => (
    <AdminWorkspace>
      <AdminMarketingStudioSummary>
        <AdminMarketingStudioSummaryItem label="Exports" value="4" />
      </AdminMarketingStudioSummary>
    </AdminWorkspace>
  ),
};

export const AdminMarketingStudioFilterTabsStory: Story = {
  name: "Studio filter tabs",
  parameters: {
    catchComponent: {
      id: "shared_admin_marketing_studio_filter_tabs",
      states: ["selected", "disabled"],
    },
  },
  render: () => (
    <AdminWorkspace>
      <AdminMarketingStudioFilterTabs
        ariaLabel="Draft filters"
        options={[
          {id: "all", label: "All"},
          {id: "ready", label: "Ready"},
          {disabled: true, id: "blocked", label: "Blocked"},
        ]}
        value="ready"
        onChange={() => undefined}
      />
    </AdminWorkspace>
  ),
};

export const AdminMarketingPostBoardStory: Story = {
  name: "Post board",
  parameters: {
    catchComponent: {
      id: "shared_admin_marketing_post_board",
      states: ["columns"],
    },
  },
  render: () => (
    <AdminWorkspace>
      <AdminMarketingPostBoard>
        <AdminMarketingBoardColumn count="2" title="Draft">
          <AdminMarketingBoardList>
            <AdminCard>Launch announcement</AdminCard>
            <AdminCard>Host education post</AdminCard>
          </AdminMarketingBoardList>
        </AdminMarketingBoardColumn>
        <AdminMarketingBoardColumn count="1" title="Ready">
          <AdminMarketingBoardList>
            <AdminCard>Event proof carousel</AdminCard>
          </AdminMarketingBoardList>
        </AdminMarketingBoardColumn>
      </AdminMarketingPostBoard>
    </AdminWorkspace>
  ),
};

export const AdminMarketingBoardColumnStory: Story = {
  name: "Board column",
  parameters: {
    catchComponent: {
      id: "shared_admin_marketing_board_column",
      states: ["with-list"],
    },
  },
  render: () => (
    <AdminWorkspace>
      <AdminMarketingBoardColumn count="3" title="Needs review">
        <AdminMarketingBoardList>
          <AdminCard>Review card</AdminCard>
        </AdminMarketingBoardList>
      </AdminMarketingBoardColumn>
    </AdminWorkspace>
  ),
};

export const AdminMarketingBoardListStory: Story = {
  name: "Board list",
  parameters: {
    catchComponent: {
      id: "shared_admin_marketing_board_list",
      states: ["cards"],
    },
  },
  render: () => (
    <AdminWorkspace>
      <AdminMarketingBoardList>
        <AdminCard>Card one</AdminCard>
        <AdminCard>Card two</AdminCard>
      </AdminMarketingBoardList>
    </AdminWorkspace>
  ),
};

export const AdminMarketingPostTypeBadgeStory: Story = {
  name: "Post type badge",
  parameters: {
    catchComponent: {
      id: "shared_admin_marketing_post_type_badge",
      states: ["event", "feature", "soon"],
    },
  },
  render: () => (
    <AdminWorkspace>
      <AdminMarketingPostTypeBadge draftType="event">Event</AdminMarketingPostTypeBadge>
      <AdminMarketingPostTypeBadge draftType="feature">Feature</AdminMarketingPostTypeBadge>
      <AdminMarketingPostTypeBadge draftType="soon">Soon</AdminMarketingPostTypeBadge>
    </AdminWorkspace>
  ),
};

export const AdminMarketingComposerStory: Story = {
  name: "Composer",
  parameters: {
    catchComponent: {
      id: "shared_admin_marketing_composer",
      states: ["header-steps-footer"],
    },
  },
  render: () => (
    <AdminWorkspace>
      <AdminMarketingComposer>
        <AdminMarketingComposerHeader status={<CatchBadge tone="success" label="Saved" />}>
          <AdminMarketingComposerBackButton>Back</AdminMarketingComposerBackButton>
          <h3>Launch post</h3>
        </AdminMarketingComposerHeader>
        <AdminMarketingStepStrip>
          <AdminMarketingStepChip marker="1" status="done">Brief</AdminMarketingStepChip>
          <AdminMarketingStepChip marker="2" status="active">Copy</AdminMarketingStepChip>
        </AdminMarketingStepStrip>
        <AdminMarketingComposerFooter>
          <AdminButton>Save draft</AdminButton>
          <AdminButton variant="primary">Send to review</AdminButton>
        </AdminMarketingComposerFooter>
      </AdminMarketingComposer>
    </AdminWorkspace>
  ),
};

export const AdminMarketingComposerHeaderStory: Story = {
  name: "Composer header",
  parameters: {
    catchComponent: {
      id: "shared_admin_marketing_composer_header",
      states: ["status"],
    },
  },
  render: () => (
    <AdminWorkspace>
      <AdminMarketingComposerHeader status={<CatchBadge label="Draft" />}>
        <AdminMarketingComposerBackButton>Back</AdminMarketingComposerBackButton>
        <h3>Feature post</h3>
      </AdminMarketingComposerHeader>
    </AdminWorkspace>
  ),
};

export const AdminMarketingComposerBackButtonStory: Story = {
  name: "Composer back button",
  parameters: {
    catchComponent: {
      id: "shared_admin_marketing_composer_back_button",
      states: ["default"],
    },
  },
  render: () => (
    <AdminWorkspace>
      <AdminMarketingComposerBackButton>Back to board</AdminMarketingComposerBackButton>
    </AdminWorkspace>
  ),
};

export const AdminMarketingStepStripStory: Story = {
  name: "Step strip",
  parameters: {
    catchComponent: {
      id: "shared_admin_marketing_step_strip",
      states: ["chips"],
    },
  },
  render: () => (
    <AdminWorkspace>
      <AdminMarketingStepStrip>
        <AdminMarketingStepChip marker="1" status="done">Brief</AdminMarketingStepChip>
        <AdminMarketingStepChip marker="2" status="active">Copy</AdminMarketingStepChip>
        <AdminMarketingStepChip marker="3">Assets</AdminMarketingStepChip>
      </AdminMarketingStepStrip>
    </AdminWorkspace>
  ),
};

export const AdminMarketingStepChipStory: Story = {
  name: "Step chip",
  parameters: {
    catchComponent: {
      id: "shared_admin_marketing_step_chip",
      states: ["todo", "active", "done"],
    },
  },
  render: () => (
    <AdminWorkspace>
      <AdminMarketingStepChip marker="1" status="done">Brief</AdminMarketingStepChip>
      <AdminMarketingStepChip marker="2" status="active">Copy</AdminMarketingStepChip>
      <AdminMarketingStepChip marker="3">Assets</AdminMarketingStepChip>
    </AdminWorkspace>
  ),
};

export const AdminMarketingStepLayoutStory: Story = {
  name: "Step layout",
  parameters: {
    catchComponent: {
      id: "shared_admin_marketing_step_layout",
      states: ["editor-preview"],
    },
  },
  render: () => (
    <AdminWorkspace>
      <AdminMarketingStepLayout>
        <AdminMarketingPanel icon={<Edit3 size={18} />} title="Copy">
          <CatchField
            recipe="input"
            title="Caption"
            maxLines={4}
            value="Meet better hosts this week."
            onChanged={() => undefined}
          />
        </AdminMarketingPanel>
        <AdminMarketingPreviewShell>
          <AdminMarketingPreviewCopy>Meet better hosts this week.</AdminMarketingPreviewCopy>
        </AdminMarketingPreviewShell>
      </AdminMarketingStepLayout>
    </AdminWorkspace>
  ),
};

export const AdminMarketingComposerFooterStory: Story = {
  name: "Composer footer",
  parameters: {
    catchComponent: {
      id: "shared_admin_marketing_composer_footer",
      states: ["actions"],
    },
  },
  render: () => (
    <AdminWorkspace>
      <AdminMarketingComposerFooter>
        <AdminButton>Save draft</AdminButton>
        <AdminButton variant="primary">Queue review</AdminButton>
      </AdminMarketingComposerFooter>
    </AdminWorkspace>
  ),
};

export const AdminMarketingPickerListStory: Story = {
  name: "Picker list",
  parameters: {
    catchComponent: {
      id: "shared_admin_marketing_picker_list",
      states: ["rows"],
    },
  },
  render: () => (
    <AdminWorkspace>
      <AdminMarketingPickerList>
        <AdminMarketingPickerRow marker="A" selected status="Ready">
          <strong>Organizer launch</strong>
          <span>Recommended for this week.</span>
        </AdminMarketingPickerRow>
        <AdminMarketingPickerRow marker="B" status="Draft">
          <strong>Host education</strong>
          <span>Needs copy review.</span>
        </AdminMarketingPickerRow>
      </AdminMarketingPickerList>
    </AdminWorkspace>
  ),
};

export const AdminMarketingPickerRowStory: Story = {
  name: "Picker row",
  parameters: {
    catchComponent: {
      id: "shared_admin_marketing_picker_row",
      states: ["default", "selected"],
    },
  },
  render: () => (
    <AdminWorkspace>
      <AdminMarketingPickerRow marker="1" selected status="Ready">
        <strong>Event proof post</strong>
        <span>Audience match is high.</span>
      </AdminMarketingPickerRow>
    </AdminWorkspace>
  ),
};

export const AdminMarketingFeatureShotGridStory: Story = {
  name: "Feature shot grid",
  parameters: {
    catchComponent: {
      id: "shared_admin_marketing_feature_shot_grid",
      states: ["cards"],
    },
  },
  render: () => (
    <AdminWorkspace>
      <AdminMarketingFeatureShotGrid>
        <AdminMarketingFeatureShotCard headline="Event setup" meta={<CatchBadge label="Host" />}>
          <span>Use in carousel slot one.</span>
        </AdminMarketingFeatureShotCard>
        <AdminMarketingFeatureShotCard headline="Live console" meta={<CatchBadge label="Ops" />}>
          <span>Use for product proof.</span>
        </AdminMarketingFeatureShotCard>
      </AdminMarketingFeatureShotGrid>
    </AdminWorkspace>
  ),
};

export const AdminMarketingFeatureShotCardStory: Story = {
  name: "Feature shot card",
  parameters: {
    catchComponent: {
      id: "shared_admin_marketing_feature_shot_card",
      states: ["with-meta"],
    },
  },
  render: () => (
    <AdminWorkspace>
      <AdminMarketingFeatureShotCard headline="Host live console" meta={<CatchBadge tone="success" label="Approved" />}>
        <span>Recommended for launch carousel.</span>
      </AdminMarketingFeatureShotCard>
    </AdminWorkspace>
  ),
};

export const AdminMarketingBrandContractStory: Story = {
  name: "Brand contract",
  parameters: {
    catchComponent: {
      id: "shared_admin_marketing_brand_contract",
      states: ["items"],
    },
  },
  render: () => (
    <AdminWorkspace>
      <AdminMarketingBrandContract>
        <AdminMarketingBrandContractItem label="Tone" value="Warm and precise" />
        <AdminMarketingBrandContractItem label="Audience" value="Host operators" />
      </AdminMarketingBrandContract>
    </AdminWorkspace>
  ),
};

export const AdminMarketingBrandContractItemStory: Story = {
  name: "Brand contract item",
  parameters: {
    catchComponent: {
      id: "shared_admin_marketing_brand_contract_item",
      states: ["label-value"],
    },
  },
  render: () => (
    <AdminWorkspace>
      <AdminMarketingBrandContract>
        <AdminMarketingBrandContractItem label="Promise" value="Better event operations" />
      </AdminMarketingBrandContract>
    </AdminWorkspace>
  ),
};

export const AdminMarketingHelpTextStory: Story = {
  name: "Help text",
  parameters: {
    catchComponent: {
      id: "shared_admin_marketing_help_text",
      states: ["default"],
    },
  },
  render: () => (
    <AdminWorkspace>
      <AdminMarketingHelpText>
        Keep claims concrete and avoid promising attendance outcomes.
      </AdminMarketingHelpText>
    </AdminWorkspace>
  ),
};

export const AdminMarketingComplianceListStory: Story = {
  name: "Compliance list",
  parameters: {
    catchComponent: {
      id: "shared_admin_marketing_compliance_list",
      states: ["checks"],
    },
  },
  render: () => (
    <AdminWorkspace>
      <AdminMarketingComplianceList>
        <QualityRow icon={<CheckCircle2 size={16} />} tone="success">
          <strong>No sensitive targeting copy</strong>
          <span>Approved for review.</span>
        </QualityRow>
        <QualityRow icon={<CheckCircle2 size={16} />} tone="success">
          <strong>Brand language aligned</strong>
          <span>Uses host-facing terms.</span>
        </QualityRow>
      </AdminMarketingComplianceList>
    </AdminWorkspace>
  ),
};

export const AdminMarketingEventLibraryGridStory: Story = {
  name: "Event library grid",
  parameters: {
    catchComponent: {
      id: "shared_admin_marketing_event_library_grid",
      states: ["cards"],
    },
  },
  render: () => (
    <AdminWorkspace>
      <AdminMarketingEventLibraryGrid>
        <AdminMarketingLibraryCard
          action={<AdminMarketingCardLink href="#event">Open</AdminMarketingCardLink>}
          description="Launch-week dinner event with verified host assets."
          eyebrow="Event"
          title="Singles dinner"
        />
        <AdminMarketingLibraryCard
          description="Recurring mixer proof point for host education."
          eyebrow="Event"
          title="After-work mixer"
        />
      </AdminMarketingEventLibraryGrid>
    </AdminWorkspace>
  ),
};

export const AdminMarketingLibraryCardStory: Story = {
  name: "Library card",
  parameters: {
    catchComponent: {
      id: "shared_admin_marketing_library_card",
      states: ["with-action", "with-children"],
    },
  },
  render: () => (
    <AdminWorkspace>
      <AdminMarketingLibraryCard
        action={<AdminMarketingCardLink href="#library-card">Use asset</AdminMarketingCardLink>}
        description="Source-backed organizer profile for launch copy."
        eyebrow="Organizer"
        title="Afterfly Social"
      >
        <AdminTagList>
          <CatchBadge label="claim ready" />
          <CatchBadge tone="success" label="verified" />
        </AdminTagList>
      </AdminMarketingLibraryCard>
    </AdminWorkspace>
  ),
};

export const AdminMarketingCardLinkStory: Story = {
  name: "Card link",
  parameters: {
    catchComponent: {
      id: "shared_admin_marketing_card_link",
      states: ["text", "icon"],
    },
  },
  render: () => (
    <AdminWorkspace>
      <AdminMarketingCardLink href="#card-link">Open asset</AdminMarketingCardLink>
      <AdminMarketingCardLink href="#download" icon={<Download size={16} />} label="Download asset" variant="icon" />
    </AdminWorkspace>
  ),
};

export const AdminMarketingMediaGridStory: Story = {
  name: "Media grid",
  parameters: {
    catchComponent: {
      id: "shared_admin_marketing_media_grid",
      states: ["media-cards"],
    },
  },
  render: () => (
    <AdminWorkspace>
      <AdminMarketingMediaGrid>
        <AdminMarketingMediaCard
          description="App capture approved for host landing page."
          eyebrow="Capture"
          previewAlt="Host console capture"
          previewFallback={<EmptyState>Missing preview</EmptyState>}
          previewSrc={imageData}
          title="Host live console"
        />
        <AdminMarketingMediaCard
          description="Fallback state when no capture is available."
          eyebrow="Capture"
          previewAlt="Missing capture"
          previewFallback={<EmptyState icon={<ImageIcon size={16} />}>No image</EmptyState>}
          previewSrc={null}
          title="Pending capture"
        />
      </AdminMarketingMediaGrid>
    </AdminWorkspace>
  ),
};

export const AdminMarketingMediaCardStory: Story = {
  name: "Media card",
  parameters: {
    catchComponent: {
      id: "shared_admin_marketing_media_card",
      states: ["image", "fallback"],
    },
  },
  render: () => (
    <AdminWorkspace>
      <AdminMarketingMediaCard
        description="Use for product proof in host acquisition."
        eyebrow="Capture"
        previewAlt="Marketing capture"
        previewFallback={<EmptyState>Missing image</EmptyState>}
        previewSrc={imageData}
        title="Product proof"
      >
        <AdminMarketingCardLink href="#media">Inspect</AdminMarketingCardLink>
      </AdminMarketingMediaCard>
    </AdminWorkspace>
  ),
};

export const AdminMarketingNewPostGridStory: Story = {
  name: "New post grid",
  parameters: {
    catchComponent: {
      id: "shared_admin_marketing_new_post_grid",
      states: ["cards"],
    },
  },
  render: () => (
    <AdminWorkspace>
      <AdminMarketingNewPostGrid>
        <AdminMarketingNewPostCard
          accent="event"
          actionLabel="Create event post"
          description="Turn verified event evidence into a launch post."
          label="Event proof"
          meta="Event"
        />
        <AdminMarketingNewPostCard
          accent="feature"
          actionLabel="Create feature post"
          description="Explain a product workflow with app captures."
          label="Feature story"
          meta="Feature"
        />
      </AdminMarketingNewPostGrid>
    </AdminWorkspace>
  ),
};

export const AdminMarketingNewPostCardStory: Story = {
  name: "New post card",
  parameters: {
    catchComponent: {
      id: "shared_admin_marketing_new_post_card",
      states: ["event", "feature", "soon"],
    },
  },
  render: () => (
    <AdminWorkspace>
      <AdminMarketingNewPostCard
        accent="event"
        actionLabel="Start"
        description="Build from a verified event."
        label="Event proof"
        meta="Event"
      />
      <AdminMarketingNewPostCard
        accent="feature"
        actionLabel="Start"
        description="Build from app media."
        label="Feature story"
        meta="Feature"
      />
      <AdminMarketingNewPostCard
        accent="soon"
        actionLabel="Queued"
        description="Template coming later."
        label="Launch recap"
        meta="Soon"
      />
    </AdminWorkspace>
  ),
};

export const AdminMarketingGuideLayoutStory: Story = {
  name: "Guide layout",
  parameters: {
    catchComponent: {
      id: "shared_admin_marketing_guide_layout",
      states: ["deliverables"],
    },
  },
  render: () => (
    <AdminWorkspace>
      <AdminMarketingGuideLayout>
        <AdminMarketingDeliverable>
          <strong>Primary post</strong>
          <span>Host acquisition copy and app capture.</span>
        </AdminMarketingDeliverable>
        <AdminMarketingDeliverable>
          <strong>Carousel</strong>
          <span>Three proof slides.</span>
        </AdminMarketingDeliverable>
      </AdminMarketingGuideLayout>
    </AdminWorkspace>
  ),
};

export const AdminMarketingDeliverableStory: Story = {
  name: "Deliverable",
  parameters: {
    catchComponent: {
      id: "shared_admin_marketing_deliverable",
      states: ["default"],
    },
  },
  render: () => (
    <AdminWorkspace>
      <AdminMarketingDeliverable>
        <strong>Instagram caption</strong>
        <span>Ready for final review.</span>
      </AdminMarketingDeliverable>
    </AdminWorkspace>
  ),
};

export const AdminMarketingStackedSectionsStory: Story = {
  name: "Stacked sections",
  parameters: {
    catchComponent: {
      id: "shared_admin_marketing_stacked_sections",
      states: ["sections"],
    },
  },
  render: () => (
    <AdminWorkspace>
      <AdminMarketingStackedSections>
        <AdminMarketingSection title="Copy">Draft caption and CTA.</AdminMarketingSection>
        <AdminMarketingSection title="Assets">Capture and source images.</AdminMarketingSection>
      </AdminMarketingStackedSections>
    </AdminWorkspace>
  ),
};

export const AdminMarketingPanelStory: Story = {
  name: "Marketing panel",
  parameters: {
    catchComponent: {
      id: "shared_admin_marketing_panel",
      states: ["default", "action"],
    },
  },
  render: () => (
    <AdminWorkspace>
      <AdminMarketingPanel
        action={<AdminButton>Open</AdminButton>}
        icon={<Megaphone size={18} />}
        title="Copy review"
      >
        <QualityList>
          <QualityRow icon={<CheckCircle2 size={16} />} tone="success">
            <strong>Approved language</strong>
            <span>No policy-sensitive claims.</span>
          </QualityRow>
        </QualityList>
      </AdminMarketingPanel>
    </AdminWorkspace>
  ),
};

export const AdminMarketingTitleInputStory: Story = {
  name: "Title input",
  parameters: {
    catchComponent: {
      id: "shared_admin_marketing_title_input",
      states: ["default"],
    },
  },
  render: () => (
    <AdminWorkspace>
      <AdminMarketingTitleInput ariaLabel="Draft title" value="Host launch post" onChange={() => undefined} />
    </AdminWorkspace>
  ),
};

export const AdminMarketingSectionStory: Story = {
  name: "Marketing section",
  parameters: {
    catchComponent: {
      id: "shared_admin_marketing_section",
      states: ["with-meta", "content"],
    },
  },
  render: () => (
    <AdminWorkspace>
      <AdminMarketingSection meta={<CatchBadge tone="success" label="Ready" />} title="Caption">
        <AdminMarketingHelpText>Host-facing copy is ready for export.</AdminMarketingHelpText>
      </AdminMarketingSection>
    </AdminWorkspace>
  ),
};

export const AdminMarketingSectionHeaderStory: Story = {
  name: "Marketing section header",
  parameters: {
    catchComponent: {
      id: "shared_admin_marketing_section_header",
      states: ["title", "meta"],
    },
  },
  render: () => (
    <AdminWorkspace>
      <AdminMarketingSectionHeader meta={<CatchBadge label="Draft" />} title="Visual direction" />
    </AdminWorkspace>
  ),
};

export const AdminMarketingAppCapturePreviewStory: Story = {
  name: "App capture preview",
  parameters: {
    catchComponent: {
      id: "shared_admin_marketing_app_capture_preview",
      states: ["image"],
    },
  },
  render: () => (
    <AdminWorkspace>
      <AdminMarketingAppCapturePreview alt="Host console capture" src={imageData} />
    </AdminWorkspace>
  ),
};

export const AdminMarketingAppMediaPathsStory: Story = {
  name: "App media paths",
  parameters: {
    catchComponent: {
      id: "shared_admin_marketing_app_media_paths",
      states: ["with-web-path", "without-web-path"],
    },
  },
  render: () => (
    <AdminWorkspace>
      <AdminMarketingAppMediaPaths
        sourcePath="design_context_pack/app_media/host_console.png"
        webPath="/assets/marketing/host-console.jpg"
        websitePath="website/public/assets/marketing/host-console.jpg"
      />
      <AdminMarketingAppMediaPaths
        sourcePath="design_context_pack/app_media/pending.png"
        websitePath="website/public/assets/marketing/pending.jpg"
      />
    </AdminWorkspace>
  ),
};

export const AdminMarketingSlideListStory: Story = {
  name: "Slide list",
  parameters: {
    catchComponent: {
      id: "shared_admin_marketing_slide_list",
      states: ["multiple", "single"],
    },
  },
  render: () => (
    <AdminWorkspace>
      <AdminMarketingSlideList>
        <AdminMarketingPreviewSlide>Slide one</AdminMarketingPreviewSlide>
        <AdminMarketingPreviewSlide>Slide two</AdminMarketingPreviewSlide>
      </AdminMarketingSlideList>
      <AdminMarketingSlideList single>
        <AdminMarketingPreviewSlide>Single slide</AdminMarketingPreviewSlide>
      </AdminMarketingSlideList>
    </AdminWorkspace>
  ),
};

export const AdminMarketingSlideEditorStory: Story = {
  name: "Slide editor",
  parameters: {
    catchComponent: {
      id: "shared_admin_marketing_slide_editor",
      states: ["topline-and-fields"],
    },
  },
  render: () => (
    <AdminWorkspace>
      <AdminMarketingSlideEditor>
        <AdminMarketingSlideEditorTopline>
          <strong>Slide 1</strong>
          <CatchBadge label="Draft" />
        </AdminMarketingSlideEditorTopline>
        <CatchField
          recipe="input"
          title="Slide copy"
          maxLines={3}
          value="Invite the right crowd."
          onChanged={() => undefined}
        />
      </AdminMarketingSlideEditor>
    </AdminWorkspace>
  ),
};

export const AdminMarketingSlideEditorToplineStory: Story = {
  name: "Slide editor topline",
  parameters: {
    catchComponent: {
      id: "shared_admin_marketing_slide_editor_topline",
      states: ["title-status"],
    },
  },
  render: () => (
    <AdminWorkspace>
      <AdminMarketingSlideEditorTopline>
        <strong>Slide 2</strong>
        <CatchBadge tone="success" label="Ready" />
      </AdminMarketingSlideEditorTopline>
    </AdminWorkspace>
  ),
};

export const AdminMarketingRecommendationListStory: Story = {
  name: "Recommendation list",
  parameters: {
    catchComponent: {
      id: "shared_admin_marketing_recommendation_list",
      states: ["items"],
    },
  },
  render: () => (
    <AdminWorkspace>
      <AdminMarketingRecommendationList>
        <AdminMarketingRecommendationItem>Use a product proof image first.</AdminMarketingRecommendationItem>
        <AdminMarketingRecommendationItem>Keep CTA host-facing.</AdminMarketingRecommendationItem>
      </AdminMarketingRecommendationList>
    </AdminWorkspace>
  ),
};

export const AdminMarketingRecommendationItemStory: Story = {
  name: "Recommendation item",
  parameters: {
    catchComponent: {
      id: "shared_admin_marketing_recommendation_item",
      states: ["default"],
    },
  },
  render: () => (
    <AdminWorkspace>
      <AdminMarketingRecommendationItem>
        Swap broad social copy for concrete host operations value.
      </AdminMarketingRecommendationItem>
    </AdminWorkspace>
  ),
};

export const AdminMarketingAuditListStory: Story = {
  name: "Audit list",
  parameters: {
    catchComponent: {
      id: "shared_admin_marketing_audit_list",
      states: ["rows"],
    },
  },
  render: () => (
    <AdminWorkspace>
      <AdminMarketingAuditList>
        <AdminMarketingAuditRow>Copy reviewed by growth ops.</AdminMarketingAuditRow>
        <AdminMarketingAuditRow>Image source approved.</AdminMarketingAuditRow>
      </AdminMarketingAuditList>
    </AdminWorkspace>
  ),
};

export const AdminMarketingAuditRowStory: Story = {
  name: "Audit row",
  parameters: {
    catchComponent: {
      id: "shared_admin_marketing_audit_row",
      states: ["default"],
    },
  },
  render: () => (
    <AdminWorkspace>
      <AdminMarketingAuditRow>Export approved by reviewer.</AdminMarketingAuditRow>
    </AdminWorkspace>
  ),
};

export const AdminMarketingPreviewShellStory: Story = {
  name: "Preview shell",
  parameters: {
    catchComponent: {
      id: "shared_admin_marketing_preview_shell",
      states: ["toolbar-and-copy"],
    },
  },
  render: () => (
    <AdminWorkspace>
      <AdminMarketingPreviewShell>
        <AdminMarketingPreviewToolbar>
          <AdminEyebrow as="span">Preview</AdminEyebrow>
          <AdminMarketingPreviewActions>
            <AdminButton>Copy</AdminButton>
            <AdminButton variant="primary">Export</AdminButton>
          </AdminMarketingPreviewActions>
        </AdminMarketingPreviewToolbar>
        <AdminMarketingPreviewCopy>Host better events with less operational drag.</AdminMarketingPreviewCopy>
      </AdminMarketingPreviewShell>
    </AdminWorkspace>
  ),
};

export const AdminMarketingPreviewToolbarStory: Story = {
  name: "Preview toolbar",
  parameters: {
    catchComponent: {
      id: "shared_admin_marketing_preview_toolbar",
      states: ["actions"],
    },
  },
  render: () => (
    <AdminWorkspace>
      <AdminMarketingPreviewToolbar>
        <AdminEyebrow as="span">Preview</AdminEyebrow>
        <AdminMarketingPreviewActions>
          <AdminButton>Copy</AdminButton>
          <AdminButton>Download</AdminButton>
        </AdminMarketingPreviewActions>
      </AdminMarketingPreviewToolbar>
    </AdminWorkspace>
  ),
};

export const AdminMarketingPreviewActionsStory: Story = {
  name: "Preview actions",
  parameters: {
    catchComponent: {
      id: "shared_admin_marketing_preview_actions",
      states: ["buttons"],
    },
  },
  render: () => (
    <AdminWorkspace>
      <AdminMarketingPreviewActions>
        <AdminButton>Copy</AdminButton>
        <AdminButton variant="primary">Export</AdminButton>
      </AdminMarketingPreviewActions>
    </AdminWorkspace>
  ),
};

export const AdminMarketingCarouselPreviewStory: Story = {
  name: "Carousel preview",
  parameters: {
    catchComponent: {
      id: "shared_admin_marketing_carousel_preview",
      states: ["slides"],
    },
  },
  render: () => (
    <AdminWorkspace>
      <AdminMarketingCarouselPreview>
        <AdminMarketingPreviewSlide hasImage>
          <AdminMarketingPreviewImage alt="Slide asset" src={imageData} />
          <AdminMarketingPreviewCopy>Launch with verified event proof.</AdminMarketingPreviewCopy>
        </AdminMarketingPreviewSlide>
        <AdminMarketingPreviewSlide>
          <AdminMarketingPreviewCopy>Show host operations value.</AdminMarketingPreviewCopy>
        </AdminMarketingPreviewSlide>
      </AdminMarketingCarouselPreview>
    </AdminWorkspace>
  ),
};

export const AdminMarketingPreviewSlideStory: Story = {
  name: "Preview slide",
  parameters: {
    catchComponent: {
      id: "shared_admin_marketing_preview_slide",
      states: ["text", "image"],
    },
  },
  render: () => (
    <AdminWorkspace>
      <AdminMarketingPreviewSlide hasImage>
        <AdminMarketingPreviewImage alt="Preview image" src={imageData} />
        <AdminMarketingPreviewCopy>Proof-led launch slide.</AdminMarketingPreviewCopy>
      </AdminMarketingPreviewSlide>
    </AdminWorkspace>
  ),
};

export const AdminMarketingPreviewMetaStory: Story = {
  name: "Preview meta",
  parameters: {
    catchComponent: {
      id: "shared_admin_marketing_preview_meta",
      states: ["rows"],
    },
  },
  render: () => (
    <AdminWorkspace>
      <AdminMarketingPreviewMeta>
        <AdminStateRow label="Channel" value="Instagram" />
        <AdminStateRow label="Status" value="Ready" />
      </AdminMarketingPreviewMeta>
    </AdminWorkspace>
  ),
};

export const AdminMarketingPreviewImageStory: Story = {
  name: "Preview image",
  parameters: {
    catchComponent: {
      id: "shared_admin_marketing_preview_image",
      states: ["image"],
    },
  },
  render: () => (
    <AdminWorkspace>
      <AdminMarketingPreviewImage alt="Preview asset" src={imageData} />
    </AdminWorkspace>
  ),
};

export const AdminMarketingPreviewBrandNoteStory: Story = {
  name: "Preview brand note",
  parameters: {
    catchComponent: {
      id: "shared_admin_marketing_preview_brand_note",
      states: ["default"],
    },
  },
  render: () => (
    <AdminWorkspace>
      <AdminMarketingPreviewBrandNote>
        Keep voice concrete, warm, and operationally specific.
      </AdminMarketingPreviewBrandNote>
    </AdminWorkspace>
  ),
};

export const AdminMarketingPreviewCopyStory: Story = {
  name: "Preview copy",
  parameters: {
    catchComponent: {
      id: "shared_admin_marketing_preview_copy",
      states: ["short", "long"],
    },
  },
  render: () => (
    <AdminWorkspace>
      <AdminMarketingPreviewCopy>Run better events with less manual overhead.</AdminMarketingPreviewCopy>
      <AdminMarketingPreviewCopy>
        Catch helps hosts keep guest lists, payments, and event communication in one place.
      </AdminMarketingPreviewCopy>
    </AdminWorkspace>
  ),
};

export const AdminMarketingExportStatusStory: Story = {
  name: "Export status",
  parameters: {
    catchComponent: {
      id: "shared_admin_marketing_export_status",
      states: ["success", "error"],
    },
  },
  render: () => (
    <AdminWorkspace>
      <AdminMarketingExportStatus>Export package ready.</AdminMarketingExportStatus>
      <AdminMarketingExportStatus tone="error">Missing required image alt text.</AdminMarketingExportStatus>
    </AdminWorkspace>
  ),
};

export const AdminMarketingImageEditorStory: Story = {
  name: "Image editor",
  parameters: {
    catchComponent: {
      id: "shared_admin_marketing_image_editor",
      states: ["controls-and-review"],
    },
  },
  render: () => (
    <AdminWorkspace>
      <AdminMarketingImageEditor>
        <AdminMarketingImageEditorHeader>
          <strong>Image review</strong>
          <CatchBadge label="Draft" />
        </AdminMarketingImageEditorHeader>
        <AdminMarketingImageControls>
          <AdminMarketingFilePickerButton icon={<Upload size={16} />} inputLabel="Upload marketing image">
            Upload image
          </AdminMarketingFilePickerButton>
          <AdminButton>Regenerate alt text</AdminButton>
        </AdminMarketingImageControls>
        <AdminMarketingImageReviewRow>
          <AdminMarketingImageThumb alt="Selected image" src={imageData} />
          <AdminMarketingImageMetaFields>
            <AdminMarketingTitleInput ariaLabel="Alt text" value="Host dashboard preview" onChange={() => undefined} />
          </AdminMarketingImageMetaFields>
        </AdminMarketingImageReviewRow>
      </AdminMarketingImageEditor>
    </AdminWorkspace>
  ),
};

export const AdminMarketingImageEditorHeaderStory: Story = {
  name: "Image editor header",
  parameters: {
    catchComponent: {
      id: "shared_admin_marketing_image_editor_header",
      states: ["title-status"],
    },
  },
  render: () => (
    <AdminWorkspace>
      <AdminMarketingImageEditorHeader>
        <strong>Visual review</strong>
        <CatchBadge tone="success" label="Ready" />
      </AdminMarketingImageEditorHeader>
    </AdminWorkspace>
  ),
};

export const AdminMarketingImageControlsStory: Story = {
  name: "Image controls",
  parameters: {
    catchComponent: {
      id: "shared_admin_marketing_image_controls",
      states: ["buttons"],
    },
  },
  render: () => (
    <AdminWorkspace>
      <AdminMarketingImageControls>
        <AdminMarketingFilePickerButton icon={<Upload size={16} />} inputLabel="Upload image">
          Upload
        </AdminMarketingFilePickerButton>
        <AdminButton icon={<Sparkles size={16} />}>Polish</AdminButton>
      </AdminMarketingImageControls>
    </AdminWorkspace>
  ),
};

export const AdminMarketingFilePickerButtonStory: Story = {
  name: "Marketing file picker",
  parameters: {
    catchComponent: {
      id: "shared_admin_marketing_file_picker_button",
      states: ["default"],
    },
  },
  render: () => (
    <AdminWorkspace>
      <AdminMarketingFilePickerButton icon={<Upload size={16} />} inputLabel="Upload image">
        Upload image
      </AdminMarketingFilePickerButton>
    </AdminWorkspace>
  ),
};

export const AdminMarketingImageReviewRowStory: Story = {
  name: "Image review row",
  parameters: {
    catchComponent: {
      id: "shared_admin_marketing_image_review_row",
      states: ["thumb-and-meta"],
    },
  },
  render: () => (
    <AdminWorkspace>
      <AdminMarketingImageReviewRow>
        <AdminMarketingImageThumb alt="Review thumb" src={imageData} />
        <AdminMarketingImageMetaFields>
          <AdminStateRow label="Source" value="App capture" />
          <AdminStateRow label="Status" value="Ready" />
        </AdminMarketingImageMetaFields>
      </AdminMarketingImageReviewRow>
    </AdminWorkspace>
  ),
};

export const AdminMarketingImageThumbStory: Story = {
  name: "Image thumb",
  parameters: {
    catchComponent: {
      id: "shared_admin_marketing_image_thumb",
      states: ["image"],
    },
  },
  render: () => (
    <AdminWorkspace>
      <AdminMarketingImageThumb alt="Thumbnail" src={imageData} />
    </AdminWorkspace>
  ),
};

export const AdminMarketingImageMetaFieldsStory: Story = {
  name: "Image meta fields",
  parameters: {
    catchComponent: {
      id: "shared_admin_marketing_image_meta_fields",
      states: ["fields"],
    },
  },
  render: () => (
    <AdminWorkspace>
      <AdminMarketingImageMetaFields>
        <AdminMarketingTitleInput ariaLabel="Image title" value="Host console proof" onChange={() => undefined} />
        <CatchField
          recipe="select"
          title="Usage"
          values={["hero", "carousel"]}
          itemLabelBuilder={(item) => item === "hero" ? "Hero" : "Carousel"}
          value="carousel"
        />
      </AdminMarketingImageMetaFields>
    </AdminWorkspace>
  ),
};

export const AdminMarketingImageSourceNoteStory: Story = {
  name: "Image source note",
  parameters: {
    catchComponent: {
      id: "shared_admin_marketing_image_source_note",
      states: ["default"],
    },
  },
  render: () => (
    <AdminWorkspace>
      <AdminMarketingImageSourceNote>
        Source image synced from the app media pipeline.
      </AdminMarketingImageSourceNote>
    </AdminWorkspace>
  ),
};

export const AdminMarketingImageEmptyStory: Story = {
  name: "Image empty",
  parameters: {
    catchComponent: {
      id: "shared_admin_marketing_image_empty",
      states: ["default"],
    },
  },
  render: () => (
    <AdminWorkspace>
      <AdminMarketingImageEmpty>
        <FileImage size={18} />
        <span>No image selected.</span>
      </AdminMarketingImageEmpty>
    </AdminWorkspace>
  ),
};
