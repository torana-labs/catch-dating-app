import 'package:catch_dating_app/kernel/activity_taxonomy.dart';
import 'package:catch_dating_app/platform/theme/activity_palette.dart';
import 'package:catch_dating_app/platform/theme/app_theme.dart';
import 'package:catch_tokens/catch_tokens.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/material.dart';
import 'package:flutter/semantics.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  testWidgets('derives navigation and message affordances from callbacks', (
    tester,
  ) async {
    final semantics = tester.ensureSemantics();
    try {
      var rowTaps = 0;
      var messageTaps = 0;

      await tester.pumpWidget(
        MaterialApp(
          theme: AppTheme.light,
          home: Scaffold(
            body: Builder(
              builder: (context) => CatchField.navigate(
                onActivate: () => rowTaps += 1,
                secondaryAction: CatchFieldSecondaryAction.command(
                  label: 'Message Jordan Ellis',
                  icon: CatchIcons.chat,
                  onActivate: () => messageTaps += 1,
                ),
                content: CatchPersonLayout(
                  avatarColors: ActivityPalette.resolve(
                    context,
                    ActivityKind.socialRun,
                  ).avatarColors,
                  name: 'Jordan Ellis',
                  badges: [
                    CatchRowBadge(
                      label: 'Owner verified',
                      tone: CatchBadgeTone.success,
                      icon: CatchIcons.verified,
                    ),
                  ],
                  supportingText: 'HOSTING SINCE MAY 2026 · VIJAY NAGAR',
                ),
              ),
            ),
          ),
        ),
      );

      final avatar = tester.widget<CatchAvatar>(find.byType(CatchAvatar));
      expect(avatar.size, CatchRecordTokens.avatarExtent);
      final colors = ActivityPalette.light.getActivity(ActivityKind.socialRun);
      expect(avatar.colors?.accent, colors.accent);
      expect(avatar.colors?.deep, colors.deep);
      expect(avatar.colors?.soft, colors.soft);
      expect(find.byIcon(CatchIcons.verified), findsOneWidget);
      expect(find.byIcon(CatchIcons.chat), findsOneWidget);
      expect(find.byIcon(CatchIcons.disclosure), findsOneWidget);

      await tester.tap(find.byIcon(CatchIcons.chat));
      await tester.pump();

      expect(messageTaps, 1);
      expect(rowTaps, 0);

      await tester.tap(find.text('Jordan Ellis'));
      await tester.pump();

      expect(rowTaps, 1);
      expect(messageTaps, 1);

      tester.semantics.tap(find.semantics.byLabel('Message Jordan Ellis'));
      expect(messageTaps, 2);
      expect(rowTaps, 1);
      final rowNode = find.semantics
          .byLabel(RegExp('Jordan Ellis'))
          .evaluate()
          .singleWhere(
            (node) =>
                node.label != 'Message Jordan Ellis' &&
                node.getSemanticsData().hasAction(SemanticsAction.tap),
          );
      rowNode.owner!.performAction(rowNode.id, SemanticsAction.tap);
      expect(rowTaps, 2);
      expect(messageTaps, 2);
    } finally {
      semantics.dispose();
    }
  });

  testWidgets(
    'caller avatar colors update while verification uses its semantic status tone',
    (tester) async {
      const firstColors = CatchAvatarColors(
        accent: Color(0xff9b2c77),
        deep: Color(0xff481f39),
        soft: Color(0xfff2d4e7),
      );
      const nextColors = CatchAvatarColors(
        accent: Color(0xff40b4d5),
        deep: Color(0xff163c49),
        soft: Color(0xffc4eef7),
      );
      for (final colors in [firstColors, nextColors]) {
        await tester.pumpWidget(
          MaterialApp(
            theme: CatchTheme.light,
            home: Scaffold(
              body: CatchField.read(
                secondaryAction: CatchFieldSecondaryAction.command(
                  label: 'Écrire à Mira',
                  icon: CatchIcons.chat,
                  onActivate: () {},
                ),
                content: CatchPersonLayout(
                  avatarColors: colors,
                  name: 'Mira Shah',
                  badges: [
                    CatchRowBadge(
                      label: 'Owner verified',
                      tone: CatchBadgeTone.success,
                      icon: CatchIcons.verified,
                    ),
                  ],
                ),
              ),
            ),
          ),
        );
        final avatar = tester.widget<CatchAvatar>(find.byType(CatchAvatar));
        expect(avatar.colors, same(colors));
        final mark = tester.widget<Icon>(find.byIcon(CatchIcons.verified));
        expect(
          mark.color,
          CatchTokens.of(tester.element(find.byType(CatchAvatar))).positiveText,
        );
        expect(find.byTooltip('Écrire à Mira'), findsOneWidget);
        expect(tester.takeException(), isNull);
      }
    },
  );

  testWidgets('omits interaction affordances when callbacks are absent', (
    tester,
  ) async {
    await tester.pumpWidget(
      MaterialApp(
        theme: AppTheme.light,
        home: Scaffold(
          body: Builder(
            builder: (context) => CatchField.read(
              content: CatchPersonLayout(
                avatarColors: ActivityPalette.resolve(
                  context,
                  ActivityKind.dinner,
                ).avatarColors,
                name: 'Mira Shah',
              ),
            ),
          ),
        ),
      ),
    );

    expect(find.byIcon(CatchIcons.chat), findsNothing);
    expect(find.byIcon(CatchIcons.disclosure), findsNothing);
    expect(find.byIcon(CatchIcons.verified), findsNothing);
  });
}
