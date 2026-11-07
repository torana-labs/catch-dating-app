// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'event_assistance_participation_provider.dart';

// **************************************************************************
// RiverpodGenerator
// **************************************************************************

// GENERATED CODE - DO NOT MODIFY BY HAND
// ignore_for_file: type=lint, type=warning
/// The route consumes this outer provider; old-account data is never rendered.

@ProviderFor(EventAssistanceParticipationReview)
final eventAssistanceParticipationReviewProvider =
    EventAssistanceParticipationReviewFamily._();

/// The route consumes this outer provider; old-account data is never rendered.
final class EventAssistanceParticipationReviewProvider
    extends
        $NotifierProvider<
          EventAssistanceParticipationReview,
          AsyncValue<EventParticipationSession>
        > {
  /// The route consumes this outer provider; old-account data is never rendered.
  EventAssistanceParticipationReviewProvider._({
    required EventAssistanceParticipationReviewFamily super.from,
    required EventAssistanceGuestScope super.argument,
  }) : super(
         retry: null,
         name: r'eventAssistanceParticipationReviewProvider',
         isAutoDispose: true,
         dependencies: null,
         $allTransitiveDependencies: null,
       );

  @override
  String debugGetCreateSourceHash() =>
      _$eventAssistanceParticipationReviewHash();

  @override
  String toString() {
    return r'eventAssistanceParticipationReviewProvider'
        ''
        '($argument)';
  }

  @$internal
  @override
  EventAssistanceParticipationReview create() =>
      EventAssistanceParticipationReview();

  /// {@macro riverpod.override_with_value}
  Override overrideWithValue(AsyncValue<EventParticipationSession> value) {
    return $ProviderOverride(
      origin: this,
      providerOverride:
          $SyncValueProvider<AsyncValue<EventParticipationSession>>(value),
    );
  }

  @override
  bool operator ==(Object other) {
    return other is EventAssistanceParticipationReviewProvider &&
        other.argument == argument;
  }

  @override
  int get hashCode {
    return argument.hashCode;
  }
}

String _$eventAssistanceParticipationReviewHash() =>
    r'1fe84022986fb52f8a72eb50d3ec25af8548789d';

/// The route consumes this outer provider; old-account data is never rendered.

final class EventAssistanceParticipationReviewFamily extends $Family
    with
        $ClassFamilyOverride<
          EventAssistanceParticipationReview,
          AsyncValue<EventParticipationSession>,
          AsyncValue<EventParticipationSession>,
          AsyncValue<EventParticipationSession>,
          EventAssistanceGuestScope
        > {
  EventAssistanceParticipationReviewFamily._()
    : super(
        retry: null,
        name: r'eventAssistanceParticipationReviewProvider',
        dependencies: null,
        $allTransitiveDependencies: null,
        isAutoDispose: true,
      );

  /// The route consumes this outer provider; old-account data is never rendered.

  EventAssistanceParticipationReviewProvider call(
    EventAssistanceGuestScope scope,
  ) =>
      EventAssistanceParticipationReviewProvider._(argument: scope, from: this);

  @override
  String toString() => r'eventAssistanceParticipationReviewProvider';
}

/// The route consumes this outer provider; old-account data is never rendered.

abstract class _$EventAssistanceParticipationReview
    extends $Notifier<AsyncValue<EventParticipationSession>> {
  late final _$args = ref.$arg as EventAssistanceGuestScope;
  EventAssistanceGuestScope get scope => _$args;

  AsyncValue<EventParticipationSession> build(EventAssistanceGuestScope scope);
  @$mustCallSuper
  @override
  WhenComplete runBuild() {
    final ref =
        this.ref
            as $Ref<
              AsyncValue<EventParticipationSession>,
              AsyncValue<EventParticipationSession>
            >;
    final element =
        ref.element
            as $ClassProviderElement<
              AnyNotifier<
                AsyncValue<EventParticipationSession>,
                AsyncValue<EventParticipationSession>
              >,
              AsyncValue<EventParticipationSession>,
              Object?,
              Object?
            >;
    return element.handleCreate(ref, () => build(_$args));
  }
}

@ProviderFor(eventAssistanceParticipationForAccount)
final eventAssistanceParticipationForAccountProvider =
    EventAssistanceParticipationForAccountFamily._();

final class EventAssistanceParticipationForAccountProvider
    extends
        $FunctionalProvider<
          AsyncValue<EventParticipationSession>,
          EventParticipationSession,
          FutureOr<EventParticipationSession>
        >
    with
        $FutureModifier<EventParticipationSession>,
        $FutureProvider<EventParticipationSession> {
  EventAssistanceParticipationForAccountProvider._({
    required EventAssistanceParticipationForAccountFamily super.from,
    required (EventAssistanceGuestScope, {AuthenticatedSession account})
    super.argument,
  }) : super(
         retry: null,
         name: r'eventAssistanceParticipationForAccountProvider',
         isAutoDispose: true,
         dependencies: null,
         $allTransitiveDependencies: null,
       );

  @override
  String debugGetCreateSourceHash() =>
      _$eventAssistanceParticipationForAccountHash();

  @override
  String toString() {
    return r'eventAssistanceParticipationForAccountProvider'
        ''
        '$argument';
  }

  @$internal
  @override
  $FutureProviderElement<EventParticipationSession> $createElement(
    $ProviderPointer pointer,
  ) => $FutureProviderElement(pointer);

  @override
  FutureOr<EventParticipationSession> create(Ref ref) {
    final argument =
        this.argument
            as (EventAssistanceGuestScope, {AuthenticatedSession account});
    return eventAssistanceParticipationForAccount(
      ref,
      argument.$1,
      account: argument.account,
    );
  }

  @override
  bool operator ==(Object other) {
    return other is EventAssistanceParticipationForAccountProvider &&
        other.argument == argument;
  }

  @override
  int get hashCode {
    return argument.hashCode;
  }
}

String _$eventAssistanceParticipationForAccountHash() =>
    r'd6407024590514e13a59321eb7ec486d35079ed9';

final class EventAssistanceParticipationForAccountFamily extends $Family
    with
        $FunctionalFamilyOverride<
          FutureOr<EventParticipationSession>,
          (EventAssistanceGuestScope, {AuthenticatedSession account})
        > {
  EventAssistanceParticipationForAccountFamily._()
    : super(
        retry: null,
        name: r'eventAssistanceParticipationForAccountProvider',
        dependencies: null,
        $allTransitiveDependencies: null,
        isAutoDispose: true,
      );

  EventAssistanceParticipationForAccountProvider call(
    EventAssistanceGuestScope scope, {
    required AuthenticatedSession account,
  }) => EventAssistanceParticipationForAccountProvider._(
    argument: (scope, account: account),
    from: this,
  );

  @override
  String toString() => r'eventAssistanceParticipationForAccountProvider';
}
