import 'package:catch_dating_app/platform/theme/activity_palette.dart';
import 'package:catch_tokens/catch_tokens.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/material.dart';

/// Adds the app's activity-domain palette to the shared Catch theme.
abstract final class AppTheme {
  static final light = CatchTheme.light.copyWith(
    extensions: <ThemeExtension<dynamic>>[
      CatchTokens.light,
      ActivityPalette.light,
    ],
  );
  static final dark = CatchTheme.dark.copyWith(
    extensions: <ThemeExtension<dynamic>>[
      CatchTokens.dark,
      ActivityPalette.dark,
    ],
  );
}
