import 'package:catch_dating_app/contexts/live/domain/event_assistance_group_progress.dart';
import 'package:catch_dating_app/contexts/live/domain/event_assistance_group_staff.dart';
import 'package:catch_dating_app/contexts/live/domain/event_assistance_group_staff_change.dart';

final staffGroup = EventAssistanceGroupScope(
  organizerId: 'org-1',
  eventId: 'event-1',
  groupId: 'easy',
);
final staffLookup = EventAssistanceGroupStaffLookup(
  group: staffGroup,
  phoneNumber: '+919876543210',
);
final staffTarget = EventAssistanceGroupStaffTarget(
  group: staffGroup,
  uid: 'staff-1',
);
final staffSource = 'a' * 64;
const assignLead = AssistanceAssignGroupDuty(
  duty: AssistanceGroupDuty.lead,
  expiresAt: 9000,
);
const assignSweep = AssistanceAssignGroupDuty(
  duty: AssistanceGroupDuty.sweep,
  expiresAt: 8000,
);

Map<String, Object?> staffWire({
  String status = 'none',
  int? operatorExpiry,
  EventAssistanceGroupStaffLookup? lookup,
  String uid = 'staff-1',
}) {
  final query = lookup ?? staffLookup;
  return {
    'outcome': 'read',
    'operationRevision': null,
    'view': {
      'context': query.group.context,
      'groupId': query.group.groupId,
      'sourceHash': staffSource,
      'serverTime': 1000,
      'uid': uid,
      'displayName': 'Sam',
      'phoneLastFour': query.phoneLastFour,
      'revision': status == 'none' ? 0 : 3,
      'status': status,
      'duty': status == 'none'
          ? null
          : {
              'groupId': query.group.groupId,
              'duty': 'lead',
              'expiresAtMillis': status == 'expired' ? 900 : 9000,
              'sourceHash': status == 'sourceChanged' ? 'b' * 64 : staffSource,
              'grantedBy': 'host-1',
              'grantedAtMillis': 500,
            },
      'operatorExpiresAtMillis': operatorExpiry,
      'canAssign': true,
      'availableDuties': query.group.groupId == 'event:whole'
          ? ['lead', 'sweep']
          : ['lead', 'pacer', 'sweep'],
    },
  };
}

EventAssistanceGroupStaffResult staffResult(
  Map<String, Object?> data, {
  EventAssistanceGroupStaffLookup? lookup,
}) => EventAssistanceGroupStaffResult.fromCallableData(
  data,
  expectedLookup: lookup ?? staffLookup,
);
EventAssistanceGroupStaffView staffView({String status = 'none'}) =>
    staffResult(staffWire(status: status)).view;
EventAssistanceGroupStaffChange staffChange({
  EventAssistanceGroupStaffView? view,
  AssistanceGroupStaffDecision decision = assignLead,
}) => EventAssistanceGroupStaffChange(
  snapshot: view ?? staffView(),
  decision: decision,
  actorUid: 'host-1',
  operationId: 'staff-action-1',
);

Map<String, Object?> staffAppliedWire(EventAssistanceGroupStaffChange change) {
  final before = change.snapshot;
  final wire = staffWire(lookup: before.lookup, uid: before.target.uid);
  final view = wire['view']! as Map<String, Object?>;
  wire['outcome'] = 'applied';
  wire['operationRevision'] = before.revision + 1;
  view.addAll({
    'revision': before.revision + 1,
    'serverTime': 2000,
    'sourceHash': before.sourceHash,
    'operatorExpiresAtMillis': (before.operatorExpiresAt ?? 0) > 2000
        ? before.operatorExpiresAt
        : null,
  });
  switch (change.decision) {
    case AssistanceAssignGroupDuty(:final duty, :final expiresAt):
      view['status'] = 'assigned';
      view['duty'] = {
        'groupId': before.target.group.groupId,
        'duty': duty.name,
        'expiresAtMillis': expiresAt,
        'sourceHash': before.sourceHash,
        'grantedBy': change.actorUid,
        'grantedAtMillis': 2000,
      };
    case AssistanceRemoveGroupDuty():
      view['status'] = 'none';
      view['duty'] = null;
  }
  return wire;
}
