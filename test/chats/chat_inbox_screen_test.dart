import 'package:catch_dating_app/chats/presentation/chat_screen.dart';
import 'package:catch_dating_app/chats/presentation/inbox/chat_inbox_screen.dart';
import 'package:catch_dating_app/chats/presentation/inbox/chats_list_celebration_controller.dart';
import 'package:catch_dating_app/chats/presentation/inbox/chats_list_screen_state.dart';
import 'package:catch_dating_app/chats/presentation/inbox/chats_list_view_model.dart';
import 'package:catch_dating_app/chats/presentation/inbox/chats_search_header_controller.dart';
import 'package:catch_dating_app/chats/presentation/inbox/host_inbox_filter.dart';
import 'package:catch_dating_app/chats/presentation/inbox/widgets/chats_sliver_header.dart';
import 'package:catch_dating_app/contexts/account/data/auth_repository.dart';
import 'package:catch_dating_app/contexts/connections/data/match_repository.dart';
import 'package:catch_dating_app/contexts/connections/domain/match.dart';
import 'package:catch_dating_app/contexts/messaging/data/conversation_repository.dart';
import 'package:catch_dating_app/contexts/messaging/domain/chat_message.dart';
import 'package:catch_dating_app/contexts/organizers/data/clubs_repository.dart';
import 'package:catch_dating_app/contexts/organizers/domain/club.dart';
import 'package:catch_dating_app/contexts/profiles/data/public_profile_repository.dart';
import 'package:catch_dating_app/contexts/profiles/domain/public_profile.dart';
import 'package:catch_dating_app/platform/app_config.dart';
import 'package:catch_dating_app/platform/catch_async_state.dart';
import 'package:catch_dating_app/platform/theme/app_theme.dart';
import 'package:catch_dating_app/routing/go_router.dart';
import 'package:catch_tokens/catch_tokens.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:go_router/go_router.dart';

import '../clubs/clubs_test_helpers.dart' as club_test;
import '../events/events_test_helpers.dart';
import '../test_pump_helpers.dart';

class _FakeMatchRepository extends Fake implements MatchRepository {
  _FakeMatchRepository({required this.matches, this.match});

  final List<Match> matches;
  final Match? match;

  @override
  Future<void> resetUnread({
    required String matchId,
    required String uid,
  }) async {}

  @override
  Stream<Match?> watchMatch({required String matchId}) => Stream.value(match);

  @override
  Stream<List<Match>> watchMatchesForUser({required String uid}) =>
      Stream.value(matches);
}

class _FakeConversationRepository implements ConversationRepository {
  final List<(String matchId, String uid)> markReadCalls = [];

  @override
  Future<ConversationMessagePage> fetchMessagesPage({
    required String conversationId,
    ConversationMessageCursor? cursor,
  }) async => const ConversationMessagePage(messages: []);

  @override
  Future<void> sendTextMessage({
    required String conversationId,
    required String senderId,
    required String text,
    String? messageId,
  }) async {}

  @override
  Stream<List<ChatMessage>> watchMessages({required String conversationId}) =>
      const Stream.empty();

  @override
  Future<String> createMessageId({required String conversationId}) async =>
      'message-1';

  @override
  Future<void> sendImageMessage({
    required String conversationId,
    required String senderId,
    required String messageId,
    required String imageUrl,
  }) async {}

  @override
  Future<void> markRead({
    required String conversationId,
    required String uid,
  }) async {
    markReadCalls.add((conversationId, uid));
  }
}

Match _buildMatch({
  String id = 'match-1',
  String user1Id = 'runner-1',
  String user2Id = 'runner-2',
  DateTime? createdAt,
  DateTime? lastMessageAt,
  String? lastMessagePreview,
  String? lastMessageSenderId,
  Map<String, int> unreadCounts = const {},
  MatchConversationType conversationType = MatchConversationType.match,
  String? clubId,
}) {
  return Match(
    id: id,
    user1Id: user1Id,
    user2Id: user2Id,
    eventIds: const ['event-1'],
    createdAt: createdAt ?? DateTime(2026, 4, 23, 9),
    lastMessageAt: lastMessageAt,
    lastMessagePreview: lastMessagePreview,
    lastMessageSenderId: lastMessageSenderId,
    unreadCounts: unreadCounts,
    conversationType: conversationType,
    clubId: clubId,
  );
}

ChatsListViewModel _stateTestViewModel({
  List<ChatThreadPreview> newMatches = const <ChatThreadPreview>[],
  List<ChatThreadPreview> conversations = const <ChatThreadPreview>[],
}) {
  return ChatsListViewModel(
    newMatches: List.unmodifiable(newMatches),
    conversations: List.unmodifiable(conversations),
    totalThreadCount: newMatches.length + conversations.length,
  );
}

ChatThreadPreview _previewForStateTest({
  required Match match,
  int unreadCount = 0,
}) {
  return ChatThreadPreview(
    match: match,
    matchId: match.id,
    otherUid: match.user1Id,
    displayName: 'Asha Guest',
    photoUrl: null,
    previewText: match.lastMessagePreview ?? 'Ask the host',
    timestamp: match.lastMessageAt ?? match.createdAt,
    unreadCount: unreadCount,
    hasConversation: match.lastMessagePreview != null,
    eventIds: match.eventIds,
  );
}

void main() {
  tearDown(AppConfig.resetEntrypointRoleOverrideForTesting);

  group('HostInboxScreenState', () {
    test('chats view model propagates uid auth errors', () {
      final error = StateError('auth failed');
      final container = ProviderContainer(
        overrides: [
          uidProvider.overrideWithValue(
            AsyncError<String?>(error, StackTrace.empty),
          ),
        ],
      );
      addTearDown(container.dispose);

      final viewModel = container.read(chatsListViewModelProvider);

      expect(viewModel.hasError, isTrue);
      expect(viewModel.error, same(error));
    });

    test('computes host filter, unread count, and visible rows', () {
      final unread = _previewForStateTest(
        match: _buildMatch(
          id: 'host-unread',
          unreadCounts: const {'host-1': 3},
          conversationType: MatchConversationType.clubHostInquiry,
        ),
        unreadCount: 3,
      );
      final read = _previewForStateTest(
        match: _buildMatch(
          id: 'host-read',
          conversationType: MatchConversationType.clubHostInquiry,
        ),
      );

      final state = HostInboxScreenState.fromAsync(
        viewModel: CatchAsyncState<ChatsListViewModel>.data(
          _stateTestViewModel(conversations: [unread, read]),
        ),
        uid: const CatchAsyncState<String?>.data('host-1'),
        query: '',
        selectedFilter: HostInboxFilter.unread,
        isHostApp: true,
      );

      expect(state.hostFilter, HostInboxFilter.unread);
      expect(state.unreadThreadCount, 1);
      expect(state.showSearchAction, isTrue);
      final content = state.displayState as ChatsListContent;
      expect(content.viewModel.visibleThreadCount, 1);
      expect(content.viewModel.conversations.single.matchId, 'host-unread');
    });

    test('maps search and unread empty states', () {
      final searchEmpty = HostInboxScreenState.fromAsync(
        viewModel: const CatchAsyncState<ChatsListViewModel>.data(
          ChatsListViewModel(
            newMatches: <ChatThreadPreview>[],
            conversations: <ChatThreadPreview>[],
            totalThreadCount: 2,
          ),
        ),
        uid: const CatchAsyncState<String?>.data('host-1'),
        query: 'no matching attendee',
        selectedFilter: HostInboxFilter.all,
        isHostApp: true,
      );
      expect(
        (searchEmpty.displayState as ChatsListEmpty).kind,
        ChatsListEmptyKind.noHostSearchResults,
      );

      final noUnread = HostInboxScreenState.fromAsync(
        viewModel: CatchAsyncState<ChatsListViewModel>.data(
          _stateTestViewModel(
            conversations: [
              _previewForStateTest(
                match: _buildMatch(
                  id: 'host-read',
                  conversationType: MatchConversationType.clubHostInquiry,
                ),
              ),
            ],
          ),
        ),
        uid: const CatchAsyncState<String?>.data('host-1'),
        query: '',
        selectedFilter: HostInboxFilter.unread,
        isHostApp: true,
      );
      expect(
        (noUnread.displayState as ChatsListEmpty).kind,
        ChatsListEmptyKind.noUnreadQueries,
      );
    });

    test('maps async loading and error branches', () {
      final loading = HostInboxScreenState.fromAsync(
        viewModel: const CatchAsyncState<ChatsListViewModel>.loading(),
        uid: const CatchAsyncState<String?>.data('host-1'),
        query: '',
        selectedFilter: HostInboxFilter.all,
        isHostApp: true,
      );
      expect(loading.displayState, isA<ChatsListLoading>());
      expect(loading.showSearchAction, isFalse);

      final error = StateError('host inbox failed');
      final failed = HostInboxScreenState.fromAsync(
        viewModel: CatchAsyncState<ChatsListViewModel>.error(error),
        uid: const CatchAsyncState<String?>.data('host-1'),
        query: '',
        selectedFilter: HostInboxFilter.all,
        isHostApp: true,
      );
      final errorState = failed.displayState as ChatsListError;
      expect(errorState.error, same(error));
      expect(errorState.retryIntent, ChatsListRetryIntent.reloadViewModel);

      final authError = StateError('auth failed');
      final authFailed = HostInboxScreenState.fromAsync(
        viewModel: const CatchAsyncState<ChatsListViewModel>.data(
          ChatsListViewModel(
            newMatches: <ChatThreadPreview>[],
            conversations: <ChatThreadPreview>[],
            totalThreadCount: 0,
          ),
        ),
        uid: CatchAsyncState<String?>.error(authError),
        query: '',
        selectedFilter: HostInboxFilter.all,
        isHostApp: true,
      );
      expect((authFailed.displayState as ChatsListError).error, authError);
    });
  });

  group('ChatsListCelebrationController', () {
    test('selects newly arrived consumer matches only', () {
      const controller = ChatsListCelebrationController();
      final existing = _buildMatch(id: 'existing');
      final arrived = _buildMatch(id: 'arrived');

      expect(
        controller.newMatchesToCelebrate(
          previous: AsyncData<List<Match>>([existing]),
          next: AsyncData<List<Match>>([existing, arrived]),
          isHostApp: false,
        ),
        [arrived],
      );
      expect(
        controller.newMatchesToCelebrate(
          previous: AsyncData<List<Match>>([existing]),
          next: AsyncData<List<Match>>([existing, arrived]),
          isHostApp: true,
        ),
        isEmpty,
      );
      expect(
        controller.newMatchesToCelebrate(
          previous: null,
          next: AsyncData<List<Match>>([arrived]),
          isHostApp: false,
        ),
        isEmpty,
      );
      final eventPlan = _buildMatch(
        id: 'event-plan',
        conversationType: MatchConversationType.crossPathsEventPlan,
      );
      expect(
        controller.newMatchesToCelebrate(
          previous: const AsyncData<List<Match>>([]),
          next: AsyncData<List<Match>>([eventPlan]),
          isHostApp: false,
        ),
        isEmpty,
      );
    });
  });

  group('ChatsSearchHeaderController', () {
    test('tracks active search and closes only when empty', () {
      final controller = ChatsSearchHeaderController();

      expect(controller.isSearchActive(''), isFalse);
      controller.setExpanded(true);
      expect(controller.searchOpen, isTrue);
      expect(controller.isSearchActive(''), isTrue);

      expect(controller.closeAfterSubmitted('taylor'), isFalse);
      expect(controller.searchOpen, isTrue);
      expect(
        controller.closeAfterFocusChanged(focused: false, query: 'mira'),
        isFalse,
      );
      expect(controller.searchOpen, isTrue);

      expect(controller.closeAfterSubmitted(''), isTrue);
      expect(controller.searchOpen, isFalse);

      controller.setExpanded(true);
      expect(
        controller.closeAfterFocusChanged(focused: false, query: ''),
        isTrue,
      );
      expect(controller.searchOpen, isFalse);
    });
  });

  testWidgets(
    'chat browse header presentation is independent of global app role',
    (tester) async {
      AppConfig.configureEntrypointRole(AppRole.host);

      await tester.pumpWidget(
        MaterialApp(
          theme: AppTheme.light,
          home: const Scaffold(
            body: ChatsBrowseHeader(
              presentation: ChatsBrowsePresentation.consumer,
              showSearchAction: false,
              searchValue: '',
              onSearchChanged: null,
              hostFilter: null,
              hostUnreadCount: 0,
              onHostFilterChanged: null,
            ),
          ),
        ),
      );

      expect(find.text('Chats'), findsOneWidget);
      expect(find.text('Messaging'), findsNothing);
    },
  );

  testWidgets(
    'chat root header search expands in scroll content and is editable',
    (tester) async {
      final container = ProviderContainer();
      addTearDown(container.dispose);

      await tester.pumpWidget(
        UncontrolledProviderScope(
          container: container,
          child: MaterialApp(
            theme: AppTheme.light,
            home: Scaffold(
              body: Consumer(
                builder: (context, ref, child) {
                  return CustomScrollView(
                    slivers: [
                      ...CatchSliverHeader(
                        title: const SizedBox.shrink(),
                        bottomHeight: chatsBrowseHeaderHeight(
                          context: context,
                          hasHostFilter: false,
                          hasHeaderSubtitle: false,
                        ),
                        bottom: ChatsBrowseHeader(
                          presentation: ChatsBrowsePresentation.consumer,
                          showSearchAction: true,
                          searchValue: ref.watch(chatSearchQueryProvider),
                          onSearchChanged: ref
                              .read(chatSearchQueryProvider.notifier)
                              .setQuery,
                          hostFilter: null,
                          hostUnreadCount: 0,
                          onHostFilterChanged: null,
                        ),
                      ).buildSlivers(context),
                      const SliverToBoxAdapter(child: SizedBox(height: 700)),
                    ],
                  );
                },
              ),
            ),
          ),
        ),
      );
      await tester.pump();

      expect(tester.takeException(), isNull);
      expect(find.text('Chats'), findsOneWidget);
      expect(find.text('Messages from your matches'), findsNothing);
      expect(find.text('Your catches'), findsNothing);
      expect(find.text('0 chats'), findsNothing);
      expect(find.byType(TextField), findsNothing);
      final initialTitleTop = tester.getTopLeft(find.text('Chats')).dy;

      await tester.drag(find.byType(CustomScrollView), const Offset(0, -220));
      await pumpFeatureUi(tester);

      expect(find.text('Chats').hitTestable(), findsOneWidget);
      final scrolledTitleTop = tester.getTopLeft(find.text('Chats')).dy;
      expect(scrolledTitleTop, greaterThanOrEqualTo(0));
      expect(scrolledTitleTop, lessThanOrEqualTo(initialTitleTop));

      await tester.tap(find.byTooltip('Search chats'));
      await tester.pump();
      final midSearchMorphFrame = Duration(
        milliseconds: CatchMotion.base.inMilliseconds ~/ 2,
      );
      await tester.pump(midSearchMorphFrame);

      final expandingSearchField = find.byWidgetPredicate(
        (widget) =>
            widget is CatchSearchField &&
            widget.mode == CatchSearchFieldMode.expanding,
      );
      final morphingSearchWidth = tester.getSize(expandingSearchField).width;
      expect(morphingSearchWidth, greaterThan(CatchField.compactControlHeight));

      await pumpFeatureUi(tester);

      final expandedSearchWidth = tester.getSize(expandingSearchField).width;
      expect(expandedSearchWidth, greaterThanOrEqualTo(morphingSearchWidth));
      expect(find.byType(TextField), findsOneWidget);
      expect(find.byIcon(CatchIcons.hideKeyboard), findsNothing);
      expect(
        tester.widget<TextField>(find.byType(TextField)).textInputAction,
        TextInputAction.done,
      );
      await tester.enterText(find.byType(TextField), 'taylor');
      await tester.pump();

      expect(tester.takeException(), isNull);
      expect(container.read(chatSearchQueryProvider), 'taylor');

      await tester.tap(find.byIcon(CatchIcons.clear));
      await tester.pump();

      expect(tester.takeException(), isNull);
      expect(container.read(chatSearchQueryProvider), isEmpty);

      await tester.testTextInput.receiveAction(TextInputAction.done);
      await pumpFeatureUi(tester);

      expect(find.byType(TextField), findsNothing);
    },
  );

  testWidgets('shows the empty state when there are no matches', (
    tester,
  ) async {
    final matchRepository = _FakeMatchRepository(matches: const []);
    final conversationRepository = _FakeConversationRepository();

    await tester.pumpWidget(
      ProviderScope(
        overrides: [
          uidProvider.overrideWith((ref) => Stream.value('runner-1')),
          matchRepositoryProvider.overrideWithValue(matchRepository),
          conversationRepositoryProvider.overrideWithValue(
            conversationRepository,
          ),
          watchMatchesForUserProvider(
            'runner-1',
          ).overrideWith((ref) => Stream.value(const [])),
        ],
        child: MaterialApp(
          theme: AppTheme.light,
          home: const ChatsListScreen(initialScope: ConsumerChatScope.messages),
        ),
      ),
    );

    await pumpFeatureUi(tester);

    final rootScaffold = tester.widget<CatchRootScreenScaffold>(
      find.byType(CatchRootScreenScaffold),
    );
    expect(rootScaffold.bodyLayout, CatchPageBodyMode.fullBleed);
    expect(find.text('No catches yet'), findsOneWidget);
    expect(find.byType(TextField), findsNothing);
    expect(
      find.text(
        'When someone catches you back after a shared event, the conversation opens here with that event as context.',
      ),
      findsOneWidget,
    );
  });

  testWidgets('host inbox empty state uses explicit attendee-query copy', (
    tester,
  ) async {
    AppConfig.configureEntrypointRole(AppRole.host);
    final matchRepository = _FakeMatchRepository(matches: const []);
    final conversationRepository = _FakeConversationRepository();

    await tester.pumpWidget(
      ProviderScope(
        overrides: [
          uidProvider.overrideWith((ref) => Stream.value('host-1')),
          matchRepositoryProvider.overrideWithValue(matchRepository),
          conversationRepositoryProvider.overrideWithValue(
            conversationRepository,
          ),
          watchMatchesForUserProvider(
            'host-1',
          ).overrideWith((ref) => Stream.value(const [])),
        ],
        child: MaterialApp(
          theme: AppTheme.light,
          home: const ChatsListScreen(initialScope: ConsumerChatScope.messages),
        ),
      ),
    );

    await pumpFeatureUi(tester);

    expect(find.text('No attendee queries yet'), findsOneWidget);
    expect(
      find.text(
        'Guest and attendee questions will appear here once people reach out about an event.',
      ),
      findsOneWidget,
    );
    expect(find.text('No catches yet'), findsNothing);
  });

  testWidgets('shows search-specific empty copy when a query has no matches', (
    tester,
  ) async {
    final match = _buildMatch();
    final matchRepository = _FakeMatchRepository(matches: [match]);
    final conversationRepository = _FakeConversationRepository();
    final publicProfileRepository = FakePublicProfileRepository()
      ..profiles = [buildPublicProfile(uid: 'runner-2')];
    final container = ProviderContainer(
      overrides: [
        uidProvider.overrideWith((ref) => Stream.value('runner-1')),
        matchRepositoryProvider.overrideWithValue(matchRepository),
        conversationRepositoryProvider.overrideWithValue(
          conversationRepository,
        ),
        publicProfileRepositoryProvider.overrideWithValue(
          publicProfileRepository,
        ),
        watchMatchesForUserProvider(
          'runner-1',
        ).overrideWith((ref) => Stream.value([match])),
      ],
    );
    addTearDown(container.dispose);
    container.read(chatSearchQueryProvider.notifier).setQuery('zara');

    await tester.pumpWidget(
      UncontrolledProviderScope(
        container: container,
        child: MaterialApp(
          theme: AppTheme.light,
          home: const ChatsListScreen(initialScope: ConsumerChatScope.messages),
        ),
      ),
    );

    await pumpFeatureUi(tester);

    expect(find.byType(TextField), findsOneWidget);
    expect(find.text('No chats match your search'), findsOneWidget);
    expect(
      find.text('Try another name or clear the search field.'),
      findsOneWidget,
    );
    expect(find.text('No catches yet'), findsNothing);
  });

  testWidgets('collapses duplicate match docs into one chat row per person', (
    tester,
  ) async {
    final olderTaylorMatch = _buildMatch(
      id: 'old-taylor',
      createdAt: DateTime(2026, 4, 21, 9),
      lastMessageAt: DateTime(2026, 4, 21, 10),
      lastMessagePreview: 'Older message',
      lastMessageSenderId: 'runner-2',
      unreadCounts: const {'runner-1': 1},
    );
    final latestTaylorMatch = _buildMatch(
      id: 'latest-taylor',
      createdAt: DateTime(2026, 4, 22, 9),
      lastMessageAt: DateTime(2026, 4, 22, 12),
      lastMessagePreview: 'Latest message',
      lastMessageSenderId: 'runner-2',
      unreadCounts: const {'runner-1': 2},
    );
    final morganMatch = _buildMatch(
      id: 'morgan',
      user2Id: 'runner-3',
      createdAt: DateTime(2026, 4, 23, 9),
    );
    final matches = [olderTaylorMatch, latestTaylorMatch, morganMatch];
    final matchRepository = _FakeMatchRepository(matches: matches);
    final conversationRepository = _FakeConversationRepository();
    final publicProfileRepository = FakePublicProfileRepository()
      ..profiles = [
        buildPublicProfile(uid: 'runner-2', name: 'Taylor'),
        buildPublicProfile(uid: 'runner-3', name: 'Morgan'),
      ];

    await tester.pumpWidget(
      ProviderScope(
        overrides: [
          uidProvider.overrideWith((ref) => Stream.value('runner-1')),
          matchRepositoryProvider.overrideWithValue(matchRepository),
          conversationRepositoryProvider.overrideWithValue(
            conversationRepository,
          ),
          publicProfileRepositoryProvider.overrideWithValue(
            publicProfileRepository,
          ),
          watchMatchesForUserProvider(
            'runner-1',
          ).overrideWith((ref) => Stream.value(matches)),
        ],
        child: MaterialApp(
          theme: AppTheme.light,
          home: const ChatsListScreen(initialScope: ConsumerChatScope.messages),
        ),
      ),
    );

    await pumpFeatureUi(tester);

    expect(find.text('Taylor'), findsOneWidget);
    expect(find.text('Morgan'), findsOneWidget);
    expect(find.text('CONVERSATIONS'), findsNothing);
    expect(find.text('New matches'), findsNothing);
    expect(find.text('Latest message'), findsOneWidget);
    expect(find.text('Older message'), findsNothing);
    expect(find.text('1'), findsOneWidget);
    expect(find.text('2 chats'), findsNothing);
    expect(find.text('3 active'), findsNothing);
    expect(find.text('Messages'), findsNothing);
    expect(publicProfileRepository.fetchPublicProfilesCalls, [
      ['runner-2', 'runner-3'],
    ]);
  });

  testWidgets('batches inbox club and public profile lookups per roster', (
    tester,
  ) async {
    final hostInquiry = _buildMatch(
      id: 'host-inquiry',
      user1Id: 'guest-1',
      user2Id: 'host-1',
      lastMessageAt: DateTime(2026, 4, 23, 12),
      lastMessagePreview: 'Is there parking near the start?',
      lastMessageSenderId: 'guest-1',
      conversationType: MatchConversationType.clubHostInquiry,
      clubId: 'club-1',
    );
    final secondHostInquiry = _buildMatch(
      id: 'second-host-inquiry',
      user1Id: 'guest-2',
      user2Id: 'host-1',
      lastMessageAt: DateTime(2026, 4, 23, 11),
      lastMessagePreview: 'Can I bring a friend?',
      lastMessageSenderId: 'guest-2',
      conversationType: MatchConversationType.clubHostInquiry,
      clubId: 'club-1',
    );
    final datingMatch = _buildMatch(
      id: 'dating-match',
      user1Id: 'host-1',
      lastMessageAt: DateTime(2026, 4, 23, 10),
      lastMessagePreview: 'Regular match.',
      lastMessageSenderId: 'runner-2',
    );
    final matches = [hostInquiry, secondHostInquiry, datingMatch];
    final matchRepository = _FakeMatchRepository(matches: matches);
    final conversationRepository = _FakeConversationRepository();
    final clubsRepository = club_test.FakeClubsRepository()
      ..clubsById['club-1'] = club_test.buildClub(
        hostName: 'Stride Social',
        hostProfiles: const [
          ClubHostProfile(uid: 'guest-1', displayName: 'Asha Guest'),
          ClubHostProfile(uid: 'guest-2', displayName: 'Nikhil Guest'),
        ],
      );
    final publicProfileRepository = FakePublicProfileRepository()
      ..profiles = [buildPublicProfile(uid: 'runner-2', name: 'Taylor')];

    await tester.pumpWidget(
      ProviderScope(
        overrides: [
          uidProvider.overrideWith((ref) => Stream.value('host-1')),
          matchRepositoryProvider.overrideWithValue(matchRepository),
          conversationRepositoryProvider.overrideWithValue(
            conversationRepository,
          ),
          clubsRepositoryProvider.overrideWithValue(clubsRepository),
          publicProfileRepositoryProvider.overrideWithValue(
            publicProfileRepository,
          ),
          watchMatchesForUserProvider(
            'host-1',
          ).overrideWith((ref) => Stream.value(matches)),
        ],
        child: MaterialApp(
          theme: AppTheme.light,
          home: const ChatsListScreen(initialScope: ConsumerChatScope.messages),
        ),
      ),
    );

    await pumpFeatureUi(tester);

    expect(find.text('Asha Guest'), findsOneWidget);
    expect(find.text('Nikhil Guest'), findsOneWidget);
    expect(find.text('Taylor'), findsOneWidget);
    expect(clubsRepository.watchClubsByIdsCalls, [
      ['club-1'],
    ]);
    expect(publicProfileRepository.fetchPublicProfilesCalls, [
      ['runner-2'],
    ]);
  });

  testWidgets('host inbox keeps attendee queries inbound-only', (tester) async {
    AppConfig.configureEntrypointRole(AppRole.host);
    final unreadInquiry = _buildMatch(
      id: 'host-inquiry',
      user1Id: 'guest-1',
      user2Id: 'host-1',
      lastMessageAt: DateTime(2026, 4, 23, 12),
      lastMessagePreview: 'Is there parking near the start?',
      lastMessageSenderId: 'guest-1',
      unreadCounts: const {'host-1': 1},
      conversationType: MatchConversationType.clubHostInquiry,
    );
    final readInquiry = _buildMatch(
      id: 'host-read-inquiry',
      user1Id: 'guest-2',
      user2Id: 'host-1',
      lastMessageAt: DateTime(2026, 4, 23, 11),
      lastMessagePreview: 'Do I need ID at check-in?',
      lastMessageSenderId: 'guest-2',
      conversationType: MatchConversationType.clubHostInquiry,
    );
    final inquiries = [unreadInquiry, readInquiry];
    final matchRepository = _FakeMatchRepository(matches: inquiries);
    final conversationRepository = _FakeConversationRepository();

    await tester.pumpWidget(
      ProviderScope(
        overrides: [
          uidProvider.overrideWith((ref) => Stream.value('host-1')),
          matchRepositoryProvider.overrideWithValue(matchRepository),
          conversationRepositoryProvider.overrideWithValue(
            conversationRepository,
          ),
          watchMatchesForUserProvider(
            'host-1',
          ).overrideWith((ref) => Stream.value(inquiries)),
        ],
        child: MaterialApp(
          theme: AppTheme.light,
          home: const ChatsListScreen(initialScope: ConsumerChatScope.messages),
        ),
      ),
    );

    await pumpFeatureUi(tester);

    expect(find.text('Messaging'), findsOneWidget);
    expect(find.text('One-to-one conversations and replies.'), findsOneWidget);
    expect(find.text('All'), findsOneWidget);
    expect(find.text('Unread · 1'), findsOneWidget);
    expect(find.text('Message 2 attendees'), findsNothing);
    expect(find.text('Reminders, the meeting point, changes'), findsNothing);
    expect(find.text('Is there parking near the start?'), findsOneWidget);
    expect(find.text('Do I need ID at check-in?'), findsOneWidget);
    expect(find.text('Messages from your matches'), findsNothing);
    expect(find.text('CONVERSATIONS'), findsNothing);

    await tester.tap(find.text('Unread · 1'));
    await pumpFeatureUi(tester);

    expect(find.text('Is there parking near the start?'), findsOneWidget);
    expect(find.text('Do I need ID at check-in?'), findsNothing);
  });

  testWidgets('host inbox search empty uses attendee-query copy', (
    tester,
  ) async {
    AppConfig.configureEntrypointRole(AppRole.host);
    final hostInquiry = _buildMatch(
      id: 'host-inquiry',
      user1Id: 'guest-1',
      user2Id: 'host-1',
      lastMessageAt: DateTime(2026, 4, 23, 12),
      lastMessagePreview: 'Is there parking near the start?',
      lastMessageSenderId: 'guest-1',
      conversationType: MatchConversationType.clubHostInquiry,
    );
    final matchRepository = _FakeMatchRepository(matches: [hostInquiry]);
    final conversationRepository = _FakeConversationRepository();
    final container = ProviderContainer(
      overrides: [
        uidProvider.overrideWith((ref) => Stream.value('host-1')),
        matchRepositoryProvider.overrideWithValue(matchRepository),
        conversationRepositoryProvider.overrideWithValue(
          conversationRepository,
        ),
        watchMatchesForUserProvider(
          'host-1',
        ).overrideWith((ref) => Stream.value([hostInquiry])),
      ],
    );
    addTearDown(container.dispose);
    container.read(chatSearchQueryProvider.notifier).setQuery('zara');

    await tester.pumpWidget(
      UncontrolledProviderScope(
        container: container,
        child: MaterialApp(
          theme: AppTheme.light,
          home: const ChatsListScreen(initialScope: ConsumerChatScope.messages),
        ),
      ),
    );

    await pumpFeatureUi(tester);

    expect(find.text('No attendee queries match your search'), findsOneWidget);
    expect(
      find.text('Try another attendee name or clear the search field.'),
      findsOneWidget,
    );
    expect(find.text('No chats match your search'), findsNothing);
  });

  testWidgets('host inbox rows navigate to host chat route', (tester) async {
    AppConfig.configureEntrypointRole(AppRole.host);
    final hostInquiry = _buildMatch(
      id: 'host-inquiry',
      user1Id: 'guest-1',
      user2Id: 'host-1',
      lastMessageAt: DateTime(2026, 4, 23, 12),
      lastMessagePreview: 'Is there parking near the start?',
      lastMessageSenderId: 'guest-1',
      conversationType: MatchConversationType.clubHostInquiry,
    );
    final matchRepository = _FakeMatchRepository(matches: [hostInquiry]);
    final conversationRepository = _FakeConversationRepository();
    final router = GoRouter(
      initialLocation: Routes.hostInboxScreen.path,
      routes: [
        GoRoute(
          path: Routes.hostInboxScreen.path,
          name: Routes.hostInboxScreen.name,
          builder: (_, _) =>
              const ChatsListScreen(initialScope: ConsumerChatScope.messages),
          routes: [
            GoRoute(
              path: ':matchId',
              name: Routes.hostChatScreen.name,
              builder: (_, state) =>
                  Text('Host chat ${state.pathParameters['matchId']}'),
            ),
          ],
        ),
      ],
    );

    await tester.pumpWidget(
      ProviderScope(
        overrides: [
          uidProvider.overrideWith((ref) => Stream.value('host-1')),
          matchRepositoryProvider.overrideWithValue(matchRepository),
          conversationRepositoryProvider.overrideWithValue(
            conversationRepository,
          ),
          watchMatchesForUserProvider(
            'host-1',
          ).overrideWith((ref) => Stream.value([hostInquiry])),
        ],
        child: MaterialApp.router(theme: AppTheme.light, routerConfig: router),
      ),
    );

    await pumpFeatureUi(tester);

    expect(find.text('Host conversation'), findsOneWidget);

    await tester.tap(find.text('Host conversation'));
    await pumpFeatureUi(tester);

    expect(find.text('Host chat host-inquiry'), findsOneWidget);
  });

  testWidgets('host inbox hides consumer dating matches', (tester) async {
    AppConfig.configureEntrypointRole(AppRole.host);
    final hostInquiry = _buildMatch(
      id: 'host-inquiry',
      user1Id: 'guest-1',
      user2Id: 'host-1',
      lastMessageAt: DateTime(2026, 4, 23, 12),
      lastMessagePreview: 'Is there parking near the start?',
      lastMessageSenderId: 'guest-1',
      conversationType: MatchConversationType.clubHostInquiry,
    );
    final datingMatch = _buildMatch(
      id: 'dating-match',
      user1Id: 'host-1',
      lastMessageAt: DateTime(2026, 4, 23, 11),
      lastMessagePreview: 'Consumer chat should stay out.',
      lastMessageSenderId: 'runner-2',
    );
    final matches = [hostInquiry, datingMatch];
    final matchRepository = _FakeMatchRepository(matches: matches);
    final conversationRepository = _FakeConversationRepository();
    final publicProfileRepository = FakePublicProfileRepository()
      ..profiles = [buildPublicProfile(uid: 'runner-2', name: 'Taylor')];

    await tester.pumpWidget(
      ProviderScope(
        overrides: [
          uidProvider.overrideWith((ref) => Stream.value('host-1')),
          matchRepositoryProvider.overrideWithValue(matchRepository),
          conversationRepositoryProvider.overrideWithValue(
            conversationRepository,
          ),
          publicProfileRepositoryProvider.overrideWithValue(
            publicProfileRepository,
          ),
          watchMatchesForUserProvider(
            'host-1',
          ).overrideWith((ref) => Stream.value(matches)),
        ],
        child: MaterialApp(
          theme: AppTheme.light,
          home: const ChatsListScreen(initialScope: ConsumerChatScope.messages),
        ),
      ),
    );

    await pumpFeatureUi(tester);

    expect(find.text('Is there parking near the start?'), findsOneWidget);
    expect(find.text('Consumer chat should stay out.'), findsNothing);
    expect(find.text('Taylor'), findsNothing);
  });

  testWidgets('does not mark own latest message as unread', (tester) async {
    final selfSentMatch = _buildMatch(
      id: 'self-sent',
      lastMessageAt: DateTime(2026, 4, 23, 12),
      lastMessagePreview: 'Definitely. I liked the last 2 km push.',
      lastMessageSenderId: 'runner-1',
      unreadCounts: const {'runner-1': 3},
    );
    final matchRepository = _FakeMatchRepository(matches: [selfSentMatch]);
    final conversationRepository = _FakeConversationRepository();
    final publicProfileRepository = FakePublicProfileRepository()
      ..profiles = [buildPublicProfile(uid: 'runner-2', name: 'Yash')];

    await tester.pumpWidget(
      ProviderScope(
        overrides: [
          uidProvider.overrideWith((ref) => Stream.value('runner-1')),
          matchRepositoryProvider.overrideWithValue(matchRepository),
          conversationRepositoryProvider.overrideWithValue(
            conversationRepository,
          ),
          publicProfileRepositoryProvider.overrideWithValue(
            publicProfileRepository,
          ),
          watchMatchesForUserProvider(
            'runner-1',
          ).overrideWith((ref) => Stream.value([selfSentMatch])),
        ],
        child: MaterialApp(
          theme: AppTheme.light,
          home: const ChatsListScreen(initialScope: ConsumerChatScope.messages),
        ),
      ),
    );

    await pumpFeatureUi(tester);

    expect(find.text('Yash'), findsOneWidget);
    expect(
      find.text('You: Definitely. I liked the last 2 km push.'),
      findsOneWidget,
    );
    expect(find.text('3'), findsNothing);
  });

  testWidgets('navigates from matches list to chat without route extra', (
    tester,
  ) async {
    final match = _buildMatch();
    final profile = buildPublicProfile(uid: 'runner-2', name: 'Taylor');
    final matchRepository = _FakeMatchRepository(
      matches: [match],
      match: match,
    );
    final conversationRepository = _FakeConversationRepository();
    final publicProfileRepository = FakePublicProfileRepository()
      ..profiles = [profile];
    final router = GoRouter(
      initialLocation: Routes.matchesListScreen.path,
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
                otherProfile: state.extra is PublicProfile
                    ? state.extra! as PublicProfile
                    : null,
              ),
            ),
          ],
        ),
      ],
    );

    await tester.pumpWidget(
      ProviderScope(
        overrides: [
          uidProvider.overrideWith((ref) => Stream.value('runner-1')),
          matchRepositoryProvider.overrideWithValue(matchRepository),
          conversationRepositoryProvider.overrideWithValue(
            conversationRepository,
          ),
          publicProfileRepositoryProvider.overrideWithValue(
            publicProfileRepository,
          ),
          watchMatchesForUserProvider(
            'runner-1',
          ).overrideWith((ref) => Stream.value([match])),
          matchStreamProvider(
            match.id,
          ).overrideWith((ref) => Stream.value(match)),
          watchPublicProfileProvider(
            'runner-2',
          ).overrideWith((ref) => Stream.value(profile)),
          watchConversationMessagesProvider(
            match.id,
          ).overrideWith((ref) => Stream.value(const [])),
        ],
        child: MaterialApp.router(theme: AppTheme.light, routerConfig: router),
      ),
    );

    await pumpFeatureUi(tester);

    expect(find.text('Taylor'), findsOneWidget);

    await tester.tap(find.text('Taylor'));
    await pumpFeatureUi(tester);

    expect(find.byType(ChatScreen), findsOneWidget);
    expect(find.text('Say hi to Taylor!'), findsOneWidget);
    expect(conversationRepository.markReadCalls, [('match-1', 'runner-1')]);
  });
}
