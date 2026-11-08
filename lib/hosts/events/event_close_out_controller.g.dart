// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'event_close_out_controller.dart';

// **************************************************************************
// RiverpodGenerator
// **************************************************************************

// GENERATED CODE - DO NOT MODIFY BY HAND
// ignore_for_file: type=lint, type=warning
/// Close-out, composed from the event and its attendee listeners: who
/// came, who was booked and who nobody checked in.

@ProviderFor(hostEventCloseOutController)
final hostEventCloseOutControllerProvider =
    HostEventCloseOutControllerFamily._();

/// Close-out, composed from the event and its attendee listeners: who
/// came, who was booked and who nobody checked in.

final class HostEventCloseOutControllerProvider
    extends
        $FunctionalProvider<
          HostEventCloseOutState,
          HostEventCloseOutState,
          HostEventCloseOutState
        >
    with $Provider<HostEventCloseOutState> {
  /// Close-out, composed from the event and its attendee listeners: who
  /// came, who was booked and who nobody checked in.
  HostEventCloseOutControllerProvider._({
    required HostEventCloseOutControllerFamily super.from,
    required HostEventRequest super.argument,
  }) : super(
         retry: null,
         name: r'hostEventCloseOutControllerProvider',
         isAutoDispose: true,
         dependencies: null,
         $allTransitiveDependencies: null,
       );

  @override
  String debugGetCreateSourceHash() => _$hostEventCloseOutControllerHash();

  @override
  String toString() {
    return r'hostEventCloseOutControllerProvider'
        ''
        '($argument)';
  }

  @$internal
  @override
  $ProviderElement<HostEventCloseOutState> $createElement(
    $ProviderPointer pointer,
  ) => $ProviderElement(pointer);

  @override
  HostEventCloseOutState create(Ref ref) {
    final argument = this.argument as HostEventRequest;
    return hostEventCloseOutController(ref, argument);
  }

  /// {@macro riverpod.override_with_value}
  Override overrideWithValue(HostEventCloseOutState value) {
    return $ProviderOverride(
      origin: this,
      providerOverride: $SyncValueProvider<HostEventCloseOutState>(value),
    );
  }

  @override
  bool operator ==(Object other) {
    return other is HostEventCloseOutControllerProvider &&
        other.argument == argument;
  }

  @override
  int get hashCode {
    return argument.hashCode;
  }
}

String _$hostEventCloseOutControllerHash() =>
    r'c289b545a22658b91e5405dfa1a62df877d0182f';

/// Close-out, composed from the event and its attendee listeners: who
/// came, who was booked and who nobody checked in.

final class HostEventCloseOutControllerFamily extends $Family
    with $FunctionalFamilyOverride<HostEventCloseOutState, HostEventRequest> {
  HostEventCloseOutControllerFamily._()
    : super(
        retry: null,
        name: r'hostEventCloseOutControllerProvider',
        dependencies: null,
        $allTransitiveDependencies: null,
        isAutoDispose: true,
      );

  /// Close-out, composed from the event and its attendee listeners: who
  /// came, who was booked and who nobody checked in.

  HostEventCloseOutControllerProvider call(HostEventRequest request) =>
      HostEventCloseOutControllerProvider._(argument: request, from: this);

  @override
  String toString() => r'hostEventCloseOutControllerProvider';
}
