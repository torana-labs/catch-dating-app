// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'programme_reports_controller.dart';

// **************************************************************************
// RiverpodGenerator
// **************************************************************************

// GENERATED CODE - DO NOT MODIFY BY HAND
// ignore_for_file: type=lint, type=warning
/// Attendance: the programme (for names) and `getProgramAttendanceReport`.

@ProviderFor(hostProgrammeAttendanceController)
final hostProgrammeAttendanceControllerProvider =
    HostProgrammeAttendanceControllerFamily._();

/// Attendance: the programme (for names) and `getProgramAttendanceReport`.

final class HostProgrammeAttendanceControllerProvider
    extends
        $FunctionalProvider<
          HostProgrammeReport<ProgramAttendanceReport>,
          HostProgrammeReport<ProgramAttendanceReport>,
          HostProgrammeReport<ProgramAttendanceReport>
        >
    with $Provider<HostProgrammeReport<ProgramAttendanceReport>> {
  /// Attendance: the programme (for names) and `getProgramAttendanceReport`.
  HostProgrammeAttendanceControllerProvider._({
    required HostProgrammeAttendanceControllerFamily super.from,
    required String super.argument,
  }) : super(
         retry: null,
         name: r'hostProgrammeAttendanceControllerProvider',
         isAutoDispose: true,
         dependencies: null,
         $allTransitiveDependencies: null,
       );

  @override
  String debugGetCreateSourceHash() =>
      _$hostProgrammeAttendanceControllerHash();

  @override
  String toString() {
    return r'hostProgrammeAttendanceControllerProvider'
        ''
        '($argument)';
  }

  @$internal
  @override
  $ProviderElement<HostProgrammeReport<ProgramAttendanceReport>> $createElement(
    $ProviderPointer pointer,
  ) => $ProviderElement(pointer);

  @override
  HostProgrammeReport<ProgramAttendanceReport> create(Ref ref) {
    final argument = this.argument as String;
    return hostProgrammeAttendanceController(ref, argument);
  }

  /// {@macro riverpod.override_with_value}
  Override overrideWithValue(
    HostProgrammeReport<ProgramAttendanceReport> value,
  ) {
    return $ProviderOverride(
      origin: this,
      providerOverride:
          $SyncValueProvider<HostProgrammeReport<ProgramAttendanceReport>>(
            value,
          ),
    );
  }

  @override
  bool operator ==(Object other) {
    return other is HostProgrammeAttendanceControllerProvider &&
        other.argument == argument;
  }

  @override
  int get hashCode {
    return argument.hashCode;
  }
}

String _$hostProgrammeAttendanceControllerHash() =>
    r'429a7c5f6d8ba466a20bd8ee11baf13ed806e50b';

/// Attendance: the programme (for names) and `getProgramAttendanceReport`.

final class HostProgrammeAttendanceControllerFamily extends $Family
    with
        $FunctionalFamilyOverride<
          HostProgrammeReport<ProgramAttendanceReport>,
          String
        > {
  HostProgrammeAttendanceControllerFamily._()
    : super(
        retry: null,
        name: r'hostProgrammeAttendanceControllerProvider',
        dependencies: null,
        $allTransitiveDependencies: null,
        isAutoDispose: true,
      );

  /// Attendance: the programme (for names) and `getProgramAttendanceReport`.

  HostProgrammeAttendanceControllerProvider call(String programId) =>
      HostProgrammeAttendanceControllerProvider._(
        argument: programId,
        from: this,
      );

  @override
  String toString() => r'hostProgrammeAttendanceControllerProvider';
}

/// The trip ledger: the programme and the first page of `listProgramTrips`.

@ProviderFor(hostProgrammeTripsController)
final hostProgrammeTripsControllerProvider =
    HostProgrammeTripsControllerFamily._();

/// The trip ledger: the programme and the first page of `listProgramTrips`.

final class HostProgrammeTripsControllerProvider
    extends
        $FunctionalProvider<
          HostProgrammeReport<ProgramTripList>,
          HostProgrammeReport<ProgramTripList>,
          HostProgrammeReport<ProgramTripList>
        >
    with $Provider<HostProgrammeReport<ProgramTripList>> {
  /// The trip ledger: the programme and the first page of `listProgramTrips`.
  HostProgrammeTripsControllerProvider._({
    required HostProgrammeTripsControllerFamily super.from,
    required String super.argument,
  }) : super(
         retry: null,
         name: r'hostProgrammeTripsControllerProvider',
         isAutoDispose: true,
         dependencies: null,
         $allTransitiveDependencies: null,
       );

  @override
  String debugGetCreateSourceHash() => _$hostProgrammeTripsControllerHash();

  @override
  String toString() {
    return r'hostProgrammeTripsControllerProvider'
        ''
        '($argument)';
  }

  @$internal
  @override
  $ProviderElement<HostProgrammeReport<ProgramTripList>> $createElement(
    $ProviderPointer pointer,
  ) => $ProviderElement(pointer);

  @override
  HostProgrammeReport<ProgramTripList> create(Ref ref) {
    final argument = this.argument as String;
    return hostProgrammeTripsController(ref, argument);
  }

  /// {@macro riverpod.override_with_value}
  Override overrideWithValue(HostProgrammeReport<ProgramTripList> value) {
    return $ProviderOverride(
      origin: this,
      providerOverride:
          $SyncValueProvider<HostProgrammeReport<ProgramTripList>>(value),
    );
  }

  @override
  bool operator ==(Object other) {
    return other is HostProgrammeTripsControllerProvider &&
        other.argument == argument;
  }

  @override
  int get hashCode {
    return argument.hashCode;
  }
}

String _$hostProgrammeTripsControllerHash() =>
    r'8428b2ac9a4738fcb2c952382990aa30a0468f13';

/// The trip ledger: the programme and the first page of `listProgramTrips`.

final class HostProgrammeTripsControllerFamily extends $Family
    with
        $FunctionalFamilyOverride<
          HostProgrammeReport<ProgramTripList>,
          String
        > {
  HostProgrammeTripsControllerFamily._()
    : super(
        retry: null,
        name: r'hostProgrammeTripsControllerProvider',
        dependencies: null,
        $allTransitiveDependencies: null,
        isAutoDispose: true,
      );

  /// The trip ledger: the programme and the first page of `listProgramTrips`.

  HostProgrammeTripsControllerProvider call(String programId) =>
      HostProgrammeTripsControllerProvider._(argument: programId, from: this);

  @override
  String toString() => r'hostProgrammeTripsControllerProvider';
}

/// The counts-only share view: the work access (title, dates and
/// function names, which a family viewer may read) and
/// `getProgramStakeholderCounts`.

@ProviderFor(hostProgrammeShareController)
final hostProgrammeShareControllerProvider =
    HostProgrammeShareControllerFamily._();

/// The counts-only share view: the work access (title, dates and
/// function names, which a family viewer may read) and
/// `getProgramStakeholderCounts`.

final class HostProgrammeShareControllerProvider
    extends
        $FunctionalProvider<
          HostProgrammeShareState,
          HostProgrammeShareState,
          HostProgrammeShareState
        >
    with $Provider<HostProgrammeShareState> {
  /// The counts-only share view: the work access (title, dates and
  /// function names, which a family viewer may read) and
  /// `getProgramStakeholderCounts`.
  HostProgrammeShareControllerProvider._({
    required HostProgrammeShareControllerFamily super.from,
    required String super.argument,
  }) : super(
         retry: null,
         name: r'hostProgrammeShareControllerProvider',
         isAutoDispose: true,
         dependencies: null,
         $allTransitiveDependencies: null,
       );

  @override
  String debugGetCreateSourceHash() => _$hostProgrammeShareControllerHash();

  @override
  String toString() {
    return r'hostProgrammeShareControllerProvider'
        ''
        '($argument)';
  }

  @$internal
  @override
  $ProviderElement<HostProgrammeShareState> $createElement(
    $ProviderPointer pointer,
  ) => $ProviderElement(pointer);

  @override
  HostProgrammeShareState create(Ref ref) {
    final argument = this.argument as String;
    return hostProgrammeShareController(ref, argument);
  }

  /// {@macro riverpod.override_with_value}
  Override overrideWithValue(HostProgrammeShareState value) {
    return $ProviderOverride(
      origin: this,
      providerOverride: $SyncValueProvider<HostProgrammeShareState>(value),
    );
  }

  @override
  bool operator ==(Object other) {
    return other is HostProgrammeShareControllerProvider &&
        other.argument == argument;
  }

  @override
  int get hashCode {
    return argument.hashCode;
  }
}

String _$hostProgrammeShareControllerHash() =>
    r'81cd826658862528be7ecedd098864ea88f04d11';

/// The counts-only share view: the work access (title, dates and
/// function names, which a family viewer may read) and
/// `getProgramStakeholderCounts`.

final class HostProgrammeShareControllerFamily extends $Family
    with $FunctionalFamilyOverride<HostProgrammeShareState, String> {
  HostProgrammeShareControllerFamily._()
    : super(
        retry: null,
        name: r'hostProgrammeShareControllerProvider',
        dependencies: null,
        $allTransitiveDependencies: null,
        isAutoDispose: true,
      );

  /// The counts-only share view: the work access (title, dates and
  /// function names, which a family viewer may read) and
  /// `getProgramStakeholderCounts`.

  HostProgrammeShareControllerProvider call(String programId) =>
      HostProgrammeShareControllerProvider._(argument: programId, from: this);

  @override
  String toString() => r'hostProgrammeShareControllerProvider';
}
