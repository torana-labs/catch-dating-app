// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'program_staff_views_repository.dart';

// **************************************************************************
// RiverpodGenerator
// **************************************************************************

// GENERATED CODE - DO NOT MODIFY BY HAND
// ignore_for_file: type=lint, type=warning

@ProviderFor(programStaffViewsRepository)
final programStaffViewsRepositoryProvider =
    ProgramStaffViewsRepositoryProvider._();

final class ProgramStaffViewsRepositoryProvider
    extends
        $FunctionalProvider<
          ProgramStaffViewsRepository,
          ProgramStaffViewsRepository,
          ProgramStaffViewsRepository
        >
    with $Provider<ProgramStaffViewsRepository> {
  ProgramStaffViewsRepositoryProvider._()
    : super(
        from: null,
        argument: null,
        retry: null,
        name: r'programStaffViewsRepositoryProvider',
        isAutoDispose: false,
        dependencies: null,
        $allTransitiveDependencies: null,
      );

  @override
  String debugGetCreateSourceHash() => _$programStaffViewsRepositoryHash();

  @$internal
  @override
  $ProviderElement<ProgramStaffViewsRepository> $createElement(
    $ProviderPointer pointer,
  ) => $ProviderElement(pointer);

  @override
  ProgramStaffViewsRepository create(Ref ref) {
    return programStaffViewsRepository(ref);
  }

  /// {@macro riverpod.override_with_value}
  Override overrideWithValue(ProgramStaffViewsRepository value) {
    return $ProviderOverride(
      origin: this,
      providerOverride: $SyncValueProvider<ProgramStaffViewsRepository>(value),
    );
  }
}

String _$programStaffViewsRepositoryHash() =>
    r'02a81520c025d031ff010e01b34b9c4f7622d454';

/// The programme's staff, live.

@ProviderFor(programStaffStream)
final programStaffStreamProvider = ProgramStaffStreamFamily._();

/// The programme's staff, live.

final class ProgramStaffStreamProvider
    extends
        $FunctionalProvider<
          AsyncValue<ProgramStaffList>,
          ProgramStaffList,
          Stream<ProgramStaffList>
        >
    with $FutureModifier<ProgramStaffList>, $StreamProvider<ProgramStaffList> {
  /// The programme's staff, live.
  ProgramStaffStreamProvider._({
    required ProgramStaffStreamFamily super.from,
    required String super.argument,
  }) : super(
         retry: null,
         name: r'programStaffStreamProvider',
         isAutoDispose: true,
         dependencies: null,
         $allTransitiveDependencies: null,
       );

  @override
  String debugGetCreateSourceHash() => _$programStaffStreamHash();

  @override
  String toString() {
    return r'programStaffStreamProvider'
        ''
        '($argument)';
  }

  @$internal
  @override
  $StreamProviderElement<ProgramStaffList> $createElement(
    $ProviderPointer pointer,
  ) => $StreamProviderElement(pointer);

  @override
  Stream<ProgramStaffList> create(Ref ref) {
    final argument = this.argument as String;
    return programStaffStream(ref, argument);
  }

  @override
  bool operator ==(Object other) {
    return other is ProgramStaffStreamProvider && other.argument == argument;
  }

  @override
  int get hashCode {
    return argument.hashCode;
  }
}

String _$programStaffStreamHash() =>
    r'124f296083063033af0a31f227ecf1b40aea6c83';

/// The programme's staff, live.

final class ProgramStaffStreamFamily extends $Family
    with $FunctionalFamilyOverride<Stream<ProgramStaffList>, String> {
  ProgramStaffStreamFamily._()
    : super(
        retry: null,
        name: r'programStaffStreamProvider',
        dependencies: null,
        $allTransitiveDependencies: null,
        isAutoDispose: true,
      );

  /// The programme's staff, live.

  ProgramStaffStreamProvider call(String programId) =>
      ProgramStaffStreamProvider._(argument: programId, from: this);

  @override
  String toString() => r'programStaffStreamProvider';
}
