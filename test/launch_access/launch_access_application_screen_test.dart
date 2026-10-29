import 'package:catch_dating_app/contexts/account/data/auth_repository.dart';
import 'package:catch_dating_app/contexts/account/data/launch_access_repository.dart';
import 'package:catch_dating_app/launch_access/presentation/launch_access_application_screen.dart';
import 'package:catch_dating_app/launch_access/presentation/launch_access_controller.dart';
import 'package:catch_dating_app/platform/theme/app_theme.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  testWidgets('launch access keeps form-shaped skeleton while loading', (
    tester,
  ) async {
    await tester.pumpWidget(
      ProviderScope(
        overrides: [
          uidProvider.overrideWith((ref) => Stream.value('runner-1')),
          watchLaunchAccessApplicationProvider(
            'runner-1',
          ).overrideWith((ref) => const Stream.empty()),
        ],
        child: MaterialApp(
          theme: AppTheme.light,
          home: const LaunchAccessApplicationScreen(),
        ),
      ),
    );
    await tester.pump();

    expect(find.byType(CatchRouteScaffold), findsOneWidget);
    expect(find.byTooltip('Back'), findsOneWidget);
    expect(find.byType(CatchSkeleton), findsWidgets);
    expect(find.text('Join the next city drop'), findsNothing);
  });

  testWidgets('launch access form uses CatchField toggle for host interest', (
    tester,
  ) async {
    final container = ProviderContainer(
      overrides: [
        uidProvider.overrideWith((ref) => Stream.value('runner-1')),
        watchLaunchAccessApplicationProvider(
          'runner-1',
        ).overrideWith((ref) => Stream.value(null)),
      ],
    );
    addTearDown(container.dispose);

    await tester.pumpWidget(
      UncontrolledProviderScope(
        container: container,
        child: MaterialApp(
          theme: AppTheme.light,
          home: const LaunchAccessApplicationScreen(),
        ),
      ),
    );
    await tester.pump();
    await tester.pump();

    expect(find.text('Join the next city drop'), findsOneWidget);
    expect(_fieldToggle('I might host'), findsOneWidget);
    expect(container.read(launchAccessControllerProvider).wantsToHost, isFalse);

    await tester.ensureVisible(_fieldToggle('I might host'));
    await tester.pump();
    await tester.tap(_fieldToggle('I might host'));
    await tester.pump();

    expect(container.read(launchAccessControllerProvider).wantsToHost, isTrue);
  });
}

Finder _fieldToggle(String label) {
  return find.byWidgetPredicate(
    (widget) => widget is CatchField && widget.title == label,
  );
}
