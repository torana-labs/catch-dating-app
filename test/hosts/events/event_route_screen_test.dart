import 'dart:async';

import 'package:catch_dating_app/contexts/account/data/auth_repository.dart';
import 'package:catch_dating_app/contexts/events/data/event_repository.dart';
import 'package:catch_dating_app/contexts/events/domain/event.dart';
import 'package:catch_dating_app/contexts/organizers/data/organizers_repository.dart';
import 'package:catch_dating_app/contexts/organizers/domain/organizer.dart';
import 'package:catch_dating_app/hosts/events/event_route_screen.dart';
import 'package:catch_l10n/l10n.dart';
import 'package:catch_test_support/organizers_test_helpers.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';

/// The event route's own states, redrawn on the system: loading, an event
/// that is gone, and an event this host does not run.
void main() {
  Future<void> pump(
    WidgetTester tester, {
    required Stream<String?> uid,
    required Stream<Organizer?> organizer,
    required Stream<Event?> event,
  }) async {
    await tester.pumpWidget(
      ProviderScope(
        overrides: [
          uidProvider.overrideWith((ref) => uid),
          watchOrganizerProvider('club-1').overrideWith((ref) => organizer),
          watchEventProvider('event-1').overrideWith((ref) => event),
        ],
        child: MaterialApp(
          theme: CatchTheme.light,
          localizationsDelegates: AppLocalizations.localizationsDelegates,
          supportedLocales: AppLocalizations.supportedLocales,
          home: const HostEventManageRouteScreen(
            organizerId: 'club-1',
            eventId: 'event-1',
            initialSection: HostEventManageSection.report,
          ),
        ),
      ),
    );
    await tester.pump();
  }

  testWidgets('loading keeps the system screen and its title', (tester) async {
    final never = StreamController<Event?>();
    addTearDown(never.close);
    await pump(
      tester,
      uid: Stream.value('host-1'),
      organizer: Stream.value(buildOrganizer(ownerUserId: 'host-1')),
      event: never.stream,
    );
    expect(find.byType(CatchScreen), findsOneWidget);
    expect(find.byType(CatchLoadingIndicator), findsOneWidget);
    expect(find.text('Manage event'), findsOneWidget);
  });

  testWidgets('an event that is gone says so with a way back', (tester) async {
    await pump(
      tester,
      uid: Stream.value('host-1'),
      organizer: Stream.value(buildOrganizer(ownerUserId: 'host-1')),
      event: Stream.value(null),
    );
    await tester.pump();
    expect(find.byType(CatchErrorState), findsOneWidget);
    expect(find.byType(CatchErrorBackButton), findsOneWidget);
    expect(find.byType(CatchScreen), findsOneWidget);
  });

  testWidgets('a host who does not run the organizer cannot manage it', (
    tester,
  ) async {
    await pump(
      tester,
      uid: Stream.value('someone-else'),
      organizer: Stream.value(buildOrganizer(ownerUserId: 'host-1')),
      event: Stream.value(buildEvent()),
    );
    await tester.pump();
    final state = tester.widget<CatchErrorState>(find.byType(CatchErrorState));
    expect(state.icon, CatchIcons.block);
    expect(find.byType(CatchErrorBackButton), findsOneWidget);
  });
}
