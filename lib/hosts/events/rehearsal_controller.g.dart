// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'rehearsal_controller.dart';

// **************************************************************************
// RiverpodGenerator
// **************************************************************************

// GENERATED CODE - DO NOT MODIFY BY HAND
// ignore_for_file: type=lint, type=warning
/// The rehearsal screen, composed from the rehearsal session read: its
/// event's name, its made-up guests and the plan's steps up to the one
/// being practised. The rehearsal's own state machine moves the steps.

@ProviderFor(hostRehearsalController)
final hostRehearsalControllerProvider = HostRehearsalControllerFamily._();

/// The rehearsal screen, composed from the rehearsal session read: its
/// event's name, its made-up guests and the plan's steps up to the one
/// being practised. The rehearsal's own state machine moves the steps.

final class HostRehearsalControllerProvider
    extends
        $FunctionalProvider<
          HostRehearsalState,
          HostRehearsalState,
          HostRehearsalState
        >
    with $Provider<HostRehearsalState> {
  /// The rehearsal screen, composed from the rehearsal session read: its
  /// event's name, its made-up guests and the plan's steps up to the one
  /// being practised. The rehearsal's own state machine moves the steps.
  HostRehearsalControllerProvider._({
    required HostRehearsalControllerFamily super.from,
    required String super.argument,
  }) : super(
         retry: null,
         name: r'hostRehearsalControllerProvider',
         isAutoDispose: true,
         dependencies: null,
         $allTransitiveDependencies: null,
       );

  @override
  String debugGetCreateSourceHash() => _$hostRehearsalControllerHash();

  @override
  String toString() {
    return r'hostRehearsalControllerProvider'
        ''
        '($argument)';
  }

  @$internal
  @override
  $ProviderElement<HostRehearsalState> $createElement(
    $ProviderPointer pointer,
  ) => $ProviderElement(pointer);

  @override
  HostRehearsalState create(Ref ref) {
    final argument = this.argument as String;
    return hostRehearsalController(ref, argument);
  }

  /// {@macro riverpod.override_with_value}
  Override overrideWithValue(HostRehearsalState value) {
    return $ProviderOverride(
      origin: this,
      providerOverride: $SyncValueProvider<HostRehearsalState>(value),
    );
  }

  @override
  bool operator ==(Object other) {
    return other is HostRehearsalControllerProvider &&
        other.argument == argument;
  }

  @override
  int get hashCode {
    return argument.hashCode;
  }
}

String _$hostRehearsalControllerHash() =>
    r'f1281d31bcbbfab7be228e868c900e2a89128caa';

/// The rehearsal screen, composed from the rehearsal session read: its
/// event's name, its made-up guests and the plan's steps up to the one
/// being practised. The rehearsal's own state machine moves the steps.

final class HostRehearsalControllerFamily extends $Family
    with $FunctionalFamilyOverride<HostRehearsalState, String> {
  HostRehearsalControllerFamily._()
    : super(
        retry: null,
        name: r'hostRehearsalControllerProvider',
        dependencies: null,
        $allTransitiveDependencies: null,
        isAutoDispose: true,
      );

  /// The rehearsal screen, composed from the rehearsal session read: its
  /// event's name, its made-up guests and the plan's steps up to the one
  /// being practised. The rehearsal's own state machine moves the steps.

  HostRehearsalControllerProvider call(String sessionId) =>
      HostRehearsalControllerProvider._(argument: sessionId, from: this);

  @override
  String toString() => r'hostRehearsalControllerProvider';
}
