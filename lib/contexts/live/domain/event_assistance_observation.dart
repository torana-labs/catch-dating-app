import 'package:catch_dating_app/contexts/live/domain/event_assistance_parsing.dart';

enum AssistanceLateEntry { allowed, hostDecision, closed }

sealed class AssistanceJoiningTarget {
  const AssistanceJoiningTarget();

  Map<String, Object?> toJson() => switch (this) {
    AssistanceFixedPlace(:final placeId, :final lateEntry) => {
      'kind': 'fixedPlace',
      'placeId': placeId,
      'lateEntry': lateEntry.name,
    },
    AssistanceItineraryStop(:final itineraryId, :final stopId) => {
      'kind': 'itineraryStop',
      'itineraryId': itineraryId,
      'stopId': stopId,
    },
    AssistanceGroupCheckpoint(
      :final routeId,
      :final groupId,
      :final checkpointId,
    ) =>
      {
        'kind': 'groupCheckpoint',
        'routeId': routeId,
        'groupId': groupId,
        'checkpointId': checkpointId,
      },
  };

  Object get _identity => switch (this) {
    AssistanceFixedPlace(:final placeId, :final lateEntry) => (
      'fixedPlace',
      placeId,
      lateEntry,
    ),
    AssistanceItineraryStop(:final itineraryId, :final stopId) => (
      'itineraryStop',
      itineraryId,
      stopId,
    ),
    AssistanceGroupCheckpoint(
      :final routeId,
      :final groupId,
      :final checkpointId,
    ) =>
      ('groupCheckpoint', routeId, groupId, checkpointId),
  };

  @override
  bool operator ==(Object other) =>
      other is AssistanceJoiningTarget && other._identity == _identity;

  @override
  int get hashCode => _identity.hashCode;

  factory AssistanceJoiningTarget.fromJson(Object? value) {
    final map = assistanceObject(value);
    switch (map['kind']) {
      case 'fixedPlace':
        assistanceObject(map, {'kind', 'placeId', 'lateEntry'});
        return AssistanceFixedPlace(
          placeId: assistanceId(map['placeId']),
          lateEntry: assistanceEnum(
            AssistanceLateEntry.values,
            map['lateEntry'],
          ),
        );
      case 'itineraryStop':
        assistanceObject(map, {'kind', 'itineraryId', 'stopId'});
        return AssistanceItineraryStop(
          itineraryId: assistanceText(map['itineraryId']),
          stopId: assistanceText(map['stopId']),
        );
      case 'groupCheckpoint':
        assistanceObject(map, {'kind', 'routeId', 'groupId', 'checkpointId'});
        return AssistanceGroupCheckpoint(
          routeId: assistanceText(map['routeId']),
          groupId: assistanceId(map['groupId']),
          checkpointId: assistanceText(map['checkpointId']),
        );
      default:
        throw const FormatException('Unknown assistance joining target.');
    }
  }
}

final class AssistanceFixedPlace extends AssistanceJoiningTarget {
  const AssistanceFixedPlace({required this.placeId, required this.lateEntry});
  final String placeId;
  final AssistanceLateEntry lateEntry;
}

final class AssistanceItineraryStop extends AssistanceJoiningTarget {
  const AssistanceItineraryStop({
    required this.itineraryId,
    required this.stopId,
  });
  final String itineraryId;
  final String stopId;
}

final class AssistanceGroupCheckpoint extends AssistanceJoiningTarget {
  const AssistanceGroupCheckpoint({
    required this.routeId,
    required this.groupId,
    required this.checkpointId,
  });
  final String routeId;
  final String groupId;
  final String checkpointId;
}

final class AssistanceJoiningGuidance {
  const AssistanceJoiningGuidance({
    required this.revision,
    required this.destination,
    required this.materialKey,
    required this.text,
    required this.validUntil,
  });

  factory AssistanceJoiningGuidance.fromJson(Object? value) {
    final map = assistanceObject(value, {
      'revision',
      'destination',
      'materialKey',
      'text',
      'validUntil',
    });
    return AssistanceJoiningGuidance(
      revision: assistanceInteger(map['revision']),
      destination: AssistanceJoiningTarget.fromJson(map['destination']),
      materialKey: assistanceText(map['materialKey']),
      text: assistanceText(map['text']),
      validUntil: assistanceInteger(map['validUntil']),
    );
  }

  final int revision;
  final AssistanceJoiningTarget destination;
  final String materialKey;
  final String text;
  final int validUntil;
}

/// A guest's report; it never proves physical attendance or arrival time.
sealed class AssistanceJoiningIntention {
  const AssistanceJoiningIntention();

  factory AssistanceJoiningIntention.fromJson(Object? value) {
    final map = assistanceObject(value);
    switch (map['kind']) {
      case 'unknown':
        assistanceObject(map, {'kind'});
        return const AssistanceIntentionUnknown();
      case 'notComing':
        assistanceObject(map, {'kind'});
        return const AssistanceNotComing();
      case 'onMyWay':
        assistanceObject(map, {'kind', 'claimedEta'});
        return AssistanceOnMyWay(assistanceNullableInteger(map['claimedEta']));
      case 'joinLater':
        assistanceObject(map, {'kind', 'target'});
        return AssistanceJoinLater(
          AssistanceJoiningTarget.fromJson(map['target']),
        );
      default:
        throw const FormatException('Unknown assistance joining intention.');
    }
  }
}

final class AssistanceIntentionUnknown extends AssistanceJoiningIntention {
  const AssistanceIntentionUnknown();
}

final class AssistanceNotComing extends AssistanceJoiningIntention {
  const AssistanceNotComing();
}

final class AssistanceOnMyWay extends AssistanceJoiningIntention {
  const AssistanceOnMyWay(this.claimedEta);
  final int? claimedEta;
}

final class AssistanceJoinLater extends AssistanceJoiningIntention {
  const AssistanceJoinLater(this.target);
  final AssistanceJoiningTarget target;
}

enum AssistanceJoinResolution { joined, declined }

enum AssistanceJoinCancellation {
  eventClosed,
  notAdmitted,
  policyDisabled,
  participationInactive,
}

enum AssistanceJoinExpiry { cutoff, lateEntryClosed }

enum AssistanceJoinWait {
  departureUnconfirmed,
  attendanceUnknown,
  guidanceUnavailable,
  throttled,
  unchanged,
  participationUnknown,
}

enum AssistanceJoinReview { unreachable, entryDecision, missingInformation }

sealed class AssistanceJoinDecision {
  const AssistanceJoinDecision();

  factory AssistanceJoinDecision.fromJson(Object? value) {
    final map = assistanceObject(value);
    switch (map['kind']) {
      case 'resolved':
        assistanceObject(map, {'kind', 'reason'});
        return AssistanceJoinResolved(
          assistanceEnum(AssistanceJoinResolution.values, map['reason']),
        );
      case 'cancelled':
        assistanceObject(map, {'kind', 'reason'});
        return AssistanceJoinCancelled(
          assistanceEnum(AssistanceJoinCancellation.values, map['reason']),
        );
      case 'expired':
        assistanceObject(map, {'kind', 'reason'});
        return AssistanceJoinExpired(
          assistanceEnum(AssistanceJoinExpiry.values, map['reason']),
        );
      case 'wait':
        assistanceObject(map, {'kind', 'reason'});
        return AssistanceJoinWaiting(
          assistanceEnum(AssistanceJoinWait.values, map['reason']),
        );
      case 'hostDecision':
        assistanceObject(map, {'kind', 'reason', 'guidance'});
        return AssistanceJoinNeedsHost(
          reason: assistanceEnum(AssistanceJoinReview.values, map['reason']),
          guidance: map['guidance'] == null
              ? null
              : AssistanceJoiningGuidance.fromJson(map['guidance']),
        );
      case 'update':
        assistanceObject(map, {
          'kind',
          'guidance',
          'messageKey',
          'shouldSend',
          'nextEvaluationAt',
        });
        return AssistanceJoiningUpdate(
          guidance: AssistanceJoiningGuidance.fromJson(map['guidance']),
          messageKey: assistanceText(map['messageKey']),
          shouldSend: assistanceBoolean(map['shouldSend']),
          nextEvaluationAt: assistanceNullableInteger(map['nextEvaluationAt']),
        );
      default:
        throw const FormatException('Unknown assistance joining decision.');
    }
  }
}

final class AssistanceJoinResolved extends AssistanceJoinDecision {
  const AssistanceJoinResolved(this.reason);
  final AssistanceJoinResolution reason;
}

final class AssistanceJoinCancelled extends AssistanceJoinDecision {
  const AssistanceJoinCancelled(this.reason);
  final AssistanceJoinCancellation reason;
}

final class AssistanceJoinExpired extends AssistanceJoinDecision {
  const AssistanceJoinExpired(this.reason);
  final AssistanceJoinExpiry reason;
}

final class AssistanceJoinWaiting extends AssistanceJoinDecision {
  const AssistanceJoinWaiting(this.reason);
  final AssistanceJoinWait reason;
}

final class AssistanceJoinNeedsHost extends AssistanceJoinDecision {
  const AssistanceJoinNeedsHost({required this.reason, required this.guidance});
  final AssistanceJoinReview reason;
  final AssistanceJoiningGuidance? guidance;
}

final class AssistanceJoiningUpdate extends AssistanceJoinDecision {
  const AssistanceJoiningUpdate({
    required this.guidance,
    required this.messageKey,
    required this.shouldSend,
    required this.nextEvaluationAt,
  });
  final AssistanceJoiningGuidance guidance;
  final String messageKey;
  final bool shouldSend;
  final int? nextEvaluationAt;
}

enum AssistanceSourceIssue {
  episodeMissing,
  guestSourceChanged,
  membershipMissing,
  membershipSourceChanged,
  unconfigured,
  disabled,
  settingSourceChanged,
  eventClosed,
  runtimeNotLive,
  progressUnconfirmed,
  progressSourceChanged,
  destinationUnavailable,
}

enum AssistanceHistoryIssue { historyLimit, deliveryConflict, ambiguousHistory }

enum AssistanceRuntimeIssue {
  missing,
  paused,
  configurationChanged,
  sourceChanged,
  expired,
  eventClosed,
}

/// The last recorded evaluation. No variant asserts current delivery or a
/// functioning scheduler; callers must retain its separate observation time.
sealed class AssistanceLiveObservation {
  const AssistanceLiveObservation();

  factory AssistanceLiveObservation.fromJson(Object? value) {
    final map = assistanceObject(value);
    switch (map['kind']) {
      case 'decision':
        assistanceObject(map, {'kind', 'decision'});
        return AssistanceDecisionObservation(
          AssistanceJoinDecision.fromJson(map['decision']),
        );
      case 'sourceNotReady':
        assistanceObject(map, {'kind', 'reason'});
        return AssistanceSourceNotReady(
          assistanceEnum(AssistanceSourceIssue.values, map['reason']),
        );
      case 'historyUnavailable':
        assistanceObject(map, {'kind', 'reason'});
        return AssistanceHistoryUnavailable(
          assistanceEnum(AssistanceHistoryIssue.values, map['reason']),
        );
      case 'runtimeUnavailable':
        assistanceObject(map, {'kind', 'reason'});
        return AssistanceRuntimeUnavailable(
          assistanceEnum(AssistanceRuntimeIssue.values, map['reason']),
        );
      case 'responseDeadlineMissing':
        assistanceObject(map, {'kind'});
        return const AssistanceResponseDeadlineMissing();
      case 'episodeChanged':
        assistanceObject(map, {'kind'});
        return const AssistanceEpisodeChanged();
      case 'workExpired':
        assistanceObject(map, {'kind'});
        return const AssistanceWorkExpired();
      case 'evaluationLimit':
        assistanceObject(map, {'kind'});
        return const AssistanceEvaluationLimit();
      default:
        throw const FormatException('Unknown assistance observation.');
    }
  }

  bool get isTerminal => switch (this) {
    AssistanceDecisionObservation(:final decision) => switch (decision) {
      AssistanceJoinResolved() ||
      AssistanceJoinCancelled() ||
      AssistanceJoinExpired() => true,
      AssistanceJoinWaiting() ||
      AssistanceJoinNeedsHost() ||
      AssistanceJoiningUpdate() => false,
    },
    AssistanceSourceNotReady(:final reason) =>
      reason == AssistanceSourceIssue.eventClosed,
    AssistanceRuntimeUnavailable(:final reason) =>
      reason == AssistanceRuntimeIssue.expired ||
          reason == AssistanceRuntimeIssue.eventClosed,
    AssistanceEpisodeChanged() || AssistanceWorkExpired() => true,
    AssistanceHistoryUnavailable() ||
    AssistanceResponseDeadlineMissing() ||
    AssistanceEvaluationLimit() => false,
  };
}

final class AssistanceDecisionObservation extends AssistanceLiveObservation {
  const AssistanceDecisionObservation(this.decision);
  final AssistanceJoinDecision decision;
}

final class AssistanceSourceNotReady extends AssistanceLiveObservation {
  const AssistanceSourceNotReady(this.reason);
  final AssistanceSourceIssue reason;
}

final class AssistanceHistoryUnavailable extends AssistanceLiveObservation {
  const AssistanceHistoryUnavailable(this.reason);
  final AssistanceHistoryIssue reason;
}

final class AssistanceRuntimeUnavailable extends AssistanceLiveObservation {
  const AssistanceRuntimeUnavailable(this.reason);
  final AssistanceRuntimeIssue reason;
}

final class AssistanceResponseDeadlineMissing
    extends AssistanceLiveObservation {
  const AssistanceResponseDeadlineMissing();
}

final class AssistanceEpisodeChanged extends AssistanceLiveObservation {
  const AssistanceEpisodeChanged();
}

final class AssistanceWorkExpired extends AssistanceLiveObservation {
  const AssistanceWorkExpired();
}

final class AssistanceEvaluationLimit extends AssistanceLiveObservation {
  const AssistanceEvaluationLimit();
}
