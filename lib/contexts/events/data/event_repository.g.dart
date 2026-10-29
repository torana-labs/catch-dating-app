// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'event_repository.dart';

// **************************************************************************
// RiverpodGenerator
// **************************************************************************

// GENERATED CODE - DO NOT MODIFY BY HAND
// ignore_for_file: type=lint, type=warning

@ProviderFor(eventRepository)
final eventRepositoryProvider = EventRepositoryProvider._();

final class EventRepositoryProvider
    extends
        $FunctionalProvider<EventRepository, EventRepository, EventRepository>
    with $Provider<EventRepository> {
  EventRepositoryProvider._()
    : super(
        from: null,
        argument: null,
        retry: null,
        name: r'eventRepositoryProvider',
        isAutoDispose: true,
        dependencies: null,
        $allTransitiveDependencies: null,
      );

  @override
  String debugGetCreateSourceHash() => _$eventRepositoryHash();

  @$internal
  @override
  $ProviderElement<EventRepository> $createElement($ProviderPointer pointer) =>
      $ProviderElement(pointer);

  @override
  EventRepository create(Ref ref) {
    return eventRepository(ref);
  }

  /// {@macro riverpod.override_with_value}
  Override overrideWithValue(EventRepository value) {
    return $ProviderOverride(
      origin: this,
      providerOverride: $SyncValueProvider<EventRepository>(value),
    );
  }
}

String _$eventRepositoryHash() => r'5c27fcaf610df7c473e469b917d805e9b5bdde72';

@ProviderFor(watchEvent)
final watchEventProvider = WatchEventFamily._();

final class WatchEventProvider
    extends $FunctionalProvider<AsyncValue<Event?>, Event?, Stream<Event?>>
    with $FutureModifier<Event?>, $StreamProvider<Event?> {
  WatchEventProvider._({
    required WatchEventFamily super.from,
    required String super.argument,
  }) : super(
         retry: null,
         name: r'watchEventProvider',
         isAutoDispose: true,
         dependencies: null,
         $allTransitiveDependencies: null,
       );

  @override
  String debugGetCreateSourceHash() => _$watchEventHash();

  @override
  String toString() {
    return r'watchEventProvider'
        ''
        '($argument)';
  }

  @$internal
  @override
  $StreamProviderElement<Event?> $createElement($ProviderPointer pointer) =>
      $StreamProviderElement(pointer);

  @override
  Stream<Event?> create(Ref ref) {
    final argument = this.argument as String;
    return watchEvent(ref, argument);
  }

  @override
  bool operator ==(Object other) {
    return other is WatchEventProvider && other.argument == argument;
  }

  @override
  int get hashCode {
    return argument.hashCode;
  }
}

String _$watchEventHash() => r'28619c56a3d029be7cccee2fab8d084962288c6f';

final class WatchEventFamily extends $Family
    with $FunctionalFamilyOverride<Stream<Event?>, String> {
  WatchEventFamily._()
    : super(
        retry: null,
        name: r'watchEventProvider',
        dependencies: null,
        $allTransitiveDependencies: null,
        isAutoDispose: true,
      );

  WatchEventProvider call(String eventId) =>
      WatchEventProvider._(argument: eventId, from: this);

  @override
  String toString() => r'watchEventProvider';
}

@ProviderFor(watchEventPrivateAccess)
final watchEventPrivateAccessProvider = WatchEventPrivateAccessFamily._();

final class WatchEventPrivateAccessProvider
    extends
        $FunctionalProvider<
          AsyncValue<EventPrivateAccess?>,
          EventPrivateAccess?,
          Stream<EventPrivateAccess?>
        >
    with
        $FutureModifier<EventPrivateAccess?>,
        $StreamProvider<EventPrivateAccess?> {
  WatchEventPrivateAccessProvider._({
    required WatchEventPrivateAccessFamily super.from,
    required String super.argument,
  }) : super(
         retry: null,
         name: r'watchEventPrivateAccessProvider',
         isAutoDispose: true,
         dependencies: null,
         $allTransitiveDependencies: null,
       );

  @override
  String debugGetCreateSourceHash() => _$watchEventPrivateAccessHash();

  @override
  String toString() {
    return r'watchEventPrivateAccessProvider'
        ''
        '($argument)';
  }

  @$internal
  @override
  $StreamProviderElement<EventPrivateAccess?> $createElement(
    $ProviderPointer pointer,
  ) => $StreamProviderElement(pointer);

  @override
  Stream<EventPrivateAccess?> create(Ref ref) {
    final argument = this.argument as String;
    return watchEventPrivateAccess(ref, argument);
  }

  @override
  bool operator ==(Object other) {
    return other is WatchEventPrivateAccessProvider &&
        other.argument == argument;
  }

  @override
  int get hashCode {
    return argument.hashCode;
  }
}

String _$watchEventPrivateAccessHash() =>
    r'216ea1d97d689c68aa6ed2f60e745e5153371190';

final class WatchEventPrivateAccessFamily extends $Family
    with $FunctionalFamilyOverride<Stream<EventPrivateAccess?>, String> {
  WatchEventPrivateAccessFamily._()
    : super(
        retry: null,
        name: r'watchEventPrivateAccessProvider',
        dependencies: null,
        $allTransitiveDependencies: null,
        isAutoDispose: true,
      );

  WatchEventPrivateAccessProvider call(String eventId) =>
      WatchEventPrivateAccessProvider._(argument: eventId, from: this);

  @override
  String toString() => r'watchEventPrivateAccessProvider';
}

@ProviderFor(watchEventInviteLinks)
final watchEventInviteLinksProvider = WatchEventInviteLinksFamily._();

final class WatchEventInviteLinksProvider
    extends
        $FunctionalProvider<
          AsyncValue<List<EventInviteLink>>,
          List<EventInviteLink>,
          Stream<List<EventInviteLink>>
        >
    with
        $FutureModifier<List<EventInviteLink>>,
        $StreamProvider<List<EventInviteLink>> {
  WatchEventInviteLinksProvider._({
    required WatchEventInviteLinksFamily super.from,
    required String super.argument,
  }) : super(
         retry: null,
         name: r'watchEventInviteLinksProvider',
         isAutoDispose: true,
         dependencies: null,
         $allTransitiveDependencies: null,
       );

  @override
  String debugGetCreateSourceHash() => _$watchEventInviteLinksHash();

  @override
  String toString() {
    return r'watchEventInviteLinksProvider'
        ''
        '($argument)';
  }

  @$internal
  @override
  $StreamProviderElement<List<EventInviteLink>> $createElement(
    $ProviderPointer pointer,
  ) => $StreamProviderElement(pointer);

  @override
  Stream<List<EventInviteLink>> create(Ref ref) {
    final argument = this.argument as String;
    return watchEventInviteLinks(ref, argument);
  }

  @override
  bool operator ==(Object other) {
    return other is WatchEventInviteLinksProvider && other.argument == argument;
  }

  @override
  int get hashCode {
    return argument.hashCode;
  }
}

String _$watchEventInviteLinksHash() =>
    r'bb0939e232e8345aed1237e62eec04959f6b20b1';

final class WatchEventInviteLinksFamily extends $Family
    with $FunctionalFamilyOverride<Stream<List<EventInviteLink>>, String> {
  WatchEventInviteLinksFamily._()
    : super(
        retry: null,
        name: r'watchEventInviteLinksProvider',
        dependencies: null,
        $allTransitiveDependencies: null,
        isAutoDispose: true,
      );

  WatchEventInviteLinksProvider call(String eventId) =>
      WatchEventInviteLinksProvider._(argument: eventId, from: this);

  @override
  String toString() => r'watchEventInviteLinksProvider';
}

@ProviderFor(watchEventsForClub)
final watchEventsForClubProvider = WatchEventsForClubFamily._();

final class WatchEventsForClubProvider
    extends
        $FunctionalProvider<
          AsyncValue<List<Event>>,
          List<Event>,
          Stream<List<Event>>
        >
    with $FutureModifier<List<Event>>, $StreamProvider<List<Event>> {
  WatchEventsForClubProvider._({
    required WatchEventsForClubFamily super.from,
    required String super.argument,
  }) : super(
         retry: null,
         name: r'watchEventsForClubProvider',
         isAutoDispose: true,
         dependencies: null,
         $allTransitiveDependencies: null,
       );

  @override
  String debugGetCreateSourceHash() => _$watchEventsForClubHash();

  @override
  String toString() {
    return r'watchEventsForClubProvider'
        ''
        '($argument)';
  }

  @$internal
  @override
  $StreamProviderElement<List<Event>> $createElement(
    $ProviderPointer pointer,
  ) => $StreamProviderElement(pointer);

  @override
  Stream<List<Event>> create(Ref ref) {
    final argument = this.argument as String;
    return watchEventsForClub(ref, argument);
  }

  @override
  bool operator ==(Object other) {
    return other is WatchEventsForClubProvider && other.argument == argument;
  }

  @override
  int get hashCode {
    return argument.hashCode;
  }
}

String _$watchEventsForClubHash() =>
    r'fd4d52b8f0ceb8ba17c85c11c216fdb7899cb7b1';

final class WatchEventsForClubFamily extends $Family
    with $FunctionalFamilyOverride<Stream<List<Event>>, String> {
  WatchEventsForClubFamily._()
    : super(
        retry: null,
        name: r'watchEventsForClubProvider',
        dependencies: null,
        $allTransitiveDependencies: null,
        isAutoDispose: true,
      );

  WatchEventsForClubProvider call(String clubId) =>
      WatchEventsForClubProvider._(argument: clubId, from: this);

  @override
  String toString() => r'watchEventsForClubProvider';
}

@ProviderFor(eventVenueSession)
final eventVenueSessionProvider = EventVenueSessionFamily._();

final class EventVenueSessionProvider
    extends
        $FunctionalProvider<
          AsyncValue<EventVenueSession>,
          EventVenueSession,
          Stream<EventVenueSession>
        >
    with
        $FutureModifier<EventVenueSession>,
        $StreamProvider<EventVenueSession> {
  EventVenueSessionProvider._({
    required EventVenueSessionFamily super.from,
    required String super.argument,
  }) : super(
         retry: null,
         name: r'eventVenueSessionProvider',
         isAutoDispose: true,
         dependencies: null,
         $allTransitiveDependencies: null,
       );

  @override
  String debugGetCreateSourceHash() => _$eventVenueSessionHash();

  @override
  String toString() {
    return r'eventVenueSessionProvider'
        ''
        '($argument)';
  }

  @$internal
  @override
  $StreamProviderElement<EventVenueSession> $createElement(
    $ProviderPointer pointer,
  ) => $StreamProviderElement(pointer);

  @override
  Stream<EventVenueSession> create(Ref ref) {
    final argument = this.argument as String;
    return eventVenueSession(ref, argument);
  }

  @override
  bool operator ==(Object other) {
    return other is EventVenueSessionProvider && other.argument == argument;
  }

  @override
  int get hashCode {
    return argument.hashCode;
  }
}

String _$eventVenueSessionHash() => r'e2a627b85465c11d81d9f26ba2e845b0de0736ea';

final class EventVenueSessionFamily extends $Family
    with $FunctionalFamilyOverride<Stream<EventVenueSession>, String> {
  EventVenueSessionFamily._()
    : super(
        retry: null,
        name: r'eventVenueSessionProvider',
        dependencies: null,
        $allTransitiveDependencies: null,
        isAutoDispose: true,
      );

  EventVenueSessionProvider call(String eventId) =>
      EventVenueSessionProvider._(argument: eventId, from: this);

  @override
  String toString() => r'eventVenueSessionProvider';
}

@ProviderFor(watchEventsForClubs)
final watchEventsForClubsProvider = WatchEventsForClubsFamily._();

final class WatchEventsForClubsProvider
    extends
        $FunctionalProvider<
          AsyncValue<List<Event>>,
          List<Event>,
          Stream<List<Event>>
        >
    with $FutureModifier<List<Event>>, $StreamProvider<List<Event>> {
  WatchEventsForClubsProvider._({
    required WatchEventsForClubsFamily super.from,
    required EventsForClubsQuery super.argument,
  }) : super(
         retry: null,
         name: r'watchEventsForClubsProvider',
         isAutoDispose: true,
         dependencies: null,
         $allTransitiveDependencies: null,
       );

  @override
  String debugGetCreateSourceHash() => _$watchEventsForClubsHash();

  @override
  String toString() {
    return r'watchEventsForClubsProvider'
        ''
        '($argument)';
  }

  @$internal
  @override
  $StreamProviderElement<List<Event>> $createElement(
    $ProviderPointer pointer,
  ) => $StreamProviderElement(pointer);

  @override
  Stream<List<Event>> create(Ref ref) {
    final argument = this.argument as EventsForClubsQuery;
    return watchEventsForClubs(ref, argument);
  }

  @override
  bool operator ==(Object other) {
    return other is WatchEventsForClubsProvider && other.argument == argument;
  }

  @override
  int get hashCode {
    return argument.hashCode;
  }
}

String _$watchEventsForClubsHash() =>
    r'c739d8f639ebf58ef2c7c89936d18a26a5a104af';

final class WatchEventsForClubsFamily extends $Family
    with $FunctionalFamilyOverride<Stream<List<Event>>, EventsForClubsQuery> {
  WatchEventsForClubsFamily._()
    : super(
        retry: null,
        name: r'watchEventsForClubsProvider',
        dependencies: null,
        $allTransitiveDependencies: null,
        isAutoDispose: true,
      );

  WatchEventsForClubsProvider call(EventsForClubsQuery query) =>
      WatchEventsForClubsProvider._(argument: query, from: this);

  @override
  String toString() => r'watchEventsForClubsProvider';
}

@ProviderFor(watchEventsByIds)
final watchEventsByIdsProvider = WatchEventsByIdsFamily._();

final class WatchEventsByIdsProvider
    extends
        $FunctionalProvider<
          AsyncValue<List<Event>>,
          List<Event>,
          Stream<List<Event>>
        >
    with $FutureModifier<List<Event>>, $StreamProvider<List<Event>> {
  WatchEventsByIdsProvider._({
    required WatchEventsByIdsFamily super.from,
    required EventsByIdQuery super.argument,
  }) : super(
         retry: null,
         name: r'watchEventsByIdsProvider',
         isAutoDispose: true,
         dependencies: null,
         $allTransitiveDependencies: null,
       );

  @override
  String debugGetCreateSourceHash() => _$watchEventsByIdsHash();

  @override
  String toString() {
    return r'watchEventsByIdsProvider'
        ''
        '($argument)';
  }

  @$internal
  @override
  $StreamProviderElement<List<Event>> $createElement(
    $ProviderPointer pointer,
  ) => $StreamProviderElement(pointer);

  @override
  Stream<List<Event>> create(Ref ref) {
    final argument = this.argument as EventsByIdQuery;
    return watchEventsByIds(ref, argument);
  }

  @override
  bool operator ==(Object other) {
    return other is WatchEventsByIdsProvider && other.argument == argument;
  }

  @override
  int get hashCode {
    return argument.hashCode;
  }
}

String _$watchEventsByIdsHash() => r'06e1198a07f0650655f0727858ea3403dbdbc20b';

final class WatchEventsByIdsFamily extends $Family
    with $FunctionalFamilyOverride<Stream<List<Event>>, EventsByIdQuery> {
  WatchEventsByIdsFamily._()
    : super(
        retry: null,
        name: r'watchEventsByIdsProvider',
        dependencies: null,
        $allTransitiveDependencies: null,
        isAutoDispose: true,
      );

  WatchEventsByIdsProvider call(EventsByIdQuery query) =>
      WatchEventsByIdsProvider._(argument: query, from: this);

  @override
  String toString() => r'watchEventsByIdsProvider';
}

/// Returns upcoming events from clubs the user follows.

@ProviderFor(recommendedEvents)
final recommendedEventsProvider = RecommendedEventsFamily._();

/// Returns upcoming events from clubs the user follows.

final class RecommendedEventsProvider
    extends
        $FunctionalProvider<
          AsyncValue<List<Event>>,
          List<Event>,
          FutureOr<List<Event>>
        >
    with $FutureModifier<List<Event>>, $FutureProvider<List<Event>> {
  /// Returns upcoming events from clubs the user follows.
  RecommendedEventsProvider._({
    required RecommendedEventsFamily super.from,
    required RecommendedEventsQuery super.argument,
  }) : super(
         retry: null,
         name: r'recommendedEventsProvider',
         isAutoDispose: true,
         dependencies: null,
         $allTransitiveDependencies: null,
       );

  @override
  String debugGetCreateSourceHash() => _$recommendedEventsHash();

  @override
  String toString() {
    return r'recommendedEventsProvider'
        ''
        '($argument)';
  }

  @$internal
  @override
  $FutureProviderElement<List<Event>> $createElement(
    $ProviderPointer pointer,
  ) => $FutureProviderElement(pointer);

  @override
  FutureOr<List<Event>> create(Ref ref) {
    final argument = this.argument as RecommendedEventsQuery;
    return recommendedEvents(ref, argument);
  }

  @override
  bool operator ==(Object other) {
    return other is RecommendedEventsProvider && other.argument == argument;
  }

  @override
  int get hashCode {
    return argument.hashCode;
  }
}

String _$recommendedEventsHash() => r'bc5ff15bfc6186cb5f74823a30b2fb2ec3c7749c';

/// Returns upcoming events from clubs the user follows.

final class RecommendedEventsFamily extends $Family
    with
        $FunctionalFamilyOverride<
          FutureOr<List<Event>>,
          RecommendedEventsQuery
        > {
  RecommendedEventsFamily._()
    : super(
        retry: null,
        name: r'recommendedEventsProvider',
        dependencies: null,
        $allTransitiveDependencies: null,
        isAutoDispose: true,
      );

  /// Returns upcoming events from clubs the user follows.

  RecommendedEventsProvider call(RecommendedEventsQuery query) =>
      RecommendedEventsProvider._(argument: query, from: this);

  @override
  String toString() => r'recommendedEventsProvider';
}

/// The UID isolates the local provider generation; it is never sent as authority.

@ProviderFor(eventViewerState)
final eventViewerStateProvider = EventViewerStateFamily._();

/// The UID isolates the local provider generation; it is never sent as authority.

final class EventViewerStateProvider
    extends
        $FunctionalProvider<
          AsyncValue<EventViewerState>,
          EventViewerState,
          FutureOr<EventViewerState>
        >
    with $FutureModifier<EventViewerState>, $FutureProvider<EventViewerState> {
  /// The UID isolates the local provider generation; it is never sent as authority.
  EventViewerStateProvider._({
    required EventViewerStateFamily super.from,
    required (String, String, {String? inviteCode}) super.argument,
  }) : super(
         retry: null,
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

String _$eventViewerStateHash() => r'80c167a8621e03696801c5527b5b113d6b143058';

/// The UID isolates the local provider generation; it is never sent as authority.

final class EventViewerStateFamily extends $Family
    with
        $FunctionalFamilyOverride<
          FutureOr<EventViewerState>,
          (String, String, {String? inviteCode})
        > {
  EventViewerStateFamily._()
    : super(
        retry: null,
        name: r'eventViewerStateProvider',
        dependencies: null,
        $allTransitiveDependencies: null,
        isAutoDispose: true,
      );

  /// The UID isolates the local provider generation; it is never sent as authority.

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
