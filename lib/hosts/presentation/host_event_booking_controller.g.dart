// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'host_event_booking_controller.dart';

// **************************************************************************
// RiverpodGenerator
// **************************************************************************

// GENERATED CODE - DO NOT MODIFY BY HAND
// ignore_for_file: type=lint, type=warning

@ProviderFor(HostEventBookingController)
final hostEventBookingControllerProvider =
    HostEventBookingControllerProvider._();

final class HostEventBookingControllerProvider
    extends $NotifierProvider<HostEventBookingController, void> {
  HostEventBookingControllerProvider._()
    : super(
        from: null,
        argument: null,
        retry: null,
        name: r'hostEventBookingControllerProvider',
        isAutoDispose: true,
        dependencies: null,
        $allTransitiveDependencies: null,
      );

  @override
  String debugGetCreateSourceHash() => _$hostEventBookingControllerHash();

  @$internal
  @override
  HostEventBookingController create() => HostEventBookingController();

  /// {@macro riverpod.override_with_value}
  Override overrideWithValue(void value) {
    return $ProviderOverride(
      origin: this,
      providerOverride: $SyncValueProvider<void>(value),
    );
  }
}

String _$hostEventBookingControllerHash() =>
    r'a3ad880895581aa3bb65b649baf9bd0d46a55407';

abstract class _$HostEventBookingController extends $Notifier<void> {
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
