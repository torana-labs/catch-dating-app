// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'program_work_shell_repository.dart';

// **************************************************************************
// RiverpodGenerator
// **************************************************************************

// GENERATED CODE - DO NOT MODIFY BY HAND
// ignore_for_file: type=lint, type=warning

@ProviderFor(programWorkShellRepository)
final programWorkShellRepositoryProvider =
    ProgramWorkShellRepositoryProvider._();

final class ProgramWorkShellRepositoryProvider
    extends
        $FunctionalProvider<
          ProgramWorkShellRepository,
          ProgramWorkShellRepository,
          ProgramWorkShellRepository
        >
    with $Provider<ProgramWorkShellRepository> {
  ProgramWorkShellRepositoryProvider._()
    : super(
        from: null,
        argument: null,
        retry: null,
        name: r'programWorkShellRepositoryProvider',
        isAutoDispose: false,
        dependencies: null,
        $allTransitiveDependencies: null,
      );

  @override
  String debugGetCreateSourceHash() => _$programWorkShellRepositoryHash();

  @$internal
  @override
  $ProviderElement<ProgramWorkShellRepository> $createElement(
    $ProviderPointer pointer,
  ) => $ProviderElement(pointer);

  @override
  ProgramWorkShellRepository create(Ref ref) {
    return programWorkShellRepository(ref);
  }

  /// {@macro riverpod.override_with_value}
  Override overrideWithValue(ProgramWorkShellRepository value) {
    return $ProviderOverride(
      origin: this,
      providerOverride: $SyncValueProvider<ProgramWorkShellRepository>(value),
    );
  }
}

String _$programWorkShellRepositoryHash() =>
    r'3a91057a5d401a248a1cb88070e3663e85431f06';

/// The signed-in account's work access for a programme, live.

@ProviderFor(programWorkAccessStream)
final programWorkAccessStreamProvider = ProgramWorkAccessStreamFamily._();

/// The signed-in account's work access for a programme, live.

final class ProgramWorkAccessStreamProvider
    extends
        $FunctionalProvider<
          AsyncValue<ProgramWorkAccess>,
          ProgramWorkAccess,
          Stream<ProgramWorkAccess>
        >
    with
        $FutureModifier<ProgramWorkAccess>,
        $StreamProvider<ProgramWorkAccess> {
  /// The signed-in account's work access for a programme, live.
  ProgramWorkAccessStreamProvider._({
    required ProgramWorkAccessStreamFamily super.from,
    required String super.argument,
  }) : super(
         retry: null,
         name: r'programWorkAccessStreamProvider',
         isAutoDispose: true,
         dependencies: null,
         $allTransitiveDependencies: null,
       );

  @override
  String debugGetCreateSourceHash() => _$programWorkAccessStreamHash();

  @override
  String toString() {
    return r'programWorkAccessStreamProvider'
        ''
        '($argument)';
  }

  @$internal
  @override
  $StreamProviderElement<ProgramWorkAccess> $createElement(
    $ProviderPointer pointer,
  ) => $StreamProviderElement(pointer);

  @override
  Stream<ProgramWorkAccess> create(Ref ref) {
    final argument = this.argument as String;
    return programWorkAccessStream(ref, argument);
  }

  @override
  bool operator ==(Object other) {
    return other is ProgramWorkAccessStreamProvider &&
        other.argument == argument;
  }

  @override
  int get hashCode {
    return argument.hashCode;
  }
}

String _$programWorkAccessStreamHash() =>
    r'2d6a9506f8ed7bf65092a9f3fb48ed2ef40a03bc';

/// The signed-in account's work access for a programme, live.

final class ProgramWorkAccessStreamFamily extends $Family
    with $FunctionalFamilyOverride<Stream<ProgramWorkAccess>, String> {
  ProgramWorkAccessStreamFamily._()
    : super(
        retry: null,
        name: r'programWorkAccessStreamProvider',
        dependencies: null,
        $allTransitiveDependencies: null,
        isAutoDispose: true,
      );

  /// The signed-in account's work access for a programme, live.

  ProgramWorkAccessStreamProvider call(String programId) =>
      ProgramWorkAccessStreamProvider._(argument: programId, from: this);

  @override
  String toString() => r'programWorkAccessStreamProvider';
}
