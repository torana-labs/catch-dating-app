import 'package:catch_dating_app/core/backend_error_util.dart';
import 'package:catch_dating_app/core/firebase_providers.dart';
import 'package:catch_dating_app/exceptions/app_exception.dart';
import 'package:firebase_auth/firebase_auth.dart';
import 'package:riverpod_annotation/riverpod_annotation.dart';

part 'auth_repository.g.dart';

class AuthRepository {
  const AuthRepository(this._auth);

  final FirebaseAuth _auth;

  User? get currentUser => _auth.currentUser;

  Stream<User?> authStateChanges() => withBackendErrorStream(
    () => _auth.authStateChanges(),
    context: const BackendErrorContext(
      service: BackendService.auth,
      action: 'watch auth session',
      resource: 'auth_session',
    ),
  );

  // ── Phone OTP auth ────────────────────────────────────────────────────────

  Future<void> verifyPhoneNumber({
    required String phoneNumber,
    int? forceResendingToken,
    required void Function(String verificationId, int? resendToken) codeSent,
    required void Function(AppException e) verificationFailed,
    required void Function(PhoneAuthCredential credential)
    verificationCompleted,
  }) {
    const context = BackendErrorContext(
      service: BackendService.auth,
      action: 'send verification code',
      resource: 'phone_auth',
    );
    return withBackendErrorContext(
      () => _auth.verifyPhoneNumber(
        phoneNumber: phoneNumber,
        verificationCompleted: verificationCompleted,
        verificationFailed: (error) {
          verificationFailed(normalizeBackendError(error, context: context));
        },
        codeSent: codeSent,
        codeAutoRetrievalTimeout: (_) {},
        forceResendingToken: forceResendingToken,
      ),
      context: context,
    );
  }

  Future<void> signInWithOtp({
    required String verificationId,
    required String smsCode,
  }) => withBackendErrorContext(
    () async {
      final credential = PhoneAuthProvider.credential(
        verificationId: verificationId,
        smsCode: smsCode,
      );
      await _auth.signInWithCredential(credential);
    },
    context: const BackendErrorContext(
      service: BackendService.auth,
      action: 'verify sign-in code',
      resource: 'phone_auth',
    ),
  );

  Future<void> signInWithCredential(AuthCredential credential) =>
      withBackendErrorContext(
        () => _auth.signInWithCredential(credential),
        context: const BackendErrorContext(
          service: BackendService.auth,
          action: 'sign in',
          resource: 'auth_session',
        ),
      );

  // ── Sign out ──────────────────────────────────────────────────────────────

  Future<void> signOut() => withBackendErrorContext(
    () => _auth.signOut(),
    context: const BackendErrorContext(
      service: BackendService.auth,
      action: 'sign out',
      resource: 'auth_session',
    ),
  );
}

// keepalive: auth repository wraps the FirebaseAuth singleton used by every
// auth-dependent route and provider.
@Riverpod(keepAlive: true)
AuthRepository authRepository(Ref ref) =>
    AuthRepository(ref.watch(firebaseAuthProvider));

// keepalive: auth state is the root session stream and should not restart on
// tab or route switches.
@Riverpod(keepAlive: true)
Stream<User?> authStateChanges(Ref ref) =>
    ref.watch(authRepositoryProvider).authStateChanges();

// keepalive: uid is the app-wide identity primitive consumed by route gates,
// repositories, and feature view models.
@Riverpod(keepAlive: true)
Stream<String?> uid(Ref ref) =>
    ref.watch(authRepositoryProvider).authStateChanges().map((u) => u?.uid);
