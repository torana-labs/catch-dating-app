// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'live_controller.dart';

// **************************************************************************
// RiverpodGenerator
// **************************************************************************

// GENERATED CODE - DO NOT MODIFY BY HAND
// ignore_for_file: type=lint, type=warning
/// The live console, composed from listeners only: the plan, the roster,
/// presence and late arrivals, open help requests, deliveries waiting on the
/// host, the teams and the scoreboard. Nothing polls, and no command
/// invalidates a read; each listener delivers the result.

@ProviderFor(hostLiveController)
final hostLiveControllerProvider = HostLiveControllerFamily._();

/// The live console, composed from listeners only: the plan, the roster,
/// presence and late arrivals, open help requests, deliveries waiting on the
/// host, the teams and the scoreboard. Nothing polls, and no command
/// invalidates a read; each listener delivers the result.

final class HostLiveControllerProvider
    extends $FunctionalProvider<HostLiveState, HostLiveState, HostLiveState>
    with $Provider<HostLiveState> {
  /// The live console, composed from listeners only: the plan, the roster,
  /// presence and late arrivals, open help requests, deliveries waiting on the
  /// host, the teams and the scoreboard. Nothing polls, and no command
  /// invalidates a read; each listener delivers the result.
  HostLiveControllerProvider._({
    required HostLiveControllerFamily super.from,
    required Event super.argument,
  }) : super(
         retry: null,
         name: r'hostLiveControllerProvider',
         isAutoDispose: true,
         dependencies: null,
         $allTransitiveDependencies: null,
       );

  @override
  String debugGetCreateSourceHash() => _$hostLiveControllerHash();

  @override
  String toString() {
    return r'hostLiveControllerProvider'
        ''
        '($argument)';
  }

  @$internal
  @override
  $ProviderElement<HostLiveState> $createElement($ProviderPointer pointer) =>
      $ProviderElement(pointer);

  @override
  HostLiveState create(Ref ref) {
    final argument = this.argument as Event;
    return hostLiveController(ref, argument);
  }

  /// {@macro riverpod.override_with_value}
  Override overrideWithValue(HostLiveState value) {
    return $ProviderOverride(
      origin: this,
      providerOverride: $SyncValueProvider<HostLiveState>(value),
    );
  }

  @override
  bool operator ==(Object other) {
    return other is HostLiveControllerProvider && other.argument == argument;
  }

  @override
  int get hashCode {
    return argument.hashCode;
  }
}

String _$hostLiveControllerHash() =>
    r'3c999669b4909e8bdf13a56c51e37485bd40d6c7';

/// The live console, composed from listeners only: the plan, the roster,
/// presence and late arrivals, open help requests, deliveries waiting on the
/// host, the teams and the scoreboard. Nothing polls, and no command
/// invalidates a read; each listener delivers the result.

final class HostLiveControllerFamily extends $Family
    with $FunctionalFamilyOverride<HostLiveState, Event> {
  HostLiveControllerFamily._()
    : super(
        retry: null,
        name: r'hostLiveControllerProvider',
        dependencies: null,
        $allTransitiveDependencies: null,
        isAutoDispose: true,
      );

  /// The live console, composed from listeners only: the plan, the roster,
  /// presence and late arrivals, open help requests, deliveries waiting on the
  /// host, the teams and the scoreboard. Nothing polls, and no command
  /// invalidates a read; each listener delivers the result.

  HostLiveControllerProvider call(Event event) =>
      HostLiveControllerProvider._(argument: event, from: this);

  @override
  String toString() => r'hostLiveControllerProvider';
}

/// The scores screen, composed from the plan, the scoreboard, the teams and
/// the checked-in guests (whose arrival groups are teams too).

@ProviderFor(hostLiveScoresController)
final hostLiveScoresControllerProvider = HostLiveScoresControllerFamily._();

/// The scores screen, composed from the plan, the scoreboard, the teams and
/// the checked-in guests (whose arrival groups are teams too).

final class HostLiveScoresControllerProvider
    extends
        $FunctionalProvider<
          HostLiveScoresState,
          HostLiveScoresState,
          HostLiveScoresState
        >
    with $Provider<HostLiveScoresState> {
  /// The scores screen, composed from the plan, the scoreboard, the teams and
  /// the checked-in guests (whose arrival groups are teams too).
  HostLiveScoresControllerProvider._({
    required HostLiveScoresControllerFamily super.from,
    required Event super.argument,
  }) : super(
         retry: null,
         name: r'hostLiveScoresControllerProvider',
         isAutoDispose: true,
         dependencies: null,
         $allTransitiveDependencies: null,
       );

  @override
  String debugGetCreateSourceHash() => _$hostLiveScoresControllerHash();

  @override
  String toString() {
    return r'hostLiveScoresControllerProvider'
        ''
        '($argument)';
  }

  @$internal
  @override
  $ProviderElement<HostLiveScoresState> $createElement(
    $ProviderPointer pointer,
  ) => $ProviderElement(pointer);

  @override
  HostLiveScoresState create(Ref ref) {
    final argument = this.argument as Event;
    return hostLiveScoresController(ref, argument);
  }

  /// {@macro riverpod.override_with_value}
  Override overrideWithValue(HostLiveScoresState value) {
    return $ProviderOverride(
      origin: this,
      providerOverride: $SyncValueProvider<HostLiveScoresState>(value),
    );
  }

  @override
  bool operator ==(Object other) {
    return other is HostLiveScoresControllerProvider &&
        other.argument == argument;
  }

  @override
  int get hashCode {
    return argument.hashCode;
  }
}

String _$hostLiveScoresControllerHash() =>
    r'c8012baaffc0f0b9e0d2b0cc287bb5bd6cd51da9';

/// The scores screen, composed from the plan, the scoreboard, the teams and
/// the checked-in guests (whose arrival groups are teams too).

final class HostLiveScoresControllerFamily extends $Family
    with $FunctionalFamilyOverride<HostLiveScoresState, Event> {
  HostLiveScoresControllerFamily._()
    : super(
        retry: null,
        name: r'hostLiveScoresControllerProvider',
        dependencies: null,
        $allTransitiveDependencies: null,
        isAutoDispose: true,
      );

  /// The scores screen, composed from the plan, the scoreboard, the teams and
  /// the checked-in guests (whose arrival groups are teams too).

  HostLiveScoresControllerProvider call(Event event) =>
      HostLiveScoresControllerProvider._(argument: event, from: this);

  @override
  String toString() => r'hostLiveScoresControllerProvider';
}
