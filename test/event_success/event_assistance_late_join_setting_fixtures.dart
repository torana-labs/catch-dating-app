import 'package:catch_dating_app/contexts/live/domain/event_assistance_group_progress.dart';
import 'package:catch_dating_app/contexts/live/domain/event_assistance_late_join_setting.dart';
import 'package:catch_dating_app/contexts/live/domain/event_assistance_late_join_setting_result.dart';
import 'package:catch_dating_app/contexts/live/domain/event_assistance_late_join_template.dart';
import 'package:cloud_functions/cloud_functions.dart';
import 'package:flutter_test/flutter_test.dart';

EventAssistanceGroupScope settingScope({String groupId = 'event:whole'}) =>
    EventAssistanceGroupScope(
      organizerId: 'organizer-1',
      eventId: 'event-1',
      groupId: groupId,
    );

Map<String, Object?> settingTemplate({
  Object? destination,
  Object? cutoff,
  Object? setting,
}) => {
  'kind': 'lateJoin',
  'version': 1,
  'setting': setting ?? {'kind': 'enabled', 'authority': 'prepare'},
  'config': {
    'destination': destination ?? {'kind': 'confirmedGroupProgress'},
    'cutoff': cutoff ?? {'kind': 'eventEnd'},
    'maxMessagesPerEpisode': 3,
    'minimumMinutesBetweenMessages': 10,
    'updateOn': 'materialGuidanceChange',
    'unanswered': 'keepUnknownUntilCutoff',
  },
};

Map<String, Object?> settingRecord({
  String groupId = 'event:whole',
  int revision = 1,
  Object? preference,
  String? sourceHash,
}) => {
  'schemaVersion': 1,
  'settingId': 'setting:${'c' * 64}',
  'context': settingScope().context,
  'groupId': groupId,
  'workflowKind': 'lateJoin',
  'revision': revision,
  'preference':
      preference ?? {'kind': 'configured', 'template': settingTemplate()},
  'sourceHash': sourceHash ?? 'a' * 64,
  'updatedBy': 'manager-1',
  'createdAt': 100,
  'updatedAt': 1000,
};

Map<String, Object?> settingResponse({
  String groupId = 'event:whole',
  String outcome = 'read',
  int? operationRevision,
  int revision = 0,
  Object? own,
  String status = 'unconfigured',
  String origin = 'none',
  Object? effective,
}) => {
  'outcome': outcome,
  'operationRevision': operationRevision,
  'view': {
    'context': settingScope().context,
    'groupId': groupId,
    'workflowKind': 'lateJoin',
    'serverTime': 1000,
    'sourceHash': 'a' * 64,
    'ownRevision': revision,
    'own': own,
    'status': status,
    'origin': origin,
    'effective': effective,
    'suggested': settingTemplate(),
  },
};

LateJoinSettingView settingView({String groupId = 'event:whole'}) =>
    LateJoinSettingResult.fromCallableData(
      settingResponse(groupId: groupId),
      expectedScope: settingScope(groupId: groupId),
    ).view;
AssistanceLateJoinTemplate lateJoinTemplate() =>
    AssistanceLateJoinTemplate.fromJson(settingTemplate());

class SettingTestFunctions extends Fake implements FirebaseFunctions {
  Object? response = settingResponse();
  Object? error;
  final calls = <({String name, Object? input})>[];
  @override
  HttpsCallable httpsCallable(String name, {HttpsCallableOptions? options}) =>
      _SettingCallable(this, name);
}

class _SettingCallable extends Fake implements HttpsCallable {
  _SettingCallable(this.owner, this.name);
  final SettingTestFunctions owner;
  final String name;
  @override
  Future<HttpsCallableResult<T>> call<T>([Object? parameters]) async {
    owner.calls.add((name: name, input: parameters));
    if (owner.error case final error?) throw error;
    return _SettingResult<T>(owner.response as T);
  }
}

class _SettingResult<T> extends Fake implements HttpsCallableResult<T> {
  _SettingResult(this.data);
  @override
  final T data;
}
