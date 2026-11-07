// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'event_offer_configuration_reads.dart';

// **************************************************************************
// RiverpodGenerator
// **************************************************************************

// GENERATED CODE - DO NOT MODIFY BY HAND
// ignore_for_file: type=lint, type=warning

@ProviderFor(eventOfferConfigurationReads)
final eventOfferConfigurationReadsProvider =
    EventOfferConfigurationReadsProvider._();

final class EventOfferConfigurationReadsProvider
    extends
        $FunctionalProvider<
          EventOfferConfigurationReads,
          EventOfferConfigurationReads,
          EventOfferConfigurationReads
        >
    with $Provider<EventOfferConfigurationReads> {
  EventOfferConfigurationReadsProvider._()
    : super(
        from: null,
        argument: null,
        retry: null,
        name: r'eventOfferConfigurationReadsProvider',
        isAutoDispose: true,
        dependencies: null,
        $allTransitiveDependencies: null,
      );

  @override
  String debugGetCreateSourceHash() => _$eventOfferConfigurationReadsHash();

  @$internal
  @override
  $ProviderElement<EventOfferConfigurationReads> $createElement(
    $ProviderPointer pointer,
  ) => $ProviderElement(pointer);

  @override
  EventOfferConfigurationReads create(Ref ref) {
    return eventOfferConfigurationReads(ref);
  }

  /// {@macro riverpod.override_with_value}
  Override overrideWithValue(EventOfferConfigurationReads value) {
    return $ProviderOverride(
      origin: this,
      providerOverride: $SyncValueProvider<EventOfferConfigurationReads>(value),
    );
  }
}

String _$eventOfferConfigurationReadsHash() =>
    r'2d603906e2038dae792eb79fa8b72544f9fb8957';

/// The offer settings read owner. It is a Firestore listener pair: it
/// declares no cache tags or lifetime, and writes never invalidate it; a
/// screen restarts it only after it ended in an error.

@ProviderFor(eventOfferConfiguration)
final eventOfferConfigurationProvider = EventOfferConfigurationFamily._();

/// The offer settings read owner. It is a Firestore listener pair: it
/// declares no cache tags or lifetime, and writes never invalidate it; a
/// screen restarts it only after it ended in an error.

final class EventOfferConfigurationProvider
    extends
        $FunctionalProvider<
          AsyncValue<EventOfferConfiguration>,
          EventOfferConfiguration,
          Stream<EventOfferConfiguration>
        >
    with
        $FutureModifier<EventOfferConfiguration>,
        $StreamProvider<EventOfferConfiguration> {
  /// The offer settings read owner. It is a Firestore listener pair: it
  /// declares no cache tags or lifetime, and writes never invalidate it; a
  /// screen restarts it only after it ended in an error.
  EventOfferConfigurationProvider._({
    required EventOfferConfigurationFamily super.from,
    required ({String organizerId, String eventId}) super.argument,
  }) : super(
         retry: null,
         name: r'eventOfferConfigurationProvider',
         isAutoDispose: true,
         dependencies: null,
         $allTransitiveDependencies: null,
       );

  @override
  String debugGetCreateSourceHash() => _$eventOfferConfigurationHash();

  @override
  String toString() {
    return r'eventOfferConfigurationProvider'
        ''
        '$argument';
  }

  @$internal
  @override
  $StreamProviderElement<EventOfferConfiguration> $createElement(
    $ProviderPointer pointer,
  ) => $StreamProviderElement(pointer);

  @override
  Stream<EventOfferConfiguration> create(Ref ref) {
    final argument = this.argument as ({String organizerId, String eventId});
    return eventOfferConfiguration(
      ref,
      organizerId: argument.organizerId,
      eventId: argument.eventId,
    );
  }

  @override
  bool operator ==(Object other) {
    return other is EventOfferConfigurationProvider &&
        other.argument == argument;
  }

  @override
  int get hashCode {
    return argument.hashCode;
  }
}

String _$eventOfferConfigurationHash() =>
    r'3d24b6546276a0be2a04885a73473c2b69218e47';

/// The offer settings read owner. It is a Firestore listener pair: it
/// declares no cache tags or lifetime, and writes never invalidate it; a
/// screen restarts it only after it ended in an error.

final class EventOfferConfigurationFamily extends $Family
    with
        $FunctionalFamilyOverride<
          Stream<EventOfferConfiguration>,
          ({String organizerId, String eventId})
        > {
  EventOfferConfigurationFamily._()
    : super(
        retry: null,
        name: r'eventOfferConfigurationProvider',
        dependencies: null,
        $allTransitiveDependencies: null,
        isAutoDispose: true,
      );

  /// The offer settings read owner. It is a Firestore listener pair: it
  /// declares no cache tags or lifetime, and writes never invalidate it; a
  /// screen restarts it only after it ended in an error.

  EventOfferConfigurationProvider call({
    required String organizerId,
    required String eventId,
  }) => EventOfferConfigurationProvider._(
    argument: (organizerId: organizerId, eventId: eventId),
    from: this,
  );

  @override
  String toString() => r'eventOfferConfigurationProvider';
}
