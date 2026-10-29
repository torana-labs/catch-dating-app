import 'dart:convert';

import 'package:catch_dating_app/contexts/live/domain/event_assistance_delivery.dart';
import 'package:catch_dating_app/contexts/live/domain/event_assistance_observation.dart';
import 'package:catch_dating_app/contexts/live/domain/event_assistance_parsing.dart';
import 'package:catch_dating_app/contexts/live/domain/event_assistance_runtime_configuration.dart';
import 'package:catch_dating_app/contexts/live/domain/event_rehearsal.dart';
import 'package:catch_dating_app/platform/cryptography/sha256_digest.dart';

/// A practice message identity can never supply a live command context.
final class RehearsalDeliveryScope {
  const RehearsalDeliveryScope._({
    required this.sessionId,
    required this.organizerId,
    required this.setupRevision,
    required this.clockId,
    required this.messageId,
  });
  final String sessionId, organizerId, clockId, messageId;
  final int setupRevision;
  @override
  bool operator ==(Object other) =>
      other is RehearsalDeliveryScope &&
      sessionId == other.sessionId &&
      organizerId == other.organizerId &&
      setupRevision == other.setupRevision &&
      clockId == other.clockId &&
      messageId == other.messageId;
  @override
  int get hashCode =>
      Object.hash(sessionId, organizerId, setupRevision, clockId, messageId);
}

final class RehearsalDeliveryReviews {
  const RehearsalDeliveryReviews._(this.clockId, this.deliveries);
  final String clockId;
  final List<RehearsalHostDelivery> deliveries;

  factory RehearsalDeliveryReviews.fromJson(
    Object? value, {
    required EventRehearsalSession session,
    required List<EventRehearsalActor> actors,
  }) {
    final map = assistanceObject(value, {'context', 'coverage', 'deliveries'});
    final context = assistanceObject(map['context'], {
      'mode',
      'rehearsalId',
      'virtualEventId',
      'clockId',
    });
    final start = session.virtualStartedAt?.millisecondsSinceEpoch;
    final now = assistanceInteger(session.virtualNow.millisecondsSinceEpoch);
    assistanceId(session.id);
    assistanceId(session.organizerId);
    final generation = assistanceInteger(session.setupRevision);
    if (start == null ||
        start < 0 ||
        start > now ||
        generation > 2147483647 ||
        session.setup.durationMinutes <= 0) {
      throw const FormatException('Invalid practice delivery clock.');
    }
    final end = assistanceInteger(
      start + session.setup.durationMinutes * 60000,
    );
    final clockId =
        'clock:${sha256Digest(jsonEncode([session.id, start, generation]))}';
    final virtualEventId = 'practice:${sha256Digest(jsonEncode(session.id))}';
    final raw = map['deliveries'];
    if (context['mode'] != 'rehearsal' ||
        context['rehearsalId'] != session.id ||
        context['virtualEventId'] != virtualEventId ||
        context['clockId'] != clockId ||
        map['coverage'] != 'currentActorMessages' ||
        raw is! List ||
        raw.length > 50 ||
        actors.length > 50 ||
        actors.map((a) => a.actorId).toSet().length != actors.length) {
      throw const FormatException('Invalid practice delivery coverage.');
    }
    final rows = <RehearsalHostDelivery>[];
    final seenActors = <String>{};
    String? previous;
    for (final value in raw) {
      final evidence = AssistanceDeliveryEvidence.fromJson(
        value,
        observedAt: now,
      );
      final actorId = evidence.attendeeId;
      final actor = actors.where((a) => a.actorId == actorId).firstOrNull;
      final message = actor?.assistanceMessage;
      final delivery = actor?.assistanceDelivery;
      if (actor == null ||
          evidence.displayName != null &&
              evidence.displayName != actor.displayName ||
          message == null ||
          delivery == null ||
          actor.assistance?.latestMessageId != evidence.messageId ||
          message.messageId != evidence.messageId ||
          message.lifecycle.name != evidence.lifecycle.name ||
          message.expiresAt != evidence.expiresAt ||
          evidence.purpose != AssistanceMessagePurpose.joiningUpdate ||
          evidence.coordination is! AssistanceDeliveryUntracked ||
          evidence.createdAt < start ||
          evidence.expiresAt > end ||
          !seenActors.add(actor.actorId) ||
          previous != null && previous.compareTo(evidence.messageId) >= 0 ||
          delivery.conflictingEvidence !=
              (evidence.status ==
                  AssistanceDeliveryStatus.conflictingEvidence) ||
          delivery.attempts.length != evidence.attempts.length) {
        throw const FormatException(
          'Practice delivery disagrees with its actor.',
        );
      }
      for (var i = 0; i < delivery.attempts.length; i++) {
        final old = delivery.attempts[i];
        final attempt = evidence.attempts[i];
        final channel = switch (old.route) {
          AssistanceMessageRoute.catchEventSms => AssistanceDeliveryChannel.sms,
          AssistanceMessageRoute.catchEventRcs => AssistanceDeliveryChannel.rcs,
          AssistanceMessageRoute.organizerEventWhatsapp =>
            AssistanceDeliveryChannel.whatsapp,
        };
        if (old.status.name != attempt.state.name ||
            channel != attempt.channel) {
          throw const FormatException('Practice delivery attempts disagree.');
        }
      }
      if (evidence.offersManualHandoff &&
          (![
                EventRehearsalStatus.running,
                EventRehearsalStatus.paused,
              ].contains(session.status) ||
              now >= end ||
              ![
                EventRehearsalActorStatus.expected,
                EventRehearsalActorStatus.disconnected,
              ].contains(actor.status) ||
              actor.assistance?.intention is AssistanceNotComing)) {
        throw const FormatException(
          'Practice delivery offered a stale action.',
        );
      }
      final scope = RehearsalDeliveryScope._(
        sessionId: session.id,
        organizerId: session.organizerId,
        setupRevision: generation,
        clockId: clockId,
        messageId: evidence.messageId,
      );
      rows.add(
        evidence.offersManualHandoff
            ? RehearsalActionableDelivery._(scope, evidence)
            : RehearsalObservedDelivery._(scope, evidence),
      );
      previous = evidence.messageId;
    }
    if (actors.where((a) => a.assistance?.latestMessageId != null).length !=
        rows.length) {
      throw const FormatException(
        'Practice delivery review omitted a message.',
      );
    }
    return RehearsalDeliveryReviews._(clockId, List.unmodifiable(rows));
  }
}

sealed class RehearsalHostDelivery {
  const RehearsalHostDelivery._(this.scope, this.evidence);
  final RehearsalDeliveryScope scope;
  final AssistanceDeliveryEvidence evidence;
  String get actorId => evidence.attendeeId!;
}

final class RehearsalActionableDelivery extends RehearsalHostDelivery {
  const RehearsalActionableDelivery._(super.scope, super.evidence) : super._();
}

final class RehearsalObservedDelivery extends RehearsalHostDelivery {
  const RehearsalObservedDelivery._(super.scope, super.evidence) : super._();
}
