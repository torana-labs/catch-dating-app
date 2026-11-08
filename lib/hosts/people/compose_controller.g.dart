// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'compose_controller.dart';

// **************************************************************************
// RiverpodGenerator
// **************************************************************************

// GENERATED CODE - DO NOT MODIFY BY HAND
// ignore_for_file: type=lint, type=warning
/// The compose screen, composed from the organizer's events listener and
/// the chosen event's participations listener.

@ProviderFor(hostComposeController)
final hostComposeControllerProvider = HostComposeControllerFamily._();

/// The compose screen, composed from the organizer's events listener and
/// the chosen event's participations listener.

final class HostComposeControllerProvider
    extends
        $FunctionalProvider<
          HostComposeState,
          HostComposeState,
          HostComposeState
        >
    with $Provider<HostComposeState> {
  /// The compose screen, composed from the organizer's events listener and
  /// the chosen event's participations listener.
  HostComposeControllerProvider._({
    required HostComposeControllerFamily super.from,
    required HostComposeRequest super.argument,
  }) : super(
         retry: null,
         name: r'hostComposeControllerProvider',
         isAutoDispose: true,
         dependencies: null,
         $allTransitiveDependencies: null,
       );

  @override
  String debugGetCreateSourceHash() => _$hostComposeControllerHash();

  @override
  String toString() {
    return r'hostComposeControllerProvider'
        ''
        '($argument)';
  }

  @$internal
  @override
  $ProviderElement<HostComposeState> $createElement($ProviderPointer pointer) =>
      $ProviderElement(pointer);

  @override
  HostComposeState create(Ref ref) {
    final argument = this.argument as HostComposeRequest;
    return hostComposeController(ref, argument);
  }

  /// {@macro riverpod.override_with_value}
  Override overrideWithValue(HostComposeState value) {
    return $ProviderOverride(
      origin: this,
      providerOverride: $SyncValueProvider<HostComposeState>(value),
    );
  }

  @override
  bool operator ==(Object other) {
    return other is HostComposeControllerProvider && other.argument == argument;
  }

  @override
  int get hashCode {
    return argument.hashCode;
  }
}

String _$hostComposeControllerHash() =>
    r'6ec1ce52e8781555f42c69b2d97434c1f051a9d9';

/// The compose screen, composed from the organizer's events listener and
/// the chosen event's participations listener.

final class HostComposeControllerFamily extends $Family
    with $FunctionalFamilyOverride<HostComposeState, HostComposeRequest> {
  HostComposeControllerFamily._()
    : super(
        retry: null,
        name: r'hostComposeControllerProvider',
        dependencies: null,
        $allTransitiveDependencies: null,
        isAutoDispose: true,
      );

  /// The compose screen, composed from the organizer's events listener and
  /// the chosen event's participations listener.

  HostComposeControllerProvider call(HostComposeRequest request) =>
      HostComposeControllerProvider._(argument: request, from: this);

  @override
  String toString() => r'hostComposeControllerProvider';
}

/// The existing event broadcast command: one message to an event's booked
/// guests, waitlist or both, idempotent by its request id.

@ProviderFor(hostComposeCommands)
final hostComposeCommandsProvider = HostComposeCommandsProvider._();

/// The existing event broadcast command: one message to an event's booked
/// guests, waitlist or both, idempotent by its request id.

final class HostComposeCommandsProvider
    extends
        $FunctionalProvider<
          HostComposeCommands,
          HostComposeCommands,
          HostComposeCommands
        >
    with $Provider<HostComposeCommands> {
  /// The existing event broadcast command: one message to an event's booked
  /// guests, waitlist or both, idempotent by its request id.
  HostComposeCommandsProvider._()
    : super(
        from: null,
        argument: null,
        retry: null,
        name: r'hostComposeCommandsProvider',
        isAutoDispose: true,
        dependencies: null,
        $allTransitiveDependencies: null,
      );

  @override
  String debugGetCreateSourceHash() => _$hostComposeCommandsHash();

  @$internal
  @override
  $ProviderElement<HostComposeCommands> $createElement(
    $ProviderPointer pointer,
  ) => $ProviderElement(pointer);

  @override
  HostComposeCommands create(Ref ref) {
    return hostComposeCommands(ref);
  }

  /// {@macro riverpod.override_with_value}
  Override overrideWithValue(HostComposeCommands value) {
    return $ProviderOverride(
      origin: this,
      providerOverride: $SyncValueProvider<HostComposeCommands>(value),
    );
  }
}

String _$hostComposeCommandsHash() =>
    r'3960d25bbe3a0e2ec558a24ad2973a87b4179255';
