// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'event_assistance_departure_controller.dart';

// **************************************************************************
// RiverpodGenerator
// **************************************************************************

// GENERATED CODE - DO NOT MODIFY BY HAND
// ignore_for_file: type=lint, type=warning

@ProviderFor(EventAssistanceDepartureController)
final eventAssistanceDepartureControllerProvider =
    EventAssistanceDepartureControllerProvider._();

final class EventAssistanceDepartureControllerProvider
    extends $NotifierProvider<EventAssistanceDepartureController, void> {
  EventAssistanceDepartureControllerProvider._()
    : super(
        from: null,
        argument: null,
        retry: null,
        name: r'eventAssistanceDepartureControllerProvider',
        isAutoDispose: true,
        dependencies: null,
        $allTransitiveDependencies: null,
      );

  @override
  String debugGetCreateSourceHash() =>
      _$eventAssistanceDepartureControllerHash();

  @$internal
  @override
  EventAssistanceDepartureController create() =>
      EventAssistanceDepartureController();

  /// {@macro riverpod.override_with_value}
  Override overrideWithValue(void value) {
    return $ProviderOverride(
      origin: this,
      providerOverride: $SyncValueProvider<void>(value),
    );
  }
}

String _$eventAssistanceDepartureControllerHash() =>
    r'c963242d11abce55d1c112b76b1482628d8b2d65';

abstract class _$EventAssistanceDepartureController extends $Notifier<void> {
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
