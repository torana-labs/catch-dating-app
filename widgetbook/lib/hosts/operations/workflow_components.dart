import 'package:catch_dating_app/contexts/audience/domain/crm/host_saved_audience_definition.dart';
import 'package:catch_dating_app/design_fixtures/host_operations_fixtures.dart';
import 'package:catch_dating_app/hosts/presentation/customers/host_customer_memory_section.dart';
import 'package:catch_dating_app/hosts/presentation/customers/host_customers_screen.dart';
import 'package:catch_dating_app/hosts/presentation/customers/host_customers_screen_state.dart';
import 'package:catch_dating_app/hosts/presentation/event_management/host_create_event_route_loading_screen.dart';
import 'package:catch_dating_app/hosts/presentation/event_management/widgets/create_event_adaptive_workspace.dart';
import 'package:catch_dating_app/hosts/presentation/inbox/host_follower_update_composer_sheet.dart';
import 'package:catch_dating_app/hosts/today/presentation/widgets/host_today_body.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/material.dart';
import 'package:widgetbook_annotation/widgetbook_annotation.dart' as widgetbook;

import 'customer_routes.dart';
import 'preview.dart';

const _path = '[P1 product surfaces]/Host operations/Workflow components';

@widgetbook.UseCase(
  name: 'Loading dock',
  type: CreateEventDockSkeleton,
  path: _path,
)
Widget createEventDockSkeletonStates(BuildContext context) =>
    widgetbookHostComponentStates('CreateEventDockSkeleton', [
      ('route loading', const CreateEventDockSkeleton()),
    ]);

@widgetbook.UseCase(
  name: 'Workspace layout',
  type: CreateEventWorkspaceLayout,
  path: _path,
)
Widget createEventWorkspaceLayoutStates(BuildContext context) =>
    widgetbookHostComponentStates('CreateEventWorkspaceLayout', [
      (
        'header over body',
        const CreateEventWorkspaceLayout(
          header: Text('Sunday social run'),
          body: Text('Event details'),
        ),
      ),
    ]);

@widgetbook.UseCase(
  name: 'Consequence summary',
  type: CreateEventConsequenceSection,
  path: _path,
)
Widget createEventConsequenceSectionStates(BuildContext context) =>
    widgetbookHostComponentStates('CreateEventConsequenceSection', [
      (
        'guest impact',
        const CreateEventConsequenceSection(
          title: 'What guests will see',
          items: [
            CatchFormReviewSummaryItem(label: 'Capacity', value: '24 guests'),
            CatchFormReviewSummaryItem(label: 'Price', value: 'Free'),
            CatchFormReviewSummaryItem(label: 'Approval', value: 'Required'),
          ],
        ),
      ),
    ]);

@widgetbook.UseCase(name: 'Quiet day', type: HostTodayEmptyState, path: _path)
Widget hostTodayEmptyStateStates(BuildContext context) =>
    widgetbookHostComponentStates('HostTodayEmptyState', [
      (
        'nothing scheduled',
        HostTodayEmptyState(
          onCreateEvent: () {},
          onViewEvents: () {},
          onStartRehearsal: () {},
        ),
      ),
    ]);

@widgetbook.UseCase(
  name: 'Follower update composer',
  type: HostFollowerUpdateComposerSheet,
  path: _path,
)
Widget hostFollowerUpdateComposerSheetStates(BuildContext context) =>
    widgetbookHostComponentStates('HostFollowerUpdateComposerSheet', [
      (
        'quota remaining',
        HostFollowerUpdateComposerSheet(
          club: HostOperationsFixtures.primaryClub,
          remainingQuota: 2,
          requestIdFactory: () => 'widgetbook-follower-update',
          onSubmitPost: ({required requestId, required text}) async {},
        ),
      ),
    ]);

@widgetbook.UseCase(
  name: 'Save audience',
  type: HostSaveAudienceSheet,
  path: _path,
)
Widget hostSaveAudienceSheetStates(BuildContext context) =>
    widgetbookHostComponentStates('HostSaveAudienceSheet', [
      (
        'attended filter',
        HostSaveAudienceSheet(
          organizerId: HostOperationsFixtures.primaryClub.id,
          suggestedName: 'Sunday regulars',
          definition: const HostSavedAudienceDefinition(
            join: HostSavedAudienceJoin.all,
            predicates: [HostSavedAudienceAttendedEvent('sunday-social')],
          ),
        ),
      ),
    ]);

@widgetbook.UseCase(
  name: 'Filter summary',
  type: HostCustomerFilterSummarySection,
  path: _path,
)
Widget hostCustomerFilterSummarySectionStates(BuildContext context) =>
    widgetbookHostComponentStates('HostCustomerFilterSummarySection', [
      (
        'exact match',
        HostCustomerFilterSummarySection(
          filter: HostCustomerFilter.repeat,
          count: 42,
          countCoverage: HostCustomerMatchCountCoverage.exact,
          campaignBlocker: null,
          onMessage: () {},
          onReviewSenderSetup: null,
          onClear: () {},
        ),
      ),
      (
        'sender setup needed',
        HostCustomerFilterSummarySection(
          filter: HostCustomerFilter.all,
          count: 120,
          countCoverage: HostCustomerMatchCountCoverage.atLeast,
          campaignBlocker: 'Connect WhatsApp before messaging.',
          onMessage: null,
          onReviewSenderSetup: () {},
        ),
      ),
    ]);

@widgetbook.UseCase(
  name: 'Memory section',
  type: HostCustomerMemorySection,
  path: _path,
)
Widget hostCustomerMemorySectionStates(BuildContext context) =>
    hostCustomersStates(
      context,
      detailBuilder: (customer) => HostCustomerMemorySection(
        customer: customer,
        currentUid: null,
        onEditTags: () {},
        onAddNote: () {},
        onEditNote: (_) {},
      ),
    );

@widgetbook.UseCase(
  name: 'Note sheet',
  type: HostCustomerNoteSheet,
  path: _path,
)
Widget hostCustomerNoteSheetStates(BuildContext context) => hostCustomersStates(
  context,
  detailBuilder: (customer) =>
      HostCustomerNoteSheet(customer: customer, note: null),
);

@widgetbook.UseCase(
  name: 'Tags sheet',
  type: HostCustomerTagsSheet,
  path: _path,
)
Widget hostCustomerTagsSheetStates(BuildContext context) => hostCustomersStates(
  context,
  detailBuilder: (customer) => HostCustomerTagsSheet(customer: customer),
);
