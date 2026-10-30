import 'dart:convert';

import 'package:catch_dating_app/contexts/live/domain/event_assistance_late_join_destination.dart';
import 'package:catch_dating_app/contexts/live/domain/event_assistance_late_join_rules.dart';
import 'package:catch_dating_app/contexts/live/domain/event_assistance_observation.dart';
import 'package:catch_dating_app/contexts/live/domain/event_assistance_runtime_configuration.dart';
import 'package:catch_dating_app/contexts/live/domain/event_rehearsal.dart';
import 'package:catch_dating_app/contexts/live/domain/event_rehearsal_assistance_command.dart';
import 'package:catch_dating_app/contexts/live/domain/event_rehearsal_assistance_plan.dart';
import 'package:catch_dating_app/kernel/brand.dart';
import 'package:crypto/crypto.dart';

final practiceMessageId = 'outbox:${'a' * 64}';

AssistanceLateJoinRules practiceRules({
  LateJoinDestination? destination,
  LateJoinUnansweredRule unanswered =
      LateJoinUnansweredRule.keepUnknownUntilCutoff,
}) => AssistanceLateJoinRules(
  destination:
      destination ??
      LateJoinFixedPlace(placeId: 'studio', lateEntry: LateEntryRule.allowed),
  cutoff: const LateJoinEventEnd(),
  maxMessagesPerEpisode: 3,
  minimumMinutesBetweenMessages: 10,
  unanswered: unanswered,
);
RehearsalAssistancePlan practicePlan({
  AssistanceLateJoinRules? rules,
  List<AssistanceMessageRoute>? routes,
  List<AssistanceLaterJoiningChoice>? laterChoices,
  int? responseDeadline,
}) => RehearsalAssistancePlan(
  rules: rules ?? practiceRules(),
  guidance: const AssistanceJoiningGuidance(
    revision: 1,
    destination: AssistanceFixedPlace(
      placeId: 'studio',
      lateEntry: AssistanceLateEntry.allowed,
    ),
    materialKey: 'studio-open',
    text: 'Meet us at the studio.',
    validUntil: 3600000,
  ),
  departureConfirmed: false,
  responseDeadline: responseDeadline,
  routes: routes ?? [AssistanceMessageRoute.catchEventSms],
  deliveryPolicy: AssistanceDeliveryPolicy(
    maxAttempts: 3,
    maxAttemptsPerRoute: 1,
    minimumRetrySeconds: 30,
  ),
  laterChoices: laterChoices,
);
Map<String, Object?> practiceInstruction({bool responded = false}) => {
  'messageId': practiceMessageId,
  'intentId': 'message:studio',
  'intentRevision': 1,
  'text': 'Meet us at the studio.',
  'choices': [
    {'choiceId': 'on-my-way', 'label': 'On my way'},
    {'choiceId': 'not-coming', 'label': 'Not coming'},
  ],
  'lifecycle': responded ? 'responded' : 'active',
  'expiresAt': 3600000,
  'canRespond': !responded,
  'responseChoiceId': responded ? 'on-my-way' : null,
};
Map<String, Object?> practiceActor({
  bool withAssistance = false,
  bool responded = false,
}) => {
  'actorId': 'actor-01',
  'displayName': 'Maya',
  'persona': 'lateArrival',
  'status': 'expected',
  'guestMoment': 'checkIn',
  'optedOut': false,
  'keepApartActorIds': <String>[],
  'helpRequested': false,
  'promptCompleted': false,
  if (withAssistance) ...{
    'assistance': {
      'intention': responded
          ? {'kind': 'onMyWay', 'claimedEta': null}
          : {'kind': 'unknown'},
      'latestMessageId': practiceMessageId,
    },
    'assistanceMessage': practiceInstruction(responded: responded),
    'assistanceDelivery': {
      'conflictingEvidence': false,
      'attempts': [
        {
          'attemptId': 'attempt-1',
          'routeId': 'catchEventSms',
          'status': 'accepted',
        },
      ],
    },
  },
};
Map<String, Object?> practiceBootstrap({
  int runtimeRevision = 4,
  int setupRevision = 1,
  String sessionId = 'session-1',
  String organizerId = 'organizer-1',
  String status = 'running',
  int actionCount = 1,
  List<Map<String, Object?>>? actors,
  List<Map<String, Object?>>? actions,
  Map<String, Object?>? helpRequests,
}) => {
  'session': {
    'id': sessionId,
    'organizerId': organizerId,
    'sourceEventId': null,
    'scenarioId': 'lateAndNoShow',
    'seed': 42,
    'actorCount': 2,
    'actionCount': actionCount,
    'status': status,
    'setup': {
      'title': 'Practice',
      'locationName': 'Studio',
      'durationMinutes': 60,
      'hostGoal': 'Help late guests',
      'attendeePrompt': 'Say hello',
      'moduleIds': ['arrival', 'firstHello'],
    },
    'setupRevision': setupRevision,
    'runtimeRevision': runtimeRevision,
    'activeStepIndex': 0,
    'virtualNowMillis': 1000,
    'virtualStartedAtMillis': 0,
    'faultId': 'none',
    'expiresAtMillis': 86400000,
  },
  'actors':
      actors ??
      [
        practiceActor(),
        {...practiceActor(), 'actorId': 'actor-02'},
      ],
  'actions': actions ?? <Map<String, Object?>>[],
  'guestUrl': '${Brand.webOrigin}/rehearse/public-1',
  'canUseInternalFaults': false,
  'helpRequests': ?helpRequests,
};
EventRehearsalBootstrap practiceSnapshot() =>
    EventRehearsalBootstrap.fromCallableData(practiceBootstrap());
RehearsalAssistanceChange practiceChange() => RehearsalAssistanceChange(
  snapshot: practiceSnapshot(),
  clientActionId: 'practice_request_1',
  command: RehearsalPublishInstruction(
    actorId: 'actor-01',
    plan: practicePlan(),
  ),
);
Map<String, Object?> practiceReceipt(RehearsalAssistanceChange change) => {
  'clientActionId': change.clientActionId,
  'actorId': change.command.actorId,
  'kind': 'control',
  'name': 'assistance:${change.command.kind}',
  'runtimeRevision': change.session.runtimeRevision + 1,
  'virtualNowMillis': 1000,
};

Map<String, Object?> practiceAutomation({
  String status = 'enabled',
  int consumed = 0,
  Map<String, Object?>? evaluation,
}) => {
  'clockId': 'clock:${'a' * 64}',
  'status': status,
  'plan': practicePlan().toJson(),
  'outcomes': [
    {'kind': 'unknown', 'reason': 'timeout'},
    {'kind': 'delivered'},
  ],
  'nextOutcomeIndex': consumed,
  'evaluation': evaluation,
};

Map<String, Object?> practiceHelpCase({bool settled = false}) => {
  'caseId': 'practice-case:${'a' * 64}',
  'revision': settled ? 1 : 0,
  'sourceHash': (settled ? 'c' : 'b') * 64,
  'availability': 'current',
  'attendeeId': 'actor-01',
  'category': 'eventLogistics',
  'receivedAt': 500,
  'status': settled ? 'resolved' : 'open',
  'canChange': !settled,
  'resolution': settled
      ? {'outcome': 'resolved', 'actorUid': 'host-1', 'at': 1000}
      : null,
  'assignment': {'kind': 'unassigned'},
};
Map<String, Object?> practiceHelpRequests({bool settled = false}) => {
  'clockId':
      'clock:${sha256.convert(utf8.encode(jsonEncode(['session-1', 0, 1])))}',
  'coverage': 'boundedSession',
  'cases': [practiceHelpCase(settled: settled)],
  'untrackedActorIds': <String>[],
};
