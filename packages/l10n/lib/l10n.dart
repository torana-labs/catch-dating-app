import 'package:catch_l10n/generated/app_localizations.dart';
import 'package:catch_l10n/generated/app_localizations_en.dart';
import 'package:flutter/widgets.dart';

export 'package:catch_l10n/generated/app_localizations.dart';

final AppLocalizations _englishFallback = AppLocalizationsEn();

extension LocalizationsBuildContext on BuildContext {
  /// Returns the generated Catch message catalogue for this subtree.
  ///
  /// Isolated widget tests and Widgetbook stories sometimes render below a
  /// bare [WidgetsApp] or [MaterialApp]. They receive the canonical English
  /// catalogue instead of forcing every leaf preview to duplicate app-root
  /// delegate wiring. Production roots still register the generated delegate.
  AppLocalizations get l10n =>
      Localizations.of<AppLocalizations>(this, AppLocalizations) ??
      _englishFallback;
}
