import 'package:catch_dating_app/contexts/audience/domain/crm/host_contact_merge.dart';
import 'package:catch_dating_app/contexts/audience/domain/crm/host_crm_summary.dart';
import 'package:catch_dating_app/design_fixtures/host_operations_fixtures.dart';
import 'package:catch_dating_app/hosts/presentation/customers/host_customer_applications_section.dart';
import 'package:catch_dating_app/hosts/presentation/customers/host_customer_detail_screen.dart';
import 'package:catch_dating_app/hosts/presentation/customers/host_customer_detail_tab_bar.dart';
import 'package:catch_dating_app/hosts/presentation/customers/host_customer_email_sheet.dart';
import 'package:catch_dating_app/hosts/presentation/customers/host_customer_memory_section.dart';
import 'package:catch_dating_app/hosts/presentation/customers/host_customer_outreach_sheet.dart';
import 'package:catch_dating_app/hosts/presentation/customers/host_customer_record_menu.dart';
import 'package:catch_dating_app/hosts/presentation/customers/host_customer_timeline_section.dart';
import 'package:catch_dating_app/hosts/presentation/customers/host_customer_whatsapp_sheet.dart';
import 'package:catch_dating_app/hosts/presentation/customers/host_customers_screen.dart';
import 'package:catch_dating_app/hosts/presentation/customers/host_customers_screen_state.dart';
import 'package:catch_dating_app/hosts/presentation/host_audience_no_organizer_empty_state.dart';
import 'package:catch_dating_app/l10n/l10n.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/material.dart';
import 'package:widgetbook_annotation/widgetbook_annotation.dart' as widgetbook;

import 'customer_routes.dart';

@widgetbook.UseCase(
  name: 'Populated component',
  type: HostCustomerApplicationsSection,
  path: '[P1 product surfaces]/Host operations/Customers',
)
Widget hostCustomerApplicationsPanelComponentStates(BuildContext context) =>
    hostCustomersStates(
      context,
      detailBuilder: (customer) => HostCustomerApplicationsSection(
        organizerId: customer.organizerId,
        contactId: customer.contactId,
        onOpenApplication: (_) {},
        onOpenContact: (_) {},
      ),
    );

@widgetbook.UseCase(
  name: 'Populated component',
  type: HostCustomerApplicationCard,
  path: '[P1 product surfaces]/Host operations/Customers',
)
Widget hostCustomerApplicationSnapshotComponentStates(BuildContext context) =>
    hostCustomersStates(
      context,
      detailBuilder: (customer) => HostCustomerApplicationCard(
        organizerId: customer.organizerId,
        applicationId: 'design-application-1',
        onOpen: () {},
        onOpenContact: (_) {},
      ),
    );

@widgetbook.UseCase(
  name: 'Populated component',
  type: HostCustomerDetailsSection,
  path: '[P1 product surfaces]/Host operations/Customers',
)
Widget hostCustomerDetailsSectionComponentStates(BuildContext context) =>
    hostCustomersStates(
      context,
      detailBuilder: (customer) => HostCustomerDetailsSection(
        customer: customer,
        onCall: () {},
        onEmail: () {},
      ),
    );

@widgetbook.UseCase(
  name: 'Populated component',
  type: HostCustomerRecentEventsList,
  path: '[P1 product surfaces]/Host operations/Customers',
)
Widget hostCustomerRecentEventsComponentStates(BuildContext context) =>
    hostCustomersStates(
      context,
      detailBuilder: (customer) =>
          HostCustomerRecentEventsList(customer: customer, onOpenEvent: (_) {}),
    );

@widgetbook.UseCase(
  name: 'Populated component',
  type: HostCustomerRevenueList,
  path: '[P1 product surfaces]/Host operations/Customers',
)
Widget hostCustomerRevenueBreakdownComponentStates(BuildContext context) =>
    hostCustomersStates(
      context,
      detailBuilder: (customer) =>
          HostCustomerRevenueList(customer: customer, onOpenEvent: (_) {}),
    );

@widgetbook.UseCase(
  name: 'Populated component',
  type: HostCustomerMemoryPreview,
  path: '[P1 product surfaces]/Host operations/Customers',
)
Widget hostCustomerMemoryPreviewComponentStates(BuildContext context) =>
    hostCustomersStates(
      context,
      detailBuilder: (customer) =>
          HostCustomerMemoryPreview(customer: customer, onOpenMemory: () {}),
    );

@widgetbook.UseCase(
  name: 'Populated component',
  type: HostCustomerHistoryFilterSection,
  path: '[P1 product surfaces]/Host operations/Customers',
)
Widget hostCustomerHistoryFiltersComponentStates(BuildContext context) =>
    hostCustomersStates(
      context,
      detailBuilder: (customer) => HostCustomerHistoryFilterSection(
        builder: (filter) => HostCustomerTimelineSection(
          customer: customer,
          filter: filter,
          onOpenFormResponse: (_) {},
          onOpenEvent: (_) {},
          onOpenCatchThread: (_) {},
          onOpenWhatsappThread: (_) {},
        ),
      ),
    );

@widgetbook.UseCase(
  name: 'Populated component',
  type: CatchField,
  path: '[P1 product surfaces]/Host operations/Customers',
)
Widget hostCustomerTimelineRecordComponentStates(BuildContext context) =>
    hostCustomersStates(
      context,
      detailBuilder: (customer) => CatchSection.containedRows(
        children: [
          for (final entry in customer.timeline)
            hostCustomerTimelineField(
              context,
              entry: entry,
              onOpenFormResponse: (_) {},
              onOpenEvent: (_) {},
              onOpenCatchThread: (_) {},
              onOpenWhatsappThread: (_) {},
            ),
        ],
      ),
    );

@widgetbook.UseCase(
  name: 'Populated component',
  type: HostCustomerOverviewSectionList,
  path: '[P1 product surfaces]/Host operations/Customers',
)
Widget hostCustomerDetailOverviewComponentStates(BuildContext context) =>
    hostCustomersStates(
      context,
      detailBuilder: (customer) => HostCustomerOverviewSectionList(
        customer: customer,
        onOpenRevenue: () {},
      ),
    );

@widgetbook.UseCase(
  name: 'Populated component',
  type: HostCustomerDetailTabBar,
  path: '[P1 product surfaces]/Host operations/Customers',
)
Widget hostCustomerDetailTabsComponentStates(BuildContext context) =>
    hostCustomersStates(
      context,
      detailBuilder: (customer) => HostCustomerDetailTabBar(
        selected: HostCustomerDetailView.overview,
        onChanged: (_) {},
      ),
    );

@widgetbook.UseCase(
  name: 'Directory states',
  type: HostCustomersList,
  path: '[P1 product surfaces]/Host operations/Customers',
)
Widget hostCustomersDirectoryStates(BuildContext context) =>
    hostCustomersStates(context);

@widgetbook.UseCase(
  name: 'Directory control states',
  type: HostCustomerControlSection,
  path: '[P1 product surfaces]/Host operations/Customers',
)
Widget hostCustomerDirectoryControlsStates(BuildContext context) =>
    hostCustomersStates(context);

@widgetbook.UseCase(
  name: 'Full-page add state',
  type: HostAddCustomerScreen,
  path: '[P1 product surfaces]/Host operations/Customers',
)
Widget hostAddCustomerScreenStates(BuildContext context) =>
    hostCustomersStates(context);

@widgetbook.UseCase(
  name: 'Identity input states',
  type: HostCustomerIdentityInputSection,
  path: '[P1 product surfaces]/Host operations/Customers',
)
Widget hostCustomerIdentityInputStates(BuildContext context) =>
    hostCustomersStates(context);

@widgetbook.UseCase(
  name: 'Detail states',
  type: HostCustomerDetailScreen,
  path: '[P1 product surfaces]/Host operations/Customers',
)
Widget hostCustomerDetailStates(BuildContext context) =>
    hostCustomersStates(context);

@widgetbook.UseCase(
  name: 'Detail composition states',
  type: HostCustomerDetailBody,
  path: '[P1 product surfaces]/Host operations/Customers',
)
Widget hostCustomerDetailBodyStates(BuildContext context) =>
    hostCustomersStates(context);

@widgetbook.UseCase(
  name: 'Identity states',
  type: HostCustomerIdentityCard,
  path: '[P1 product surfaces]/Host operations/Customers',
)
Widget hostCustomerIdentityStates(BuildContext context) =>
    hostCustomersStates(context);

@widgetbook.UseCase(
  name: 'Attendance stats',
  type: HostCustomerAttendanceCard,
  path: '[P1 product surfaces]/Host operations/Customers',
)
Widget hostCustomerAttendanceStates(BuildContext context) =>
    hostCustomersStates(context);

@widgetbook.UseCase(
  name: 'Revenue coverage states',
  type: HostCustomerRevenueCard,
  path: '[P1 product surfaces]/Host operations/Customers',
)
Widget hostCustomerRevenueStates(BuildContext context) =>
    hostCustomersStates(context);

@widgetbook.UseCase(
  name: 'Unified timeline states',
  type: HostCustomerTimelineSection,
  path: '[P1 product surfaces]/Host operations/Customers',
)
Widget hostCustomerTimelineStates(BuildContext context) =>
    hostCustomersStates(context);

@widgetbook.UseCase(
  name: 'No-organizer state',
  type: HostAudienceNoOrganizerEmptyState,
  path: '[P1 product surfaces]/Host operations/Customers',
)
Widget hostCustomersNoOrganizerStates(BuildContext context) =>
    hostCustomersStates(context);

@widgetbook.UseCase(
  name: 'Reach and provenance states',
  type: HostCustomerReachSection,
  path: '[P1 product surfaces]/Host operations/Customers',
)
Widget hostCustomerConversationStates(BuildContext context) =>
    hostCustomersStates(context);

@widgetbook.UseCase(
  name: 'Summary states',
  type: HostCustomersSummarySection,
  path: '[P1 product surfaces]/Host operations/Customers',
)
Widget hostCustomersSummaryStates(BuildContext context) =>
    hostCustomersStates(context);

@widgetbook.UseCase(
  name: 'Loaded history',
  type: HostCustomerHistorySection,
  path: '[P1 product surfaces]/Host operations/Composed sections',
)
Widget hostCustomerHistoryPanelStates(BuildContext context) =>
    hostCustomersStates(
      context,
      detailBuilder: (customer) => HostCustomerHistorySection(
        customer: customer,
        onOpenFormResponse: (_) {},
        onOpenEvent: (_) {},
        onOpenCatchThread: (_) {},
        onOpenWhatsappThread: (_) {},
        onUndoMerge: (_) {},
      ),
    );

@widgetbook.UseCase(
  name: 'Loaded submissions',
  type: HostCustomerSubmissionsSection,
  path: '[P1 product surfaces]/Host operations/Customers',
)
Widget hostCustomerSubmissionsSectionStates(BuildContext context) =>
    hostCustomersStates(
      context,
      detailBuilder: (customer) =>
          HostCustomerSubmissionsSection(customer: customer, onOpen: (_) {}),
    );

@widgetbook.UseCase(
  name: 'Provenance states',
  type: HostCustomerSourcesSection,
  path: '[P1 product surfaces]/Host operations/Customers',
)
Widget hostCustomerSourcesSectionStates(BuildContext context) =>
    hostCustomersStates(
      context,
      detailBuilder: (customer) => HostCustomerSourcesSection(
        customer: customer,
        onReviewDuplicates: () {},
      ),
    );

@widgetbook.UseCase(
  name: 'Combined filter chips',
  type: HostCustomerFilterSheet,
  path: '[P1 product surfaces]/Host operations/Customers',
)
Widget hostCustomerFilterSheetStates(BuildContext context) => Scaffold(
  body: Center(
    child: CatchButton(
      label: 'Open people filters',
      onPressed: () => showCatchBottomSheet<void>(
        context: context,
        builder: (_) => const HostCustomerFilterSheet(
          selectedFilters: {
            HostCustomerFilter.firstTime,
            HostCustomerFilter.repeat,
            HostCustomerFilter.reliable,
          },
          manualTagVocabulary: [
            HostCustomerManualTag(tagId: 'runners', label: 'Runners'),
            HostCustomerManualTag(tagId: 'volunteers', label: 'Volunteers'),
          ],
          smsReadiness: HostCrmChannelReadiness.currentEventOnly,
        ),
      ),
    ),
  ),
);

@widgetbook.UseCase(
  name: 'Draft outreach log',
  type: HostCustomerOutreachSheet,
  path: '[P1 product surfaces]/Host operations/Customers',
)
Widget hostCustomerOutreachSheetStates(BuildContext context) =>
    hostCustomersStates(
      context,
      detailBuilder: (customer) =>
          HostCustomerOutreachSheet(customer: customer),
    );

@widgetbook.UseCase(
  name: 'Email handoff draft',
  type: HostCustomerEmailHandoffSheet,
  path: '[P1 product surfaces]/Host operations/Customers',
)
Widget hostCustomerEmailHandoffSheetStates(BuildContext context) =>
    hostCustomersStates(
      context,
      detailBuilder: (customer) =>
          HostCustomerEmailHandoffSheet(customer: customer),
    );

@widgetbook.UseCase(
  name: 'Merged contact history',
  type: HostCustomerActiveMergesSection,
  path: '[P1 product surfaces]/Host operations/Customers',
)
Widget hostCustomerActiveMergesSectionStates(BuildContext context) =>
    hostCustomersStates(
      context,
      detailBuilder: (_) => HostCustomerActiveMergesSection(
        merges: [
          HostActiveContactMerge(
            mergeReceiptId: 'preview-merge',
            sourceContactId: 'preview-contact',
            sourceDisplayName: 'Leena',
            evidence: const ['sameEmail'],
            conflicts: const [],
            movedFactCount: 3,
            mergedAt: DateTime(2026, 10, 7),
          ),
        ],
        onUndo: (_) {},
      ),
    );

@widgetbook.UseCase(
  name: 'Loading composition',
  type: HostCustomerDetailBody,
  path: '[P1 product surfaces]/Host operations/Customers',
)
Widget hostCustomerDetailLoadingStates(BuildContext context) =>
    hostCustomersStates(
      context,
      detailBuilder: (customer) => CatchSkeleton.content(
        child: HostCustomerDetailBody.loading(
          organizerId: customer.organizerId,
          contactId: customer.contactId,
          displayName: customer.displayName,
          manualTagLabel: context.l10n.hostCustomersManualTags,
          noteBody: context.l10n.hostCustomersMemoryHelp,
          currentUid: HostOperationsFixtures.hostUid,
          selectedView: HostCustomerDetailView.overview,
          onOpenMemory: () {},
        ),
      ),
    );

@widgetbook.UseCase(
  name: 'Available record commands',
  type: HostCustomerRecordMenu,
  path: '[P1 product surfaces]/Host operations/Customers',
)
Widget hostCustomerRecordMenuStates(BuildContext context) =>
    hostCustomersStates(
      context,
      detailBuilder: (_) => HostCustomerRecordMenu(
        enabled: true,
        canMessage: true,
        onMessage: () async {},
        onLogOutreach: () async {},
        onRemove: () async {},
      ),
    );

@widgetbook.UseCase(
  name: 'WhatsApp handoff draft',
  type: HostCustomerWhatsappHandoffSheet,
  path: '[P1 product surfaces]/Host operations/Customers',
)
Widget hostCustomerWhatsappHandoffSheetStates(BuildContext context) =>
    hostCustomersStates(
      context,
      detailBuilder: (customer) =>
          HostCustomerWhatsappHandoffSheet(customer: customer),
    );

@widgetbook.UseCase(
  name: 'Populated component',
  type: HostCustomerIdentitySection,
  path: '[P1 product surfaces]/Host operations/Customers',
)
Widget hostCustomerIdentitySectionStates(BuildContext context) =>
    hostCustomersStates(
      context,
      detailBuilder: (customer) => HostCustomerIdentitySection(
        customer: customer,
        displayName: customer.displayName,
        phoneE164: customer.phoneE164,
        phonePlaceholder: context.l10n.hostCustomersNotSaved,
        email: customer.email,
        emailPlaceholder: context.l10n.hostCustomersNotSaved,
        onEdit: () {},
        showName: true,
        showContacts: true,
      ),
    );

@widgetbook.UseCase(
  name: 'Populated component',
  type: HostCustomerTimelineList,
  path: '[P1 product surfaces]/Host operations/Customers',
)
Widget hostCustomerTimelineListStates(BuildContext context) =>
    hostCustomersStates(
      context,
      detailBuilder: (customer) => HostCustomerTimelineList(
        entries: customer.timeline,
        onOpenFormResponse: (_) {},
        onOpenEvent: (_) {},
        onOpenCatchThread: (_) {},
        onOpenWhatsappThread: (_) {},
      ),
    );
