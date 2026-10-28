import 'dart:io';

import 'package:catch_tokens/catch_tokens.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';

/// The web reads gaps, strokes, window sizes, the web type profile, the brand
/// text roles and theme roles from generated CSS. These checks pin the CSS to
/// the Flutter values, including CatchTextStyles, whose voice and mono roles
/// still carry their own literals.
void main() {
  final css = File(
    'packages/web-config/generated/catch-tokens.css',
  ).readAsStringSync();

  String value(String name) {
    final match = RegExp(
      '^  --$name: ([^;]+);',
      multiLine: true,
    ).firstMatch(css);
    expect(match, isNotNull, reason: '--$name');
    return match!.group(1)!;
  }

  double number(String name) =>
      double.parse(value(name).replaceFirst(RegExp(r'px$'), ''));

  String kebab(String input) => input.replaceAllMapped(
    RegExp('[A-Z]'),
    (match) => '-${match[0]!.toLowerCase()}',
  );

  test('gap tokens match CatchGaps', () {
    const gaps = {
      'inline': CatchGaps.inline,
      'headerTitleToSubtitle': CatchGaps.headerTitleToSubtitle,
      'related': CatchGaps.related,
      'formField': CatchGaps.formField,
      'section': CatchGaps.section,
      'majorSection': CatchGaps.majorSection,
    };
    for (final MapEntry(:key, :value) in gaps.entries) {
      expect(number('catch-gap-${kebab(key)}'), value, reason: key);
    }
  });

  test('stroke tokens match CatchStroke', () {
    const strokes = {
      'hairline': CatchStroke.hairline,
      'emphasis': CatchStroke.emphasis,
      'underline': CatchStroke.underline,
      'focusRing': CatchStroke.focusRing,
      'progressIndicator': CatchStroke.progressIndicator,
      'avatarRing': CatchStroke.avatarRing,
      'selection': CatchStroke.selection,
      'passProgress': CatchStroke.passProgress,
    };
    for (final MapEntry(:key, :value) in strokes.entries) {
      expect(number('catch-stroke-${kebab(key)}'), value, reason: key);
    }
  });

  test('field tokens match the Flutter field values', () {
    expect(
      number('catch-radius-interactive-tile'),
      CatchRadius.interactiveTile,
    );
    expect(
      number('catch-opacity-control-overlay-hover'),
      CatchOpacity.controlOverlayHover,
    );
    expect(
      number('catch-field-active-tint-alpha'),
      CatchFieldTokens.activeTintAlpha,
    );
    expect(
      number('catch-field-pressed-tint-alpha'),
      CatchFieldTokens.pressedTintAlpha,
    );
    expect(
      number('catch-field-disabled-opacity'),
      CatchFieldTokens.disabledOpacity,
    );
    for (final brightness in Brightness.values) {
      final mode = brightness.name;
      final shadow = CatchElevation.fieldActive(brightness).single;
      final color = shadow.color;
      final rgba = [
        color.r,
        color.g,
        color.b,
      ].map((channel) => (channel * 255).round()).join(', ');
      final alpha = double.parse(color.a.toStringAsFixed(2));
      expect(
        value('catch-theme-$mode-elevation-field-active'),
        '${shadow.offset.dx == 0 ? 0 : '${shadow.offset.dx}px'} '
        '${shadow.offset.dy.round()}px ${shadow.blurRadius.round()}px '
        'rgba($rgba, ${alpha == alpha.roundToDouble() ? alpha.round() : alpha})',
        reason: mode,
      );
    }
  });

  test('page body end matches the Flutter page body inset', () {
    expect(number('catch-layout-page-body-end'), CatchSpacing.screenPb);
    expect(CatchInsets.pageBody.bottom, CatchSpacing.screenPb);
  });

  test('window size bounds match CatchWindowSize', () {
    final medium = number('catch-window-size-medium-min-width');
    final expanded = number('catch-window-size-expanded-min-width');
    expect(CatchWindowSize.fromWidth(medium - 1), CatchWindowSize.compact);
    expect(CatchWindowSize.fromWidth(medium), CatchWindowSize.medium);
    expect(CatchWindowSize.fromWidth(expanded - 1), CatchWindowSize.medium);
    expect(CatchWindowSize.fromWidth(expanded), CatchWindowSize.expanded);
  });

  test('web type profile aliases the iOS profile', () {
    const ios = GeneratedCatchTypographyTokens.ios;
    final roles = {
      'headline': ios.headline,
      'title': ios.title,
      'name': ios.name,
      'body': ios.body,
      'secondary': ios.secondary,
      'context': ios.context,
      'control': ios.control,
      'status': ios.status,
      'metric': ios.metric,
      'fieldValue': ios.fieldValue,
      'fieldLabel': ios.fieldLabel,
      'displayLarge': ios.displayLarge,
      'displayMedium': ios.displayMedium,
      'displaySmall': ios.displaySmall,
      'navigationLabel': ios.navigationLabel,
    };
    for (final MapEntry(key: role, value: style) in roles.entries) {
      final prefix = 'catch-typography-web-${kebab(role)}';
      expect(number('$prefix-size'), style.fontSize, reason: role);
      expect(
        number('$prefix-line-height'),
        closeTo(style.fontSize! * style.height!, 1e-9),
        reason: role,
      );
      expect(number('$prefix-weight'), style.fontWeight!.value, reason: role);
      expect(number('$prefix-tracking'), style.letterSpacing, reason: role);
    }
  });

  testWidgets('brand text roles match CatchTextStyles', (tester) async {
    late Map<String, TextStyle> roles;
    await tester.pumpWidget(
      Builder(
        builder: (context) {
          const color = Color(0xFF000000);
          roles = {
            // The D19 display steps track in em; the next test pins them.
            'kicker': CatchTextStyles.kicker(context, color: color),
            'kickerLg': CatchTextStyles.kickerLg(context, color: color),
            'fieldSectionKicker': CatchTextStyles.fieldSectionKicker(
              context,
              color: color,
            ),
            'sectionCount': CatchTextStyles.sectionCount(context, color: color),
            'monoLabel': CatchTextStyles.monoLabel(context, color: color),
            'monoCapsLabel': CatchTextStyles.monoCapsLabel(
              context,
              color: color,
            ),
            'monoLabelS': CatchTextStyles.monoLabelS(context, color: color),
            'meta': CatchTextStyles.meta(context, color: color),
            'badge': CatchTextStyles.badge(context, color: color),
            'badgeCaps': CatchTextStyles.badgeCaps(context, color: color),
            'numericLarge': CatchTextStyles.numericLarge(context, color: color),
          };
          return const SizedBox.shrink();
        },
      ),
    );
    for (final MapEntry(key: role, value: style) in roles.entries) {
      final prefix = 'catch-typography-brand-${kebab(role)}';
      expect(number('$prefix-size'), style.fontSize, reason: role);
      expect(number('$prefix-line-height'), style.height, reason: role);
      expect(number('$prefix-weight'), style.fontWeight!.value, reason: role);
      expect(
        number('$prefix-tracking'),
        style.letterSpacing ?? 0,
        reason: role,
      );
    }
  });

  testWidgets('brand display steps match CatchTextStyles (D19)', (
    tester,
  ) async {
    late Map<String, TextStyle> steps;
    await tester.pumpWidget(
      Builder(
        builder: (context) {
          const color = Color(0xFF000000);
          steps = {
            'displayXs': CatchTextStyles.displayXs(context, color: color),
            'displayS': CatchTextStyles.displayS(context, color: color),
            'displayM': CatchTextStyles.displayM(context, color: color),
            'displayL': CatchTextStyles.displayL(context, color: color),
            'displayXl': CatchTextStyles.displayXl(context, color: color),
            'displayXxl': CatchTextStyles.displayXxl(context, color: color),
          };
          return const SizedBox.shrink();
        },
      ),
    );
    for (final MapEntry(key: step, value: style) in steps.entries) {
      final prefix = 'catch-typography-brand-${kebab(step)}';
      expect(number('$prefix-size'), style.fontSize, reason: step);
      expect(number('$prefix-line-height'), style.height, reason: step);
      expect(number('$prefix-weight'), style.fontWeight!.value, reason: step);
      final tracking = value('$prefix-tracking');
      expect(tracking, endsWith('em'), reason: step);
      expect(
        double.parse(tracking.replaceFirst(RegExp(r'em$'), '')) *
            style.fontSize!,
        moreOrLessEquals(style.letterSpacing!, epsilon: 1e-9),
        reason: step,
      );
    }
  });

  test('palette white and black match the editorial colours', () {
    String hex(Color color) =>
        '#${color.toARGB32().toRadixString(16).padLeft(8, '0').substring(2).toUpperCase()}';
    expect(value('catch-palette-white'), hex(CatchTokens.editorialWhite));
    expect(value('catch-palette-black'), hex(CatchTokens.editorialBlack));
  });

  test('every colour role has a theme role in light and dark', () {
    final roles = RegExp(
      r'^  --catch-color-light-([a-z0-9-]+):',
      multiLine: true,
    ).allMatches(css).map((match) => match.group(1)!).toList();
    expect(roles, isNotEmpty);
    for (final (selector, mode) in [
      (':root,\n[data-catch-theme="light"] {', 'light'),
      ('[data-catch-theme="dark"] {', 'dark'),
    ]) {
      final start = css.indexOf(selector);
      expect(start, isNonNegative, reason: selector);
      final block = css.substring(start, css.indexOf('}', start));
      for (final role in roles) {
        expect(
          block,
          contains('--catch-theme-$role: var(--catch-color-$mode-$role);'),
          reason: '$mode $role',
        );
      }
      expect(
        block,
        contains(
          '--catch-elevation-field-active: '
          'var(--catch-theme-$mode-elevation-field-active);',
        ),
        reason: '$mode field elevation',
      );
    }
  });
}
