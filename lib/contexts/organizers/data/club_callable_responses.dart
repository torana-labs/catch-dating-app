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

final class CreateClubPostCallableResponse {
  const CreateClubPostCallableResponse({
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
  });

  factory CreateClubPostCallableResponse.fromCallableData(Object? data) {
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
        return CreateClubPostCallableResponse(
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
        );
      }
    }

    throw StateError(
      'createClubPost response was missing postId or remainingWeeklyQuota.',
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
}

final class StartClubHostConversationCallableResponse {
  const StartClubHostConversationCallableResponse({required this.matchId});

  factory StartClubHostConversationCallableResponse.fromCallableData(
    Object? data,
  ) {
    if (data case final Map<Object?, Object?> map) {
      final matchId = map['matchId'] as String?;
      if (matchId != null && matchId.isNotEmpty) {
        return StartClubHostConversationCallableResponse(matchId: matchId);
      }
    }

    throw StateError('startClubHostConversation response was missing matchId.');
  }

  final String matchId;
}
