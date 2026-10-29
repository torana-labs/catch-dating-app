import 'package:catch_dating_app/event_success/presentation/reveal/event_success_assignment_surface.dart';
import 'package:catch_dating_app/event_success/presentation/reveal/event_success_attendee_reveal_surface.dart';
import 'package:catch_dating_app/event_success/presentation/reveal/event_success_countdown_indicator.dart';
import 'package:catch_dating_app/event_success/presentation/reveal/event_success_countdown_notice_row_list.dart';
import 'package:catch_dating_app/event_success/presentation/reveal/event_success_countdown_stepper.dart';
import 'package:catch_dating_app/event_success/presentation/reveal/event_success_countdown_surface.dart';
import 'package:catch_dating_app/event_success/presentation/reveal/event_success_countdown_text.dart';
import 'package:catch_dating_app/event_success/presentation/reveal/event_success_group_rotation_row_list.dart';
import 'package:catch_dating_app/event_success/presentation/reveal/event_success_host_reveal_surface.dart';
import 'package:catch_dating_app/event_success/presentation/reveal/event_success_host_reveal_viewport.dart';
import 'package:catch_dating_app/event_success/presentation/reveal/event_success_outcome_section.dart';
import 'package:catch_dating_app/event_success/presentation/reveal/event_success_pod_assignment_section.dart';
import 'package:catch_dating_app/event_success/presentation/reveal/event_success_reveal_action_row.dart';
import 'package:catch_dating_app/event_success/presentation/reveal/event_success_reveal_header.dart';
import 'package:catch_dating_app/event_success/presentation/reveal/event_success_reveal_progress_indicator.dart';
import 'package:catch_dating_app/event_success/presentation/reveal/event_success_reveal_round_row_list.dart';
import 'package:catch_dating_app/event_success/presentation/reveal/event_success_reveal_round_stepper.dart';
import 'package:catch_dating_app/event_success/presentation/reveal/event_success_reveal_waiting_notice.dart';
import 'package:catch_dating_app/event_success/presentation/reveal/event_success_rotation_row_list.dart';
import 'package:catch_dating_app/event_success/presentation/reveal/event_success_standings_section.dart';
import 'package:catch_dating_app/l10n/l10n.dart';
import 'package:catch_dating_app/platform/theme/app_theme.dart';
import 'package:flutter/material.dart';
import 'package:flutter_localizations/flutter_localizations.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:widgetbook_workspace/event_success/host_reveal_components_use_cases.dart';
import 'package:widgetbook_workspace/event_success/specimens/live_reveal.dart';

import '../../test/test_pump_helpers.dart';

void main() {
  for (final scale in [1.0, 2.0]) {
    for (final (builder, type, count) in <(WidgetBuilder, Type, int)>[
      (
        eventSuccessStrictAssignmentUnlockedShell,
        EventSuccessAssignmentSurface,
        1,
      ),
      (eventSuccessStrictAttendeeCountdown, EventSuccessCountdownSurface, 1),
      (eventSuccessStrictCountdownBeatRail, EventSuccessCountdownStepper, 1),
      (eventSuccessStrictCountdownCuePill, EventSuccessCountdownNotice, 1),
      (
        eventSuccessStrictCountdownCueStack,
        EventSuccessCountdownNoticeRowList,
        1,
      ),
      (eventSuccessStrictCountdownNumber, EventSuccessCountdownText, 1),
      (eventSuccessStrictCountdownStageDial, EventSuccessCountdownIndicator, 1),
      (
        eventSuccessStrictEventSuccessLiveRevealAttendeeCard,
        EventSuccessAttendeeRevealSurface,
        1,
      ),
      (
        eventSuccessStrictEventSuccessLiveRevealHostCard,
        EventSuccessHostRevealSurface,
        1,
      ),
      (eventSuccessStrictHostRevealActions, EventSuccessRevealActionRow, 1),
      (eventSuccessStrictRevealGroupSlotRow, EventSuccessGroupRotationRow, 1),
      (eventSuccessStrictRevealHostCopy, EventSuccessRevealHeader, 1),
      (
        eventSuccessStrictRevealProgressBar,
        EventSuccessRevealProgressIndicator,
        1,
      ),
      (eventSuccessStrictRevealRoundList, EventSuccessRevealRoundRowList, 1),
      (eventSuccessStrictRevealRoundRail, EventSuccessRevealRoundStepper, 1),
      (eventSuccessStrictRevealSlotRow, EventSuccessRotationRow, 1),
      (
        eventSuccessStrictVisibleGroupRotationSlots,
        EventSuccessGroupRotationRowList,
        1,
      ),
      (
        eventSuccessStrictVisiblePodAssignment,
        EventSuccessPodAssignmentSection,
        1,
      ),
      (eventSuccessStrictVisibleRotationSlots, EventSuccessRotationRowList, 1),
      (eventSuccessStrictWaitingRevealCue, EventSuccessRevealWaitingNotice, 1),
      (eventSuccessStrictRevealRoundRow, EventSuccessRevealRoundRow, 3),
      (eventSuccessStandingsSectionStates, EventSuccessStandingsSection, 1),
      (eventSuccessOutcomeSectionStates, EventSuccessOutcomeSection, 1),
      (eventSuccessHostRevealViewportStates, EventSuccessHostRevealViewport, 1),
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
