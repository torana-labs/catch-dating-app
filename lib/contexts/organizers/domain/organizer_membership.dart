// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_domain_classes.mjs
// Then run: dart run build_runner build
//
// Data shape emitted from contracts/firestore/club_memberships.schema.json.
// Derived behavior, if any, lives in a hand-written companion extension file.
import 'package:catch_dating_app/platform/firebase/firestore_converters.dart';
import 'package:freezed_annotation/freezed_annotation.dart';

// Hand-written derived behavior for this data shape lives in the
// companion file below; it is re-exported so consumers of this file
// keep seeing those getters/helpers/types unchanged.
export 'organizer_membership_extensions.dart';

part 'organizer_membership.freezed.dart';
part 'organizer_membership.g.dart';

enum OrganizerMembershipRole { owner, host, member }

enum OrganizerMembershipStatus { active, left, deleted }

@freezed
abstract class OrganizerMembership with _$OrganizerMembership {
  const factory OrganizerMembership({
    @JsonKey(includeToJson: false) required String id,
    required String clubId,
    required String uid,
    required OrganizerMembershipRole role,
    required OrganizerMembershipStatus status,
    @Default(false) bool pushNotificationsEnabled,
    @TimestampConverter() required DateTime joinedAt,
    @NullableTimestampConverter() DateTime? leftAt,
    @NullableTimestampConverter() DateTime? deletedAt,
  }) = _OrganizerMembership;

  factory OrganizerMembership.fromJson(Map<String, dynamic> json) =>
      _$OrganizerMembershipFromJson(json);
}
