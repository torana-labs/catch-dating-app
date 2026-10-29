import 'package:catch_dating_app/l10n/generated/app_localizations_en.dart';
import 'package:catch_dating_app/platform/l10n/count_copy.dart';
import 'package:catch_dating_app/platform/l10n/distance_formatter.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  final l10n = AppLocalizationsEn();

  test('CountCopy localizes event counts', () {
    expect(CountCopy.events(l10n, 0), 'No events');
    expect(CountCopy.events(l10n, 1), '1 event');
    expect(CountCopy.events(l10n, 12), '12 events');
  });

  test('DistanceFormatter uses bounded metric precision', () {
    expect(DistanceFormatter.away(l10n, null), isNull);
    expect(DistanceFormatter.away(l10n, 0.42), '420 m away');
    expect(DistanceFormatter.away(l10n, 1.25), '1.3 km away');
    expect(DistanceFormatter.away(l10n, 12.6), '13 km away');
  });
}
