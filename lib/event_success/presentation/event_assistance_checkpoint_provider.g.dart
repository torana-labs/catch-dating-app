// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'event_assistance_checkpoint_provider.dart';

// **************************************************************************
// RiverpodGenerator
// **************************************************************************

// GENERATED CODE - DO NOT MODIFY BY HAND
// ignore_for_file: type=lint, type=warning
/// The route consumes this outer provider; old-account data is never rendered.

@ProviderFor(EventAssistanceCheckpoint)
final eventAssistanceCheckpointProvider = EventAssistanceCheckpointFamily._();

/// The route consumes this outer provider; old-account data is never rendered.
final class EventAssistanceCheckpointProvider
    extends
        $NotifierProvider<
          EventAssistanceCheckpoint,
          AsyncValue<EventAssistanceCheckpointSession>
        > {
  /// The route consumes this outer provider; old-account data is never rendered.
  EventAssistanceCheckpointProvider._({
    required EventAssistanceCheckpointFamily super.from,
    required EventAssistanceCheckpointScope super.argument,
  }) : super(
         retry: null,
         name: r'eventAssistanceCheckpointProvider',
         isAutoDispose: true,
         dependencies: null,
         $allTransitiveDependencies: null,
       );

  @override
  String debugGetCreateSourceHash() => _$eventAssistanceCheckpointHash();

  @override
  String toString() {
    return r'eventAssistanceCheckpointProvider'
        ''
        '($argument)';
  }

  @$internal
  @override
  EventAssistanceCheckpoint create() => EventAssistanceCheckpoint();

  /// {@macro riverpod.override_with_value}
  Override overrideWithValue(
    AsyncValue<EventAssistanceCheckpointSession> value,
  ) {
    return $ProviderOverride(
      origin: this,
      providerOverride:
          $SyncValueProvider<AsyncValue<EventAssistanceCheckpointSession>>(
            value,
          ),
    );
  }

  @override
  bool operator ==(Object other) {
    return other is EventAssistanceCheckpointProvider &&
        other.argument == argument;
  }

  @override
  int get hashCode {
    return argument.hashCode;
  }
}

String _$eventAssistanceCheckpointHash() =>
    r'2b8ff4abb1d12ba2607a55f66d1167fc88e4835e';

/// The route consumes this outer provider; old-account data is never rendered.

final class EventAssistanceCheckpointFamily extends $Family
    with
        $ClassFamilyOverride<
          EventAssistanceCheckpoint,
          AsyncValue<EventAssistanceCheckpointSession>,
          AsyncValue<EventAssistanceCheckpointSession>,
          AsyncValue<EventAssistanceCheckpointSession>,
          EventAssistanceCheckpointScope
        > {
  EventAssistanceCheckpointFamily._()
    : super(
        retry: null,
        name: r'eventAssistanceCheckpointProvider',
        dependencies: null,
        $allTransitiveDependencies: null,
        isAutoDispose: true,
      );

  /// The route consumes this outer provider; old-account data is never rendered.

  EventAssistanceCheckpointProvider call(
    EventAssistanceCheckpointScope scope,
  ) => EventAssistanceCheckpointProvider._(argument: scope, from: this);

  @override
  String toString() => r'eventAssistanceCheckpointProvider';
}

/// The route consumes this outer provider; old-account data is never rendered.

abstract class _$EventAssistanceCheckpoint
    extends $Notifier<AsyncValue<EventAssistanceCheckpointSession>> {
  late final _$args = ref.$arg as EventAssistanceCheckpointScope;
  EventAssistanceCheckpointScope get scope => _$args;

  AsyncValue<EventAssistanceCheckpointSession> build(
    EventAssistanceCheckpointScope scope,
  );
  @$mustCallSuper
  @override
  WhenComplete runBuild() {
    final ref =
        this.ref
            as $Ref<
              AsyncValue<EventAssistanceCheckpointSession>,
              AsyncValue<EventAssistanceCheckpointSession>
            >;
    final element =
        ref.element
            as $ClassProviderElement<
              AnyNotifier<
                AsyncValue<EventAssistanceCheckpointSession>,
                AsyncValue<EventAssistanceCheckpointSession>
              >,
              AsyncValue<EventAssistanceCheckpointSession>,
              Object?,
              Object?
            >;
    return element.handleCreate(ref, () => build(_$args));
  }
}

/// The checkpoint view for one sign-in period. It is a Firestore listener:
/// no cache tags or lifetime, and writes never invalidate it. Each delivery
/// is a new session and retires the previous one.

@ProviderFor(eventAssistanceCheckpointForAccount)
final eventAssistanceCheckpointForAccountProvider =
    EventAssistanceCheckpointForAccountFamily._();

/// The checkpoint view for one sign-in period. It is a Firestore listener:
/// no cache tags or lifetime, and writes never invalidate it. Each delivery
/// is a new session and retires the previous one.

final class EventAssistanceCheckpointForAccountProvider
    extends
        $FunctionalProvider<
          AsyncValue<EventAssistanceCheckpointSession>,
          EventAssistanceCheckpointSession,
          Stream<EventAssistanceCheckpointSession>
        >
    with
        $FutureModifier<EventAssistanceCheckpointSession>,
        $StreamProvider<EventAssistanceCheckpointSession> {
  /// The checkpoint view for one sign-in period. It is a Firestore listener:
  /// no cache tags or lifetime, and writes never invalidate it. Each delivery
  /// is a new session and retires the previous one.
  EventAssistanceCheckpointForAccountProvider._({
    required EventAssistanceCheckpointForAccountFamily super.from,
    required (EventAssistanceCheckpointScope, {AuthenticatedSession account})
    super.argument,
  }) : super(
         retry: _noCheckpointReadRetry,
         name: r'eventAssistanceCheckpointForAccountProvider',
         isAutoDispose: true,
         dependencies: null,
         $allTransitiveDependencies: null,
       );

  @override
  String debugGetCreateSourceHash() =>
      _$eventAssistanceCheckpointForAccountHash();

  @override
  String toString() {
    return r'eventAssistanceCheckpointForAccountProvider'
        ''
        '$argument';
  }

  @$internal
  @override
  $StreamProviderElement<EventAssistanceCheckpointSession> $createElement(
    $ProviderPointer pointer,
  ) => $StreamProviderElement(pointer);

  @override
  Stream<EventAssistanceCheckpointSession> create(Ref ref) {
    final argument =
        this.argument
            as (EventAssistanceCheckpointScope, {AuthenticatedSession account});
    return eventAssistanceCheckpointForAccount(
      ref,
      argument.$1,
      account: argument.account,
    );
  }

  @override
  bool operator ==(Object other) {
    return other is EventAssistanceCheckpointForAccountProvider &&
        other.argument == argument;
  }

  @override
  int get hashCode {
    return argument.hashCode;
  }
}

String _$eventAssistanceCheckpointForAccountHash() =>
    r'37075dd0693a02a3c5a7a58ad3bfd0b4774ba752';

/// The checkpoint view for one sign-in period. It is a Firestore listener:
/// no cache tags or lifetime, and writes never invalidate it. Each delivery
/// is a new session and retires the previous one.

final class EventAssistanceCheckpointForAccountFamily extends $Family
    with
        $FunctionalFamilyOverride<
          Stream<EventAssistanceCheckpointSession>,
          (EventAssistanceCheckpointScope, {AuthenticatedSession account})
        > {
  EventAssistanceCheckpointForAccountFamily._()
    : super(
        retry: _noCheckpointReadRetry,
        name: r'eventAssistanceCheckpointForAccountProvider',
        dependencies: null,
        $allTransitiveDependencies: null,
        isAutoDispose: true,
      );

  /// The checkpoint view for one sign-in period. It is a Firestore listener:
  /// no cache tags or lifetime, and writes never invalidate it. Each delivery
  /// is a new session and retires the previous one.

  EventAssistanceCheckpointForAccountProvider call(
    EventAssistanceCheckpointScope scope, {
    required AuthenticatedSession account,
  }) => EventAssistanceCheckpointForAccountProvider._(
    argument: (scope, account: account),
    from: this,
  );

  @override
  String toString() => r'eventAssistanceCheckpointForAccountProvider';
}
