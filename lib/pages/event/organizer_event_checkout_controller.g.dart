// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'organizer_event_checkout_controller.dart';

// **************************************************************************
// RiverpodGenerator
// **************************************************************************

// GENERATED CODE - DO NOT MODIFY BY HAND
// ignore_for_file: type=lint, type=warning
/// Action controller for organizer-routed paid bookings. The event dock runs
/// these through [EventBookingController]'s book and cancel mutations so the
/// booking UI keeps one pending and error state.

@ProviderFor(OrganizerEventCheckoutController)
final organizerEventCheckoutControllerProvider =
    OrganizerEventCheckoutControllerProvider._();

/// Action controller for organizer-routed paid bookings. The event dock runs
/// these through [EventBookingController]'s book and cancel mutations so the
/// booking UI keeps one pending and error state.
final class OrganizerEventCheckoutControllerProvider
    extends $NotifierProvider<OrganizerEventCheckoutController, void> {
  /// Action controller for organizer-routed paid bookings. The event dock runs
  /// these through [EventBookingController]'s book and cancel mutations so the
  /// booking UI keeps one pending and error state.
  OrganizerEventCheckoutControllerProvider._()
    : super(
        from: null,
        argument: null,
        retry: null,
        name: r'organizerEventCheckoutControllerProvider',
        isAutoDispose: true,
        dependencies: null,
        $allTransitiveDependencies: null,
      );

  @override
  String debugGetCreateSourceHash() => _$organizerEventCheckoutControllerHash();

  @$internal
  @override
  OrganizerEventCheckoutController create() =>
      OrganizerEventCheckoutController();

  /// {@macro riverpod.override_with_value}
  Override overrideWithValue(void value) {
    return $ProviderOverride(
      origin: this,
      providerOverride: $SyncValueProvider<void>(value),
    );
  }
}

String _$organizerEventCheckoutControllerHash() =>
    r'9e51dec1a3d4943aedec9ffe94a0794f1caff07a';

/// Action controller for organizer-routed paid bookings. The event dock runs
/// these through [EventBookingController]'s book and cancel mutations so the
/// booking UI keeps one pending and error state.

abstract class _$OrganizerEventCheckoutController extends $Notifier<void> {
  void build();
  @$mustCallSuper
  @override
  WhenComplete runBuild() {
    final ref = this.ref as $Ref<void, void>;
    final element =
        ref.element
            as $ClassProviderElement<
              AnyNotifier<void, void>,
              void,
              Object?,
              Object?
            >;
    return element.handleCreate(ref, build);
  }
}
