import 'dart:convert';
import 'dart:io';

import 'package:catch_dating_app/contexts/live/data/event_assistance_runtime_repository.dart';
import 'package:catch_dating_app/contexts/live/domain/event_assistance_parsing.dart';
import 'package:catch_dating_app/contexts/live/domain/event_assistance_runtime_configuration.dart';
import 'package:catch_dating_app/contexts/live/domain/event_assistance_runtime_result.dart';
import 'package:catch_dating_app/contexts/live/domain/event_assistance_runtime_scope.dart';
import 'package:catch_dating_app/contexts/live/domain/event_assistance_runtime_sender.dart';
import 'package:catch_dating_app/contexts/live/domain/event_assistance_runtime_setting.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:json_schema/json_schema.dart';

import '../support/contract_schemas.dart';
import 'event_assistance_runtime_fixtures.dart';

Map<Object?, Object?> fixture() => assistanceObject(
  jsonDecode(
    File('test/event_success/fixtures/runtime_senders.json').readAsStringSync(),
  ),
);
EventAssistanceRuntimeScope fixtureScope(Map<Object?, Object?> f) {
  final view = assistanceObject(assistanceObject(f['initial'])['view']);
  final context = assistanceObject(view['context']);
  return EventAssistanceRuntimeScope(
    organizerId: context['organizerId']! as String,
    eventId: context['eventId']! as String,
  );
}

AssistanceRuntimeView readFixture(Map<Object?, Object?> f) =>
    AssistanceRuntimeResult.fromCallableData(
      f['initial'],
      expectedScope: fixtureScope(f),
    ).view;
AssistanceRuntimeConfiguration fixtureConfiguration(Map<Object?, Object?> f) =>
    AssistanceRuntimeConfiguration.fromJson(
      assistanceObject(
        assistanceObject(f['input'])['command'],
      )['configuration'],
    );

void main() {
  test(
    'native sender review matches the real server command and confirmation',
    () {
      final f = fixture();
      final view = readFixture(f);
      expect(view.senderSetup!.choices.map((c) => c.displayName), [
        'Catch',
        'Fixture organizer',
        'Catch event updates',
      ]);
      expect(view.senderSetup!.choices.every((c) => c.canSelect), isTrue);
      final change = view.prepareChange(
        requestId: 'reviewed-senders',
        command: AssistanceRuntimeConfigure(fixtureConfiguration(f)),
      );
      expect(change.toJson(), f['input']);
      final schema = JsonSchema.create(
        contractSchema('SetEventAssistanceRuntimeConfigCallablePayload'),
      );
      expect(schema.validate(change.toJson()).isValid, isTrue);
      final saved = AssistanceRuntimeResult.fromCallableData(
        f['applied'],
        expectedScope: view.scope,
        expectedChange: change,
      );
      saved.requireChange(change, actorUid: 'host-1');
      expect(saved.view.status, AssistanceRuntimeStatus.configured);
      expect(() => change.senderReviews!.clear(), throwsUnsupportedError);
      expect(() => view.senderSetup!.choices.clear(), throwsUnsupportedError);
    },
  );

  test(
    'closed sender pages reject private fields, duplicates and bad cursors',
    () {
      for (final kind in [
        'private',
        'duplicate',
        'channel',
        'cursor',
        'null',
      ]) {
        final f = fixture();
        final initial = assistanceObject(f['initial']);
        final view = assistanceObject(initial['view']);
        final setup = assistanceObject(view['senderSetup']);
        final choices = List<Object?>.from(setup['choices']! as List);
        switch (kind) {
          case 'private':
            choices[0] = {
              ...assistanceObject(choices[0]),
              'credential': 'private',
            };
          case 'duplicate':
            choices.add(choices.first);
          case 'channel':
            choices[0] = {
              ...assistanceObject(choices[0]),
              'routeId': 'marketingSms',
            };
          case 'cursor':
            setup['nextCursors'] = {'catchEventRcs': 'invalid/path'};
          case 'null':
            view['senderSetup'] = null;
        }
        setup['choices'] = choices;
        if (kind != 'null') view['senderSetup'] = setup;
        initial['view'] = view;
        expect(
          () => AssistanceRuntimeResult.fromCallableData(
            initial,
            expectedScope: fixtureScope(f),
          ),
          throwsFormatException,
          reason: kind,
        );
      }
    },
  );

  test('unavailable or foreign sender cannot become an enabling command', () {
    for (final availability in AssistanceRuntimeSenderAvailability.values) {
      if (availability == AssistanceRuntimeSenderAvailability.eligible) {
        continue;
      }
      final f = fixture();
      final view = readFixture(f);
      final raw = assistanceObject(
        assistanceObject(assistanceObject(f['initial'])['view'])['senderSetup'],
      );
      final choices = (raw['choices']! as List)
          .map(
            (choice) => AssistanceRuntimeSenderChoice.fromJson({
              ...assistanceObject(choice),
              'availability': availability.name,
            }, view.scope),
          )
          .toList();
      expect(
        () => view.prepareChange(
          requestId: 'disabled',
          command: AssistanceRuntimeConfigure(fixtureConfiguration(f)),
          reviewedSenders: choices,
        ),
        throwsStateError,
      );
      final pause = view.prepareChange(
        requestId: 'pause',
        command: const AssistanceRuntimePause(),
      );
      expect(pause.senderReviews, isNull);
    }
    final f = fixture();
    final view = readFixture(f);
    final setup = assistanceObject(
      assistanceObject(assistanceObject(f['initial'])['view'])['senderSetup'],
    );
    final foreign = AssistanceRuntimeSenderSetup.fromJson(
      setup,
      runtimeScope(),
    );
    expect(
      () => view.prepareChange(
        requestId: 'foreign',
        command: AssistanceRuntimeConfigure(fixtureConfiguration(f)),
        reviewedSenders: foreign.choices,
      ),
      throwsStateError,
    );
  });

  test(
    'paged reads carry typed cursors and reject a non-advancing response',
    () async {
      final f = fixture();
      final functions = RuntimeTestFunctions()..response = f['initial'];
      final repository = EventAssistanceRuntimeRepository(functions);
      final cursors = {AssistanceMessageRoute.catchEventRcs: 'page-1'};
      await repository.fetchSenderPage(fixtureScope(f), cursors: cursors);
      expect(functions.calls.single.input, {
        'context': fixtureScope(f).context,
        'senderCursors': {'catchEventRcs': 'page-1'},
      });
      final setup = AssistanceRuntimeSenderSetup.fromJson({
        'choices': [],
        'nextCursors': {'catchEventRcs': 'page-1'},
      }, fixtureScope(f));
      expect(() => setup.requireAdvancing(cursors), throwsFormatException);
      expect(() => setup.nextCursors.clear(), throwsUnsupportedError);
    },
  );

  test('an older response leaves sender discovery unknown', () {
    expect(runtimeView().senderSetup, isNull);
  });
}
