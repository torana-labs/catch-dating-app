// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'event_assistance_runtime_provider.dart';

// **************************************************************************
// RiverpodGenerator
// **************************************************************************

// GENERATED CODE - DO NOT MODIFY BY HAND
// ignore_for_file: type=lint, type=warning

@ProviderFor(EventAssistanceRuntime)
final eventAssistanceRuntimeProvider = EventAssistanceRuntimeFamily._();

final class EventAssistanceRuntimeProvider
    extends
        $NotifierProvider<
          EventAssistanceRuntime,
          AsyncValue<AssistanceRuntimeSession>
        > {
  EventAssistanceRuntimeProvider._({
    required EventAssistanceRuntimeFamily super.from,
    required EventAssistanceRuntimeScope super.argument,
  }) : super(
         retry: null,
         name: r'eventAssistanceRuntimeProvider',
         isAutoDispose: true,
         dependencies: null,
         $allTransitiveDependencies: null,
       );

  @override
  String debugGetCreateSourceHash() => _$eventAssistanceRuntimeHash();

  @override
  String toString() {
    return r'eventAssistanceRuntimeProvider'
        ''
        '($argument)';
  }

  @$internal
  @override
  EventAssistanceRuntime create() => EventAssistanceRuntime();

  /// {@macro riverpod.override_with_value}
  Override overrideWithValue(AsyncValue<AssistanceRuntimeSession> value) {
    return $ProviderOverride(
      origin: this,
      providerOverride:
          $SyncValueProvider<AsyncValue<AssistanceRuntimeSession>>(value),
    );
  }

  @override
  bool operator ==(Object other) {
    return other is EventAssistanceRuntimeProvider &&
        other.argument == argument;
  }

  @override
  int get hashCode {
    return argument.hashCode;
  }
}

String _$eventAssistanceRuntimeHash() =>
    r'a9ee4e2e44e36025ea4aea6ec825db48d0fad5dd';

final class EventAssistanceRuntimeFamily extends $Family
    with
        $ClassFamilyOverride<
          EventAssistanceRuntime,
          AsyncValue<AssistanceRuntimeSession>,
          AsyncValue<AssistanceRuntimeSession>,
          AsyncValue<AssistanceRuntimeSession>,
          EventAssistanceRuntimeScope
        > {
  EventAssistanceRuntimeFamily._()
    : super(
        retry: null,
        name: r'eventAssistanceRuntimeProvider',
        dependencies: null,
        $allTransitiveDependencies: null,
        isAutoDispose: true,
      );

  EventAssistanceRuntimeProvider call(EventAssistanceRuntimeScope query) =>
      EventAssistanceRuntimeProvider._(argument: query, from: this);

  @override
  String toString() => r'eventAssistanceRuntimeProvider';
}

abstract class _$EventAssistanceRuntime
    extends $Notifier<AsyncValue<AssistanceRuntimeSession>> {
  late final _$args = ref.$arg as EventAssistanceRuntimeScope;
  EventAssistanceRuntimeScope get query => _$args;

  AsyncValue<AssistanceRuntimeSession> build(EventAssistanceRuntimeScope query);
  @$mustCallSuper
  @override
  WhenComplete runBuild() {
    final ref =
        this.ref
            as $Ref<
              AsyncValue<AssistanceRuntimeSession>,
              AsyncValue<AssistanceRuntimeSession>
            >;
    final element =
        ref.element
            as $ClassProviderElement<
              AnyNotifier<
                AsyncValue<AssistanceRuntimeSession>,
                AsyncValue<AssistanceRuntimeSession>
              >,
              AsyncValue<AssistanceRuntimeSession>,
              Object?,
              Object?
            >;
    return element.handleCreate(ref, () => build(_$args));
  }
}

/// The event's automation for one sign-in period, without sender choices.
/// It is a Firestore listener: no cache tags or lifetime, and writes never
/// invalidate it. Each delivery is a new session and retires the previous
/// one.

@ProviderFor(eventAssistanceRuntimeForAccount)
final eventAssistanceRuntimeForAccountProvider =
    EventAssistanceRuntimeForAccountFamily._();

/// The event's automation for one sign-in period, without sender choices.
/// It is a Firestore listener: no cache tags or lifetime, and writes never
/// invalidate it. Each delivery is a new session and retires the previous
/// one.

final class EventAssistanceRuntimeForAccountProvider
    extends
        $FunctionalProvider<
          AsyncValue<AssistanceRuntimeSession>,
          AssistanceRuntimeSession,
          Stream<AssistanceRuntimeSession>
        >
    with
        $FutureModifier<AssistanceRuntimeSession>,
        $StreamProvider<AssistanceRuntimeSession> {
  /// The event's automation for one sign-in period, without sender choices.
  /// It is a Firestore listener: no cache tags or lifetime, and writes never
  /// invalidate it. Each delivery is a new session and retires the previous
  /// one.
  EventAssistanceRuntimeForAccountProvider._({
    required EventAssistanceRuntimeForAccountFamily super.from,
    required (EventAssistanceRuntimeScope, {EventAssistanceAccount account})
    super.argument,
  }) : super(
         retry: _noRuntimeReadRetry,
         name: r'eventAssistanceRuntimeForAccountProvider',
         isAutoDispose: true,
         dependencies: null,
         $allTransitiveDependencies: null,
       );

  @override
  String debugGetCreateSourceHash() => _$eventAssistanceRuntimeForAccountHash();

  @override
  String toString() {
    return r'eventAssistanceRuntimeForAccountProvider'
        ''
        '$argument';
  }

  @$internal
  @override
  $StreamProviderElement<AssistanceRuntimeSession> $createElement(
    $ProviderPointer pointer,
  ) => $StreamProviderElement(pointer);

  @override
  Stream<AssistanceRuntimeSession> create(Ref ref) {
    final argument =
        this.argument
            as (EventAssistanceRuntimeScope, {EventAssistanceAccount account});
    return eventAssistanceRuntimeForAccount(
      ref,
      argument.$1,
      account: argument.account,
    );
  }

  @override
  bool operator ==(Object other) {
    return other is EventAssistanceRuntimeForAccountProvider &&
        other.argument == argument;
  }

  @override
  int get hashCode {
    return argument.hashCode;
  }
}

String _$eventAssistanceRuntimeForAccountHash() =>
    r'96105593f23d19bb1316e22fa99c24d2bf75a91c';

/// The event's automation for one sign-in period, without sender choices.
/// It is a Firestore listener: no cache tags or lifetime, and writes never
/// invalidate it. Each delivery is a new session and retires the previous
/// one.

final class EventAssistanceRuntimeForAccountFamily extends $Family
    with
        $FunctionalFamilyOverride<
          Stream<AssistanceRuntimeSession>,
          (EventAssistanceRuntimeScope, {EventAssistanceAccount account})
        > {
  EventAssistanceRuntimeForAccountFamily._()
    : super(
        retry: _noRuntimeReadRetry,
        name: r'eventAssistanceRuntimeForAccountProvider',
        dependencies: null,
        $allTransitiveDependencies: null,
        isAutoDispose: true,
      );

  /// The event's automation for one sign-in period, without sender choices.
  /// It is a Firestore listener: no cache tags or lifetime, and writes never
  /// invalidate it. Each delivery is a new session and retires the previous
  /// one.

  EventAssistanceRuntimeForAccountProvider call(
    EventAssistanceRuntimeScope query, {
    required EventAssistanceAccount account,
  }) => EventAssistanceRuntimeForAccountProvider._(
    argument: (query, account: account),
    from: this,
  );

  @override
  String toString() => r'eventAssistanceRuntimeForAccountProvider';
}
