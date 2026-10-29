final class MarkEventAttendanceCallableResponse {
  const MarkEventAttendanceCallableResponse({required this.attended});

  factory MarkEventAttendanceCallableResponse.fromCallableData(Object? data) {
    if (data case final Map<Object?, Object?> map) {
      final attended = map['attended'];
      if (attended is bool) {
        return MarkEventAttendanceCallableResponse(attended: attended);
      }
    }
    throw StateError('markEventAttendance response was missing attended.');
  }

  final bool attended;
}

enum EventBroadcastAudience { booked, prospective, everyone }

enum EventBroadcastDeliveryStatus { completed, partial }

final class SendEventBroadcastCallableResponse {
  const SendEventBroadcastCallableResponse({
    required this.broadcastId,
    required this.status,
    required this.recipientCount,
    required this.excludedCount,
    required this.activityAvailableCount,
    required this.pushAttemptedCount,
    required this.pushAcceptedCount,
    required this.pushFailedCount,
    required this.pushUnknownCount,
    required this.idempotentReplay,
  });

  factory SendEventBroadcastCallableResponse.fromCallableData(Object? data) {
    if (data case final Map<Object?, Object?> map) {
      final broadcastId = map['broadcastId'];
      final status = switch (map['status']) {
        'completed' => EventBroadcastDeliveryStatus.completed,
        'partial' => EventBroadcastDeliveryStatus.partial,
        _ => null,
      };
      final recipientCount = _callableInt(map['recipientCount']);
      final excludedCount = _callableInt(map['excludedCount']);
      final activityAvailableCount = _callableInt(
        map['activityAvailableCount'],
      );
      final pushAttemptedCount = _callableInt(map['pushAttemptedCount']);
      final pushAcceptedCount = _callableInt(map['pushAcceptedCount']);
      final pushFailedCount = _callableInt(map['pushFailedCount']);
      final pushUnknownCount = _callableInt(map['pushUnknownCount']);
      final idempotentReplay = map['idempotentReplay'];
      if (broadcastId is String &&
          broadcastId.isNotEmpty &&
          status != null &&
          recipientCount != null &&
          excludedCount != null &&
          activityAvailableCount != null &&
          pushAttemptedCount != null &&
          pushAcceptedCount != null &&
          pushFailedCount != null &&
          pushUnknownCount != null &&
          idempotentReplay is bool) {
        return SendEventBroadcastCallableResponse(
          broadcastId: broadcastId,
          status: status,
          recipientCount: recipientCount,
          excludedCount: excludedCount,
          activityAvailableCount: activityAvailableCount,
          pushAttemptedCount: pushAttemptedCount,
          pushAcceptedCount: pushAcceptedCount,
          pushFailedCount: pushFailedCount,
          pushUnknownCount: pushUnknownCount,
          idempotentReplay: idempotentReplay,
        );
      }
    }
    throw StateError(
      'sendEventBroadcast response was missing delivery counters.',
    );
  }

  final String broadcastId;
  final EventBroadcastDeliveryStatus status;
  final int recipientCount;
  final int excludedCount;
  final int activityAvailableCount;
  final int pushAttemptedCount;
  final int pushAcceptedCount;
  final int pushFailedCount;
  final int pushUnknownCount;
  final bool idempotentReplay;

  bool get isPartial => status == EventBroadcastDeliveryStatus.partial;
}

int? _callableInt(Object? value) => value is num ? value.toInt() : null;

final class CreateEventInviteLinkCallableResponse {
  const CreateEventInviteLinkCallableResponse({
    required this.inviteLinkId,
    required this.inviteToken,
    required this.eventId,
    required this.label,
    this.source,
  });

  factory CreateEventInviteLinkCallableResponse.fromCallableData(Object? data) {
    if (data case final Map<Object?, Object?> map) {
      final inviteLinkId = map['inviteLinkId'];
      final inviteToken = map['inviteToken'];
      final eventId = map['eventId'];
      final label = map['label'];
      final source = map['source'];
      if (inviteLinkId is String &&
          inviteToken is String &&
          eventId is String &&
          label is String) {
        return CreateEventInviteLinkCallableResponse(
          inviteLinkId: inviteLinkId,
          inviteToken: inviteToken,
          eventId: eventId,
          label: label,
          source: source is String ? source : null,
        );
      }
    }
    throw StateError(
      'createEventInviteLink response was missing link details.',
    );
  }

  final String inviteLinkId;
  final String inviteToken;
  final String eventId;
  final String label;
  final String? source;
}

final class RecordEventInviteLinkOpenCallableResponse {
  const RecordEventInviteLinkOpenCallableResponse({
    required this.accepted,
    required this.disabled,
    required this.eventId,
    required this.inviteLinkId,
    this.label,
    this.source,
  });

  factory RecordEventInviteLinkOpenCallableResponse.fromCallableData(
    Object? data,
  ) {
    if (data case final Map<Object?, Object?> map) {
      final accepted = map['accepted'];
      final disabled = map['disabled'];
      final eventId = map['eventId'];
      final inviteLinkId = map['inviteLinkId'];
      final label = map['label'];
      final source = map['source'];
      if (accepted is bool &&
          disabled is bool &&
          eventId is String &&
          inviteLinkId is String) {
        return RecordEventInviteLinkOpenCallableResponse(
          accepted: accepted,
          disabled: disabled,
          eventId: eventId,
          inviteLinkId: inviteLinkId,
          label: label is String ? label : null,
          source: source is String ? source : null,
        );
      }
    }
    throw StateError(
      'recordEventInviteLinkOpen response was missing link details.',
    );
  }

  final bool accepted;
  final bool disabled;
  final String eventId;
  final String inviteLinkId;
  final String? label;
  final String? source;
}

final class CreateWaitlistOffersCallableResponse {
  const CreateWaitlistOffersCallableResponse({
    required this.createdCount,
    required this.skippedCount,
    this.offers = const [],
  });

  factory CreateWaitlistOffersCallableResponse.fromCallableData(Object? data) {
    if (data case final Map<Object?, Object?> map) {
      final createdCount = map['createdCount'];
      final skippedCount = map['skippedCount'];
      if (createdCount is num && skippedCount is num) {
        return CreateWaitlistOffersCallableResponse(
          createdCount: createdCount.toInt(),
          skippedCount: skippedCount.toInt(),
          offers: _parseOfferRows(map['offers']),
        );
      }
    }
    throw StateError(
      'createEventWaitlistOffers response was missing counters.',
    );
  }

  final int createdCount;
  final int skippedCount;
  final List<WaitlistOfferActionRow> offers;
}

final class WaitlistOfferActionRow {
  const WaitlistOfferActionRow({
    required this.uid,
    required this.status,
    this.reason,
    this.expiresAtMillis,
  });

  factory WaitlistOfferActionRow.fromMap(Map<Object?, Object?> map) {
    final uid = map['uid'];
    final status = map['status'];
    final reason = map['reason'];
    final expiresAtMillis = map['expiresAtMillis'];
    if (uid is String && status is String) {
      return WaitlistOfferActionRow(
        uid: uid,
        status: status,
        reason: reason is String ? reason : null,
        expiresAtMillis: expiresAtMillis is num
            ? expiresAtMillis.toInt()
            : null,
      );
    }
    throw StateError('createEventWaitlistOffers response had an invalid row.');
  }

  final String uid;
  final String status;
  final String? reason;
  final int? expiresAtMillis;
}

List<WaitlistOfferActionRow> _parseOfferRows(Object? value) {
  if (value == null) return const [];
  if (value case final List<Object?> rows) {
    return [
      for (final row in rows)
        if (row case final Map<Object?, Object?> map)
          WaitlistOfferActionRow.fromMap(map)
        else
          throw StateError(
            'createEventWaitlistOffers response had an invalid row.',
          ),
    ];
  }
  throw StateError('createEventWaitlistOffers response had invalid offers.');
}

final class WaitlistOfferAcceptanceCallableResponse {
  const WaitlistOfferAcceptanceCallableResponse({
    required this.accepted,
    required this.requiresPayment,
    required this.booked,
  });

  factory WaitlistOfferAcceptanceCallableResponse.fromCallableData(
    Object? data,
  ) {
    if (data case final Map<Object?, Object?> map) {
      final accepted = map['accepted'];
      final requiresPayment = map['requiresPayment'];
      final booked = map['booked'];
      if (accepted is bool && requiresPayment is bool && booked is bool) {
        return WaitlistOfferAcceptanceCallableResponse(
          accepted: accepted,
          requiresPayment: requiresPayment,
          booked: booked,
        );
      }
    }
    throw StateError(
      'acceptEventWaitlistOffer response was missing offer state.',
    );
  }

  final bool accepted;
  final bool requiresPayment;
  final bool booked;
}
