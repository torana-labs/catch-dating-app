// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'manager_event_setup_defaults_repository.dart';

// **************************************************************************
// RiverpodGenerator
// **************************************************************************

// GENERATED CODE - DO NOT MODIFY BY HAND
// ignore_for_file: type=lint, type=warning
/// The ManagerEventSetupDefaultsRepository over the app's callable functions.

@ProviderFor(managerEventSetupDefaultsRepository)
final managerEventSetupDefaultsRepositoryProvider =
    ManagerEventSetupDefaultsRepositoryProvider._();

/// The ManagerEventSetupDefaultsRepository over the app's callable functions.

final class ManagerEventSetupDefaultsRepositoryProvider
    extends
        $FunctionalProvider<
          ManagerEventSetupDefaultsRepository,
          ManagerEventSetupDefaultsRepository,
          ManagerEventSetupDefaultsRepository
        >
    with $Provider<ManagerEventSetupDefaultsRepository> {
  /// The ManagerEventSetupDefaultsRepository over the app's callable functions.
  ManagerEventSetupDefaultsRepositoryProvider._()
    : super(
        from: null,
        argument: null,
        retry: null,
        name: r'managerEventSetupDefaultsRepositoryProvider',
        isAutoDispose: true,
        dependencies: null,
        $allTransitiveDependencies: null,
      );

  @override
  String debugGetCreateSourceHash() =>
      _$managerEventSetupDefaultsRepositoryHash();

  @$internal
  @override
  $ProviderElement<ManagerEventSetupDefaultsRepository> $createElement(
    $ProviderPointer pointer,
  ) => $ProviderElement(pointer);

  @override
  ManagerEventSetupDefaultsRepository create(Ref ref) {
    return managerEventSetupDefaultsRepository(ref);
  }

  /// {@macro riverpod.override_with_value}
  Override overrideWithValue(ManagerEventSetupDefaultsRepository value) {
    return $ProviderOverride(
      origin: this,
      providerOverride: $SyncValueProvider<ManagerEventSetupDefaultsRepository>(
        value,
      ),
    );
  }
}

String _$managerEventSetupDefaultsRepositoryHash() =>
    r'132fbb180d13e06732b26871c91d439bc45ec717';
