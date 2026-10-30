import 'dart:async';

import 'package:catch_dating_app/contexts/discovery/data/explore_recommendations_repository.dart';
import 'package:catch_dating_app/contexts/live/data/event_success_companion_clock.dart';
import 'package:catch_dating_app/contexts/organizers/data/organizer_name_lookup.dart';
import 'package:catch_dating_app/contexts/profiles/data/public_profiles_lookup.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  test(
    'initial loading serializes refresh without starting a second read',
    () async {
      final fixture = _PagingFixture();
      addTearDown(fixture.container.dispose);
      final subscription = fixture.container.listen(
        _pagedRowsProvider(_accountA),
        (_, _) {},
      );
      addTearDown(subscription.close);
      final first = fixture.container.read(
        _pagedRowsProvider(_accountA).future,
      );
      await fixture.container
          .read(_pagedRowsProvider(_accountA).notifier)
          .refresh();
      expect(fixture.reader.requests, hasLength(1));
      expect(
        fixture.container.read(_pagedRowsProvider(_accountA)).isLoading,
        isTrue,
      );
      fixture.reader.requests.single.result.complete(
        const _Page(['initial'], null),
      );
      expect((await first).rows, ['initial']);
    },
  );
  test(
    'paged async owner retains immutable rows and retries the same cursor',
    () async {
      final fixture = _PagingFixture();
      addTearDown(fixture.container.dispose);
      final owner = await fixture.open(_accountA);
      expect(
        () => fixture.rows(_accountA).rows.add('edited'),
        throwsUnsupportedError,
      );

      final first = owner.loadMore();
      expect(identical(first, owner.loadMore()), isTrue);
      expect(fixture.reader.requests.last.cursor, 'next');
      fixture.reader.requests.last.result.completeError(
        StateError('page failed'),
      );
      await first;
      expect(fixture.rows(_accountA).rows, ['first']);
      expect(fixture.rows(_accountA).cursor, 'next');
      expect(fixture.rows(_accountA).pageError, isA<StateError>());
      expect(fixture.rows(_accountA).loadingMore, isFalse);

      final retry = owner.loadMore();
      expect(fixture.reader.requests.last.cursor, 'next');
      fixture.reader.requests.last.result.complete(
        const _Page(['first', 'second'], null),
      );
      await retry;
      expect(fixture.rows(_accountA).rows, ['first', 'second']);
      expect(fixture.rows(_accountA).pageError, isNull);
      expect(fixture.rows(_accountA).cursor, isNull);
    },
  );

  for (final staleFails in [false, true]) {
    test(
      'refresh supersedes delayed load-more ${staleFails ? 'failure' : 'success'}',
      () async {
        final fixture = _PagingFixture();
        addTearDown(fixture.container.dispose);
        final owner = await fixture.open(_accountA);
        final more = owner.loadMore();
        final oldRequest = fixture.reader.requests.last;
        final refresh = owner.refresh();
        expect(identical(refresh, owner.refresh()), isTrue);
        expect(fixture.reader.requests.last.cursor, isNull);
        expect(
          fixture.container
              .read(_pagedRowsProvider(_accountA))
              .value
              ?.refreshing,
          isTrue,
        );
        expect(fixture.rows(_accountA).rows, ['first']);
        fixture.reader.requests.last.result.complete(
          const _Page(['fresh'], 'fresh-next'),
        );
        await refresh;
        if (staleFails) {
          oldRequest.result.completeError(StateError('stale failure'));
        } else {
          oldRequest.result.complete(const _Page(['stale'], 'stale-next'));
        }
        await more;
        expect(fixture.rows(_accountA).rows, ['fresh']);
        expect(fixture.rows(_accountA).cursor, 'fresh-next');
        expect(fixture.rows(_accountA).pageError, isNull);
      },
    );
  }

  test(
    'refresh failure retains immutable data and its refresh error',
    () async {
      final fixture = _PagingFixture();
      addTearDown(fixture.container.dispose);
      final owner = await fixture.open(_accountA);
      final refresh = owner.refresh();
      fixture.reader.requests.last.result.completeError(
        StateError('refresh failed'),
      );
      await refresh;
      final state = fixture.container.read(_pagedRowsProvider(_accountA));
      expect(state.value?.refreshError, isA<StateError>());
      expect(state.value?.rows, ['first']);
      expect(state.value?.loadingMore, isFalse);
    },
  );

  for (final nextScope in const [_accountB, _organizerB]) {
    test(
      'family scope switch $nextScope and disposal reject late completions',
      () async {
        final fixture = _PagingFixture();
        addTearDown(fixture.container.dispose);
        final ownerA = await fixture.open(_accountA);
        final late = ownerA.loadMore();
        final oldRequest = fixture.reader.requests.last;
        final subscriptionB = fixture.container.listen(
          _pagedRowsProvider(nextScope),
          (_, _) {},
        );
        addTearDown(subscriptionB.close);
        final bFuture = fixture.container.read(
          _pagedRowsProvider(nextScope).future,
        );
        expect(fixture.reader.requests.last.scope, nextScope);
        expect(
          fixture.container.read(_pagedRowsProvider(nextScope)).value,
          isNull,
        );
        fixture.subscriptions.remove(_accountA)!.close();
        await fixture.container.pump();
        oldRequest.result.completeError(StateError('disposed account A'));
        await late;
        fixture.reader.requests.last.result.complete(
          const _Page(['account-b'], null),
        );
        expect((await bFuture).rows, ['account-b']);
        expect(fixture.rows(nextScope).pageError, isNull);

        final reopened = fixture.container.listen(
          _pagedRowsProvider(_accountA),
          (_, _) {},
        );
        addTearDown(reopened.close);
        final aFuture = fixture.container.read(
          _pagedRowsProvider(_accountA).future,
        );
        expect(fixture.reader.requests.last.scope, _accountA);
        expect(fixture.reader.requests.last.cursor, isNull);
        fixture.reader.requests.last.result.complete(
          const _Page(['reopened'], null),
        );
        expect((await aFuture).rows, ['reopened']);
      },
    );
  }

  test('generated provider families preserve override contracts', () async {
    final fixedNow = DateTime.utc(2026, 7, 16, 12);
    final container = ProviderContainer(
      overrides: [
        organizerNameLookupProvider(
          OrganizerNameLookupQuery(const ['club-1']),
        ).overrideWithValue(
          const AsyncData<Map<String, String>>({'club-1': 'Stride Social'}),
        ),
        exploreRecommendedEventsProvider(
          ExploreRecommendationsQuery(
            userId: 'runner-1',
            followedOrganizerIds: const ['club-1'],
          ),
        ).overrideWithValue(
          const AsyncData<List<ExploreEventRecommendationCandidate>>([]),
        ),
        publicProfilesByIdsProvider(
          PublicProfilesQuery(const ['runner-2']),
        ).overrideWithValue(const AsyncData({})),
        eventSuccessCompanionClockProvider.overrideWithValue(
          AsyncData(fixedNow),
        ),
      ],
    );
    addTearDown(container.dispose);

    expect(
      container
          .read(
            organizerNameLookupProvider(
              OrganizerNameLookupQuery(const ['club-1', 'club-1']),
            ),
          )
          .requireValue,
      const {'club-1': 'Stride Social'},
    );
    expect(
      container
          .read(
            exploreRecommendedEventsProvider(
              ExploreRecommendationsQuery(
                userId: 'runner-1',
                followedOrganizerIds: const ['club-1'],
              ),
            ),
          )
          .requireValue,
      isEmpty,
    );
    expect(
      container
          .read(
            publicProfilesByIdsProvider(
              PublicProfilesQuery(const ['runner-2', 'runner-2']),
            ),
          )
          .requireValue,
      isEmpty,
    );
    expect(
      container.read(eventSuccessCompanionClockProvider).requireValue,
      fixedNow,
    );
  });
}

// Test-only provider wiring: production uses @riverpod and the generated family.
// This is a bounded paging contract, not a shared app framework or certification
// of an existing feature controller's account/authorization behavior.
typedef _Scope = ({String accountId, String organizerId});
const _accountA = (accountId: 'account-a', organizerId: 'organizer');
const _accountB = (accountId: 'account-b', organizerId: 'organizer');
const _organizerB = (accountId: 'account-a', organizerId: 'other-organizer');
final _pageReaderProvider = Provider<_PageReader>(
  (ref) => throw UnimplementedError(),
);
final _pagedRowsProvider = AsyncNotifierProvider.autoDispose
    .family<_PagedRowsOwner, _PagedRows, _Scope>(_PagedRowsOwner.new);

class _Page {
  const _Page(this.rows, this.cursor);
  final List<String> rows;
  final String? cursor;
}

class _PagedRows {
  _PagedRows(
    List<String> rows,
    this.cursor, {
    this.loadingMore = false,
    this.pageError,
    this.refreshing = false,
    this.refreshError,
  }) : rows = List.unmodifiable(rows);
  final List<String> rows;
  final String? cursor;
  final bool loadingMore;
  final Object? pageError;
  final bool refreshing;
  final Object? refreshError;
}

class _PagedRowsOwner extends AsyncNotifier<_PagedRows> {
  _PagedRowsOwner(this.scope);
  final _Scope scope;
  int _generation = 0;
  Future<void>? _moreInFlight;
  Future<void>? _refreshInFlight;

  @override
  Future<_PagedRows> build() async {
    final reader = ref.watch(_pageReaderProvider);
    ref.onDispose(() {
      _generation++;
      _moreInFlight = null;
      _refreshInFlight = null;
    });
    final page = await reader.read(scope, null);
    return _PagedRows(page.rows, page.cursor);
  }

  bool _isCurrent(int generation) => ref.mounted && generation == _generation;

  Future<void> loadMore() {
    final existing = _moreInFlight;
    if (existing != null) return existing;
    final previous = state.asData?.value;
    if (_refreshInFlight != null ||
        previous == null ||
        previous.cursor == null) {
      return Future.value();
    }
    final generation = _generation;
    state = AsyncData(
      _PagedRows(previous.rows, previous.cursor, loadingMore: true),
    );
    late final Future<void> tracked;
    tracked =
        (() async {
          try {
            final page = await ref
                .read(_pageReaderProvider)
                .read(scope, previous.cursor);
            if (!_isCurrent(generation)) return;
            state = AsyncData(
              _PagedRows(
                {...previous.rows, ...page.rows}.toList(),
                page.cursor,
              ),
            );
          } on Object catch (error) {
            if (!_isCurrent(generation)) return;
            state = AsyncData(
              _PagedRows(previous.rows, previous.cursor, pageError: error),
            );
          }
        })().whenComplete(() {
          if (identical(_moreInFlight, tracked)) _moreInFlight = null;
        });
    _moreInFlight = tracked;
    return tracked;
  }

  Future<void> refresh() {
    final existing = _refreshInFlight;
    if (existing != null) return existing;
    // Initial build already owns the read; the route's refresh control is
    // disabled until that settles. The command boundary enforces it too.
    if (state.isLoading && state.value == null) return Future.value();
    final generation = ++_generation;
    _moreInFlight = null;
    final prior = state.value;
    state = prior == null
        ? const AsyncLoading<_PagedRows>()
        : AsyncData(_PagedRows(prior.rows, prior.cursor, refreshing: true));
    late final Future<void> tracked;
    tracked =
        (() async {
          try {
            final page = await ref.read(_pageReaderProvider).read(scope, null);
            if (!_isCurrent(generation)) return;
            state = AsyncData(_PagedRows(page.rows, page.cursor));
          } on Object catch (error, stack) {
            if (!_isCurrent(generation)) return;
            state = prior == null
                ? AsyncError<_PagedRows>(error, stack)
                : AsyncData(
                    _PagedRows(prior.rows, prior.cursor, refreshError: error),
                  );
          }
        })().whenComplete(() {
          if (identical(_refreshInFlight, tracked)) _refreshInFlight = null;
        });
    _refreshInFlight = tracked;
    return tracked;
  }
}

class _PageRequest {
  _PageRequest(this.scope, this.cursor);
  final _Scope scope;
  final String? cursor;
  final result = Completer<_Page>();
}

class _PageReader {
  final requests = <_PageRequest>[];
  Future<_Page> read(_Scope scope, String? cursor) {
    final request = _PageRequest(scope, cursor);
    requests.add(request);
    return request.result.future;
  }
}

class _PagingFixture {
  _PagingFixture() {
    container = ProviderContainer(
      overrides: [_pageReaderProvider.overrideWithValue(reader)],
    );
  }
  final reader = _PageReader();
  late final ProviderContainer container;
  final subscriptions =
      <_Scope, ProviderSubscription<AsyncValue<_PagedRows>>>{};
  _PagedRows rows(_Scope scope) =>
      container.read(_pagedRowsProvider(scope)).value!;
  Future<_PagedRowsOwner> open(_Scope scope) async {
    subscriptions[scope] = container.listen(
      _pagedRowsProvider(scope),
      (_, _) {},
    );
    final future = container.read(_pagedRowsProvider(scope).future);
    reader.requests.last.result.complete(const _Page(['first'], 'next'));
    await future;
    return container.read(_pagedRowsProvider(scope).notifier);
  }
}
