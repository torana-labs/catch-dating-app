// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'program_lodging_providers.dart';

// **************************************************************************
// RiverpodGenerator
// **************************************************************************

// GENERATED CODE - DO NOT MODIFY BY HAND
// ignore_for_file: type=lint, type=warning

@ProviderFor(programLodgingRepository)
final programLodgingRepositoryProvider = ProgramLodgingRepositoryProvider._();

final class ProgramLodgingRepositoryProvider
    extends
        $FunctionalProvider<
          ProgramLodgingRepository,
          ProgramLodgingRepository,
          ProgramLodgingRepository
        >
    with $Provider<ProgramLodgingRepository> {
  ProgramLodgingRepositoryProvider._()
    : super(
        from: null,
        argument: null,
        retry: null,
        name: r'programLodgingRepositoryProvider',
        isAutoDispose: true,
        dependencies: null,
        $allTransitiveDependencies: null,
      );

  @override
  String debugGetCreateSourceHash() => _$programLodgingRepositoryHash();

  @$internal
  @override
  $ProviderElement<ProgramLodgingRepository> $createElement(
    $ProviderPointer pointer,
  ) => $ProviderElement(pointer);

  @override
  ProgramLodgingRepository create(Ref ref) {
    return programLodgingRepository(ref);
  }

  /// {@macro riverpod.override_with_value}
  Override overrideWithValue(ProgramLodgingRepository value) {
    return $ProviderOverride(
      origin: this,
      providerOverride: $SyncValueProvider<ProgramLodgingRepository>(value),
    );
  }
}

String _$programLodgingRepositoryHash() =>
    r'9571bd0e61782e1a845b24f1d2b24ef589c6c38e';
