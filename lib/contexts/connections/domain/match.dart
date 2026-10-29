import 'package:catch_dating_app/core/firestore_converters.dart';
import 'package:freezed_annotation/freezed_annotation.dart';

part 'match.freezed.dart';
part 'match.g.dart';

enum MatchStatus { active, blocked, closed }

enum MatchConversationType { match, clubHostInquiry, crossPathsEventPlan }

@freezed
abstract class Match with _$Match {
  const Match._();

  const factory Match({
    @JsonKey(includeToJson: false) required String id,
    required String user1Id,
    required String user2Id,
    @JsonKey(readValue: _readEventIds)
    @Default(<String>[])
    List<String> eventIds,
    @TimestampConverter() required DateTime createdAt,
    @NullableTimestampConverter() DateTime? lastMessageAt,
    String? lastMessagePreview,
    String? lastMessageSenderId,
    @Default({}) Map<String, int> unreadCounts,
    @Default(MatchStatus.active) MatchStatus status,
    String? blockedBy,
    @NullableTimestampConverter() DateTime? blockedAt,
    @JsonKey(unknownEnumValue: MatchConversationType.match)
    @Default(MatchConversationType.match)
    MatchConversationType conversationType,
    String? clubId,
    String? organizerId,
    String? crossPathsInvitationId,
    @NullableTimestampConverter() DateTime? eventPlanExpiresAt,
    @NullableTimestampConverter() DateTime? closedAt,
  }) = _Match;

  factory Match.fromJson(Map<String, dynamic> json) => _$MatchFromJson(json);

  /// Returns the UID of the other participant in this match.
  String otherId(String myUid) => user1Id == myUid ? user2Id : user1Id;

  /// Latest shared event context for legacy call sites and notification copy.
  String? get latestEventId => eventIds.isEmpty ? null : eventIds.last;

  bool get isBlocked => status == MatchStatus.blocked;
  bool get isClosed => status == MatchStatus.closed;

  bool get isClubHostInquiry =>
      conversationType == MatchConversationType.clubHostInquiry;

  bool get isCrossPathsEventPlan =>
      conversationType == MatchConversationType.crossPathsEventPlan;

  bool get isScopedConversation => isClubHostInquiry || isCrossPathsEventPlan;

  bool hasUnreadIncomingFor(String uid) =>
      !isBlocked &&
      lastMessagePreview != null &&
      lastMessageSenderId != null &&
      lastMessageSenderId != uid &&
      (unreadCounts[uid] ?? 0) > 0;

  int unreadConversationCountFor(String uid) =>
      hasUnreadIncomingFor(uid) ? 1 : 0;
}

Object? _readEventIds(Map json, String key) {
  final eventIds = json[key];
  if (eventIds is List) return eventIds;

  final legacyEventId = json['eventId'];
  if (legacyEventId is String && legacyEventId.isNotEmpty) {
    return [legacyEventId];
  }

  return null;
}
