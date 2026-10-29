/// Formats a pace value in seconds-per-km to a "m:ss" display string.
/// Accepts [num] so both [int] and [double] callers work without casts.
String formatPace(num secsPerKm) {
  final totalSeconds = secsPerKm.round();
  final minutes = totalSeconds ~/ 60;
  final seconds = totalSeconds % 60;
  return '$minutes:${seconds.toString().padLeft(2, '0')}';
}

/// Formats a pace range string like "4:30-5:30/km".
String formatPaceRange(int paceMinSecsPerKm, int paceMaxSecsPerKm) {
  return '${formatPace(paceMinSecsPerKm)}-${formatPace(paceMaxSecsPerKm)}/km';
}
