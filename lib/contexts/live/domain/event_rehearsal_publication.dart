import 'dart:convert';
import 'dart:math';

import 'package:catch_dating_app/contexts/live/domain/event_assistance_late_join_destination.dart';
import 'package:catch_dating_app/contexts/live/domain/event_assistance_late_join_template.dart';
import 'package:catch_dating_app/contexts/live/domain/event_assistance_observation.dart';
import 'package:catch_dating_app/contexts/live/domain/event_assistance_runtime_configuration.dart';
import 'package:catch_dating_app/contexts/live/domain/event_rehearsal.dart';
import 'package:catch_dating_app/contexts/live/domain/event_rehearsal_assistance_command.dart';
import 'package:catch_dating_app/contexts/live/domain/event_rehearsal_assistance_plan.dart';
import 'package:catch_dating_app/contexts/live/domain/event_rehearsal_movement.dart';
import 'package:catch_dating_app/core/cryptography/sha256_digest.dart';

/// A configured destination in an actual, generation-bound movement review.
/// Selecting it chooses a policy scope; it cannot confirm a group's position.
final class RehearsalJoiningPoint {
  const RehearsalJoiningPoint._(this.review, this.destination);
  final RehearsalMovementReview review;
  final RehearsalMovementDestination destination;
  String get label => destination.label;
  String get text => destination.text;
  AssistanceJoiningTarget get target => destination.target;
  String get groupLabel =>
      review.groups.singleWhere((g) => g.groupId == review.scope.groupId).label;
}

List<RehearsalJoiningPoint> rehearsalJoiningPoints(
  RehearsalMovementReview review,
) => List.unmodifiable(
  review.destinations.map((d) => RehearsalJoiningPoint._(review, d)),
);

/// A moving event defaults to its configured stops, a fixed event to its venue.
/// Accepted group membership and the current departure remain separate facts.
RehearsalJoiningPoint? rehearsalDefaultJoiningPoint(
  RehearsalMovementReview review,
) {
  final points = rehearsalJoiningPoints(review);
  final moving = points
      .where((p) => p.target is! AssistanceFixedPlace)
      .toList();
  final choices = moving.isEmpty ? points : moving;
  return choices
          .where((p) => p.target == review.guidance?.destination)
          .firstOrNull ??
      choices.firstOrNull;
}

final class RehearsalLaterJoiningOption {
  RehearsalLaterJoiningOption(this.point, {String? label})
    : label = label ?? point.label {
    // Hosts can supply a short button label without rewriting the destination.
    AssistanceLaterJoiningChoice(label: this.label, target: point.target);
  }
  final RehearsalJoiningPoint point;
  final String label;
}

sealed class RehearsalJoiningPreview {
  const RehearsalJoiningPreview();
}

final class RehearsalJoiningAwaitingDeparture extends RehearsalJoiningPreview {
  const RehearsalJoiningAwaitingDeparture._();
}

final class RehearsalJoiningOutsidePolicy extends RehearsalJoiningPreview {
  const RehearsalJoiningOutsidePolicy._(this.currentDestination);
  final RehearsalMovementDestination currentDestination;
}

final class RehearsalJoiningConfirmed extends RehearsalJoiningPreview {
  const RehearsalJoiningConfirmed._(this.guidance);
  final AssistanceJoiningGuidance guidance;
  bool get entryPermitted => switch (guidance.destination) {
    AssistanceFixedPlace(:final lateEntry) =>
      lateEntry == AssistanceLateEntry.allowed,
    AssistanceItineraryStop() || AssistanceGroupCheckpoint() => true,
  };
}

/// Configurable recipe with source-derived destinations and copy. Waiting for a
/// departure has no guidance preview and cannot be published as an instruction.
final class RehearsalPublicationDraft {
  RehearsalPublicationDraft({
    required this.actorId,
    required this.joiningPoint,
    required this.rules,
    required List<AssistanceMessageRoute> routes,
    required this.deliveryPolicy,
    this.setting,
    this.responseDeadline,
    List<RehearsalLaterJoiningOption> laterChoices = const [],
  }) : routes = List.unmodifiable(routes),
       laterChoices = List.unmodifiable(laterChoices);
  final String actorId;
  final RehearsalJoiningPoint joiningPoint;
  RehearsalMovementReview get movement => joiningPoint.review;
  final AssistanceLateJoinRules rules;
  final List<AssistanceMessageRoute> routes;
  final AssistanceDeliveryPolicy deliveryPolicy;
  final AssistanceTemplateSetting? setting;
  final DateTime? responseDeadline;
  final List<RehearsalLaterJoiningOption> laterChoices;

  RehearsalJoiningPreview preview(EventRehearsalBootstrap snapshot) =>
      _prepare(snapshot).preview;

  RehearsalPublishInstruction prepare(EventRehearsalBootstrap snapshot) {
    final prepared = _prepare(snapshot);
    final setting = prepared.plan.effectiveSetting;
    if (setting is! AssistanceTemplateEnabled ||
        setting.authority != AssistanceTemplateAuthority.executeWithinPolicy) {
      throw const FormatException(
        'Choose automatic execution before publishing practice directions.',
      );
    }
    if (prepared.preview case RehearsalJoiningConfirmed(
      :final entryPermitted,
    ) when entryPermitted) {
      return RehearsalPublishInstruction(actorId: actorId, plan: prepared.plan);
    }
    throw const FormatException(
      'Review confirmed movement and entry rules before publishing directions.',
    );
  }

  RehearsalConfigureAutomation configure(
    EventRehearsalBootstrap snapshot,
    List<RehearsalDeliveryOutcome> outcomes,
  ) => RehearsalConfigureAutomation(
    actorId: actorId,
    plan: _prepare(snapshot).plan,
    outcomes: outcomes,
  );

  ({RehearsalAssistancePlan plan, RehearsalJoiningPreview preview}) _prepare(
    EventRehearsalBootstrap snapshot,
  ) {
    final session = snapshot.session;
    if (rehearsalMovementScope(session, movement.scope.groupId) !=
            movement.scope ||
        session.runtimeRevision != movement.session.runtimeRevision ||
        session.virtualNow != movement.session.virtualNow ||
        session.status != movement.session.status ||
        session.actionCount != movement.session.actionCount ||
        !movement.eventOpen ||
        !movement.runtimeLive ||
        session.actionCount >= 500 ||
        session.runtimeRevision >= 2147483647 ||
        !snapshot.actors.any((a) => a.actorId == actorId)) {
      throw const FormatException(
        'Load the current rehearsal and movement review.',
      );
    }
    final catalog = rehearsalJoiningPoints(movement);
    for (final point in [joiningPoint, ...laterChoices.map((c) => c.point)]) {
      if (!identical(point.review, movement) ||
          !catalog.any((p) => p.destination == point.destination)) {
        throw const FormatException(
          'Choose destinations from this movement review.',
        );
      }
    }
    final now = movement.serverTime;
    final end = movement.endAt;
    final cutoff = rules.cutoff;
    final until = cutoff is LateJoinAtTime ? min(end, cutoff.at) : end;
    final deadline = responseDeadline?.millisecondsSinceEpoch;
    if (until <= now ||
        cutoff is LateJoinAtTime && cutoff.at > end ||
        deadline != null && (deadline <= now || deadline > until)) {
      throw const FormatException(
        'Review the remaining practice window and response deadline.',
      );
    }
    // A template scopes the whole configured itinerary/group, rather than just
    // its first stop. An explicit policy retains the Host's narrower selection.
    final policy = rules.destination is LateJoinConfirmedProgress
        ? _destinationPolicy(joiningPoint.target, catalog)
        : rules.destination;
    final configured = catalog
        .map((p) => _entryTarget(p.target, policy))
        .toList();
    if (!_policyMatchesCatalog(policy, configured) ||
        !policy.permits(_entryTarget(joiningPoint.target, policy)) ||
        laterChoices.length > 17 ||
        laterChoices.map((c) => c.point.target).toSet().length !=
            laterChoices.length ||
        !laterChoices.every(
          (c) => policy.permits(_entryTarget(c.point.target, policy)),
        )) {
      throw const FormatException(
        'Review the permitted joining places and later choices.',
      );
    }
    final source = movement.guidance;
    final target = _entryTarget(
      source?.destination ?? joiningPoint.target,
      policy,
    );
    final guide = AssistanceJoiningGuidance(
      revision: source?.revision ?? movement.revision,
      destination: target,
      materialKey: _materialKey(movement.sourceHash, target),
      text: source?.text ?? joiningPoint.text,
      validUntil: end,
    );
    final RehearsalJoiningPreview preview;
    if (source == null) {
      preview = const RehearsalJoiningAwaitingDeparture._();
    } else if (!policy.permits(target)) {
      preview = RehearsalJoiningOutsidePolicy._(
        movement.destinations.singleWhere(
          (d) => d.target == source.destination,
        ),
      );
    } else {
      preview = RehearsalJoiningConfirmed._(guide);
    }
    final resolved = AssistanceLateJoinRules(
      destination: policy,
      cutoff: cutoff,
      maxMessagesPerEpisode: rules.maxMessagesPerEpisode,
      minimumMinutesBetweenMessages: rules.minimumMinutesBetweenMessages,
      unanswered: rules.unanswered,
    );
    return (
      preview: preview,
      plan: RehearsalAssistancePlan(
        rules: resolved,
        setting: setting,
        // The existing wire plan requires a configured copy/target even before
        // departure. These fields are not movement authority; the backend replaces
        // them from saved progress, and the waiting preview exposes no guidance.
        guidance: guide,
        departureConfirmed: source != null,
        responseDeadline: deadline,
        routes: routes,
        deliveryPolicy: deliveryPolicy,
        laterChoices: laterChoices
            .map(
              (c) => AssistanceLaterJoiningChoice(
                label: c.label,
                target: _entryTarget(c.point.target, policy),
              ),
            )
            .toList(),
      ),
    );
  }
}

AssistanceJoiningTarget _entryTarget(
  AssistanceJoiningTarget target,
  LateJoinDestination policy,
) {
  if (target is AssistanceFixedPlace &&
      policy is LateJoinFixedPlace &&
      target.placeId == policy.placeId &&
      target.lateEntry == AssistanceLateEntry.allowed) {
    return AssistanceFixedPlace(
      placeId: target.placeId,
      lateEntry: AssistanceLateEntry.values.byName(policy.lateEntry.name),
    );
  }
  return target;
}

String _materialKey(String sourceHash, AssistanceJoiningTarget target) {
  final entries = target.toJson().entries.toList()
    ..sort((a, b) => a.key.compareTo(b.key));
  return sha256Digest(jsonEncode([sourceHash, Map.fromEntries(entries)]));
}

LateJoinDestination _destinationPolicy(
  AssistanceJoiningTarget target,
  List<RehearsalJoiningPoint> catalog,
) => switch (target) {
  AssistanceFixedPlace(:final placeId, :final lateEntry) => LateJoinFixedPlace(
    placeId: placeId,
    lateEntry: LateEntryRule.values.byName(lateEntry.name),
  ),
  AssistanceItineraryStop(:final itineraryId) => LateJoinItinerary(
    itineraryId: itineraryId,
    permittedStopIds: catalog
        .map((p) => p.target)
        .whereType<AssistanceItineraryStop>()
        .where((p) => p.itineraryId == itineraryId)
        .map((p) => p.stopId)
        .toList(),
  ),
  AssistanceGroupCheckpoint(:final routeId, :final groupId) =>
    LateJoinGroupCheckpoints(
      routeId: routeId,
      groupId: groupId,
      permittedCheckpointIds: catalog
          .map((p) => p.target)
          .whereType<AssistanceGroupCheckpoint>()
          .where((p) => p.routeId == routeId && p.groupId == groupId)
          .map((p) => p.checkpointId)
          .toList(),
    ),
};
bool _policyMatchesCatalog(
  LateJoinDestination policy,
  List<AssistanceJoiningTarget> targets,
) => switch (policy) {
  LateJoinConfirmedProgress() => false,
  LateJoinFixedPlace() => targets.any(policy.permits),
  LateJoinItinerary(:final itineraryId, :final permittedStopIds) =>
    permittedStopIds.every(
      (id) => targets.any(
        (t) =>
            t is AssistanceItineraryStop &&
            t.itineraryId == itineraryId &&
            t.stopId == id,
      ),
    ),
  LateJoinGroupCheckpoints(
    :final routeId,
    :final groupId,
    :final permittedCheckpointIds,
  ) =>
    permittedCheckpointIds.every(
      (id) => targets.any(
        (t) =>
            t is AssistanceGroupCheckpoint &&
            t.routeId == routeId &&
            t.groupId == groupId &&
            t.checkpointId == id,
      ),
    ),
};
