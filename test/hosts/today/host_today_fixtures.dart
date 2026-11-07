import 'package:catch_dating_app/contexts/events/domain/event.dart';
import 'package:catch_dating_app/contexts/insights/domain/host_attention_item.dart';
import 'package:catch_kernel/activity_taxonomy.dart';

import '../../events/events_test_helpers.dart';

/// A Tuesday evening before doors.
final todayNow = DateTime(2026, 10, 27, 17, 40);

Event todayEvent(
  String id, {
  required DateTime start,
  String name = 'Tuesday Trivia Night',
  int booked = 26,
  int capacity = 32,
  int waitlisted = 4,
  ActivityKind kind = ActivityKind.pubQuiz,
  EventLifecycleStatus status = EventLifecycleStatus.active,
  Duration length = const Duration(hours: 2),
}) => buildEvent(
  id: id,
  organizerId: 'org-1',
  name: name,
  startTime: start,
  endTime: start.add(length),
  meetingPoint: 'Harbour Room',
  eventFormat: EventFormatSnapshot.fromActivityKind(kind),
  capacityLimit: capacity,
  bookedCount: booked,
  waitlistedCount: waitlisted,
  status: status,
);

HostAttentionItem todayAttention(
  String id, {
  HostAttentionKind kind = HostAttentionKind.eventJoinRequestReview,
  HostAttentionUrgency urgency = HostAttentionUrgency.immediate,
  required DateTime dueAt,
  String eventId = 'tonight',
}) => HostAttentionItem(
  id: id,
  kind: kind,
  scope: HostAttentionScope.event,
  sourceOwner: HostAttentionSourceOwner.events,
  sourceId: eventId,
  sourceRevision: 'r1',
  eventId: eventId,
  status: HostAttentionStatus.open,
  consequence: HostAttentionConsequence.risksGuestExperience,
  blocking: false,
  urgency: urgency,
  destination: HostAttentionDestination(
    route: HostAttentionDestinationRoute.hostEventManage,
    section: 'guests',
    eventId: eventId,
  ),
  context: const HostAttentionContext(eventName: 'Trivia', count: 2),
  dedupeKey: '${kind.name}:$id',
  policyVersion: 1,
  resolutionVersion: 1,
  assignedHostUid: null,
  openedAt: todayNow.subtract(const Duration(hours: 1)),
  dueAt: dueAt,
  expiresAt: null,
);
