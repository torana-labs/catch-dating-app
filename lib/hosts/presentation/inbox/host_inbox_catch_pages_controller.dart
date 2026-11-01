import 'package:catch_dating_app/chats/chats.dart';
import 'package:catch_dating_app/contexts/account/data/auth_repository.dart';
import 'package:catch_dating_app/contexts/connections/data/match_repository.dart';
import 'package:catch_dating_app/contexts/connections/domain/match.dart';
import 'package:catch_dating_app/contexts/profiles/data/public_profiles_lookup.dart';
import 'package:catch_dating_app/platform/riverpod_ui/catch_async_value_adapter.dart';
import 'package:riverpod_annotation/riverpod_annotation.dart';

part 'host_inbox_catch_pages_controller.g.dart';

class HostInboxCatchPageState {
  const HostInboxCatchPageState({
    this.matches = const [],
    this.cursor,
    this.started = false,
    this.hasMore = true,
    this.loadingMore = false,
    this.error,
  });
  final List<Match> matches;
  final MatchPageCursor? cursor;
  final bool started;
  final bool hasMore;
  final bool loadingMore;
  final Object? error;

  bool canLoadMore(bool sourceWindowMayHaveMore) =>
      hasMore && (started || sourceWindowMayHaveMore);
}

/// The live window and each paged source retain independent cursors.
@riverpod
class HostInboxCatchPages extends _$HostInboxCatchPages {
  int _generation = 0;
  @override
  HostInboxCatchPageState build(String accountId) {
    _generation++;
    return const HostInboxCatchPageState();
  }

  Future<void> loadMore() async {
    final current = state;
    if (current.loadingMore || !current.hasMore) return;
    final generation = _generation;
    state = HostInboxCatchPageState(
      matches: current.matches,
      cursor: current.cursor,
      started: true,
      loadingMore: true,
    );
    try {
      final page = await ref
          .read(matchRepositoryProvider)
          .fetchMatchesForUserPage(uid: accountId, startAfter: current.cursor);
      if (!ref.mounted || generation != _generation) return;
      state = HostInboxCatchPageState(
        matches: List.unmodifiable(
          {
            for (final match in current.matches) match.id: match,
            for (final match in page.items) match.id: match,
          }.values,
        ),
        cursor: page.nextCursor,
        hasMore: page.hasMore,
        started: true,
      );
    } on Object catch (error) {
      if (!ref.mounted || generation != _generation) return;
      state = HostInboxCatchPageState(
        matches: current.matches,
        cursor: current.cursor,
        hasMore: current.hasMore,
        started: true,
        error: error,
      );
    }
  }
}

// provider-graph: cross-feature-presentation:hostInboxCatchViewModelProvider->chatsListViewModelProvider accepted -- Host composes the canonical Chat live read model through the annotated, narrowly exported lib/chats/chats.dart API, then adds account-scoped historical pages. Chat retains preview identity and live-window ownership; Host rechecks each older match's current membership before projecting it into organizer-authorized person collections. This is the sanctioned public read-model seam, not a dependency on sibling widgets or a second Chat subscription implementation. Chat projection, Host person identity, conversation revocation and pagination tests cover the constituent contracts; dependency-direction and topology checks enforce the exact public edge and reject cycles or stale decisions.
/// Revalidates older endpoint membership against the live document before
/// including it. A cached page never keeps a revoked conversation visible.
@riverpod
AsyncValue<ChatsListViewModel> hostInboxCatchViewModel(Ref ref) {
  final live = ref.watch(chatsListViewModelProvider);
  final uid = catchAsyncStateFromAsyncValue(ref.watch(uidProvider)).value;
  if (uid == null) return const AsyncLoading();
  final pages = ref.watch(hostInboxCatchPagesProvider(uid));
  if (pages.matches.isEmpty) return live;
  final base = catchAsyncStateFromAsyncValue(live).value;
  final byId = <String, ChatThreadPreview>{
    for (final preview in [...?base?.newMatches, ...?base?.conversations])
      preview.matchId: preview,
  };
  final older = <Match>[];
  for (final cached in pages.matches) {
    if (byId.containsKey(cached.id)) continue;
    final match = catchAsyncStateFromAsyncValue(
      ref.watch(matchStreamProvider(cached.id)),
    ).value;
    if (match != null &&
        match.isOrganizerHostInquiry &&
        !match.isBlocked &&
        !match.isClosed &&
        (match.user1Id == uid || match.user2Id == uid)) {
      older.add(match);
    }
  }
  final profiles = older.isEmpty
      ? null
      : catchAsyncStateFromAsyncValue(
          ref.watch(
            publicProfilesByIdsProvider(
              PublicProfilesQuery(older.map((match) => match.otherId(uid))),
            ),
          ),
        ).value;
  for (final match in older) {
    byId[match.id] = chatThreadPreviewForMatch(
      match,
      uid,
      isHostViewer: true,
      organizersById: const {},
      profilesByUid: profiles ?? const {},
    );
  }
  final previews = byId.values.toList()
    ..sort((a, b) => b.timestamp.compareTo(a.timestamp));
  if (previews.isEmpty && catchAsyncStateFromAsyncValue(live).hasError) {
    return live;
  }
  return AsyncData(
    ChatsListViewModel(
      newMatches: previews.where((p) => !p.hasConversation).toList(),
      conversations: previews.where((p) => p.hasConversation).toList(),
      totalThreadCount: previews.length,
    ),
  );
}
