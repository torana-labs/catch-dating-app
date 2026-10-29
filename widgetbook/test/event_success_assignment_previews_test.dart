import 'package:catch_dating_app/event_success/presentation/assignments/event_success_assignment_reason_notice.dart';
import 'package:catch_dating_app/event_success/presentation/assignments/event_success_group_override_round_section.dart';
import 'package:catch_dating_app/event_success/presentation/assignments/event_success_group_override_sheet.dart';
import 'package:catch_dating_app/event_success/presentation/assignments/event_success_host_pod_section.dart';
import 'package:catch_dating_app/event_success/presentation/assignments/event_success_host_rotation_section.dart';
import 'package:catch_dating_app/event_success/presentation/assignments/event_success_pod_summary_row.dart';
import 'package:catch_dating_app/event_success/presentation/assignments/event_success_rotation_override_round_section.dart';
import 'package:catch_dating_app/event_success/presentation/assignments/event_success_rotation_override_sheet.dart';
import 'package:catch_dating_app/l10n/l10n.dart';
import 'package:catch_dating_app/platform/theme/app_theme.dart';
import 'package:flutter/material.dart';
import 'package:flutter_localizations/flutter_localizations.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:widgetbook_workspace/event_success/host_assignment_components_use_cases.dart';

import '../../test/test_pump_helpers.dart';

void main() {
  for (final scale in [1.0, 2.0]) {
    for (final (builder, type, count) in <(WidgetBuilder, Type, int)>[
      (eventSuccessStrictMicroPodsHostCard, EventSuccessHostPodSection, 1),
      (eventSuccessStrictRotationsHostCard, EventSuccessHostRotationSection, 1),
      (eventSuccessStrictGroupOverrideSheet, EventSuccessGroupOverrideSheet, 1),
      (
        eventSuccessStrictRotationOverrideSheet,
        EventSuccessRotationOverrideSheet,
        1,
      ),
      (
        eventSuccessStrictGroupOverrideRoundEditor,
        EventSuccessGroupOverrideRoundSection,
        1,
      ),
      (
        eventSuccessStrictGroupOverrideUnitEditor,
        EventSuccessGroupOverrideFieldLanes,
        1,
      ),
      (
        eventSuccessStrictGroupOverrideMemberEditor,
        EventSuccessGroupMemberField,
        1,
      ),
      (
        eventSuccessStrictRotationOverrideRoundEditor,
        EventSuccessRotationOverrideRoundSection,
        1,
      ),
      (
        eventSuccessStrictRotationOverridePairEditor,
        EventSuccessRotationPairFieldLanes,
        1,
      ),
      (eventSuccessStrictPodGroupSummary, EventSuccessPodSummaryRow, 1),
      (
        eventSuccessStrictAssignmentReasonSummary,
        EventSuccessAssignmentReasonNotice,
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
