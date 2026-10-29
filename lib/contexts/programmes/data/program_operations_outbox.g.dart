// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'program_operations_outbox.dart';

// **************************************************************************
// RiverpodGenerator
// **************************************************************************

// GENERATED CODE - DO NOT MODIFY BY HAND
// ignore_for_file: type=lint, type=warning

@ProviderFor(programOperationOutboxStore)
final programOperationOutboxStoreProvider =
    ProgramOperationOutboxStoreProvider._();

final class ProgramOperationOutboxStoreProvider
    extends
        $FunctionalProvider<
          ProgramOperationOutboxStore,
          ProgramOperationOutboxStore,
          ProgramOperationOutboxStore
        >
    with $Provider<ProgramOperationOutboxStore> {
  ProgramOperationOutboxStoreProvider._()
    : super(
        from: null,
        argument: null,
        retry: null,
        name: r'programOperationOutboxStoreProvider',
        isAutoDispose: false,
        dependencies: null,
        $allTransitiveDependencies: null,
      );

  @override
  String debugGetCreateSourceHash() => _$programOperationOutboxStoreHash();

  @$internal
  @override
  $ProviderElement<ProgramOperationOutboxStore> $createElement(
    $ProviderPointer pointer,
  ) => $ProviderElement(pointer);

  @override
  ProgramOperationOutboxStore create(Ref ref) {
    return programOperationOutboxStore(ref);
  }

  /// {@macro riverpod.override_with_value}
  Override overrideWithValue(ProgramOperationOutboxStore value) {
    return $ProviderOverride(
      origin: this,
      providerOverride: $SyncValueProvider<ProgramOperationOutboxStore>(value),
    );
  }
}

String _$programOperationOutboxStoreHash() =>
    r'64058cac4164a5d82c4da2695a4e7931784d67b7';

@ProviderFor(programOperationsOutbox)
final programOperationsOutboxProvider = ProgramOperationsOutboxProvider._();

final class ProgramOperationsOutboxProvider
    extends
        $FunctionalProvider<
          ProgramOperationsOutbox,
          ProgramOperationsOutbox,
          ProgramOperationsOutbox
        >
    with $Provider<ProgramOperationsOutbox> {
  ProgramOperationsOutboxProvider._()
    : super(
        from: null,
        argument: null,
        retry: null,
        name: r'programOperationsOutboxProvider',
        isAutoDispose: false,
        dependencies: null,
        $allTransitiveDependencies: null,
      );

  @override
  String debugGetCreateSourceHash() => _$programOperationsOutboxHash();

  @$internal
  @override
  $ProviderElement<ProgramOperationsOutbox> $createElement(
    $ProviderPointer pointer,
  ) => $ProviderElement(pointer);

  @override
  ProgramOperationsOutbox create(Ref ref) {
    return programOperationsOutbox(ref);
  }

  /// {@macro riverpod.override_with_value}
  Override overrideWithValue(ProgramOperationsOutbox value) {
    return $ProviderOverride(
      origin: this,
      providerOverride: $SyncValueProvider<ProgramOperationsOutbox>(value),
    );
  }
}

String _$programOperationsOutboxHash() =>
    r'395fa4854abc63e01202f4560a1746c696417a36';
