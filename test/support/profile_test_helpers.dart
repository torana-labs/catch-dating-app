import 'dart:async';

import 'package:catch_dating_app/contexts/profiles/data/user_profile_repository.dart';
import 'package:catch_dating_app/contexts/profiles/domain/profile_prompts.dart';
import 'package:catch_dating_app/contexts/profiles/domain/user_profile.dart';
import 'package:catch_dating_app/core/schema_contracts/generated/callable_request_dtos.g.dart'
    show UpdateUserProfilePatch;
import 'package:catch_dating_app/platform/errors/error_logger.dart';
import 'package:flutter_test/flutter_test.dart';

/// A [UserProfileRepository] fake that tracks every update and can simulate
/// delayed saves, errors, and in-memory profile state for tests that chain
/// multiple saves.
class FakeProfileRepository extends Fake implements UserProfileRepository {
  FakeProfileRepository({this.latestProfile});

  Completer<void>? updateCompleter;
  Object? updateError;
  UserProfile? latestProfile;
  final updatedUids = <String>[];
  final updatedPatches = <UpdateUserProfilePatch>[];
  final _updateWaiters = <_ProfileUpdateWaiter>[];
  int fetchCount = 0;

  @override
  Future<UserProfile?> fetchUserProfile({required String? uid}) async {
    fetchCount += 1;
    return latestProfile;
  }

  @override
  Future<void> updateUserProfile({
    required String uid,
    required UpdateUserProfilePatch patch,
    String action = 'update profile',
  }) async {
    updatedUids.add(uid);
    updatedPatches.add(patch);
    _notifyUpdateWaiters();
    _applyPatch(patch);
    final error = updateError;
    if (error != null) throw error;
    final completer = updateCompleter;
    if (completer != null) await completer.future;
  }

  Future<void> waitForUpdateCount(int count) {
    if (updatedPatches.length >= count) return Future<void>.value();
    final waiter = _ProfileUpdateWaiter(count);
    _updateWaiters.add(waiter);
    return waiter.completer.future.timeout(
      const Duration(seconds: 1),
      onTimeout: () {
        _updateWaiters.remove(waiter);
        fail('Timed out waiting for $count profile update(s).');
      },
    );
  }

  void _notifyUpdateWaiters() {
    for (final waiter in List<_ProfileUpdateWaiter>.of(_updateWaiters)) {
      if (updatedPatches.length < waiter.count) continue;
      _updateWaiters.remove(waiter);
      if (!waiter.completer.isCompleted) waiter.completer.complete();
    }
  }

  void _applyPatch(UpdateUserProfilePatch patch) {
    final profile = latestProfile;
    if (profile == null) return;
    final fields = patch.toFieldsJson();
    var updatedProfile = profile;
    final activityPreferences = fields['activityPreferences'];
    if (activityPreferences is Map) {
      updatedProfile = updatedProfile.copyWith(
        activityPreferences: ActivityPreferences.fromJson(
          Map<String, dynamic>.from(activityPreferences),
        ),
      );
    }
    final profilePrompts = fields['profilePrompts'];
    if (profilePrompts is List) {
      updatedProfile = updatedProfile.copyWith(
        profilePrompts: [
          for (final prompt in profilePrompts)
            ProfilePromptAnswer.fromJson(Map<String, dynamic>.from(prompt)),
        ],
      );
    }
    latestProfile = updatedProfile;
  }
}

class _ProfileUpdateWaiter {
  _ProfileUpdateWaiter(this.count);

  final int count;
  final completer = Completer<void>();
}

/// A [UserProfileRepository] fake for widget tests that use
/// [FakeProfileEditUserProfileRepository]-style field tracking.
class FakeProfileEditRepository extends Fake implements UserProfileRepository {
  Completer<void>? updateCompleter;
  Object? updateError;
  UserProfile? latestProfile;
  String? updatedUid;
  Map<String, dynamic>? updatedFields;

  @override
  Future<UserProfile?> fetchUserProfile({required String? uid}) async {
    return latestProfile;
  }

  @override
  Future<void> updateUserProfile({
    required String uid,
    required UpdateUserProfilePatch patch,
    String action = 'update_profile',
  }) async {
    updatedUid = uid;
    updatedFields = Map<String, dynamic>.from(patch.toFieldsJson());
    final error = updateError;
    if (error != null) throw error;
    final completer = updateCompleter;
    if (completer != null) await completer.future;
  }
}

/// An [ErrorLogger] that swallows all log calls, suitable for tests that
/// exercise error paths without polluting the test runner output.
class SilentErrorLogger extends ErrorLogger {
  SilentErrorLogger() : super(crashReporter: null, shouldReportErrors: false);

  @override
  void log({
    required LogLevel level,
    required String message,
    Object? error,
    StackTrace? stackTrace,
    Map<String, String>? context,
  }) {}
}

/// Waits until [repository] records [count] patches.
Future<void> waitForRepositoryUpdates(
  FakeProfileRepository repository,
  int count,
) => repository.waitForUpdateCount(count);
