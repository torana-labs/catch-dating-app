import 'package:catch_dating_app/contexts/events/events.dart';
import 'package:catch_dating_app/contexts/formats/formats.dart';
import 'package:catch_dating_app/kernel/activity_taxonomy.dart';
import 'package:freezed_annotation/freezed_annotation.dart';

part 'organizer_host_defaults.freezed.dart';
part 'organizer_host_defaults.g.dart';

@freezed
abstract class OrganizerHostDefaults with _$OrganizerHostDefaults {
  const OrganizerHostDefaults._();

  const factory OrganizerHostDefaults({
    @Default(ActivityKind.socialRun) ActivityKind primaryActivityKind,
    @Default(<ActivityKind>[]) List<ActivityKind> supportedActivityKinds,
    @Default(EventPolicyDefaults()) EventPolicyDefaults eventPolicy,
    @Default(EventSuccessDefaults()) EventSuccessDefaults eventSuccess,
    @Default(<String, EventSuccessDefaults>{})
    Map<String, EventSuccessDefaults> eventSuccessByActivityKind,

    /// Suggested IANA timezone for future events; never rewrites saved events.
    /// Read only until the versioned updateOrganizer contract accepts it.
    @JsonKey(includeToJson: false) String? timezone,

    /// Server-managed revision used when an event inherits defaults.
    @JsonKey(includeToJson: false) int? revision,
  }) = _OrganizerHostDefaults;

  factory OrganizerHostDefaults.fromJson(Map<String, dynamic> json) =>
      _$OrganizerHostDefaultsFromJson(json);

  List<ActivityKind> get effectiveSupportedActivityKinds {
    final values = <ActivityKind>{
      primaryActivityKind,
      ...supportedActivityKinds,
    };
    return values.toList(growable: false);
  }

  EventSuccessDefaults eventSuccessForActivity(
    ActivityKind activityKind, {
    int? targetAttendeeCount,
  }) => eventSuccessForFormat(
    EventFormatSnapshot.fromActivityKind(activityKind),
    targetAttendeeCount: targetAttendeeCount,
  );

  EventSuccessDefaults eventSuccessForFormat(
    EventFormatSnapshot format, {
    int? targetAttendeeCount,
  }) {
    final configured =
        eventSuccessByActivityKind[format.activityKind.name] ?? eventSuccess;
    return configured.normalizedForFormat(
      format,
      targetAttendeeCount: targetAttendeeCount,
    );
  }

  OrganizerHostDefaults copyWithEventSuccessForActivity({
    required ActivityKind activityKind,
    required EventSuccessDefaults defaults,
  }) {
    final normalized = defaults.normalizedForActivity(activityKind);
    final nextByActivity = {
      ...eventSuccessByActivityKind,
      activityKind.name: normalized,
    };
    return copyWith(
      primaryActivityKind: activityKind,
      supportedActivityKinds:
          effectiveSupportedActivityKinds.contains(activityKind)
          ? supportedActivityKinds
          : [...supportedActivityKinds, activityKind],
      eventSuccess:
          activityKind == primaryActivityKind ||
              eventSuccess == const EventSuccessDefaults()
          ? normalized
          : eventSuccess,
      eventSuccessByActivityKind: nextByActivity,
    );
  }
}
