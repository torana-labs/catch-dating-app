import 'package:catch_dating_app/contexts/account/data/auth_repository.dart';
import 'package:catch_dating_app/exceptions/app_exception.dart';
import 'package:riverpod_annotation/riverpod_annotation.dart';

part 'authenticated_session.g.dart';

/// An opaque, uninterrupted authenticated period. UID equality alone cannot
/// restore a review that predates sign-out, an auth failure or account change.
final class AuthenticatedSession {
  AuthenticatedSession._(this.uid);
  final String uid;
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
  return AsyncData(AuthenticatedSession._(uid));
}
