// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'programme_controller.dart';

// **************************************************************************
// RiverpodGenerator
// **************************************************************************

// GENERATED CODE - DO NOT MODIFY BY HAND
// ignore_for_file: type=lint, type=warning
/// The programme the planner screens read: `getOrganizerProgram` for the
/// settings, schedule, pickup points and hotels, and `listProgramGuests`
/// for the guests, households, groups and answers. Both are callables; the
/// schedule shows while the guest list is still loading.

@ProviderFor(hostProgrammeController)
final hostProgrammeControllerProvider = HostProgrammeControllerFamily._();

/// The programme the planner screens read: `getOrganizerProgram` for the
/// settings, schedule, pickup points and hotels, and `listProgramGuests`
/// for the guests, households, groups and answers. Both are callables; the
/// schedule shows while the guest list is still loading.

final class HostProgrammeControllerProvider
    extends
        $FunctionalProvider<
          HostProgrammeState,
          HostProgrammeState,
          HostProgrammeState
        >
    with $Provider<HostProgrammeState> {
  /// The programme the planner screens read: `getOrganizerProgram` for the
  /// settings, schedule, pickup points and hotels, and `listProgramGuests`
  /// for the guests, households, groups and answers. Both are callables; the
  /// schedule shows while the guest list is still loading.
  HostProgrammeControllerProvider._({
    required HostProgrammeControllerFamily super.from,
    required String super.argument,
  }) : super(
         retry: null,
         name: r'hostProgrammeControllerProvider',
         isAutoDispose: true,
         dependencies: null,
         $allTransitiveDependencies: null,
       );

  @override
  String debugGetCreateSourceHash() => _$hostProgrammeControllerHash();

  @override
  String toString() {
    return r'hostProgrammeControllerProvider'
        ''
        '($argument)';
  }

  @$internal
  @override
  $ProviderElement<HostProgrammeState> $createElement(
    $ProviderPointer pointer,
  ) => $ProviderElement(pointer);

  @override
  HostProgrammeState create(Ref ref) {
    final argument = this.argument as String;
    return hostProgrammeController(ref, argument);
  }

  /// {@macro riverpod.override_with_value}
  Override overrideWithValue(HostProgrammeState value) {
    return $ProviderOverride(
      origin: this,
      providerOverride: $SyncValueProvider<HostProgrammeState>(value),
    );
  }

  @override
  bool operator ==(Object other) {
    return other is HostProgrammeControllerProvider &&
        other.argument == argument;
  }

  @override
  int get hashCode {
    return argument.hashCode;
  }
}

String _$hostProgrammeControllerHash() =>
    r'053fed2700fd5124886aa5980636f7dd858ae653';

/// The programme the planner screens read: `getOrganizerProgram` for the
/// settings, schedule, pickup points and hotels, and `listProgramGuests`
/// for the guests, households, groups and answers. Both are callables; the
/// schedule shows while the guest list is still loading.

final class HostProgrammeControllerFamily extends $Family
    with $FunctionalFamilyOverride<HostProgrammeState, String> {
  HostProgrammeControllerFamily._()
    : super(
        retry: null,
        name: r'hostProgrammeControllerProvider',
        dependencies: null,
        $allTransitiveDependencies: null,
        isAutoDispose: true,
      );

  /// The programme the planner screens read: `getOrganizerProgram` for the
  /// settings, schedule, pickup points and hotels, and `listProgramGuests`
  /// for the guests, households, groups and answers. Both are callables; the
  /// schedule shows while the guest list is still loading.

  HostProgrammeControllerProvider call(String programId) =>
      HostProgrammeControllerProvider._(argument: programId, from: this);

  @override
  String toString() => r'hostProgrammeControllerProvider';
}
