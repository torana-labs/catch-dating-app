import 'package:catch_dating_app/contexts/safety/domain/safety_notice.dart';
import 'package:catch_dating_app/dashboard/presentation/activity_screen.dart';
import 'package:catch_dating_app/dashboard/presentation/notifications_list_state.dart';
import 'package:catch_l10n/l10n.dart';
import 'package:catch_platform/theme/app_theme.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';

SafetyNotice _notice({
  required String id,
  required String title,
  String? actionId,
  bool appealable = false,
}) => SafetyNotice(
  id: id,
  kind: SafetyNoticeKind.restriction,
  title: title,
  body: 'You can’t book events for 7 days.',
  actionId: actionId,
  appealable: appealable,
  createdAt: DateTime(2026, 11, 20),
  readAt: null,
);

Future<void> _pump(
  WidgetTester tester, {
  required List<SafetyNotice> notices,
  ValueChanged<SafetyNotice>? onAppeal,
}) async {
  await tester.pumpWidget(
    ProviderScope(
      child: MaterialApp(
        theme: AppTheme.light,
        localizationsDelegates: AppLocalizations.localizationsDelegates,
        supportedLocales: AppLocalizations.supportedLocales,
        home: Scaffold(
          body: ActivityScreenBody(
            state: const NotificationsEmpty(uid: 'guest-mira'),
            onOpenRoute: (_) {},
            notices: notices,
            onAppeal: onAppeal,
          ),
        ),
      ),
    ),
  );
  await tester.pump();
}

void main() {
  testWidgets('From Catch lists notices and offers Appeal only where it '
      'can be appealed', (tester) async {
    final appealed = <String>[];
    await _pump(
      tester,
      notices: [
        _notice(
          id: 'restricted',
          title: 'Your account is restricted',
          actionId: 'action-12345',
          appealable: true,
        ),
        _notice(id: 'warned', title: 'A warning from Catch'),
      ],
      onAppeal: (notice) => appealed.add(notice.id),
    );

    expect(
      find.byKey(const ValueKey<String>('activity-safety-notices')),
      findsOneWidget,
    );
    expect(find.text('Your account is restricted'), findsOneWidget);
    expect(find.text('A warning from Catch'), findsOneWidget);
    expect(find.text('Appeal'), findsOneWidget);
    expect(
      find.descendant(
        of: find.byKey(const ValueKey<String>('activity-safety-notice-warned')),
        matching: find.text('Appeal'),
      ),
      findsNothing,
    );

    await tester.tap(find.text('Appeal'));
    expect(appealed, ['restricted']);
  });

  testWidgets('no notices hides From Catch', (tester) async {
    await _pump(tester, notices: const []);
    expect(
      find.byKey(const ValueKey<String>('activity-safety-notices')),
      findsNothing,
    );
  });
}
