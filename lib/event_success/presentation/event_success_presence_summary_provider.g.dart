// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'event_success_presence_summary_provider.dart';

// **************************************************************************
// RiverpodGenerator
// **************************************************************************

// GENERATED CODE - DO NOT MODIFY BY HAND
// ignore_for_file: type=lint, type=warning
/// The app clock, ticking at the presence heartbeat interval so present,
/// idle and likely-departed move on screen with no new snapshot.

@ProviderFor(eventSuccessPresenceClock)
final eventSuccessPresenceClockProvider = EventSuccessPresenceClockProvider._();

/// The app clock, ticking at the presence heartbeat interval so present,
/// idle and likely-departed move on screen with no new snapshot.

final class EventSuccessPresenceClockProvider
    extends
        $FunctionalProvider<AsyncValue<DateTime>, DateTime, Stream<DateTime>>
    with $FutureModifier<DateTime>, $StreamProvider<DateTime> {
  /// The app clock, ticking at the presence heartbeat interval so present,
  /// idle and likely-departed move on screen with no new snapshot.
  EventSuccessPresenceClockProvider._()
    : super(
        from: null,
        argument: null,
        retry: null,
        name: r'eventSuccessPresenceClockProvider',
        isAutoDispose: true,
        dependencies: null,
        $allTransitiveDependencies: null,
      );

  @override
  String debugGetCreateSourceHash() => _$eventSuccessPresenceClockHash();

  @$internal
  @override
  $StreamProviderElement<DateTime> $createElement($ProviderPointer pointer) =>
      $StreamProviderElement(pointer);

  @override
  Stream<DateTime> create(Ref ref) {
    return eventSuccessPresenceClock(ref);
  }
}

String _$eventSuccessPresenceClockHash() =>
    r'96d5bd4a1f3a79bfa6109fe3983c0dde08dc50a7';

/// The live console's presence and late arrivals, derived on the phone from
/// listeners: heartbeats and late-arrival placements, plus the plan, the next
/// round's drafts (for guided rotations only) and the operational roster the
/// console already watches.
/// It reads nothing itself and recomputes on each tick of
/// [eventSuccessPresenceClockProvider] without touching the listeners. The
/// first error among its sources is its error.

@ProviderFor(eventSuccessPresenceSummary)
final eventSuccessPresenceSummaryProvider =
    EventSuccessPresenceSummaryFamily._();

/// The live console's presence and late arrivals, derived on the phone from
/// listeners: heartbeats and late-arrival placements, plus the plan, the next
/// round's drafts (for guided rotations only) and the operational roster the
/// console already watches.
/// It reads nothing itself and recomputes on each tick of
/// [eventSuccessPresenceClockProvider] without touching the listeners. The
/// first error among its sources is its error.

final class EventSuccessPresenceSummaryProvider
    extends
        $FunctionalProvider<
          AsyncValue<EventSuccessPresenceSummary>,
          AsyncValue<EventSuccessPresenceSummary>,
          AsyncValue<EventSuccessPresenceSummary>
        >
    with $Provider<AsyncValue<EventSuccessPresenceSummary>> {
  /// The live console's presence and late arrivals, derived on the phone from
  /// listeners: heartbeats and late-arrival placements, plus the plan, the next
  /// round's drafts (for guided rotations only) and the operational roster the
  /// console already watches.
  /// It reads nothing itself and recomputes on each tick of
  /// [eventSuccessPresenceClockProvider] without touching the listeners. The
  /// first error among its sources is its error.
  EventSuccessPresenceSummaryProvider._({
    required EventSuccessPresenceSummaryFamily super.from,
    required ({String organizerId, String eventId, int eventStartMillis})
    super.argument,
  }) : super(
         retry: null,
         name: r'eventSuccessPresenceSummaryProvider',
         isAutoDispose: true,
         dependencies: null,
         $allTransitiveDependencies: null,
       );

  @override
  String debugGetCreateSourceHash() => _$eventSuccessPresenceSummaryHash();

  @override
  String toString() {
    return r'eventSuccessPresenceSummaryProvider'
        ''
        '$argument';
  }

  @$internal
  @override
  $ProviderElement<AsyncValue<EventSuccessPresenceSummary>> $createElement(
    $ProviderPointer pointer,
  ) => $ProviderElement(pointer);

  @override
  AsyncValue<EventSuccessPresenceSummary> create(Ref ref) {
    final argument =
        this.argument
            as ({String organizerId, String eventId, int eventStartMillis});
    return eventSuccessPresenceSummary(
      ref,
      organizerId: argument.organizerId,
      eventId: argument.eventId,
      eventStartMillis: argument.eventStartMillis,
    );
  }

  /// {@macro riverpod.override_with_value}
  Override overrideWithValue(AsyncValue<EventSuccessPresenceSummary> value) {
    return $ProviderOverride(
      origin: this,
      providerOverride:
          $SyncValueProvider<AsyncValue<EventSuccessPresenceSummary>>(value),
    );
  }

  @override
  bool operator ==(Object other) {
    return other is EventSuccessPresenceSummaryProvider &&
        other.argument == argument;
  }

  @override
  int get hashCode {
    return argument.hashCode;
  }
}

String _$eventSuccessPresenceSummaryHash() =>
    r'2a2af3cf634361944c139aa77fe3dcd5689a6a02';

/// The live console's presence and late arrivals, derived on the phone from
/// listeners: heartbeats and late-arrival placements, plus the plan, the next
/// round's drafts (for guided rotations only) and the operational roster the
/// console already watches.
/// It reads nothing itself and recomputes on each tick of
/// [eventSuccessPresenceClockProvider] without touching the listeners. The
/// first error among its sources is its error.

final class EventSuccessPresenceSummaryFamily extends $Family
    with
        $FunctionalFamilyOverride<
          AsyncValue<EventSuccessPresenceSummary>,
          ({String organizerId, String eventId, int eventStartMillis})
        > {
  EventSuccessPresenceSummaryFamily._()
    : super(
        retry: null,
        name: r'eventSuccessPresenceSummaryProvider',
        dependencies: null,
        $allTransitiveDependencies: null,
        isAutoDispose: true,
      );

  /// The live console's presence and late arrivals, derived on the phone from
  /// listeners: heartbeats and late-arrival placements, plus the plan, the next
  /// round's drafts (for guided rotations only) and the operational roster the
  /// console already watches.
  /// It reads nothing itself and recomputes on each tick of
  /// [eventSuccessPresenceClockProvider] without touching the listeners. The
  /// first error among its sources is its error.

  EventSuccessPresenceSummaryProvider call({
    required String organizerId,
    required String eventId,
    required int eventStartMillis,
  }) => EventSuccessPresenceSummaryProvider._(
    argument: (
      organizerId: organizerId,
      eventId: eventId,
      eventStartMillis: eventStartMillis,
    ),
    from: this,
  );

  @override
  String toString() => r'eventSuccessPresenceSummaryProvider';
}
