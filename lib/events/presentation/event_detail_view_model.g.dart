// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'event_detail_view_model.dart';

// **************************************************************************
// RiverpodGenerator
// **************************************************************************

// GENERATED CODE - DO NOT MODIFY BY HAND
// ignore_for_file: type=lint, type=warning
/// **Pattern D: View-model provider**
///
/// Watches several stream/future providers and combines them into one
/// [AsyncValue] via [buildEventDetailViewModel]. Each input is individually
/// checked for loading/error so the combined result is [AsyncError] if any
/// input fails or [AsyncLoading] if any input is still loading.
///
/// **When to use this pattern:** Screens that need data from multiple
/// independent sources and want a single `.when(loading:error:data:)` call
/// instead of managing multiple async states.

@ProviderFor(eventDetailViewModel)
final eventDetailViewModelProvider = EventDetailViewModelFamily._();

/// **Pattern D: View-model provider**
///
/// Watches several stream/future providers and combines them into one
/// [AsyncValue] via [buildEventDetailViewModel]. Each input is individually
/// checked for loading/error so the combined result is [AsyncError] if any
/// input fails or [AsyncLoading] if any input is still loading.
///
/// **When to use this pattern:** Screens that need data from multiple
/// independent sources and want a single `.when(loading:error:data:)` call
/// instead of managing multiple async states.

final class EventDetailViewModelProvider
    extends
        $FunctionalProvider<
          AsyncValue<EventDetailViewModel?>,
          AsyncValue<EventDetailViewModel?>,
          AsyncValue<EventDetailViewModel?>
        >
    with $Provider<AsyncValue<EventDetailViewModel?>> {
  /// **Pattern D: View-model provider**
  ///
  /// Watches several stream/future providers and combines them into one
  /// [AsyncValue] via [buildEventDetailViewModel]. Each input is individually
  /// checked for loading/error so the combined result is [AsyncError] if any
  /// input fails or [AsyncLoading] if any input is still loading.
  ///
  /// **When to use this pattern:** Screens that need data from multiple
  /// independent sources and want a single `.when(loading:error:data:)` call
  /// instead of managing multiple async states.
  EventDetailViewModelProvider._({
    required EventDetailViewModelFamily super.from,
    required String super.argument,
  }) : super(
         retry: null,
         name: r'eventDetailViewModelProvider',
         isAutoDispose: true,
         dependencies: null,
         $allTransitiveDependencies: null,
       );

  @override
  String debugGetCreateSourceHash() => _$eventDetailViewModelHash();

  @override
  String toString() {
    return r'eventDetailViewModelProvider'
        ''
        '($argument)';
  }

  @$internal
  @override
  $ProviderElement<AsyncValue<EventDetailViewModel?>> $createElement(
    $ProviderPointer pointer,
  ) => $ProviderElement(pointer);

  @override
  AsyncValue<EventDetailViewModel?> create(Ref ref) {
    final argument = this.argument as String;
    return eventDetailViewModel(ref, argument);
  }

  /// {@macro riverpod.override_with_value}
  Override overrideWithValue(AsyncValue<EventDetailViewModel?> value) {
    return $ProviderOverride(
      origin: this,
      providerOverride: $SyncValueProvider<AsyncValue<EventDetailViewModel?>>(
        value,
      ),
    );
  }

  @override
  bool operator ==(Object other) {
    return other is EventDetailViewModelProvider && other.argument == argument;
  }

  @override
  int get hashCode {
    return argument.hashCode;
  }
}

String _$eventDetailViewModelHash() =>
    r'f11131dd8ca1b9e62ed9067fbfa8a3b6e1849d3c';

/// **Pattern D: View-model provider**
///
/// Watches several stream/future providers and combines them into one
/// [AsyncValue] via [buildEventDetailViewModel]. Each input is individually
/// checked for loading/error so the combined result is [AsyncError] if any
/// input fails or [AsyncLoading] if any input is still loading.
///
/// **When to use this pattern:** Screens that need data from multiple
/// independent sources and want a single `.when(loading:error:data:)` call
/// instead of managing multiple async states.

final class EventDetailViewModelFamily extends $Family
    with $FunctionalFamilyOverride<AsyncValue<EventDetailViewModel?>, String> {
  EventDetailViewModelFamily._()
    : super(
        retry: null,
        name: r'eventDetailViewModelProvider',
        dependencies: null,
        $allTransitiveDependencies: null,
        isAutoDispose: true,
      );

  /// **Pattern D: View-model provider**
  ///
  /// Watches several stream/future providers and combines them into one
  /// [AsyncValue] via [buildEventDetailViewModel]. Each input is individually
  /// checked for loading/error so the combined result is [AsyncError] if any
  /// input fails or [AsyncLoading] if any input is still loading.
  ///
  /// **When to use this pattern:** Screens that need data from multiple
  /// independent sources and want a single `.when(loading:error:data:)` call
  /// instead of managing multiple async states.

  EventDetailViewModelProvider call(String eventId) =>
      EventDetailViewModelProvider._(argument: eventId, from: this);

  @override
  String toString() => r'eventDetailViewModelProvider';
}
