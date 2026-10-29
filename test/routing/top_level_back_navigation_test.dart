import 'package:catch_dating_app/contexts/account/data/auth_repository.dart';
import 'package:catch_dating_app/contexts/profiles/data/user_profile_repository.dart';
import 'package:catch_dating_app/events/presentation/calendar/calendar_screen.dart';
import 'package:catch_dating_app/platform/theme/app_theme.dart';
import 'package:catch_dating_app/routing/go_router.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:go_router/go_router.dart';

void main() {
  Future<void> pumpTopLevelRoute(
    WidgetTester tester, {
    required String path,
    required Widget child,
  }) async {
    final router = GoRouter(
      initialLocation: Routes.dashboardScreen.path,
      routes: [
        GoRoute(
          path: Routes.dashboardScreen.path,
          builder: (context, _) => Scaffold(
            body: Center(
              child: FilledButton(
                onPressed: () => context.push(path),
                child: const Text('Open destination'),
              ),
            ),
          ),
        ),
        GoRoute(path: path, builder: (_, _) => child),
      ],
    );
    addTearDown(router.dispose);

    await tester.pumpWidget(
      ProviderScope(
        overrides: [
          uidProvider.overrideWith((ref) => Stream.value(null)),
          watchUserProfileProvider.overrideWith((ref) => Stream.value(null)),
        ],
        child: MaterialApp.router(theme: AppTheme.light, routerConfig: router),
      ),
    );
    await _pumpRouterFrame(tester);
    await tester.tap(find.text('Open destination'));
    await _pumpRouterFrame(tester);
  }

  testWidgets('calendar back button returns to dashboard', (tester) async {
    await pumpTopLevelRoute(
      tester,
      path: Routes.calendarScreen.path,
      child: const CalendarScreen(),
    );

    expect(find.byType(CalendarScreen), findsOneWidget);
    expect(find.byTooltip('Back'), findsOneWidget);

    await tester.tap(find.byTooltip('Back'));
    await _pumpRouterFrame(tester);

    expect(find.text('Open destination'), findsOneWidget);
  });
}

Future<void> _pumpRouterFrame(WidgetTester tester) async {
  await tester.pump();
  await tester.pump();
}
