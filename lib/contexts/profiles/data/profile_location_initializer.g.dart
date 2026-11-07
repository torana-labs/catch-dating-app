// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'profile_location_initializer.dart';

// **************************************************************************
// RiverpodGenerator
// **************************************************************************

// GENERATED CODE - DO NOT MODIFY BY HAND
// ignore_for_file: type=lint, type=warning
/// Records the device location on a profile that has none. Route lifetime:
/// the app root watches it for the app's whole life, so it still runs once
/// per process; it reads account data, so it is never kept alive.

@ProviderFor(ProfileLocationInitializer)
final profileLocationInitializerProvider =
    ProfileLocationInitializerProvider._();

/// Records the device location on a profile that has none. Route lifetime:
/// the app root watches it for the app's whole life, so it still runs once
/// per process; it reads account data, so it is never kept alive.
final class ProfileLocationInitializerProvider
    extends $AsyncNotifierProvider<ProfileLocationInitializer, void> {
  /// Records the device location on a profile that has none. Route lifetime:
  /// the app root watches it for the app's whole life, so it still runs once
  /// per process; it reads account data, so it is never kept alive.
  ProfileLocationInitializerProvider._()
    : super(
        from: null,
        argument: null,
        retry: null,
        name: r'profileLocationInitializerProvider',
        isAutoDispose: true,
        dependencies: null,
        $allTransitiveDependencies: null,
      );

  @override
  String debugGetCreateSourceHash() => _$profileLocationInitializerHash();

  @$internal
  @override
  ProfileLocationInitializer create() => ProfileLocationInitializer();
}

String _$profileLocationInitializerHash() =>
    r'f333c089d45ee816b9d5a7bbd830dba8b7d01e86';

/// Records the device location on a profile that has none. Route lifetime:
/// the app root watches it for the app's whole life, so it still runs once
/// per process; it reads account data, so it is never kept alive.

abstract class _$ProfileLocationInitializer extends $AsyncNotifier<void> {
  FutureOr<void> build();
  @$mustCallSuper
  @override
  WhenComplete runBuild() {
    final ref = this.ref as $Ref<AsyncValue<void>, void>;
    final element =
        ref.element
            as $ClassProviderElement<
              AnyNotifier<AsyncValue<void>, void>,
              AsyncValue<void>,
              Object?,
              Object?
            >;
    return element.handleCreate(ref, build);
  }
}
