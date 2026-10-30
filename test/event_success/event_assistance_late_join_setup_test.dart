import 'dart:convert';
import 'dart:io';

import 'package:catch_dating_app/contexts/live/domain/event_assistance_group_progress.dart';
import 'package:catch_dating_app/contexts/live/domain/event_assistance_late_join_setting.dart';
import 'package:catch_dating_app/contexts/live/domain/event_assistance_late_join_setting_result.dart';
import 'package:catch_dating_app/contexts/live/domain/event_assistance_observation.dart';
import 'package:catch_dating_app/platform/schema_contracts/generated/schemas/event_assistance_setting_callable_response.g.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:json_schema/json_schema.dart';

import 'event_assistance_late_join_setting_fixtures.dart';

void main() {
  final fixture =
      jsonDecode(
            File(
              'test/event_success/fixtures/late_join_settings.json',
            ).readAsStringSync(),
          )
          as Map<String, Object?>;
  final raw = fixture['initial'] as Map<String, Object?>;
  final context = _map(_map(raw['view'])['context']);
  final scope = EventAssistanceGroupScope(
    organizerId: context['organizerId'] as String,
    eventId: context['eventId'] as String,
    groupId: 'event:whole',
  );
  final schema = JsonSchema.create(
    schemaEventAssistanceSettingCallableResponseSchema,
  );
  LateJoinSettingResult read(Object? value, {LateJoinSettingChange? change}) =>
      LateJoinSettingResult.fromCallableData(
        value,
        expectedScope: scope,
        expectedChange: change,
      );
  Map<String, Object?> sample() =>
      jsonDecode(jsonEncode(raw)) as Map<String, Object?>;

  test(
    'actual server options preserve names, places, order and reviewed timing',
    () {
      expect(schema.validate(raw).isValid, isTrue);
      final view = read(raw).view;
      final setup = view.setup!;
      expect(setup.eventEnd, view.serverTime + 3600000);
      final options = setup.destinations;
      expect(options, hasLength(3));
      expect(options.first.alternativeId, startsWith('alternative:'));
      expect(options.first.target, isA<AssistanceFixedPlace>());
      expect(
        options
            .skip(1)
            .map((d) => (d.target as AssistanceItineraryStop).stopId),
        ['one', 'two'],
      );
      expect(
        options.every(
          (d) => d.label.isNotEmpty && d.location?.name.isNotEmpty == true,
        ),
        isTrue,
      );
      expect(() => options.clear(), throwsUnsupportedError);
      expect(view.own, isNull);
      expect(view.effective, isNull);
    },
  );

  test(
    'actual custom, disabled and replayed settings preserve setup without enabling sends',
    () {
      final initial = read(raw).view;
      final input = fixture['customInput'] as Map<String, Object?>;
      final change = initial.prepareChange(
        requestId: input['requestId'] as String,
        preference: LateJoinPreference.fromJson(input['preference']),
      );
      final custom = read(fixture['custom'], change: change);
      final disabledRaw = fixture['disabled'] as Map<String, Object?>;
      final disabledChange = custom.view.prepareChange(
        requestId: 'off',
        preference: LateJoinPreference.fromJson(
          _map(_map(disabledRaw['view'])['own'])['preference'],
        ),
      );
      final disabled = read(disabledRaw, change: disabledChange);
      final replay = read(fixture['replayed'], change: change);
      for (final name in ['custom', 'disabled', 'replayed']) {
        expect(schema.validate(fixture[name]).isValid, isTrue);
      }
      expect(custom.view.status, AssistanceSettingStatus.configured);
      expect(disabled.view.status, AssistanceSettingStatus.disabled);
      expect(replay.operationRevision, 1);
      expect(replay.view.ownRevision, 2);
      expect(replay.view.status, AssistanceSettingStatus.disabled);
      expect(replay.view.setup!.destinations, hasLength(3));
    },
  );

  test(
    'an older API without setup remains unknown, not an empty destination list',
    () {
      final view = LateJoinSettingResult.fromCallableData(
        settingResponse(),
        expectedScope: settingScope(),
      ).view;
      expect(view.setup, isNull);
      final empty = sample();
      _setup(empty)['destinations'] = <Object>[];
      expect(read(empty).view.setup!.destinations, isEmpty);
    },
  );

  test(
    'malformed, private, duplicate and foreign group options fail closed',
    () {
      for (final change in <void Function(Map<String, Object?>)>[
        (v) => _map(v['view'])['setup'] = null,
        (v) => _setup(v)['eventEnd'] = -1,
        (v) => _setup(v)['senderId'] = 'not-setup',
        (v) => _setup(v)['destinations'] = List.filled(42, _options(v).first),
        (v) => _options(v).add(_options(v).first),
        (v) => _map(_options(v).first)['alternativeId'] = 'invalid',
        (v) => _map(_options(v).first).remove('alternativeId'),
        (v) => _map(_options(v).first)['phone'] = '+15555550100',
        (v) => _map(_options(v).first)['label'] = '',
        (v) => _map(_map(_options(v).first)['location'])['latitude'] = 91,
        (v) => _map(_options(v).first)['target'] = {
          'kind': 'groupCheckpoint',
          'routeId': 'route',
          'groupId': 'other',
          'checkpointId': 'one',
        },
      ]) {
        final value = sample();
        change(value);
        expect(() => read(value), throwsFormatException);
      }
    },
  );
}

Map<String, Object?> _map(Object? value) => value! as Map<String, Object?>;
Map<String, Object?> _setup(Map<String, Object?> value) =>
    _map(_map(value['view'])['setup']);
List<Object?> _options(Map<String, Object?> value) =>
    _setup(value)['destinations']! as List<Object?>;
