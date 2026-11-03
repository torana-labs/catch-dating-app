import 'package:catch_l10n/l10n.dart';

abstract final class CountCopy {
  static String events(AppLocalizations l10n, int count) =>
      l10n.coreCatchCountCopyEvents(count: count);
}
