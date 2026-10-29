// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'safety_repository.dart';

// **************************************************************************
// RiverpodGenerator
// **************************************************************************

// GENERATED CODE - DO NOT MODIFY BY HAND
// ignore_for_file: type=lint, type=warning

@ProviderFor(safetyRepository)
final safetyRepositoryProvider = SafetyRepositoryProvider._();

final class SafetyRepositoryProvider
    extends
        $FunctionalProvider<
          SafetyRepository,
          SafetyRepository,
          SafetyRepository
        >
    with $Provider<SafetyRepository> {
  SafetyRepositoryProvider._()
    : super(
        from: null,
        argument: null,
        retry: null,
        name: r'safetyRepositoryProvider',
        isAutoDispose: true,
        dependencies: null,
        $allTransitiveDependencies: null,
      );

  @override
  String debugGetCreateSourceHash() => _$safetyRepositoryHash();

  @$internal
  @override
  $ProviderElement<SafetyRepository> $createElement($ProviderPointer pointer) =>
      $ProviderElement(pointer);

  @override
  SafetyRepository create(Ref ref) {
    return safetyRepository(ref);
  }

  /// {@macro riverpod.override_with_value}
  Override overrideWithValue(SafetyRepository value) {
    return $ProviderOverride(
      origin: this,
      providerOverride: $SyncValueProvider<SafetyRepository>(value),
    );
  }
}

String _$safetyRepositoryHash() => r'0aafe410a486c7e46e2370fc1cb77bab49762529';

@ProviderFor(watchBlockedUsers)
final watchBlockedUsersProvider = WatchBlockedUsersProvider._();

final class WatchBlockedUsersProvider
    extends
        $FunctionalProvider<
          AsyncValue<List<BlockedUser>>,
          List<BlockedUser>,
          Stream<List<BlockedUser>>
        >
    with
        $FutureModifier<List<BlockedUser>>,
        $StreamProvider<List<BlockedUser>> {
  WatchBlockedUsersProvider._()
    : super(
        from: null,
        argument: null,
        retry: null,
        name: r'watchBlockedUsersProvider',
        isAutoDispose: true,
        dependencies: null,
        $allTransitiveDependencies: null,
      );

  @override
  String debugGetCreateSourceHash() => _$watchBlockedUsersHash();

  @$internal
  @override
  $StreamProviderElement<List<BlockedUser>> $createElement(
    $ProviderPointer pointer,
  ) => $StreamProviderElement(pointer);

  @override
  Stream<List<BlockedUser>> create(Ref ref) {
    return watchBlockedUsers(ref);
  }
}

String _$watchBlockedUsersHash() => r'6a6a4ba7f6f7b2bbc722e2a4cfefc7c76806f07a';
