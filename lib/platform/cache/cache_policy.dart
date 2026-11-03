/// Lifetimes for screen data: how long a read stays in memory after its
/// screen closes, and when a returning screen refetches in the background.
///
/// A read owner declares at most one lifetime in its `build`:
///
/// - route (the default): `@riverpod` alone; dropped when its last listener
///   leaves;
/// - timed: `ref.retain(CachePolicies.x)`; kept for `retain` after its last
///   listener leaves;
/// - session: `ref.retainForSession(session)`, with an `AuthenticatedSession`
///   in the family key; kept until that signed-in period ends.
///
/// A hidden tab is not a closed screen. Riverpod pauses the listeners of a
/// screen whose tickers are off and never disposes a provider whose listeners
/// are only paused, so the retain window starts only when a listener is
/// removed. Durations come only from [CachePolicies]; see
/// `docs/screen_data_caching.md`.
library;

import 'dart:async';

import 'package:catch_dating_app/platform/cache/app_clock.dart';
import 'package:catch_dating_app/platform/cache/cache_policies.dart';
import 'package:flutter/foundation.dart';
import 'package:flutter_riverpod/misc.dart' show KeepAliveLink;
import 'package:riverpod_annotation/riverpod_annotation.dart';

export 'package:catch_dating_app/platform/cache/cache_policies.dart';

/// How long a read is kept after its screen closes, and how old its data may
/// be shown on return before one background refetch.
@immutable
final class CachePolicy {
  const CachePolicy({required this.retain, required this.staleAfter});

  /// How long the read stays in memory after its last listener leaves. Null
  /// keeps it for the signed-in period instead, through
  /// [CacheLifetimeRef.retainForSession].
  final Duration? retain;

  /// Data younger than this renders on return with no request; older data
  /// renders at once and is refetched once in the background. Zero refetches
  /// on every return. Null never refetches on return, as for a Firestore
  /// listener, which delivers its own updates.
  final Duration? staleAfter;

  /// Whether this policy keeps its read for the signed-in period.
  bool get isSessionLifetime => retain == null;

  /// Whether data fetched at [fetchedAt] is stale at [now].
  bool isStale(DateTime fetchedAt, DateTime now) {
    final limit = staleAfter;
    if (limit == null) return false;
    return !now.isBefore(fetchedAt.add(limit));
  }

  @override
  bool operator ==(Object other) =>
      other is CachePolicy &&
      other.retain == retain &&
      other.staleAfter == staleAfter;

  @override
  int get hashCode => Object.hash(retain, staleAfter);

  @override
  String toString() => 'CachePolicy(retain: $retain, staleAfter: $staleAfter)';
}

/// One uninterrupted signed-in period. The account context's
/// `AuthenticatedSession` implements it; the period ends at sign-out, on an
/// account change or after an authentication failure.
abstract interface class CacheSession {
  /// Calls [callback] once when this signed-in period ends, or soon after
  /// this call if it already has. The returned function cancels the call.
  void Function() whenEnded(void Function() callback);
}

/// The lifetime one build of a read owner holds. [fetchedAt] starts at the
/// build and moves when the owner records a completed fetch, so a return
/// measures staleness from the data's real age.
final class CacheLease {
  CacheLease._(this._ref, this._policy, this._clock)
    : _fetchedAt = _clock.now();

  final Ref _ref;
  final CachePolicy _policy;
  final AppClock _clock;
  DateTime _fetchedAt;
  KeepAliveLink? _link;
  Timer? _timer;
  bool _sessionEnded = false;

  /// When the data this build holds was fetched.
  DateTime get fetchedAt => _fetchedAt;

  /// Records when the data this build holds was fetched.
  void markFetched(DateTime at) => _fetchedAt = at;

  void _holdTimed() {
    _link = _ref.keepAlive();
    _ref
      ..onRemoveListener(_onRemoveListener)
      ..onResume(_onResume)
      ..onDispose(_cancelTimer);
    // A read with no listener at all, such as a one-off `read`, starts its
    // window once the build has run.
    scheduleMicrotask(_startRetainWindow);
  }

  void _holdForSession(CacheSession session) {
    _link = _ref.keepAlive();
    _ref
      ..onResume(_onResume)
      ..onDispose(session.whenEnded(_endSession));
  }

  // Lifecycle callbacks may not use the Ref, so each defers its work.
  void _onRemoveListener() {
    if (!_ref.isPaused) return;
    scheduleMicrotask(_startRetainWindow);
  }

  void _onResume() {
    _cancelTimer();
    scheduleMicrotask(_revalidate);
  }

  void _startRetainWindow() {
    // Paused listeners still count: a hidden tab never starts the window.
    if (!_ref.mounted || !_ref.isPaused) return;
    _link ??= _ref.keepAlive();
    _cancelTimer();
    _timer = _clock.timer(_policy.retain!, _release);
  }

  void _revalidate() {
    if (!_ref.mounted) return;
    if (!_policy.isSessionLifetime) _link ??= _ref.keepAlive();
    if (_sessionEnded) return;
    if (_policy.isStale(_fetchedAt, _clock.now())) _ref.invalidateSelf();
  }

  void _release() {
    _timer = null;
    final link = _link;
    _link = null;
    link?.close();
  }

  void _endSession() {
    _sessionEnded = true;
    if (!_ref.mounted) return;
    _release();
  }

  void _cancelTimer() {
    _timer?.cancel();
    _timer = null;
  }
}

/// Lifetimes declared from a read owner's `build`.
extension CacheLifetimeRef on Ref {
  /// Keeps this read for [CachePolicy.retain] after its last listener
  /// leaves, and refetches once in the background when a returning listener
  /// finds the data older than [CachePolicy.staleAfter].
  ///
  /// Pass a [CachePolicies] member, never an inline policy.
  CacheLease retain(CachePolicy policy) {
    if (policy.isSessionLifetime) {
      throw ArgumentError.value(
        policy,
        'policy',
        'A session policy is declared with retainForSession.',
      );
    }
    return CacheLease._(this, policy, read(appClockProvider)).._holdTimed();
  }

  /// Keeps this read until [session] ends, and refetches once in the
  /// background when a returning listener finds the data older than the
  /// policy's [CachePolicy.staleAfter]. The family key must carry [session].
  CacheLease retainForSession(
    CacheSession session, [
    CachePolicy policy = CachePolicies.sessionState,
  ]) {
    if (!policy.isSessionLifetime) {
      throw ArgumentError.value(
        policy,
        'policy',
        'A timed policy is declared with retain.',
      );
    }
    return CacheLease._(this, policy, read(appClockProvider))
      .._holdForSession(session);
  }
}
