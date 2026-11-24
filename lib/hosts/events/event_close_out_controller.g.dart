// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'event_close_out_controller.dart';

// **************************************************************************
// RiverpodGenerator
// **************************************************************************

// GENERATED CODE - DO NOT MODIFY BY HAND
// ignore_for_file: type=lint, type=warning
/// Close-out, composed from the event, its attendee listeners, the
/// attendance report listener and the close-out listener: who came, who was
/// booked, who nobody checked in, who is recorded as not coming and the
/// after-closing choices already saved.

@ProviderFor(hostEventCloseOutController)
final hostEventCloseOutControllerProvider =
    HostEventCloseOutControllerFamily._();

/// Close-out, composed from the event, its attendee listeners, the
/// attendance report listener and the close-out listener: who came, who was
/// booked, who nobody checked in, who is recorded as not coming and the
/// after-closing choices already saved.

final class HostEventCloseOutControllerProvider
    extends
        $FunctionalProvider<
          HostEventCloseOutState,
          HostEventCloseOutState,
          HostEventCloseOutState
        >
    with $Provider<HostEventCloseOutState> {
  /// Close-out, composed from the event, its attendee listeners, the
  /// attendance report listener and the close-out listener: who came, who was
  /// booked, who nobody checked in, who is recorded as not coming and the
  /// after-closing choices already saved.
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
    r'342527dc2c591923025ec9e7e0ec71ab87fae375';

/// Close-out, composed from the event, its attendee listeners, the
/// attendance report listener and the close-out listener: who came, who was
/// booked, who nobody checked in, who is recorded as not coming and the
/// after-closing choices already saved.

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

  /// Close-out, composed from the event, its attendee listeners, the
  /// attendance report listener and the close-out listener: who came, who was
  /// booked, who nobody checked in, who is recorded as not coming and the
  /// after-closing choices already saved.

  HostEventCloseOutControllerProvider call(HostEventRequest request) =>
      HostEventCloseOutControllerProvider._(argument: request, from: this);

  @override
  String toString() => r'hostEventCloseOutControllerProvider';
}
