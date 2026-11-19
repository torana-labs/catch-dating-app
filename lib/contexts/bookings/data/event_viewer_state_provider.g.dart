// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'event_viewer_state_provider.dart';

// **************************************************************************
// RiverpodGenerator
// **************************************************************************

// GENERATED CODE - DO NOT MODIFY BY HAND
// ignore_for_file: type=lint, type=warning
/// One guest's booking state for one event, composed from Firestore
/// listeners on the documents they may read: the event, their booking,
/// profile, paid memberships, the event's membership rules, the organizer's
/// published plans and their server-projected booking facts. Each listener
/// delivers its own writes, so a booking command needs no invalidation. The
/// UID isolates the account generation; it is never sent as authority.
// provider-graph: high-fan-out:eventViewerStateProvider accepted -- The listeners form one booking-state read model for one guest and event: auth, the event, the booking, the profile, scheduled events for the overlap check, paid memberships, the event's membership rules, the organizer's published plans, the server-projected guest facts, and (for capped plans) the cap-bounded upcoming benefit uses and signed-up events. Composing them in one place keeps the dock and the booking flow on the same rules as the server, which the shared parity cases pin.

@ProviderFor(eventViewerState)
final eventViewerStateProvider = EventViewerStateFamily._();

/// One guest's booking state for one event, composed from Firestore
/// listeners on the documents they may read: the event, their booking,
/// profile, paid memberships, the event's membership rules, the organizer's
/// published plans and their server-projected booking facts. Each listener
/// delivers its own writes, so a booking command needs no invalidation. The
/// UID isolates the account generation; it is never sent as authority.
// provider-graph: high-fan-out:eventViewerStateProvider accepted -- The listeners form one booking-state read model for one guest and event: auth, the event, the booking, the profile, scheduled events for the overlap check, paid memberships, the event's membership rules, the organizer's published plans, the server-projected guest facts, and (for capped plans) the cap-bounded upcoming benefit uses and signed-up events. Composing them in one place keeps the dock and the booking flow on the same rules as the server, which the shared parity cases pin.

final class EventViewerStateProvider
    extends
        $FunctionalProvider<
          AsyncValue<EventViewerState>,
          EventViewerState,
          FutureOr<EventViewerState>
        >
    with $FutureModifier<EventViewerState>, $FutureProvider<EventViewerState> {
  /// One guest's booking state for one event, composed from Firestore
  /// listeners on the documents they may read: the event, their booking,
  /// profile, paid memberships, the event's membership rules, the organizer's
  /// published plans and their server-projected booking facts. Each listener
  /// delivers its own writes, so a booking command needs no invalidation. The
  /// UID isolates the account generation; it is never sent as authority.
  // provider-graph: high-fan-out:eventViewerStateProvider accepted -- The listeners form one booking-state read model for one guest and event: auth, the event, the booking, the profile, scheduled events for the overlap check, paid memberships, the event's membership rules, the organizer's published plans, the server-projected guest facts, and (for capped plans) the cap-bounded upcoming benefit uses and signed-up events. Composing them in one place keeps the dock and the booking flow on the same rules as the server, which the shared parity cases pin.
  EventViewerStateProvider._({
    required EventViewerStateFamily super.from,
    required (String, String, {String? inviteCode}) super.argument,
  }) : super(
         retry: _noViewerReadRetry,
         name: r'eventViewerStateProvider',
         isAutoDispose: true,
         dependencies: null,
         $allTransitiveDependencies: null,
       );

  @override
  String debugGetCreateSourceHash() => _$eventViewerStateHash();

  @override
  String toString() {
    return r'eventViewerStateProvider'
        ''
        '$argument';
  }

  @$internal
  @override
  $FutureProviderElement<EventViewerState> $createElement(
    $ProviderPointer pointer,
  ) => $FutureProviderElement(pointer);

  @override
  FutureOr<EventViewerState> create(Ref ref) {
    final argument = this.argument as (String, String, {String? inviteCode});
    return eventViewerState(
      ref,
      argument.$1,
      argument.$2,
      inviteCode: argument.inviteCode,
    );
  }

  @override
  bool operator ==(Object other) {
    return other is EventViewerStateProvider && other.argument == argument;
  }

  @override
  int get hashCode {
    return argument.hashCode;
  }
}

String _$eventViewerStateHash() => r'edf968ac89e296646be6654ee613ff52722e5397';

/// One guest's booking state for one event, composed from Firestore
/// listeners on the documents they may read: the event, their booking,
/// profile, paid memberships, the event's membership rules, the organizer's
/// published plans and their server-projected booking facts. Each listener
/// delivers its own writes, so a booking command needs no invalidation. The
/// UID isolates the account generation; it is never sent as authority.
// provider-graph: high-fan-out:eventViewerStateProvider accepted -- The listeners form one booking-state read model for one guest and event: auth, the event, the booking, the profile, scheduled events for the overlap check, paid memberships, the event's membership rules, the organizer's published plans, the server-projected guest facts, and (for capped plans) the cap-bounded upcoming benefit uses and signed-up events. Composing them in one place keeps the dock and the booking flow on the same rules as the server, which the shared parity cases pin.

final class EventViewerStateFamily extends $Family
    with
        $FunctionalFamilyOverride<
          FutureOr<EventViewerState>,
          (String, String, {String? inviteCode})
        > {
  EventViewerStateFamily._()
    : super(
        retry: _noViewerReadRetry,
        name: r'eventViewerStateProvider',
        dependencies: null,
        $allTransitiveDependencies: null,
        isAutoDispose: true,
      );

  /// One guest's booking state for one event, composed from Firestore
  /// listeners on the documents they may read: the event, their booking,
  /// profile, paid memberships, the event's membership rules, the organizer's
  /// published plans and their server-projected booking facts. Each listener
  /// delivers its own writes, so a booking command needs no invalidation. The
  /// UID isolates the account generation; it is never sent as authority.
  // provider-graph: high-fan-out:eventViewerStateProvider accepted -- The listeners form one booking-state read model for one guest and event: auth, the event, the booking, the profile, scheduled events for the overlap check, paid memberships, the event's membership rules, the organizer's published plans, the server-projected guest facts, and (for capped plans) the cap-bounded upcoming benefit uses and signed-up events. Composing them in one place keeps the dock and the booking flow on the same rules as the server, which the shared parity cases pin.

  EventViewerStateProvider call(
    String eventId,
    String uid, {
    String? inviteCode,
  }) => EventViewerStateProvider._(
    argument: (eventId, uid, inviteCode: inviteCode),
    from: this,
  );

  @override
  String toString() => r'eventViewerStateProvider';
}
