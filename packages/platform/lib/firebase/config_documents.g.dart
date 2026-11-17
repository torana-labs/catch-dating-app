// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'config_documents.dart';

// **************************************************************************
// RiverpodGenerator
// **************************************************************************

// GENERATED CODE - DO NOT MODIFY BY HAND
// ignore_for_file: type=lint, type=warning

@ProviderFor(configDocuments)
final configDocumentsProvider = ConfigDocumentsProvider._();

final class ConfigDocumentsProvider
    extends
        $FunctionalProvider<ConfigDocuments, ConfigDocuments, ConfigDocuments>
    with $Provider<ConfigDocuments> {
  ConfigDocumentsProvider._()
    : super(
        from: null,
        argument: null,
        retry: null,
        name: r'configDocumentsProvider',
        isAutoDispose: false,
        dependencies: null,
        $allTransitiveDependencies: null,
      );

  @override
  String debugGetCreateSourceHash() => _$configDocumentsHash();

  @$internal
  @override
  $ProviderElement<ConfigDocuments> $createElement($ProviderPointer pointer) =>
      $ProviderElement(pointer);

  @override
  ConfigDocuments create(Ref ref) {
    return configDocuments(ref);
  }

  /// {@macro riverpod.override_with_value}
  Override overrideWithValue(ConfigDocuments value) {
    return $ProviderOverride(
      origin: this,
      providerOverride: $SyncValueProvider<ConfigDocuments>(value),
    );
  }
}

String _$configDocumentsHash() => r'd9cf9e95110cec798a2d403b77937b586297280f';
