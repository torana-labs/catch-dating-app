// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'program_operations_controller.dart';

// **************************************************************************
// RiverpodGenerator
// **************************************************************************

// GENERATED CODE - DO NOT MODIFY BY HAND
// ignore_for_file: type=lint, type=warning
/// The wrapper switches family instances immediately when the account changes.

@ProviderFor(programOperationsState)
final programOperationsStateProvider = ProgramOperationsStateFamily._();

/// The wrapper switches family instances immediately when the account changes.

final class ProgramOperationsStateProvider
    extends
        $FunctionalProvider<
          AsyncValue<ProgramOperationsState>,
          AsyncValue<ProgramOperationsState>,
          AsyncValue<ProgramOperationsState>
        >
    with $Provider<AsyncValue<ProgramOperationsState>> {
  /// The wrapper switches family instances immediately when the account changes.
  ProgramOperationsStateProvider._({
    required ProgramOperationsStateFamily super.from,
    required String super.argument,
  }) : super(
         retry: null,
         name: r'programOperationsStateProvider',
         isAutoDispose: true,
         dependencies: null,
         $allTransitiveDependencies: null,
       );

  @override
  String debugGetCreateSourceHash() => _$programOperationsStateHash();

  @override
  String toString() {
    return r'programOperationsStateProvider'
        ''
        '($argument)';
  }

  @$internal
  @override
  $ProviderElement<AsyncValue<ProgramOperationsState>> $createElement(
    $ProviderPointer pointer,
  ) => $ProviderElement(pointer);

  @override
  AsyncValue<ProgramOperationsState> create(Ref ref) {
    final argument = this.argument as String;
    return programOperationsState(ref, argument);
  }

  /// {@macro riverpod.override_with_value}
  Override overrideWithValue(AsyncValue<ProgramOperationsState> value) {
    return $ProviderOverride(
      origin: this,
      providerOverride: $SyncValueProvider<AsyncValue<ProgramOperationsState>>(
        value,
      ),
    );
  }

  @override
  bool operator ==(Object other) {
    return other is ProgramOperationsStateProvider &&
        other.argument == argument;
  }

  @override
  int get hashCode {
    return argument.hashCode;
  }
}

String _$programOperationsStateHash() =>
    r'f628824a12573158f1fe928e1a553634fff38869';

/// The wrapper switches family instances immediately when the account changes.

final class ProgramOperationsStateFamily extends $Family
    with $FunctionalFamilyOverride<AsyncValue<ProgramOperationsState>, String> {
  ProgramOperationsStateFamily._()
    : super(
        retry: null,
        name: r'programOperationsStateProvider',
        dependencies: null,
        $allTransitiveDependencies: null,
        isAutoDispose: true,
      );

  /// The wrapper switches family instances immediately when the account changes.

  ProgramOperationsStateProvider call(String programId) =>
      ProgramOperationsStateProvider._(argument: programId, from: this);

  @override
  String toString() => r'programOperationsStateProvider';
}

@ProviderFor(ProgramOperationsController)
final programOperationsControllerProvider =
    ProgramOperationsControllerFamily._();

final class ProgramOperationsControllerProvider
    extends
        $AsyncNotifierProvider<
          ProgramOperationsController,
          ProgramOperationsState
        > {
  ProgramOperationsControllerProvider._({
    required ProgramOperationsControllerFamily super.from,
    required (String, String) super.argument,
  }) : super(
         retry: null,
         name: r'programOperationsControllerProvider',
         isAutoDispose: true,
         dependencies: null,
         $allTransitiveDependencies: null,
       );

  @override
  String debugGetCreateSourceHash() => _$programOperationsControllerHash();

  @override
  String toString() {
    return r'programOperationsControllerProvider'
        ''
        '$argument';
  }

  @$internal
  @override
  ProgramOperationsController create() => ProgramOperationsController();

  @override
  bool operator ==(Object other) {
    return other is ProgramOperationsControllerProvider &&
        other.argument == argument;
  }

  @override
  int get hashCode {
    return argument.hashCode;
  }
}

String _$programOperationsControllerHash() =>
    r'fdc49ecd01e1653ee5a4f23c1a3d545e1980e94e';

final class ProgramOperationsControllerFamily extends $Family
    with
        $ClassFamilyOverride<
          ProgramOperationsController,
          AsyncValue<ProgramOperationsState>,
          ProgramOperationsState,
          FutureOr<ProgramOperationsState>,
          (String, String)
        > {
  ProgramOperationsControllerFamily._()
    : super(
        retry: null,
        name: r'programOperationsControllerProvider',
        dependencies: null,
        $allTransitiveDependencies: null,
        isAutoDispose: true,
      );

  ProgramOperationsControllerProvider call(
    String programId,
    String accountId,
  ) => ProgramOperationsControllerProvider._(
    argument: (programId, accountId),
    from: this,
  );

  @override
  String toString() => r'programOperationsControllerProvider';
}

abstract class _$ProgramOperationsController
    extends $AsyncNotifier<ProgramOperationsState> {
  late final _$args = ref.$arg as (String, String);
  String get programId => _$args.$1;
  String get accountId => _$args.$2;

  FutureOr<ProgramOperationsState> build(String programId, String accountId);
  @$mustCallSuper
  @override
  WhenComplete runBuild() {
    final ref =
        this.ref
            as $Ref<AsyncValue<ProgramOperationsState>, ProgramOperationsState>;
    final element =
        ref.element
            as $ClassProviderElement<
              AnyNotifier<
                AsyncValue<ProgramOperationsState>,
                ProgramOperationsState
              >,
              AsyncValue<ProgramOperationsState>,
              Object?,
              Object?
            >;
    return element.handleCreate(ref, () => build(_$args.$1, _$args.$2));
  }
}
