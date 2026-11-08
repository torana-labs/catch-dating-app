// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'formats_pods_controller.dart';

// **************************************************************************
// RiverpodGenerator
// **************************************************************************

// GENERATED CODE - DO NOT MODIFY BY HAND
// ignore_for_file: type=lint, type=warning
/// Pace pods, composed from listeners only: the guest list, and for each
/// runner booked the membership view that says which pod they are in
/// (`event_assistance_membership_repository.watch`). The pods themselves
/// are the route's pace groups.

@ProviderFor(hostFormatsPodsController)
final hostFormatsPodsControllerProvider = HostFormatsPodsControllerFamily._();

/// Pace pods, composed from listeners only: the guest list, and for each
/// runner booked the membership view that says which pod they are in
/// (`event_assistance_membership_repository.watch`). The pods themselves
/// are the route's pace groups.

final class HostFormatsPodsControllerProvider
    extends
        $FunctionalProvider<
          HostFormatsPodsState,
          HostFormatsPodsState,
          HostFormatsPodsState
        >
    with $Provider<HostFormatsPodsState> {
  /// Pace pods, composed from listeners only: the guest list, and for each
  /// runner booked the membership view that says which pod they are in
  /// (`event_assistance_membership_repository.watch`). The pods themselves
  /// are the route's pace groups.
  HostFormatsPodsControllerProvider._({
    required HostFormatsPodsControllerFamily super.from,
    required Event super.argument,
  }) : super(
         retry: null,
         name: r'hostFormatsPodsControllerProvider',
         isAutoDispose: true,
         dependencies: null,
         $allTransitiveDependencies: null,
       );

  @override
  String debugGetCreateSourceHash() => _$hostFormatsPodsControllerHash();

  @override
  String toString() {
    return r'hostFormatsPodsControllerProvider'
        ''
        '($argument)';
  }

  @$internal
  @override
  $ProviderElement<HostFormatsPodsState> $createElement(
    $ProviderPointer pointer,
  ) => $ProviderElement(pointer);

  @override
  HostFormatsPodsState create(Ref ref) {
    final argument = this.argument as Event;
    return hostFormatsPodsController(ref, argument);
  }

  /// {@macro riverpod.override_with_value}
  Override overrideWithValue(HostFormatsPodsState value) {
    return $ProviderOverride(
      origin: this,
      providerOverride: $SyncValueProvider<HostFormatsPodsState>(value),
    );
  }

  @override
  bool operator ==(Object other) {
    return other is HostFormatsPodsControllerProvider &&
        other.argument == argument;
  }

  @override
  int get hashCode {
    return argument.hashCode;
  }
}

String _$hostFormatsPodsControllerHash() =>
    r'bf52c8d13bde932acad53939f347bbbebd4eff4c';

/// Pace pods, composed from listeners only: the guest list, and for each
/// runner booked the membership view that says which pod they are in
/// (`event_assistance_membership_repository.watch`). The pods themselves
/// are the route's pace groups.

final class HostFormatsPodsControllerFamily extends $Family
    with $FunctionalFamilyOverride<HostFormatsPodsState, Event> {
  HostFormatsPodsControllerFamily._()
    : super(
        retry: null,
        name: r'hostFormatsPodsControllerProvider',
        dependencies: null,
        $allTransitiveDependencies: null,
        isAutoDispose: true,
      );

  /// Pace pods, composed from listeners only: the guest list, and for each
  /// runner booked the membership view that says which pod they are in
  /// (`event_assistance_membership_repository.watch`). The pods themselves
  /// are the route's pace groups.

  HostFormatsPodsControllerProvider call(Event event) =>
      HostFormatsPodsControllerProvider._(argument: event, from: this);

  @override
  String toString() => r'hostFormatsPodsControllerProvider';
}
