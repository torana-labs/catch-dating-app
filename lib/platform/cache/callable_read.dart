import 'dart:async';

import 'package:catch_dating_app/platform/cache/app_clock.dart';
import 'package:catch_dating_app/platform/cache/cache_policy.dart';
import 'package:catch_dating_app/platform/firebase/initial_load_policy.dart';
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
/// A view model passes [fetchedAt] and [refreshError] through, so a screen
/// can say "Updated 4 min ago" or "Couldn't refresh" without knowing the
/// cache. Whether a background refetch is running is the provider's
/// `AsyncValue.isRefreshing`.
@immutable
final class CachedRead<T> {
  const CachedRead({
    required this.data,
    required this.fetchedAt,
    this.refreshError,
    this.refreshStackTrace,
  });

  /// The last data the read returned.
  final T data;

  /// When [data] arrived, by the app clock.
  final DateTime fetchedAt;

  /// Why the last background refetch failed; null when it succeeded.
  final Object? refreshError;

  /// The stack trace of [refreshError].
  final StackTrace? refreshStackTrace;

  /// Whether the last background refetch failed and [data] is older than it.
  bool get hasRefreshError => refreshError != null;

  /// How old [data] is at [now].
  Duration age(DateTime now) => now.difference(fetchedAt);

  /// This read with its data kept after a failed background refetch.
  CachedRead<T> withRefreshError(Object error, StackTrace stackTrace) =>
      CachedRead(
        data: data,
        fetchedAt: fetchedAt,
        refreshError: error,
        refreshStackTrace: stackTrace,
      );

  @override
  bool operator ==(Object other) =>
      other is CachedRead<T> &&
      other.data == data &&
      other.fetchedAt == fetchedAt &&
      other.refreshError == refreshError;

  @override
  int get hashCode => Object.hash(data, fetchedAt, refreshError);
}

/// The one client for Cloud Function reads and one-shot gets.
///
/// It builds the request from the query, bounds the wait with [timeout] and
/// stamps the result with the app clock. When a background refetch fails it
/// keeps the previous data and records the failure, so credible data is
/// never replaced by a full-screen error; a first read still fails.
final class CallableReadClient {
  const CallableReadClient({
    required this._clock,
    this.timeout = InitialLoadPolicy.standard,
  });

  final AppClock _clock;

  /// How long one read may take before it fails with a timeout.
  final Duration timeout;

  /// Reads [query] through [fetch]. [previous] is the read owner's last
  /// value: null on a first read, which fails on error; otherwise a failure
  /// keeps it with [CachedRead.refreshError] set.
  Future<CachedRead<T>> read<RequestT, T>({
    required CacheQuery<RequestT> query,
    required Future<T> Function(RequestT request) fetch,
    required CachedRead<T>? previous,
  }) async {
    try {
      final data = await fetch(query.toRequest()).timeout(timeout);
      return CachedRead(data: data, fetchedAt: _clock.now());
    } catch (error, stackTrace) {
      if (previous == null) rethrow;
      return previous.withRefreshError(error, stackTrace);
    }
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
  /// its `build` passes `state.value` as [previous], so a failed background
  /// refetch keeps the data.
  Future<CachedRead<T>> callableRead<RequestT, T>({
    required CachePolicy policy,
    required CacheQuery<RequestT> query,
    required Future<T> Function(RequestT request) fetch,
    required CachedRead<T>? previous,
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
      query: query,
      fetch: fetch,
      previous: previous,
    );
    lease.markFetched(result.fetchedAt);
    return result;
  }
}
