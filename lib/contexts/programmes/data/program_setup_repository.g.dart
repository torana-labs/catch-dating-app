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

@ProviderFor(programStaffList)
final programStaffListProvider = ProgramStaffListFamily._();

final class ProgramStaffListProvider
    extends
        $FunctionalProvider<
          AsyncValue<ProgramStaffList>,
          ProgramStaffList,
          FutureOr<ProgramStaffList>
        >
    with $FutureModifier<ProgramStaffList>, $FutureProvider<ProgramStaffList> {
  ProgramStaffListProvider._({
    required ProgramStaffListFamily super.from,
    required (String, {String? cursor}) super.argument,
  }) : super(
         retry: null,
         name: r'programStaffListProvider',
         isAutoDispose: true,
         dependencies: null,
         $allTransitiveDependencies: null,
       );

  @override
  String debugGetCreateSourceHash() => _$programStaffListHash();

  @override
  String toString() {
    return r'programStaffListProvider'
        ''
        '$argument';
  }

  @$internal
  @override
  $FutureProviderElement<ProgramStaffList> $createElement(
    $ProviderPointer pointer,
  ) => $FutureProviderElement(pointer);

  @override
  FutureOr<ProgramStaffList> create(Ref ref) {
    final argument = this.argument as (String, {String? cursor});
    return programStaffList(ref, argument.$1, cursor: argument.cursor);
  }

  @override
  bool operator ==(Object other) {
    return other is ProgramStaffListProvider && other.argument == argument;
  }

  @override
  int get hashCode {
    return argument.hashCode;
  }
}

String _$programStaffListHash() => r'57533bfb2443d4f8e1308095dcc75081231a6e9f';

final class ProgramStaffListFamily extends $Family
    with
        $FunctionalFamilyOverride<
          FutureOr<ProgramStaffList>,
          (String, {String? cursor})
        > {
  ProgramStaffListFamily._()
    : super(
        retry: null,
        name: r'programStaffListProvider',
        dependencies: null,
        $allTransitiveDependencies: null,
        isAutoDispose: true,
      );

  ProgramStaffListProvider call(String programId, {String? cursor}) =>
      ProgramStaffListProvider._(
        argument: (programId, cursor: cursor),
        from: this,
      );

  @override
  String toString() => r'programStaffListProvider';
}

@ProviderFor(organizerProgramList)
final organizerProgramListProvider = OrganizerProgramListFamily._();

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
    r'd97aa1efc68b9abd0231849940af89736fd5317f';

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

  OrganizerProgramListProvider call(String organizerId) =>
      OrganizerProgramListProvider._(argument: organizerId, from: this);

  @override
  String toString() => r'organizerProgramListProvider';
}

@ProviderFor(organizerProgramDetail)
final organizerProgramDetailProvider = OrganizerProgramDetailFamily._();

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
    r'8d8f44f65d61c0a77d1e68212b68929ee0fac026';

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
