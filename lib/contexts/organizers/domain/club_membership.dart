// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_domain_classes.mjs
// Then run: dart run build_runner build
//
// Data shape emitted from contracts/firestore/club_memberships.schema.json.
// Derived behavior, if any, lives in a hand-written companion extension file.
import 'package:catch_dating_app/core/firestore_converters.dart';
import 'package:freezed_annotation/freezed_annotation.dart';

// Hand-written derived behavior for this data shape lives in the
// companion file below; it is re-exported so consumers of this file
// keep seeing those getters/helpers/types unchanged.
export 'club_membership_extensions.dart';

part 'club_membership.freezed.dart';
part 'club_membership.g.dart';

enum ClubMembershipRole { owner, host, member }

enum ClubMembershipStatus { active, left, deleted }

@freezed
abstract class ClubMembership with _$ClubMembership {
  const factory ClubMembership({
    @JsonKey(includeToJson: false) required String id,
    required String clubId,
    required String uid,
    required ClubMembershipRole role,
    required ClubMembershipStatus status,
    @Default(false) bool pushNotificationsEnabled,
    @TimestampConverter() required DateTime joinedAt,
    @NullableTimestampConverter() DateTime? leftAt,
    @NullableTimestampConverter() DateTime? deletedAt,
  }) = _ClubMembership;

  factory ClubMembership.fromJson(Map<String, dynamic> json) =>
      _$ClubMembershipFromJson(json);
}
