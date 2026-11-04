// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'event_assistance_accountability_provider.dart';

// **************************************************************************
// RiverpodGenerator
// **************************************************************************

// GENERATED CODE - DO NOT MODIFY BY HAND
// ignore_for_file: type=lint, type=warning
/// The route consumes this outer provider; old-account data is never rendered.

@ProviderFor(EventAssistanceAccountability)
final eventAssistanceAccountabilityProvider =
    EventAssistanceAccountabilityFamily._();

/// The route consumes this outer provider; old-account data is never rendered.
final class EventAssistanceAccountabilityProvider
    extends
        $NotifierProvider<
          EventAssistanceAccountability,
          AsyncValue<EventAssistanceAccountabilitySession>
        > {
  /// The route consumes this outer provider; old-account data is never rendered.
  EventAssistanceAccountabilityProvider._({
    required EventAssistanceAccountabilityFamily super.from,
    required EventAssistanceAccountabilityScope super.argument,
  }) : super(
         retry: null,
         name: r'eventAssistanceAccountabilityProvider',
         isAutoDispose: true,
         dependencies: null,
         $allTransitiveDependencies: null,
       );

  @override
  String debugGetCreateSourceHash() => _$eventAssistanceAccountabilityHash();

  @override
  String toString() {
    return r'eventAssistanceAccountabilityProvider'
        ''
        '($argument)';
  }

  @$internal
  @override
  EventAssistanceAccountability create() => EventAssistanceAccountability();

  /// {@macro riverpod.override_with_value}
  Override overrideWithValue(
    AsyncValue<EventAssistanceAccountabilitySession> value,
  ) {
    return $ProviderOverride(
      origin: this,
      providerOverride:
          $SyncValueProvider<AsyncValue<EventAssistanceAccountabilitySession>>(
            value,
          ),
    );
  }

  @override
  bool operator ==(Object other) {
    return other is EventAssistanceAccountabilityProvider &&
        other.argument == argument;
  }

  @override
  int get hashCode {
    return argument.hashCode;
  }
}

String _$eventAssistanceAccountabilityHash() =>
    r'0e14d319b88967d168dd7afebeee2b3b49d4daaf';

/// The route consumes this outer provider; old-account data is never rendered.

final class EventAssistanceAccountabilityFamily extends $Family
    with
        $ClassFamilyOverride<
          EventAssistanceAccountability,
          AsyncValue<EventAssistanceAccountabilitySession>,
          AsyncValue<EventAssistanceAccountabilitySession>,
          AsyncValue<EventAssistanceAccountabilitySession>,
          EventAssistanceAccountabilityScope
        > {
  EventAssistanceAccountabilityFamily._()
    : super(
        retry: null,
        name: r'eventAssistanceAccountabilityProvider',
        dependencies: null,
        $allTransitiveDependencies: null,
        isAutoDispose: true,
      );

  /// The route consumes this outer provider; old-account data is never rendered.

  EventAssistanceAccountabilityProvider call(
    EventAssistanceAccountabilityScope scope,
  ) => EventAssistanceAccountabilityProvider._(argument: scope, from: this);

  @override
  String toString() => r'eventAssistanceAccountabilityProvider';
}

/// The route consumes this outer provider; old-account data is never rendered.

abstract class _$EventAssistanceAccountability
    extends $Notifier<AsyncValue<EventAssistanceAccountabilitySession>> {
  late final _$args = ref.$arg as EventAssistanceAccountabilityScope;
  EventAssistanceAccountabilityScope get scope => _$args;

  AsyncValue<EventAssistanceAccountabilitySession> build(
    EventAssistanceAccountabilityScope scope,
  );
  @$mustCallSuper
  @override
  WhenComplete runBuild() {
    final ref =
        this.ref
            as $Ref<
              AsyncValue<EventAssistanceAccountabilitySession>,
              AsyncValue<EventAssistanceAccountabilitySession>
            >;
    final element =
        ref.element
            as $ClassProviderElement<
              AnyNotifier<
                AsyncValue<EventAssistanceAccountabilitySession>,
                AsyncValue<EventAssistanceAccountabilitySession>
              >,
              AsyncValue<EventAssistanceAccountabilitySession>,
              Object?,
              Object?
            >;
    return element.handleCreate(ref, () => build(_$args));
  }
}

/// The guest's visit review for one sign-in period. It is a Firestore
/// listener: it declares no cache tags or lifetime and writes never
/// invalidate it. Each delivery is a new session and retires the previous
/// one, so a decision built on an older snapshot asks for a fresh review.

@ProviderFor(eventAssistanceAccountabilityForAccount)
final eventAssistanceAccountabilityForAccountProvider =
    EventAssistanceAccountabilityForAccountFamily._();

/// The guest's visit review for one sign-in period. It is a Firestore
/// listener: it declares no cache tags or lifetime and writes never
/// invalidate it. Each delivery is a new session and retires the previous
/// one, so a decision built on an older snapshot asks for a fresh review.

final class EventAssistanceAccountabilityForAccountProvider
    extends
        $FunctionalProvider<
          AsyncValue<EventAssistanceAccountabilitySession>,
          EventAssistanceAccountabilitySession,
          Stream<EventAssistanceAccountabilitySession>
        >
    with
        $FutureModifier<EventAssistanceAccountabilitySession>,
        $StreamProvider<EventAssistanceAccountabilitySession> {
  /// The guest's visit review for one sign-in period. It is a Firestore
  /// listener: it declares no cache tags or lifetime and writes never
  /// invalidate it. Each delivery is a new session and retires the previous
  /// one, so a decision built on an older snapshot asks for a fresh review.
  EventAssistanceAccountabilityForAccountProvider._({
    required EventAssistanceAccountabilityForAccountFamily super.from,
    required (
      EventAssistanceAccountabilityScope, {
      AuthenticatedSession account,
    })
    super.argument,
  }) : super(
         retry: _noAccountabilityReadRetry,
         name: r'eventAssistanceAccountabilityForAccountProvider',
         isAutoDispose: true,
         dependencies: null,
         $allTransitiveDependencies: null,
       );

  @override
  String debugGetCreateSourceHash() =>
      _$eventAssistanceAccountabilityForAccountHash();

  @override
  String toString() {
    return r'eventAssistanceAccountabilityForAccountProvider'
        ''
        '$argument';
  }

  @$internal
  @override
  $StreamProviderElement<EventAssistanceAccountabilitySession> $createElement(
    $ProviderPointer pointer,
  ) => $StreamProviderElement(pointer);

  @override
  Stream<EventAssistanceAccountabilitySession> create(Ref ref) {
    final argument =
        this.argument
            as (
              EventAssistanceAccountabilityScope, {
              AuthenticatedSession account,
            });
    return eventAssistanceAccountabilityForAccount(
      ref,
      argument.$1,
      account: argument.account,
    );
  }

  @override
  bool operator ==(Object other) {
    return other is EventAssistanceAccountabilityForAccountProvider &&
        other.argument == argument;
  }

  @override
  int get hashCode {
    return argument.hashCode;
  }
}

String _$eventAssistanceAccountabilityForAccountHash() =>
    r'fcfafb90113de5747b4c05fd8494a35ececd0ae4';

/// The guest's visit review for one sign-in period. It is a Firestore
/// listener: it declares no cache tags or lifetime and writes never
/// invalidate it. Each delivery is a new session and retires the previous
/// one, so a decision built on an older snapshot asks for a fresh review.

final class EventAssistanceAccountabilityForAccountFamily extends $Family
    with
        $FunctionalFamilyOverride<
          Stream<EventAssistanceAccountabilitySession>,
          (EventAssistanceAccountabilityScope, {AuthenticatedSession account})
        > {
  EventAssistanceAccountabilityForAccountFamily._()
    : super(
        retry: _noAccountabilityReadRetry,
        name: r'eventAssistanceAccountabilityForAccountProvider',
        dependencies: null,
        $allTransitiveDependencies: null,
        isAutoDispose: true,
      );

  /// The guest's visit review for one sign-in period. It is a Firestore
  /// listener: it declares no cache tags or lifetime and writes never
  /// invalidate it. Each delivery is a new session and retires the previous
  /// one, so a decision built on an older snapshot asks for a fresh review.

  EventAssistanceAccountabilityForAccountProvider call(
    EventAssistanceAccountabilityScope scope, {
    required AuthenticatedSession account,
  }) => EventAssistanceAccountabilityForAccountProvider._(
    argument: (scope, account: account),
    from: this,
  );

  @override
  String toString() => r'eventAssistanceAccountabilityForAccountProvider';
}
