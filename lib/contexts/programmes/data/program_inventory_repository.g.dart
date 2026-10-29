// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'program_inventory_repository.dart';

// **************************************************************************
// RiverpodGenerator
// **************************************************************************

// GENERATED CODE - DO NOT MODIFY BY HAND
// ignore_for_file: type=lint, type=warning

@ProviderFor(programInventoryRepository)
final programInventoryRepositoryProvider =
    ProgramInventoryRepositoryProvider._();

final class ProgramInventoryRepositoryProvider
    extends
        $FunctionalProvider<
          ProgramInventoryRepository,
          ProgramInventoryRepository,
          ProgramInventoryRepository
        >
    with $Provider<ProgramInventoryRepository> {
  ProgramInventoryRepositoryProvider._()
    : super(
        from: null,
        argument: null,
        retry: null,
        name: r'programInventoryRepositoryProvider',
        isAutoDispose: true,
        dependencies: null,
        $allTransitiveDependencies: null,
      );

  @override
  String debugGetCreateSourceHash() => _$programInventoryRepositoryHash();

  @$internal
  @override
  $ProviderElement<ProgramInventoryRepository> $createElement(
    $ProviderPointer pointer,
  ) => $ProviderElement(pointer);

  @override
  ProgramInventoryRepository create(Ref ref) {
    return programInventoryRepository(ref);
  }

  /// {@macro riverpod.override_with_value}
  Override overrideWithValue(ProgramInventoryRepository value) {
    return $ProviderOverride(
      origin: this,
      providerOverride: $SyncValueProvider<ProgramInventoryRepository>(value),
    );
  }
}

String _$programInventoryRepositoryHash() =>
    r'aa001d65b9cc715087d12f8d166132a0edd628fc';
