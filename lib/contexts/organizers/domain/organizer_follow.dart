// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_domain_classes.mjs
// Then run: dart run build_runner build
//
// Data shape emitted from contracts/firestore/organizer_follows.schema.json.
// Derived behavior, if any, lives in a hand-written companion extension file.
import 'package:catch_platform/firebase/firestore_converters.dart';
import 'package:freezed_annotation/freezed_annotation.dart';

// Hand-written derived behavior for this data shape lives in the
// companion file below; it is re-exported so consumers of this file
// keep seeing those getters/helpers/types unchanged.
export 'organizer_follow_extensions.dart';

part 'organizer_follow.freezed.dart';
part 'organizer_follow.g.dart';

enum OrganizerFollowStatus { active, inactive }

@freezed
abstract class OrganizerFollow with _$OrganizerFollow {
  const factory OrganizerFollow({
    @JsonKey(includeToJson: false) required String id,
    required String organizerId,
    required String uid,
    required OrganizerFollowStatus status,
    @Default(false) bool pushNotificationsEnabled,
    @TimestampConverter() required DateTime followedAt,
    @NullableTimestampConverter() DateTime? unfollowedAt,
  }) = _OrganizerFollow;

  factory OrganizerFollow.fromJson(Map<String, dynamic> json) =>
      _$OrganizerFollowFromJson(json);
}
