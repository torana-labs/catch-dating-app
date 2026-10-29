import 'package:catch_dating_app/contexts/live/domain/event_assistance_late_join_destination.dart';
import 'package:catch_dating_app/contexts/live/domain/event_assistance_late_join_template.dart';
import 'package:catch_dating_app/contexts/live/domain/event_rehearsal_assistance_command.dart';
import 'package:catch_dating_app/contexts/live/domain/event_rehearsal_assistance_plan.dart';
import 'package:catch_dating_app/contexts/live/domain/event_rehearsal_publication.dart';
import 'package:flutter_test/flutter_test.dart';

import 'event_rehearsal_assistance_fixtures.dart';
import 'event_rehearsal_movement_fixtures.dart';

void main() {
  test(
    'source-derived recipes retain mode without turning a preview into publication',
    () {
      final snapshot = movementSnapshot('departed');
      final point = rehearsalDefaultJoiningPoint(snapshot.movementReview!)!;
      final legacy = practicePlan();
      for (final setting in [
        for (final authority in AssistanceTemplateAuthority.values)
          AssistanceTemplateEnabled(authority),
        const AssistanceTemplateDisabled(
          AssistanceTemplateDisabledReason.hostChoice,
        ),
      ]) {
        final draft = RehearsalPublicationDraft(
          actorId: 'actor-01',
          joiningPoint: point,
          rules: practiceRules(destination: const LateJoinConfirmedProgress()),
          routes: legacy.routes,
          deliveryPolicy: legacy.deliveryPolicy,
          setting: setting,
        );
        final configured = draft.configure(snapshot, [
          const RehearsalDeliveryConfirmed(
            RehearsalConfirmedDelivery.delivered,
          ),
        ]);
        expect(configured.plan.setting!.toJson(), setting.toJson());
        expect(draft.preview(snapshot), isA<RehearsalJoiningConfirmed>());
        if (setting is AssistanceTemplateEnabled &&
            setting.authority ==
                AssistanceTemplateAuthority.executeWithinPolicy) {
          expect(
            draft.prepare(snapshot).plan.setting!.toJson(),
            setting.toJson(),
          );
        } else {
          expect(() => draft.prepare(snapshot), throwsFormatException);
        }
      }
    },
  );
  test('practice modes preserve closed wire identity and earlier recipes', () {
    final legacy = practicePlan().toJson();
    final before = RehearsalAssistancePlan.fromJson(legacy);
    expect(before.toJson(), legacy);
    expect(before.setting, isNull);
    expect(
      (before.effectiveSetting as AssistanceTemplateEnabled).authority,
      AssistanceTemplateAuthority.executeWithinPolicy,
    );
    for (final setting in [
      for (final authority in AssistanceTemplateAuthority.values)
        AssistanceTemplateEnabled(authority),
      for (final reason in AssistanceTemplateDisabledReason.values)
        AssistanceTemplateDisabled(reason),
    ]) {
      final raw = {...legacy, 'setting': setting.toJson()};
      final plan = RehearsalAssistancePlan.fromJson(raw);
      expect(plan.toJson(), raw);
      expect(plan.effectiveSetting.toJson(), setting.toJson());
    }
  });
  test(
    'null, foreign authority and client-supplied policy version are rejected',
    () {
      for (final setting in [
        null,
        {'kind': 'enabled', 'authority': 'sendNow'},
        {
          'kind': 'enabled',
          'authority': 'executeWithinPolicy',
          'policyVersion': 'live',
        },
        {'kind': 'disabled', 'reason': 'providerPaused'},
      ]) {
        expect(
          () => RehearsalAssistancePlan.fromJson({
            ...practicePlan().toJson(),
            'setting': setting,
          }),
          throwsFormatException,
        );
      }
    },
  );
}
