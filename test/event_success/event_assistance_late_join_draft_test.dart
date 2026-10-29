import 'dart:convert';
import 'dart:io';

import 'package:catch_dating_app/contexts/live/domain/event_assistance_group_progress.dart';
import 'package:catch_dating_app/contexts/live/domain/event_assistance_late_join_destination.dart';
import 'package:catch_dating_app/contexts/live/domain/event_assistance_late_join_draft.dart';
import 'package:catch_dating_app/contexts/live/domain/event_assistance_late_join_setting.dart';
import 'package:catch_dating_app/contexts/live/domain/event_assistance_late_join_template.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  final fixture =
      jsonDecode(
            File(
              'test/event_success/fixtures/late_join_settings.json',
            ).readAsStringSync(),
          )
          as Map<String, Object?>;
  Map<String, Object?> map(Object? value) => value! as Map<String, Object?>;
  LateJoinSettingView sample([
    String name = 'initial',
    String groupId = 'event:whole',
  ]) {
    final raw = map(jsonDecode(jsonEncode(map(fixture[name])['view'])));
    final context = map(raw['context']);
    raw['groupId'] = groupId;
    return LateJoinSettingView.fromJson(
      raw,
      expectedScope: EventAssistanceGroupScope(
        organizerId: context['organizerId']! as String,
        eventId: context['eventId']! as String,
        groupId: groupId,
      ),
    );
  }

  test('known missing deadlines block only enabled host-review rules', () {
    final view = sample();
    final base = LateJoinSettingDraft.fromView(view);
    final draft = base.withRules(
      base.rules!.copyWith(
        unanswered: LateJoinUnansweredRule.hostReviewAtDeadline,
      ),
    );
    for (final timing in LateJoinRuntimeTiming.values) {
      for (final mode in LateJoinDraftMode.values) {
        final value = draft.withMode(mode);
        final scope = mode == LateJoinDraftMode.inherit
            ? 'easy'
            : 'event:whole';
        final invalid =
            timing == LateJoinRuntimeTiming.noResponseDeadline &&
            mode != LateJoinDraftMode.disabled &&
            mode != LateJoinDraftMode.inherit;
        expect(
          value.issueForSetup(
            groupId: scope,
            serverTime: view.serverTime,
            setup: view.setup,
            runtimeTiming: timing,
          ),
          invalid ? LateJoinDraftIssue.missingResponseDeadline : null,
        );
        if (invalid) {
          expect(
            () => value.preferenceForSetup(
              groupId: scope,
              serverTime: view.serverTime,
              setup: view.setup,
              runtimeTiming: timing,
            ),
            throwsStateError,
          );
        }
      }
    }
    expect(
      base.issueForSetup(
        groupId: 'event:whole',
        serverTime: view.serverTime,
        setup: view.setup,
        runtimeTiming: LateJoinRuntimeTiming.noResponseDeadline,
      ),
      isNull,
    );
  });

  test('defaults are a local proposal and group defaults remain inherited', () {
    final view = sample();
    final draft = LateJoinSettingDraft.fromView(view);
    expect(draft.mode, LateJoinDraftMode.prepare);
    expect(draft.rules!.destination, isA<LateJoinConfirmedProgress>());
    expect(draft.issueFor(view), isNull);
    expect(view.own, isNull);
    expect(view.effective, isNull);
    final group = sample('initial', 'easy');
    final inherited = LateJoinSettingDraft.fromView(group);
    expect(inherited.mode, LateJoinDraftMode.inherit);
    expect(inherited.preferenceFor(group), isA<LateJoinInherit>());
    expect(
      draft.withMode(LateJoinDraftMode.inherit).issueFor(view),
      LateJoinDraftIssue.eventInheritance,
    );
  });

  test(
    'changing mode preserves every custom rule, including disabled configuration',
    () {
      final view = sample('custom');
      final original = LateJoinSettingDraft.fromView(view);
      for (final mode in LateJoinDraftMode.values.where(
        (m) => m != LateJoinDraftMode.inherit,
      )) {
        final next = original.withMode(mode);
        final preference = next.preferenceFor(view) as LateJoinConfigured;
        expect(preference.template.rules.toJson(), original.rules!.toJson());
        expect(
          preference.template.setting,
          mode == LateJoinDraftMode.disabled
              ? isA<AssistanceTemplateDisabled>()
              : isA<AssistanceTemplateEnabled>(),
        );
      }
      final off = LateJoinSettingDraft.fromView(sample('disabled'));
      expect(off.mode, LateJoinDraftMode.disabled);
      expect(off.rules!.toJson(), original.rules!.toJson());
      expect(
        off.withMode(LateJoinDraftMode.automatic).preferenceFor(view),
        isA<LateJoinConfigured>(),
      );
    },
  );

  test(
    'missing setup permits stopping or inheritance but cannot configure unknown destinations',
    () {
      final view = sample();
      final raw = map(jsonDecode(jsonEncode(map(fixture['initial'])['view'])))
        ..remove('setup');
      final legacy = LateJoinSettingView.fromJson(
        raw,
        expectedScope: view.scope,
      );
      final draft = LateJoinSettingDraft.fromView(legacy);
      expect(draft.issueFor(legacy), LateJoinDraftIssue.setupUnavailable);
      expect(() => draft.preferenceFor(legacy), throwsStateError);
      expect(
        draft.withMode(LateJoinDraftMode.disabled).issueFor(legacy),
        isNull,
      );
    },
  );

  test(
    'removed joining points stay invalid until explicitly changed; disabling remains available',
    () {
      final view = sample();
      final base = LateJoinSettingDraft.fromView(view);
      for (final destination in [
        LateJoinFixedPlace(placeId: 'gone', lateEntry: LateEntryRule.allowed),
        LateJoinItinerary(
          itineraryId: '${view.scope.eventId}:itinerary',
          permittedStopIds: ['gone'],
        ),
        LateJoinGroupCheckpoints(
          routeId: 'route',
          groupId: 'other',
          permittedCheckpointIds: ['one'],
        ),
      ]) {
        final draft = base.withRules(
          base.rules!.copyWith(destination: destination),
        );
        expect(draft.issueFor(view), LateJoinDraftIssue.destinationChanged);
        expect(
          draft.withMode(LateJoinDraftMode.disabled).issueFor(view),
          isNull,
        );
        expect(draft.rules!.destination.toJson(), destination.toJson());
      }
    },
  );

  test('custom cutoffs must be future times inside the reviewed event', () {
    final view = sample();
    final base = LateJoinSettingDraft.fromView(view);
    for (final at in [0, view.serverTime, view.setup!.eventEnd + 1]) {
      expect(
        base
            .withRules(base.rules!.copyWith(cutoff: LateJoinAtTime(at)))
            .issueFor(view),
        LateJoinDraftIssue.invalidCutoff,
      );
    }
    expect(
      base
          .withRules(
            base.rules!.copyWith(cutoff: LateJoinAtTime(view.setup!.eventEnd)),
          )
          .issueFor(view),
      isNull,
    );
    expect(
      base
          .withRules(base.rules!.copyWith(cutoff: const LateJoinEventEnd()))
          .issueFor(view),
      isNull,
    );
  });

  test(
    'editing one rule retains all other rules and enforces canonical limits',
    () {
      final rules = LateJoinSettingDraft.fromView(sample('custom')).rules!;
      final changed = rules.copyWith(
        maxMessagesPerEpisode: 5,
        minimumMinutesBetweenMessages: 20,
      );
      expect(changed.destination.toJson(), rules.destination.toJson());
      expect(changed.cutoff.toJson(), rules.cutoff.toJson());
      expect(changed.unanswered, rules.unanswered);
      expect(changed.maxMessagesPerEpisode, 5);
      expect(changed.minimumMinutesBetweenMessages, 20);
      expect(
        () => rules.copyWith(maxMessagesPerEpisode: 101),
        throwsFormatException,
      );
      expect(
        () => rules.copyWith(minimumMinutesBetweenMessages: -1),
        throwsFormatException,
      );
    },
  );
}
