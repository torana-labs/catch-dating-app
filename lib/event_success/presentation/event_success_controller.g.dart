// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'event_success_controller.dart';

// **************************************************************************
// RiverpodGenerator
// **************************************************************************

// GENERATED CODE - DO NOT MODIFY BY HAND
// ignore_for_file: type=lint, type=warning

@ProviderFor(EventSuccessController)
final eventSuccessControllerProvider = EventSuccessControllerProvider._();

final class EventSuccessControllerProvider
    extends $NotifierProvider<EventSuccessController, void> {
  EventSuccessControllerProvider._()
    : super(
        from: null,
        argument: null,
        retry: null,
        name: r'eventSuccessControllerProvider',
        isAutoDispose: true,
        dependencies: null,
        $allTransitiveDependencies: null,
      );

  @override
  String debugGetCreateSourceHash() => _$eventSuccessControllerHash();

  @$internal
  @override
  EventSuccessController create() => EventSuccessController();

  /// {@macro riverpod.override_with_value}
  Override overrideWithValue(void value) {
    return $ProviderOverride(
      origin: this,
      providerOverride: $SyncValueProvider<void>(value),
    );
  }
}

String _$eventSuccessControllerHash() =>
    r'44f6df0e6e146288bea0895e95b210924b2b8d2d';

abstract class _$EventSuccessController extends $Notifier<void> {
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
