// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'program_travel_party_repository.dart';

// **************************************************************************
// RiverpodGenerator
// **************************************************************************

// GENERATED CODE - DO NOT MODIFY BY HAND
// ignore_for_file: type=lint, type=warning

@ProviderFor(programTravelPartyRepository)
final programTravelPartyRepositoryProvider =
    ProgramTravelPartyRepositoryProvider._();

final class ProgramTravelPartyRepositoryProvider
    extends
        $FunctionalProvider<
          ProgramTravelPartyRepository,
          ProgramTravelPartyRepository,
          ProgramTravelPartyRepository
        >
    with $Provider<ProgramTravelPartyRepository> {
  ProgramTravelPartyRepositoryProvider._()
    : super(
        from: null,
        argument: null,
        retry: null,
        name: r'programTravelPartyRepositoryProvider',
        isAutoDispose: true,
        dependencies: null,
        $allTransitiveDependencies: null,
      );

  @override
  String debugGetCreateSourceHash() => _$programTravelPartyRepositoryHash();

  @$internal
  @override
  $ProviderElement<ProgramTravelPartyRepository> $createElement(
    $ProviderPointer pointer,
  ) => $ProviderElement(pointer);

  @override
  ProgramTravelPartyRepository create(Ref ref) {
    return programTravelPartyRepository(ref);
  }

  /// {@macro riverpod.override_with_value}
  Override overrideWithValue(ProgramTravelPartyRepository value) {
    return $ProviderOverride(
      origin: this,
      providerOverride: $SyncValueProvider<ProgramTravelPartyRepository>(value),
    );
  }
}

String _$programTravelPartyRepositoryHash() =>
    r'71e1d755857a55a9cfebc9ceddd17c596aed429b';
