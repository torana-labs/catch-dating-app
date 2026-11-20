import 'package:catch_dating_app/contexts/audience/data/crm/host_crm_callable.dart';
import 'package:catch_dating_app/contexts/audience/domain/crm/host_manual_send_task.dart';
import 'package:catch_platform/cache/app_clock.dart';
import 'package:catch_platform/errors/app_exception.dart';
import 'package:catch_platform/firebase/firebase_providers.dart';
import 'package:catch_platform/firebase/live_paged_query.dart';
import 'package:catch_platform/firebase/live_pages.dart';
import 'package:catch_platform/firebase/read_limit_policy.dart';
import 'package:catch_platform/schema_contracts/generated/callable_request_dtos.g.dart';
import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:cloud_functions/cloud_functions.dart';
import 'package:riverpod_annotation/riverpod_annotation.dart';

part 'host_communication_repository.g.dart';

class HostCommunicationRepository {
  const HostCommunicationRepository(
    this._functions, {
    this._firestore,
    this.clock = const AppClock(),
  });

  static const manualSendTasks = 'organizerManualSendTasks';

  final FirebaseFunctions _functions;
  final FirebaseFirestore? _firestore;
  final AppClock clock;

  Future<HostManualSendTask> prepareManualSendTask({
    required String organizerId,
    required String contactId,
    required String requestId,
    required String prefillText,
  }) => callHostCrm(
    _functions,
    name: 'prepareOrganizerManualSendTask',
    payload: {
      'organizerId': organizerId,
      'contactId': contactId,
      'requestId': requestId,
      'intent': 'individualConversation',
      'prefillText': prefillText,
    },
    action: 'prepare manual WhatsApp handoff',
    parse: HostManualSendTask.fromCallableData,
  );

  /// The organizer's active by-hand handoffs from `organizerManualSendTasks`,
  /// newest change first, [pageSize] at a time, every row shown kept live:
  /// a handoff prepared, opened, marked sent or skipped elsewhere shows at
  /// once. Rules let the organizer's current managers list their tasks.
  /// A task past its expiry reads as expired and inactive, as the callable
  /// returned it; the store's TTL then removes it.
  // firestore-index: organizerManualSendTasks(organizerId:ASCENDING, active:ASCENDING, updatedAt:DESCENDING, __name__:DESCENDING)
  LivePager<HostManualSendTask> watchManualSendTasks(
    String organizerId, {
    int pageSize = ReadLimitPolicy.historyPage,
  }) {
    final firestore =
        _firestore ??
        (throw StateError('This repository has no Firestore client.'));
    return LivePagedQuery<Map<String, dynamic>, HostManualSendTask>(
      query: firestore
          .collection(manualSendTasks)
          .where('organizerId', isEqualTo: organizerId)
          .where('active', isEqualTo: true)
          .orderBy('updatedAt', descending: true)
          .orderBy(FieldPath.documentId, descending: true),
      pageSize: pageSize,
      maxRows: ReadLimitPolicy.boundedWorkingSet,
      convert: (doc) => HostManualSendTask.fromMap(
        manualSendTaskRow(doc.id, doc.data(), now: clock.now()),
      ),
      errorContext: const BackendErrorContext(
        service: BackendService.firestore,
        action: 'watch manual send tasks',
        resource: manualSendTasks,
      ),
    );
  }

  /// One `organizerManualSendTasks` document in the shape the manual-send
  /// callables return: snapshot names, millisecond times, and expiry
  /// applied at [now].
  static Map<String, Object?> manualSendTaskRow(
    String taskId,
    Map<String, dynamic> data, {
    required DateTime now,
  }) {
    int? millis(Object? value) => switch (value) {
      Timestamp() => value.millisecondsSinceEpoch,
      null => null,
      _ => throw FormatException('Manual send task $taskId had a bad time.'),
    };
    final expiresAt = millis(data['expiresAt']);
    final expired =
        expiresAt != null && expiresAt <= now.millisecondsSinceEpoch;
    final active = data['active'] == true;
    return {
      'organizerId': data['organizerId'],
      'taskId': taskId,
      'contactId': data['contactId'],
      'displayName': data['displayNameSnapshot'],
      'intent': data['intent'],
      'routeId': data['routeId'],
      'deliveryMode': data['deliveryMode'],
      'status': expired && active ? 'expired' : data['status'],
      'active': !expired && active,
      'revision': data['revision'],
      'phoneE164': data['endpointE164Snapshot'],
      'prefillText': data['prefillText'],
      'openCount': data['openCount'],
      'createdAtMillis': millis(data['createdAt']),
      'updatedAtMillis': millis(data['updatedAt']),
      'openedAtMillis': millis(data['openedAt']),
      'expiresAtMillis': expiresAt,
    };
  }

  Future<HostManualSendTask> recordManualHandoffOpened(
    HostManualSendTask task,
  ) => callHostCrm(
    _functions,
    name: 'openOrganizerManualSendTask',
    payload: OpenOrganizerManualSendTaskCallableRequest(
      organizerId: task.organizerId,
      taskId: task.taskId,
      expectedRevision: task.revision,
    ).toJson(),
    action: 'record manual handoff open',
    parse: HostManualSendTask.fromCallableData,
  );

  Future<HostManualSendTask> validateManualSendTaskLaunch(
    HostManualSendTask task,
  ) => callHostCrm(
    _functions,
    name: 'validateOrganizerManualSendTaskLaunch',
    payload: ValidateOrganizerManualSendTaskLaunchCallableRequest(
      organizerId: task.organizerId,
      taskId: task.taskId,
      expectedRevision: task.revision,
    ).toJson(),
    action: 'validate manual handoff launch',
    parse: HostManualSendTask.fromCallableData,
  );

  Future<HostManualSendTask> markManualSendTask(
    HostManualSendTask task,
    HostManualSendTaskAction action,
  ) => callHostCrm(
    _functions,
    name: 'markOrganizerManualSendTask',
    payload: MarkOrganizerManualSendTaskCallableRequest(
      organizerId: task.organizerId,
      taskId: task.taskId,
      expectedRevision: task.revision,
      action: action.name,
    ).toJson(),
    action: 'mark manual send task ${action.name}',
    parse: HostManualSendTask.fromCallableData,
  );

  Future<HostManualSendTaskReplan> replanManualSendTasks({
    required String organizerId,
    required List<String> taskIds,
  }) => callHostCrm(
    _functions,
    name: 'replanOrganizerManualSendTasks',
    payload: ReplanOrganizerManualSendTasksCallableRequest(
      organizerId: organizerId,
      taskIds: taskIds,
    ).toJson(),
    action: 'recheck manual send task routes',
    parse: HostManualSendTaskReplan.fromCallableData,
  );
}

// keepalive: Reuse the callable and Firestore clients for the communication
// subdomain; rules authorize every read.
@Riverpod(keepAlive: true)
HostCommunicationRepository hostCommunicationRepository(Ref ref) =>
    HostCommunicationRepository(
      ref.watch(firebaseFunctionsProvider),
      firestore: ref.watch(firebaseFirestoreProvider),
      clock: ref.watch(appClockProvider),
    );

/// The organizer's active by-hand handoffs, a page at a time, every row
/// shown live.
@riverpod
class HostManualSendTaskPages extends _$HostManualSendTaskPages {
  late LivePager<HostManualSendTask> _pager;

  @override
  Stream<LivePages<HostManualSendTask>> build(String organizerId) {
    _pager = ref
        .watch(hostCommunicationRepositoryProvider)
        .watchManualSendTasks(organizerId);
    return _pager.pages;
  }

  /// Opens the next page, or retries the one that failed.
  void loadMore() => _pager.loadMore();
}
