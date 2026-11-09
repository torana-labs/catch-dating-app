final class CreateOrganizerCallableResponse {
  const CreateOrganizerCallableResponse({required this.organizerId});

  factory CreateOrganizerCallableResponse.fromCallableData(Object? data) {
    if (data case final Map<Object?, Object?> map) {
      final organizerId = map['organizerId'] as String?;
      if (organizerId != null && organizerId.isNotEmpty) {
        return CreateOrganizerCallableResponse(organizerId: organizerId);
      }
    }
    throw StateError('createOrganizer response was missing organizerId.');
  }

  final String organizerId;
}

/// Counts for a follower update's WhatsApp leg (route
/// organizerFollowerWhatsapp). Queued followers ticked WhatsApp updates on
/// their verified phone; skipped followers did not.
final class OrganizerPostWhatsappCounts {
  const OrganizerPostWhatsappCounts({
    required this.status,
    required this.queuedCount,
    required this.skippedCount,
    required this.sentCount,
    required this.deliveredCount,
    required this.failedCount,
  });

  /// Reads the optional `whatsapp` counts; null when absent or malformed.
  static OrganizerPostWhatsappCounts? fromCallableData(Object? data) {
    if (data case final Map<Object?, Object?> map) {
      final status = map['status'];
      final counts = [
        'queuedCount',
        'skippedCount',
        'sentCount',
        'deliveredCount',
        'failedCount',
      ].map((key) => map[key]).toList(growable: false);
      if (status is String && counts.every((count) => count is int)) {
        return OrganizerPostWhatsappCounts(
          status: status,
          queuedCount: counts[0]! as int,
          skippedCount: counts[1]! as int,
          sentCount: counts[2]! as int,
          deliveredCount: counts[3]! as int,
          failedCount: counts[4]! as int,
        );
      }
    }
    return null;
  }

  final String status;
  final int queuedCount;
  final int skippedCount;
  final int sentCount;
  final int deliveredCount;
  final int failedCount;
}

final class CreateOrganizerPostCallableResponse {
  const CreateOrganizerPostCallableResponse({
    required this.postId,
    required this.remainingWeeklyQuota,
    required this.deliveryStatus,
    required this.recipientCount,
    required this.excludedCount,
    required this.activityAvailableCount,
    required this.pushAttemptedCount,
    required this.pushAcceptedCount,
    required this.pushFailedCount,
    required this.pushUnknownCount,
    required this.idempotentReplay,
    this.whatsapp,
  });

  factory CreateOrganizerPostCallableResponse.fromCallableData(Object? data) {
    if (data case final Map<Object?, Object?> map) {
      final postId = map['postId'] as String?;
      final remainingWeeklyQuota = map['remainingWeeklyQuota'] as int?;
      final deliveryStatus = map['deliveryStatus'] as String?;
      final recipientCount = map['recipientCount'] as int?;
      final excludedCount = map['excludedCount'] as int?;
      final activityAvailableCount = map['activityAvailableCount'] as int?;
      final pushAttemptedCount = map['pushAttemptedCount'] as int?;
      final pushAcceptedCount = map['pushAcceptedCount'] as int?;
      final pushFailedCount = map['pushFailedCount'] as int?;
      final pushUnknownCount = map['pushUnknownCount'] as int?;
      final idempotentReplay = map['idempotentReplay'] as bool?;
      if (postId != null &&
          postId.isNotEmpty &&
          remainingWeeklyQuota != null &&
          deliveryStatus != null &&
          recipientCount != null &&
          excludedCount != null &&
          activityAvailableCount != null &&
          pushAttemptedCount != null &&
          pushAcceptedCount != null &&
          pushFailedCount != null &&
          pushUnknownCount != null &&
          idempotentReplay != null) {
        return CreateOrganizerPostCallableResponse(
          postId: postId,
          remainingWeeklyQuota: remainingWeeklyQuota,
          deliveryStatus: deliveryStatus,
          recipientCount: recipientCount,
          excludedCount: excludedCount,
          activityAvailableCount: activityAvailableCount,
          pushAttemptedCount: pushAttemptedCount,
          pushAcceptedCount: pushAcceptedCount,
          pushFailedCount: pushFailedCount,
          pushUnknownCount: pushUnknownCount,
          idempotentReplay: idempotentReplay,
          whatsapp: OrganizerPostWhatsappCounts.fromCallableData(
            map['whatsapp'],
          ),
        );
      }
    }

    throw StateError(
      'createOrganizerPost response was missing postId or remainingWeeklyQuota.',
    );
  }

  final String postId;
  final int remainingWeeklyQuota;
  final String deliveryStatus;
  final int recipientCount;
  final int excludedCount;
  final int activityAvailableCount;
  final int pushAttemptedCount;
  final int pushAcceptedCount;
  final int pushFailedCount;
  final int pushUnknownCount;
  final bool idempotentReplay;

  /// The WhatsApp leg so far; null when the update went to the app only.
  final OrganizerPostWhatsappCounts? whatsapp;
}

final class StartOrganizerHostConversationCallableResponse {
  const StartOrganizerHostConversationCallableResponse({required this.matchId});

  factory StartOrganizerHostConversationCallableResponse.fromCallableData(
    Object? data,
  ) {
    if (data case final Map<Object?, Object?> map) {
      final matchId = map['matchId'] as String?;
      if (matchId != null && matchId.isNotEmpty) {
        return StartOrganizerHostConversationCallableResponse(matchId: matchId);
      }
    }

    throw StateError(
      'startOrganizerHostConversation response was missing matchId.',
    );
  }

  final String matchId;
}
