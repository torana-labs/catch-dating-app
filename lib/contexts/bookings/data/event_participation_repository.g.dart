// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'event_participation_repository.dart';

// **************************************************************************
// RiverpodGenerator
// **************************************************************************

// GENERATED CODE - DO NOT MODIFY BY HAND
// ignore_for_file: type=lint, type=warning

@ProviderFor(eventParticipationRepository)
final eventParticipationRepositoryProvider =
    EventParticipationRepositoryProvider._();

final class EventParticipationRepositoryProvider
    extends
        $FunctionalProvider<
          EventParticipationRepository,
          EventParticipationRepository,
          EventParticipationRepository
        >
    with $Provider<EventParticipationRepository> {
  EventParticipationRepositoryProvider._()
    : super(
        from: null,
        argument: null,
        retry: null,
        name: r'eventParticipationRepositoryProvider',
        isAutoDispose: false,
        dependencies: null,
        $allTransitiveDependencies: null,
      );

  @override
  String debugGetCreateSourceHash() => _$eventParticipationRepositoryHash();

  @$internal
  @override
  $ProviderElement<EventParticipationRepository> $createElement(
    $ProviderPointer pointer,
  ) => $ProviderElement(pointer);

  @override
  EventParticipationRepository create(Ref ref) {
    return eventParticipationRepository(ref);
  }

  /// {@macro riverpod.override_with_value}
  Override overrideWithValue(EventParticipationRepository value) {
    return $ProviderOverride(
      origin: this,
      providerOverride: $SyncValueProvider<EventParticipationRepository>(value),
    );
  }
}

String _$eventParticipationRepositoryHash() =>
    r'ab518831dbeeaec7a287cd3b8809b3e86fca2987';

@ProviderFor(watchEventParticipationsForUser)
final watchEventParticipationsForUserProvider =
    WatchEventParticipationsForUserFamily._();

final class WatchEventParticipationsForUserProvider
    extends
        $FunctionalProvider<
          AsyncValue<List<EventParticipation>>,
          List<EventParticipation>,
          Stream<List<EventParticipation>>
        >
    with
        $FutureModifier<List<EventParticipation>>,
        $StreamProvider<List<EventParticipation>> {
  WatchEventParticipationsForUserProvider._({
    required WatchEventParticipationsForUserFamily super.from,
    required String super.argument,
  }) : super(
         retry: null,
         name: r'watchEventParticipationsForUserProvider',
         isAutoDispose: true,
         dependencies: null,
         $allTransitiveDependencies: null,
       );

  @override
  String debugGetCreateSourceHash() => _$watchEventParticipationsForUserHash();

  @override
  String toString() {
    return r'watchEventParticipationsForUserProvider'
        ''
        '($argument)';
  }

  @$internal
  @override
  $StreamProviderElement<List<EventParticipation>> $createElement(
    $ProviderPointer pointer,
  ) => $StreamProviderElement(pointer);

  @override
  Stream<List<EventParticipation>> create(Ref ref) {
    final argument = this.argument as String;
    return watchEventParticipationsForUser(ref, argument);
  }

  @override
  bool operator ==(Object other) {
    return other is WatchEventParticipationsForUserProvider &&
        other.argument == argument;
  }

  @override
  int get hashCode {
    return argument.hashCode;
  }
}

String _$watchEventParticipationsForUserHash() =>
    r'1bf4f2be9dcacd252dd8c708a1a753efc0070400';

final class WatchEventParticipationsForUserFamily extends $Family
    with $FunctionalFamilyOverride<Stream<List<EventParticipation>>, String> {
  WatchEventParticipationsForUserFamily._()
    : super(
        retry: null,
        name: r'watchEventParticipationsForUserProvider',
        dependencies: null,
        $allTransitiveDependencies: null,
        isAutoDispose: true,
      );

  WatchEventParticipationsForUserProvider call(String uid) =>
      WatchEventParticipationsForUserProvider._(argument: uid, from: this);

  @override
  String toString() => r'watchEventParticipationsForUserProvider';
}

@ProviderFor(watchEventParticipationsForEvent)
final watchEventParticipationsForEventProvider =
    WatchEventParticipationsForEventFamily._();

final class WatchEventParticipationsForEventProvider
    extends
        $FunctionalProvider<
          AsyncValue<List<EventParticipation>>,
          List<EventParticipation>,
          Stream<List<EventParticipation>>
        >
    with
        $FutureModifier<List<EventParticipation>>,
        $StreamProvider<List<EventParticipation>> {
  WatchEventParticipationsForEventProvider._({
    required WatchEventParticipationsForEventFamily super.from,
    required String super.argument,
  }) : super(
         retry: null,
         name: r'watchEventParticipationsForEventProvider',
         isAutoDispose: true,
         dependencies: null,
         $allTransitiveDependencies: null,
       );

  @override
  String debugGetCreateSourceHash() => _$watchEventParticipationsForEventHash();

  @override
  String toString() {
    return r'watchEventParticipationsForEventProvider'
        ''
        '($argument)';
  }

  @$internal
  @override
  $StreamProviderElement<List<EventParticipation>> $createElement(
    $ProviderPointer pointer,
  ) => $StreamProviderElement(pointer);

  @override
  Stream<List<EventParticipation>> create(Ref ref) {
    final argument = this.argument as String;
    return watchEventParticipationsForEvent(ref, argument);
  }

  @override
  bool operator ==(Object other) {
    return other is WatchEventParticipationsForEventProvider &&
        other.argument == argument;
  }

  @override
  int get hashCode {
    return argument.hashCode;
  }
}

String _$watchEventParticipationsForEventHash() =>
    r'05fa694da0039b4ccb05592dbe2375d049a1df7d';

final class WatchEventParticipationsForEventFamily extends $Family
    with $FunctionalFamilyOverride<Stream<List<EventParticipation>>, String> {
  WatchEventParticipationsForEventFamily._()
    : super(
        retry: null,
        name: r'watchEventParticipationsForEventProvider',
        dependencies: null,
        $allTransitiveDependencies: null,
        isAutoDispose: true,
      );

  WatchEventParticipationsForEventProvider call(String eventId) =>
      WatchEventParticipationsForEventProvider._(argument: eventId, from: this);

  @override
  String toString() => r'watchEventParticipationsForEventProvider';
}

@ProviderFor(watchEventParticipationRoster)
final watchEventParticipationRosterProvider =
    WatchEventParticipationRosterFamily._();

final class WatchEventParticipationRosterProvider
    extends
        $FunctionalProvider<
          AsyncValue<EventParticipationRoster>,
          EventParticipationRoster,
          Stream<EventParticipationRoster>
        >
    with
        $FutureModifier<EventParticipationRoster>,
        $StreamProvider<EventParticipationRoster> {
  WatchEventParticipationRosterProvider._({
    required WatchEventParticipationRosterFamily super.from,
    required String super.argument,
  }) : super(
         retry: null,
         name: r'watchEventParticipationRosterProvider',
         isAutoDispose: true,
         dependencies: null,
         $allTransitiveDependencies: null,
       );

  @override
  String debugGetCreateSourceHash() => _$watchEventParticipationRosterHash();

  @override
  String toString() {
    return r'watchEventParticipationRosterProvider'
        ''
        '($argument)';
  }

  @$internal
  @override
  $StreamProviderElement<EventParticipationRoster> $createElement(
    $ProviderPointer pointer,
  ) => $StreamProviderElement(pointer);

  @override
  Stream<EventParticipationRoster> create(Ref ref) {
    final argument = this.argument as String;
    return watchEventParticipationRoster(ref, argument);
  }

  @override
  bool operator ==(Object other) {
    return other is WatchEventParticipationRosterProvider &&
        other.argument == argument;
  }

  @override
  int get hashCode {
    return argument.hashCode;
  }
}

String _$watchEventParticipationRosterHash() =>
    r'06c926b0bfa5fd919e820416cba78a5540761ef9';

final class WatchEventParticipationRosterFamily extends $Family
    with $FunctionalFamilyOverride<Stream<EventParticipationRoster>, String> {
  WatchEventParticipationRosterFamily._()
    : super(
        retry: null,
        name: r'watchEventParticipationRosterProvider',
        dependencies: null,
        $allTransitiveDependencies: null,
        isAutoDispose: true,
      );

  WatchEventParticipationRosterProvider call(String eventId) =>
      WatchEventParticipationRosterProvider._(argument: eventId, from: this);

  @override
  String toString() => r'watchEventParticipationRosterProvider';
}

@ProviderFor(watchEventParticipation)
final watchEventParticipationProvider = WatchEventParticipationFamily._();

final class WatchEventParticipationProvider
    extends
        $FunctionalProvider<
          AsyncValue<EventParticipation?>,
          EventParticipation?,
          Stream<EventParticipation?>
        >
    with
        $FutureModifier<EventParticipation?>,
        $StreamProvider<EventParticipation?> {
  WatchEventParticipationProvider._({
    required WatchEventParticipationFamily super.from,
    required (String, String) super.argument,
  }) : super(
         retry: null,
         name: r'watchEventParticipationProvider',
         isAutoDispose: true,
         dependencies: null,
         $allTransitiveDependencies: null,
       );

  @override
  String debugGetCreateSourceHash() => _$watchEventParticipationHash();

  @override
  String toString() {
    return r'watchEventParticipationProvider'
        ''
        '$argument';
  }

  @$internal
  @override
  $StreamProviderElement<EventParticipation?> $createElement(
    $ProviderPointer pointer,
  ) => $StreamProviderElement(pointer);

  @override
  Stream<EventParticipation?> create(Ref ref) {
    final argument = this.argument as (String, String);
    return watchEventParticipation(ref, argument.$1, argument.$2);
  }

  @override
  bool operator ==(Object other) {
    return other is WatchEventParticipationProvider &&
        other.argument == argument;
  }

  @override
  int get hashCode {
    return argument.hashCode;
  }
}

String _$watchEventParticipationHash() =>
    r'f13db8555822d7a50eff4f37a356b6956bb80092';

final class WatchEventParticipationFamily extends $Family
    with
        $FunctionalFamilyOverride<
          Stream<EventParticipation?>,
          (String, String)
        > {
  WatchEventParticipationFamily._()
    : super(
        retry: null,
        name: r'watchEventParticipationProvider',
        dependencies: null,
        $allTransitiveDependencies: null,
        isAutoDispose: true,
      );

  WatchEventParticipationProvider call(String eventId, String uid) =>
      WatchEventParticipationProvider._(argument: (eventId, uid), from: this);

  @override
  String toString() => r'watchEventParticipationProvider';
}
