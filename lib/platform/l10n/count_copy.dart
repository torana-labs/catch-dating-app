import 'package:catch_dating_app/l10n/l10n.dart';

abstract final class CountCopy {
  static String events(AppLocalizations l10n, int count) =>
      l10n.coreCatchCountCopyEvents(count: count);
}
