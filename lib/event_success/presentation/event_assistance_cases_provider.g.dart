// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'event_assistance_cases_provider.dart';

// **************************************************************************
// RiverpodGenerator
// **************************************************************************

// GENERATED CODE - DO NOT MODIFY BY HAND
// ignore_for_file: type=lint, type=warning

@ProviderFor(EventAssistanceCases)
final eventAssistanceCasesProvider = EventAssistanceCasesFamily._();

final class EventAssistanceCasesProvider
    extends
        $NotifierProvider<
          EventAssistanceCases,
          AsyncValue<EventAssistanceCasesSession>
        > {
  EventAssistanceCasesProvider._({
    required EventAssistanceCasesFamily super.from,
    required EventAssistanceCaseQuery super.argument,
  }) : super(
         retry: null,
         name: r'eventAssistanceCasesProvider',
         isAutoDispose: true,
         dependencies: null,
         $allTransitiveDependencies: null,
       );

  @override
  String debugGetCreateSourceHash() => _$eventAssistanceCasesHash();

  @override
  String toString() {
    return r'eventAssistanceCasesProvider'
        ''
        '($argument)';
  }

  @$internal
  @override
  EventAssistanceCases create() => EventAssistanceCases();

  /// {@macro riverpod.override_with_value}
  Override overrideWithValue(AsyncValue<EventAssistanceCasesSession> value) {
    return $ProviderOverride(
      origin: this,
      providerOverride:
          $SyncValueProvider<AsyncValue<EventAssistanceCasesSession>>(value),
    );
  }

  @override
  bool operator ==(Object other) {
    return other is EventAssistanceCasesProvider && other.argument == argument;
  }

  @override
  int get hashCode {
    return argument.hashCode;
  }
}

String _$eventAssistanceCasesHash() =>
    r'ccc24999e198cd330f8398092454931175993680';

final class EventAssistanceCasesFamily extends $Family
    with
        $ClassFamilyOverride<
          EventAssistanceCases,
          AsyncValue<EventAssistanceCasesSession>,
          AsyncValue<EventAssistanceCasesSession>,
          AsyncValue<EventAssistanceCasesSession>,
          EventAssistanceCaseQuery
        > {
  EventAssistanceCasesFamily._()
    : super(
        retry: null,
        name: r'eventAssistanceCasesProvider',
        dependencies: null,
        $allTransitiveDependencies: null,
        isAutoDispose: true,
      );

  EventAssistanceCasesProvider call(EventAssistanceCaseQuery query) =>
      EventAssistanceCasesProvider._(argument: query, from: this);

  @override
  String toString() => r'eventAssistanceCasesProvider';
}

abstract class _$EventAssistanceCases
    extends $Notifier<AsyncValue<EventAssistanceCasesSession>> {
  late final _$args = ref.$arg as EventAssistanceCaseQuery;
  EventAssistanceCaseQuery get query => _$args;

  AsyncValue<EventAssistanceCasesSession> build(EventAssistanceCaseQuery query);
  @$mustCallSuper
  @override
  WhenComplete runBuild() {
    final ref =
        this.ref
            as $Ref<
              AsyncValue<EventAssistanceCasesSession>,
              AsyncValue<EventAssistanceCasesSession>
            >;
    final element =
        ref.element
            as $ClassProviderElement<
              AnyNotifier<
                AsyncValue<EventAssistanceCasesSession>,
                AsyncValue<EventAssistanceCasesSession>
              >,
              AsyncValue<EventAssistanceCasesSession>,
              Object?,
              Object?
            >;
    return element.handleCreate(ref, () => build(_$args));
  }
}

/// The help-request page read owner. It is a Firestore listener: it declares
/// no cache tags or lifetime, and commands never invalidate it; the case view
/// triggers deliver their result.

@ProviderFor(eventAssistanceCasesForAccount)
final eventAssistanceCasesForAccountProvider =
    EventAssistanceCasesForAccountFamily._();

/// The help-request page read owner. It is a Firestore listener: it declares
/// no cache tags or lifetime, and commands never invalidate it; the case view
/// triggers deliver their result.

final class EventAssistanceCasesForAccountProvider
    extends
        $FunctionalProvider<
          AsyncValue<EventAssistanceCasesSession>,
          EventAssistanceCasesSession,
          Stream<EventAssistanceCasesSession>
        >
    with
        $FutureModifier<EventAssistanceCasesSession>,
        $StreamProvider<EventAssistanceCasesSession> {
  /// The help-request page read owner. It is a Firestore listener: it declares
  /// no cache tags or lifetime, and commands never invalidate it; the case view
  /// triggers deliver their result.
  EventAssistanceCasesForAccountProvider._({
    required EventAssistanceCasesForAccountFamily super.from,
    required (EventAssistanceCaseQuery, {EventAssistanceAccount account})
    super.argument,
  }) : super(
         retry: _noCaseReadRetry,
         name: r'eventAssistanceCasesForAccountProvider',
         isAutoDispose: true,
         dependencies: null,
         $allTransitiveDependencies: null,
       );

  @override
  String debugGetCreateSourceHash() => _$eventAssistanceCasesForAccountHash();

  @override
  String toString() {
    return r'eventAssistanceCasesForAccountProvider'
        ''
        '$argument';
  }

  @$internal
  @override
  $StreamProviderElement<EventAssistanceCasesSession> $createElement(
    $ProviderPointer pointer,
  ) => $StreamProviderElement(pointer);

  @override
  Stream<EventAssistanceCasesSession> create(Ref ref) {
    final argument =
        this.argument
            as (EventAssistanceCaseQuery, {EventAssistanceAccount account});
    return eventAssistanceCasesForAccount(
      ref,
      argument.$1,
      account: argument.account,
    );
  }

  @override
  bool operator ==(Object other) {
    return other is EventAssistanceCasesForAccountProvider &&
        other.argument == argument;
  }

  @override
  int get hashCode {
    return argument.hashCode;
  }
}

String _$eventAssistanceCasesForAccountHash() =>
    r'f23ace2070ceb369b70790599e5f96458e880b74';

/// The help-request page read owner. It is a Firestore listener: it declares
/// no cache tags or lifetime, and commands never invalidate it; the case view
/// triggers deliver their result.

final class EventAssistanceCasesForAccountFamily extends $Family
    with
        $FunctionalFamilyOverride<
          Stream<EventAssistanceCasesSession>,
          (EventAssistanceCaseQuery, {EventAssistanceAccount account})
        > {
  EventAssistanceCasesForAccountFamily._()
    : super(
        retry: _noCaseReadRetry,
        name: r'eventAssistanceCasesForAccountProvider',
        dependencies: null,
        $allTransitiveDependencies: null,
        isAutoDispose: true,
      );

  /// The help-request page read owner. It is a Firestore listener: it declares
  /// no cache tags or lifetime, and commands never invalidate it; the case view
  /// triggers deliver their result.

  EventAssistanceCasesForAccountProvider call(
    EventAssistanceCaseQuery query, {
    required EventAssistanceAccount account,
  }) => EventAssistanceCasesForAccountProvider._(
    argument: (query, account: account),
    from: this,
  );

  @override
  String toString() => r'eventAssistanceCasesForAccountProvider';
}
