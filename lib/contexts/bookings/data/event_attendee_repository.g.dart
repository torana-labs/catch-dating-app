// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'event_attendee_repository.dart';

// **************************************************************************
// RiverpodGenerator
// **************************************************************************

// GENERATED CODE - DO NOT MODIFY BY HAND
// ignore_for_file: type=lint, type=warning

@ProviderFor(eventAttendeeRepository)
final eventAttendeeRepositoryProvider = EventAttendeeRepositoryProvider._();

final class EventAttendeeRepositoryProvider
    extends
        $FunctionalProvider<
          EventAttendeeRepository,
          EventAttendeeRepository,
          EventAttendeeRepository
        >
    with $Provider<EventAttendeeRepository> {
  EventAttendeeRepositoryProvider._()
    : super(
        from: null,
        argument: null,
        retry: null,
        name: r'eventAttendeeRepositoryProvider',
        isAutoDispose: false,
        dependencies: null,
        $allTransitiveDependencies: null,
      );

  @override
  String debugGetCreateSourceHash() => _$eventAttendeeRepositoryHash();

  @$internal
  @override
  $ProviderElement<EventAttendeeRepository> $createElement(
    $ProviderPointer pointer,
  ) => $ProviderElement(pointer);

  @override
  EventAttendeeRepository create(Ref ref) {
    return eventAttendeeRepository(ref);
  }

  /// {@macro riverpod.override_with_value}
  Override overrideWithValue(EventAttendeeRepository value) {
    return $ProviderOverride(
      origin: this,
      providerOverride: $SyncValueProvider<EventAttendeeRepository>(value),
    );
  }
}

String _$eventAttendeeRepositoryHash() =>
    r'ecf94c0ceb96baf99c17f04e9ed619d79834c95d';

@ProviderFor(watchEventAttendees)
final watchEventAttendeesProvider = WatchEventAttendeesFamily._();

final class WatchEventAttendeesProvider
    extends
        $FunctionalProvider<
          AsyncValue<List<EventAttendee>>,
          List<EventAttendee>,
          Stream<List<EventAttendee>>
        >
    with
        $FutureModifier<List<EventAttendee>>,
        $StreamProvider<List<EventAttendee>> {
  WatchEventAttendeesProvider._({
    required WatchEventAttendeesFamily super.from,
    required String super.argument,
  }) : super(
         retry: null,
         name: r'watchEventAttendeesProvider',
         isAutoDispose: true,
         dependencies: null,
         $allTransitiveDependencies: null,
       );

  @override
  String debugGetCreateSourceHash() => _$watchEventAttendeesHash();

  @override
  String toString() {
    return r'watchEventAttendeesProvider'
        ''
        '($argument)';
  }

  @$internal
  @override
  $StreamProviderElement<List<EventAttendee>> $createElement(
    $ProviderPointer pointer,
  ) => $StreamProviderElement(pointer);

  @override
  Stream<List<EventAttendee>> create(Ref ref) {
    final argument = this.argument as String;
    return watchEventAttendees(ref, argument);
  }

  @override
  bool operator ==(Object other) {
    return other is WatchEventAttendeesProvider && other.argument == argument;
  }

  @override
  int get hashCode {
    return argument.hashCode;
  }
}

String _$watchEventAttendeesHash() =>
    r'6ef92f7090385bb7cfe0b6243a8f73ce7de6f49e';

final class WatchEventAttendeesFamily extends $Family
    with $FunctionalFamilyOverride<Stream<List<EventAttendee>>, String> {
  WatchEventAttendeesFamily._()
    : super(
        retry: null,
        name: r'watchEventAttendeesProvider',
        dependencies: null,
        $allTransitiveDependencies: null,
        isAutoDispose: true,
      );

  WatchEventAttendeesProvider call(String eventId) =>
      WatchEventAttendeesProvider._(argument: eventId, from: this);

  @override
  String toString() => r'watchEventAttendeesProvider';
}
