import 'dart:io';
import 'dart:ui' as ui;

import 'package:catch_dating_app/chats/presentation/event_chat_controller.dart';
import 'package:catch_dating_app/chats/presentation/event_chat_participants_controller.dart';
import 'package:catch_dating_app/chats/presentation/event_chat_participants_screen.dart';
import 'package:catch_dating_app/chats/presentation/event_chat_screen.dart';
import 'package:catch_dating_app/contexts/account/data/auth_repository.dart';
import 'package:catch_dating_app/contexts/messaging/domain/event_chat.dart';
import 'package:catch_dating_app/contexts/messaging/domain/event_chat_participant.dart';
import 'package:catch_dating_app/core/theme/app_theme.dart';
import 'package:catch_dating_app/l10n/l10n.dart';
import 'package:catch_dating_app/routing/route_contract.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/material.dart';
import 'package:flutter/rendering.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:go_router/go_router.dart';

import '../support/catch_test_fonts.dart';
import '../test_pump_helpers.dart';

EventChatParticipantsState fixture({bool empty = false, bool more = false}) =>
    EventChatParticipantsState(
      uid: 'maya',
      page: EventChatParticipantPage(
        items: empty
            ? []
            : const [
                EventChatParticipant(
                  uid: 'maya',
                  displayName: 'Maya Demo',
                  isHost: true,
                ),
                EventChatParticipant(
                  uid: 'sara',
                  displayName: 'Sara RSVP Demo',
                  isHost: false,
                ),
                EventChatParticipant(
                  uid: 'arjun',
                  displayName: 'Arjun Demo',
                  isHost: false,
                ),
              ],
        nextCursor: more
            ? {'after': 'cursor', 'eventId': 'event', 'accountUid': 'maya'}
            : null,
      ),
    );

class FixtureController extends EventChatParticipantsController {
  @override
  Future<EventChatParticipantsState> build(String eventId) async => fixture();
  @override
  void setForeground(bool value) {}
}

class RoomFixtureController extends EventChatController {
  @override
  Future<EventChatState> build(String eventId) async => EventChatState(
    uid: 'maya',
    access: EventChatAccess(
      eventId: eventId,
      title: 'RSVP coffee afternoon',
      organizerId: 'rsvp',
      roomStatus: 'open',
      roomRevision: 1,
      membershipStatus: 'joined',
      membershipRevision: 1,
      canManage: true,
      canJoin: true,
      canReadMessages: true,
      profileClaimRequired: false,
      termsVersion: 'event-chat-v1',
    ),
    messages: const [],
    typing: const [],
    nextBeforeSequence: null,
    receivedAt: DateTime(2026),
    serverTimeMillis: 0,
  );
  @override
  void setForeground(bool value) {}
  @override
  void draftChanged(bool hasText) {}
}

class ScheduleFixtureController extends RoomFixtureController {
  static final _actions = <EventChatAction>[];
  static final _foregroundStates = <bool>[];

  @override
  void setForeground(bool value) => _foregroundStates.add(value);

  @override
  Future<bool> updateAccess(
    EventChatAction action, {
    required String reviewedUid,
    DateTime? opensAt,
    DateTime? closesAt,
  }) async {
    if (action == EventChatAction.archive) {
      _actions.add(action);
      return true;
    }
    if (action == EventChatAction.schedule &&
        opensAt != null &&
        closesAt != null &&
        closesAt.isAfter(opensAt)) {
      _actions.add(action);
      return true;
    }
    return false;
  }
}

void main() {
  setUpAll(loadCatchTestFonts);
  for (final dark in [false, true]) {
    for (final scale in [1.0, 2.0]) {
      testWidgets(
        'participant route is readable and opens protected profiles $dark $scale',
        (tester) async {
          tester.view.devicePixelRatio = 1;
          tester.view.physicalSize = const Size(390, 844);
          addTearDown(tester.view.resetDevicePixelRatio);
          addTearDown(tester.view.resetPhysicalSize);
          final opened = <String>[];
          final router = GoRouter(
            initialLocation: '/people',
            routes: [
              GoRoute(
                path: '/people',
                builder: (_, _) =>
                    const EventChatParticipantsScreen(eventId: 'event'),
              ),
              GoRoute(
                path: Routes.eventParticipantProfileScreen.path,
                name: Routes.eventParticipantProfileScreen.name,
                builder: (_, state) {
                  opened.add(
                    '${state.pathParameters['eventId']}/${state.pathParameters['participantUid']}',
                  );
                  return const Scaffold(body: Text('Protected profile'));
                },
              ),
            ],
          );
          addTearDown(router.dispose);
          const capture = ValueKey('capture');
          await tester.pumpWidget(
            ProviderScope(
              overrides: [
                eventChatParticipantsControllerProvider(
                  'event',
                ).overrideWith(FixtureController.new),
              ],
              child: RepaintBoundary(
                key: capture,
                child: MaterialApp.router(
                  routerConfig: router,
                  debugShowCheckedModeBanner: false,
                  theme: dark ? AppTheme.dark : AppTheme.light,
                  localizationsDelegates:
                      AppLocalizations.localizationsDelegates,
                  supportedLocales: AppLocalizations.supportedLocales,
                  builder: (context, child) => MediaQuery(
                    data: MediaQuery.of(
                      context,
                    ).copyWith(textScaler: TextScaler.linear(scale)),
                    child: child!,
                  ),
                ),
              ),
            ),
          );
          await pumpFeatureUi(tester);
          expect(find.text('Participants'), findsOneWidget);
          expect(find.text('You · Host'), findsOneWidget);
          expect(tester.takeException(), isNull);
          for (final paragraph in tester.renderObjectList<RenderParagraph>(
            find.byType(RichText),
          )) {
            expect(
              paragraph.didExceedMaxLines,
              false,
              reason: paragraph.text.toPlainText(),
            );
          }
          final directory =
              Platform.environment['CATCH_EVENT_PARTICIPANTS_CAPTURE_DIR'];
          if (directory != null) {
            await tester.runAsync(() async {
              final image = await tester
                  .renderObject<RenderRepaintBoundary>(find.byKey(capture))
                  .toImage();
              try {
                final bytes = await image.toByteData(
                  format: ui.ImageByteFormat.png,
                );
                await Directory(directory).create(recursive: true);
                await File(
                  '$directory/participants-${dark ? 'dark' : 'light'}-$scale.png',
                ).writeAsBytes(bytes!.buffer.asUint8List());
              } finally {
                image.dispose();
              }
            });
          }
          final sara = find.byKey(const ValueKey('event-participant-sara'));
          await tester.ensureVisible(sara);
          await pumpFeatureUi(tester);
          expect(tester.getSize(sara).height, greaterThanOrEqualTo(44));
          await tester.tap(sara);
          await pumpFeatureUi(tester);
          expect(opened, contains('event/sara'));
        },
      );
    }
  }
  testWidgets('room toolbar opens participants without requiring a message', (
    tester,
  ) async {
    final router = GoRouter(
      initialLocation: '/room',
      routes: [
        GoRoute(
          path: '/room',
          builder: (_, _) => const EventChatScreen(eventId: 'event'),
        ),
        GoRoute(
          path: Routes.eventChatParticipantsScreen.path,
          name: Routes.eventChatParticipantsScreen.name,
          builder: (_, _) =>
              const EventChatParticipantsScreen(eventId: 'event'),
        ),
      ],
    );
    addTearDown(router.dispose);
    await tester.pumpWidget(
      ProviderScope(
        overrides: [
          uidProvider.overrideWith((_) => Stream.value('maya')),
          eventChatControllerProvider(
            'event',
          ).overrideWith(RoomFixtureController.new),
          eventChatParticipantsControllerProvider(
            'event',
          ).overrideWith(FixtureController.new),
        ],
        child: MaterialApp.router(
          routerConfig: router,
          theme: AppTheme.light,
          localizationsDelegates: AppLocalizations.localizationsDelegates,
          supportedLocales: AppLocalizations.supportedLocales,
        ),
      ),
    );
    await pumpFeatureUi(tester);
    await tester.tap(find.byTooltip('Participants'));
    await pumpFeatureUi(tester);
    expect(find.text('Sara RSVP Demo'), findsOneWidget);
    expect(tester.takeException(), isNull);
    await tester.pumpWidget(const SizedBox.shrink());
  });
  testWidgets('schedule picker keeps room authority through modal and saves', (
    tester,
  ) async {
    ScheduleFixtureController._actions.clear();
    ScheduleFixtureController._foregroundStates.clear();
    final router = GoRouter(
      initialLocation: '/room',
      routes: [
        GoRoute(
          path: '/room',
          builder: (_, _) => EventChatScreen(
            eventId: 'event',
            pickSchedule: (context) async {
              await showDialog<void>(
                context: context,
                builder: (dialogContext) => AlertDialog(
                  title: const Text('Fixture schedule picker'),
                  actions: [
                    TextButton(
                      onPressed: () => Navigator.of(dialogContext).pop(),
                      child: const Text('Use schedule'),
                    ),
                  ],
                ),
              );
              final opensAt = DateTime.now().add(const Duration(days: 1));
              return (
                opensAt: opensAt,
                closesAt: opensAt.add(const Duration(hours: 2)),
              );
            },
          ),
        ),
      ],
    );
    addTearDown(router.dispose);
    await tester.pumpWidget(
      ProviderScope(
        overrides: [
          uidProvider.overrideWith((_) => Stream.value('maya')),
          eventChatControllerProvider(
            'event',
          ).overrideWith(ScheduleFixtureController.new),
        ],
        child: MaterialApp.router(
          routerConfig: router,
          theme: AppTheme.light,
          localizationsDelegates: AppLocalizations.localizationsDelegates,
          supportedLocales: AppLocalizations.supportedLocales,
        ),
      ),
    );
    await pumpFeatureUi(tester);
    await tester.tap(find.byTooltip('Event chat'));
    await pumpFeatureUi(tester);
    await tester.tap(find.text('Schedule room hours'));
    await pumpFeatureUi(tester);
    expect(find.text('Fixture schedule picker'), findsOneWidget);
    expect(ScheduleFixtureController._foregroundStates, isNot(contains(false)));
    await tester.tap(find.text('Use schedule'));
    await pumpFeatureUi(tester);
    expect(ScheduleFixtureController._actions, [EventChatAction.schedule]);
    expect(tester.takeException(), isNull);
    await tester.pumpWidget(const SizedBox.shrink());
  });
  testWidgets('archive needs explicit confirmation and preserves authority', (
    tester,
  ) async {
    ScheduleFixtureController._actions.clear();
    ScheduleFixtureController._foregroundStates.clear();
    final router = GoRouter(
      initialLocation: '/room',
      routes: [
        GoRoute(
          path: '/room',
          builder: (_, _) => const EventChatScreen(eventId: 'event'),
        ),
      ],
    );
    addTearDown(router.dispose);
    await tester.pumpWidget(
      ProviderScope(
        overrides: [
          uidProvider.overrideWith((_) => Stream.value('maya')),
          eventChatControllerProvider(
            'event',
          ).overrideWith(ScheduleFixtureController.new),
        ],
        child: MaterialApp.router(
          routerConfig: router,
          theme: AppTheme.light,
          localizationsDelegates: AppLocalizations.localizationsDelegates,
          supportedLocales: AppLocalizations.supportedLocales,
        ),
      ),
    );
    await pumpFeatureUi(tester);
    await tester.tap(find.byTooltip('Event chat'));
    await pumpFeatureUi(tester);
    await tester.tap(find.text('Archive room'));
    await pumpFeatureUi(tester);
    expect(ScheduleFixtureController._actions, isEmpty);
    expect(find.textContaining('cannot reopen it'), findsOneWidget);
    expect(ScheduleFixtureController._foregroundStates, isNot(contains(false)));
    await tester.tap(
      find.descendant(
        of: find.byType(Dialog),
        matching: find.widgetWithText(CatchButton, 'Archive room'),
      ),
    );
    await pumpFeatureUi(tester);
    expect(ScheduleFixtureController._actions, [EventChatAction.archive]);
    expect(tester.takeException(), isNull);
    await tester.pumpWidget(const SizedBox.shrink());
  });
  testWidgets('manager sees removed member action without profile navigation', (
    tester,
  ) async {
    final managed = <String>[];
    final opened = <String>[];
    final state = EventChatParticipantsState(
      uid: 'maya',
      access: const EventChatAccess(
        eventId: 'event',
        title: 'RSVP coffee afternoon',
        organizerId: 'rsvp',
        roomStatus: 'open',
        roomRevision: 1,
        membershipStatus: 'joined',
        membershipRevision: 1,
        canManage: true,
        canJoin: true,
        canReadMessages: true,
        profileClaimRequired: false,
        termsVersion: 'event-chat-v1',
      ),
      page: EventChatParticipantPage(
        items: const [
          EventChatParticipant(
            uid: 'sara',
            displayName: 'Sara RSVP Demo',
            isHost: false,
            membershipStatus: 'removed',
            membershipRevision: 2,
          ),
        ],
        nextCursor: null,
      ),
    );
    await tester.pumpWidget(
      MaterialApp(
        theme: AppTheme.light,
        localizationsDelegates: AppLocalizations.localizationsDelegates,
        supportedLocales: AppLocalizations.supportedLocales,
        home: Scaffold(
          body: EventChatParticipantsRowList(
            state: state,
            onOpen: opened.add,
            onLoadMore: () {},
            onManage: (person, action) => managed.add('${person.uid}/$action'),
          ),
        ),
      ),
    );
    await pumpFeatureUi(tester);
    expect(find.textContaining('Removed from room'), findsOneWidget);
    await tester.tap(find.text('Sara RSVP Demo'));
    expect(opened, isEmpty);
    await tester.tap(find.byTooltip('Member actions'));
    await pumpFeatureUi(tester);
    await tester.tap(find.text('Allow rejoin'));
    expect(managed, ['sara/reinstate']);
    expect(tester.takeException(), isNull);
  });
  testWidgets(
    'empty filtered page preserves continuation instead of declaring the room empty',
    (tester) async {
      var continued = 0;
      await tester.pumpWidget(
        MaterialApp(
          theme: AppTheme.light,
          localizationsDelegates: AppLocalizations.localizationsDelegates,
          supportedLocales: AppLocalizations.supportedLocales,
          home: CatchRouteScaffold(
            topBarBuilder: (_, _) =>
                const CatchTopBar.route(title: 'Participants'),
            body: CatchRouteBody.standardConstrained(
              child: EventChatParticipantsRowList(
                state: fixture(empty: true, more: true),
                onOpen: (_) {},
                onLoadMore: () => continued++,
              ),
            ),
          ),
        ),
      );
      await pumpFeatureUi(tester);
      expect(find.textContaining('Continue to check'), findsOneWidget);
      expect(find.text('No participants are available to show.'), findsNothing);
      await tester.tap(find.text('Show more participants'));
      expect(continued, 1);
    },
  );
}
