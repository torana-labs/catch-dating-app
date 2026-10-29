import 'package:catch_dating_app/event_success/presentation/event_success_host_workspace_page_body.dart';
import 'package:catch_dating_app/event_success/presentation/host_components/event_success_host_section_loading_page_body.dart';
import 'package:catch_dating_app/event_success/presentation/host_report/event_success_funnel_section.dart';
import 'package:catch_dating_app/event_success/presentation/host_report/event_success_host_report_page_body.dart';
import 'package:catch_dating_app/event_success/presentation/host_report/event_success_report_quality_section.dart';
import 'package:catch_dating_app/event_success/presentation/host_setup/event_success_host_setup_page_body.dart';
import 'package:catch_dating_app/event_success/presentation/host_setup/event_success_readiness_field.dart';
import 'package:catch_dating_app/event_success/presentation/host_setup/event_success_target_attendees_field.dart';
import 'package:catch_dating_app/l10n/l10n.dart';
import 'package:catch_dating_app/platform/theme/app_theme.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/material.dart';
import 'package:flutter_localizations/flutter_localizations.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:widgetbook_workspace/event_success/host_workspace_components_use_cases.dart';

import '../../test/test_pump_helpers.dart';

void main() {
  for (final scale in [1.0, 2.0]) {
    for (final (builder, type, count) in <(WidgetBuilder, Type, int)>[
      (
        eventSuccessStrictEventSuccessHostPanel,
        EventSuccessHostWorkspacePageBody,
        1,
      ),
      (eventSuccessStrictSetupTab, EventSuccessHostSetupPageBody, 1),
      (
        eventSuccessStrictTargetAttendeeControl,
        EventSuccessTargetAttendeesField,
        1,
      ),
      (eventSuccessStrictReadinessIssues, EventSuccessReadinessField, 1),
      (eventSuccessStrictReportTab, EventSuccessHostReportPageBody, 1),
      (previewEventSuccessReportStatus, CatchSection, 1),
      (
        eventSuccessStrictHostReportSignalGrid,
        EventSuccessReportQualitySection,
        1,
      ),
      (eventSuccessStrictHostFunnelSummary, EventSuccessFunnelSection, 1),
      (
        eventSuccessStrictEventSuccessHostSectionLoadingPageBody,
        EventSuccessHostSectionLoadingPageBody,
        1,
      ),
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
