// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'event_staff_presence_repository.dart';

// **************************************************************************
// RiverpodGenerator
// **************************************************************************

// GENERATED CODE - DO NOT MODIFY BY HAND
// ignore_for_file: type=lint, type=warning

@ProviderFor(eventStaffPresenceRepository)
final eventStaffPresenceRepositoryProvider =
    EventStaffPresenceRepositoryProvider._();

final class EventStaffPresenceRepositoryProvider
    extends
        $FunctionalProvider<
          EventStaffPresenceRepository,
          EventStaffPresenceRepository,
          EventStaffPresenceRepository
        >
    with $Provider<EventStaffPresenceRepository> {
  EventStaffPresenceRepositoryProvider._()
    : super(
        from: null,
        argument: null,
        retry: null,
        name: r'eventStaffPresenceRepositoryProvider',
        isAutoDispose: false,
        dependencies: null,
        $allTransitiveDependencies: null,
      );

  @override
  String debugGetCreateSourceHash() => _$eventStaffPresenceRepositoryHash();

  @$internal
  @override
  $ProviderElement<EventStaffPresenceRepository> $createElement(
    $ProviderPointer pointer,
  ) => $ProviderElement(pointer);

  @override
  EventStaffPresenceRepository create(Ref ref) {
    return eventStaffPresenceRepository(ref);
  }

  /// {@macro riverpod.override_with_value}
  Override overrideWithValue(EventStaffPresenceRepository value) {
    return $ProviderOverride(
      origin: this,
      providerOverride: $SyncValueProvider<EventStaffPresenceRepository>(value),
    );
  }
}

String _$eventStaffPresenceRepositoryHash() =>
    r'f1ce4cc0b840832a149f661ba36210fe8b1d2ca3';

@ProviderFor(watchEventStaffPresence)
final watchEventStaffPresenceProvider = WatchEventStaffPresenceFamily._();

final class WatchEventStaffPresenceProvider
    extends
        $FunctionalProvider<
          AsyncValue<List<EventStaffPresence>>,
          List<EventStaffPresence>,
          Stream<List<EventStaffPresence>>
        >
    with
        $FutureModifier<List<EventStaffPresence>>,
        $StreamProvider<List<EventStaffPresence>> {
  WatchEventStaffPresenceProvider._({
    required WatchEventStaffPresenceFamily super.from,
    required String super.argument,
  }) : super(
         retry: null,
         name: r'watchEventStaffPresenceProvider',
         isAutoDispose: true,
         dependencies: null,
         $allTransitiveDependencies: null,
       );

  @override
  String debugGetCreateSourceHash() => _$watchEventStaffPresenceHash();

  @override
  String toString() {
    return r'watchEventStaffPresenceProvider'
        ''
        '($argument)';
  }

  @$internal
  @override
  $StreamProviderElement<List<EventStaffPresence>> $createElement(
    $ProviderPointer pointer,
  ) => $StreamProviderElement(pointer);

  @override
  Stream<List<EventStaffPresence>> create(Ref ref) {
    final argument = this.argument as String;
    return watchEventStaffPresence(ref, argument);
  }

  @override
  bool operator ==(Object other) {
    return other is WatchEventStaffPresenceProvider &&
        other.argument == argument;
  }

  @override
  int get hashCode {
    return argument.hashCode;
  }
}

String _$watchEventStaffPresenceHash() =>
    r'fd41de8f23a544b03b22c49e2cba9346fc1b97db';

final class WatchEventStaffPresenceFamily extends $Family
    with $FunctionalFamilyOverride<Stream<List<EventStaffPresence>>, String> {
  WatchEventStaffPresenceFamily._()
    : super(
        retry: null,
        name: r'watchEventStaffPresenceProvider',
        dependencies: null,
        $allTransitiveDependencies: null,
        isAutoDispose: true,
      );

  WatchEventStaffPresenceProvider call(String eventId) =>
      WatchEventStaffPresenceProvider._(argument: eventId, from: this);

  @override
  String toString() => r'watchEventStaffPresenceProvider';
}
