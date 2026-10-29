import 'package:catch_dating_app/contexts/events/events.dart';
import 'package:catch_dating_app/contexts/live/domain/event_assistance_joining_option.dart';
import 'package:catch_dating_app/contexts/live/domain/event_assistance_observation.dart';
import 'package:catch_dating_app/contexts/live/domain/event_assistance_parsing.dart';

/// The current, bounded joining choices bound to a settings review source.
final class LateJoinSettingSetup {
  const LateJoinSettingSetup._(this.eventEnd, this.destinations);
  final int eventEnd;
  final List<
    ({
      String alternativeId,
      AssistanceJoiningTarget target,
      String label,
      EventMeetingLocation? location,
    })
  >
  destinations;

  /// Presentation needs verified names and targets, not invented map coordinates.
  factory LateJoinSettingSetup.fromOptions({
    required int eventEnd,
    required String groupId,
    required List<
      ({String alternativeId, AssistanceJoiningTarget target, String label})
    >
    destinations,
  }) {
    assistanceInteger(eventEnd);
    if (destinations.length > 41 ||
        destinations.map((d) => d.alternativeId).toSet().length !=
            destinations.length ||
        destinations.map((d) => d.target).toSet().length !=
            destinations.length ||
        destinations.any(
          (d) =>
              d.target is AssistanceGroupCheckpoint &&
              (d.target as AssistanceGroupCheckpoint).groupId != groupId,
        )) {
      throw const FormatException('Invalid joining options.');
    }
    return LateJoinSettingSetup._(
      eventEnd,
      List.unmodifiable(
        destinations.map(
          (d) => (
            alternativeId: assistanceAlternativeId(d.alternativeId),
            target: AssistanceJoiningTarget.fromJson(d.target.toJson()),
            label: assistanceText(d.label, 240),
            location: null,
          ),
        ),
      ),
    );
  }

  factory LateJoinSettingSetup.fromJson(
    Object? value, {
    required String groupId,
  }) {
    final map = assistanceObject(value, {'eventEnd', 'destinations'});
    final raw = map['destinations'];
    if (raw is! List || raw.length > 41) {
      throw const FormatException('Invalid joining options.');
    }
    final options = raw
        .map(
          (item) =>
              parseAssistanceJoiningOption(item, expectedGroupId: groupId),
        )
        .toList(growable: false);
    if (options.map((item) => item.target).toSet().length != options.length) {
      throw const FormatException('Duplicate joining option.');
    }
    return LateJoinSettingSetup._(
      assistanceInteger(map['eventEnd']),
      List.unmodifiable(
        options.map(
          (d) => (
            alternativeId: d.alternativeId,
            target: d.target,
            label: d.label,
            location: d.location,
          ),
        ),
      ),
    );
  }
}
