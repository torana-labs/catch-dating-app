// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'program_guest_directory_repository.dart';

// **************************************************************************
// RiverpodGenerator
// **************************************************************************

// GENERATED CODE - DO NOT MODIFY BY HAND
// ignore_for_file: type=lint, type=warning

@ProviderFor(programGuestDirectoryRepository)
final programGuestDirectoryRepositoryProvider =
    ProgramGuestDirectoryRepositoryProvider._();

final class ProgramGuestDirectoryRepositoryProvider
    extends
        $FunctionalProvider<
          ProgramGuestDirectoryRepository,
          ProgramGuestDirectoryRepository,
          ProgramGuestDirectoryRepository
        >
    with $Provider<ProgramGuestDirectoryRepository> {
  ProgramGuestDirectoryRepositoryProvider._()
    : super(
        from: null,
        argument: null,
        retry: null,
        name: r'programGuestDirectoryRepositoryProvider',
        isAutoDispose: false,
        dependencies: null,
        $allTransitiveDependencies: null,
      );

  @override
  String debugGetCreateSourceHash() => _$programGuestDirectoryRepositoryHash();

  @$internal
  @override
  $ProviderElement<ProgramGuestDirectoryRepository> $createElement(
    $ProviderPointer pointer,
  ) => $ProviderElement(pointer);

  @override
  ProgramGuestDirectoryRepository create(Ref ref) {
    return programGuestDirectoryRepository(ref);
  }

  /// {@macro riverpod.override_with_value}
  Override overrideWithValue(ProgramGuestDirectoryRepository value) {
    return $ProviderOverride(
      origin: this,
      providerOverride: $SyncValueProvider<ProgramGuestDirectoryRepository>(
        value,
      ),
    );
  }
}

String _$programGuestDirectoryRepositoryHash() =>
    r'2d9b615bde8a4517eb787e8694b281e694ef4909';

/// The programme's first guest page with its households, function rows and
/// groups, live. `programGuestListProvider` reads it for the guest list, the
/// guest desk and the planner.

@ProviderFor(programGuestDirectoryStream)
final programGuestDirectoryStreamProvider =
    ProgramGuestDirectoryStreamFamily._();

/// The programme's first guest page with its households, function rows and
/// groups, live. `programGuestListProvider` reads it for the guest list, the
/// guest desk and the planner.

final class ProgramGuestDirectoryStreamProvider
    extends
        $FunctionalProvider<
          AsyncValue<ProgramGuestListPage>,
          ProgramGuestListPage,
          Stream<ProgramGuestListPage>
        >
    with
        $FutureModifier<ProgramGuestListPage>,
        $StreamProvider<ProgramGuestListPage> {
  /// The programme's first guest page with its households, function rows and
  /// groups, live. `programGuestListProvider` reads it for the guest list, the
  /// guest desk and the planner.
  ProgramGuestDirectoryStreamProvider._({
    required ProgramGuestDirectoryStreamFamily super.from,
    required String super.argument,
  }) : super(
         retry: null,
         name: r'programGuestDirectoryStreamProvider',
         isAutoDispose: true,
         dependencies: null,
         $allTransitiveDependencies: null,
       );

  @override
  String debugGetCreateSourceHash() => _$programGuestDirectoryStreamHash();

  @override
  String toString() {
    return r'programGuestDirectoryStreamProvider'
        ''
        '($argument)';
  }

  @$internal
  @override
  $StreamProviderElement<ProgramGuestListPage> $createElement(
    $ProviderPointer pointer,
  ) => $StreamProviderElement(pointer);

  @override
  Stream<ProgramGuestListPage> create(Ref ref) {
    final argument = this.argument as String;
    return programGuestDirectoryStream(ref, argument);
  }

  @override
  bool operator ==(Object other) {
    return other is ProgramGuestDirectoryStreamProvider &&
        other.argument == argument;
  }

  @override
  int get hashCode {
    return argument.hashCode;
  }
}

String _$programGuestDirectoryStreamHash() =>
    r'8e69c11424db9bbd552eb9f855f619ae3be7e47d';

/// The programme's first guest page with its households, function rows and
/// groups, live. `programGuestListProvider` reads it for the guest list, the
/// guest desk and the planner.

final class ProgramGuestDirectoryStreamFamily extends $Family
    with $FunctionalFamilyOverride<Stream<ProgramGuestListPage>, String> {
  ProgramGuestDirectoryStreamFamily._()
    : super(
        retry: null,
        name: r'programGuestDirectoryStreamProvider',
        dependencies: null,
        $allTransitiveDependencies: null,
        isAutoDispose: true,
      );

  /// The programme's first guest page with its households, function rows and
  /// groups, live. `programGuestListProvider` reads it for the guest list, the
  /// guest desk and the planner.

  ProgramGuestDirectoryStreamProvider call(String programId) =>
      ProgramGuestDirectoryStreamProvider._(argument: programId, from: this);

  @override
  String toString() => r'programGuestDirectoryStreamProvider';
}
