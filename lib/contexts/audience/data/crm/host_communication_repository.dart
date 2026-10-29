import 'package:catch_dating_app/contexts/audience/data/crm/host_crm_callable.dart';
import 'package:catch_dating_app/contexts/audience/domain/crm/host_communication_plan.dart';
import 'package:catch_dating_app/contexts/audience/domain/crm/host_manual_send_task.dart';
import 'package:catch_dating_app/core/schema_contracts/generated/callable_request_dtos.g.dart';
import 'package:catch_dating_app/platform/firebase/firebase_providers.dart';
import 'package:catch_dating_app/platform/firebase/read_limit_policy.dart';
import 'package:cloud_functions/cloud_functions.dart';
import 'package:riverpod_annotation/riverpod_annotation.dart';

part 'host_communication_repository.g.dart';

class HostCommunicationRepository {
  const HostCommunicationRepository(this._functions);

  final FirebaseFunctions _functions;

  Future<HostCommunicationPlan> resolveIndividualCommunicationPlan({
    required String organizerId,
    required String contactId,
  }) => callHostCrm(
    _functions,
    name: 'resolveOrganizerCommunicationPlan',
    payload: ResolveOrganizerCommunicationPlanCallableRequest(
      organizerId: organizerId,
      intent: HostCommunicationIntent.individualConversation.name,
      target: _HostCommunicationContactTarget(contactId: contactId).toJson(),
    ).toJson(),
    action: 'resolve organizer customer communication plan',
    parse: HostCommunicationPlan.fromCallableData,
  );

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

  Future<HostManualSendTaskPage> listManualSendTasks({
    required String organizerId,
    bool activeOnly = true,
    String? cursor,
    int limit = ReadLimitPolicy.historyPage,
  }) => callHostCrm(
    _functions,
    name: 'listOrganizerManualSendTasks',
    payload: ListOrganizerManualSendTasksCallableRequest(
      organizerId: organizerId,
      activeOnly: activeOnly,
      limit: limit > 50 ? 50 : limit,
      cursor: cursor,
    ).toJson(),
    action: 'load manual send tasks',
    parse: HostManualSendTaskPage.fromCallableData,
  );

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

// keepalive: Reuse the callable client for the communication subdomain.
@Riverpod(keepAlive: true)
HostCommunicationRepository hostCommunicationRepository(Ref ref) =>
    HostCommunicationRepository(ref.watch(firebaseFunctionsProvider));

@riverpod
Future<HostCommunicationPlan> hostCommunicationPlan(
  Ref ref,
  String organizerId,
  String contactId,
) => ref
    .read(hostCommunicationRepositoryProvider)
    .resolveIndividualCommunicationPlan(
      organizerId: organizerId,
      contactId: contactId,
    );

@riverpod
Future<HostManualSendTaskPage> hostManualSendTasks(
  Ref ref,
  String organizerId,
) => ref
    .read(hostCommunicationRepositoryProvider)
    .listManualSendTasks(organizerId: organizerId);

final class _HostCommunicationContactTarget {
  const _HostCommunicationContactTarget({required this.contactId});

  final String contactId;

  Map<String, Object?> toJson() => {'kind': 'contact', 'contactId': contactId};
}
