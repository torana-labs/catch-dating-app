import 'dart:async';
import 'dart:convert';
import 'dart:io';

import 'package:catch_dating_app/contexts/live/data/event_rehearsal_repository.dart';
import 'package:catch_dating_app/contexts/live/domain/event_assistance_late_join_setting.dart';
import 'package:catch_dating_app/contexts/live/domain/event_rehearsal.dart';
import 'package:catch_dating_app/contexts/live/domain/event_rehearsal_settings_change.dart';
import 'package:flutter_test/flutter_test.dart';

Map<String, Object?> settingsSample(String name) =>
    (jsonDecode(
              File(
                'test/event_rehearsal/fixtures/settings_reviews.json',
              ).readAsStringSync(),
            )
            as Map)[name]
        as Map<String, Object?>;
EventRehearsalBootstrap settingsSnapshot(String name) =>
    EventRehearsalBootstrap.fromCallableData(settingsSample(name));

class SettingsUiRepository extends Fake implements EventRehearsalRepository {
  SettingsUiRepository({String stage = 'initial'})
    : raw = settingsSample(stage);
  Map<String, Object?> raw;
  int reads = 0;
  final writes =
      <
        ({
          RehearsalSettingsChange change,
          Completer<EventRehearsalBootstrap> result,
        })
      >[];
  EventRehearsalBootstrap get snapshot =>
      EventRehearsalBootstrap.fromCallableData(raw);
  @override
  Future<EventRehearsalBootstrap> fetch(String sessionId) async {
    reads++;
    return snapshot;
  }

  @override
  Future<EventRehearsalBootstrap> applySettings(
    RehearsalSettingsChange change,
  ) {
    final result = Completer<EventRehearsalBootstrap>();
    writes.add((change: change, result: result));
    return result.future;
  }

  void confirm() {
    raw = jsonDecode(jsonEncode(raw)) as Map<String, Object?>;
    final change = writes.last.change;
    final session = raw['session'] as Map;
    final view = raw['settingsReview'] as Map;
    session['runtimeRevision'] = change.snapshot.session.runtimeRevision + 1;
    session['actionCount'] = change.snapshot.session.actionCount + 1;
    view['runtimeRevision'] = session['runtimeRevision'];
    switch (change.decision) {
      case RehearsalConfigureUpdates(:final configuration):
        view['runtime'] = {
          'status': 'enabled',
          'configuration': configuration.toJson(),
        };
      case RehearsalPauseUpdates():
        (view['runtime'] as Map)['status'] = 'paused';
      case RehearsalSetRule(:final groupId, :final preference):
        final group = (view['groups'] as List).cast<Map>().singleWhere(
          (g) => g['groupId'] == groupId,
        );
        group['preference'] = preference.toJson();
        switch (preference) {
          case LateJoinConfigured(:final template):
            group['effective'] = template.toJson();
            group['status'] = 'configured';
            group['origin'] = groupId == 'event:whole' ? 'event' : 'group';
          case LateJoinDisabled():
            group['effective'] = null;
            group['status'] = 'disabled';
            group['origin'] = groupId == 'event:whole' ? 'event' : 'group';
          case LateJoinInherit():
            throw UnsupportedError('Use the server inheritance fixture.');
        }
    }
    raw['actions'] = [
      {
        'clientActionId': change.clientActionId,
        'actorId': null,
        'kind': 'control',
        'name': 'settings:${change.decision.kind}',
        'runtimeRevision': session['runtimeRevision'],
        'virtualNowMillis':
            change.snapshot.session.virtualNow.millisecondsSinceEpoch,
      },
    ];
    writes.last.result.complete(snapshot);
  }
}
