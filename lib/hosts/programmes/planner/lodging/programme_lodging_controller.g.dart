// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'programme_lodging_controller.dart';

// **************************************************************************
// RiverpodGenerator
// **************************************************************************

// GENERATED CODE - DO NOT MODIFY BY HAND
// ignore_for_file: type=lint, type=warning
/// The stay planner's one state owner, over `manageProgramLodging`.
///
/// Reads: `readSetup`, then `preview` once a setup exists; `destinations`,
/// `readMembership` and `resolveDates` on demand. Writes: `setup` (dates,
/// sharing parties, nesting, inventory and verified stay links),
/// `decideMembership`, `propose` (moving one party), `preview` with
/// `regenerate`, and the decisions `save` then `transition` (approve,
/// confirm a hotel, publish rooms to guests).
///
/// It fences every async result and keeps an uncertain decision verbatim
/// for its retry. Losing authority, expiry or disposal clears the private
/// planning data.

@ProviderFor(HostProgrammeLodgingController)
final hostProgrammeLodgingControllerProvider =
    HostProgrammeLodgingControllerFamily._();

/// The stay planner's one state owner, over `manageProgramLodging`.
///
/// Reads: `readSetup`, then `preview` once a setup exists; `destinations`,
/// `readMembership` and `resolveDates` on demand. Writes: `setup` (dates,
/// sharing parties, nesting, inventory and verified stay links),
/// `decideMembership`, `propose` (moving one party), `preview` with
/// `regenerate`, and the decisions `save` then `transition` (approve,
/// confirm a hotel, publish rooms to guests).
///
/// It fences every async result and keeps an uncertain decision verbatim
/// for its retry. Losing authority, expiry or disposal clears the private
/// planning data.
final class HostProgrammeLodgingControllerProvider
    extends
        $AsyncNotifierProvider<
          HostProgrammeLodgingController,
          HostProgrammeLodgingState
        > {
  /// The stay planner's one state owner, over `manageProgramLodging`.
  ///
  /// Reads: `readSetup`, then `preview` once a setup exists; `destinations`,
  /// `readMembership` and `resolveDates` on demand. Writes: `setup` (dates,
  /// sharing parties, nesting, inventory and verified stay links),
  /// `decideMembership`, `propose` (moving one party), `preview` with
  /// `regenerate`, and the decisions `save` then `transition` (approve,
  /// confirm a hotel, publish rooms to guests).
  ///
  /// It fences every async result and keeps an uncertain decision verbatim
  /// for its retry. Losing authority, expiry or disposal clears the private
  /// planning data.
  HostProgrammeLodgingControllerProvider._({
    required HostProgrammeLodgingControllerFamily super.from,
    required String super.argument,
  }) : super(
         retry: null,
         name: r'hostProgrammeLodgingControllerProvider',
         isAutoDispose: true,
         dependencies: null,
         $allTransitiveDependencies: null,
       );

  @override
  String debugGetCreateSourceHash() => _$hostProgrammeLodgingControllerHash();

  @override
  String toString() {
    return r'hostProgrammeLodgingControllerProvider'
        ''
        '($argument)';
  }

  @$internal
  @override
  HostProgrammeLodgingController create() => HostProgrammeLodgingController();

  @override
  bool operator ==(Object other) {
    return other is HostProgrammeLodgingControllerProvider &&
        other.argument == argument;
  }

  @override
  int get hashCode {
    return argument.hashCode;
  }
}

String _$hostProgrammeLodgingControllerHash() =>
    r'b951b685a03b0d1300e00b268fa2f7bc529e5ae7';

/// The stay planner's one state owner, over `manageProgramLodging`.
///
/// Reads: `readSetup`, then `preview` once a setup exists; `destinations`,
/// `readMembership` and `resolveDates` on demand. Writes: `setup` (dates,
/// sharing parties, nesting, inventory and verified stay links),
/// `decideMembership`, `propose` (moving one party), `preview` with
/// `regenerate`, and the decisions `save` then `transition` (approve,
/// confirm a hotel, publish rooms to guests).
///
/// It fences every async result and keeps an uncertain decision verbatim
/// for its retry. Losing authority, expiry or disposal clears the private
/// planning data.

final class HostProgrammeLodgingControllerFamily extends $Family
    with
        $ClassFamilyOverride<
          HostProgrammeLodgingController,
          AsyncValue<HostProgrammeLodgingState>,
          HostProgrammeLodgingState,
          FutureOr<HostProgrammeLodgingState>,
          String
        > {
  HostProgrammeLodgingControllerFamily._()
    : super(
        retry: null,
        name: r'hostProgrammeLodgingControllerProvider',
        dependencies: null,
        $allTransitiveDependencies: null,
        isAutoDispose: true,
      );

  /// The stay planner's one state owner, over `manageProgramLodging`.
  ///
  /// Reads: `readSetup`, then `preview` once a setup exists; `destinations`,
  /// `readMembership` and `resolveDates` on demand. Writes: `setup` (dates,
  /// sharing parties, nesting, inventory and verified stay links),
  /// `decideMembership`, `propose` (moving one party), `preview` with
  /// `regenerate`, and the decisions `save` then `transition` (approve,
  /// confirm a hotel, publish rooms to guests).
  ///
  /// It fences every async result and keeps an uncertain decision verbatim
  /// for its retry. Losing authority, expiry or disposal clears the private
  /// planning data.

  HostProgrammeLodgingControllerProvider call(String programId) =>
      HostProgrammeLodgingControllerProvider._(argument: programId, from: this);

  @override
  String toString() => r'hostProgrammeLodgingControllerProvider';
}

/// The stay planner's one state owner, over `manageProgramLodging`.
///
/// Reads: `readSetup`, then `preview` once a setup exists; `destinations`,
/// `readMembership` and `resolveDates` on demand. Writes: `setup` (dates,
/// sharing parties, nesting, inventory and verified stay links),
/// `decideMembership`, `propose` (moving one party), `preview` with
/// `regenerate`, and the decisions `save` then `transition` (approve,
/// confirm a hotel, publish rooms to guests).
///
/// It fences every async result and keeps an uncertain decision verbatim
/// for its retry. Losing authority, expiry or disposal clears the private
/// planning data.

abstract class _$HostProgrammeLodgingController
    extends $AsyncNotifier<HostProgrammeLodgingState> {
  late final _$args = ref.$arg as String;
  String get programId => _$args;

  FutureOr<HostProgrammeLodgingState> build(String programId);
  @$mustCallSuper
  @override
  WhenComplete runBuild() {
    final ref =
        this.ref
            as $Ref<
              AsyncValue<HostProgrammeLodgingState>,
              HostProgrammeLodgingState
            >;
    final element =
        ref.element
            as $ClassProviderElement<
              AnyNotifier<
                AsyncValue<HostProgrammeLodgingState>,
                HostProgrammeLodgingState
              >,
              AsyncValue<HostProgrammeLodgingState>,
              Object?,
              Object?
            >;
    return element.handleCreate(ref, () => build(_$args));
  }
}
