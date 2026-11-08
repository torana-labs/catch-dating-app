// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'program_asset_upload.dart';

// **************************************************************************
// RiverpodGenerator
// **************************************************************************

// GENERATED CODE - DO NOT MODIFY BY HAND
// ignore_for_file: type=lint, type=warning

@ProviderFor(programAssetUploader)
final programAssetUploaderProvider = ProgramAssetUploaderProvider._();

final class ProgramAssetUploaderProvider
    extends
        $FunctionalProvider<
          ProgramAssetUploader,
          ProgramAssetUploader,
          ProgramAssetUploader
        >
    with $Provider<ProgramAssetUploader> {
  ProgramAssetUploaderProvider._()
    : super(
        from: null,
        argument: null,
        retry: null,
        name: r'programAssetUploaderProvider',
        isAutoDispose: false,
        dependencies: null,
        $allTransitiveDependencies: null,
      );

  @override
  String debugGetCreateSourceHash() => _$programAssetUploaderHash();

  @$internal
  @override
  $ProviderElement<ProgramAssetUploader> $createElement(
    $ProviderPointer pointer,
  ) => $ProviderElement(pointer);

  @override
  ProgramAssetUploader create(Ref ref) {
    return programAssetUploader(ref);
  }

  /// {@macro riverpod.override_with_value}
  Override overrideWithValue(ProgramAssetUploader value) {
    return $ProviderOverride(
      origin: this,
      providerOverride: $SyncValueProvider<ProgramAssetUploader>(value),
    );
  }
}

String _$programAssetUploaderHash() =>
    r'5eee6eba9f22216b0a1286041e5c8c61ea6c5e6e';
