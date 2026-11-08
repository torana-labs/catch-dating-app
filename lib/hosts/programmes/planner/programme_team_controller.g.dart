// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'programme_team_controller.dart';

// **************************************************************************
// RiverpodGenerator
// **************************************************************************

// GENERATED CODE - DO NOT MODIFY BY HAND
// ignore_for_file: type=lint, type=warning
/// The team: the programme and the first page of `listProgramStaff`.

@ProviderFor(hostProgrammeTeamController)
final hostProgrammeTeamControllerProvider =
    HostProgrammeTeamControllerFamily._();

/// The team: the programme and the first page of `listProgramStaff`.

final class HostProgrammeTeamControllerProvider
    extends
        $FunctionalProvider<
          HostProgrammeReport<ProgramStaffList>,
          HostProgrammeReport<ProgramStaffList>,
          HostProgrammeReport<ProgramStaffList>
        >
    with $Provider<HostProgrammeReport<ProgramStaffList>> {
  /// The team: the programme and the first page of `listProgramStaff`.
  HostProgrammeTeamControllerProvider._({
    required HostProgrammeTeamControllerFamily super.from,
    required String super.argument,
  }) : super(
         retry: null,
         name: r'hostProgrammeTeamControllerProvider',
         isAutoDispose: true,
         dependencies: null,
         $allTransitiveDependencies: null,
       );

  @override
  String debugGetCreateSourceHash() => _$hostProgrammeTeamControllerHash();

  @override
  String toString() {
    return r'hostProgrammeTeamControllerProvider'
        ''
        '($argument)';
  }

  @$internal
  @override
  $ProviderElement<HostProgrammeReport<ProgramStaffList>> $createElement(
    $ProviderPointer pointer,
  ) => $ProviderElement(pointer);

  @override
  HostProgrammeReport<ProgramStaffList> create(Ref ref) {
    final argument = this.argument as String;
    return hostProgrammeTeamController(ref, argument);
  }

  /// {@macro riverpod.override_with_value}
  Override overrideWithValue(HostProgrammeReport<ProgramStaffList> value) {
    return $ProviderOverride(
      origin: this,
      providerOverride:
          $SyncValueProvider<HostProgrammeReport<ProgramStaffList>>(value),
    );
  }

  @override
  bool operator ==(Object other) {
    return other is HostProgrammeTeamControllerProvider &&
        other.argument == argument;
  }

  @override
  int get hashCode {
    return argument.hashCode;
  }
}

String _$hostProgrammeTeamControllerHash() =>
    r'1fcf5522d0c3eba74dc849dab92d06e14c2b205f';

/// The team: the programme and the first page of `listProgramStaff`.

final class HostProgrammeTeamControllerFamily extends $Family
    with
        $FunctionalFamilyOverride<
          HostProgrammeReport<ProgramStaffList>,
          String
        > {
  HostProgrammeTeamControllerFamily._()
    : super(
        retry: null,
        name: r'hostProgrammeTeamControllerProvider',
        dependencies: null,
        $allTransitiveDependencies: null,
        isAutoDispose: true,
      );

  /// The team: the programme and the first page of `listProgramStaff`.

  HostProgrammeTeamControllerProvider call(String programId) =>
      HostProgrammeTeamControllerProvider._(argument: programId, from: this);

  @override
  String toString() => r'hostProgrammeTeamControllerProvider';
}
