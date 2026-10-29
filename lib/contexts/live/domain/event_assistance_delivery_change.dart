import 'package:catch_dating_app/contexts/live/domain/event_assistance_delivery.dart';
import 'package:catch_dating_app/contexts/live/domain/event_assistance_delivery_scope.dart';
import 'package:catch_dating_app/contexts/live/domain/event_assistance_parsing.dart';
import 'package:collection/collection.dart';

/// Only an explicitly actionable, source-bound delivery can authorize a handoff.
final class EventAssistanceDeliveryChange {
  EventAssistanceDeliveryChange({
    required this.snapshot,
    required this.actorUid,
    required this.operationId,
  }) {
    assistanceId(actorUid);
    assistanceId(operationId);
    assistanceInteger(snapshot.revision + 1);
  }
  final AssistanceActionableDelivery snapshot;
  final String actorUid;
  final String operationId;
  Map<String, Object?> get command => {
    'kind': 'repairDelivery',
    'context': snapshot.scope.context,
    'eventId': snapshot.scope.eventId,
    'operationId': operationId,
    'payload': {
      'deliveryId': snapshot.scope.messageId,
      'action': 'manualHandoff',
    },
  };
}

enum AssistanceDeliveryChangeOutcome { applied, replayed }

final class EventAssistanceDeliveryResult {
  const EventAssistanceDeliveryResult._(
    this.outcome,
    this.operationRevision,
    this.view,
  );
  final AssistanceDeliveryChangeOutcome outcome;
  final int operationRevision;
  final AssistanceHostDelivery view;

  factory EventAssistanceDeliveryResult.fromCallableData(
    Object? value, {
    required EventAssistanceDeliveryChange expectedChange,
  }) {
    final map = assistanceObject(value, {
      'context',
      'serverTime',
      'outcome',
      'operationRevision',
      'view',
    });
    final before = expectedChange.snapshot;
    final scope = before.scope;
    validateAssistanceDeliveryContext(
      map['context'],
      organizerId: scope.organizerId,
      eventId: scope.eventId,
    );
    final serverTime = assistanceInteger(map['serverTime']);
    final outcome = assistanceEnum(
      AssistanceDeliveryChangeOutcome.values,
      map['outcome'],
    );
    final revision = assistanceInteger(map['operationRevision']);
    final view = AssistanceHostDelivery.fromJson(
      map['view'],
      scope: scope,
      serverTime: serverTime,
    );
    final result = EventAssistanceDeliveryResult._(outcome, revision, view);
    result.requireChange(expectedChange);
    return result;
  }

  /// Verify the exact review again at the state owner, including injected repositories.
  void requireChange(EventAssistanceDeliveryChange expectedChange) {
    final before = expectedChange.snapshot;
    final serverTime = view.observedAt;
    if (view.scope != before.scope ||
        serverTime < before.observedAt ||
        operationRevision != before.revision + 1 ||
        view.revision < operationRevision ||
        view.createdAt != before.createdAt ||
        view.expiresAt != before.expiresAt ||
        view.purpose != before.purpose ||
        view.reviewHash == before.reviewHash ||
        view.handling is! AssistanceManualDeliveryHandling ||
        view.attempts.length != before.attempts.length ||
        !const ListEquality<AssistanceDeliveryChannel>().equals(
          view.attempts.map((a) => a.channel).toList(),
          before.attempts.map((a) => a.channel).toList(),
        )) {
      throw const FormatException(
        'Delivery receipt does not match its action.',
      );
    }
    final guest = switch (view) {
      AssistanceActionableDelivery(:final guestScope) ||
      AssistanceObservedDelivery(:final guestScope) => guestScope,
      AssistanceStaleDelivery() => null,
    };
    if (guest != null && guest != before.guestScope) {
      throw const FormatException('Delivery guest identity changed.');
    }
    if (outcome == AssistanceDeliveryChangeOutcome.applied) {
      final owner = view.handling;
      if (view is! AssistanceObservedDelivery ||
          view.revision != operationRevision ||
          owner is! AssistanceManualDeliveryHandling ||
          owner.actorUid != expectedChange.actorUid ||
          owner.at != serverTime ||
          owner.authority != AssistanceDeliveryOwnerAuthority.current ||
          view.lifecycle != before.lifecycle ||
          view.status != before.status ||
          !const ListEquality<AssistanceDeliveryAttempt>().equals(
            view.attempts,
            before.attempts,
          ) ||
          view.coordination != before.coordination) {
        throw const FormatException(
          'Handoff changed unrelated delivery evidence.',
        );
      }
    }
    // A replay preserves current receipts, responses, source changes or a later
    // handoff. Its original operation revision is not the current revision.
  }
}
