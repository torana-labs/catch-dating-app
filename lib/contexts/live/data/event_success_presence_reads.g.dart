// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'event_success_presence_reads.dart';

// **************************************************************************
// RiverpodGenerator
// **************************************************************************

// GENERATED CODE - DO NOT MODIFY BY HAND
// ignore_for_file: type=lint, type=warning

@ProviderFor(eventSuccessPresenceReads)
final eventSuccessPresenceReadsProvider = EventSuccessPresenceReadsProvider._();

final class EventSuccessPresenceReadsProvider
    extends
        $FunctionalProvider<
          EventSuccessPresenceReads,
          EventSuccessPresenceReads,
          EventSuccessPresenceReads
        >
    with $Provider<EventSuccessPresenceReads> {
  EventSuccessPresenceReadsProvider._()
    : super(
        from: null,
        argument: null,
        retry: null,
        name: r'eventSuccessPresenceReadsProvider',
        isAutoDispose: true,
        dependencies: null,
        $allTransitiveDependencies: null,
      );

  @override
  String debugGetCreateSourceHash() => _$eventSuccessPresenceReadsHash();

  @$internal
  @override
  $ProviderElement<EventSuccessPresenceReads> $createElement(
    $ProviderPointer pointer,
  ) => $ProviderElement(pointer);

  @override
  EventSuccessPresenceReads create(Ref ref) {
    return eventSuccessPresenceReads(ref);
  }

  /// {@macro riverpod.override_with_value}
  Override overrideWithValue(EventSuccessPresenceReads value) {
    return $ProviderOverride(
      origin: this,
      providerOverride: $SyncValueProvider<EventSuccessPresenceReads>(value),
    );
  }
}

String _$eventSuccessPresenceReadsHash() =>
    r'dc36bd3c62bf0b5bb9ce77107fb1b2a37911292d';

/// The room presence read owner. It is a Firestore listener: it declares no
/// cache tags or lifetime, and writes never invalidate it.

@ProviderFor(eventSuccessPresenceHeartbeats)
final eventSuccessPresenceHeartbeatsProvider =
    EventSuccessPresenceHeartbeatsFamily._();

/// The room presence read owner. It is a Firestore listener: it declares no
/// cache tags or lifetime, and writes never invalidate it.

final class EventSuccessPresenceHeartbeatsProvider
    extends
        $FunctionalProvider<
          AsyncValue<List<EventSuccessPresenceHeartbeatRow>>,
          List<EventSuccessPresenceHeartbeatRow>,
          Stream<List<EventSuccessPresenceHeartbeatRow>>
        >
    with
        $FutureModifier<List<EventSuccessPresenceHeartbeatRow>>,
        $StreamProvider<List<EventSuccessPresenceHeartbeatRow>> {
  /// The room presence read owner. It is a Firestore listener: it declares no
  /// cache tags or lifetime, and writes never invalidate it.
  EventSuccessPresenceHeartbeatsProvider._({
    required EventSuccessPresenceHeartbeatsFamily super.from,
    required ({String organizerId, String eventId}) super.argument,
  }) : super(
         retry: null,
         name: r'eventSuccessPresenceHeartbeatsProvider',
         isAutoDispose: true,
         dependencies: null,
         $allTransitiveDependencies: null,
       );

  @override
  String debugGetCreateSourceHash() => _$eventSuccessPresenceHeartbeatsHash();

  @override
  String toString() {
    return r'eventSuccessPresenceHeartbeatsProvider'
        ''
        '$argument';
  }

  @$internal
  @override
  $StreamProviderElement<List<EventSuccessPresenceHeartbeatRow>> $createElement(
    $ProviderPointer pointer,
  ) => $StreamProviderElement(pointer);

  @override
  Stream<List<EventSuccessPresenceHeartbeatRow>> create(Ref ref) {
    final argument = this.argument as ({String organizerId, String eventId});
    return eventSuccessPresenceHeartbeats(
      ref,
      organizerId: argument.organizerId,
      eventId: argument.eventId,
    );
  }

  @override
  bool operator ==(Object other) {
    return other is EventSuccessPresenceHeartbeatsProvider &&
        other.argument == argument;
  }

  @override
  int get hashCode {
    return argument.hashCode;
  }
}

String _$eventSuccessPresenceHeartbeatsHash() =>
    r'9271d5a16ecd3ebe5d98039c36097202e6359b0e';

/// The room presence read owner. It is a Firestore listener: it declares no
/// cache tags or lifetime, and writes never invalidate it.

final class EventSuccessPresenceHeartbeatsFamily extends $Family
    with
        $FunctionalFamilyOverride<
          Stream<List<EventSuccessPresenceHeartbeatRow>>,
          ({String organizerId, String eventId})
        > {
  EventSuccessPresenceHeartbeatsFamily._()
    : super(
        retry: null,
        name: r'eventSuccessPresenceHeartbeatsProvider',
        dependencies: null,
        $allTransitiveDependencies: null,
        isAutoDispose: true,
      );

  /// The room presence read owner. It is a Firestore listener: it declares no
  /// cache tags or lifetime, and writes never invalidate it.

  EventSuccessPresenceHeartbeatsProvider call({
    required String organizerId,
    required String eventId,
  }) => EventSuccessPresenceHeartbeatsProvider._(
    argument: (organizerId: organizerId, eventId: eventId),
    from: this,
  );

  @override
  String toString() => r'eventSuccessPresenceHeartbeatsProvider';
}

/// The late-arrival placement read owner. It is a Firestore listener: a
/// placement reaches it from the server, so the console never rereads after
/// placing a guest.

@ProviderFor(eventSuccessLateArrivalPlacements)
final eventSuccessLateArrivalPlacementsProvider =
    EventSuccessLateArrivalPlacementsFamily._();

/// The late-arrival placement read owner. It is a Firestore listener: a
/// placement reaches it from the server, so the console never rereads after
/// placing a guest.

final class EventSuccessLateArrivalPlacementsProvider
    extends
        $FunctionalProvider<
          AsyncValue<List<EventSuccessLateArrivalPlacementRow>>,
          List<EventSuccessLateArrivalPlacementRow>,
          Stream<List<EventSuccessLateArrivalPlacementRow>>
        >
    with
        $FutureModifier<List<EventSuccessLateArrivalPlacementRow>>,
        $StreamProvider<List<EventSuccessLateArrivalPlacementRow>> {
  /// The late-arrival placement read owner. It is a Firestore listener: a
  /// placement reaches it from the server, so the console never rereads after
  /// placing a guest.
  EventSuccessLateArrivalPlacementsProvider._({
    required EventSuccessLateArrivalPlacementsFamily super.from,
    required ({String organizerId, String eventId}) super.argument,
  }) : super(
         retry: null,
         name: r'eventSuccessLateArrivalPlacementsProvider',
         isAutoDispose: true,
         dependencies: null,
         $allTransitiveDependencies: null,
       );

  @override
  String debugGetCreateSourceHash() =>
      _$eventSuccessLateArrivalPlacementsHash();

  @override
  String toString() {
    return r'eventSuccessLateArrivalPlacementsProvider'
        ''
        '$argument';
  }

  @$internal
  @override
  $StreamProviderElement<List<EventSuccessLateArrivalPlacementRow>>
  $createElement($ProviderPointer pointer) => $StreamProviderElement(pointer);

  @override
  Stream<List<EventSuccessLateArrivalPlacementRow>> create(Ref ref) {
    final argument = this.argument as ({String organizerId, String eventId});
    return eventSuccessLateArrivalPlacements(
      ref,
      organizerId: argument.organizerId,
      eventId: argument.eventId,
    );
  }

  @override
  bool operator ==(Object other) {
    return other is EventSuccessLateArrivalPlacementsProvider &&
        other.argument == argument;
  }

  @override
  int get hashCode {
    return argument.hashCode;
  }
}

String _$eventSuccessLateArrivalPlacementsHash() =>
    r'db97a011f2f10384bbdb9674cfc4673373fbbb1e';

/// The late-arrival placement read owner. It is a Firestore listener: a
/// placement reaches it from the server, so the console never rereads after
/// placing a guest.

final class EventSuccessLateArrivalPlacementsFamily extends $Family
    with
        $FunctionalFamilyOverride<
          Stream<List<EventSuccessLateArrivalPlacementRow>>,
          ({String organizerId, String eventId})
        > {
  EventSuccessLateArrivalPlacementsFamily._()
    : super(
        retry: null,
        name: r'eventSuccessLateArrivalPlacementsProvider',
        dependencies: null,
        $allTransitiveDependencies: null,
        isAutoDispose: true,
      );

  /// The late-arrival placement read owner. It is a Firestore listener: a
  /// placement reaches it from the server, so the console never rereads after
  /// placing a guest.

  EventSuccessLateArrivalPlacementsProvider call({
    required String organizerId,
    required String eventId,
  }) => EventSuccessLateArrivalPlacementsProvider._(
    argument: (organizerId: organizerId, eventId: eventId),
    from: this,
  );

  @override
  String toString() => r'eventSuccessLateArrivalPlacementsProvider';
}
