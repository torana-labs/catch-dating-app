import 'package:catch_dating_app/public_profile/presentation/public_profile_screen_state.dart';
import 'package:catch_dating_app/public_profile/presentation/public_profile_screen_view_model.dart';
import 'package:catch_l10n/generated/app_localizations_en.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';

import '../events/events_test_helpers.dart';

void main() {
  test('PublicProfileScreenState maps cold loading without fallback', () {
    final viewer = buildUser(uid: 'viewer-1', name: 'Viewer');

    final state = publicProfileScreenStateFromAsync(
      uid: 'runner-1',
      profileAsync: const AsyncLoading(),
      initialProfile: null,
      viewerProfile: viewer,
      sharedRunTitle: null,
      blockPending: false,
      reportPending: false,
    );

    expect(state.status, PublicProfileRouteStatus.loading);
    expect(state.title(AppLocalizationsEn()), 'Profile');
    expect(state.profile, isNull);
    expect(state.viewerProfileForSurface, isNull);
    expect(state.showSafetyActions, isFalse);
  });

  test(
    'PublicProfileScreenState keeps initial profile visible while loading',
    () {
      final initialProfile = buildPublicProfile(name: 'Riya');
      final viewer = buildUser(uid: 'viewer-1', name: 'Viewer');

      final state = publicProfileScreenStateFromAsync(
        uid: 'runner-1',
        profileAsync: const AsyncLoading(),
        initialProfile: initialProfile,
        viewerProfile: viewer,
        sharedRunTitle: 'Sundowner 5K',
        blockPending: false,
        reportPending: false,
      );

      expect(state.status, PublicProfileRouteStatus.ready);
      expect(state.profile, same(initialProfile));
      expect(state.title(AppLocalizationsEn()), 'Riya');
      expect(state.isInitialProfileFallback, isTrue);
      expect(state.viewerProfileForSurface, same(viewer));
      expect(state.sharedRunTitle, 'Sundowner 5K');
      expect(state.showSafetyActions, isTrue);
    },
  );

  test('PublicProfileScreenState maps errors to retry intent', () {
    final error = StateError('profile failed');

    final state = publicProfileScreenStateFromAsync(
      uid: 'runner-1',
      profileAsync: AsyncError(error, StackTrace.empty),
      initialProfile: null,
      viewerProfile: null,
      sharedRunTitle: null,
      blockPending: false,
      reportPending: false,
    );

    expect(state.status, PublicProfileRouteStatus.error);
    expect(state.error, same(error));
    expect(state.retryIntent, PublicProfileRetryIntent.reloadProfile);
  });

  test('PublicProfileScreenState maps null profile to unavailable state', () {
    final state = publicProfileScreenStateFromAsync(
      uid: 'runner-1',
      profileAsync: const AsyncData(null),
      initialProfile: null,
      viewerProfile: null,
      sharedRunTitle: null,
      blockPending: false,
      reportPending: false,
    );

    expect(state.status, PublicProfileRouteStatus.unavailable);
    expect(state.profile, isNull);
    expect(state.showSafetyActions, isFalse);
  });

  test('PublicProfileScreenState hides viewer context for own profile', () {
    final profile = buildPublicProfile(name: 'Riya');
    final viewer = buildUser(name: 'Riya');

    final state = publicProfileScreenStateFromAsync(
      uid: 'runner-1',
      profileAsync: AsyncData(profile),
      initialProfile: null,
      viewerProfile: viewer,
      sharedRunTitle: null,
      blockPending: true,
      reportPending: true,
    );

    expect(state.status, PublicProfileRouteStatus.ready);
    expect(state.viewerProfileForSurface, isNull);
    expect(state.mutationMode, PublicProfileMutationMode.reportAndBlockPending);
    expect(state.isSubmitting, isTrue);
    expect(state.enableSafetyActions, isFalse);
  });

  test(
    'PublicProfileMutationMode tracks report and block flags independently',
    () {
      expect(
        publicProfileMutationModeFromFlags(
          blockPending: true,
          reportPending: false,
        ),
        PublicProfileMutationMode.blockPending,
      );
      expect(
        publicProfileMutationModeFromFlags(
          blockPending: false,
          reportPending: true,
        ),
        PublicProfileMutationMode.reportPending,
      );
    },
  );
}
