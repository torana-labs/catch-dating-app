// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'event_success_presence_summary_provider.dart';

// **************************************************************************
// RiverpodGenerator
// **************************************************************************

// GENERATED CODE - DO NOT MODIFY BY HAND
// ignore_for_file: type=lint, type=warning
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
    r'8651a3167eda7a0a56f8445b3f9285fca3e5e30f';

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
