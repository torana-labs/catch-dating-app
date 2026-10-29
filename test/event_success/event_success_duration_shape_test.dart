import 'package:catch_dating_app/contexts/formats/domain/event_success_feature_state.dart';
import 'package:catch_dating_app/contexts/formats/domain/event_success_models.dart';
import 'package:catch_dating_app/contexts/formats/domain/event_success_playbooks.dart';
import 'package:catch_dating_app/event_success/presentation/host_live/event_success_step_action_row.dart';
import 'package:catch_dating_app/platform/theme/app_theme.dart';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  testWidgets('live navigation uses each duration shape vocabulary', (
    tester,
  ) async {
    const expectations = {
      EventSuccessDurationShape.continuous: 'Next: Beat 2 · Next step',
      EventSuccessDurationShape.rounds: 'Next: Round 2 · Next step',
      EventSuccessDurationShape.courses: 'Next: Second course · Next step',
      EventSuccessDurationShape.segments: 'Next: Leg 2 · Next step',
    };

    for (final entry in expectations.entries) {
      await tester.pumpWidget(
        MaterialApp(
          theme: AppTheme.light,
          home: Scaffold(
            body: EventSuccessStepActionRow(
              plan: EventSuccessLivePlan(
                playbook: EventSuccessPlaybookLibrary.hostLedSocial,
                durationShape: entry.key,
                steps: _steps,
                activeStepIndex: 0,
                checkedInCount: 8,
                bookedCount: 10,
              ),
              onPrevious: null,
              onNext: () {},
            ),
          ),
        ),
      );

      expect(find.text(entry.value), findsOneWidget);
    }
  });
}

const _steps = [
  EventRunOfShowStep(
    stage: EventSuccessStage.opening,
    title: 'Current step',
    hostInstruction: 'Keep going.',
    attendeeExperience: 'Stay present.',
    durationMinutes: 5,
  ),
  EventRunOfShowStep(
    stage: EventSuccessStage.activity,
    title: 'Next step',
    hostInstruction: 'Move forward.',
    attendeeExperience: 'Join the next beat.',
    durationMinutes: 10,
  ),
];
