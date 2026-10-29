import 'package:catch_dating_app/kernel/activity_taxonomy.dart';
import 'package:catch_dating_app/l10n/generated/app_localizations_en.dart';
import 'package:catch_dating_app/platform/l10n/catch_ui_copy.dart';
import 'package:catch_dating_app/platform/theme/activity_palette.dart';
import 'package:catch_dating_app/platform/theme/app_theme.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';

import '../../test_pump_helpers.dart';

void main() {
  testWidgets('avatar row preserves empty, count-only and bounded collections', (
    tester,
  ) async {
    String countLabel(int count) => '+$count';
    for (final sample in [
      (const <CatchPersonAvatarItem>[], 0, 4, true, 0, 0.0, null),
      (const <CatchPersonAvatarItem>[], 8, 4, true, 1, 32.0, '+8'),
      (const <CatchPersonAvatarItem>[], 8, 4, false, 0, 0.0, null),
      (
        const [
          CatchPersonAvatarItem(name: 'Asha Shah'),
          CatchPersonAvatarItem(name: 'Riya Shah'),
          CatchPersonAvatarItem(name: 'Maya Patel'),
        ],
        8,
        2,
        true,
        3,
        78.0,
        '+6',
      ),
    ]) {
      await tester.pumpWidget(
        MaterialApp(
          theme: CatchTheme.light,
          home: Scaffold(
            body: Align(
              alignment: Alignment.topLeft,
              child: CatchAvatarRow(
                items: sample.$1,
                totalCount: sample.$2,
                limit: sample.$3,
                showOverflowCount: sample.$4,
                countLabelBuilder: countLabel,
              ),
            ),
          ),
        ),
      );
      expect(find.byType(CatchAvatar), findsNWidgets(sample.$5));
      expect(
        tester.getSize(find.byType(CatchAvatarRow)),
        Size(sample.$6, sample.$5 == 0 ? 0 : 32),
      );
      if (sample.$7 case final label?) {
        expect(find.text(label), findsOneWidget);
      }
      // The limit controls visible identities; the overflow is a separate slot.
      expect(find.text('MP'), findsNothing);
      final avatars = find.byType(CatchAvatar).evaluate().toList();
      if (avatars.length > 1) {
        expect(
          tester.getTopLeft(find.widgetWithText(CatchAvatar, 'RS')).dx -
              tester.getTopLeft(find.widgetWithText(CatchAvatar, 'AS')).dx,
          23,
        );
      }
      expect(tester.takeException(), isNull);
    }
  });

  testWidgets(
    'shared avatar stack uses caller colors and translated overflow',
    (tester) async {
      const colors = CatchAvatarColors(
        accent: Colors.purple,
        deep: Colors.deepPurple,
        soft: Colors.purpleAccent,
      );
      await tester.pumpWidget(
        MaterialApp(
          theme: CatchTheme.light,
          home: Scaffold(
            body: CatchAvatarRow(
              items: const [CatchPersonAvatarItem(name: 'Asha Shah')],
              totalCount: 5,
              size: 96,
              limit: 2,
              veiledCount: 1,
              veiledColors: colors,
              countLabelBuilder: catchAvatarCountLabelBuilder(
                _FrenchAvatarCopy(),
              ),
            ),
          ),
        ),
      );
      expect(find.text('AS'), findsOneWidget);
      expect(find.text('3 invités'), findsOneWidget);
      expect(find.text('+3'), findsNothing);
      final veil = tester
          .widgetList<CatchAvatar>(find.byType(CatchAvatar))
          .singleWhere((avatar) => identical(avatar.colors, colors));
      expect(veil.colors, same(colors));
      expect(find.byType(CatchAvatar), findsNWidgets(3));
      expect(tester.takeException(), isNull);
    },
  );

  testWidgets(
    'app activity colors follow theme changes through image fallback',
    (tester) async {
      final content = Builder(
        builder: (context) => CatchAvatar(
          size: 64,
          name: 'Social run',
          imageUrl: 'assets/fixtures/does-not-exist.png',
          colors: ActivityPalette.resolve(
            context,
            ActivityKind.socialRun,
          ).avatarColors,
        ),
      );
      for (final dark in [false, true]) {
        await tester.pumpWidget(
          MaterialApp(
            theme: dark ? AppTheme.dark : AppTheme.light,
            themeAnimationDuration: Duration.zero,
            home: Scaffold(body: content),
          ),
        );
        await pumpUntilFound(tester, find.byType(CatchAvatarInitialsSurface));
        final palette = (dark ? ActivityPalette.dark : ActivityPalette.light)
            .getActivity(ActivityKind.socialRun);
        final placeholder = tester.widget<CatchAvatarInitialsSurface>(
          find.byType(CatchAvatarInitialsSurface),
        );
        expect(placeholder.colors!.accent, palette.accent);
        expect(placeholder.colors!.deep, palette.deep);
        final gradient = tester
            .widgetList<DecoratedBox>(
              find.descendant(
                of: find.byType(CatchAvatarInitialsSurface),
                matching: find.byType(DecoratedBox),
              ),
            )
            .map((box) => box.decoration)
            .whereType<BoxDecoration>()
            .map((box) => box.gradient)
            .whereType<LinearGradient>()
            .single;
        expect(gradient.colors, [palette.accent, palette.deep]);
        expect(find.text('SR'), findsOneWidget);
        expect(placeholder.variant, CatchAvatarInitialsSurfaceVariant.activity);
        expect(tester.takeException(), isNull);
      }
    },
  );
}

class _FrenchAvatarCopy extends AppLocalizationsEn {
  @override
  String coreCatchPersonAvatarTextCount({required Object count}) =>
      '$count invités';
}
