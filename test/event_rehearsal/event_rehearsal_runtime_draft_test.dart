import 'package:catch_dating_app/contexts/live/domain/event_assistance_runtime_configuration.dart';
import 'package:catch_dating_app/contexts/live/domain/event_rehearsal.dart';
import 'package:catch_dating_app/contexts/live/domain/event_rehearsal_delivery_outcome.dart';
import 'package:catch_dating_app/contexts/live/domain/event_rehearsal_runtime_draft.dart';
import 'package:flutter_test/flutter_test.dart';

import 'event_rehearsal_settings_ui_fixtures.dart';

void main() {
  test(
    'proposals are editable and total attempts may cap a larger channel limit',
    () {
      final draft = RehearsalRuntimeDraft.fromConfiguration(null);
      expect(draft.canConfigure(settingsSnapshot('initial')), isTrue);
      final capped = draft.copy(
        deliveryPolicy: AssistanceDeliveryPolicy(
          maxAttempts: 1,
          maxAttemptsPerRoute: 3,
          minimumRetrySeconds: 60,
        ),
      );
      expect(capped.canConfigure(settingsSnapshot('initial')), isTrue);
      expect(capped.configuration().deliveryPolicy.maxAttempts, 1);
      final noRoutes = draft.withRoute(0, null).withRoute(0, null);
      expect(noRoutes.canConfigure(settingsSnapshot('initial')), isFalse);
      expect(draft.withRoute(0, draft.routes[1]), same(draft));
    },
  );
  test('used outcomes and source choices survive edits', () {
    final raw = settingsSample('enrolled');
    (((raw['actors'] as List).first as Map)['assistanceAutomation']
            as Map)['nextOutcomeIndex'] =
        1;
    final snapshot = EventRehearsalBootstrap.fromCallableData(raw);
    final draft = RehearsalRuntimeDraft.fromConfiguration(
      snapshot.settingsReview!.runtime!.configuration,
    );
    final used = RehearsalRuntimeDraft.consumedPrefix(snapshot);
    expect(used, greaterThan(0));
    final changed = draft.copy(
      outcomes: [
        const RehearsalDeliveryConfirmed(RehearsalConfirmedDelivery.read),
        ...draft.outcomes.skip(1),
      ],
    );
    expect(changed.canConfigure(snapshot), isFalse);
    expect(draft.copy().canConfigure(snapshot), isTrue);
    expect(
      draft
          .withDeadline(snapshot.settingsReview!.serverTime)
          .canConfigure(snapshot),
      isFalse,
    );
    expect(draft.copy().laterChoices, same(draft.laterChoices));
  });
}
