// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'push_installation_store.dart';

// **************************************************************************
// RiverpodGenerator
// **************************************************************************

// GENERATED CODE - DO NOT MODIFY BY HAND
// ignore_for_file: type=lint, type=warning

@ProviderFor(pushInstallationStore)
final pushInstallationStoreProvider = PushInstallationStoreProvider._();

final class PushInstallationStoreProvider
    extends
        $FunctionalProvider<
          PushInstallationStore,
          PushInstallationStore,
          PushInstallationStore
        >
    with $Provider<PushInstallationStore> {
  PushInstallationStoreProvider._()
    : super(
        from: null,
        argument: null,
        retry: null,
        name: r'pushInstallationStoreProvider',
        isAutoDispose: false,
        dependencies: null,
        $allTransitiveDependencies: null,
      );

  @override
  String debugGetCreateSourceHash() => _$pushInstallationStoreHash();

  @$internal
  @override
  $ProviderElement<PushInstallationStore> $createElement(
    $ProviderPointer pointer,
  ) => $ProviderElement(pointer);

  @override
  PushInstallationStore create(Ref ref) {
    return pushInstallationStore(ref);
  }

  /// {@macro riverpod.override_with_value}
  Override overrideWithValue(PushInstallationStore value) {
    return $ProviderOverride(
      origin: this,
      providerOverride: $SyncValueProvider<PushInstallationStore>(value),
    );
  }
}

String _$pushInstallationStoreHash() =>
    r'51e5d450b06f07e979f24f6d9c3b3861cfccfbff';
