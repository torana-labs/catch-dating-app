// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'event_assistance_checkpoint_request_provider.dart';

// **************************************************************************
// RiverpodGenerator
// **************************************************************************

// GENERATED CODE - DO NOT MODIFY BY HAND
// ignore_for_file: type=lint, type=warning
/// The route consumes this outer provider; old-account data is never rendered.

@ProviderFor(EventAssistanceCheckpointRequest)
final eventAssistanceCheckpointRequestProvider =
    EventAssistanceCheckpointRequestFamily._();

/// The route consumes this outer provider; old-account data is never rendered.
final class EventAssistanceCheckpointRequestProvider
    extends
        $NotifierProvider<
          EventAssistanceCheckpointRequest,
          AsyncValue<EventAssistanceCheckpointRequestSession>
        > {
  /// The route consumes this outer provider; old-account data is never rendered.
  EventAssistanceCheckpointRequestProvider._({
    required EventAssistanceCheckpointRequestFamily super.from,
    required EventAssistanceCheckpointScope super.argument,
  }) : super(
         retry: null,
         name: r'eventAssistanceCheckpointRequestProvider',
         isAutoDispose: true,
         dependencies: null,
         $allTransitiveDependencies: null,
       );

  @override
  String debugGetCreateSourceHash() => _$eventAssistanceCheckpointRequestHash();

  @override
  String toString() {
    return r'eventAssistanceCheckpointRequestProvider'
        ''
        '($argument)';
  }

  @$internal
  @override
  EventAssistanceCheckpointRequest create() =>
      EventAssistanceCheckpointRequest();

  /// {@macro riverpod.override_with_value}
  Override overrideWithValue(
    AsyncValue<EventAssistanceCheckpointRequestSession> value,
  ) {
    return $ProviderOverride(
      origin: this,
      providerOverride:
          $SyncValueProvider<
            AsyncValue<EventAssistanceCheckpointRequestSession>
          >(value),
    );
  }

  @override
  bool operator ==(Object other) {
    return other is EventAssistanceCheckpointRequestProvider &&
        other.argument == argument;
  }

  @override
  int get hashCode {
    return argument.hashCode;
  }
}

String _$eventAssistanceCheckpointRequestHash() =>
    r'2a46aa23305b03bb3a1e8387aeb1a278ebe6e732';

/// The route consumes this outer provider; old-account data is never rendered.

final class EventAssistanceCheckpointRequestFamily extends $Family
    with
        $ClassFamilyOverride<
          EventAssistanceCheckpointRequest,
          AsyncValue<EventAssistanceCheckpointRequestSession>,
          AsyncValue<EventAssistanceCheckpointRequestSession>,
          AsyncValue<EventAssistanceCheckpointRequestSession>,
          EventAssistanceCheckpointScope
        > {
  EventAssistanceCheckpointRequestFamily._()
    : super(
        retry: null,
        name: r'eventAssistanceCheckpointRequestProvider',
        dependencies: null,
        $allTransitiveDependencies: null,
        isAutoDispose: true,
      );

  /// The route consumes this outer provider; old-account data is never rendered.

  EventAssistanceCheckpointRequestProvider call(
    EventAssistanceCheckpointScope scope,
  ) => EventAssistanceCheckpointRequestProvider._(argument: scope, from: this);

  @override
  String toString() => r'eventAssistanceCheckpointRequestProvider';
}

/// The route consumes this outer provider; old-account data is never rendered.

abstract class _$EventAssistanceCheckpointRequest
    extends $Notifier<AsyncValue<EventAssistanceCheckpointRequestSession>> {
  late final _$args = ref.$arg as EventAssistanceCheckpointScope;
  EventAssistanceCheckpointScope get scope => _$args;

  AsyncValue<EventAssistanceCheckpointRequestSession> build(
    EventAssistanceCheckpointScope scope,
  );
  @$mustCallSuper
  @override
  WhenComplete runBuild() {
    final ref =
        this.ref
            as $Ref<
              AsyncValue<EventAssistanceCheckpointRequestSession>,
              AsyncValue<EventAssistanceCheckpointRequestSession>
            >;
    final element =
        ref.element
            as $ClassProviderElement<
              AnyNotifier<
                AsyncValue<EventAssistanceCheckpointRequestSession>,
                AsyncValue<EventAssistanceCheckpointRequestSession>
              >,
              AsyncValue<EventAssistanceCheckpointRequestSession>,
              Object?,
              Object?
            >;
    return element.handleCreate(ref, () => build(_$args));
  }
}

/// The checkpoint request review: the checkpoint view and the group's view
/// (the manager's authority) composed on the phone, with no document of its
/// own. A new session follows every delivery of either listener and retires
/// the previous one.

@ProviderFor(eventAssistanceCheckpointRequestForAccount)
final eventAssistanceCheckpointRequestForAccountProvider =
    EventAssistanceCheckpointRequestForAccountFamily._();

/// The checkpoint request review: the checkpoint view and the group's view
/// (the manager's authority) composed on the phone, with no document of its
/// own. A new session follows every delivery of either listener and retires
/// the previous one.

final class EventAssistanceCheckpointRequestForAccountProvider
    extends
        $FunctionalProvider<
          AsyncValue<EventAssistanceCheckpointRequestSession>,
          AsyncValue<EventAssistanceCheckpointRequestSession>,
          AsyncValue<EventAssistanceCheckpointRequestSession>
        >
    with $Provider<AsyncValue<EventAssistanceCheckpointRequestSession>> {
  /// The checkpoint request review: the checkpoint view and the group's view
  /// (the manager's authority) composed on the phone, with no document of its
  /// own. A new session follows every delivery of either listener and retires
  /// the previous one.
  EventAssistanceCheckpointRequestForAccountProvider._({
    required EventAssistanceCheckpointRequestForAccountFamily super.from,
    required (EventAssistanceCheckpointScope, {AuthenticatedSession account})
    super.argument,
  }) : super(
         retry: null,
         name: r'eventAssistanceCheckpointRequestForAccountProvider',
         isAutoDispose: true,
         dependencies: null,
         $allTransitiveDependencies: null,
       );

  @override
  String debugGetCreateSourceHash() =>
      _$eventAssistanceCheckpointRequestForAccountHash();

  @override
  String toString() {
    return r'eventAssistanceCheckpointRequestForAccountProvider'
        ''
        '$argument';
  }

  @$internal
  @override
  $ProviderElement<AsyncValue<EventAssistanceCheckpointRequestSession>>
  $createElement($ProviderPointer pointer) => $ProviderElement(pointer);

  @override
  AsyncValue<EventAssistanceCheckpointRequestSession> create(Ref ref) {
    final argument =
        this.argument
            as (EventAssistanceCheckpointScope, {AuthenticatedSession account});
    return eventAssistanceCheckpointRequestForAccount(
      ref,
      argument.$1,
      account: argument.account,
    );
  }

  /// {@macro riverpod.override_with_value}
  Override overrideWithValue(
    AsyncValue<EventAssistanceCheckpointRequestSession> value,
  ) {
    return $ProviderOverride(
      origin: this,
      providerOverride:
          $SyncValueProvider<
            AsyncValue<EventAssistanceCheckpointRequestSession>
          >(value),
    );
  }

  @override
  bool operator ==(Object other) {
    return other is EventAssistanceCheckpointRequestForAccountProvider &&
        other.argument == argument;
  }

  @override
  int get hashCode {
    return argument.hashCode;
  }
}

String _$eventAssistanceCheckpointRequestForAccountHash() =>
    r'a0bc8f780468c0c64c82b47bc8d1fffbea7a32dd';

/// The checkpoint request review: the checkpoint view and the group's view
/// (the manager's authority) composed on the phone, with no document of its
/// own. A new session follows every delivery of either listener and retires
/// the previous one.

final class EventAssistanceCheckpointRequestForAccountFamily extends $Family
    with
        $FunctionalFamilyOverride<
          AsyncValue<EventAssistanceCheckpointRequestSession>,
          (EventAssistanceCheckpointScope, {AuthenticatedSession account})
        > {
  EventAssistanceCheckpointRequestForAccountFamily._()
    : super(
        retry: null,
        name: r'eventAssistanceCheckpointRequestForAccountProvider',
        dependencies: null,
        $allTransitiveDependencies: null,
        isAutoDispose: true,
      );

  /// The checkpoint request review: the checkpoint view and the group's view
  /// (the manager's authority) composed on the phone, with no document of its
  /// own. A new session follows every delivery of either listener and retires
  /// the previous one.

  EventAssistanceCheckpointRequestForAccountProvider call(
    EventAssistanceCheckpointScope scope, {
    required AuthenticatedSession account,
  }) => EventAssistanceCheckpointRequestForAccountProvider._(
    argument: (scope, account: account),
    from: this,
  );

  @override
  String toString() => r'eventAssistanceCheckpointRequestForAccountProvider';
}
