import 'package:catch_dating_app/contexts/account/data/auth_repository.dart';
import 'package:catch_dating_app/contexts/events/data/event_repository.dart';
import 'package:catch_dating_app/contexts/organizers/data/organizers_repository.dart';
import 'package:catch_dating_app/hosts/create/create_route_screen.dart';
import 'package:catch_dating_app/hosts/create/edit_event_screen.dart';
import 'package:catch_l10n/generated/app_localizations.dart';
import 'package:catch_platform/theme/app_theme.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_riverpod/misc.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  testWidgets('create route loading uses the system screen', (tester) async {
    await _pump(
      tester,
      const CreateRouteScreen(organizerId: 'club-1'),
      overrides: [
        uidProvider.overrideWith((ref) => Stream.value('host-1')),
        watchOrganizerProvider.overrideWith((ref, id) => const Stream.empty()),
      ],
    );

    expect(find.byType(CatchScreen), findsOneWidget);
    expect(find.byType(CatchLoadingIndicator), findsOneWidget);
    expect(find.text('New event'), findsOneWidget);
  });

  testWidgets('edit route loading uses the system screen', (tester) async {
    await _pump(
      tester,
      const EditEventRouteScreen(organizerId: 'club-1', eventId: 'event-1'),
      overrides: [
        uidProvider.overrideWith((ref) => Stream.value('host-1')),
        watchOrganizerProvider.overrideWith((ref, id) => const Stream.empty()),
        watchEventProvider.overrideWith((ref, id) => const Stream.empty()),
      ],
    );

    expect(find.byType(CatchScreen), findsOneWidget);
    expect(find.byType(CatchLoadingIndicator), findsOneWidget);
    expect(find.text('Edit event'), findsOneWidget);
  });
}

Future<void> _pump(
  WidgetTester tester,
  Widget child, {
  required List<Override> overrides,
}) {
  return tester.pumpWidget(
    ProviderScope(
      overrides: overrides,
      child: MaterialApp(
        theme: AppTheme.light,
        localizationsDelegates: AppLocalizations.localizationsDelegates,
        supportedLocales: AppLocalizations.supportedLocales,
        home: child,
      ),
    ),
  );
}
