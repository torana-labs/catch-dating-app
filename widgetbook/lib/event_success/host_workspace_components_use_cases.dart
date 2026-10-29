import 'package:catch_dating_app/contexts/bookings/domain/event_participation_roster.dart';
import 'package:catch_dating_app/contexts/formats/domain/event_success_coach.dart';
import 'package:catch_dating_app/design_fixtures/event_success_companion_fixtures.dart';
import 'package:catch_dating_app/event_success/presentation/event_success_host_screen_state.dart';
import 'package:catch_dating_app/event_success/presentation/event_success_host_workspace_page_body.dart';
import 'package:catch_dating_app/event_success/presentation/host_components/event_success_host_section_loading_page_body.dart';
import 'package:catch_dating_app/event_success/presentation/host_report/event_success_funnel_section.dart';
import 'package:catch_dating_app/event_success/presentation/host_report/event_success_host_report_page_body.dart';
import 'package:catch_dating_app/event_success/presentation/host_report/event_success_report_quality_section.dart';
import 'package:catch_dating_app/event_success/presentation/host_setup/event_success_host_setup_page_body.dart';
import 'package:catch_dating_app/event_success/presentation/host_setup/event_success_readiness_field.dart';
import 'package:catch_dating_app/event_success/presentation/host_setup/event_success_target_attendees_field.dart';
import 'package:catch_dating_app/platform/catch_async_state.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/material.dart';
import 'package:widgetbook_annotation/widgetbook_annotation.dart' as widgetbook;

import '../support/widgetbook_harness.dart';

final _brief = EventSuccessCompanionFixtures.basePlan.buildBriefFromScorecard(
  event: EventSuccessCompanionFixtures.socialEvent,
  scorecard: EventSuccessSampleScorecards.strongSocialRun,
);

@widgetbook.UseCase(
  name: 'Ready',
  type: EventSuccessHostWorkspacePageBody,
  path: '[P1 product surfaces]/Event Success/Host workspace components',
)
Widget eventSuccessStrictEventSuccessHostPanel(BuildContext context) =>
    WidgetbookCatalogFrame(
      title: 'EventSuccessHostWorkspacePageBody',
      catalogId: 'Event Success Host workspace',
      children: [
        EventSuccessHostWorkspacePageBody(
          event: EventSuccessCompanionFixtures.socialEvent,
          plan: EventSuccessCompanionFixtures.basePlan,
          planIsPersisted: true,
          roster: EventParticipationRoster.empty(),
          embedded: true,
          showTabs: true,
          referenceNow: EventSuccessCompanionFixtures.now,
        ),
      ],
    );

@widgetbook.UseCase(
  name: 'Ready',
  type: EventSuccessHostSetupPageBody,
  path: '[P1 product surfaces]/Event Success/Host workspace components',
)
Widget eventSuccessStrictSetupTab(BuildContext context) =>
    WidgetbookCatalogFrame(
      title: 'EventSuccessHostSetupPageBody',
      catalogId: 'Event Success Host workspace',
      children: [
        EventSuccessHostSetupPageBody(
          event: EventSuccessCompanionFixtures.socialEvent,
          plan: EventSuccessCompanionFixtures.basePlan,
          planIsPersisted: true,
          organizerLayoutsState: const CatchAsyncState.data([]),
          layoutSavePending: false,
          layoutSaveError: null,
          onSaveLayout: null,
          actionState: const EventSuccessSetupActionState(),
          onSaveSetup: (_) async {},
          embedded: true,
          referenceNow: EventSuccessCompanionFixtures.now,
        ),
      ],
    );

@widgetbook.UseCase(
  name: 'Ready',
  type: EventSuccessTargetAttendeesField,
  path: '[P1 product surfaces]/Event Success/Host workspace components',
)
Widget eventSuccessStrictTargetAttendeeControl(BuildContext context) =>
    WidgetbookCatalogFrame(
      title: 'EventSuccessTargetAttendeesField',
      catalogId: 'Event Success Host workspace',
      children: [
        EventSuccessTargetAttendeesField(
          value: 18,
          recommendedMin: 12,
          recommendedMax: 30,
          enabled: true,
          onChanged: (_) {},
        ),
      ],
    );

@widgetbook.UseCase(
  name: 'Ready',
  type: EventSuccessReadinessField,
  path: '[P1 product surfaces]/Event Success/Host workspace components',
)
Widget eventSuccessStrictReadinessIssues(BuildContext context) =>
    WidgetbookCatalogFrame(
      title: 'EventSuccessReadinessField',
      catalogId: 'Event Success Host workspace',
      children: [
        const EventSuccessReadinessField(
          issues: [
            'Choose the first live prompt.',
            'Confirm the attendee target.',
          ],
        ),
      ],
    );

@widgetbook.UseCase(
  name: 'Ready',
  type: EventSuccessHostReportPageBody,
  path: '[P1 product surfaces]/Event Success/Host workspace components',
)
Widget eventSuccessStrictReportTab(BuildContext context) =>
    WidgetbookCatalogFrame(
      title: 'EventSuccessHostReportPageBody',
      catalogId: 'Event Success Host workspace',
      children: [
        EventSuccessHostReportPageBody(
          event: EventSuccessCompanionFixtures.socialEvent,
          plan: EventSuccessCompanionFixtures.basePlan,
          planIsPersisted: true,
          scorecard: EventSuccessSampleScorecards.strongSocialRun,
          resourceFailures: const [],
          onRetryResource: (_) {},
          embedded: true,
        ),
      ],
    );

@widgetbook.UseCase(
  name: 'Ready',
  type: CatchSection,
  path: '[P1 product surfaces]/Event Success/Host workspace components',
)
Widget previewEventSuccessReportStatus(BuildContext context) =>
    WidgetbookCatalogFrame(
      title: 'CatchSection',
      catalogId: 'Event Success Host workspace',
      children: [
        CatchSection.status(
          icon: CatchIcons.insights,
          title: 'Waiting for attendee feedback',
          message: 'The report appears when attendee feedback is available.',
        ),
      ],
    );

@widgetbook.UseCase(
  name: 'Ready',
  type: EventSuccessReportQualitySection,
  path: '[P1 product surfaces]/Event Success/Host workspace components',
)
Widget eventSuccessStrictHostReportSignalGrid(BuildContext context) =>
    WidgetbookCatalogFrame(
      title: 'EventSuccessReportQualitySection',
      catalogId: 'Event Success Host workspace',
      children: [EventSuccessReportQualitySection(brief: _brief)],
    );

@widgetbook.UseCase(
  name: 'Ready',
  type: EventSuccessFunnelSection,
  path: '[P1 product surfaces]/Event Success/Host workspace components',
)
Widget eventSuccessStrictHostFunnelSummary(BuildContext context) =>
    WidgetbookCatalogFrame(
      title: 'EventSuccessFunnelSection',
      catalogId: 'Event Success Host workspace',
      children: [EventSuccessFunnelSection(brief: _brief)],
    );

@widgetbook.UseCase(
  name: 'Loading',
  type: EventSuccessHostSectionLoadingPageBody,
  path: '[P1 product surfaces]/Event Success/Host workspace components',
)
Widget eventSuccessStrictEventSuccessHostSectionLoadingPageBody(
  BuildContext context,
) => WidgetbookCatalogFrame(
  title: 'EventSuccessHostSectionLoadingPageBody',
  catalogId: 'Event Success Host workspace',
  children: [const EventSuccessHostSectionLoadingPageBody()],
);
