import 'package:catch_dating_app/chats/presentation/chat_screen.dart';
import 'package:catch_dating_app/chats/presentation/inbox/chat_inbox_screen.dart';
import 'package:catch_dating_app/chats/presentation/inbox/chats_list_view_model.dart';
import 'package:catch_dating_app/chats/presentation/inbox/widgets/chats_sliver_header.dart';
import 'package:catch_dating_app/contexts/account/data/auth_repository.dart';
import 'package:catch_dating_app/contexts/connections/data/match_repository.dart';
import 'package:catch_dating_app/contexts/connections/domain/match.dart';
import 'package:catch_dating_app/contexts/events/data/event_repository.dart';
import 'package:catch_dating_app/contexts/events/domain/event.dart';
import 'package:catch_dating_app/contexts/messaging/data/conversation_repository.dart';
import 'package:catch_dating_app/contexts/messaging/data/suvbot_repository.dart';
import 'package:catch_dating_app/contexts/messaging/domain/chat_message.dart';
import 'package:catch_dating_app/contexts/organizers/data/organizers_repository.dart';
import 'package:catch_dating_app/contexts/profiles/data/public_profile_repository.dart';
import 'package:catch_dating_app/contexts/profiles/domain/public_profile.dart';
import 'package:catch_dating_app/contexts/safety/data/safety_repository.dart';
import 'package:catch_dating_app/design_fixtures/matches_chat_surface_fixtures.dart';
import 'package:catch_dating_app/platform/app_config.dart';
import 'package:catch_dating_app/platform/device/external_share.dart';
import 'package:catch_dating_app/platform/theme/app_theme.dart';
import 'package:catch_dating_app/routing/go_router.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_riverpod/misc.dart' show Override;
import 'package:go_router/go_router.dart';

import '../../support/widgetbook_harness.dart';
import 'fixtures.dart';

class WidgetbookMatchesMatchesListRouteScope extends StatelessWidget {
  const WidgetbookMatchesMatchesListRouteScope({
    super.key,
    required this.viewModel,
    required this.matches,
    this.uid = MatchesChatSurfaceFixtures.viewerUid,
    this.query = '',
    this.initialLocation = '/chats',
    this.themeMode = ThemeMode.light,
    this.child,
  });

  final AsyncValue<ChatsListViewModel> viewModel;
  final List<Match> matches;
  final String? uid;
  final String query;
  final String initialLocation;
  final ThemeMode themeMode;
  final Widget? child;

  @override
  Widget build(BuildContext context) {
    final effectiveUid = uid;
    final matchRepository = MatchesChatFixtureMatchRepository(matches: matches);

    return WidgetbookFixtureScope(
      key: ValueKey(query),
      overrides: [
        // Seed the local provider before its first consumer mounts. A nested
        // scope otherwise inherits search state from sibling preview cards.
        chatSearchQueryProvider.overrideWithBuild(
          (ref, notifier) => query.trimLeft(),
        ),
        uidProvider.overrideWithValue(AsyncData<String?>(effectiveUid)),
        chatsListViewModelProvider.overrideWithValue(viewModel),
        matchRepositoryProvider.overrideWithValue(matchRepository),
        conversationRepositoryProvider.overrideWithValue(
          MatchesChatFixtureConversationRepository(
            messagesByConversationId: {
              widgetbookMatchesTaylorMatch.id:
                  MatchesChatSurfaceFixtures.conversationMessages,
              for (final match in matches) match.id: const <ChatMessage>[],
            },
          ),
        ),
        if (effectiveUid != null)
          watchMatchesForUserProvider(
            effectiveUid,
          ).overrideWith((ref) => Stream<List<Match>>.value(matches)),
        watchEventProvider(
          MatchesChatSurfaceFixtures.eventId,
        ).overrideWith((ref) => Stream<Event?>.value(widgetbookMatchesEvent)),
        watchOrganizerProvider(
          MatchesChatSurfaceFixtures.organizerId,
        ).overrideWith((ref) => Stream.value(widgetbookMatchesOrganizer)),
        ..._publicProfileOverrides,
      ],
      child:
          child ??
          _MatchesListRouter(
            initialLocation: initialLocation,
            themeMode: themeMode,
          ),
    );
  }
}

class WidgetbookMatchesChatRouteScope extends StatelessWidget {
  const WidgetbookMatchesChatRouteScope({
    super.key,
    this.uid = MatchesChatSurfaceFixtures.viewerUid,
    this.match,
    this.matchId,
    this.messages,
    this.matchLoading = false,
    this.matchError,
    this.messagesLoading = false,
    this.messagesError,
    this.includeEvent = true,
    this.hostRoute = false,
    this.themeMode = ThemeMode.light,
    this.suvbotRepository = const MatchesChatFixtureSuvbotRepository(),
  });

  final String? uid;
  final Match? match;
  final String? matchId;
  final List<ChatMessage>? messages;
  final bool matchLoading;
  final Object? matchError;
  final bool messagesLoading;
  final Object? messagesError;
  final bool includeEvent;
  final bool hostRoute;
  final ThemeMode themeMode;
  final SuvbotRepository suvbotRepository;

  @override
  Widget build(BuildContext context) {
    final id = matchId ?? match?.id ?? 'design-chat-missing';
    final effectiveMessages =
        messages ?? MatchesChatSurfaceFixtures.conversationMessages;
    final matches = match == null ? <Match>[] : <Match>[match!];
    final matchRepository = MatchesChatFixtureMatchRepository(
      matches: matches,
      matchById: {id: match},
      matchError: matchError,
    );
    final conversationRepository = MatchesChatFixtureConversationRepository(
      messagesByConversationId: {id: effectiveMessages},
      loading: messagesLoading,
      messagesError: messagesError,
      failSends: true,
    );

    return WidgetbookFixtureScope(
      overrides: [
        uidProvider.overrideWithValue(AsyncData<String?>(uid)),
        matchRepositoryProvider.overrideWithValue(matchRepository),
        conversationRepositoryProvider.overrideWithValue(
          conversationRepository,
        ),
        suvbotRepositoryProvider.overrideWithValue(suvbotRepository),
        safetyRepositoryProvider.overrideWithValue(
          const MatchesChatFixtureSafetyRepository(),
        ),
        externalShareControllerProvider.overrideWithValue(
          ExternalShareController((_) async {}),
        ),
        matchStreamProvider(id).overrideWith((ref) {
          if (matchLoading) return MatchesChatSurfaceFixtures.loadingStream();
          if (matchError != null) {
            return Stream<Match?>.error(matchError!, StackTrace.empty);
          }
          return Stream<Match?>.value(match);
        }),
        watchConversationMessagesProvider(id).overrideWith(
          (ref) => conversationRepository.watchMessages(conversationId: id),
        ),
        watchEventProvider(MatchesChatSurfaceFixtures.eventId).overrideWith(
          (ref) => Stream<Event?>.value(
            includeEvent ? widgetbookMatchesEvent : null,
          ),
        ),
        watchOrganizerProvider(
          MatchesChatSurfaceFixtures.organizerId,
        ).overrideWith((ref) => Stream.value(widgetbookMatchesOrganizer)),
        ..._publicProfileOverrides,
      ],
      child: _ChatRouter(
        initialLocation: hostRoute
            ? '${Routes.hostInboxScreen.path}/$id'
            : '${Routes.matchesListScreen.path}/$id',
        themeMode: themeMode,
      ),
    );
  }
}

class _MatchesListRouter extends StatelessWidget {
  const _MatchesListRouter({
    required this.initialLocation,
    required this.themeMode,
  });

  final String initialLocation;
  final ThemeMode themeMode;

  @override
  Widget build(BuildContext context) {
    final router = GoRouter(
      initialLocation: initialLocation,
      routes: [
        GoRoute(
          path: Routes.matchesListScreen.path,
          name: Routes.matchesListScreen.name,
          builder: (_, _) =>
              const ChatsListScreen(initialScope: ConsumerChatScope.messages),
          routes: [
            GoRoute(
              path: ':matchId',
              name: Routes.chatScreen.name,
              builder: (_, state) => ChatScreen(
                matchId: state.pathParameters['matchId']!,
                otherProfile: _profileForRouteExtra(state.extra),
              ),
            ),
          ],
        ),
        GoRoute(
          path: Routes.hostInboxScreen.path,
          name: Routes.hostInboxScreen.name,
          builder: (_, _) =>
              const ChatsListScreen(initialScope: ConsumerChatScope.messages),
          routes: [
            GoRoute(
              path: ':matchId',
              name: Routes.hostChatScreen.name,
              builder: (_, state) => ChatScreen(
                matchId: state.pathParameters['matchId']!,
                otherProfile: _profileForRouteExtra(state.extra),
              ),
            ),
          ],
        ),
        _publicProfileRoute,
      ],
    );

    return MaterialApp.router(
      debugShowCheckedModeBanner: false,
      theme: AppTheme.light,
      darkTheme: AppTheme.dark,
      themeMode: themeMode,
      routerConfig: router,
    );
  }
}

class _ChatRouter extends StatelessWidget {
  const _ChatRouter({
    required this.initialLocation,
    this.themeMode = ThemeMode.light,
  });

  final String initialLocation;
  final ThemeMode themeMode;

  @override
  Widget build(BuildContext context) {
    final router = GoRouter(
      initialLocation: initialLocation,
      routes: [
        GoRoute(
          path: Routes.chatScreen.path,
          name: Routes.chatScreen.name,
          builder: (_, state) => ChatScreen(
            matchId: state.pathParameters['matchId']!,
            otherProfile: _profileForRouteExtra(state.extra),
          ),
        ),
        GoRoute(
          path: Routes.hostChatScreen.path,
          name: Routes.hostChatScreen.name,
          builder: (_, state) => ChatScreen(
            matchId: state.pathParameters['matchId']!,
            otherProfile: _profileForRouteExtra(state.extra),
          ),
        ),
        _publicProfileRoute,
      ],
    );

    return MaterialApp.router(
      debugShowCheckedModeBanner: false,
      theme: AppTheme.light,
      darkTheme: AppTheme.dark,
      themeMode: themeMode,
      routerConfig: router,
    );
  }
}

final _publicProfileRoute = GoRoute(
  path: Routes.publicProfileScreen.path,
  name: Routes.publicProfileScreen.name,
  builder: (context, state) {
    final uid = state.pathParameters['uid']!;
    final profile = MatchesChatSurfaceFixtures.profileFor(uid);
    return Scaffold(
      body: Center(
        child: Text(profile.name, style: CatchTextStyles.titleL(context)),
      ),
    );
  },
);

PublicProfile? _profileForRouteExtra(Object? extra) {
  return extra is PublicProfile ? extra : null;
}

class WidgetbookMatchesAppRoleBoundary extends StatefulWidget {
  const WidgetbookMatchesAppRoleBoundary({
    super.key,
    required this.role,
    required this.child,
  });

  final AppRole role;
  final Widget child;

  @override
  State<WidgetbookMatchesAppRoleBoundary> createState() =>
      _AppRoleBoundaryState();
}

class _AppRoleBoundaryState extends State<WidgetbookMatchesAppRoleBoundary> {
  @override
  void initState() {
    super.initState();
    AppConfig.configureEntrypointRole(widget.role);
  }

  @override
  void didUpdateWidget(covariant WidgetbookMatchesAppRoleBoundary oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (oldWidget.role != widget.role) {
      AppConfig.configureEntrypointRole(widget.role);
    }
  }

  @override
  Widget build(BuildContext context) {
    AppConfig.configureEntrypointRole(widget.role);
    return widget.child;
  }
}

List<Override> get _publicProfileOverrides {
  const uids = [
    MatchesChatSurfaceFixtures.taylorUid,
    MatchesChatSurfaceFixtures.morganUid,
    MatchesChatSurfaceFixtures.guestUid,
    'design-chat-guest-2',
    'design-chat-isha',
  ];
  return [
    for (final uid in uids)
      watchPublicProfileProvider(uid).overrideWith(
        (ref) => Stream<PublicProfile?>.value(
          MatchesChatSurfaceFixtures.profileFor(uid),
        ),
      ),
  ];
}
