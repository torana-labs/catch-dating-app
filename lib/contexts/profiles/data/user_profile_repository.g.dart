// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'user_profile_repository.dart';

// **************************************************************************
// RiverpodGenerator
// **************************************************************************

// GENERATED CODE - DO NOT MODIFY BY HAND
// ignore_for_file: type=lint, type=warning

@ProviderFor(userProfileRepository)
final userProfileRepositoryProvider = UserProfileRepositoryProvider._();

final class UserProfileRepositoryProvider
    extends
        $FunctionalProvider<
          UserProfileRepository,
          UserProfileRepository,
          UserProfileRepository
        >
    with $Provider<UserProfileRepository> {
  UserProfileRepositoryProvider._()
    : super(
        from: null,
        argument: null,
        retry: null,
        name: r'userProfileRepositoryProvider',
        isAutoDispose: false,
        dependencies: null,
        $allTransitiveDependencies: null,
      );

  @override
  String debugGetCreateSourceHash() => _$userProfileRepositoryHash();

  @$internal
  @override
  $ProviderElement<UserProfileRepository> $createElement(
    $ProviderPointer pointer,
  ) => $ProviderElement(pointer);

  @override
  UserProfileRepository create(Ref ref) {
    return userProfileRepository(ref);
  }

  /// {@macro riverpod.override_with_value}
  Override overrideWithValue(UserProfileRepository value) {
    return $ProviderOverride(
      origin: this,
      providerOverride: $SyncValueProvider<UserProfileRepository>(value),
    );
  }
}

String _$userProfileRepositoryHash() =>
    r'fbbfc488a51060b80a28e1389c57f22d24cdf228';

/// The signed-in user's profile listener. Route lifetime: the guest router
/// listens for the app's whole life, and a returning screen renders from the
/// on-device cache. It holds account data, so it is never kept alive.

@ProviderFor(watchUserProfile)
final watchUserProfileProvider = WatchUserProfileProvider._();

/// The signed-in user's profile listener. Route lifetime: the guest router
/// listens for the app's whole life, and a returning screen renders from the
/// on-device cache. It holds account data, so it is never kept alive.

final class WatchUserProfileProvider
    extends
        $FunctionalProvider<
          AsyncValue<UserProfile?>,
          UserProfile?,
          Stream<UserProfile?>
        >
    with $FutureModifier<UserProfile?>, $StreamProvider<UserProfile?> {
  /// The signed-in user's profile listener. Route lifetime: the guest router
  /// listens for the app's whole life, and a returning screen renders from the
  /// on-device cache. It holds account data, so it is never kept alive.
  WatchUserProfileProvider._()
    : super(
        from: null,
        argument: null,
        retry: null,
        name: r'watchUserProfileProvider',
        isAutoDispose: true,
        dependencies: null,
        $allTransitiveDependencies: null,
      );

  @override
  String debugGetCreateSourceHash() => _$watchUserProfileHash();

  @$internal
  @override
  $StreamProviderElement<UserProfile?> $createElement(
    $ProviderPointer pointer,
  ) => $StreamProviderElement(pointer);

  @override
  Stream<UserProfile?> create(Ref ref) {
    return watchUserProfile(ref);
  }
}

String _$watchUserProfileHash() => r'1da4b558a5b415e81870cfc6f1fdfccacce988d8';
