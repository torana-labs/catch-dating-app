// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'event_detail_controller.dart';

// **************************************************************************
// RiverpodGenerator
// **************************************************************************

// GENERATED CODE - DO NOT MODIFY BY HAND
// ignore_for_file: type=lint, type=warning
/// **Pattern A: Action controller + static Mutations**
///
/// Owns event-detail side effects that are not booking operations.

@ProviderFor(EventDetailController)
final eventDetailControllerProvider = EventDetailControllerProvider._();

/// **Pattern A: Action controller + static Mutations**
///
/// Owns event-detail side effects that are not booking operations.
final class EventDetailControllerProvider
    extends $NotifierProvider<EventDetailController, void> {
  /// **Pattern A: Action controller + static Mutations**
  ///
  /// Owns event-detail side effects that are not booking operations.
  EventDetailControllerProvider._()
    : super(
        from: null,
        argument: null,
        retry: null,
        name: r'eventDetailControllerProvider',
        isAutoDispose: true,
        dependencies: null,
        $allTransitiveDependencies: null,
      );

  @override
  String debugGetCreateSourceHash() => _$eventDetailControllerHash();

  @$internal
  @override
  EventDetailController create() => EventDetailController();

  /// {@macro riverpod.override_with_value}
  Override overrideWithValue(void value) {
    return $ProviderOverride(
      origin: this,
      providerOverride: $SyncValueProvider<void>(value),
    );
  }
}

String _$eventDetailControllerHash() =>
    r'30262f686303292ba2c780a2ca9be33f66330be7';

/// **Pattern A: Action controller + static Mutations**
///
/// Owns event-detail side effects that are not booking operations.

abstract class _$EventDetailController extends $Notifier<void> {
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
