import 'package:catch_dating_app/contexts/profiles/domain/photo_upload_state.dart';
import 'package:catch_dating_app/core/presentation/catch_async_state.dart';
import 'package:catch_dating_app/user_profile/presentation/self_profile_screen_state.dart';
import 'package:flutter_test/flutter_test.dart';

import '../events/events_test_helpers.dart';

const PhotoUploadState _idleUploadState = PhotoUploadState();
final _today = DateTime(2026, 6, 24);

void main() {
  test('retained profile data is hidden during reload and refresh errors', () {
    final user = buildUser();
    for (final asyncState in [
      CatchAsyncState.refreshing(user),
      CatchAsyncState.staleData(user, StateError('failed')),
    ]) {
      final state = SelfProfileScreenState.fromAsync(
        profileState: asyncState,
        today: _today,
        uploadState: _idleUploadState,
        uploadMutationPending: false,
        saveMutationPending: false,
      );
      expect(state.isReady, false);
      expect(state.user, isNull);
      expect(state.previewProfile, isNull);
    }
  });

  test('SelfProfileScreenState maps loading profile state', () {
    final state = SelfProfileScreenState.fromAsync(
      profileState: const CatchAsyncState.loading(),
      today: _today,
      uploadState: _idleUploadState,
      uploadMutationPending: false,
      saveMutationPending: false,
    );

    expect(state.status, SelfProfileRouteStatus.loading);
    expect(state.user, isNull);
    expect(state.previewProfile, isNull);
    expect(state.retryIntent, isNull);
    expect(state.mutationMode, SelfProfileMutationMode.idle);
  });

  test('SelfProfileScreenState maps profile errors to retry intent', () {
    final error = StateError('profile failed');

    final state = SelfProfileScreenState.fromAsync(
      profileState: CatchAsyncState.error(error),
      today: _today,
      uploadState: _idleUploadState,
      uploadMutationPending: false,
      saveMutationPending: false,
    );

    expect(state.status, SelfProfileRouteStatus.error);
    expect(state.error, same(error));
    expect(state.retryIntent, SelfProfileRetryIntent.reloadProfile);
  });

  test(
    'SelfProfileScreenState maps null profile to unavailable route state',
    () {
      final state = SelfProfileScreenState.fromAsync(
        profileState: const CatchAsyncState.data(null),
        today: _today,
        uploadState: _idleUploadState,
        uploadMutationPending: false,
        saveMutationPending: false,
      );

      expect(state.status, SelfProfileRouteStatus.unavailable);
      expect(state.user, isNull);
      expect(state.previewProfile, isNull);
    },
  );

  test('SelfProfileScreenState projects ready profile and mutation modes', () {
    final user = buildUser(
      name: 'Suvrat Garg',
      email: 'suvrat@example.com',
    ).copyWith(displayName: 'S.');
    final uploadError = StateError('upload failed');
    final uploadState = PhotoUploadState.fromLegacy(
      loadingIndices: {1},
      uploadError: uploadError,
    );

    final state = SelfProfileScreenState.fromAsync(
      profileState: CatchAsyncState.data(user),
      today: _today,
      uploadState: uploadState,
      uploadMutationPending: true,
      saveMutationPending: true,
    );

    expect(state.status, SelfProfileRouteStatus.ready);
    expect(state.isReady, isTrue);
    expect(state.user, same(user));
    expect(state.previewProfile?.uid, user.uid);
    expect(state.previewProfile?.name, 'S.');
    expect(state.uploadState.uploadError, same(uploadError));
    expect(state.uploadState.loadingIndices, {1});
    expect(state.mutationMode, SelfProfileMutationMode.uploadAndSavePending);
    expect(state.isMutating, isTrue);
    expect(state.isUploadMutating, isTrue);
    expect(state.isSaveMutating, isTrue);
  });

  test(
    'SelfProfileMutationMode tracks upload and save flags independently',
    () {
      final uploadOnly = selfProfileMutationModeFromFlags(
        uploadPending: true,
        savePending: false,
      );
      final saveOnly = selfProfileMutationModeFromFlags(
        uploadPending: false,
        savePending: true,
      );

      expect(uploadOnly, SelfProfileMutationMode.uploadPending);
      expect(saveOnly, SelfProfileMutationMode.savePending);
    },
  );
}
