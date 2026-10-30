// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'event_map_view_model.dart';

// **************************************************************************
// RiverpodGenerator
// **************************************************************************

// GENERATED CODE - DO NOT MODIFY BY HAND
// ignore_for_file: type=lint, type=warning
/// Combines the current user's booked events and recommended events for the map.
///
/// The screen owns map selection and tile rendering. This provider owns the
/// feature data seam: profile lookup, event streams, recommendation fetch, merge,
/// de-duplication, chronological sort, and pin filtering.

@ProviderFor(eventMapViewModel)
final eventMapViewModelProvider = EventMapViewModelProvider._();

/// Combines the current user's booked events and recommended events for the map.
///
/// The screen owns map selection and tile rendering. This provider owns the
/// feature data seam: profile lookup, event streams, recommendation fetch, merge,
/// de-duplication, chronological sort, and pin filtering.

final class EventMapViewModelProvider
    extends
        $FunctionalProvider<
          AsyncValue<EventMapViewModel>,
          AsyncValue<EventMapViewModel>,
          AsyncValue<EventMapViewModel>
        >
    with $Provider<AsyncValue<EventMapViewModel>> {
  /// Combines the current user's booked events and recommended events for the map.
  ///
  /// The screen owns map selection and tile rendering. This provider owns the
  /// feature data seam: profile lookup, event streams, recommendation fetch, merge,
  /// de-duplication, chronological sort, and pin filtering.
  EventMapViewModelProvider._()
    : super(
        from: null,
        argument: null,
        retry: null,
        name: r'eventMapViewModelProvider',
        isAutoDispose: true,
        dependencies: null,
        $allTransitiveDependencies: null,
      );

  @override
  String debugGetCreateSourceHash() => _$eventMapViewModelHash();

  @$internal
  @override
  $ProviderElement<AsyncValue<EventMapViewModel>> $createElement(
    $ProviderPointer pointer,
  ) => $ProviderElement(pointer);

  @override
  AsyncValue<EventMapViewModel> create(Ref ref) {
    return eventMapViewModel(ref);
  }

  /// {@macro riverpod.override_with_value}
  Override overrideWithValue(AsyncValue<EventMapViewModel> value) {
    return $ProviderOverride(
      origin: this,
      providerOverride: $SyncValueProvider<AsyncValue<EventMapViewModel>>(
        value,
      ),
    );
  }
}

String _$eventMapViewModelHash() => r'89978b3f5d2de1bc8eda19f83efaa596cd3fe26a';
