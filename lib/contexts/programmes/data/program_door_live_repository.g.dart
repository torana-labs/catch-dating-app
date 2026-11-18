// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'program_door_live_repository.dart';

// **************************************************************************
// RiverpodGenerator
// **************************************************************************

// GENERATED CODE - DO NOT MODIFY BY HAND
// ignore_for_file: type=lint, type=warning

@ProviderFor(programDoorLiveRepository)
final programDoorLiveRepositoryProvider = ProgramDoorLiveRepositoryProvider._();

final class ProgramDoorLiveRepositoryProvider
    extends
        $FunctionalProvider<
          ProgramDoorLiveRepository,
          ProgramDoorLiveRepository,
          ProgramDoorLiveRepository
        >
    with $Provider<ProgramDoorLiveRepository> {
  ProgramDoorLiveRepositoryProvider._()
    : super(
        from: null,
        argument: null,
        retry: null,
        name: r'programDoorLiveRepositoryProvider',
        isAutoDispose: false,
        dependencies: null,
        $allTransitiveDependencies: null,
      );

  @override
  String debugGetCreateSourceHash() => _$programDoorLiveRepositoryHash();

  @$internal
  @override
  $ProviderElement<ProgramDoorLiveRepository> $createElement(
    $ProviderPointer pointer,
  ) => $ProviderElement(pointer);

  @override
  ProgramDoorLiveRepository create(Ref ref) {
    return programDoorLiveRepository(ref);
  }

  /// {@macro riverpod.override_with_value}
  Override overrideWithValue(ProgramDoorLiveRepository value) {
    return $ProviderOverride(
      origin: this,
      providerOverride: $SyncValueProvider<ProgramDoorLiveRepository>(value),
    );
  }
}

String _$programDoorLiveRepositoryHash() =>
    r'c894d9e69268eac63fdfc555dfacd11d31023a17';

/// The door of one function, live.

@ProviderFor(programDoorViewStream)
final programDoorViewStreamProvider = ProgramDoorViewStreamFamily._();

/// The door of one function, live.

final class ProgramDoorViewStreamProvider
    extends
        $FunctionalProvider<
          AsyncValue<ProgramDoorView>,
          ProgramDoorView,
          Stream<ProgramDoorView>
        >
    with $FutureModifier<ProgramDoorView>, $StreamProvider<ProgramDoorView> {
  /// The door of one function, live.
  ProgramDoorViewStreamProvider._({
    required ProgramDoorViewStreamFamily super.from,
    required (String, String) super.argument,
  }) : super(
         retry: null,
         name: r'programDoorViewStreamProvider',
         isAutoDispose: true,
         dependencies: null,
         $allTransitiveDependencies: null,
       );

  @override
  String debugGetCreateSourceHash() => _$programDoorViewStreamHash();

  @override
  String toString() {
    return r'programDoorViewStreamProvider'
        ''
        '$argument';
  }

  @$internal
  @override
  $StreamProviderElement<ProgramDoorView> $createElement(
    $ProviderPointer pointer,
  ) => $StreamProviderElement(pointer);

  @override
  Stream<ProgramDoorView> create(Ref ref) {
    final argument = this.argument as (String, String);
    return programDoorViewStream(ref, argument.$1, argument.$2);
  }

  @override
  bool operator ==(Object other) {
    return other is ProgramDoorViewStreamProvider && other.argument == argument;
  }

  @override
  int get hashCode {
    return argument.hashCode;
  }
}

String _$programDoorViewStreamHash() =>
    r'd5a49e787e972d58a059191dca0b7118e61ff6ac';

/// The door of one function, live.

final class ProgramDoorViewStreamFamily extends $Family
    with $FunctionalFamilyOverride<Stream<ProgramDoorView>, (String, String)> {
  ProgramDoorViewStreamFamily._()
    : super(
        retry: null,
        name: r'programDoorViewStreamProvider',
        dependencies: null,
        $allTransitiveDependencies: null,
        isAutoDispose: true,
      );

  /// The door of one function, live.

  ProgramDoorViewStreamProvider call(String programId, String functionId) =>
      ProgramDoorViewStreamProvider._(
        argument: (programId, functionId),
        from: this,
      );

  @override
  String toString() => r'programDoorViewStreamProvider';
}

/// The live board for the signed-in account, live.

@ProviderFor(programLiveBoardStream)
final programLiveBoardStreamProvider = ProgramLiveBoardStreamFamily._();

/// The live board for the signed-in account, live.

final class ProgramLiveBoardStreamProvider
    extends
        $FunctionalProvider<
          AsyncValue<ProgramLiveBoard>,
          ProgramLiveBoard,
          Stream<ProgramLiveBoard>
        >
    with $FutureModifier<ProgramLiveBoard>, $StreamProvider<ProgramLiveBoard> {
  /// The live board for the signed-in account, live.
  ProgramLiveBoardStreamProvider._({
    required ProgramLiveBoardStreamFamily super.from,
    required String super.argument,
  }) : super(
         retry: null,
         name: r'programLiveBoardStreamProvider',
         isAutoDispose: true,
         dependencies: null,
         $allTransitiveDependencies: null,
       );

  @override
  String debugGetCreateSourceHash() => _$programLiveBoardStreamHash();

  @override
  String toString() {
    return r'programLiveBoardStreamProvider'
        ''
        '($argument)';
  }

  @$internal
  @override
  $StreamProviderElement<ProgramLiveBoard> $createElement(
    $ProviderPointer pointer,
  ) => $StreamProviderElement(pointer);

  @override
  Stream<ProgramLiveBoard> create(Ref ref) {
    final argument = this.argument as String;
    return programLiveBoardStream(ref, argument);
  }

  @override
  bool operator ==(Object other) {
    return other is ProgramLiveBoardStreamProvider &&
        other.argument == argument;
  }

  @override
  int get hashCode {
    return argument.hashCode;
  }
}

String _$programLiveBoardStreamHash() =>
    r'a4ed6ab263a86ac1aa3e9b3c35784b43eb20c6e6';

/// The live board for the signed-in account, live.

final class ProgramLiveBoardStreamFamily extends $Family
    with $FunctionalFamilyOverride<Stream<ProgramLiveBoard>, String> {
  ProgramLiveBoardStreamFamily._()
    : super(
        retry: null,
        name: r'programLiveBoardStreamProvider',
        dependencies: null,
        $allTransitiveDependencies: null,
        isAutoDispose: true,
      );

  /// The live board for the signed-in account, live.

  ProgramLiveBoardStreamProvider call(String programId) =>
      ProgramLiveBoardStreamProvider._(argument: programId, from: this);

  @override
  String toString() => r'programLiveBoardStreamProvider';
}
