// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'launch_access_repository.dart';

// **************************************************************************
// RiverpodGenerator
// **************************************************************************

// GENERATED CODE - DO NOT MODIFY BY HAND
// ignore_for_file: type=lint, type=warning

@ProviderFor(launchAccessRepository)
final launchAccessRepositoryProvider = LaunchAccessRepositoryProvider._();

final class LaunchAccessRepositoryProvider
    extends
        $FunctionalProvider<
          LaunchAccessRepository,
          LaunchAccessRepository,
          LaunchAccessRepository
        >
    with $Provider<LaunchAccessRepository> {
  LaunchAccessRepositoryProvider._()
    : super(
        from: null,
        argument: null,
        retry: null,
        name: r'launchAccessRepositoryProvider',
        isAutoDispose: false,
        dependencies: null,
        $allTransitiveDependencies: null,
      );

  @override
  String debugGetCreateSourceHash() => _$launchAccessRepositoryHash();

  @$internal
  @override
  $ProviderElement<LaunchAccessRepository> $createElement(
    $ProviderPointer pointer,
  ) => $ProviderElement(pointer);

  @override
  LaunchAccessRepository create(Ref ref) {
    return launchAccessRepository(ref);
  }

  /// {@macro riverpod.override_with_value}
  Override overrideWithValue(LaunchAccessRepository value) {
    return $ProviderOverride(
      origin: this,
      providerOverride: $SyncValueProvider<LaunchAccessRepository>(value),
    );
  }
}

String _$launchAccessRepositoryHash() =>
    r'1fa2088b9ea7ec40e0167bd38e6682fb8665af3f';

@ProviderFor(watchLaunchAccessApplication)
final watchLaunchAccessApplicationProvider =
    WatchLaunchAccessApplicationFamily._();

final class WatchLaunchAccessApplicationProvider
    extends
        $FunctionalProvider<
          AsyncValue<LaunchAccessApplication?>,
          LaunchAccessApplication?,
          Stream<LaunchAccessApplication?>
        >
    with
        $FutureModifier<LaunchAccessApplication?>,
        $StreamProvider<LaunchAccessApplication?> {
  WatchLaunchAccessApplicationProvider._({
    required WatchLaunchAccessApplicationFamily super.from,
    required String super.argument,
  }) : super(
         retry: null,
         name: r'watchLaunchAccessApplicationProvider',
         isAutoDispose: true,
         dependencies: null,
         $allTransitiveDependencies: null,
       );

  @override
  String debugGetCreateSourceHash() => _$watchLaunchAccessApplicationHash();

  @override
  String toString() {
    return r'watchLaunchAccessApplicationProvider'
        ''
        '($argument)';
  }

  @$internal
  @override
  $StreamProviderElement<LaunchAccessApplication?> $createElement(
    $ProviderPointer pointer,
  ) => $StreamProviderElement(pointer);

  @override
  Stream<LaunchAccessApplication?> create(Ref ref) {
    final argument = this.argument as String;
    return watchLaunchAccessApplication(ref, argument);
  }

  @override
  bool operator ==(Object other) {
    return other is WatchLaunchAccessApplicationProvider &&
        other.argument == argument;
  }

  @override
  int get hashCode {
    return argument.hashCode;
  }
}

String _$watchLaunchAccessApplicationHash() =>
    r'92f096c8d1289f34ba7fec7ad22f939899e7605e';

final class WatchLaunchAccessApplicationFamily extends $Family
    with $FunctionalFamilyOverride<Stream<LaunchAccessApplication?>, String> {
  WatchLaunchAccessApplicationFamily._()
    : super(
        retry: null,
        name: r'watchLaunchAccessApplicationProvider',
        dependencies: null,
        $allTransitiveDependencies: null,
        isAutoDispose: true,
      );

  WatchLaunchAccessApplicationProvider call(String uid) =>
      WatchLaunchAccessApplicationProvider._(argument: uid, from: this);

  @override
  String toString() => r'watchLaunchAccessApplicationProvider';
}
