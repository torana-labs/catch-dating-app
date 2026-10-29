import 'package:catch_dating_app/event_success/presentation/host_components/event_success_activity_field_lanes.dart';
import 'package:catch_dating_app/event_success/presentation/host_components/event_success_compatibility_section.dart';
import 'package:catch_dating_app/event_success/presentation/host_components/event_success_host_help_section.dart';
import 'package:catch_dating_app/event_success/presentation/host_components/event_success_host_resource_error_state.dart';
import 'package:catch_dating_app/event_success/presentation/host_components/event_success_host_tab_bar.dart';
import 'package:catch_dating_app/event_success/presentation/host_components/event_success_host_tab_page_body.dart';
import 'package:catch_dating_app/event_success/presentation/host_components/event_success_live_workspace_tab_bar.dart';
import 'package:catch_dating_app/event_success/presentation/host_components/event_success_plan_field_lanes.dart';
import 'package:catch_dating_app/event_success/presentation/host_live/event_success_accountability_section.dart';
import 'package:catch_dating_app/event_success/presentation/host_live/event_success_control_room_page_body.dart';
import 'package:catch_dating_app/event_success/presentation/host_live/event_success_control_room_stage_section.dart';
import 'package:catch_dating_app/event_success/presentation/host_live/event_success_control_room_sync_badge.dart';
import 'package:catch_dating_app/event_success/presentation/host_live/event_success_exclusion_alert_banner.dart';
import 'package:catch_dating_app/event_success/presentation/host_live/event_success_host_live_page_body.dart';
import 'package:catch_dating_app/event_success/presentation/host_live/event_success_presence_section.dart';
import 'package:catch_dating_app/event_success/presentation/host_live/event_success_room_summary_section.dart';
import 'package:catch_dating_app/event_success/presentation/host_live/event_success_step_action_row.dart';
import 'package:catch_dating_app/l10n/l10n.dart';
import 'package:catch_dating_app/platform/theme/app_theme.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/material.dart';
import 'package:flutter_localizations/flutter_localizations.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:widgetbook_workspace/event_success/host_live_components_use_cases.dart';

import '../../test/test_pump_helpers.dart';

void main() {
  for (final scale in [1.0, 2.0]) {
    for (final (builder, type, count) in <(WidgetBuilder, Type, int)>[
      (eventSuccessStrictLiveTab, EventSuccessHostLivePageBody, 1),
      (eventSuccessStrictLiveNowConsole, EventSuccessControlRoomPageBody, 1),
      (eventSuccessStrictLiveStepNavigation, EventSuccessStepActionRow, 1),
      (
        previewEventSuccessAccountabilitySection,
        EventSuccessAccountabilitySection,
        1,
      ),
      (
        previewEventSuccessRoomSummarySection,
        EventSuccessRoomSummarySection,
        1,
      ),
      (previewEventSuccessPresenceSection, EventSuccessPresenceSection, 1),
      (
        previewEventSuccessExclusionAlertBanner,
        EventSuccessExclusionAlertBanner,
        1,
      ),
      (
        previewEventSuccessControlRoomStageSection,
        EventSuccessControlRoomStageSection,
        1,
      ),
      (
        previewEventSuccessControlRoomSyncBadge,
        EventSuccessControlRoomSyncBadge,
        1,
      ),
      (
        previewEventSuccessHostResourceErrorState,
        EventSuccessHostResourceErrorState,
        1,
      ),
      (
        previewEventSuccessLiveWorkspaceTabBar,
        EventSuccessLiveWorkspaceTabBar,
        1,
      ),
      (eventSuccessStrictEventSuccessTabPicker, EventSuccessHostTabBar, 1),
      (
        eventSuccessStrictEventSuccessHostTabBody,
        EventSuccessHostTabPageBody,
        1,
      ),
      (eventSuccessStrictPlanSummary, EventSuccessPlanFieldLanes, 1),
      (
        eventSuccessStrictHostActivitySummary,
        EventSuccessActivityFieldLanes,
        1,
      ),
      (
        eventSuccessStrictCompatibilitySignalHostCard,
        EventSuccessCompatibilitySection,
        1,
      ),
      (
        eventSuccessStrictWingmanRequestsHostCard,
        EventSuccessHostHelpSection,
        1,
      ),
      (eventSuccessStrictWingmanRequestHostRow, CatchField, 1),
    ]) {
      testWidgets('$type mounts at text scale $scale', (tester) async {
        tester.view.devicePixelRatio = 1;
        tester.view.physicalSize = const Size(860, 2400);
        addTearDown(tester.view.resetDevicePixelRatio);
        addTearDown(tester.view.resetPhysicalSize);
        for (final theme in [AppTheme.light, AppTheme.dark]) {
          await tester.pumpWidget(
            MaterialApp(
              theme: theme,
              localizationsDelegates: const [
                AppLocalizations.delegate,
                ...GlobalMaterialLocalizations.delegates,
              ],
              supportedLocales: AppLocalizations.supportedLocales,
              home: Scaffold(
                body: Builder(
                  builder: (context) => MediaQuery(
                    data: MediaQuery.of(context).copyWith(
                      textScaler: TextScaler.linear(scale),
                      disableAnimations: true,
                    ),
                    child: TickerMode(
                      enabled: false,
                      child: Builder(builder: builder),
                    ),
                  ),
                ),
              ),
            ),
          );
          await pumpFeatureUi(tester);
          expect(tester.takeException(), isNull);
          expect(find.byType(type), findsNWidgets(count));
          await tester.pumpWidget(const SizedBox.shrink());
          await tester.pump();
        }
      });
    }
  }
}
