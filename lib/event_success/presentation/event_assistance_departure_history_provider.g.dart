// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'event_assistance_departure_history_provider.dart';

// **************************************************************************
// RiverpodGenerator
// **************************************************************************

// GENERATED CODE - DO NOT MODIFY BY HAND
// ignore_for_file: type=lint, type=warning
/// Account-scoped pages never render a previous sign-in's history on refresh.

@ProviderFor(EventAssistanceDepartureHistory)
final eventAssistanceDepartureHistoryProvider =
    EventAssistanceDepartureHistoryFamily._();

/// Account-scoped pages never render a previous sign-in's history on refresh.
final class EventAssistanceDepartureHistoryProvider
    extends
        $NotifierProvider<
          EventAssistanceDepartureHistory,
          AsyncValue<EventAssistanceDepartureHistorySession>
        > {
  /// Account-scoped pages never render a previous sign-in's history on refresh.
  EventAssistanceDepartureHistoryProvider._({
    required EventAssistanceDepartureHistoryFamily super.from,
    required EventAssistanceDepartureHistoryQuery super.argument,
  }) : super(
         retry: null,
         name: r'eventAssistanceDepartureHistoryProvider',
         isAutoDispose: true,
         dependencies: null,
         $allTransitiveDependencies: null,
       );

  @override
  String debugGetCreateSourceHash() => _$eventAssistanceDepartureHistoryHash();

  @override
  String toString() {
    return r'eventAssistanceDepartureHistoryProvider'
        ''
        '($argument)';
  }

  @$internal
  @override
  EventAssistanceDepartureHistory create() => EventAssistanceDepartureHistory();

  /// {@macro riverpod.override_with_value}
  Override overrideWithValue(
    AsyncValue<EventAssistanceDepartureHistorySession> value,
  ) {
    return $ProviderOverride(
      origin: this,
      providerOverride:
          $SyncValueProvider<
            AsyncValue<EventAssistanceDepartureHistorySession>
          >(value),
    );
  }

  @override
  bool operator ==(Object other) {
    return other is EventAssistanceDepartureHistoryProvider &&
        other.argument == argument;
  }

  @override
  int get hashCode {
    return argument.hashCode;
  }
}

String _$eventAssistanceDepartureHistoryHash() =>
    r'300402a45acacea48278f00a942e3352c9e70f81';

/// Account-scoped pages never render a previous sign-in's history on refresh.

final class EventAssistanceDepartureHistoryFamily extends $Family
    with
        $ClassFamilyOverride<
          EventAssistanceDepartureHistory,
          AsyncValue<EventAssistanceDepartureHistorySession>,
          AsyncValue<EventAssistanceDepartureHistorySession>,
          AsyncValue<EventAssistanceDepartureHistorySession>,
          EventAssistanceDepartureHistoryQuery
        > {
  EventAssistanceDepartureHistoryFamily._()
    : super(
        retry: null,
        name: r'eventAssistanceDepartureHistoryProvider',
        dependencies: null,
        $allTransitiveDependencies: null,
        isAutoDispose: true,
      );

  /// Account-scoped pages never render a previous sign-in's history on refresh.

  EventAssistanceDepartureHistoryProvider call(
    EventAssistanceDepartureHistoryQuery query,
  ) => EventAssistanceDepartureHistoryProvider._(argument: query, from: this);

  @override
  String toString() => r'eventAssistanceDepartureHistoryProvider';
}

/// Account-scoped pages never render a previous sign-in's history on refresh.

abstract class _$EventAssistanceDepartureHistory
    extends $Notifier<AsyncValue<EventAssistanceDepartureHistorySession>> {
  late final _$args = ref.$arg as EventAssistanceDepartureHistoryQuery;
  EventAssistanceDepartureHistoryQuery get query => _$args;

  AsyncValue<EventAssistanceDepartureHistorySession> build(
    EventAssistanceDepartureHistoryQuery query,
  );
  @$mustCallSuper
  @override
  WhenComplete runBuild() {
    final ref =
        this.ref
            as $Ref<
              AsyncValue<EventAssistanceDepartureHistorySession>,
              AsyncValue<EventAssistanceDepartureHistorySession>
            >;
    final element =
        ref.element
            as $ClassProviderElement<
              AnyNotifier<
                AsyncValue<EventAssistanceDepartureHistorySession>,
                AsyncValue<EventAssistanceDepartureHistorySession>
              >,
              AsyncValue<EventAssistanceDepartureHistorySession>,
              Object?,
              Object?
            >;
    return element.handleCreate(ref, () => build(_$args));
  }
}

/// One history page for one sign-in period: Firestore listeners on the
/// group's view and the page of departure views. No cache tags or lifetime;
/// writes never invalidate it.

@ProviderFor(eventAssistanceDepartureHistoryForAccount)
final eventAssistanceDepartureHistoryForAccountProvider =
    EventAssistanceDepartureHistoryForAccountFamily._();

/// One history page for one sign-in period: Firestore listeners on the
/// group's view and the page of departure views. No cache tags or lifetime;
/// writes never invalidate it.

final class EventAssistanceDepartureHistoryForAccountProvider
    extends
        $FunctionalProvider<
          AsyncValue<EventAssistanceDepartureHistorySession>,
          EventAssistanceDepartureHistorySession,
          Stream<EventAssistanceDepartureHistorySession>
        >
    with
        $FutureModifier<EventAssistanceDepartureHistorySession>,
        $StreamProvider<EventAssistanceDepartureHistorySession> {
  /// One history page for one sign-in period: Firestore listeners on the
  /// group's view and the page of departure views. No cache tags or lifetime;
  /// writes never invalidate it.
  EventAssistanceDepartureHistoryForAccountProvider._({
    required EventAssistanceDepartureHistoryForAccountFamily super.from,
    required (
      EventAssistanceDepartureHistoryQuery, {
      AuthenticatedSession account,
    })
    super.argument,
  }) : super(
         retry: _noHistoryReadRetry,
         name: r'eventAssistanceDepartureHistoryForAccountProvider',
         isAutoDispose: true,
         dependencies: null,
         $allTransitiveDependencies: null,
       );

  @override
  String debugGetCreateSourceHash() =>
      _$eventAssistanceDepartureHistoryForAccountHash();

  @override
  String toString() {
    return r'eventAssistanceDepartureHistoryForAccountProvider'
        ''
        '$argument';
  }

  @$internal
  @override
  $StreamProviderElement<EventAssistanceDepartureHistorySession> $createElement(
    $ProviderPointer pointer,
  ) => $StreamProviderElement(pointer);

  @override
  Stream<EventAssistanceDepartureHistorySession> create(Ref ref) {
    final argument =
        this.argument
            as (
              EventAssistanceDepartureHistoryQuery, {
              AuthenticatedSession account,
            });
    return eventAssistanceDepartureHistoryForAccount(
      ref,
      argument.$1,
      account: argument.account,
    );
  }

  @override
  bool operator ==(Object other) {
    return other is EventAssistanceDepartureHistoryForAccountProvider &&
        other.argument == argument;
  }

  @override
  int get hashCode {
    return argument.hashCode;
  }
}

String _$eventAssistanceDepartureHistoryForAccountHash() =>
    r'8aed24fbcf10de2460f54730e6739a7b4af8251b';

/// One history page for one sign-in period: Firestore listeners on the
/// group's view and the page of departure views. No cache tags or lifetime;
/// writes never invalidate it.

final class EventAssistanceDepartureHistoryForAccountFamily extends $Family
    with
        $FunctionalFamilyOverride<
          Stream<EventAssistanceDepartureHistorySession>,
          (EventAssistanceDepartureHistoryQuery, {AuthenticatedSession account})
        > {
  EventAssistanceDepartureHistoryForAccountFamily._()
    : super(
        retry: _noHistoryReadRetry,
        name: r'eventAssistanceDepartureHistoryForAccountProvider',
        dependencies: null,
        $allTransitiveDependencies: null,
        isAutoDispose: true,
      );

  /// One history page for one sign-in period: Firestore listeners on the
  /// group's view and the page of departure views. No cache tags or lifetime;
  /// writes never invalidate it.

  EventAssistanceDepartureHistoryForAccountProvider call(
    EventAssistanceDepartureHistoryQuery query, {
    required AuthenticatedSession account,
  }) => EventAssistanceDepartureHistoryForAccountProvider._(
    argument: (query, account: account),
    from: this,
  );

  @override
  String toString() => r'eventAssistanceDepartureHistoryForAccountProvider';
}
