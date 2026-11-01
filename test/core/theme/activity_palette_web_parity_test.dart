import 'dart:io';

import 'package:catch_dating_app/kernel/activity_taxonomy.dart';
import 'package:catch_dating_app/platform/theme/activity_palette.dart';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';

/// The website reads activity swatches from generated CSS. `tool/design_tokens/lib/values.mjs`
/// derives them with a port of [ActivitySwatch]'s HSL math, so this pins the two.
void main() {
  test('generated website activity swatches match the app palette', () {
    final css = File(
      'packages/web-config/generated/catch-tokens.css',
    ).readAsStringSync();
    String webHex(ActivityKind kind, String role) {
      final name = kind.name.replaceAllMapped(
        RegExp('[A-Z]'),
        (match) => '-${match[0]!.toLowerCase()}',
      );
      final match = RegExp(
        '--catch-activity-$name-$role: (#[0-9A-F]{6});',
      ).firstMatch(css);
      expect(match, isNotNull, reason: '--catch-activity-$name-$role');
      return match!.group(1)!;
    }

    String hex(Color color) =>
        '#${[color.r, color.g, color.b].map((channel) => (channel * 255).round().toRadixString(16).padLeft(2, '0')).join().toUpperCase()}';

    final light = ActivityPalette.forBrightness(Brightness.light).swatches;
    final dark = ActivityPalette.forBrightness(Brightness.dark).swatches;
    for (final kind in ActivityPalette.activityOrder) {
      expect(webHex(kind, 'deep'), hex(light[kind]!.deep), reason: '$kind');
      expect(webHex(kind, 'soft'), hex(light[kind]!.soft), reason: '$kind');
      expect(
        webHex(kind, 'accent-dark'),
        hex(dark[kind]!.accent),
        reason: '$kind',
      );
      expect(webHex(kind, 'soft-dark'), hex(dark[kind]!.soft), reason: '$kind');
    }
  });
}
