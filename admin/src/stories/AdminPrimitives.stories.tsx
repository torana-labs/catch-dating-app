import {CatchBadge, CatchField} from "@catch/web-ui";
import {useState} from "react";
import type {Meta, StoryObj} from "@storybook/react-vite";
import {
  Bell,
  CalendarDays,
  CheckCircle2,
  Download,
  FileWarning,
  Home,
  Lock,
  RefreshCw,
  Search as SearchIcon,
  Settings,
  ShieldCheck,
  Sparkles,
  Users,
} from "lucide-react";
import {
  AdminAccountMenu,
  AdminAppShell,
  AdminBrandBlock,
  AdminBrandCopy,
  AdminBrandMark,
  AdminBrandTitle,
  AdminButton,
  AdminCard,
  AdminCardList,
  AdminDecisionFooterShell,
  AdminDetailScreenStack,
  AdminDirectoryScreenStack,
  AdminEnvironmentStatus,
  AdminEyebrow,
  AdminFeatureLoadingState,
  AdminFieldGrid,
  AdminForm,
  AdminIconButton,
  AdminLinkButton,
  AdminLoadingIcon,
  AdminMetricCard,
  AdminMetricGrid,
  AdminSectionCaption,
  AdminNavButton,
  AdminNavGroup,
  AdminNavList,
  AdminPanel,
  AdminProfilePhotoGrid,
  AdminRowTitle,
  AdminSecondaryDisclosure,
  AdminSidebar,
  AdminSidebarToggle,
  AdminSignInActions,
  AdminSignInMeta,
  AdminSignInPanel,
  AdminSignInScreen,
  AdminStateRow,
  AdminStatGrid,
  AdminStatusGrid,
  AdminTableRow,
  AdminTagList,
  AdminTagRow,
  AdminToolbar,
  AdminTopbar,
  AdminTopbarActions,
  AdminTrendSeries,
  AdminWorkbenchNote,
  AdminWorkbenchStack,
  AdminWorkspace,
  AlertRow,
  CardHeader,
  CheckboxField,
  DataTable,
  EmptyState,
  FilePickerButton,
  InlineTextField,
  PageHeader,
  QualityList,
  QualityRow,
  SearchField,
  SegmentedControl,
  SelectableCardButton,
  StatusBanner,
  TableActionButton,
  TagList,
} from "../shared/ui/AdminPrimitives";

const meta = {
  title: "Admin Dashboard/Shared Primitives",
  parameters: {
    catchComponentRegistry: {
      path: "design/admin/components.json",
    },
  },
} satisfies Meta;

export default meta;

type Story = StoryObj<typeof meta>;

function CollapsibleAdminShellPreview() {
  const [isCollapsed, setIsCollapsed] = useState(false);

  return (
    <AdminAppShell sidebarCollapsed={isCollapsed}>
      <AdminSidebar aria-label="Admin preview sections" id="admin-preview-sidebar">
        <AdminBrandBlock>
          <AdminBrandMark>C</AdminBrandMark>
          <AdminBrandCopy>
            <AdminBrandTitle>Catch Admin</AdminBrandTitle>
          </AdminBrandCopy>
        </AdminBrandBlock>
        <AdminNavList aria-label="Admin preview navigation">
          <AdminNavButton
            icon={<Home size={16} />}
            label="Overview"
            selected
            title={isCollapsed ? "Overview" : undefined}
          />
          <AdminNavButton
            icon={<Users size={16} />}
            label="Organizers"
            selected={false}
            title={isCollapsed ? "Organizers" : undefined}
          />
        </AdminNavList>
        <AdminSidebarToggle
          collapsed={isCollapsed}
          controlsId="admin-preview-sidebar"
          onCollapsedChange={setIsCollapsed}
        />
      </AdminSidebar>
      <AdminWorkspace>
        <AdminTopbar>
          <h1>Overview</h1>
          <AdminTopbarActions>
            <AdminEnvironmentStatus environment="dev" />
            <AdminAccountMenu
              mode="sample"
              roles={[]}
              userLabel="Local preview"
            />
          </AdminTopbarActions>
        </AdminTopbar>
        <PageHeader eyebrow="Preview" title="Registered app shell">
          Collapse the sidebar to give the active workspace more room.
        </PageHeader>
      </AdminWorkspace>
    </AdminAppShell>
  );
}

export const PageHeaderStory: Story = {
  name: "Page header",
  parameters: {
    catchComponent: {
      id: "shared_page_header",
      states: ["default", "with-actions"],
    },
  },
  render: () => (
    <AdminWorkspace>
      <PageHeader
        actions={<AdminButton>Refresh queue</AdminButton>}
        eyebrow="Admin operations"
        title="Organizer publishing"
      >
        Review profile readiness, policy gaps, and public directory status before
        publishing.
      </PageHeader>
    </AdminWorkspace>
  ),
};

export const MetricGridStory: Story = {
  name: "Metric grid",
  parameters: {
    catchComponent: {
      id: "shared_admin_metric_grid",
      states: ["default", "attention", "explicit-columns"],
    },
  },
  render: () => (
    <AdminWorkspace>
      <AdminSectionCaption eyebrow="Queue health">
        Complete totals with short ownership and scope notes.
      </AdminSectionCaption>
      <AdminMetricGrid ariaLabel="Publishing metrics" columns={3}>
        <AdminMetricCard
          caption="Ready for final review"
          footer="owned by Publishing"
          label="Profiles"
          value="18"
        />
        <AdminMetricCard
          caption="Needs source follow-up"
          footer="owned by Supply"
          label="Blocked"
          tone="attention"
          value="4"
        />
        <AdminMetricCard
          caption="Imported this week"
          footer="owned by Intake"
          label="New leads"
          value="31"
          variant="tile"
        />
      </AdminMetricGrid>
    </AdminWorkspace>
  ),
};

export const AdminSectionCaptionStory: Story = {
  name: "Section caption",
  parameters: {
    catchComponent: {
      id: "shared_admin_section_caption",
      states: ["eyebrow-and-scope"],
    },
  },
  render: () => (
    <AdminWorkspace>
      <AdminSectionCaption eyebrow="Analytics scope">
        These controls affect only the charts below.
      </AdminSectionCaption>
    </AdminWorkspace>
  ),
};

export const MetricCardStory: Story = {
  name: "Metric card",
  parameters: {
    catchComponent: {
      id: "shared_admin_metric_card",
      states: [
        "card",
        "tile",
        "attention",
        "supporting-copy",
        "ownership-footer",
      ],
    },
  },
  render: () => (
    <AdminWorkspace>
      <AdminMetricCard
        caption="Ready for final review"
        footer="owned by Publishing"
        label="Profiles"
        value="18"
      />
      <AdminMetricCard
        caption="Needs source follow-up"
        label="Blocked"
        tone="attention"
        value="4"
      />
      <AdminMetricCard
        caption="Imported this week"
        label="New leads"
        value="31"
        variant="tile"
      />
    </AdminWorkspace>
  ),
};

export const StatusBannerStory: Story = {
  name: "Status banner",
  parameters: {
    catchComponent: {
      id: "shared_status_banner",
      states: ["success", "error"],
    },
  },
  render: () => (
    <AdminWorkspace>
      <StatusBanner icon={<CheckCircle2 aria-hidden="true" />} tone="success">
        Public listing draft saved and queued for publish review.
      </StatusBanner>
      <StatusBanner icon={<FileWarning aria-hidden="true" />} tone="error">
        Missing canonical source URL. Add evidence before approving.
      </StatusBanner>
    </AdminWorkspace>
  ),
};

export const AdminCardStory: Story = {
  name: "Card",
  parameters: {
    catchComponent: {
      id: "shared_admin_card",
      states: ["marketing", "intake"],
    },
  },
  render: () => (
    <AdminWorkspace>
      <AdminCard>
        <h3>Marketing card shell</h3>
        <p>Use for repeatable admin workbench cards and list items.</p>
      </AdminCard>
      <AdminCard variant="intake">
        <h3>Intake card shell</h3>
        <p>Use for source review and publication workflow content.</p>
      </AdminCard>
    </AdminWorkspace>
  ),
};

export const DataTableStory: Story = {
  name: "Data table",
  parameters: {
    catchComponent: {
      id: "shared_data_table",
      states: ["default", "selected"],
    },
  },
  render: () => (
    <AdminWorkspace>
      <DataTable ariaLabel="Organizer queue">
        <thead>
          <tr>
            <th>Organizer</th>
            <th>Status</th>
            <th>Owner</th>
          </tr>
        </thead>
        <tbody>
          <AdminTableRow selected>
            <td>Afterfly Social</td>
            <td>Ready</td>
            <td>Ops</td>
          </AdminTableRow>
          <AdminTableRow>
            <td>City Supper Club</td>
            <td>Needs source</td>
            <td>Growth</td>
          </AdminTableRow>
        </tbody>
      </DataTable>
    </AdminWorkspace>
  ),
};

export const AdminAppShellStory: Story = {
  name: "App shell",
  parameters: {
    catchComponent: {
      id: "shared_admin_app_shell",
      states: ["expanded", "collapsed", "workspace"],
    },
  },
  render: () => <CollapsibleAdminShellPreview />,
};

export const AdminSidebarStory: Story = {
  name: "Sidebar",
  parameters: {
    catchComponent: {
      id: "shared_admin_sidebar",
      states: ["expanded", "collapsed", "navigation"],
    },
  },
  render: () => <CollapsibleAdminShellPreview />,
};

export const AdminSidebarToggleStory: Story = {
  name: "Sidebar toggle",
  parameters: {
    catchComponent: {
      id: "shared_admin_sidebar_toggle",
      states: ["expanded", "collapsed"],
    },
  },
  render: () => <CollapsibleAdminShellPreview />,
};

export const AdminBrandBlockStory: Story = {
  name: "Brand block",
  parameters: {
    catchComponent: {
      id: "shared_admin_brand_block",
      states: ["default"],
    },
  },
  render: () => (
    <AdminWorkspace>
      <AdminBrandBlock>
        <AdminBrandMark size="large">C</AdminBrandMark>
        <AdminBrandCopy>
          <AdminBrandTitle>Catch Admin</AdminBrandTitle>
        </AdminBrandCopy>
      </AdminBrandBlock>
    </AdminWorkspace>
  ),
};

export const AdminBrandMarkStory: Story = {
  name: "Brand mark",
  parameters: {
    catchComponent: {
      id: "shared_admin_brand_mark",
      states: ["default", "large"],
    },
  },
  render: () => (
    <AdminWorkspace>
      <AdminBrandMark>C</AdminBrandMark>
      <AdminBrandMark size="large">C</AdminBrandMark>
    </AdminWorkspace>
  ),
};

export const AdminBrandCopyStory: Story = {
  name: "Brand copy",
  parameters: {
    catchComponent: {
      id: "shared_admin_brand_copy",
      states: ["title-only"],
    },
  },
  render: () => (
    <AdminWorkspace>
      <AdminBrandCopy>
        <AdminBrandTitle>Catch Admin</AdminBrandTitle>
      </AdminBrandCopy>
    </AdminWorkspace>
  ),
};

export const AdminBrandTitleStory: Story = {
  name: "Brand title",
  parameters: {
    catchComponent: {
      id: "shared_admin_brand_title",
      states: ["default"],
    },
  },
  render: () => (
    <AdminWorkspace>
      <AdminBrandTitle>Catch Admin</AdminBrandTitle>
    </AdminWorkspace>
  ),
};

export const AdminNavListStory: Story = {
  name: "Navigation list",
  parameters: {
    catchComponent: {
      id: "shared_admin_nav_list",
      states: ["selected", "unselected"],
    },
  },
  render: () => (
    <AdminSidebar>
      <AdminNavList aria-label="Admin sections">
        <AdminNavGroup label="Work queues">
          <AdminNavButton icon={<Home size={16} />} label="Overview" selected />
        </AdminNavGroup>
        <AdminNavGroup label="Supply">
          <AdminNavButton icon={<CalendarDays size={16} />} label="Events" selected={false} />
        </AdminNavGroup>
      </AdminNavList>
    </AdminSidebar>
  ),
};

export const AdminNavGroupStory: Story = {
  name: "Navigation group",
  parameters: {
    catchComponent: {
      id: "shared_admin_nav_group",
      states: ["label", "items"],
    },
  },
  render: () => (
    <AdminSidebar>
      <AdminNavGroup label="Growth & insights">
        <AdminNavButton icon={<Sparkles size={16} />} label="Growth" selected />
        <AdminNavButton icon={<Users size={16} />} label="Users" selected={false} />
      </AdminNavGroup>
    </AdminSidebar>
  ),
};

export const AdminNavButtonStory: Story = {
  name: "Navigation button",
  parameters: {
    catchComponent: {
      id: "shared_admin_nav_button",
      states: ["selected", "unselected"],
    },
  },
  render: () => (
    <AdminSidebar>
      <AdminNavButton icon={<Home size={16} />} label="Overview" selected />
      <AdminNavButton icon={<Settings size={16} />} label="Settings" selected={false} />
    </AdminSidebar>
  ),
};

export const AdminWorkspaceStory: Story = {
  name: "Workspace",
  parameters: {
    catchComponent: {
      id: "shared_admin_workspace",
      states: ["page-content"],
    },
  },
  render: () => (
    <AdminWorkspace>
      <PageHeader eyebrow="Workspace" title="Queue review">
        Route screens mount governed workspaces instead of custom main wrappers.
      </PageHeader>
      <AdminCard>
        <h3>Current queue</h3>
        <p>18 organizer records waiting for final review.</p>
      </AdminCard>
    </AdminWorkspace>
  ),
};

export const AdminTopbarStory: Story = {
  name: "Topbar",
  parameters: {
    catchComponent: {
      id: "shared_admin_topbar",
      states: ["status", "actions"],
    },
  },
  render: () => (
    <AdminWorkspace>
      <AdminTopbar>
        <h1>Organizers</h1>
        <AdminTopbarActions>
          <AdminEnvironmentStatus environment="staging" />
          <AdminAccountMenu
            mode="live"
            onSignOut={() => undefined}
            roles={["admin", "analyticsViewer"]}
            userLabel="+91 91314 04263"
          />
        </AdminTopbarActions>
      </AdminTopbar>
    </AdminWorkspace>
  ),
};

export const AdminTopbarActionsStory: Story = {
  name: "Topbar actions",
  parameters: {
    catchComponent: {
      id: "shared_admin_topbar_actions",
      states: ["controls"],
    },
  },
  render: () => (
    <AdminWorkspace>
      <AdminTopbarActions>
        <AdminButton icon={<SearchIcon size={16} />}>Lookup</AdminButton>
        <AdminButton variant="primary">Run check</AdminButton>
      </AdminTopbarActions>
    </AdminWorkspace>
  ),
};

export const AdminSignInScreenStory: Story = {
  name: "Sign in screen",
  parameters: {
    catchComponent: {
      id: "shared_admin_sign_in_screen",
      states: ["default", "phone-entry"],
    },
  },
  render: () => (
    <AdminSignInScreen>
      <AdminSignInPanel>
        <AdminBrandBlock>
          <AdminBrandMark size="large">C</AdminBrandMark>
          <AdminBrandCopy>
            <AdminBrandTitle>Catch Admin</AdminBrandTitle>
          </AdminBrandCopy>
        </AdminBrandBlock>
        <AdminSignInMeta>Use an account with approved admin claims.</AdminSignInMeta>
        <CatchField
          recipe="input"
          title="Phone number"
          onChanged={() => undefined}
          inputHint="+91 90000 00000"
          value=""
        />
        <AdminSignInActions>
          <AdminButton variant="primary">Send verification code</AdminButton>
        </AdminSignInActions>
      </AdminSignInPanel>
    </AdminSignInScreen>
  ),
};

export const AdminPhoneOtpSignInScreenStory: Story = {
  name: "Sign in screen · Phone verification",
  parameters: {
    catchComponent: {
      id: "shared_admin_sign_in_screen",
      states: ["phone-otp"],
    },
  },
  render: () => (
    <AdminSignInScreen>
      <AdminSignInPanel>
        <AdminBrandBlock>
          <AdminBrandMark size="large">C</AdminBrandMark>
          <AdminBrandCopy>
            <AdminBrandTitle>Catch Admin</AdminBrandTitle>
          </AdminBrandCopy>
        </AdminBrandBlock>
        <AdminSignInMeta>
          Verification code sent to +91 90000 00000.
        </AdminSignInMeta>
        <CatchField
          recipe="input"
          title="Verification code"
          maxLength={6}
          onChanged={() => undefined}
          inputHint="000000"
          value=""
          keyboardType="number"
        />
        <AdminSignInActions>
          <AdminButton variant="primary">Verify and sign in</AdminButton>
          <AdminButton>Use another phone</AdminButton>
        </AdminSignInActions>
      </AdminSignInPanel>
    </AdminSignInScreen>
  ),
};

export const AdminSignInPanelStory: Story = {
  name: "Sign in panel",
  parameters: {
    catchComponent: {
      id: "shared_admin_sign_in_panel",
      states: ["default"],
    },
  },
  render: () => (
    <AdminSignInScreen>
      <AdminSignInPanel>
        <AdminBrandTitle>Catch Admin</AdminBrandTitle>
        <AdminSignInMeta>Admin access is claim-gated.</AdminSignInMeta>
      </AdminSignInPanel>
    </AdminSignInScreen>
  ),
};

export const AdminSignInMetaStory: Story = {
  name: "Sign in meta",
  parameters: {
    catchComponent: {
      id: "shared_admin_sign_in_meta",
      states: ["default"],
    },
  },
  render: () => (
    <AdminSignInPanel>
      <AdminSignInMeta>Local preview data can bypass live authentication.</AdminSignInMeta>
    </AdminSignInPanel>
  ),
};

export const AdminSignInActionsStory: Story = {
  name: "Sign in actions",
  parameters: {
    catchComponent: {
      id: "shared_admin_sign_in_actions",
      states: ["primary", "secondary"],
    },
  },
  render: () => (
    <AdminSignInPanel>
      <AdminSignInActions>
        <AdminButton variant="primary">Sign in</AdminButton>
        <AdminButton>Open local preview</AdminButton>
      </AdminSignInActions>
    </AdminSignInPanel>
  ),
};

export const AdminAccountMenuStory: Story = {
  name: "Account menu",
  parameters: {
    catchComponent: {
      id: "shared_admin_account_menu",
      states: ["open", "role-summary", "sign-out"],
    },
  },
  render: () => (
    <AdminWorkspace>
      <AdminTopbar>
        <div />
        <AdminTopbarActions>
          <AdminAccountMenu
            defaultOpen
            mode="live"
            onSignOut={() => undefined}
            roles={["admin"]}
            userLabel="+91 91314 04263"
          />
        </AdminTopbarActions>
      </AdminTopbar>
    </AdminWorkspace>
  ),
};

export const AdminButtonStory: Story = {
  name: "Button",
  parameters: {
    catchComponent: {
      id: "shared_admin_button",
      states: ["ghost", "primary", "selected", "icon"],
    },
  },
  render: () => (
    <AdminWorkspace>
      <AdminButton>Ghost action</AdminButton>
      <AdminButton variant="primary">Primary action</AdminButton>
      <AdminButton selected>Selected action</AdminButton>
      <AdminButton icon={<RefreshCw size={16} />}>Refresh</AdminButton>
    </AdminWorkspace>
  ),
};

export const AdminIconButtonStory: Story = {
  name: "Icon button",
  parameters: {
    catchComponent: {
      id: "shared_admin_icon_button",
      states: ["default"],
    },
  },
  render: () => (
    <AdminWorkspace>
      <AdminIconButton label="Refresh queue">
        <RefreshCw size={16} />
      </AdminIconButton>
      <AdminIconButton label="Open settings">
        <Settings size={16} />
      </AdminIconButton>
    </AdminWorkspace>
  ),
};

export const AdminLinkButtonStory: Story = {
  name: "Link button",
  parameters: {
    catchComponent: {
      id: "shared_admin_link_button",
      states: ["ghost", "icon"],
    },
  },
  render: () => (
    <AdminWorkspace>
      <AdminLinkButton href="#admin-link">Open route</AdminLinkButton>
      <AdminLinkButton href="#download" icon={<Download size={16} />} label="Download CSV" variant="icon" />
    </AdminWorkspace>
  ),
};

export const FilePickerButtonStory: Story = {
  name: "File picker button",
  parameters: {
    catchComponent: {
      id: "shared_file_picker_button",
      states: ["default", "icon"],
    },
  },
  render: () => (
    <AdminWorkspace>
      <FilePickerButton icon={<Download size={16} />} inputLabel="Upload CSV">
        Upload CSV
      </FilePickerButton>
    </AdminWorkspace>
  ),
};

export const SearchFieldStory: Story = {
  name: "Search field",
  parameters: {
    catchComponent: {
      id: "shared_search_field",
      states: ["empty", "value", "icon"],
    },
  },
  render: () => (
    <AdminWorkspace>
      <SearchField ariaLabel="Search organizers" icon={<SearchIcon size={16} />} value="Afterfly" />
      <SearchField ariaLabel="Search empty queue" placeholder="Search by name, city, or source" value="" />
    </AdminWorkspace>
  ),
};

export const InlineTextFieldStory: Story = {
  name: "Inline text field",
  parameters: {
    catchComponent: {
      id: "shared_inline_text_field",
      states: ["default"],
    },
  },
  render: () => (
    <AdminWorkspace>
      <InlineTextField ariaLabel="Post title" onChange={() => undefined} value="Tonight in SoMa" />
    </AdminWorkspace>
  ),
};

export const SegmentedControlStory: Story = {
  name: "Segmented control",
  parameters: {
    catchComponent: {
      id: "shared_segmented_control",
      states: ["selected", "disabled-option"],
    },
  },
  render: () => (
    <AdminWorkspace>
      <SegmentedControl
        ariaLabel="Queue filter"
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

export const AdminFormStory: Story = {
  name: "Form",
  parameters: {
    catchComponent: {
      id: "shared_admin_form",
      states: ["default", "publishing"],
    },
  },
  render: () => (
    <AdminWorkspace>
      <AdminForm onSubmit={(event) => event.preventDefault()}>
        <AdminFieldGrid>
          <CatchField
            recipe="input"
            title="Organizer"
            onChanged={() => undefined}
            value="Afterfly Social"
          />
          <CatchField
            recipe="input"
            title="Review note"
            onChanged={() => undefined}
            maxLines={3}
            value="Evidence verified."
          />
        </AdminFieldGrid>
      </AdminForm>
      <AdminForm variant="publishing" onSubmit={(event) => event.preventDefault()}>
        <AdminButton variant="primary">Save publishing draft</AdminButton>
      </AdminForm>
    </AdminWorkspace>
  ),
};

export const AdminFieldGridStory: Story = {
  name: "Field grid",
  parameters: {
    catchComponent: {
      id: "shared_admin_field_grid",
      states: ["two-column", "three-column"],
    },
  },
  render: () => (
    <AdminWorkspace>
      <AdminFieldGrid>
        <CatchField
          recipe="input"
          title="Name"
          onChanged={() => undefined}
          value="Afterfly Social"
        />
        <CatchField
          recipe="input"
          title="Market"
          onChanged={() => undefined}
          value="San Francisco"
        />
      </AdminFieldGrid>
      <AdminFieldGrid columns={3}>
        <CatchField recipe="input" title="Status" onChanged={() => undefined} value="Ready" />
        <CatchField recipe="input" title="Owner" onChanged={() => undefined} value="Ops" />
        <CatchField recipe="input" title="Source" onChanged={() => undefined} value="Bridge" />
      </AdminFieldGrid>
    </AdminWorkspace>
  ),
};

export const CheckboxFieldStory: Story = {
  name: "Checkbox field",
  parameters: {
    catchComponent: {
      id: "shared_checkbox_field",
      states: ["checked", "unchecked"],
    },
  },
  render: () => (
    <AdminWorkspace>
      <CheckboxField checked label="Source evidence reviewed" onChange={() => undefined} />
      <CheckboxField checked={false} label="Needs follow-up" onChange={() => undefined} />
    </AdminWorkspace>
  ),
};

export const EmptyStateStory: Story = {
  name: "Empty state",
  parameters: {
    catchComponent: {
      id: "shared_empty_state",
      states: ["row", "workbench", "editor", "marketing", "compact"],
    },
  },
  render: () => (
    <AdminWorkspace>
      <EmptyState icon={<Bell size={16} />}>No queue items yet.</EmptyState>
      <EmptyState variant="workbench">No workbench data loaded.</EmptyState>
      <EmptyState variant="editor">No editable fields selected.</EmptyState>
      <EmptyState compact variant="marketing">No media assets.</EmptyState>
    </AdminWorkspace>
  ),
};

export const AdminLoadingIconStory: Story = {
  name: "Loading icon",
  parameters: {
    catchComponent: {
      id: "shared_admin_loading_icon",
      states: ["active", "idle", "custom-size"],
    },
  },
  render: () => (
    <AdminWorkspace>
      <AdminLoadingIcon />
      <AdminLoadingIcon active={false} />
      <AdminLoadingIcon size={24} strokeWidth={2.4} />
    </AdminWorkspace>
  ),
};

export const AdminFeatureLoadingStateStory: Story = {
  name: "Feature loading state",
  parameters: {
    catchComponent: {
      id: "shared_admin_feature_loading_state",
      states: ["default"],
    },
  },
  render: () => (
    <AdminWorkspace>
      <AdminFeatureLoadingState label="Loading organizer bridge" />
    </AdminWorkspace>
  ),
};

export const AdminEnvironmentStatusStory: Story = {
  name: "Environment status",
  parameters: {
    catchComponent: {
      id: "shared_admin_environment_status",
      states: ["development", "staging", "production-hidden"],
    },
  },
  render: () => (
    <AdminWorkspace>
      <AdminEnvironmentStatus environment="dev" />
      <AdminEnvironmentStatus environment="staging" />
      <AdminEnvironmentStatus environment="prod" title="Production badge is hidden" />
    </AdminWorkspace>
  ),
};

export const AdminEyebrowStory: Story = {
  name: "Eyebrow",
  parameters: {
    catchComponent: {
      id: "shared_admin_eyebrow",
      states: ["div", "span"],
    },
  },
  render: () => (
    <AdminWorkspace>
      <AdminEyebrow>Organizer publishing</AdminEyebrow>
      <AdminEyebrow as="span">Queue state</AdminEyebrow>
    </AdminWorkspace>
  ),
};

export const AdminToolbarStory: Story = {
  name: "Toolbar",
  parameters: {
    catchComponent: {
      id: "shared_admin_toolbar",
      states: ["default", "compact"],
    },
  },
  render: () => (
    <AdminWorkspace>
      <AdminToolbar>
        <SearchField ariaLabel="Search queue" value="social" />
        <AdminButton>Reset</AdminButton>
      </AdminToolbar>
      <AdminToolbar compact>
        <AdminButton>Compact action</AdminButton>
      </AdminToolbar>
    </AdminWorkspace>
  ),
};

export const AdminWorkbenchNoteStory: Story = {
  name: "Workbench note",
  parameters: {
    catchComponent: {
      id: "shared_admin_workbench_note",
      states: ["default"],
    },
  },
  render: () => (
    <AdminWorkspace>
      <AdminWorkbenchNote>Generated bridge data is read-only in this view.</AdminWorkbenchNote>
    </AdminWorkspace>
  ),
};

export const AdminWorkbenchStackStory: Story = {
  name: "Workbench stack",
  parameters: {
    catchComponent: {
      id: "shared_admin_workbench_stack",
      states: ["default", "compact"],
    },
  },
  render: () => (
    <AdminWorkspace>
      <AdminWorkbenchStack>
        <AdminCard>
          <h3>Primary stack item</h3>
        </AdminCard>
      </AdminWorkbenchStack>
      <AdminWorkbenchStack compact>
        <AdminWorkbenchNote>Compact stack item.</AdminWorkbenchNote>
      </AdminWorkbenchStack>
    </AdminWorkspace>
  ),
};

export const AdminSecondaryDisclosureStory: Story = {
  name: "Secondary disclosure",
  parameters: {
    catchComponent: {
      id: "shared_admin_secondary_disclosure",
      states: ["closed", "open"],
    },
  },
  render: () => (
    <AdminWorkspace>
      <AdminSecondaryDisclosure summary="Diagnostics and source details">
        <AdminWorkbenchNote>
          Technical context remains available without competing with the task.
        </AdminWorkbenchNote>
      </AdminSecondaryDisclosure>
      <AdminSecondaryDisclosure open summary="Expanded diagnostics">
        <AdminWorkbenchNote>Source generated at 14 Jul 2026, 15:10.</AdminWorkbenchNote>
      </AdminSecondaryDisclosure>
    </AdminWorkspace>
  ),
};

export const AdminTrendSeriesStory: Story = {
  name: "Accessible trend series",
  parameters: {
    catchComponent: {
      id: "shared_admin_trend_series",
      states: ["chart", "table-fallback", "empty"],
    },
  },
  render: () => (
    <AdminWorkspace>
      <AdminTrendSeries
        ariaLabel="Weekly activity summary"
        emptyLabel="No activity buckets are available."
        points={[
          {label: "Week 1", values: {views: 12, chats: 2}},
          {label: "Week 2", values: {views: 20, chats: 6}},
          {label: "Week 3", values: {views: 16, chats: 5}},
        ]}
        series={[
          {id: "views", label: "Profile views"},
          {id: "chats", label: "Chats started"},
        ]}
      />
    </AdminWorkspace>
  ),
};

export const AdminDirectoryScreenStackStory: Story = {
  name: "Directory screen stack",
  parameters: {
    catchComponent: {
      id: "shared_admin_directory_screen_stack",
      states: ["directory"],
    },
  },
  render: () => (
    <AdminWorkspace>
      <AdminDirectoryScreenStack>
        <PageHeader eyebrow="Directory" title="Organizer queue" />
        <AdminCard>Directory list content</AdminCard>
      </AdminDirectoryScreenStack>
    </AdminWorkspace>
  ),
};

export const AdminDetailScreenStackStory: Story = {
  name: "Detail screen stack",
  parameters: {
    catchComponent: {
      id: "shared_admin_detail_screen_stack",
      states: ["detail"],
    },
  },
  render: () => (
    <AdminWorkspace>
      <AdminDetailScreenStack>
        <PageHeader eyebrow="Detail" title="Afterfly Social" />
        <AdminPanel icon={<ShieldCheck size={18} />} title="Readiness">
          <AdminStateRow label="Route" value="Ready" />
        </AdminPanel>
      </AdminDetailScreenStack>
    </AdminWorkspace>
  ),
};

export const AdminStatusGridStory: Story = {
  name: "Status grid",
  parameters: {
    catchComponent: {
      id: "shared_admin_status_grid",
      states: ["default", "compact"],
    },
  },
  render: () => (
    <AdminWorkspace>
      <AdminStatusGrid>
        <AdminStateRow label="Route" value="Ready" />
        <AdminStateRow label="Claim CTA" value="Enabled" />
      </AdminStatusGrid>
      <AdminStatusGrid compact>
        <AdminStateRow label="Public API" value="Verified" />
      </AdminStatusGrid>
    </AdminWorkspace>
  ),
};

export const AdminStatGridStory: Story = {
  name: "Stat grid",
  parameters: {
    catchComponent: {
      id: "shared_admin_stat_grid",
      states: ["default"],
    },
  },
  render: () => (
    <AdminWorkspace>
      <AdminStatGrid>
        <AdminMetricCard label="Ready" value="18" />
        <AdminMetricCard label="Blocked" tone="attention" value="4" />
      </AdminStatGrid>
    </AdminWorkspace>
  ),
};

export const AdminStateRowStory: Story = {
  name: "State row",
  parameters: {
    catchComponent: {
      id: "shared_admin_state_row",
      states: ["text", "node"],
    },
  },
  render: () => (
    <AdminWorkspace>
      <AdminStateRow label="Canonical route" value="/organizers/afterfly/" />
      <AdminStateRow label="Risk" value={<CatchBadge tone="success" label="Low" />} />
    </AdminWorkspace>
  ),
};

export const AdminPanelStory: Story = {
  name: "Panel",
  parameters: {
    catchComponent: {
      id: "shared_admin_panel",
      states: ["default", "wide", "action"],
    },
  },
  render: () => (
    <AdminWorkspace>
      <AdminPanel action={<AdminButton>Open</AdminButton>} icon={<ShieldCheck size={18} />} title="Publication guard">
        <QualityList>
          <QualityRow icon={<CheckCircle2 size={16} />} tone="success">
            <strong>Route contract</strong>
            <span>Canonical path is reserved.</span>
          </QualityRow>
        </QualityList>
      </AdminPanel>
      <AdminPanel icon={<Sparkles size={18} />} span={2} title="Wide panel">
        <AdminWorkbenchNote>Spans the workbench grid.</AdminWorkbenchNote>
      </AdminPanel>
    </AdminWorkspace>
  ),
};

export const AdminCardListStory: Story = {
  name: "Card list",
  parameters: {
    catchComponent: {
      id: "shared_admin_card_list",
      states: ["list"],
    },
  },
  render: () => (
    <AdminWorkspace>
      <AdminCardList>
        <AdminCard>Queue card one</AdminCard>
        <AdminCard>Queue card two</AdminCard>
      </AdminCardList>
    </AdminWorkspace>
  ),
};

export const AdminTagListStory: Story = {
  name: "Admin tag list",
  parameters: {
    catchComponent: {
      id: "shared_admin_tag_list",
      states: ["tags"],
    },
  },
  render: () => (
    <AdminWorkspace>
      <AdminTagList>
        <CatchBadge label="evidence" />
        <CatchBadge label="claim handoff" />
        <CatchBadge tone="success" label="ready" />
      </AdminTagList>
    </AdminWorkspace>
  ),
};

export const AdminTagRowStory: Story = {
  name: "Admin tag row",
  parameters: {
    catchComponent: {
      id: "shared_admin_tag_row",
      states: ["div", "span"],
    },
  },
  render: () => (
    <AdminWorkspace>
      <AdminTagRow>
        <CatchBadge label="organizer" />
        <CatchBadge label="profile" />
      </AdminTagRow>
      <AdminTagRow as="span">
        <CatchBadge label="inline" />
      </AdminTagRow>
    </AdminWorkspace>
  ),
};

export const TagListStory: Story = {
  name: "Generic tag list",
  parameters: {
    catchComponent: {
      id: "shared_tag_list",
      states: ["marketing-row"],
    },
  },
  render: () => (
    <AdminWorkspace>
      <TagList>
        <CatchBadge label="queued" />
        <CatchBadge tone="success" label="ready" />
      </TagList>
    </AdminWorkspace>
  ),
};

export const AdminTableRowStory: Story = {
  name: "Admin table row",
  parameters: {
    catchComponent: {
      id: "shared_admin_table_row",
      states: ["default", "selected"],
    },
  },
  render: () => (
    <AdminWorkspace>
      <DataTable ariaLabel="Table row preview">
        <tbody>
          <AdminTableRow selected>
            <td>Selected organizer</td>
            <td>Ready</td>
          </AdminTableRow>
          <AdminTableRow>
            <td>Default organizer</td>
            <td>Queued</td>
          </AdminTableRow>
        </tbody>
      </DataTable>
    </AdminWorkspace>
  ),
};

export const AdminRowTitleStory: Story = {
  name: "Row title",
  parameters: {
    catchComponent: {
      id: "shared_admin_row_title",
      states: ["default", "compact"],
    },
  },
  render: () => (
    <AdminWorkspace>
      <AdminRowTitle>
        <strong>Afterfly Social</strong>
        <span>San Francisco</span>
      </AdminRowTitle>
      <AdminRowTitle compact>
        <strong>Compact row title</strong>
      </AdminRowTitle>
    </AdminWorkspace>
  ),
};

export const CardHeaderStory: Story = {
  name: "Card header",
  parameters: {
    catchComponent: {
      id: "shared_card_header",
      states: ["marketing", "intake", "with-action"],
    },
  },
  render: () => (
    <AdminWorkspace>
      <AdminCard>
        <CardHeader action={<AdminButton>Open</AdminButton>}>
          <div>
            <h3>Marketing card header</h3>
            <p>With action.</p>
          </div>
        </CardHeader>
      </AdminCard>
      <AdminCard variant="intake">
        <CardHeader variant="intake">
          <div>
            <h3>Intake card header</h3>
            <p>Governed shell.</p>
          </div>
        </CardHeader>
      </AdminCard>
    </AdminWorkspace>
  ),
};

export const SelectableCardButtonStory: Story = {
  name: "Selectable card button",
  parameters: {
    catchComponent: {
      id: "shared_selectable_card_button",
      states: ["default", "selected"],
    },
  },
  render: () => (
    <AdminWorkspace>
      <SelectableCardButton>Draft campaign</SelectableCardButton>
      <SelectableCardButton selected>Selected campaign</SelectableCardButton>
    </AdminWorkspace>
  ),
};

export const TableActionButtonStory: Story = {
  name: "Table action button",
  parameters: {
    catchComponent: {
      id: "shared_table_action_button",
      states: ["default"],
    },
  },
  render: () => (
    <AdminWorkspace>
      <TableActionButton>View detail</TableActionButton>
    </AdminWorkspace>
  ),
};

export const AlertRowStory: Story = {
  name: "Alert row",
  parameters: {
    catchComponent: {
      id: "shared_alert_row",
      states: ["neutral", "warning", "success", "blocked"],
    },
  },
  render: () => (
    <AdminWorkspace>
      <AlertRow icon={<Bell size={16} />} title="Neutral">Waiting on reviewer action.</AlertRow>
      <AlertRow icon={<FileWarning size={16} />} title="Warning" tone="warning">Missing source URL.</AlertRow>
      <AlertRow icon={<CheckCircle2 size={16} />} title="Success" tone="success">Ready to publish.</AlertRow>
      <AlertRow icon={<Lock size={16} />} title="Blocked" tone="blocked">Policy hold required.</AlertRow>
    </AdminWorkspace>
  ),
};

export const QualityListStory: Story = {
  name: "Quality list",
  parameters: {
    catchComponent: {
      id: "shared_quality_list",
      states: ["rows"],
    },
  },
  render: () => (
    <AdminWorkspace>
      <QualityList>
        <QualityRow icon={<CheckCircle2 size={16} />} tone="success">
          <strong>Route contract</strong>
          <span>Canonical path verified.</span>
        </QualityRow>
        <QualityRow icon={<FileWarning size={16} />} tone="warning">
          <strong>Claim CTA</strong>
          <span>Owner proof required.</span>
        </QualityRow>
      </QualityList>
    </AdminWorkspace>
  ),
};

export const QualityRowStory: Story = {
  name: "Quality row",
  parameters: {
    catchComponent: {
      id: "shared_quality_row",
      states: ["base", "success", "warning", "blocked"],
    },
  },
  render: () => (
    <AdminWorkspace>
      <QualityRow icon={<Bell size={16} />}>
        <strong>Base row</strong>
        <span>Neutral evidence.</span>
      </QualityRow>
      <QualityRow icon={<CheckCircle2 size={16} />} tone="success">
        <strong>Success row</strong>
        <span>Verified.</span>
      </QualityRow>
      <QualityRow icon={<FileWarning size={16} />} tone="warning">
        <strong>Warning row</strong>
        <span>Needs follow-up.</span>
      </QualityRow>
      <QualityRow icon={<Lock size={16} />} tone="blocked">
        <strong>Blocked row</strong>
        <span>Cannot publish.</span>
      </QualityRow>
    </AdminWorkspace>
  ),
};

export const AdminDecisionFooterShellStory: Story = {
  name: "Decision footer shell",
  parameters: {
    catchComponent: {
      id: "shared_admin_decision_footer_shell",
      states: ["default", "compact"],
    },
  },
  render: () => (
    <AdminWorkspace>
      <AdminDecisionFooterShell>
        <AdminButton>Needs changes</AdminButton>
        <AdminButton variant="primary">Approve</AdminButton>
      </AdminDecisionFooterShell>
      <AdminDecisionFooterShell compact>
        <AdminButton>Hold</AdminButton>
      </AdminDecisionFooterShell>
    </AdminWorkspace>
  ),
};

function profilePhotoFixture(index: number): string {
  const palette = ["#efd3c4", "#d7e6df", "#d8d5ec"];
  const background = palette[index % palette.length];
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 320 400"><rect width="320" height="400" fill="${background}"/><circle cx="160" cy="145" r="72" fill="#5d4650"/><path d="M55 400c8-102 55-156 105-156s97 54 105 156" fill="#8c6777"/></svg>`;
  return `data:image/svg+xml,${encodeURIComponent(svg)}`;
}

export const AdminProfilePhotoGridStory: Story = {
  name: "Profile photo grid",
  parameters: {
    catchComponent: {
      id: "shared_admin_profile_photo_grid",
      states: ["three-photos"],
    },
  },
  render: () => (
    <AdminWorkspace>
      <AdminProfilePhotoGrid
        ariaLabel="Three public profile photos"
        photos={[0, 1, 2].map((index) => ({
          alt: `Sample public profile ${index + 1}`,
          url: profilePhotoFixture(index),
        }))}
      />
    </AdminWorkspace>
  ),
};
