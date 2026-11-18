// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'program_access_repository.dart';

// **************************************************************************
// RiverpodGenerator
// **************************************************************************

// GENERATED CODE - DO NOT MODIFY BY HAND
// ignore_for_file: type=lint, type=warning

@ProviderFor(programAccessRepository)
final programAccessRepositoryProvider = ProgramAccessRepositoryProvider._();

final class ProgramAccessRepositoryProvider
    extends
        $FunctionalProvider<
          ProgramAccessRepository,
          ProgramAccessRepository,
          ProgramAccessRepository
        >
    with $Provider<ProgramAccessRepository> {
  ProgramAccessRepositoryProvider._()
    : super(
        from: null,
        argument: null,
        retry: null,
        name: r'programAccessRepositoryProvider',
        isAutoDispose: false,
        dependencies: null,
        $allTransitiveDependencies: null,
      );

  @override
  String debugGetCreateSourceHash() => _$programAccessRepositoryHash();

  @$internal
  @override
  $ProviderElement<ProgramAccessRepository> $createElement(
    $ProviderPointer pointer,
  ) => $ProviderElement(pointer);

  @override
  ProgramAccessRepository create(Ref ref) {
    return programAccessRepository(ref);
  }

  /// {@macro riverpod.override_with_value}
  Override overrideWithValue(ProgramAccessRepository value) {
    return $ProviderOverride(
      origin: this,
      providerOverride: $SyncValueProvider<ProgramAccessRepository>(value),
    );
  }
}

String _$programAccessRepositoryHash() =>
    r'04d700d93f3845afb0b2a8edde571c55bd84cf57';

/// The signed-in account's authority over a programme, rebuilt at each
/// approval or expiry. Programme listeners read through this so cached rows
/// stop at the instant the grant does.

@ProviderFor(programAccessState)
final programAccessStateProvider = ProgramAccessStateFamily._();

/// The signed-in account's authority over a programme, rebuilt at each
/// approval or expiry. Programme listeners read through this so cached rows
/// stop at the instant the grant does.

final class ProgramAccessStateProvider
    extends
        $FunctionalProvider<
          AsyncValue<ProgramAccessState>,
          ProgramAccessState,
          Stream<ProgramAccessState>
        >
    with
        $FutureModifier<ProgramAccessState>,
        $StreamProvider<ProgramAccessState> {
  /// The signed-in account's authority over a programme, rebuilt at each
  /// approval or expiry. Programme listeners read through this so cached rows
  /// stop at the instant the grant does.
  ProgramAccessStateProvider._({
    required ProgramAccessStateFamily super.from,
    required String super.argument,
  }) : super(
         retry: null,
         name: r'programAccessStateProvider',
         isAutoDispose: true,
         dependencies: null,
         $allTransitiveDependencies: null,
       );

  @override
  String debugGetCreateSourceHash() => _$programAccessStateHash();

  @override
  String toString() {
    return r'programAccessStateProvider'
        ''
        '($argument)';
  }

  @$internal
  @override
  $StreamProviderElement<ProgramAccessState> $createElement(
    $ProviderPointer pointer,
  ) => $StreamProviderElement(pointer);

  @override
  Stream<ProgramAccessState> create(Ref ref) {
    final argument = this.argument as String;
    return programAccessState(ref, argument);
  }

  @override
  bool operator ==(Object other) {
    return other is ProgramAccessStateProvider && other.argument == argument;
  }

  @override
  int get hashCode {
    return argument.hashCode;
  }
}

String _$programAccessStateHash() =>
    r'85090f333b9271a776fb049a25079e7c8b6a2265';

/// The signed-in account's authority over a programme, rebuilt at each
/// approval or expiry. Programme listeners read through this so cached rows
/// stop at the instant the grant does.

final class ProgramAccessStateFamily extends $Family
    with $FunctionalFamilyOverride<Stream<ProgramAccessState>, String> {
  ProgramAccessStateFamily._()
    : super(
        retry: null,
        name: r'programAccessStateProvider',
        dependencies: null,
        $allTransitiveDependencies: null,
        isAutoDispose: true,
      );

  /// The signed-in account's authority over a programme, rebuilt at each
  /// approval or expiry. Programme listeners read through this so cached rows
  /// stop at the instant the grant does.

  ProgramAccessStateProvider call(String programId) =>
      ProgramAccessStateProvider._(argument: programId, from: this);

  @override
  String toString() => r'programAccessStateProvider';
}
