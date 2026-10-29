// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'event_sms_preference_repository.dart';

// **************************************************************************
// RiverpodGenerator
// **************************************************************************

// GENERATED CODE - DO NOT MODIFY BY HAND
// ignore_for_file: type=lint, type=warning

@ProviderFor(eventSmsPreferenceRepository)
final eventSmsPreferenceRepositoryProvider =
    EventSmsPreferenceRepositoryProvider._();

final class EventSmsPreferenceRepositoryProvider
    extends
        $FunctionalProvider<
          EventSmsPreferenceRepository,
          EventSmsPreferenceRepository,
          EventSmsPreferenceRepository
        >
    with $Provider<EventSmsPreferenceRepository> {
  EventSmsPreferenceRepositoryProvider._()
    : super(
        from: null,
        argument: null,
        retry: null,
        name: r'eventSmsPreferenceRepositoryProvider',
        isAutoDispose: true,
        dependencies: null,
        $allTransitiveDependencies: null,
      );

  @override
  String debugGetCreateSourceHash() => _$eventSmsPreferenceRepositoryHash();

  @$internal
  @override
  $ProviderElement<EventSmsPreferenceRepository> $createElement(
    $ProviderPointer pointer,
  ) => $ProviderElement(pointer);

  @override
  EventSmsPreferenceRepository create(Ref ref) {
    return eventSmsPreferenceRepository(ref);
  }

  /// {@macro riverpod.override_with_value}
  Override overrideWithValue(EventSmsPreferenceRepository value) {
    return $ProviderOverride(
      origin: this,
      providerOverride: $SyncValueProvider<EventSmsPreferenceRepository>(value),
    );
  }
}

String _$eventSmsPreferenceRepositoryHash() =>
    r'c682372edeee8f325372adb30d1e08569a6bce55';
