import 'package:catch_dating_app/contexts/live/domain/event_assistance_runtime_configuration.dart';
import 'package:catch_dating_app/contexts/live/domain/event_assistance_runtime_draft.dart';
import 'package:catch_dating_app/contexts/live/domain/event_assistance_runtime_setting.dart';
import 'package:flutter_test/flutter_test.dart';

import 'event_assistance_runtime_ui_fixtures.dart';

void main() {
  test('defaults propose limits but never choose a sender', () {
    final view = runtimeUiView('initial');
    final draft = AssistanceRuntimeDraft.fromView(view);
    expect(draft.routes, isEmpty);
    expect(draft.expiresAt, view.eventEnd);
    expect(draft.responseDeadline, isNull);
    expect(
      draft.issueFor(view, view.senderSetup!.choices),
      AssistanceRuntimeDraftIssue.noChannels,
    );
    expect(
      () => draft.configurationFor(view, view.senderSetup!.choices),
      throwsStateError,
    );
  });
  test(
    'route changes preserve saved limits and absent versus empty later choices',
    () {
      for (final empty in [true, false]) {
        final raw = (runtimeUiFixture('configured')['view']! as Map)
            .cast<String, Object?>();
        final record = raw['runtime']! as Map;
        final configuration = record['configuration']! as Map;
        configuration['maxEvaluations'] = 137;
        if (empty) (configuration['options']! as Map)['laterChoices'] = [];
        final view = AssistanceRuntimeView.fromJson(
          raw,
          expectedScope: runtimeUiScope(),
        );
        final draft = AssistanceRuntimeDraft.fromView(view);
        final next = draft.withRoute(0, null);
        final output = next.configurationFor(view, view.senderSetup!.choices);
        expect(
          output.routes.map((r) => r.route),
          draft.routes.skip(1).map((r) => r.route),
        );
        expect(output.deliveryPolicy.toJson(), draft.deliveryPolicy.toJson());
        expect(output.maxEvaluations, 137);
        expect(
          output.toJson()['options'],
          containsPair('responseDeadline', null),
        );
        expect(
          (output.toJson()['options']! as Map).containsKey('laterChoices'),
          empty,
        );
        expect(() => next.routes.clear(), throwsUnsupportedError);
      }
    },
  );
  test(
    'channel uniqueness, verified identity and event time bound configuration',
    () {
      final view = runtimeUiView('initial');
      final choices = view.senderSetup!.choices;
      final draft = AssistanceRuntimeDraft.fromView(
        view,
      ).withRoute(0, choices.first);
      expect(() => draft.withRoute(1, choices.first), throwsFormatException);
      expect(
        draft.issueFor(view, []),
        AssistanceRuntimeDraftIssue.senderUnavailable,
      );
      expect(
        draft.withExpiry(view.serverTime).issueFor(view, choices),
        AssistanceRuntimeDraftIssue.expiry,
      );
      expect(
        draft.withExpiry(view.eventEnd + 1).issueFor(view, choices),
        AssistanceRuntimeDraftIssue.expiry,
      );
      expect(
        draft.withDeadline(view.serverTime).issueFor(view, choices),
        AssistanceRuntimeDraftIssue.deadline,
      );
      expect(
        draft.withDeadline(view.eventEnd + 1).issueFor(view, choices),
        AssistanceRuntimeDraftIssue.deadline,
      );
      final changed = draft
          .withDeadline(view.eventEnd)
          .withDelivery(
            AssistanceDeliveryPolicy(
              maxAttempts: 4,
              maxAttemptsPerRoute: 2,
              minimumRetrySeconds: 10,
            ),
          );
      expect(
        changed.configurationFor(view, choices).responseDeadline,
        view.eventEnd,
      );
      expect(changed.withDeadline(null).responseDeadline, isNull);
    },
  );
}
