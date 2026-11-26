import 'dart:async';
import 'dart:convert';

import 'package:catch_dating_app/contexts/account/data/auth_repository.dart';
import 'package:catch_dating_app/contexts/live/data/event_rehearsal_repository.dart';
import 'package:catch_dating_app/contexts/live/domain/event_assistance_late_join_template.dart';
import 'package:catch_dating_app/contexts/live/domain/event_assistance_runtime_configuration.dart';
import 'package:catch_dating_app/contexts/live/domain/event_rehearsal.dart';
import 'package:catch_dating_app/contexts/live/domain/event_rehearsal_assistance_command.dart';
import 'package:catch_dating_app/contexts/live/domain/event_rehearsal_movement.dart';
import 'package:catch_dating_app/hosts/events/rehearsal_late_join_form.dart';
import 'package:catch_dating_app/hosts/events/rehearsal_late_join_section.dart';
import 'package:catch_dating_app/hosts/events/rehearsal_late_join_sheet.dart';
import 'package:catch_dating_app/hosts/events/rehearsal_late_join_state.dart';
import 'package:catch_l10n/l10n.dart';
import 'package:catch_platform/cryptography/sha256_digest.dart';
import 'package:catch_platform/theme/app_theme.dart';
import 'package:catch_test_support/catch_test_fonts.dart';
import 'package:catch_test_support/test_pump_helpers.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';

import '../../event_rehearsal/event_rehearsal_assistance_fixtures.dart';
import '../../event_rehearsal/event_rehearsal_movement_fixtures.dart';

void main() {
  setUpAll(loadCatchTestFonts);

  group('late joiner choices', () {
    test('a started, running rehearsal with movement takes commands', () {
      expect(hostRehearsalLateJoinOpen(lateJoinSnapshot('departed')), isTrue);
      expect(hostRehearsalLateJoinOpen(practiceSnapshot()), isFalse);
    });

    test('a guest without a recipe starts from the group rule', () {
      final snapshot = lateJoinSnapshot('departed');
      final choices = HostRehearsalLateJoinChoices.initial(
        snapshot,
        snapshot.actors.first,
      );
      expect(choices.groupId, 'event:whole');
      expect(choices.mode, HostRehearsalLateJoinMode.automatic);
      expect(choices.outcomes, isNotEmpty);
      final movement = snapshot.movementReview!;
      expect(
        choices.joiningPoint(movement)?.destination,
        isIn(movement.destinations),
      );
      final draft = choices.draft(snapshot, movement, 'actor-01')!;
      expect(
        draft.rules.unanswered,
        LateJoinUnansweredRule.keepUnknownUntilCutoff,
      );
      expect(draft.routes, contains(AssistanceMessageRoute.catchEventSms));
      expect(draft.setting, isA<AssistanceTemplateEnabled>());
    });

    test('later places and the mode reach the publication recipe', () {
      final snapshot = lateJoinSnapshot('departed');
      final movement = snapshot.movementReview!;
      final ids = [for (final d in movement.destinations) d.alternativeId];
      final choices =
          HostRehearsalLateJoinChoices.initial(
            snapshot,
            snapshot.actors.first,
          ).copyWith(
            laterPointIds: {ids[1], ids[2]},
            laterLabels: {ids[1]: '  First stop  ', ids[2]: ' '},
            mode: HostRehearsalLateJoinMode.prepare,
          );
      final draft = choices.draft(snapshot, movement, 'actor-01')!;
      expect(draft.laterChoices.map((c) => c.point.destination.alternativeId), [
        ids[1],
        ids[2],
      ]);
      // A custom label is trimmed; a blank one falls back to the place.
      expect(draft.laterChoices.map((c) => c.label), [
        'First stop',
        movement.destinations[2].label,
      ]);
      expect(
        (draft.setting! as AssistanceTemplateEnabled).authority,
        AssistanceTemplateAuthority.prepare,
      );
      // Another group has its own places.
      final moved = choices.copyWith(groupId: 'group-b');
      expect(moved.laterPointIds, isEmpty);
      expect(moved.laterLabels, isEmpty);
      expect(moved.joiningPointId, isNull);
    });

    test('a saved recipe prefills its mode, deadline and script', () {
      final wire = practiceBootstrap(
        actors: [
          {
            ...practiceActor(),
            'assistanceAutomation': practiceAutomation(status: 'paused'),
          },
        ],
      );
      final snapshot = EventRehearsalBootstrap.fromCallableData(wire);
      final actor = snapshot.actors.single;
      final choices = HostRehearsalLateJoinChoices.initial(snapshot, actor);
      expect(choices.outcomes, hasLength(2));
      expect(
        hostRehearsalLateJoinStatus(actor),
        HostRehearsalLateJoinStatus.paused,
      );
      // No settings review: only the host reads one, so no recipe builds.
      expect(
        choices.draft(snapshot, movementReview('departed'), 'actor-01'),
        isNull,
      );
    });
  });

  group('late joiner form', () {
    Future<void> pump(WidgetTester tester, Widget child) async {
      tester.view.devicePixelRatio = 1;
      tester.view.physicalSize = const Size(430, 2400);
      addTearDown(tester.view.resetDevicePixelRatio);
      addTearDown(tester.view.resetPhysicalSize);
      await tester.pumpWidget(
        MaterialApp(
          theme: AppTheme.light,
          localizationsDelegates: AppLocalizations.localizationsDelegates,
          supportedLocales: AppLocalizations.supportedLocales,
          home: CatchRoot(
            child: Scaffold(body: SingleChildScrollView(child: child)),
          ),
        ),
      );
      await pumpFeatureUiFor(tester, const Duration(milliseconds: 50));
    }

    HostRehearsalLateJoinView view({
      HostRehearsalLateJoinPhase phase = HostRehearsalLateJoinPhase.editing,
      HostRehearsalLateJoinPreviewKind? kind =
          HostRehearsalLateJoinPreviewKind.confirmed,
      HostRehearsalLateJoinMode mode = HostRehearsalLateJoinMode.automatic,
      HostRehearsalLateJoinStatus status = HostRehearsalLateJoinStatus.none,
      Set<String> later = const <String>{},
    }) {
      final movement = movementReview('departed');
      return HostRehearsalLateJoinView(
        status: status,
        remainingOutcomes: status == HostRehearsalLateJoinStatus.none
            ? null
            : 2,
        latestText: 'Join us at Stop one.',
        latestReply: 'On my way',
        groups: movement.groups,
        groupId: movement.scope.groupId,
        points: movement.destinations,
        pointId: movement.destinations.first.alternativeId,
        laterPointIds: later,
        mode: mode,
        rules: practiceRules(),
        routes: const [AssistanceMessageRoute.catchEventSms],
        outcomes: const [
          RehearsalDeliveryConfirmed(RehearsalConfirmedDelivery.delivered),
        ],
        previewKind: kind,
        previewText: 'Join us at Practice venue.',
        phase: phase,
      );
    }

    testWidgets('choices and commands run their callbacks', (tester) async {
      final calls = <String>[];
      final movement = movementReview('departed');
      await pump(
        tester,
        HostRehearsalLateJoinForm(
          view: view(
            status: HostRehearsalLateJoinStatus.automatic,
            later: {movement.destinations[1].alternativeId},
          ),
          onGroup: (_) => calls.add('group'),
          onPoint: (id) => calls.add('point:$id'),
          onLater: (id) => calls.add('later:$id'),
          onLaterLabel: (id, label) => calls.add('label:$id:$label'),
          onMode: (mode) => calls.add('mode:${mode.name}'),
          onRules: () => calls.add('rules'),
          onChannels: () => calls.add('channels'),
          onDeadline: () => calls.add('deadline'),
          onClearDeadline: () => calls.add('clear'),
          onOutcomes: (o) => calls.add('outcomes:${o.length}'),
          onRetry: () => calls.add('retry'),
          onReload: () => calls.add('reload'),
          onPublish: () => calls.add('publish'),
          onSave: () => calls.add('save'),
          onPause: () => calls.add('pause'),
        ),
      );
      expect(
        find.text('Automatic updates on · 2 practice outcomes left'),
        findsOneWidget,
      );
      expect(
        find.text('Join us at Stop one.\nReplied: On my way'),
        findsOneWidget,
      );
      expect(find.text('Join us at Practice venue.'), findsOneWidget);
      final second = movement.destinations[1].alternativeId;
      Future<void> tap(String key) async {
        final target = find.byKey(ValueKey<String>(key));
        await tester.ensureVisible(target);
        await tester.tap(target);
        await tester.pump();
      }

      await tap('host-rehearsal-late-join-point-$second');
      await tap('host-rehearsal-late-join-later-$second');
      final label = find.byKey(
        ValueKey<String>('host-rehearsal-late-join-label-$second'),
      );
      expect(find.text('Button label for Stop one (optional)'), findsOneWidget);
      await tester.ensureVisible(label);
      await tester.enterText(
        find.descendant(of: label, matching: find.byType(EditableText)),
        'Stop 1',
      );
      await tester.pump();
      await tap('host-rehearsal-late-join-mode-observe');
      await tap('host-rehearsal-late-join-rules');
      await tap('host-rehearsal-late-join-channels');
      await tap('host-rehearsal-late-join-deadline');
      await tap('host-rehearsal-late-join-add-outcome');
      await tap('host-rehearsal-late-join-publish');
      await tap('host-rehearsal-late-join-save');
      await tap('host-rehearsal-late-join-pause');
      expect(calls, [
        'point:$second',
        'later:$second',
        'label:$second:Stop 1',
        'mode:observe',
        'rules',
        'channels',
        'deadline',
        'outcomes:2',
        'publish',
        'save',
        'pause',
      ]);
      expect(tester.takeException(), isNull);
    });

    testWidgets('publishing waits for a departure and for automatic help', (
      tester,
    ) async {
      await pump(
        tester,
        HostRehearsalLateJoinForm(
          view: view(
            kind: HostRehearsalLateJoinPreviewKind.awaitingDeparture,
            mode: HostRehearsalLateJoinMode.prepare,
            status: HostRehearsalLateJoinStatus.paused,
          ),
          onGroup: (_) {},
          onPoint: (_) {},
          onLater: (_) {},
          onLaterLabel: (_, _) {},
          onMode: (_) {},
          onRules: () {},
          onChannels: () {},
          onDeadline: () {},
          onClearDeadline: () {},
          onOutcomes: (_) {},
          onRetry: () {},
          onReload: () {},
          onResume: () {},
        ),
      );
      expect(
        find.textContaining('The group has not left yet.'),
        findsOneWidget,
      );
      expect(
        find.text('Choose Send automatically to publish directions.'),
        findsOneWidget,
      );
      final publish = tester.widget<CatchButton>(
        find.byKey(const ValueKey('host-rehearsal-late-join-publish')),
      );
      expect(publish.onPressed, isNull);
      expect(
        find.byKey(const ValueKey('host-rehearsal-late-join-resume')),
        findsOneWidget,
      );
      expect(
        find.byKey(const ValueKey('host-rehearsal-late-join-pause')),
        findsNothing,
      );
    });

    testWidgets('an unconfirmed command offers its retry, not new choices', (
      tester,
    ) async {
      var retried = 0;
      await pump(
        tester,
        HostRehearsalLateJoinForm(
          view: view(phase: HostRehearsalLateJoinPhase.retry),
          onGroup: (_) {},
          onPoint: (_) {},
          onLater: (_) {},
          onLaterLabel: (_, _) {},
          onMode: (_) {},
          onRules: () {},
          onChannels: () {},
          onDeadline: () {},
          onClearDeadline: () {},
          onOutcomes: (_) {},
          onRetry: () => retried++,
          onReload: () {},
          onPublish: () {},
        ),
      );
      final publish = tester.widget<CatchButton>(
        find.byKey(const ValueKey('host-rehearsal-late-join-publish')),
      );
      expect(publish.onPressed, isNull);
      final retry = find.text('Check save result');
      await tester.ensureVisible(retry);
      await tester.tap(retry);
      expect(retried, 1);
    });
  });

  group('late joiner section', () {
    testWidgets('lists made-up guests and opens one', (tester) async {
      final opened = <String>[];
      final wire = practiceBootstrap(
        actors: [
          {...practiceActor(), 'displayName': 'Asha'},
          {
            ...practiceActor(),
            'actorId': 'actor-02',
            'displayName': 'Bela',
            'assistanceAutomation': practiceAutomation(),
          },
        ],
      );
      await tester.pumpWidget(
        MaterialApp(
          theme: AppTheme.light,
          localizationsDelegates: AppLocalizations.localizationsDelegates,
          supportedLocales: AppLocalizations.supportedLocales,
          home: CatchRoot(
            child: Scaffold(
              body: HostRehearsalLateJoinSection(
                rehearsal: EventRehearsalBootstrap.fromCallableData(wire),
                onOpen: opened.add,
              ),
            ),
          ),
        ),
      );
      await pumpFeatureUiFor(tester, const Duration(milliseconds: 50));
      expect(find.text('Late joiners'), findsOneWidget);
      // A guest with automatic updates comes first.
      expect(
        tester.getTopLeft(find.text('Bela')).dy,
        lessThan(tester.getTopLeft(find.text('Asha')).dy),
      );
      expect(
        find.text('Automatic updates on · 2 practice outcomes left'),
        findsOneWidget,
      );
      await tester.tap(find.text('Asha'));
      expect(opened, ['actor-01']);
    });
  });

  group('late joiner sheet', () {
    testWidgets('publishes directions through the assistance editor', (
      tester,
    ) async {
      tester.view.devicePixelRatio = 1;
      tester.view.physicalSize = const Size(430, 2600);
      addTearDown(tester.view.resetDevicePixelRatio);
      addTearDown(tester.view.resetPhysicalSize);
      final repository = _Repository('departed');
      await tester.pumpWidget(
        ProviderScope(
          overrides: [
            uidProvider.overrideWith((ref) => Stream.value('host-1')),
            eventRehearsalRepositoryProvider.overrideWith((ref) => repository),
          ],
          child: MaterialApp(
            theme: AppTheme.light,
            localizationsDelegates: AppLocalizations.localizationsDelegates,
            supportedLocales: AppLocalizations.supportedLocales,
            home: CatchRoot(
              child: Consumer(
                builder: (context, ref, _) => Scaffold(
                  body: TextButton(
                    onPressed: () => showHostRehearsalLateJoinSheet(
                      context,
                      ref,
                      sessionId: 'session-1',
                      actorId: 'actor-01',
                    ),
                    child: const Text('open'),
                  ),
                ),
              ),
            ),
          ),
        ),
      );
      await tester.tap(find.text('open'));
      for (var i = 0; i < 10; i++) {
        await pumpFeatureUiFor(tester, const Duration(milliseconds: 50));
      }
      final publish = find.byKey(
        const ValueKey('host-rehearsal-late-join-publish'),
      );
      expect(publish, findsOneWidget);
      await tester.ensureVisible(publish);
      await tester.tap(publish);
      await pumpFeatureUiFor(tester, const Duration(milliseconds: 50));
      final change = repository.writes.single.change;
      expect(change.command, isA<RehearsalPublishInstruction>());
      expect(change.command.actorId, 'actor-01');
      repository.confirm(0);
      for (var i = 0; i < 6; i++) {
        await pumpFeatureUiFor(tester, const Duration(milliseconds: 50));
      }
      expect(
        find.text(
          'Saved. The settings shown below are the current settings for this rehearsal.',
        ),
        findsOneWidget,
      );
      expect(tester.takeException(), isNull);
    });
  });
}

/// The departed movement fixture with the host settings review its session
/// carries, as the host reads it in practice tools.
Map<String, Object?> lateJoinBootstrap(String name) {
  final raw = movementBootstrap(name);
  final session = raw['session']! as Map<String, Object?>;
  final review = raw['movementReview']! as Map<String, Object?>;
  final staff = raw['staffReview']! as Map<String, Object?>;
  final id = session['id']! as String;
  final start = 0;
  final minutes = (session['setup']! as Map)['durationMinutes']! as int;
  final groups = [
    for (final group in staff['groups']! as List)
      {
        'groupId': (group as Map)['groupId'],
        'label': group['label'],
        'preference': {'kind': 'inherit'},
        'effective': null,
        'status': 'unconfigured',
        'origin': 'none',
        'setup': {
          'eventEnd': start + minutes * 60000,
          'destinations': (review['progress']! as Map)['destinations'],
        },
      },
  ];
  raw['settingsReview'] = {
    'context': {
      'mode': 'rehearsal',
      'rehearsalId': id,
      'virtualEventId': 'practice:${sha256Digest(jsonEncode(id))}',
      'clockId': staff['clockId'],
    },
    'setupRevision': session['setupRevision'],
    'runtimeRevision': session['runtimeRevision'],
    'serverTime': 1000,
    'sourceHash': 'a' * 64,
    'canConfigure': true,
    'runtime': null,
    'suggested': {
      'kind': 'lateJoin',
      'version': 1,
      'setting': {'kind': 'enabled', 'authority': 'executeWithinPolicy'},
      'config': {
        'destination': {'kind': 'confirmedGroupProgress'},
        'cutoff': {'kind': 'eventEnd'},
        'maxMessagesPerEpisode': 3,
        'minimumMinutesBetweenMessages': 10,
        'updateOn': 'materialGuidanceChange',
        'unanswered': 'keepUnknownUntilCutoff',
      },
    },
    'groups': groups,
  };
  return raw;
}

EventRehearsalBootstrap lateJoinSnapshot(String name) =>
    EventRehearsalBootstrap.fromCallableData(lateJoinBootstrap(name));

/// Answers rehearsal reads from the late joiner fixture and holds each
/// assistance command until the test confirms it.
class _Repository extends Fake implements EventRehearsalRepository {
  _Repository(this.sample);
  final String sample;
  final writes =
      <
        ({
          RehearsalAssistanceChange change,
          Completer<EventRehearsalBootstrap> result,
        })
      >[];

  @override
  Future<EventRehearsalBootstrap> fetch(String sessionId) async =>
      lateJoinSnapshot(sample);

  @override
  Future<RehearsalMovementReview> fetchMovement({
    required EventRehearsalBootstrap snapshot,
    required RehearsalMovementSelection selection,
    required String actorUid,
  }) async => RehearsalMovementReview.fromJson(
    movementSample(sample)['review'],
    session: snapshot.session,
    actors: snapshot.actors,
    selection: selection,
    expectedActorUid: actorUid,
  );

  @override
  Future<EventRehearsalBootstrap> applyAssistance(
    RehearsalAssistanceChange change,
  ) {
    final result = Completer<EventRehearsalBootstrap>();
    writes.add((change: change, result: result));
    return result.future.then((value) {
      change.requireResult(value);
      return value;
    });
  }

  void confirm(int index) {
    final change = writes[index].change;
    final raw = movementBootstrap(sample)..remove('movementReview');
    movementObjectAt(raw, ['session']).addAll({
      'runtimeRevision': change.session.runtimeRevision + 1,
      'actionCount': change.session.actionCount + 1,
    });
    raw['actions'] = [practiceReceipt(change)];
    writes[index].result.complete(
      EventRehearsalBootstrap.fromCallableData(raw),
    );
  }
}
