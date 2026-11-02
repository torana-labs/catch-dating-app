import '../fixture_localizations.dart';

String renderFixture(FixtureLocalizations l10n) {
  // A comment mentioning l10n.knownOrphan is not a production use.
  /* Nested comments are ignored too: /* knownOrphan */ stringOnly. */
  const ignoredText = 'stringOnly';
  const ignoredRawText = r'generatedOnly';
  final direct = l10n.usedKey;
  final interpolated = 'prefix ${l10n.usedInInterpolation}';
  return '$direct $interpolated $ignoredText $ignoredRawText';
}
