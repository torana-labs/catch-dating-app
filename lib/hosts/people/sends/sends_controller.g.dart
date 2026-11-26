// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'sends_controller.dart';

// **************************************************************************
// RiverpodGenerator
// **************************************************************************

// GENERATED CODE - DO NOT MODIFY BY HAND
// ignore_for_file: type=lint, type=warning
/// Sends, composed from the send history pages, the manual handoff pages,
/// the messaging setup, the follower update quota, and the organizer's
/// events and the announcement event's bookings.

@ProviderFor(hostSendsController)
final hostSendsControllerProvider = HostSendsControllerFamily._();

/// Sends, composed from the send history pages, the manual handoff pages,
/// the messaging setup, the follower update quota, and the organizer's
/// events and the announcement event's bookings.

final class HostSendsControllerProvider
    extends $FunctionalProvider<HostSendsState, HostSendsState, HostSendsState>
    with $Provider<HostSendsState> {
  /// Sends, composed from the send history pages, the manual handoff pages,
  /// the messaging setup, the follower update quota, and the organizer's
  /// events and the announcement event's bookings.
  HostSendsControllerProvider._({
    required HostSendsControllerFamily super.from,
    required HostSendsRequest super.argument,
  }) : super(
         retry: null,
         name: r'hostSendsControllerProvider',
         isAutoDispose: true,
         dependencies: null,
         $allTransitiveDependencies: null,
       );

  @override
  String debugGetCreateSourceHash() => _$hostSendsControllerHash();

  @override
  String toString() {
    return r'hostSendsControllerProvider'
        ''
        '($argument)';
  }

  @$internal
  @override
  $ProviderElement<HostSendsState> $createElement($ProviderPointer pointer) =>
      $ProviderElement(pointer);

  @override
  HostSendsState create(Ref ref) {
    final argument = this.argument as HostSendsRequest;
    return hostSendsController(ref, argument);
  }

  /// {@macro riverpod.override_with_value}
  Override overrideWithValue(HostSendsState value) {
    return $ProviderOverride(
      origin: this,
      providerOverride: $SyncValueProvider<HostSendsState>(value),
    );
  }

  @override
  bool operator ==(Object other) {
    return other is HostSendsControllerProvider && other.argument == argument;
  }

  @override
  int get hashCode {
    return argument.hashCode;
  }
}

String _$hostSendsControllerHash() =>
    r'70d771f9fb8b9b0130608169c6d7b837fa4f9553';

/// Sends, composed from the send history pages, the manual handoff pages,
/// the messaging setup, the follower update quota, and the organizer's
/// events and the announcement event's bookings.

final class HostSendsControllerFamily extends $Family
    with $FunctionalFamilyOverride<HostSendsState, HostSendsRequest> {
  HostSendsControllerFamily._()
    : super(
        retry: null,
        name: r'hostSendsControllerProvider',
        dependencies: null,
        $allTransitiveDependencies: null,
        isAutoDispose: true,
      );

  /// Sends, composed from the send history pages, the manual handoff pages,
  /// the messaging setup, the follower update quota, and the organizer's
  /// events and the announcement event's bookings.

  HostSendsControllerProvider call(HostSendsRequest request) =>
      HostSendsControllerProvider._(argument: request, from: this);

  @override
  String toString() => r'hostSendsControllerProvider';
}
