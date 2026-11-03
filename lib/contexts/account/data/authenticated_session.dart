import 'dart:async';

import 'package:catch_dating_app/contexts/account/data/auth_repository.dart';
import 'package:catch_platform/cache/cache_policy.dart';
import 'package:catch_platform/errors/app_exception.dart';
import 'package:riverpod_annotation/riverpod_annotation.dart';

part 'authenticated_session.g.dart';

/// An opaque, uninterrupted authenticated period. UID equality alone cannot
/// restore a review that predates sign-out, an auth failure or account change.
///
/// The period ends when [authenticatedSessionProvider] moves on to another
/// value; reads kept with `ref.retainForSession` are released then.
final class AuthenticatedSession implements CacheSession {
  AuthenticatedSession._(this.uid);
  final String uid;

  var _ended = false;
  final _onEnded = <void Function()>[];

  @override
  void Function() whenEnded(void Function() callback) {
    if (_ended) {
      scheduleMicrotask(callback);
      return () {};
    }
    _onEnded.add(callback);
    return () => _onEnded.remove(callback);
  }

  void _end() {
    if (_ended) return;
    _ended = true;
    final callbacks = [..._onEnded];
    _onEnded.clear();
    for (final callback in callbacks) {
      callback();
    }
  }
}

// keepalive: Long-lived feature providers share one authenticated account view.
@Riverpod(keepAlive: true)
AsyncValue<AuthenticatedSession> authenticatedSession(Ref ref) {
  final auth = ref.watch(uidProvider);
  if (auth.isLoading) return const AsyncLoading();
  if (auth.hasError) return AsyncError(auth.error!, auth.stackTrace!);
  final uid = auth.asData?.value;
  if (uid == null || uid.isEmpty) {
    return AsyncError(
      const SignInRequiredException('review host actions'),
      StackTrace.current,
    );
  }
  final session = AuthenticatedSession._(uid);
  ref.onDispose(session._end);
  return AsyncData(session);
}
