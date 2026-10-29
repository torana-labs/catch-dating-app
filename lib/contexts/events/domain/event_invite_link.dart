import 'package:catch_dating_app/core/firestore_converters.dart';
import 'package:freezed_annotation/freezed_annotation.dart';

part 'event_invite_link.freezed.dart';
part 'event_invite_link.g.dart';

@freezed
abstract class EventInviteLink with _$EventInviteLink {
  const EventInviteLink._();

  const factory EventInviteLink({
    @JsonKey(includeToJson: false) required String id,
    required String eventId,
    required String clubId,
    required String hostUid,
    required String label,
    String? source,
    @Default(0) int openCount,
    @Default(0) int requestCount,
    @Default(0) int confirmedCount,
    @Default(0) int paidCount,
    @Default(0) int checkedInCount,
    @Default(0) int catcherCount,
    @Default(0) int matchCount,
    @Default(0) int chatStartedCount,
    @NullableTimestampConverter() DateTime? disabledAt,
    @TimestampConverter() required DateTime createdAt,
    @TimestampConverter() required DateTime updatedAt,
  }) = _EventInviteLink;

  factory EventInviteLink.fromJson(Map<String, dynamic> json) =>
      _$EventInviteLinkFromJson(json);

  bool get isDisabled => disabledAt != null;
}
