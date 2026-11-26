// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'host_forms_repository.dart';

// **************************************************************************
// RiverpodGenerator
// **************************************************************************

// GENERATED CODE - DO NOT MODIFY BY HAND
// ignore_for_file: type=lint, type=warning

@ProviderFor(hostFormsRepository)
final hostFormsRepositoryProvider = HostFormsRepositoryProvider._();

final class HostFormsRepositoryProvider
    extends
        $FunctionalProvider<
          HostFormsRepository,
          HostFormsRepository,
          HostFormsRepository
        >
    with $Provider<HostFormsRepository> {
  HostFormsRepositoryProvider._()
    : super(
        from: null,
        argument: null,
        retry: null,
        name: r'hostFormsRepositoryProvider',
        isAutoDispose: false,
        dependencies: null,
        $allTransitiveDependencies: null,
      );

  @override
  String debugGetCreateSourceHash() => _$hostFormsRepositoryHash();

  @$internal
  @override
  $ProviderElement<HostFormsRepository> $createElement(
    $ProviderPointer pointer,
  ) => $ProviderElement(pointer);

  @override
  HostFormsRepository create(Ref ref) {
    return hostFormsRepository(ref);
  }

  /// {@macro riverpod.override_with_value}
  Override overrideWithValue(HostFormsRepository value) {
    return $ProviderOverride(
      origin: this,
      providerOverride: $SyncValueProvider<HostFormsRepository>(value),
    );
  }
}

String _$hostFormsRepositoryHash() =>
    r'42328d0dac27a1489654a46e70bb99afbf8ab9dd';

/// The journalled export gateway: one pending export per form at a time,
/// recovered after a restart for the same signed-in manager.

@ProviderFor(hostResponseExportGateway)
final hostResponseExportGatewayProvider = HostResponseExportGatewayProvider._();

/// The journalled export gateway: one pending export per form at a time,
/// recovered after a restart for the same signed-in manager.

final class HostResponseExportGatewayProvider
    extends
        $FunctionalProvider<
          HostResponseExportGateway,
          HostResponseExportGateway,
          HostResponseExportGateway
        >
    with $Provider<HostResponseExportGateway> {
  /// The journalled export gateway: one pending export per form at a time,
  /// recovered after a restart for the same signed-in manager.
  HostResponseExportGatewayProvider._()
    : super(
        from: null,
        argument: null,
        retry: null,
        name: r'hostResponseExportGatewayProvider',
        isAutoDispose: true,
        dependencies: null,
        $allTransitiveDependencies: null,
      );

  @override
  String debugGetCreateSourceHash() => _$hostResponseExportGatewayHash();

  @$internal
  @override
  $ProviderElement<HostResponseExportGateway> $createElement(
    $ProviderPointer pointer,
  ) => $ProviderElement(pointer);

  @override
  HostResponseExportGateway create(Ref ref) {
    return hostResponseExportGateway(ref);
  }

  /// {@macro riverpod.override_with_value}
  Override overrideWithValue(HostResponseExportGateway value) {
    return $ProviderOverride(
      origin: this,
      providerOverride: $SyncValueProvider<HostResponseExportGateway>(value),
    );
  }
}

String _$hostResponseExportGatewayHash() =>
    r'685cf42b8a5c4f8c23c7f73c72922d45b0d86148';
