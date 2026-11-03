import 'package:catch_tokens/catch_tokens.dart';
import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';

/// Central font registry — the single swap point for the two-family type system
/// (blueprint D22).
///
/// Voice/head: Archivo, for the display roles. Function/body: the platform
/// system font, for every other role. IBM Plex Mono retires from UI labels.
///
/// The old serif/custom-sans direction is intentionally retired. Keep
/// production text styles routed through this file so screens inherit the
/// current design language without restating family names.
abstract final class CatchFonts {
  // -- Families (tunable — change here to re-skin the entire app) -------------

  static const String voiceFamily = GeneratedCatchFontFamilyTokens.voice;
  static const String headFamily = GeneratedCatchFontFamilyTokens.head;
  static const String functionDesignTokenFamily =
      GeneratedCatchFontFamilyTokens.function;

  /// The retired data family. It stays bundled for image exports, and the Catch
  /// UI lint still rejects it as a raw family.
  static const String monoFamily = 'IBM Plex Mono';

  /// Flutter's concrete platform font families for the function/body role.
  ///
  /// The DTCG token remains `system-ui` because it is platform-neutral design
  /// language. Runtime Flutter styles need concrete family names so native
  /// builds, Widgetbook, lints, and the design context pack are auditable.
  static const Set<String> platformFunctionFamilies = <String>{
    'Roboto',
    'CupertinoSystemText',
    'CupertinoSystemDisplay',
    '.AppleSystemUIFont',
    'Segoe UI',
  };

  static String get functionFamily =>
      functionFamilyForPlatform(defaultTargetPlatform);

  @visibleForTesting
  static String functionFamilyForPlatform(
    TargetPlatform platform, {
    double? fontSize,
  }) {
    return switch (platform) {
      TargetPlatform.iOS =>
        (fontSize != null && fontSize >= 20)
            ? 'CupertinoSystemDisplay'
            : 'CupertinoSystemText',
      TargetPlatform.macOS => '.AppleSystemUIFont',
      TargetPlatform.windows => 'Segoe UI',
      TargetPlatform.android ||
      TargetPlatform.fuchsia ||
      TargetPlatform.linux => 'Roboto',
    };
  }

  /// The single ratified Archivo width. The bundled variable font exposes a
  /// `wdth` axis of 62–125, but the Catch type system renders Archivo at
  /// exactly ONE width — the DS "78% system" (`colors_and_type.css`, every
  /// voice/headline/prose style at `font-stretch: 78%`). There is deliberately
  /// no per-style width knob: one width is what keeps the poster voice from
  /// drifting back to the old mixed 90–100% state. Re-skin here, never at a
  /// call site.
  static const double archivoWidth = 78;

  // -- General-purpose builders -----------------------------------------------

  /// Archivo (voice). Weight is driven via [FontVariation]; width is locked to
  /// [archivoWidth]. Archivo ships as roman in this pack, so italic requests
  /// are intentionally ignored to keep the app on the locked spec.
  static TextStyle voice({
    required double fontSize,
    required double height,
    Color? color,
    FontWeight fontWeight = FontWeight.w600,
    double letterSpacing = 0,
  }) {
    return TextStyle(
      fontFamily: voiceFamily,
      package: 'catch_ui',
      fontSize: fontSize,
      fontWeight: fontWeight,
      fontStyle: FontStyle.normal,
      height: height,
      letterSpacing: letterSpacing,
      decoration: TextDecoration.none,
      color: color,
      fontVariations: <FontVariation>[
        FontVariation('wght', fontWeight.value.toDouble()),
        const FontVariation('wdth', archivoWidth),
      ],
    );
  }

  /// Archivo head treatment for event titles, console titles, hints, and
  /// person/host names. Same single [archivoWidth] as [voice]; the head role
  /// differs only in default weight.
  static TextStyle head({
    required double fontSize,
    required double height,
    Color? color,
    FontWeight fontWeight = FontWeight.w700,
    double letterSpacing = 0,
  }) => voice(
    fontSize: fontSize,
    height: height,
    color: color,
    fontWeight: fontWeight,
    letterSpacing: letterSpacing,
  );

  /// Platform system font (function). Resolves to Flutter's concrete platform
  /// family names: SF via CupertinoSystem* on iOS, Roboto on Android/Fuchsia/
  /// Linux, .AppleSystemUIFont on macOS, and Segoe UI on Windows.
  static TextStyle sans({
    required double fontSize,
    required double height,
    Color? color,
    FontWeight fontWeight = FontWeight.w400,
    FontStyle fontStyle = FontStyle.normal,
    double letterSpacing = 0,
  }) {
    return TextStyle(
      fontFamily: functionFamilyForPlatform(
        defaultTargetPlatform,
        fontSize: fontSize,
      ),
      fontSize: fontSize,
      fontWeight: fontWeight,
      fontStyle: fontStyle,
      height: height,
      letterSpacing: letterSpacing,
      decoration: TextDecoration.none,
      color: color,
    );
  }

  /// Figures on the platform system font (blueprint D22 retires IBM Plex Mono
  /// from UI labels). Tabular figures on by default so numerics align in columns.
  static TextStyle mono({
    required double fontSize,
    required double height,
    Color? color,
    FontWeight fontWeight = FontWeight.w500,
    double letterSpacing = 0,
    List<FontFeature> fontFeatures = const [FontFeature.tabularFigures()],
  }) => sans(
    fontSize: fontSize,
    height: height,
    color: color,
    fontWeight: fontWeight,
    letterSpacing: letterSpacing,
  ).copyWith(fontFeatures: fontFeatures);
}
