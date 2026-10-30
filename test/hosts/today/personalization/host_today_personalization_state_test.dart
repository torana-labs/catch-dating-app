import 'package:catch_dating_app/contexts/insights/domain/host_today_preference.dart';
import 'package:catch_dating_app/hosts/today/personalization/presentation/host_today_personalization_state.dart';
import 'package:catch_dating_app/hosts/today/presentation/host_today_feed_controller.dart';
import 'package:catch_dating_app/hosts/today/presentation/host_today_state.dart';
import 'package:flutter_test/flutter_test.dart';

import '../../../organizers/organizers_test_helpers.dart' show buildEvent;

void main() {
  const quiet = HostTodayState(status: HostTodayStatus.empty);
  const unknownEvidence = HostTodayRoadmapEvidence();

  HostTodayPersonalizationState build({
    HostTodayState today = quiet,
    HostTodayPreference preference = const HostTodayPreference.unanswered(),
    HostTodayRoadmapEvidence evidence = unknownEvidence,
  }) => buildHostTodayPersonalizationState(
    today: today,
    preference: preference,
    evidence: evidence,
  );

  test('first quiet visit offers orientation, skip does not ask again', () {
    expect(build().showOrientation, isTrue);
    expect(build().primaryAction, isNull);
    final skipped = build(preference: const HostTodayPreference.skipped());
    expect(skipped.showOrientation, isFalse);
    expect(skipped.focus, isNull);
    expect(skipped.primaryAction, HostTodaySuggestedAction.startDressRehearsal);
  });

  final focusedActions = {
    HostTodayFocus.audience: HostTodaySuggestedAction.openAudience,
    HostTodayFocus.rehearsal: HostTodaySuggestedAction.startDressRehearsal,
    HostTodayFocus.organizerPresence:
        HostTodaySuggestedAction.openOrganizerPage,
  };
  for (final entry in focusedActions.entries) {
    test('${entry.key.name} changes the primary action and roadmap order', () {
      final state = build(preference: HostTodayPreference.selected(entry.key));
      expect(state.focus, entry.key);
      expect(state.showOrientation, isFalse);
      expect(state.primaryAction, entry.value);
      expect(state.roadmap.first.action, entry.value);
      expect(
        state.roadmap.map((step) => step.milestone).toSet(),
        HostTodayMilestone.values.toSet(),
      );
    });
  }

  test(
    'CRM add action requires evidence that the audience milestone is incomplete',
    () {
      const preference = HostTodayPreference.selected(HostTodayFocus.audience);
      for (final progress in HostTodayMilestoneProgress.values) {
        final state = build(
          preference: preference,
          evidence: HostTodayRoadmapEvidence(audience: progress),
        );
        expect(
          state.primaryAction,
          progress == HostTodayMilestoneProgress.incomplete
              ? HostTodaySuggestedAction.addCustomer
              : HostTodaySuggestedAction.openAudience,
        );
      }
    },
  );

  test('unknown evidence does not become incomplete or completed setup', () {
    final state = build();
    expect(state.completedMilestones, 0);
    expect(
      state.roadmap.every(
        (step) => step.progress == HostTodayMilestoneProgress.unknown,
      ),
      isTrue,
    );
  });

  test('public page and payments are independent, optional milestones', () {
    final state = build(
      preference: const HostTodayPreference.selected(
        HostTodayFocus.organizerPresence,
      ),
      evidence: const HostTodayRoadmapEvidence(
        organizerPage: HostTodayMilestoneProgress.complete,
        payouts: HostTodayMilestoneProgress.incomplete,
      ),
    );
    expect(state.completedMilestones, 1);
    expect(state.roadmap.first.progress, HostTodayMilestoneProgress.complete);
    expect(state.roadmap.last.milestone, HostTodayMilestone.payouts);
    expect(state.roadmap.last.progress, HostTodayMilestoneProgress.incomplete);
    // Completing a page doesn't force the host into payments onboarding.
    expect(state.primaryAction, HostTodaySuggestedAction.openOrganizerPage);
  });

  test('roadmap is immutable and practice remains useful after completion', () {
    final state = build(
      preference: const HostTodayPreference.selected(HostTodayFocus.rehearsal),
      evidence: const HostTodayRoadmapEvidence(
        audience: HostTodayMilestoneProgress.complete,
        rehearsal: HostTodayMilestoneProgress.complete,
        organizerPage: HostTodayMilestoneProgress.complete,
        payouts: HostTodayMilestoneProgress.complete,
      ),
    );
    expect(state.completedMilestones, 4);
    expect(state.primaryAction, HostTodaySuggestedAction.startDressRehearsal);
    expect(() => state.roadmap.clear(), throwsUnsupportedError);
  });

  for (final status in [
    HostTodayStatus.loading,
    HostTodayStatus.error,
    HostTodayStatus.content,
  ]) {
    test('$status always outranks orientation and adoption actions', () {
      for (final preference in [
        const HostTodayPreference.unanswered(),
        const HostTodayPreference.skipped(),
        for (final focus in HostTodayFocus.values)
          HostTodayPreference.selected(focus),
      ]) {
        final state = build(
          today: HostTodayState(status: status),
          preference: preference,
        );
        expect(state.showOrientation, isFalse);
        expect(state.primaryAction, isNull);
      }
    });
  }

  test(
    'attention failures prevent a false quiet orientation or next action',
    () {
      for (final source in HostTodayAttentionIssueSource.values) {
        final today = HostTodayState(
          status: HostTodayStatus.empty,
          attentionIssues: [
            HostTodayAttentionIssue(
              source: source,
              error: StateError('Unavailable'),
              stackTrace: StackTrace.current,
            ),
          ],
        );
        expect(build(today: today).showOrientation, isFalse);
        expect(
          build(
            today: today,
            preference: const HostTodayPreference.skipped(),
          ).primaryAction,
          isNull,
        );
      }
    },
  );

  test(
    'featured and later events cannot be masked by an inconsistent empty flag',
    () {
      final event = buildEvent();
      for (final today in [
        HostTodayState(status: HostTodayStatus.empty, featuredEvent: event),
        HostTodayState(
          status: HostTodayStatus.empty,
          laterEvents: [
            HostTodayEventRowData(
              event: event,
              isToday: false,
              isLive: false,
              fillRatio: 0,
            ),
          ],
        ),
      ]) {
        expect(build(today: today).showOrientation, isFalse);
        expect(
          build(
            today: today,
            preference: const HostTodayPreference.skipped(),
          ).primaryAction,
          isNull,
        );
      }
    },
  );
}
