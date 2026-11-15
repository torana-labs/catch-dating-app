import 'dart:math' as math;

import 'package:catch_tokens/catch_tokens.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  test('semantic border roles own the complete stroke scale', () {
    final tokens = CatchTokens.editorialLight;

    expect(
      CatchBorder.resolve(tokens, CatchBorderRole.separator).width,
      CatchStroke.hairline,
    );
    expect(
      CatchBorder.resolve(tokens, CatchBorderRole.boundary).width,
      CatchStroke.hairline,
    );
    expect(
      CatchBorder.resolve(tokens, CatchBorderRole.control).width,
      CatchStroke.hairline,
    );
    expect(
      CatchBorder.resolve(tokens, CatchBorderRole.selected).width,
      CatchStroke.emphasis,
    );
    expect(
      CatchBorder.resolve(tokens, CatchBorderRole.danger).width,
      CatchStroke.emphasis,
    );
    expect(
      CatchBorder.resolve(tokens, CatchBorderRole.focus).width,
      CatchStroke.focusRing,
    );
  });

  test('interactive hover and press do not change border geometry', () {
    for (final tokens in <CatchTokens>[
      CatchTokens.editorialLight,
      CatchTokens.editorialDark,
    ]) {
      final resting = CatchBorder.interactive(
        tokens,
        CatchInteractiveBorderState.resting,
      );
      final hovered = CatchBorder.interactive(
        tokens,
        CatchInteractiveBorderState.hovered,
      );
      final pressed = CatchBorder.interactive(
        tokens,
        CatchInteractiveBorderState.pressed,
      );

      expect(hovered.color, resting.color);
      expect(hovered.width, resting.width);
      expect(pressed.color, resting.color);
      expect(pressed.width, resting.width);
    }
  });

  test('interactive boundaries meet contrast in light and dark themes', () {
    for (final tokens in <CatchTokens>[
      CatchTokens.editorialLight,
      CatchTokens.editorialDark,
    ]) {
      for (final background in <Color>[tokens.bg, tokens.surface]) {
        for (final role in <CatchBorderRole>[
          CatchBorderRole.control,
          CatchBorderRole.selected,
          CatchBorderRole.focus,
          CatchBorderRole.danger,
        ]) {
          final border = CatchBorder.resolve(tokens, role);
          expect(
            _contrastRatio(border.color, background),
            greaterThanOrEqualTo(3),
            reason: '$role must remain distinguishable on $background',
          );
        }
      }
    }
  });

  testWidgets('semantic border states do not change surface geometry', (
    tester,
  ) async {
    Future<Rect> pump(CatchBorderRole role) async {
      await tester.pumpWidget(
        MaterialApp(
          theme: ThemeData(extensions: const [CatchTokens.editorialLight]),
          home: Center(
            child: CatchLegacySurface(
              key: const ValueKey('semantic-border-surface'),
              borderRole: role,
              padding: const EdgeInsets.all(CatchSpacing.s3),
              child: const Text('Stable'),
            ),
          ),
        ),
      );
      await tester.pump();
      return tester.getRect(
        find.byKey(const ValueKey('semantic-border-surface')),
      );
    }

    final resting = await pump(CatchBorderRole.control);
    final selected = await pump(CatchBorderRole.selected);
    final focused = await pump(CatchBorderRole.focus);

    expect(selected, resting);
    expect(focused, resting);
  });
}

double _contrastRatio(Color first, Color second) {
  final firstLuminance = first.computeLuminance();
  final secondLuminance = second.computeLuminance();
  return (math.max(firstLuminance, secondLuminance) + 0.05) /
      (math.min(firstLuminance, secondLuminance) + 0.05);
}
