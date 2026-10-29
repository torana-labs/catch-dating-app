import 'package:pub_semver/pub_semver.dart';

/// Returns true if [current] is strictly less than [minimum], meaning an
/// update is required.
///
/// Non-parseable strings are treated as "0.0.0" so a missing/malformed
/// remote config value never blocks the user.
bool isUpdateRequired({required String current, required String minimum}) {
  final cur = _tryParse(current);
  final min = _tryParse(minimum);
  return cur < min;
}

/// Returns true when the current platform build number is below the configured
/// minimum build. A minimum of zero disables build-number gating.
bool isBuildUpdateRequired({
  required String currentBuild,
  required int minimumBuild,
}) {
  if (minimumBuild <= 0) return false;

  final current = int.tryParse(currentBuild.trim());
  if (current == null) return true;

  return current < minimumBuild;
}

Version _tryParse(String version) {
  try {
    return Version.parse(version);
  } on FormatException {
    return Version.none;
  }
}
