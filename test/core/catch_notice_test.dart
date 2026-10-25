import 'package:catch_dating_app/core/theme/app_theme.dart';
import 'package:catch_tokens/catch_tokens.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  test('existing const callers keep the default icon and semantic tone', () {
    const data = CatchNoticeData(id: 'ordinary', title: 'Existing notice');
    expect(data.icon, CatchIcons.info);
    expect(data.tone, CatchNoticeTone.status);
    expect(data.person, isNull);
    expect(data.accentColor, isNull);
  });

  for (final dark in [false, true]) {
    for (final scale in [1.0, 2.0]) {
      testWidgets(
        'caller owns copy, icon and accent, dark=$dark scale=$scale',
        (tester) async {
          tester.view.physicalSize = const Size(390, 844);
          tester.view.devicePixelRatio = 1;
          addTearDown(tester.view.resetPhysicalSize);
          addTearDown(tester.view.resetDevicePixelRatio);
          final icon = CatchIcons.chat;
          final theme = dark ? AppTheme.dark : AppTheme.light;
          late Color accent;
          await tester.pumpWidget(
            MaterialApp(
              theme: theme,
              home: Scaffold(
                body: Builder(
                  builder: (context) {
                    accent = CatchTokens.of(context).success;
                    return MediaQuery(
                      data: MediaQuery.of(
                        context,
                      ).copyWith(textScaler: TextScaler.linear(scale)),
                      child: CatchNotice(
                        dismissLabel: 'Dismiss',
                        notice: CatchNoticeData(
                          id: 'configured',
                          title: 'Congratulations',
                          message: 'A caller-provided message.',
                          icon: icon,
                          accentColor: accent,
                        ),
                      ),
                    );
                  },
                ),
              ),
            ),
          );
          expect(find.text('Congratulations'), findsOneWidget);
          expect(find.text('A caller-provided message.'), findsOneWidget);
          expect(find.byIcon(icon), findsOneWidget);
          expect(tester.widget<Icon>(find.byIcon(icon)).color, accent);
          expect(find.byIcon(CatchIcons.info), findsNothing);
          expect(tester.takeException(), isNull);
        },
      );
    }
  }

  testWidgets(
    'person identity uses canonical circle avatar and initials fallback',
    (tester) async {
      await tester.pumpWidget(
        MaterialApp(
          theme: AppTheme.light,
          home: const Scaffold(
            body: CatchNotice(
              dismissLabel: 'Dismiss',
              notice: CatchNoticeData(
                id: 'person',
                title: 'Hello',
                person: CatchPersonAvatarItem(
                  name: 'Ananya Rao',
                  initials: 'AR',
                ),
              ),
            ),
          ),
        ),
      );
      final avatar = tester.widget<CatchAvatar>(find.byType(CatchAvatar));
      expect(avatar.name, 'Ananya Rao');
      expect(avatar.variant, CatchAvatarVariant.circle);
      expect(avatar.size, CatchLayout.noticeIconExtent);
      expect(find.text('AR'), findsOneWidget);
      expect(find.byIcon(CatchIcons.info), findsNothing);
      expect(find.byType(CatchSurface), findsOneWidget);
    },
  );

  testWidgets('empty photo URL retains the canonical avatar fallback', (
    tester,
  ) async {
    // An empty URL intentionally takes the existing avatar fallback path,
    // without issuing a network request in the test.
    const identity = CatchPersonAvatarItem(name: 'Ananya', imageUrl: '');
    await tester.pumpWidget(
      MaterialApp(
        theme: AppTheme.light,
        home: const Scaffold(
          body: CatchNotice(
            dismissLabel: 'Dismiss',
            notice: CatchNoticeData(
              id: 'photo',
              title: 'Hello',
              person: identity,
            ),
          ),
        ),
      ),
    );
    expect(
      tester.widget<CatchAvatar>(find.byType(CatchAvatar)).imageUrl,
      identity.imageUrl,
    );
  });
}
