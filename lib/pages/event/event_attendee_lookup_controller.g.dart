// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'event_attendee_lookup_controller.dart';

// **************************************************************************
// RiverpodGenerator
// **************************************************************************

// GENERATED CODE - DO NOT MODIFY BY HAND
// ignore_for_file: type=lint, type=warning

@ProviderFor(eventAttendeeLookup)
final eventAttendeeLookupProvider = EventAttendeeLookupProvider._();

final class EventAttendeeLookupProvider
    extends
        $FunctionalProvider<
          EventAttendeeLookup,
          EventAttendeeLookup,
          EventAttendeeLookup
        >
    with $Provider<EventAttendeeLookup> {
  EventAttendeeLookupProvider._()
    : super(
        from: null,
        argument: null,
        retry: null,
        name: r'eventAttendeeLookupProvider',
        isAutoDispose: true,
        dependencies: null,
        $allTransitiveDependencies: null,
      );

  @override
  String debugGetCreateSourceHash() => _$eventAttendeeLookupHash();

  @$internal
  @override
  $ProviderElement<EventAttendeeLookup> $createElement(
    $ProviderPointer pointer,
  ) => $ProviderElement(pointer);

  @override
  EventAttendeeLookup create(Ref ref) {
    return eventAttendeeLookup(ref);
  }

  /// {@macro riverpod.override_with_value}
  Override overrideWithValue(EventAttendeeLookup value) {
    return $ProviderOverride(
      origin: this,
      providerOverride: $SyncValueProvider<EventAttendeeLookup>(value),
    );
  }
}

String _$eventAttendeeLookupHash() =>
    r'db25ad4e4d15c20121fa555dcfb790feb51e6b6c';
