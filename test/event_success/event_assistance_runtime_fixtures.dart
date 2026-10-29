import 'package:catch_dating_app/contexts/live/domain/event_assistance_runtime_configuration.dart';
import 'package:catch_dating_app/contexts/live/domain/event_assistance_runtime_result.dart';
import 'package:catch_dating_app/contexts/live/domain/event_assistance_runtime_scope.dart';
import 'package:catch_dating_app/contexts/live/domain/event_assistance_runtime_setting.dart';
import 'package:cloud_functions/cloud_functions.dart';
import 'package:flutter_test/flutter_test.dart';

EventAssistanceRuntimeScope runtimeScope({String eventId = 'event-1'}) =>
    EventAssistanceRuntimeScope(organizerId: 'organizer-1', eventId: eventId);
Map<String, Object?> runtimeConfiguration({List<Object?>? choices}) => {
  'options': <String, Object?>{
    'routes': [
      {'routeId': 'organizerEventWhatsapp', 'senderId': 'sender-wa'},
      {'routeId': 'catchEventRcs', 'senderId': 'sender-rcs'},
      {'routeId': 'catchEventSms', 'senderId': 'sender-sms'},
    ],
    'responseDeadline': 8000,
    'deliveryPolicy': {
      'maxAttempts': 3,
      'maxAttemptsPerRoute': 1,
      'minimumRetrySeconds': 30,
    },
    'laterChoices': ?choices,
  },
  'expiresAt': 9000,
  'maxEvaluations': 100,
};
AssistanceRuntimeConfiguration runtimeConfig() =>
    AssistanceRuntimeConfiguration.fromJson(runtimeConfiguration());
Map<String, Object?> runtimeRecord({
  int revision = 1,
  bool paused = false,
  Object? configuration,
  String? sourceHash,
  String eventId = 'event-1',
}) => {
  'schemaVersion': 1,
  'runtimeId': 'runtime:lateJoin:${'c' * 64}',
  'context': runtimeScope(eventId: eventId).context,
  'workflowKind': 'lateJoin',
  'revision': revision,
  'status': paused ? 'paused' : 'enabled',
  'configuration': paused
      ? configuration
      : configuration ?? runtimeConfiguration(),
  'sourceHash': sourceHash ?? 'a' * 64,
  'sourceGeneration': 'd' * 64,
  'updatedBy': 'host-1',
  'createdAt': 500,
  'updatedAt': 1000,
};
Map<String, Object?> runtimeResponse({
  String outcome = 'read',
  int? operationRevision,
  int revision = 0,
  Object? runtime,
  String status = 'unconfigured',
  bool canConfigure = true,
  int now = 1000,
  int eventEnd = 10000,
  String eventId = 'event-1',
}) => {
  'outcome': outcome,
  'operationRevision': operationRevision,
  'view': {
    'context': runtimeScope(eventId: eventId).context,
    'serverTime': now,
    'sourceHash': 'a' * 64,
    'revision': revision,
    'runtime': runtime,
    'status': status,
    'canConfigure': canConfigure,
    'eventEnd': eventEnd,
  },
};
AssistanceRuntimeView runtimeView({String eventId = 'event-1'}) =>
    AssistanceRuntimeResult.fromCallableData(
      runtimeResponse(eventId: eventId),
      expectedScope: runtimeScope(eventId: eventId),
    ).view;

class RuntimeTestFunctions extends Fake implements FirebaseFunctions {
  Object? response = runtimeResponse();
  Object? error;
  final calls = <({String name, Object? input})>[];
  @override
  HttpsCallable httpsCallable(String name, {HttpsCallableOptions? options}) =>
      _RuntimeCallable(this, name);
}

class _RuntimeCallable extends Fake implements HttpsCallable {
  _RuntimeCallable(this.owner, this.name);
  final RuntimeTestFunctions owner;
  final String name;
  @override
  Future<HttpsCallableResult<T>> call<T>([Object? parameters]) async {
    owner.calls.add((name: name, input: parameters));
    if (owner.error case final error?) throw error;
    return _RuntimeResult<T>(owner.response as T);
  }
}

class _RuntimeResult<T> extends Fake implements HttpsCallableResult<T> {
  _RuntimeResult(this.data);
  @override
  final T data;
}
