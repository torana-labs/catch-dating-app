import 'package:catch_dating_app/core/firestore_converters.dart';
import 'package:catch_dating_app/core/labelled.dart';
import 'package:freezed_annotation/freezed_annotation.dart';

part 'launch_access_application.freezed.dart';
part 'launch_access_application.g.dart';

enum LaunchAccessApplicationStatus implements Labelled {
  pending('Pending review'),
  waitlisted('Waitlisted'),
  invited('Invited'),
  approvedForProfile('Approved'),
  activeMember('Active member'),
  paused('Paused'),
  notSelectedYet('Not selected yet');

  const LaunchAccessApplicationStatus(this.label);

  @override
  final String label;

  bool get canEditApplication => switch (this) {
    LaunchAccessApplicationStatus.pending ||
    LaunchAccessApplicationStatus.waitlisted ||
    LaunchAccessApplicationStatus.notSelectedYet => true,
    _ => false,
  };

  bool get unlocksProfileCreation => switch (this) {
    LaunchAccessApplicationStatus.approvedForProfile ||
    LaunchAccessApplicationStatus.activeMember => true,
    _ => false,
  };
}

enum LaunchAccessRole implements Labelled {
  member('Member'),
  host('Host'),
  both('Both');

  const LaunchAccessRole(this.label);

  @override
  final String label;
}

enum LaunchAccessEventType implements Labelled {
  runClub('Run club'),
  walkingSocial('Walk'),
  coffee('Coffee'),
  boardGames('Board games'),
  fitnessClass('Fitness'),
  food('Food'),
  culture('Culture');

  const LaunchAccessEventType(this.label);

  @override
  final String label;
}

enum LaunchAccessAvailabilityWindow implements Labelled {
  weekdayMornings('Weekday mornings'),
  weekdayEvenings('Weekday evenings'),
  saturdayMornings('Saturday mornings'),
  saturdayEvenings('Saturday evenings'),
  sundayMornings('Sunday mornings'),
  sundayEvenings('Sunday evenings');

  const LaunchAccessAvailabilityWindow(this.label);

  @override
  final String label;
}

@freezed
abstract class LaunchAccessApplication with _$LaunchAccessApplication {
  const LaunchAccessApplication._();

  const factory LaunchAccessApplication({
    @JsonKey(includeToJson: false) @Default('') String uid,
    @Default(1) int applicationVersion,
    @JsonKey(unknownEnumValue: LaunchAccessApplicationStatus.pending)
    @Default(LaunchAccessApplicationStatus.pending)
    LaunchAccessApplicationStatus status,
    required String city,
    @JsonKey(unknownEnumValue: LaunchAccessRole.member)
    @Default(LaunchAccessRole.member)
    LaunchAccessRole role,
    @Default([]) List<LaunchAccessEventType> eventTypes,
    @Default([]) List<LaunchAccessAvailabilityWindow> availabilityWindows,
    @Default(false) bool wantsToHost,
    String? inviteCode,
    String? instagramHandle,
    String? referralSource,
    String? whyCatch,
    String? cohortId,
    String? hostUserId,
    String? reviewerUid,
    String? reviewNote,
    @Default(1) int submissionCount,
    @NullableTimestampConverter() DateTime? createdAt,
    @NullableTimestampConverter() DateTime? submittedAt,
    @NullableTimestampConverter() DateTime? updatedAt,
    @NullableTimestampConverter() DateTime? reviewedAt,
  }) = _LaunchAccessApplication;

  factory LaunchAccessApplication.fromJson(Map<String, dynamic> json) =>
      _$LaunchAccessApplicationFromJson(json);
}

@freezed
abstract class LaunchAccessApplicationDraft
    with _$LaunchAccessApplicationDraft {
  const LaunchAccessApplicationDraft._();

  const factory LaunchAccessApplicationDraft({
    @Default('') String city,
    @Default(LaunchAccessRole.member) LaunchAccessRole role,
    @Default({}) Set<LaunchAccessEventType> eventTypes,
    @Default({}) Set<LaunchAccessAvailabilityWindow> availabilityWindows,
    @Default(false) bool wantsToHost,
    @Default('') String inviteCode,
    @Default('') String instagramHandle,
    @Default('') String referralSource,
    @Default('') String whyCatch,
  }) = _LaunchAccessApplicationDraft;

  bool get canSubmit =>
      city.trim().isNotEmpty &&
      eventTypes.isNotEmpty &&
      availabilityWindows.isNotEmpty &&
      whyCatch.trim().length >= 12;

  LaunchAccessApplicationDraft normalized() {
    return copyWith(
      city: city.trim(),
      inviteCode: inviteCode.trim(),
      instagramHandle: instagramHandle.trim(),
      referralSource: referralSource.trim(),
      whyCatch: whyCatch.trim(),
    );
  }

  LaunchAccessApplication toApplication({required String uid}) {
    final draft = normalized();
    return LaunchAccessApplication(
      uid: uid,
      city: draft.city,
      role: draft.role,
      eventTypes: draft.eventTypes.toList(growable: false),
      availabilityWindows: draft.availabilityWindows.toList(growable: false),
      wantsToHost: draft.wantsToHost,
      inviteCode: _emptyToNull(draft.inviteCode),
      instagramHandle: _emptyToNull(draft.instagramHandle),
      referralSource: _emptyToNull(draft.referralSource),
      whyCatch: draft.whyCatch,
    );
  }
}

String? _emptyToNull(String value) {
  final trimmed = value.trim();
  return trimmed.isEmpty ? null : trimmed;
}
