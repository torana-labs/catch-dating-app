// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'event_recap_controller.dart';

// **************************************************************************
// RiverpodGenerator
// **************************************************************************

// GENERATED CODE - DO NOT MODIFY BY HAND
// ignore_for_file: type=lint, type=warning
/// The after-event screen's two writes: picking someone you'd like to see
/// again, and the private rating.

@ProviderFor(EventRecapController)
final eventRecapControllerProvider = EventRecapControllerProvider._();

/// The after-event screen's two writes: picking someone you'd like to see
/// again, and the private rating.
final class EventRecapControllerProvider
    extends $NotifierProvider<EventRecapController, void> {
  /// The after-event screen's two writes: picking someone you'd like to see
  /// again, and the private rating.
  EventRecapControllerProvider._()
    : super(
        from: null,
        argument: null,
        retry: null,
        name: r'eventRecapControllerProvider',
        isAutoDispose: true,
        dependencies: null,
        $allTransitiveDependencies: null,
      );

  @override
  String debugGetCreateSourceHash() => _$eventRecapControllerHash();

  @$internal
  @override
  EventRecapController create() => EventRecapController();

  /// {@macro riverpod.override_with_value}
  Override overrideWithValue(void value) {
    return $ProviderOverride(
      origin: this,
      providerOverride: $SyncValueProvider<void>(value),
    );
  }
}

String _$eventRecapControllerHash() =>
    r'f83a8b93c792a2ee261d0a20debec14087104264';

/// The after-event screen's two writes: picking someone you'd like to see
/// again, and the private rating.

abstract class _$EventRecapController extends $Notifier<void> {
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
