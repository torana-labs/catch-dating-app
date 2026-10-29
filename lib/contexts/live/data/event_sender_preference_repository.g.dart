// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'event_sender_preference_repository.dart';

// **************************************************************************
// RiverpodGenerator
// **************************************************************************

// GENERATED CODE - DO NOT MODIFY BY HAND
// ignore_for_file: type=lint, type=warning

@ProviderFor(eventSenderPreferenceRepository)
final eventSenderPreferenceRepositoryProvider =
    EventSenderPreferenceRepositoryProvider._();

final class EventSenderPreferenceRepositoryProvider
    extends
        $FunctionalProvider<
          EventSenderPreferenceRepository,
          EventSenderPreferenceRepository,
          EventSenderPreferenceRepository
        >
    with $Provider<EventSenderPreferenceRepository> {
  EventSenderPreferenceRepositoryProvider._()
    : super(
        from: null,
        argument: null,
        retry: null,
        name: r'eventSenderPreferenceRepositoryProvider',
        isAutoDispose: true,
        dependencies: null,
        $allTransitiveDependencies: null,
      );

  @override
  String debugGetCreateSourceHash() => _$eventSenderPreferenceRepositoryHash();

  @$internal
  @override
  $ProviderElement<EventSenderPreferenceRepository> $createElement(
    $ProviderPointer pointer,
  ) => $ProviderElement(pointer);

  @override
  EventSenderPreferenceRepository create(Ref ref) {
    return eventSenderPreferenceRepository(ref);
  }

  /// {@macro riverpod.override_with_value}
  Override overrideWithValue(EventSenderPreferenceRepository value) {
    return $ProviderOverride(
      origin: this,
      providerOverride: $SyncValueProvider<EventSenderPreferenceRepository>(
        value,
      ),
    );
  }
}

String _$eventSenderPreferenceRepositoryHash() =>
    r'7880abf207b6152e9b9f5abc1640963158b370a4';
