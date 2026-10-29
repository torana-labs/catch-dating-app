import 'package:catch_dating_app/core/firestore_converters.dart';
import 'package:freezed_annotation/freezed_annotation.dart';

part 'event_private_access.freezed.dart';
part 'event_private_access.g.dart';

@freezed
abstract class EventPrivateAccess with _$EventPrivateAccess {
  const factory EventPrivateAccess({
    @JsonKey(includeToJson: false) required String id,
    required String eventId,
    required String clubId,
    required String inviteCode,
    @TimestampConverter() required DateTime createdAt,
  }) = _EventPrivateAccess;

  factory EventPrivateAccess.fromJson(Map<String, dynamic> json) =>
      _$EventPrivateAccessFromJson(json);
}
