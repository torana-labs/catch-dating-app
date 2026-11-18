// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'program_setup_repository.dart';

// **************************************************************************
// RiverpodGenerator
// **************************************************************************

// GENERATED CODE - DO NOT MODIFY BY HAND
// ignore_for_file: type=lint, type=warning

@ProviderFor(programSetupRepository)
final programSetupRepositoryProvider = ProgramSetupRepositoryProvider._();

final class ProgramSetupRepositoryProvider
    extends
        $FunctionalProvider<
          ProgramSetupRepository,
          ProgramSetupRepository,
          ProgramSetupRepository
        >
    with $Provider<ProgramSetupRepository> {
  ProgramSetupRepositoryProvider._()
    : super(
        from: null,
        argument: null,
        retry: null,
        name: r'programSetupRepositoryProvider',
        isAutoDispose: true,
        dependencies: null,
        $allTransitiveDependencies: null,
      );

  @override
  String debugGetCreateSourceHash() => _$programSetupRepositoryHash();

  @$internal
  @override
  $ProviderElement<ProgramSetupRepository> $createElement(
    $ProviderPointer pointer,
  ) => $ProviderElement(pointer);

  @override
  ProgramSetupRepository create(Ref ref) {
    return programSetupRepository(ref);
  }

  /// {@macro riverpod.override_with_value}
  Override overrideWithValue(ProgramSetupRepository value) {
    return $ProviderOverride(
      origin: this,
      providerOverride: $SyncValueProvider<ProgramSetupRepository>(value),
    );
  }
}

String _$programSetupRepositoryHash() =>
    r'9f9eece111a504886873fa3950d5ef2f08769e35';

/// The organiser's programmes, live from `organizerProgramViews` (#1339).

@ProviderFor(organizerProgramList)
final organizerProgramListProvider = OrganizerProgramListFamily._();

/// The organiser's programmes, live from `organizerProgramViews` (#1339).

final class OrganizerProgramListProvider
    extends
        $FunctionalProvider<
          AsyncValue<List<OrganizerProgramSummary>>,
          List<OrganizerProgramSummary>,
          FutureOr<List<OrganizerProgramSummary>>
        >
    with
        $FutureModifier<List<OrganizerProgramSummary>>,
        $FutureProvider<List<OrganizerProgramSummary>> {
  /// The organiser's programmes, live from `organizerProgramViews` (#1339).
  OrganizerProgramListProvider._({
    required OrganizerProgramListFamily super.from,
    required String super.argument,
  }) : super(
         retry: null,
         name: r'organizerProgramListProvider',
         isAutoDispose: true,
         dependencies: null,
         $allTransitiveDependencies: null,
       );

  @override
  String debugGetCreateSourceHash() => _$organizerProgramListHash();

  @override
  String toString() {
    return r'organizerProgramListProvider'
        ''
        '($argument)';
  }

  @$internal
  @override
  $FutureProviderElement<List<OrganizerProgramSummary>> $createElement(
    $ProviderPointer pointer,
  ) => $FutureProviderElement(pointer);

  @override
  FutureOr<List<OrganizerProgramSummary>> create(Ref ref) {
    final argument = this.argument as String;
    return organizerProgramList(ref, argument);
  }

  @override
  bool operator ==(Object other) {
    return other is OrganizerProgramListProvider && other.argument == argument;
  }

  @override
  int get hashCode {
    return argument.hashCode;
  }
}

String _$organizerProgramListHash() =>
    r'1e9206a587b88896a92eed9792f7b5a50be5f49a';

/// The organiser's programmes, live from `organizerProgramViews` (#1339).

final class OrganizerProgramListFamily extends $Family
    with
        $FunctionalFamilyOverride<
          FutureOr<List<OrganizerProgramSummary>>,
          String
        > {
  OrganizerProgramListFamily._()
    : super(
        retry: null,
        name: r'organizerProgramListProvider',
        dependencies: null,
        $allTransitiveDependencies: null,
        isAutoDispose: true,
      );

  /// The organiser's programmes, live from `organizerProgramViews` (#1339).

  OrganizerProgramListProvider call(String organizerId) =>
      OrganizerProgramListProvider._(argument: organizerId, from: this);

  @override
  String toString() => r'organizerProgramListProvider';
}

/// One programme's settings, schedule and setup lists live from
/// `organizerProgramViews` (#1339), with the guest, household, journey and
/// staff counts the server rolls up. Without the counts (offline, or the
/// callable failing) the programme still shows, with none.

@ProviderFor(organizerProgramDetail)
final organizerProgramDetailProvider = OrganizerProgramDetailFamily._();

/// One programme's settings, schedule and setup lists live from
/// `organizerProgramViews` (#1339), with the guest, household, journey and
/// staff counts the server rolls up. Without the counts (offline, or the
/// callable failing) the programme still shows, with none.

final class OrganizerProgramDetailProvider
    extends
        $FunctionalProvider<
          AsyncValue<OrganizerProgramDetail>,
          OrganizerProgramDetail,
          FutureOr<OrganizerProgramDetail>
        >
    with
        $FutureModifier<OrganizerProgramDetail>,
        $FutureProvider<OrganizerProgramDetail> {
  /// One programme's settings, schedule and setup lists live from
  /// `organizerProgramViews` (#1339), with the guest, household, journey and
  /// staff counts the server rolls up. Without the counts (offline, or the
  /// callable failing) the programme still shows, with none.
  OrganizerProgramDetailProvider._({
    required OrganizerProgramDetailFamily super.from,
    required String super.argument,
  }) : super(
         retry: null,
         name: r'organizerProgramDetailProvider',
         isAutoDispose: true,
         dependencies: null,
         $allTransitiveDependencies: null,
       );

  @override
  String debugGetCreateSourceHash() => _$organizerProgramDetailHash();

  @override
  String toString() {
    return r'organizerProgramDetailProvider'
        ''
        '($argument)';
  }

  @$internal
  @override
  $FutureProviderElement<OrganizerProgramDetail> $createElement(
    $ProviderPointer pointer,
  ) => $FutureProviderElement(pointer);

  @override
  FutureOr<OrganizerProgramDetail> create(Ref ref) {
    final argument = this.argument as String;
    return organizerProgramDetail(ref, argument);
  }

  @override
  bool operator ==(Object other) {
    return other is OrganizerProgramDetailProvider &&
        other.argument == argument;
  }

  @override
  int get hashCode {
    return argument.hashCode;
  }
}

String _$organizerProgramDetailHash() =>
    r'3366b38133236c69426440e1d527ea7d04a467a4';

/// One programme's settings, schedule and setup lists live from
/// `organizerProgramViews` (#1339), with the guest, household, journey and
/// staff counts the server rolls up. Without the counts (offline, or the
/// callable failing) the programme still shows, with none.

final class OrganizerProgramDetailFamily extends $Family
    with $FunctionalFamilyOverride<FutureOr<OrganizerProgramDetail>, String> {
  OrganizerProgramDetailFamily._()
    : super(
        retry: null,
        name: r'organizerProgramDetailProvider',
        dependencies: null,
        $allTransitiveDependencies: null,
        isAutoDispose: true,
      );

  /// One programme's settings, schedule and setup lists live from
  /// `organizerProgramViews` (#1339), with the guest, household, journey and
  /// staff counts the server rolls up. Without the counts (offline, or the
  /// callable failing) the programme still shows, with none.

  OrganizerProgramDetailProvider call(String programId) =>
      OrganizerProgramDetailProvider._(argument: programId, from: this);

  @override
  String toString() => r'organizerProgramDetailProvider';
}

@ProviderFor(programGuestList)
final programGuestListProvider = ProgramGuestListFamily._();

final class ProgramGuestListProvider
    extends
        $FunctionalProvider<
          AsyncValue<ProgramGuestListPage>,
          ProgramGuestListPage,
          FutureOr<ProgramGuestListPage>
        >
    with
        $FutureModifier<ProgramGuestListPage>,
        $FutureProvider<ProgramGuestListPage> {
  ProgramGuestListProvider._({
    required ProgramGuestListFamily super.from,
    required String super.argument,
  }) : super(
         retry: null,
         name: r'programGuestListProvider',
         isAutoDispose: true,
         dependencies: null,
         $allTransitiveDependencies: null,
       );

  @override
  String debugGetCreateSourceHash() => _$programGuestListHash();

  @override
  String toString() {
    return r'programGuestListProvider'
        ''
        '($argument)';
  }

  @$internal
  @override
  $FutureProviderElement<ProgramGuestListPage> $createElement(
    $ProviderPointer pointer,
  ) => $FutureProviderElement(pointer);

  @override
  FutureOr<ProgramGuestListPage> create(Ref ref) {
    final argument = this.argument as String;
    return programGuestList(ref, argument);
  }

  @override
  bool operator ==(Object other) {
    return other is ProgramGuestListProvider && other.argument == argument;
  }

  @override
  int get hashCode {
    return argument.hashCode;
  }
}

String _$programGuestListHash() => r'e78101ad7602350a62cf6efde62411ab0fdd6cb9';

final class ProgramGuestListFamily extends $Family
    with $FunctionalFamilyOverride<FutureOr<ProgramGuestListPage>, String> {
  ProgramGuestListFamily._()
    : super(
        retry: null,
        name: r'programGuestListProvider',
        dependencies: null,
        $allTransitiveDependencies: null,
        isAutoDispose: true,
      );

  ProgramGuestListProvider call(String programId) =>
      ProgramGuestListProvider._(argument: programId, from: this);

  @override
  String toString() => r'programGuestListProvider';
}
