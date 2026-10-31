import 'dart:convert';
import 'dart:io';

import 'package:catch_dating_app/contexts/live/domain/event_assistance_late_join_draft.dart';
import 'package:catch_dating_app/contexts/live/domain/event_assistance_late_join_rules.dart';
import 'package:catch_dating_app/contexts/live/domain/event_assistance_late_join_setting.dart';
import 'package:catch_dating_app/contexts/live/domain/event_assistance_runtime_configuration.dart';
import 'package:catch_dating_app/contexts/live/domain/event_rehearsal.dart';
import 'package:catch_dating_app/contexts/live/domain/event_rehearsal_assistance_automation.dart';
import 'package:catch_dating_app/contexts/live/domain/event_rehearsal_settings_change.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:json_schema/json_schema.dart';

import '../support/contract_schemas.dart';

Map<String, Object?> sample(String name) =>
    (jsonDecode(
              File(
                'test/event_rehearsal/fixtures/settings_reviews.json',
              ).readAsStringSync(),
            )
            as Map)[name]
        as Map<String, Object?>;
EventRehearsalBootstrap snapshot(String name) =>
    EventRehearsalBootstrap.fromCallableData(sample(name));
Map<String, Object?> review(Map<String, Object?> sample) =>
    sample['settingsReview']! as Map<String, Object?>;

void main() {
  final schema = JsonSchema.create(
    contractSchema('ControlEventRehearsalCallablePayload'),
  );
  test('practice command and form use the same deadline prerequisite', () {
    for (final name in ['initial', 'configured', 'paused']) {
      for (final withDeadline in [false, true]) {
        final raw = sample(name);
        final runtime = review(raw)['runtime'] as Map?;
        if (runtime != null && withDeadline) {
          (runtime['configuration'] as Map)['responseDeadline'] =
              snapshot(name).settingsReview!.serverTime + 60000;
        }
        final current = EventRehearsalBootstrap.fromCallableData(raw);
        final settings = current.settingsReview!;
        final group = settings.groups['event:whole']!;
        final base = LateJoinSettingDraft.fromPreference(
          LateJoinConfigured(settings.suggested),
        );
        final draft = base.withRules(
          base.rules!.copyWith(
            unanswered: LateJoinUnansweredRule.hostReviewAtDeadline,
          ),
        );
        final blocked = runtime != null && !withDeadline;
        expect(
          draft.issueForSetup(
            groupId: group.id,
            serverTime: settings.serverTime,
            setup: group.setup,
            runtimeTiming: settings.runtimeTiming,
          ),
          blocked ? LateJoinDraftIssue.missingResponseDeadline : null,
        );
        // Build the wire decision without timing hints, as a caller could; the
        // immutable command must independently enforce the authoritative review.
        expect(
          () => RehearsalSettingsChange(
            snapshot: current,
            decision: RehearsalSetRule(
              group.id,
              draft.preferenceForSetup(
                groupId: group.id,
                serverTime: settings.serverTime,
                setup: group.setup,
              ),
            ),
            clientActionId: 'deadline_rule',
          ),
          blocked ? throwsFormatException : returnsNormally,
        );
      }
    }
  });
  test(
    'native settings read actual server defaults, inheritance and practice roles',
    () {
      for (final name in [
        'initial',
        'configured',
        'ruleApplied',
        'enrolled',
        'paused',
        'disabledGroup',
        'inherited',
        'operator',
        'complete',
      ]) {
        final s = snapshot(name);
        expect(
          s.settingsReview!.groups.keys,
          containsAll(['event:whole', 'easy', 'fast']),
          reason: name,
        );
        expect(s.settingsReview!.staff.hostUid, 'host-1');
      }
      expect(snapshot('initial').settingsReview!.runtime, isNull);
      expect(
        snapshot('initial')
            .settingsReview!
            .groups['event:whole']!
            .setup
            .destinations
            .first
            .location,
        isNull,
      ); // Names do not invent map coordinates.

      final configured = snapshot('configured').settingsReview!;
      expect(configured.runtime!.configuration.routes, [
        AssistanceMessageRoute.organizerEventWhatsapp,
        AssistanceMessageRoute.catchEventSms,
      ]);
      expect(configured.runtime!.configuration.laterChoices, isEmpty);
      expect(
        snapshot(
          'enrolled',
        ).actors.first.assistanceAutomation!.inheritsEventSettings,
        isTrue,
      );
      final disabled = snapshot(
        'disabledGroup',
      ).settingsReview!.groups['easy']!;
      expect(disabled.status, AssistanceSettingStatus.disabled);
      expect(disabled.origin, AssistanceSettingOrigin.group);
      expect(
        snapshot('inherited').settingsReview!.groups['easy']!.origin,
        AssistanceSettingOrigin.event,
      );
      expect(snapshot('operator').settingsReview!.canConfigure, isFalse);
      expect(snapshot('complete').settingsReview!.canConfigure, isFalse);
    },
  );
  test(
    'foreign context, generation, role, missing groups and unknown fields fail closed',
    () {
      for (final mutate in <void Function(Map<String, Object?>)>[
        (m) => (review(m)['context'] as Map)['mode'] = 'live',
        (m) => (review(m)['context'] as Map)['rehearsalId'] = 'foreign',
        (m) => review(m)['setupRevision'] = 55,
        (m) => review(m)['runtimeRevision'] = 55,
        (m) => review(m)['serverTime'] = 55,
        (m) => review(m)['canConfigure'] = false,
        (m) => (review(m)['groups'] as List).removeLast(),
        (m) => review(m)['providerKey'] = 'private',
        (m) => (review(m)['runtime'] as Map)['senderId'] = 'real-sender',
        (m) => m['settingsReview'] = null,
      ]) {
        final s = sample('configured');
        mutate(s);
        expect(
          () => EventRehearsalBootstrap.fromCallableData(s),
          throwsFormatException,
        );
      }
      final old = sample('initial')..remove('settingsReview');
      expect(
        EventRehearsalBootstrap.fromCallableData(old).settingsReview,
        isNull,
      );
    },
  );
  test(
    'settings decisions use canonical schemas and verify their exact receipts',
    () {
      final initial = snapshot('initial');
      final configured = snapshot('configured');
      final ruleApplied = snapshot('ruleApplied');
      final changes = [
        (
          change: RehearsalSettingsChange(
            snapshot: initial,
            decision: RehearsalConfigureUpdates(
              configured.settingsReview!.runtime!.configuration,
            ),
            clientActionId: 'practice_configure',
          ),
          result: configured,
        ),
        (
          change: RehearsalSettingsChange(
            snapshot: configured,
            decision: RehearsalSetRule(
              'event:whole',
              LateJoinConfigured(configured.settingsReview!.suggested),
            ),
            clientActionId: 'practice_rule',
          ),
          result: ruleApplied,
        ),
        (
          change: RehearsalSettingsChange(
            snapshot: snapshot('enrolled'),
            decision: const RehearsalPauseUpdates(),
            clientActionId: 'practice_pause',
          ),
          result: snapshot('paused'),
        ),
        (
          change: RehearsalSettingsChange(
            snapshot: snapshot('disabledGroup'),
            decision: const RehearsalSetRule('easy', LateJoinInherit()),
            clientActionId: 'practice_inherit',
          ),
          result: snapshot('inherited'),
        ),
      ];
      for (final pair in changes) {
        expect(schema.validate(pair.change.toJson()).isValid, isTrue);
        expect(() => pair.change.requireResult(pair.result), returnsNormally);
      }
      final replay = snapshot('inherited');
      expect(() => changes.first.change.requireResult(replay), returnsNormally);
      expect(
        replay.settingsReview!.runtime!.status,
        RehearsalAutomationStatus.paused,
      );
      final bad = sample('configured');
      final runtime = review(bad)['runtime']! as Map;
      runtime['status'] = 'paused';
      expect(
        () => changes.first.change.requireResult(
          EventRehearsalBootstrap.fromCallableData(bad),
        ),
        throwsFormatException,
      );
      final wrongReceipt = sample('configured');
      ((wrongReceipt['actions'] as List).single as Map)['clientActionId'] =
          'different_action';
      expect(
        () => changes.first.change.requireResult(
          EventRehearsalBootstrap.fromCallableData(wrongReceipt),
        ),
        throwsFormatException,
      );
    },
  );
  test(
    'local commands refuse unavailable roles, event inheritance and unconfigured pause',
    () {
      for (final name in ['operator', 'complete', 'initial']) {
        expect(
          () => RehearsalSettingsChange(
            snapshot: snapshot(name),
            decision: const RehearsalPauseUpdates(),
            clientActionId: 'practice_invalid',
          ),
          throwsFormatException,
        );
      }
      expect(
        () => RehearsalSettingsChange(
          snapshot: snapshot('configured'),
          decision: const RehearsalSetRule('event:whole', LateJoinInherit()),
          clientActionId: 'practice_invalid',
        ),
        throwsFormatException,
      );
      final bad = sample('configured');
      final config = (review(bad)['runtime'] as Map)['configuration'] as Map;
      config['routes'] = [
        {'routeId': 'catchEventSms', 'senderId': 'live'},
      ];
      expect(
        () => EventRehearsalBootstrap.fromCallableData(bad),
        throwsFormatException,
      );
    },
  );
}
