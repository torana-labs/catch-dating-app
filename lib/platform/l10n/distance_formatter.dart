import 'package:catch_dating_app/l10n/l10n.dart';

abstract final class DistanceFormatter {
  static String? away(AppLocalizations l10n, double? distanceKm) {
    if (distanceKm == null) return null;
    if (distanceKm < 1) {
      return l10n.coreCatchDistanceFormatterMetersAway(
        meters: (distanceKm * 1000).round(),
      );
    }
    final rounded = distanceKm >= 10
        ? distanceKm.round().toString()
        : distanceKm.toStringAsFixed(1);
    return l10n.coreCatchDistanceFormatterKilometersAway(distance: rounded);
  }
}
