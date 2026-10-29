import 'package:catch_dating_app/contexts/audience/domain/crm/crm_response_fields.dart';
import 'package:catch_dating_app/contexts/audience/domain/crm/host_communication_plan.dart';

enum HostManualSendTaskStatus {
  queued,
  handoffOpened,
  hostMarkedSent,
  skipped,
  cancelled,
  superseded,
  expired,
}

enum HostManualSendTaskAction { hostMarkedSent, skipped, cancelled }

enum HostManualSendTaskDisposition {
  keepByHand,
  managedRouteAvailable,
  unavailable,
  taskInactive,
}

class HostManualSendTask {
  const HostManualSendTask({
    required this.organizerId,
    required this.taskId,
    required this.contactId,
    required this.displayName,
    required this.status,
    required this.active,
    required this.revision,
    required this.phoneE164,
    required this.prefillText,
    required this.openCount,
    required this.createdAt,
    required this.updatedAt,
    required this.openedAt,
    required this.expiresAt,
  });

  factory HostManualSendTask.fromCallableData(Object? data) =>
      HostManualSendTask.fromMap(crmRequiredMap(data, 'manual send task'));

  factory HostManualSendTask.fromMap(Map<Object?, Object?> map) {
    if (crmRequiredString(map, 'routeId') != 'personalWhatsappHandoff' ||
        crmRequiredString(map, 'deliveryMode') != 'byHand') {
      throw const FormatException('Manual task had an unsafe route.');
    }
    return HostManualSendTask(
      organizerId: crmRequiredString(map, 'organizerId'),
      taskId: crmRequiredString(map, 'taskId'),
      contactId: crmRequiredString(map, 'contactId'),
      displayName: crmRequiredString(map, 'displayName'),
      status: crmEnumByName(
        HostManualSendTaskStatus.values,
        crmRequiredString(map, 'status'),
        'manual send task status',
      ),
      active: crmRequiredBool(map, 'active'),
      revision: crmRequiredInt(map, 'revision'),
      phoneE164: crmRequiredString(map, 'phoneE164'),
      prefillText: crmRequiredString(map, 'prefillText'),
      openCount: crmRequiredInt(map, 'openCount'),
      createdAt: crmRequiredDateTimeFromMillis(map, 'createdAtMillis'),
      updatedAt: crmRequiredDateTimeFromMillis(map, 'updatedAtMillis'),
      openedAt: crmDateTimeFromMillis(map['openedAtMillis']),
      expiresAt: crmRequiredDateTimeFromMillis(map, 'expiresAtMillis'),
    );
  }

  final String organizerId;
  final String taskId;
  final String contactId;
  final String displayName;
  final HostManualSendTaskStatus status;
  final bool active;
  final int revision;
  final String phoneE164;
  final String prefillText;
  final int openCount;
  final DateTime createdAt;
  final DateTime updatedAt;
  final DateTime? openedAt;
  final DateTime expiresAt;
}

class HostManualSendTaskPage {
  const HostManualSendTaskPage({
    required this.organizerId,
    required this.tasks,
    required this.nextCursor,
  });

  factory HostManualSendTaskPage.fromCallableData(Object? data) {
    final map = crmRequiredMap(data, 'manual send task page');
    return HostManualSendTaskPage(
      organizerId: crmRequiredString(map, 'organizerId'),
      tasks: crmMapList(
        map['tasks'],
        'manual send tasks',
      ).map(HostManualSendTask.fromMap).toList(growable: false),
      nextCursor: crmNullableString(map['nextCursor']),
    );
  }

  final String organizerId;
  final List<HostManualSendTask> tasks;
  final String? nextCursor;
}

class HostManualSendTaskReplanResult {
  const HostManualSendTaskReplanResult({
    required this.taskId,
    required this.contactId,
    required this.disposition,
    required this.recommendedRouteId,
    required this.blocker,
  });

  factory HostManualSendTaskReplanResult.fromMap(Map<Object?, Object?> map) =>
      HostManualSendTaskReplanResult(
        taskId: crmRequiredString(map, 'taskId'),
        contactId: crmRequiredString(map, 'contactId'),
        disposition: crmEnumByName(
          HostManualSendTaskDisposition.values,
          crmRequiredString(map, 'disposition'),
          'manual task disposition',
        ),
        recommendedRouteId: crmNullableString(map['recommendedRouteId']) == null
            ? null
            : crmEnumByName(
                HostCommunicationRouteId.values,
                crmRequiredString(map, 'recommendedRouteId'),
                'manual task recommended route',
              ),
        blocker: crmNullableString(map['blocker']) == null
            ? null
            : crmEnumByName(
                HostCommunicationRouteBlocker.values,
                crmRequiredString(map, 'blocker'),
                'manual task blocker',
              ),
      );

  final String taskId;
  final String contactId;
  final HostManualSendTaskDisposition disposition;
  final HostCommunicationRouteId? recommendedRouteId;
  final HostCommunicationRouteBlocker? blocker;
}

class HostManualSendTaskReplan {
  const HostManualSendTaskReplan({
    required this.organizerId,
    required this.results,
    required this.resolvedAt,
  });

  factory HostManualSendTaskReplan.fromCallableData(Object? data) {
    final map = crmRequiredMap(data, 'manual send task replan');
    return HostManualSendTaskReplan(
      organizerId: crmRequiredString(map, 'organizerId'),
      results: crmMapList(
        map['results'],
        'manual task replan results',
      ).map(HostManualSendTaskReplanResult.fromMap).toList(growable: false),
      resolvedAt: crmRequiredDateTimeFromMillis(map, 'resolvedAtMillis'),
    );
  }

  final String organizerId;
  final List<HostManualSendTaskReplanResult> results;
  final DateTime resolvedAt;
}
