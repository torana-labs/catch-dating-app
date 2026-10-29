import 'package:catch_dating_app/activity/domain/activity_taxonomy.dart';

/// Guest-facing notes share the format snapshot without replacing operational
/// settings. Null means unchanged; an empty string explicitly clears a note.
extension EventPublicDetails on EventFormatSnapshot {
  String? get accessibilityNotes => _publicNote('accessibility');
  String? get includedNotes => _publicNote('included');

  String? _publicNote(String key) {
    final notes = activityDetails['publicDetails'];
    final value = notes is Map ? notes[key] : null;
    if (value is! String || value.trim().isEmpty) return null;
    return value.trim();
  }

  EventFormatSnapshot withPublicDetails({
    String? accessibility,
    String? included,
  }) {
    final details = Map<String, Object?>.of(activityDetails);
    final current = details['publicDetails'];
    final notes = current is Map
        ? Map<String, Object?>.from(current)
        : <String, Object?>{};
    for (final entry in {
      'accessibility': accessibility,
      'included': included,
    }.entries) {
      if (entry.value == null) continue;
      final value = entry.value!.trim();
      if (value.isEmpty) {
        notes.remove(entry.key);
      } else {
        notes[entry.key] = value;
      }
    }
    if (notes.isEmpty) {
      details.remove('publicDetails');
    } else {
      details['publicDetails'] = notes;
    }
    return EventFormatSnapshot.fromJson({
      ...toJson(),
      'activityDetails': details,
    });
  }
}
