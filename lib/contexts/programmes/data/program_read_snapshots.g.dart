// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'program_read_snapshots.dart';

// **************************************************************************
// RiverpodGenerator
// **************************************************************************

// GENERATED CODE - DO NOT MODIFY BY HAND
// ignore_for_file: type=lint, type=warning

@ProviderFor(programReadSnapshotStore)
final programReadSnapshotStoreProvider = ProgramReadSnapshotStoreProvider._();

final class ProgramReadSnapshotStoreProvider
    extends
        $FunctionalProvider<
          ProgramReadSnapshotStore,
          ProgramReadSnapshotStore,
          ProgramReadSnapshotStore
        >
    with $Provider<ProgramReadSnapshotStore> {
  ProgramReadSnapshotStoreProvider._()
    : super(
        from: null,
        argument: null,
        retry: null,
        name: r'programReadSnapshotStoreProvider',
        isAutoDispose: false,
        dependencies: null,
        $allTransitiveDependencies: null,
      );

  @override
  String debugGetCreateSourceHash() => _$programReadSnapshotStoreHash();

  @$internal
  @override
  $ProviderElement<ProgramReadSnapshotStore> $createElement(
    $ProviderPointer pointer,
  ) => $ProviderElement(pointer);

  @override
  ProgramReadSnapshotStore create(Ref ref) {
    return programReadSnapshotStore(ref);
  }

  /// {@macro riverpod.override_with_value}
  Override overrideWithValue(ProgramReadSnapshotStore value) {
    return $ProviderOverride(
      origin: this,
      providerOverride: $SyncValueProvider<ProgramReadSnapshotStore>(value),
    );
  }
}

String _$programReadSnapshotStoreHash() =>
    r'be56da9fcab5847c70368ef10b187215d30dfbe1';

/// A modal can pin its opening generation and hide captured data on change.

@ProviderFor(programAuthorityGeneration)
final programAuthorityGenerationProvider = ProgramAuthorityGenerationFamily._();

/// A modal can pin its opening generation and hide captured data on change.

final class ProgramAuthorityGenerationProvider
    extends $FunctionalProvider<int, int, int>
    with $Provider<int> {
  /// A modal can pin its opening generation and hide captured data on change.
  ProgramAuthorityGenerationProvider._({
    required ProgramAuthorityGenerationFamily super.from,
    required (String, String) super.argument,
  }) : super(
         retry: null,
         name: r'programAuthorityGenerationProvider',
         isAutoDispose: true,
         dependencies: null,
         $allTransitiveDependencies: null,
       );

  @override
  String debugGetCreateSourceHash() => _$programAuthorityGenerationHash();

  @override
  String toString() {
    return r'programAuthorityGenerationProvider'
        ''
        '$argument';
  }

  @$internal
  @override
  $ProviderElement<int> $createElement($ProviderPointer pointer) =>
      $ProviderElement(pointer);

  @override
  int create(Ref ref) {
    final argument = this.argument as (String, String);
    return programAuthorityGeneration(ref, argument.$1, argument.$2);
  }

  /// {@macro riverpod.override_with_value}
  Override overrideWithValue(int value) {
    return $ProviderOverride(
      origin: this,
      providerOverride: $SyncValueProvider<int>(value),
    );
  }

  @override
  bool operator ==(Object other) {
    return other is ProgramAuthorityGenerationProvider &&
        other.argument == argument;
  }

  @override
  int get hashCode {
    return argument.hashCode;
  }
}

String _$programAuthorityGenerationHash() =>
    r'b01610a0fd4c5bc1358bd0fc528c0bb5c8f8f71a';

/// A modal can pin its opening generation and hide captured data on change.

final class ProgramAuthorityGenerationFamily extends $Family
    with $FunctionalFamilyOverride<int, (String, String)> {
  ProgramAuthorityGenerationFamily._()
    : super(
        retry: null,
        name: r'programAuthorityGenerationProvider',
        dependencies: null,
        $allTransitiveDependencies: null,
        isAutoDispose: true,
      );

  /// A modal can pin its opening generation and hide captured data on change.

  ProgramAuthorityGenerationProvider call(String accountId, String programId) =>
      ProgramAuthorityGenerationProvider._(
        argument: (accountId, programId),
        from: this,
      );

  @override
  String toString() => r'programAuthorityGenerationProvider';
}
