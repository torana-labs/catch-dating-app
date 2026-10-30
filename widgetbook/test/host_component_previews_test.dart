import 'package:catch_dating_app/hosts/presentation/customers/host_contact_merge_review_sheet.dart';
import 'package:catch_dating_app/hosts/presentation/customers/host_customer_timeline_section.dart';
import 'package:catch_dating_app/hosts/presentation/customers/host_customers_screen.dart';
import 'package:catch_dating_app/hosts/presentation/forms/host_form_body.dart';
import 'package:catch_dating_app/hosts/presentation/forms/host_form_responses_section.dart';
import 'package:catch_dating_app/hosts/presentation/host_operations_screen.dart';
import 'package:catch_dating_app/hosts/presentation/inbox/host_campaign_editor.dart';
import 'package:catch_dating_app/hosts/presentation/inbox/host_manual_send_list.dart';
import 'package:catch_dating_app/hosts/presentation/widgets/host_event_live_location_field.dart';
import 'package:catch_dating_app/hosts/presentation/widgets/host_operational_roster_section.dart';
import 'package:catch_dating_app/platform/theme/app_theme.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:widgetbook_workspace/hosts/host_booking_provider_use_cases.dart';
import 'package:widgetbook_workspace/hosts/host_form_workspace_use_cases.dart';
import 'package:widgetbook_workspace/hosts/operations/create_organizer_profile.dart';
import 'package:widgetbook_workspace/hosts/operations/customer_components.dart';
import 'package:widgetbook_workspace/hosts/operations/customer_merge_components.dart';
import 'package:widgetbook_workspace/hosts/operations/inbox_components.dart';
import 'package:widgetbook_workspace/hosts/operations/manage_components.dart';
import 'package:widgetbook_workspace/hosts/operations/organizer_components.dart';

import '../../test/test_pump_helpers.dart';

// Each case renders offline: stateful owners read only their preview overrides.
void main() {
  final cases = <(WidgetBuilder, Type, int)>[
    (
      hostStrictHostOrganizerMetricGridCatalogStates,
      HostOrganizerMetricGrid,
      1,
    ),
    (hostStrictHostOrganizerMetricRowCatalogStates, HostOrganizerMetricRow, 1),
    (hostCrmAudienceCardStates, HostCrmAudienceCard, 3),
    (hostCrmChannelRowStates, HostCrmChannelRow, 2),
    (
      hostOrganizerPublicationChannelRowStates,
      HostOrganizerPublicationChannelRow,
      2,
    ),
    (hostOrganizerLogoManagerHeaderStates, HostOrganizerLogoManagerHeader, 2),
    (hostOrganizerMediaManagerDockStates, HostOrganizerMediaManagerDock, 1),
    (hostCustomerIdentitySectionStates, HostCustomerIdentitySection, 1),
    (hostCustomerTimelineListStates, HostCustomerTimelineList, 1),
    (hostContactMergeReviewSheetStates, HostContactMergeCandidateCard, 1),
    (hostContactMergeReviewSheetStates, HostDismissedMergeCandidateCard, 1),
    (hostContactMergeCandidateCardStates, HostContactMergeCandidateCard, 1),
    (hostDismissedMergeCandidateCardStates, HostDismissedMergeCandidateCard, 2),
    (hostFormBodyPreview, HostFormBody, 1),
    (hostFormQuestionFieldPreview, HostFormQuestionField, 3),
    (hostFormResponsesSectionPreview, HostFormResponsesSection, 1),
    (hostCampaignReportSectionStates, HostCampaignReportSection, 3),
    (hostManualSendListStates, HostManualSendListBody, 1),
    (hostManualSendListBodyStates, HostManualSendListBody, 2),
    (hostManualSendTaskSheetStates, HostManualSendTaskSheet, 2),
    (hostGuestIntakeSettingsFieldStates, HostGuestIntakeSettingsField, 4),
    (hostGuestIntakeFieldState, HostGuestIntakeSettingsField, 1),
    (hostOperationalRosterSectionState, HostRuntimeClaimList, 1),
    (hostOperationalRosterSectionState, HostRosterInsightRail, 1),
    (hostRosterInsightRailStates, HostRosterInsightRail, 2),
    (hostRuntimeClaimListState, HostRuntimeClaimList, 1),
    (hostEventLiveLocationFieldStates, CatchField, 1),
  ];
  for (final (index, (builder, type, count)) in cases.indexed) {
    testWidgets('case $index: $type renders offline', (tester) async {
      tester.view.devicePixelRatio = 1;
      tester.view.physicalSize = const Size(520, 2400);
      addTearDown(tester.view.resetDevicePixelRatio);
      addTearDown(tester.view.resetPhysicalSize);
      // Tickers stay on, as in Widgetbook: async boundaries animate their reveal.
      await tester.pumpWidget(
        MaterialApp(
          theme: AppTheme.light,
          home: Builder(builder: builder),
        ),
      );
      await pumpFeatureUi(tester);
      // Settle the overridden streams and futures behind stateful owners.
      await tester.pump(const Duration(seconds: 1));
      expect(tester.takeException(), isNull);
      expect(
        find.byType(type, skipOffstage: false),
        findsAtLeastNWidgets(count),
      );
      if (builder == hostEventLiveLocationFieldStates) {
        expect(
          find.descendant(
            of: find.byType(HostEventLiveLocationField),
            matching: find.byType(CatchField),
          ),
          findsOneWidget,
        );
      }
      await tester.pumpWidget(const SizedBox.shrink());
      await tester.pump();
    });
  }
}
