import 'package:catch_dating_app/contexts/live/domain/event_assistance_observation.dart';
import 'package:catch_dating_app/contexts/live/domain/event_assistance_parsing.dart';
import 'package:catch_dating_app/contexts/live/domain/event_rehearsal_assistance_plan.dart';
import 'package:catch_dating_app/contexts/live/domain/event_rehearsal_delivery_outcome.dart';

enum RehearsalAutomationStatus { enabled, paused }

enum RehearsalDeliveryStopReason {
  responded,
  cancelled,
  superseded,
  expired,
  eventClosed,
  permissionRevoked,
  guestPresent,
  guestDeclined,
  notAdmitted,
  hostStopped,
  participationInactive,
}

enum RehearsalDeliveryFactsReason { eventFactsStale, routeFactsStale }

enum RehearsalDeliveryReviewReason {
  noEligibleRoute,
  attemptLimit,
  policyRejected,
  recipientNeedsReview,
  providerOwnsFallback,
  conflictingDeliveryEvidence,
  historyUnavailable,
  configurationUnavailable,
}

/// Saved Host configuration and its last server evaluation, not send authority.
final class RehearsalAssistanceAutomation {
  const RehearsalAssistanceAutomation._({
    required this.clockId,
    required this.status,
    required this.plan,
    required this.outcomes,
    required this.nextOutcomeIndex,
    required this.evaluation,
    required this.inheritsEventSettings,
  });
  final bool inheritsEventSettings;
  final String clockId;
  final RehearsalAutomationStatus status;
  final RehearsalAssistancePlan plan;
  final List<RehearsalDeliveryOutcome> outcomes;
  final int nextOutcomeIndex;
  final RehearsalAutomationEvaluation? evaluation;
  int get remainingOutcomes => outcomes.length - nextOutcomeIndex;

  factory RehearsalAssistanceAutomation.fromJson(Object? value) {
    final raw = assistanceObject(value);
    final map = assistanceObject(raw, {
      if (raw.containsKey('origin')) 'origin',
      'clockId',
      'status',
      'plan',
      'outcomes',
      'nextOutcomeIndex',
      'evaluation',
    });
    if (raw.containsKey('origin') && map['origin'] != 'eventSettings') {
      throw const FormatException('Unknown practice recipe origin.');
    }
    final clockId = assistanceId(map['clockId']);
    final outcomes = rehearsalDeliveryScript(map['outcomes']);
    final cursor = assistanceInteger(map['nextOutcomeIndex']);
    if (!RegExp(r'^clock:[a-f0-9]{64}$').hasMatch(clockId) ||
        cursor > outcomes.length) {
      throw const FormatException(
        'Invalid practice automation scope or cursor.',
      );
    }
    return RehearsalAssistanceAutomation._(
      clockId: clockId,
      inheritsEventSettings: map['origin'] == 'eventSettings',
      status: assistanceEnum(RehearsalAutomationStatus.values, map['status']),
      plan: RehearsalAssistancePlan.fromJson(map['plan']),
      outcomes: outcomes,
      nextOutcomeIndex: cursor,
      evaluation: map['evaluation'] == null
          ? null
          : RehearsalAutomationEvaluation.fromJson(map['evaluation']),
    );
  }
}

/// Freeze an explicit, bounded script. An absent script has no assumed outcome.
List<RehearsalDeliveryOutcome> rehearsalDeliveryScript(Object? value) {
  if (value is! List || value.isEmpty || value.length > 6) {
    throw const FormatException(
      'Choose one to six practice delivery outcomes.',
    );
  }
  return List.unmodifiable(value.map(RehearsalDeliveryOutcome.fromJson));
}

final class RehearsalAutomationEvaluation {
  const RehearsalAutomationEvaluation._(this.at, this.policy, this.delivery);
  final int at;
  final AssistanceJoinDecision? policy;
  final RehearsalDeliveryEvaluation delivery;
  factory RehearsalAutomationEvaluation.fromJson(Object? value) {
    final map = assistanceObject(value, {'at', 'policy', 'delivery'});
    return RehearsalAutomationEvaluation._(
      assistanceInteger(map['at']),
      map['policy'] == null
          ? null
          : AssistanceJoinDecision.fromJson(map['policy']),
      RehearsalDeliveryEvaluation.fromJson(map['delivery']),
    );
  }
}

/// An exhaustive view of simulation delivery. Reconciliation includes accepted
/// or uncertain submissions; it never becomes confirmed delivery by inference.
sealed class RehearsalDeliveryEvaluation {
  const RehearsalDeliveryEvaluation();
  factory RehearsalDeliveryEvaluation.fromJson(Object? value) {
    final map = assistanceObject(value);
    switch (map['kind']) {
      case 'paused':
        assistanceObject(map, {'kind'});
        return const RehearsalDeliveryPaused._();
      case 'notApplicable':
        assistanceObject(map, {'kind'});
        return const RehearsalDeliveryNotApplicable._();
      case 'scriptExhausted':
        assistanceObject(map, {'kind'});
        return const RehearsalDeliveryScriptExhausted._();
      case 'stop':
        assistanceObject(map, {'kind', 'reason'});
        return RehearsalDeliveryStopped._(
          assistanceEnum(RehearsalDeliveryStopReason.values, map['reason']),
        );
      case 'delivered':
        assistanceObject(map, {'kind', 'attemptIds'});
        return RehearsalDeliveryDelivered._(_attemptIds(map['attemptIds']));
      case 'reconcile':
        assistanceObject(map, {'kind', 'attemptIds', 'notBefore'});
        return RehearsalDeliveryReconcile._(
          _attemptIds(map['attemptIds']),
          assistanceInteger(map['notBefore']),
        );
      case 'refreshFacts':
        assistanceObject(map, {'kind', 'reason'});
        return RehearsalDeliveryRefreshFacts._(
          assistanceEnum(RehearsalDeliveryFactsReason.values, map['reason']),
        );
      case 'wait':
        assistanceObject(map, {'kind', 'notBefore', 'reason'});
        if (map['reason'] != 'retryBackoff') {
          throw const FormatException('Unknown practice delivery wait.');
        }
        return RehearsalDeliveryBackoff._(assistanceInteger(map['notBefore']));
      case 'hostDecision':
        assistanceObject(map, {'kind', 'reason'});
        return RehearsalDeliveryNeedsHost._(
          assistanceEnum(RehearsalDeliveryReviewReason.values, map['reason']),
        );
      default:
        throw const FormatException('Unknown practice delivery evaluation.');
    }
  }
}

final class RehearsalDeliveryPaused extends RehearsalDeliveryEvaluation {
  const RehearsalDeliveryPaused._();
}

final class RehearsalDeliveryNotApplicable extends RehearsalDeliveryEvaluation {
  const RehearsalDeliveryNotApplicable._();
}

final class RehearsalDeliveryScriptExhausted
    extends RehearsalDeliveryEvaluation {
  const RehearsalDeliveryScriptExhausted._();
}

final class RehearsalDeliveryStopped extends RehearsalDeliveryEvaluation {
  const RehearsalDeliveryStopped._(this.reason);
  final RehearsalDeliveryStopReason reason;
}

final class RehearsalDeliveryDelivered extends RehearsalDeliveryEvaluation {
  const RehearsalDeliveryDelivered._(this.attemptIds);
  final List<String> attemptIds;
}

final class RehearsalDeliveryReconcile extends RehearsalDeliveryEvaluation {
  const RehearsalDeliveryReconcile._(this.attemptIds, this.notBefore);
  final List<String> attemptIds;
  final int notBefore;
}

final class RehearsalDeliveryRefreshFacts extends RehearsalDeliveryEvaluation {
  const RehearsalDeliveryRefreshFacts._(this.reason);
  final RehearsalDeliveryFactsReason reason;
}

final class RehearsalDeliveryBackoff extends RehearsalDeliveryEvaluation {
  const RehearsalDeliveryBackoff._(this.notBefore);
  final int notBefore;
}

final class RehearsalDeliveryNeedsHost extends RehearsalDeliveryEvaluation {
  const RehearsalDeliveryNeedsHost._(this.reason);
  final RehearsalDeliveryReviewReason reason;
}

List<String> _attemptIds(Object? value) {
  if (value is! List || value.isEmpty || value.length > 6) {
    throw const FormatException('Invalid practice delivery evidence.');
  }
  final ids = List<String>.unmodifiable(value.map(assistanceId));
  if (ids.toSet().length != ids.length) {
    throw const FormatException('Duplicate practice delivery evidence.');
  }
  return ids;
}
