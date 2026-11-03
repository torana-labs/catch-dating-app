// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'event_assistance_departure_provider.dart';

// **************************************************************************
// RiverpodGenerator
// **************************************************************************

// GENERATED CODE - DO NOT MODIFY BY HAND
// ignore_for_file: type=lint, type=warning

@ProviderFor(eventAssistanceDepartureAccount)
final eventAssistanceDepartureAccountProvider =
    EventAssistanceDepartureAccountProvider._();

final class EventAssistanceDepartureAccountProvider
    extends
        $FunctionalProvider<
          AsyncValue<EventDepartureAccount>,
          AsyncValue<EventDepartureAccount>,
          AsyncValue<EventDepartureAccount>
        >
    with $Provider<AsyncValue<EventDepartureAccount>> {
  EventAssistanceDepartureAccountProvider._()
    : super(
        from: null,
        argument: null,
        retry: null,
        name: r'eventAssistanceDepartureAccountProvider',
        isAutoDispose: true,
        dependencies: null,
        $allTransitiveDependencies: null,
      );

  @override
  String debugGetCreateSourceHash() => _$eventAssistanceDepartureAccountHash();

  @$internal
  @override
  $ProviderElement<AsyncValue<EventDepartureAccount>> $createElement(
    $ProviderPointer pointer,
  ) => $ProviderElement(pointer);

  @override
  AsyncValue<EventDepartureAccount> create(Ref ref) {
    return eventAssistanceDepartureAccount(ref);
  }

  /// {@macro riverpod.override_with_value}
  Override overrideWithValue(AsyncValue<EventDepartureAccount> value) {
    return $ProviderOverride(
      origin: this,
      providerOverride: $SyncValueProvider<AsyncValue<EventDepartureAccount>>(
        value,
      ),
    );
  }
}

String _$eventAssistanceDepartureAccountHash() =>
    r'b418529a30e4906b38363e12587c52e6297cfff3';

@ProviderFor(EventAssistanceDeparture)
final eventAssistanceDepartureProvider = EventAssistanceDepartureFamily._();

final class EventAssistanceDepartureProvider
    extends
        $NotifierProvider<
          EventAssistanceDeparture,
          AsyncValue<EventDepartureSession>
        > {
  EventAssistanceDepartureProvider._({
    required EventAssistanceDepartureFamily super.from,
    required EventAssistanceGroupScope super.argument,
  }) : super(
         retry: null,
         name: r'eventAssistanceDepartureProvider',
         isAutoDispose: true,
         dependencies: null,
         $allTransitiveDependencies: null,
       );

  @override
  String debugGetCreateSourceHash() => _$eventAssistanceDepartureHash();

  @override
  String toString() {
    return r'eventAssistanceDepartureProvider'
        ''
        '($argument)';
  }

  @$internal
  @override
  EventAssistanceDeparture create() => EventAssistanceDeparture();

  /// {@macro riverpod.override_with_value}
  Override overrideWithValue(AsyncValue<EventDepartureSession> value) {
    return $ProviderOverride(
      origin: this,
      providerOverride: $SyncValueProvider<AsyncValue<EventDepartureSession>>(
        value,
      ),
    );
  }

  @override
  bool operator ==(Object other) {
    return other is EventAssistanceDepartureProvider &&
        other.argument == argument;
  }

  @override
  int get hashCode {
    return argument.hashCode;
  }
}

String _$eventAssistanceDepartureHash() =>
    r'c5fffe52d94311d0b47c2502c161e7a9c0196570';

final class EventAssistanceDepartureFamily extends $Family
    with
        $ClassFamilyOverride<
          EventAssistanceDeparture,
          AsyncValue<EventDepartureSession>,
          AsyncValue<EventDepartureSession>,
          AsyncValue<EventDepartureSession>,
          EventAssistanceGroupScope
        > {
  EventAssistanceDepartureFamily._()
    : super(
        retry: null,
        name: r'eventAssistanceDepartureProvider',
        dependencies: null,
        $allTransitiveDependencies: null,
        isAutoDispose: true,
      );

  EventAssistanceDepartureProvider call(EventAssistanceGroupScope scope) =>
      EventAssistanceDepartureProvider._(argument: scope, from: this);

  @override
  String toString() => r'eventAssistanceDepartureProvider';
}

abstract class _$EventAssistanceDeparture
    extends $Notifier<AsyncValue<EventDepartureSession>> {
  late final _$args = ref.$arg as EventAssistanceGroupScope;
  EventAssistanceGroupScope get scope => _$args;

  AsyncValue<EventDepartureSession> build(EventAssistanceGroupScope scope);
  @$mustCallSuper
  @override
  WhenComplete runBuild() {
    final ref =
        this.ref
            as $Ref<
              AsyncValue<EventDepartureSession>,
              AsyncValue<EventDepartureSession>
            >;
    final element =
        ref.element
            as $ClassProviderElement<
              AnyNotifier<
                AsyncValue<EventDepartureSession>,
                AsyncValue<EventDepartureSession>
              >,
              AsyncValue<EventDepartureSession>,
              Object?,
              Object?
            >;
    return element.handleCreate(ref, () => build(_$args));
  }
}

/// The group's departure view for one sign-in period. It is a Firestore
/// listener: it declares no cache tags or lifetime and writes never
/// invalidate it. Each delivery is a new session and retires the previous
/// one, so a decision built on an older snapshot asks for a fresh review
/// instead of being replaced in the background.

@ProviderFor(eventAssistanceDepartureForAccount)
final eventAssistanceDepartureForAccountProvider =
    EventAssistanceDepartureForAccountFamily._();

/// The group's departure view for one sign-in period. It is a Firestore
/// listener: it declares no cache tags or lifetime and writes never
/// invalidate it. Each delivery is a new session and retires the previous
/// one, so a decision built on an older snapshot asks for a fresh review
/// instead of being replaced in the background.

final class EventAssistanceDepartureForAccountProvider
    extends
        $FunctionalProvider<
          AsyncValue<EventDepartureSession>,
          EventDepartureSession,
          Stream<EventDepartureSession>
        >
    with
        $FutureModifier<EventDepartureSession>,
        $StreamProvider<EventDepartureSession> {
  /// The group's departure view for one sign-in period. It is a Firestore
  /// listener: it declares no cache tags or lifetime and writes never
  /// invalidate it. Each delivery is a new session and retires the previous
  /// one, so a decision built on an older snapshot asks for a fresh review
  /// instead of being replaced in the background.
  EventAssistanceDepartureForAccountProvider._({
    required EventAssistanceDepartureForAccountFamily super.from,
    required (EventAssistanceGroupScope, {EventDepartureAccount account})
    super.argument,
  }) : super(
         retry: _noDepartureReadRetry,
         name: r'eventAssistanceDepartureForAccountProvider',
         isAutoDispose: true,
         dependencies: null,
         $allTransitiveDependencies: null,
       );

  @override
  String debugGetCreateSourceHash() =>
      _$eventAssistanceDepartureForAccountHash();

  @override
  String toString() {
    return r'eventAssistanceDepartureForAccountProvider'
        ''
        '$argument';
  }

  @$internal
  @override
  $StreamProviderElement<EventDepartureSession> $createElement(
    $ProviderPointer pointer,
  ) => $StreamProviderElement(pointer);

  @override
  Stream<EventDepartureSession> create(Ref ref) {
    final argument =
        this.argument
            as (EventAssistanceGroupScope, {EventDepartureAccount account});
    return eventAssistanceDepartureForAccount(
      ref,
      argument.$1,
      account: argument.account,
    );
  }

  @override
  bool operator ==(Object other) {
    return other is EventAssistanceDepartureForAccountProvider &&
        other.argument == argument;
  }

  @override
  int get hashCode {
    return argument.hashCode;
  }
}

String _$eventAssistanceDepartureForAccountHash() =>
    r'e7a3fdae2cbf49942dc8d108993ba5af52f75cce';

/// The group's departure view for one sign-in period. It is a Firestore
/// listener: it declares no cache tags or lifetime and writes never
/// invalidate it. Each delivery is a new session and retires the previous
/// one, so a decision built on an older snapshot asks for a fresh review
/// instead of being replaced in the background.

final class EventAssistanceDepartureForAccountFamily extends $Family
    with
        $FunctionalFamilyOverride<
          Stream<EventDepartureSession>,
          (EventAssistanceGroupScope, {EventDepartureAccount account})
        > {
  EventAssistanceDepartureForAccountFamily._()
    : super(
        retry: _noDepartureReadRetry,
        name: r'eventAssistanceDepartureForAccountProvider',
        dependencies: null,
        $allTransitiveDependencies: null,
        isAutoDispose: true,
      );

  /// The group's departure view for one sign-in period. It is a Firestore
  /// listener: it declares no cache tags or lifetime and writes never
  /// invalidate it. Each delivery is a new session and retires the previous
  /// one, so a decision built on an older snapshot asks for a fresh review
  /// instead of being replaced in the background.

  EventAssistanceDepartureForAccountProvider call(
    EventAssistanceGroupScope scope, {
    required EventDepartureAccount account,
  }) => EventAssistanceDepartureForAccountProvider._(
    argument: (scope, account: account),
    from: this,
  );

  @override
  String toString() => r'eventAssistanceDepartureForAccountProvider';
}
