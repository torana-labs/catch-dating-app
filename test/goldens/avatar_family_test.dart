import 'package:catch_dating_app/platform/theme/app_theme.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/material.dart';
import 'package:flutter/rendering.dart';
import 'package:flutter_test/flutter_test.dart';

import 'support/golden_pump.dart';

const _colors = CatchAvatarColors(
  accent: Color(0xffba4630),
  deep: Color(0xff692344),
  soft: Color(0xffddbbbb),
);

void main() {
  for (final scale in [1.0, 2.0]) {
    testWidgets('avatar family at text scale $scale', (tester) async {
      await matchCatchGolden(
        tester,
        'avatar_family${scale == 1 ? '' : '@2.0'}',
        textScale: scale,
        size: const Size(440, 520),
        builder: (context) => Padding(
          padding: const EdgeInsets.all(24),
          child: DefaultTextStyle(
            style: CatchTextStyles.bodyL(context),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const Text('Initials, activity, counts and veils'),
                const SizedBox(height: 24),
                Wrap(
                  spacing: 24,
                  runSpacing: 24,
                  children: [
                    for (final avatar in _avatars())
                      SizedBox(
                        width: 96,
                        height: 88,
                        child: Center(child: avatar),
                      ),
                  ],
                ),
              ],
            ),
          ),
        ),
      );
    }, tags: const ['golden']);
  }
  testWidgets('avatar labels stay on one line inside the clipped frame', (
    tester,
  ) async {
    final problems = <String>[];
    for (final dark in [false, true]) {
      for (final scale in [1.0, 2.0]) {
        for (final (index, avatar) in [
          ..._avatars().take(8),
          const CatchAvatar(size: 56, name: 'W', initials: 'W'),
          const CatchAvatar(size: 56, name: 'Accented', initials: 'ÅÉ'),
          const CatchAvatar(size: 56, name: 'Long', initials: 'CATCH'),
        ].indexed) {
          const frameKey = ValueKey('avatar-frame');
          await tester.pumpWidget(
            MaterialApp(
              theme: dark ? AppTheme.dark : AppTheme.light,
              themeAnimationDuration: Duration.zero,
              home: MediaQuery(
                data: MediaQueryData(textScaler: TextScaler.linear(scale)),
                child: Scaffold(
                  body: Center(
                    child: KeyedSubtree(key: frameKey, child: avatar),
                  ),
                ),
              ),
            ),
          );
          await tester.pump();
          final frame = tester.renderObject<RenderBox>(find.byKey(frameKey));
          final paragraph = tester.renderObject<RenderParagraph>(
            find
                .descendant(
                  of: find.byKey(frameKey),
                  matching: find.byType(RichText),
                )
                .first,
          );
          final text = paragraph.text.toPlainText();
          final boxes = paragraph.getBoxesForSelection(
            TextSelection(baseOffset: 0, extentOffset: text.length),
          );
          final label = '$index/$dark/$scale/$text';
          if (boxes.map((b) => b.top).toSet().length != 1) {
            problems.add(
              '$label wraps into ${boxes.map((b) => b.top).toSet().length} lines',
            );
          }
          final center = frame.size.center(Offset.zero);
          final radius =
              frame.size.shortestSide / 2 - (avatar as CatchAvatar).borderWidth;
          for (final box in boxes) {
            final bounds = MatrixUtils.transformRect(
              paragraph.getTransformTo(frame),
              box.toRect(),
            );
            if ([
              bounds.topLeft,
              bounds.topRight,
              bounds.bottomLeft,
              bounds.bottomRight,
            ].any((corner) => (corner - center).distance > radius + 0.01)) {
              problems.add('$label has clipped glyph bounds $bounds');
            }
          }
        }
      }
    }
    expect(problems, isEmpty);
  });
}

List<Widget> _avatars() => [
  const CatchAvatar(size: 56, name: 'Dev Malhotra'),
  const CatchAvatar(size: 56, name: 'Aanya Rao'),
  const CatchAvatar(
    size: 56,
    name: 'Mira Shah',
    borderWidth: 2,
    borderColor: Colors.black,
  ),
  const CatchAvatar(size: 56, name: 'Social run', colors: _colors),
  const CatchAvatar(size: 56, name: 'Dinner', colors: _colors, dim: true),
  const CatchAvatar(
    size: 56,
    name: 'Host team',
    variant: CatchAvatarVariant.square,
  ),
  CatchAvatar.count(
    size: 56,
    count: 199,
    countLabelBuilder: (count) => '+$count',
  ),
  CatchAvatar.count(
    size: 56,
    count: 3,
    countLabelBuilder: (count) => '$count invités',
  ),
  const CatchAvatar.veiled(
    size: 56,
    colors: _colors,
    borderWidth: 2,
    borderColor: Colors.white,
  ),
];
