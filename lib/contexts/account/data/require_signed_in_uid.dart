import 'package:catch_dating_app/contexts/account/data/auth_repository.dart';
import 'package:catch_dating_app/exceptions/app_exception.dart';
import 'package:riverpod_annotation/riverpod_annotation.dart';

/// Returns the current user's UID, throwing [SignInRequiredException] if the
/// user is not signed in.
///
/// Call this at the top of controller methods that require authentication.
/// The thrown [SignInRequiredException] is an [AppException] and will be
/// handled gracefully by the error display pipeline.
String requireSignedInUid(Ref ref, {required String action}) {
  final uid = ref.read(uidProvider).asData?.value;
  if (uid == null || uid.isEmpty) {
    throw SignInRequiredException(action);
  }
  return uid;
}
