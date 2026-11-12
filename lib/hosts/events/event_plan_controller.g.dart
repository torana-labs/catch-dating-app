// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'event_plan_controller.dart';

// **************************************************************************
// RiverpodGenerator
// **************************************************************************

// GENERATED CODE - DO NOT MODIFY BY HAND
// ignore_for_file: type=lint, type=warning
/// The plan screen, composed from the event and its plan listeners.

@ProviderFor(hostEventPlanController)
final hostEventPlanControllerProvider = HostEventPlanControllerFamily._();

/// The plan screen, composed from the event and its plan listeners.

final class HostEventPlanControllerProvider
    extends
        $FunctionalProvider<
          HostEventPlanState,
          HostEventPlanState,
          HostEventPlanState
        >
    with $Provider<HostEventPlanState> {
  /// The plan screen, composed from the event and its plan listeners.
  HostEventPlanControllerProvider._({
    required HostEventPlanControllerFamily super.from,
    required HostEventRequest super.argument,
  }) : super(
         retry: null,
         name: r'hostEventPlanControllerProvider',
         isAutoDispose: true,
         dependencies: null,
         $allTransitiveDependencies: null,
       );

  @override
  String debugGetCreateSourceHash() => _$hostEventPlanControllerHash();

  @override
  String toString() {
    return r'hostEventPlanControllerProvider'
        ''
        '($argument)';
  }

  @$internal
  @override
  $ProviderElement<HostEventPlanState> $createElement(
    $ProviderPointer pointer,
  ) => $ProviderElement(pointer);

  @override
  HostEventPlanState create(Ref ref) {
    final argument = this.argument as HostEventRequest;
    return hostEventPlanController(ref, argument);
  }

  /// {@macro riverpod.override_with_value}
  Override overrideWithValue(HostEventPlanState value) {
    return $ProviderOverride(
      origin: this,
      providerOverride: $SyncValueProvider<HostEventPlanState>(value),
    );
  }

  @override
  bool operator ==(Object other) {
    return other is HostEventPlanControllerProvider &&
        other.argument == argument;
  }

  @override
  int get hashCode {
    return argument.hashCode;
  }
}

String _$hostEventPlanControllerHash() =>
    r'bcbb05e7b7bf9446051e483b883deab78957c73f';

/// The plan screen, composed from the event and its plan listeners.

final class HostEventPlanControllerFamily extends $Family
    with $FunctionalFamilyOverride<HostEventPlanState, HostEventRequest> {
  HostEventPlanControllerFamily._()
    : super(
        retry: null,
        name: r'hostEventPlanControllerProvider',
        dependencies: null,
        $allTransitiveDependencies: null,
        isAutoDispose: true,
      );

  /// The plan screen, composed from the event and its plan listeners.

  HostEventPlanControllerProvider call(HostEventRequest request) =>
      HostEventPlanControllerProvider._(argument: request, from: this);

  @override
  String toString() => r'hostEventPlanControllerProvider';
}
