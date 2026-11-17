import 'dart:async';

import 'package:catch_platform/cache/app_clock.dart';
import 'package:catch_platform/cache/cache_policy.dart';
import 'package:flutter/foundation.dart';
import 'package:riverpod_annotation/riverpod_annotation.dart';

part 'callable_read.g.dart';

/// A read's cache key. It is a value-equality query object, used as the read
/// owner's family argument, and it builds the request it stands for, so the
/// key and the payload cannot drift apart.
abstract interface class CacheQuery<RequestT> {
  /// The callable payload, or the parameters of a one-shot get.
  RequestT toRequest();
}

/// Data from a Cloud Function read or a one-shot get, with its freshness.
///
/// A view model passes [fetchedAt] through, so a screen can say "Updated
/// 4 min ago" without knowing the cache. A failed background refetch is the
/// provider's own state: Riverpod keeps the previous value beside the error
/// (`hasValue && hasError`), so the screen keeps this data and can say
/// "Couldn't refresh, updated 4 min ago". Whether a refetch is running is
/// `AsyncValue.isRefreshing`.
@immutable
final class CachedRead<T> {
  const CachedRead({required this.data, required this.fetchedAt});

  /// The last data the read returned.
  final T data;

  /// When [data] arrived, by the app clock.
  final DateTime fetchedAt;

  /// How old [data] is at [now].
  Duration age(DateTime now) => now.difference(fetchedAt);

  @override
  bool operator ==(Object other) =>
      other is CachedRead<T> &&
      other.data == data &&
      other.fetchedAt == fetchedAt;

  @override
  int get hashCode => Object.hash(data, fetchedAt);
}

/// The one client for Cloud Function reads and one-shot gets.
///
/// It builds the request from the query, bounds the wait with the read
/// class's deadline (its `firstLoad`, or its `refresh` when data is already
/// showing) and stamps the result with the app clock. A failure, a timeout
/// included, is rethrown: on a refetch Riverpod keeps the previous data
/// beside the error, and a first load fails.
final class CallableReadClient {
  const CallableReadClient({required this._clock});

  final AppClock _clock;

  /// Reads [query] through [fetch] within [policy]'s deadline.
  Future<CachedRead<T>> read<RequestT, T>({
    required CachePolicy policy,
    required CacheQuery<RequestT> query,
    required Future<T> Function(RequestT request) fetch,
    required bool refreshing,
  }) async {
    final deadline = policy.deadline(refreshing: refreshing);
    final data = await fetch(query.toRequest()).timeout(deadline);
    return CachedRead(data: data, fetchedAt: _clock.now());
  }
}

// keepalive: a stateless client that holds no data or account state.
@Riverpod(keepAlive: true)
CallableReadClient callableReadClient(Ref ref) =>
    CallableReadClient(clock: ref.watch(appClockProvider));

/// Stale-while-revalidate for a read owner's `build`.
extension CallableReadRef on Ref {
  /// Reads [query] through the one client and holds the result under
  /// [policy]: a return within `staleAfter` renders with no request; a later
  /// return, or a hidden tab becoming visible, renders the kept data and
  /// refetches once in the background. A session policy also needs the
  /// [session] the family key carries.
  ///
  /// The read owner is an `AsyncNotifier` whose family argument is [query];
  /// its `build` passes `state.hasValue` as [refreshing], so a refetch of
  /// data already on screen gets the policy's `refresh` deadline and a first
  /// load its `firstLoad`. A failed refetch keeps the data through
  /// Riverpod's own state.
  Future<CachedRead<T>> callableRead<RequestT, T>({
    required CachePolicy policy,
    required CacheQuery<RequestT> query,
    required Future<T> Function(RequestT request) fetch,
    required bool refreshing,
    CacheSession? session,
  }) async {
    final CacheLease lease;
    if (!policy.isSessionLifetime) {
      lease = retain(policy);
    } else if (session != null) {
      lease = retainForSession(session, policy);
    } else {
      throw ArgumentError.notNull('session');
    }
    final client = read(callableReadClientProvider);
    final result = await client.read(
      policy: policy,
      query: query,
      fetch: fetch,
      refreshing: refreshing,
    );
    lease.markFetched(result.fetchedAt);
    return result;
  }
}
