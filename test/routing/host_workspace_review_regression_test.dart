import 'dart:async';

import 'package:catch_dating_app/chats/presentation/event_chat_controller.dart';
import 'package:catch_dating_app/chats/presentation/event_chat_participants_controller.dart';
import 'package:catch_dating_app/chats/presentation/event_chat_participants_screen.dart';
import 'package:catch_dating_app/chats/presentation/event_chat_screen.dart';
import 'package:catch_dating_app/contexts/account/data/auth_repository.dart';
import 'package:catch_dating_app/core/analytics/app_analytics.dart';
import 'package:catch_dating_app/core/theme/app_theme.dart';
import 'package:catch_dating_app/hosts/presentation/forms/host_response_offer_preferences_route_screen.dart';
import 'package:catch_dating_app/l10n/l10n.dart';
import 'package:catch_dating_app/routing/go_router.dart';
import 'package:catch_dating_app/routing/host_navigation_workspace.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:go_router/go_router.dart';

import '../chats/event_chat_participants_widget_test.dart'
    show FixtureController, RoomFixtureController;
import '../test_pump_helpers.dart';

void main() {
  testWidgets('expanded Manage can open Guests twice and retain both drafts', (
    tester,
  ) async {
    final router = workspaceRouter();
    addTearDown(router.dispose);
    await pumpWorkspace(tester, router);
    await tester.enterText(
      find.byKey(const ValueKey('manage-draft')),
      'Manage draft',
    );
    await tester.tap(find.text('Open Guests'));
    await pumpFeatureUi(tester);
    await tester.enterText(
      find.byKey(const ValueKey('guests-draft')),
      'Guests draft',
    );
    await tester.tap(find.text('Open Guests'));
    await pumpFeatureUi(tester);
    expect(tester.takeException(), isNull);
    expect(find.text('Manage draft'), findsOneWidget);
    expect(find.text('Guests draft'), findsOneWidget);
    router.pop();
    await pumpFeatureUi(tester);
    expect(find.text('Guests draft'), findsOneWidget);
    router.pop();
    await pumpFeatureUi(tester);
    expect(find.text('Manage draft'), findsOneWidget);
    expect(find.byKey(const ValueKey('guests-draft')), findsNothing);
    expect(tester.takeException(), isNull);
  });

  for (final destination in [
    Routes.eventChatParticipantsScreen,
    Routes.eventProfileSharingScreen,
  ]) {
    testWidgets(
      'Manage Chat ${destination.name} keeps organizer and ancestor state',
      (tester) async {
        final router = workspaceRouter();
        addTearDown(router.dispose);
        await pumpWorkspace(tester, router);
        await tester.enterText(
          find.byKey(const ValueKey('manage-draft')),
          'Manage draft',
        );
        unawaited(
          router.pushNamed<void>(
            Routes.eventChatScreen.name,
            pathParameters: {'eventId': 'event'},
            queryParameters: {'organizerId': 'organizer'},
          ),
        );
        await pumpFeatureUi(tester);
        final action = tester
            .widgetList<CatchIconAction>(find.byType(CatchIconAction))
            .singleWhere(
              (widget) =>
                  widget.tooltip ==
                  (destination == Routes.eventChatParticipantsScreen
                      ? 'Participants'
                      : 'My event profile'),
            );
        action.onPressed!();
        await pumpFeatureUi(tester);
        expect(router.state.uri.queryParameters['organizerId'], 'organizer');
        expect(find.text('Manage draft'), findsOneWidget);
        expect(find.text(destination.name), findsOneWidget);
        router.pop();
        await pumpFeatureUi(tester);
        router.pop();
        await pumpFeatureUi(tester);
        expect(find.text('Manage draft'), findsOneWidget);
        expect(tester.takeException(), isNull);
      },
    );
  }

  testWidgets(
    'Manage Chat Participants person keeps organizer and Manage state',
    (tester) async {
      final router = workspaceRouter(realParticipants: true);
      addTearDown(router.dispose);
      await pumpWorkspace(tester, router);
      final manage = find.byWidgetPredicate(
        (widget) => widget is _Draft && widget.id == 'manage',
        skipOffstage: false,
      );
      final manageState = tester.state<_DraftState>(manage);
      await tester.enterText(
        find.byKey(const ValueKey('manage-draft')),
        'Manage draft through profile',
      );
      unawaited(
        router.pushNamed<void>(
          Routes.eventChatScreen.name,
          pathParameters: {'eventId': 'event'},
          queryParameters: {'organizerId': 'organizer'},
        ),
      );
      await pumpFeatureUi(tester);
      final participantsAction = tester
          .widgetList<CatchIconAction>(find.byType(CatchIconAction))
          .singleWhere((widget) => widget.tooltip == 'Participants');
      participantsAction.onPressed!();
      await pumpFeatureUi(tester);
      expect(
        find.byKey(
          const ValueKey('event-participant-sara'),
          skipOffstage: false,
        ),
        findsOneWidget,
      );
      final participantsUri = router.state.uri;
      expect(
        participantsUri.path,
        Routes.eventChatParticipantsScreen.path.replaceAll(':eventId', 'event'),
      );
      expect(participantsUri.queryParameters['organizerId'], 'organizer');
      tester
          .widget<EventChatParticipantsRowList>(
            find.byType(EventChatParticipantsRowList),
          )
          .onOpen('sara');
      await pumpFeatureUi(tester);
      final uri = router.state.uri;
      expect(
        uri.path,
        Routes.eventParticipantProfileScreen.path
            .replaceAll(':eventId', 'event')
            .replaceAll(':participantUid', 'sara'),
      );
      expect(uri.queryParameters['organizerId'], 'organizer');
      expect(tester.state<_DraftState>(manage), same(manageState));
      expect(
        find.text('Manage draft through profile', skipOffstage: false),
        findsOneWidget,
      );
      // Chat and Participants use their real widgets/callbacks. The terminal
      // profile is a destination sentinel; profile internals are out of scope.
      expect(
        find.text(Routes.eventParticipantProfileScreen.name),
        findsOneWidget,
      );
      for (final expected in [
        Routes.eventChatParticipantsScreen,
        Routes.eventChatScreen,
        Routes.hostAppEventManageScreen,
      ]) {
        router.pop();
        await pumpFeatureUi(tester);
        expect(
          router.state.uri.path,
          expected.path
              .replaceAll(':eventId', 'event')
              .replaceAll(':clubId', 'organizer'),
        );
        expect(router.state.uri.queryParameters['organizerId'], 'organizer');
        expect(tester.state<_DraftState>(manage), same(manageState));
        expect(tester.takeException(), isNull);
      }
      expect(find.text('Manage draft through profile'), findsOneWidget);
    },
  );

  for (final destination in [
    Routes.hostResponseOfferPreferencesScreen,
    Routes.hostResponseQueryOfferPreferencesScreen,
  ]) {
    testWidgets(
      'direct ${destination.name} Back reaches its contextual parent',
      (tester) async {
        final routes = hostWorkspaceRouteGraph(AppAnalytics()).branches
            .expand((branch) => branch.routes.single.routes)
            .whereType<HostWorkspaceDestination>()
            .toList();
        final route = routes.singleWhere(
          (route) => route.name == destination.name,
        );
        final parent = routes.singleWhere(
          (item) => item.name == route.parent!.name,
        );
        final parameters = {
          'responseId': 'response',
          'eventId': 'event',
          'formId': 'form',
        };
        String location(String path) =>
            path.replaceAllMapped(RegExp(r':(\w+)'), (m) => parameters[m[1]]!);
        final uri = Uri(
          path: location(route.path),
          queryParameters: {
            'organizerId': 'organizer',
            '_parentQueryFormId': 'form',
          },
        );
        final router = GoRouter(
          initialLocation: uri.toString(),
          routes: [
            route,
            GoRoute(
              path: parent.path,
              builder: (_, _) =>
                  const Material(child: Text('Contextual offer')),
            ),
          ],
        );
        addTearDown(router.dispose);
        await pumpWorkspace(tester, router, signedIn: false);
        tester
            .widget<HostResponseOfferPreferencesRouteScreen>(
              find.byType(HostResponseOfferPreferencesRouteScreen),
            )
            .onBack();
        await pumpFeatureUi(tester);
        expect(tester.takeException(), isNull);
        expect(router.state.uri.path, location(parent.path));
        expect(router.state.uri.queryParameters['organizerId'], 'organizer');
        expect(router.state.uri.queryParameters['_parentQueryFormId'], 'form');
      },
    );
  }
}

Future<void> pumpWorkspace(
  WidgetTester tester,
  GoRouter router, {
  bool signedIn = true,
}) async {
  tester.view.devicePixelRatio = 1;
  tester.view.physicalSize = const Size(1700, 900);
  addTearDown(tester.view.resetDevicePixelRatio);
  addTearDown(tester.view.resetPhysicalSize);
  await tester.pumpWidget(
    ProviderScope(
      overrides: [
        uidProvider.overrideWith((_) => Stream.value(signedIn ? 'maya' : null)),
        eventChatControllerProvider(
          'event',
        ).overrideWith(RoomFixtureController.new),
        eventChatParticipantsControllerProvider(
          'event',
        ).overrideWith(FixtureController.new),
      ],
      child: MaterialApp.router(
        theme: AppTheme.light,
        localizationsDelegates: AppLocalizations.localizationsDelegates,
        supportedLocales: AppLocalizations.supportedLocales,
        routerConfig: router,
      ),
    ),
  );
  await pumpFeatureUi(tester);
}

GoRouter workspaceRouter({bool realParticipants = false}) {
  final production = hostWorkspaceRouteGraph(AppAnalytics()).branches
      .expand((branch) => branch.routes.single.routes)
      .whereType<HostWorkspaceDestination>();
  final routes = [
    for (final route in production)
      if ({
        Routes.hostAppEventManageScreen.name,
        Routes.hostEventRosterScreen.name,
        Routes.eventChatScreen.name,
        Routes.eventChatParticipantsScreen.name,
        Routes.eventProfileSharingScreen.name,
        Routes.eventParticipantProfileScreen.name,
      }.contains(route.name))
        HostWorkspaceDestination(
          root: route.root,
          path: route.path,
          name: route.name,
          parent: route.parent,
          contextualParent: route.contextualParent,
          builder: (context, state) => route.name == Routes.eventChatScreen.name
              ? const EventChatScreen(eventId: 'event')
              : route.name == Routes.hostAppEventManageScreen.name
              ? const _Draft('manage', guests: true)
              : route.name == Routes.hostEventRosterScreen.name
              ? const _Draft('guests')
              : realParticipants &&
                    route.name == Routes.eventChatParticipantsScreen.name
              ? const EventChatParticipantsScreen(eventId: 'event')
              : Material(child: Text(route.name!)),
        ),
  ];
  return GoRouter(
    initialLocation:
        '/host/organizers/organizer/events/event/manage?organizerId=organizer',
    routes: [
      ShellRoute(
        builder: (context, state, child) {
          final route = routes.singleWhere(
            (route) => route.path == state.fullPath,
          );
          final ancestors = hostWorkspaceAncestors(routes, route, state);
          return HostWorkspaceRouteFrame(
            index: const HostNavigationWorkspace(
              spec: HostTaskWorkspace(content: Material(child: Text('Events'))),
            ),
            navigator: child,
            selectedRoute: route.name,
            selectedContentId: hostWorkspaceContentId(
              route.name!,
              route.path,
              state.pathParameters,
            ),
            ancestors: [
              for (final ancestor in ancestors)
                CatchWorkspacePane(
                  id: ancestor.name!,
                  child: ancestor.builder!(
                    context,
                    hostWorkspaceAncestorState(context, ancestor, state),
                  ),
                ),
            ],
            onBack: () => context.pop(),
          );
        },
        routes: routes,
      ),
    ],
  );
}

class _Draft extends StatefulWidget {
  const _Draft(this.id, {this.guests = false});
  final String id;
  final bool guests;
  @override
  State<_Draft> createState() => _DraftState();
}

class _DraftState extends State<_Draft> {
  final controller = TextEditingController();
  @override
  void dispose() {
    controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) => Material(
    child: Column(
      children: [
        TextField(key: ValueKey('${widget.id}-draft'), controller: controller),
        if (widget.guests)
          TextButton(
            onPressed: () => context.pushNamed(
              Routes.hostEventRosterScreen.name,
              pathParameters: {'clubId': 'organizer', 'eventId': 'event'},
              queryParameters: {'organizerId': 'organizer'},
            ),
            child: const Text('Open Guests'),
          ),
      ],
    ),
  );
}
