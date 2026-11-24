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

/// The programme's first guest page with its households, function rows and
/// groups, from the trigger-kept guest directory (#2306) rather than the
/// `listProgramGuests` callable. It follows the live rows, so a guest or RSVP
/// write shows once its trigger rewrites the row.

@ProviderFor(programGuestList)
final programGuestListProvider = ProgramGuestListFamily._();

/// The programme's first guest page with its households, function rows and
/// groups, from the trigger-kept guest directory (#2306) rather than the
/// `listProgramGuests` callable. It follows the live rows, so a guest or RSVP
/// write shows once its trigger rewrites the row.

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
  /// The programme's first guest page with its households, function rows and
  /// groups, from the trigger-kept guest directory (#2306) rather than the
  /// `listProgramGuests` callable. It follows the live rows, so a guest or RSVP
  /// write shows once its trigger rewrites the row.
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

String _$programGuestListHash() => r'e9d14bc8ae09d991b52c4aefb28de914c2d97738';

/// The programme's first guest page with its households, function rows and
/// groups, from the trigger-kept guest directory (#2306) rather than the
/// `listProgramGuests` callable. It follows the live rows, so a guest or RSVP
/// write shows once its trigger rewrites the row.

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

  /// The programme's first guest page with its households, function rows and
  /// groups, from the trigger-kept guest directory (#2306) rather than the
  /// `listProgramGuests` callable. It follows the live rows, so a guest or RSVP
  /// write shows once its trigger rewrites the row.

  ProgramGuestListProvider call(String programId) =>
      ProgramGuestListProvider._(argument: programId, from: this);

  @override
  String toString() => r'programGuestListProvider';
}

/// Every guest group in the programme, empty ones included, for the guest
/// editor's picker and the groups section. Coordinator-only on the server
/// (`programCoordinator` or manager), like the group writes.

@ProviderFor(programGuestGroupList)
final programGuestGroupListProvider = ProgramGuestGroupListFamily._();

/// Every guest group in the programme, empty ones included, for the guest
/// editor's picker and the groups section. Coordinator-only on the server
/// (`programCoordinator` or manager), like the group writes.

final class ProgramGuestGroupListProvider
    extends
        $FunctionalProvider<
          AsyncValue<List<ProgramGuestGroupRow>>,
          List<ProgramGuestGroupRow>,
          FutureOr<List<ProgramGuestGroupRow>>
        >
    with
        $FutureModifier<List<ProgramGuestGroupRow>>,
        $FutureProvider<List<ProgramGuestGroupRow>> {
  /// Every guest group in the programme, empty ones included, for the guest
  /// editor's picker and the groups section. Coordinator-only on the server
  /// (`programCoordinator` or manager), like the group writes.
  ProgramGuestGroupListProvider._({
    required ProgramGuestGroupListFamily super.from,
    required String super.argument,
  }) : super(
         retry: null,
         name: r'programGuestGroupListProvider',
         isAutoDispose: true,
         dependencies: null,
         $allTransitiveDependencies: null,
       );

  @override
  String debugGetCreateSourceHash() => _$programGuestGroupListHash();

  @override
  String toString() {
    return r'programGuestGroupListProvider'
        ''
        '($argument)';
  }

  @$internal
  @override
  $FutureProviderElement<List<ProgramGuestGroupRow>> $createElement(
    $ProviderPointer pointer,
  ) => $FutureProviderElement(pointer);

  @override
  FutureOr<List<ProgramGuestGroupRow>> create(Ref ref) {
    final argument = this.argument as String;
    return programGuestGroupList(ref, argument);
  }

  @override
  bool operator ==(Object other) {
    return other is ProgramGuestGroupListProvider && other.argument == argument;
  }

  @override
  int get hashCode {
    return argument.hashCode;
  }
}

String _$programGuestGroupListHash() =>
    r'3feca48f5b0a2388accd9523d733965c3405f75a';

/// Every guest group in the programme, empty ones included, for the guest
/// editor's picker and the groups section. Coordinator-only on the server
/// (`programCoordinator` or manager), like the group writes.

final class ProgramGuestGroupListFamily extends $Family
    with
        $FunctionalFamilyOverride<
          FutureOr<List<ProgramGuestGroupRow>>,
          String
        > {
  ProgramGuestGroupListFamily._()
    : super(
        retry: null,
        name: r'programGuestGroupListProvider',
        dependencies: null,
        $allTransitiveDependencies: null,
        isAutoDispose: true,
      );

  /// Every guest group in the programme, empty ones included, for the guest
  /// editor's picker and the groups section. Coordinator-only on the server
  /// (`programCoordinator` or manager), like the group writes.

  ProgramGuestGroupListProvider call(String programId) =>
      ProgramGuestGroupListProvider._(argument: programId, from: this);

  @override
  String toString() => r'programGuestGroupListProvider';
}

/// Every household in the programme, empty ones included, for the guest
/// editor's picker. The first guest page only names households with a member
/// on that page.

@ProviderFor(programHouseholdList)
final programHouseholdListProvider = ProgramHouseholdListFamily._();

/// Every household in the programme, empty ones included, for the guest
/// editor's picker. The first guest page only names households with a member
/// on that page.

final class ProgramHouseholdListProvider
    extends
        $FunctionalProvider<
          AsyncValue<List<ProgramHouseholdRow>>,
          List<ProgramHouseholdRow>,
          FutureOr<List<ProgramHouseholdRow>>
        >
    with
        $FutureModifier<List<ProgramHouseholdRow>>,
        $FutureProvider<List<ProgramHouseholdRow>> {
  /// Every household in the programme, empty ones included, for the guest
  /// editor's picker. The first guest page only names households with a member
  /// on that page.
  ProgramHouseholdListProvider._({
    required ProgramHouseholdListFamily super.from,
    required String super.argument,
  }) : super(
         retry: null,
         name: r'programHouseholdListProvider',
         isAutoDispose: true,
         dependencies: null,
         $allTransitiveDependencies: null,
       );

  @override
  String debugGetCreateSourceHash() => _$programHouseholdListHash();

  @override
  String toString() {
    return r'programHouseholdListProvider'
        ''
        '($argument)';
  }

  @$internal
  @override
  $FutureProviderElement<List<ProgramHouseholdRow>> $createElement(
    $ProviderPointer pointer,
  ) => $FutureProviderElement(pointer);

  @override
  FutureOr<List<ProgramHouseholdRow>> create(Ref ref) {
    final argument = this.argument as String;
    return programHouseholdList(ref, argument);
  }

  @override
  bool operator ==(Object other) {
    return other is ProgramHouseholdListProvider && other.argument == argument;
  }

  @override
  int get hashCode {
    return argument.hashCode;
  }
}

String _$programHouseholdListHash() =>
    r'5d715f832e99365dbae183d648628b5b3d4d4832';

/// Every household in the programme, empty ones included, for the guest
/// editor's picker. The first guest page only names households with a member
/// on that page.

final class ProgramHouseholdListFamily extends $Family
    with
        $FunctionalFamilyOverride<FutureOr<List<ProgramHouseholdRow>>, String> {
  ProgramHouseholdListFamily._()
    : super(
        retry: null,
        name: r'programHouseholdListProvider',
        dependencies: null,
        $allTransitiveDependencies: null,
        isAutoDispose: true,
      );

  /// Every household in the programme, empty ones included, for the guest
  /// editor's picker. The first guest page only names households with a member
  /// on that page.

  ProgramHouseholdListProvider call(String programId) =>
      ProgramHouseholdListProvider._(argument: programId, from: this);

  @override
  String toString() => r'programHouseholdListProvider';
}
