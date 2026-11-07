// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'event_participant_context_provider.dart';

// **************************************************************************
// RiverpodGenerator
// **************************************************************************

// GENERATED CODE - DO NOT MODIFY BY HAND
// ignore_for_file: type=lint, type=warning
/// Account changes and explicit refresh hide prior identity, including same-UID re-entry.

@ProviderFor(EventParticipantContextReader)
final eventParticipantContextReaderProvider =
    EventParticipantContextReaderFamily._();

/// Account changes and explicit refresh hide prior identity, including same-UID re-entry.
final class EventParticipantContextReaderProvider
    extends
        $NotifierProvider<
          EventParticipantContextReader,
          AsyncValue<EventParticipantContextReview>
        > {
  /// Account changes and explicit refresh hide prior identity, including same-UID re-entry.
  EventParticipantContextReaderProvider._({
    required EventParticipantContextReaderFamily super.from,
    required String super.argument,
  }) : super(
         retry: null,
         name: r'eventParticipantContextReaderProvider',
         isAutoDispose: true,
         dependencies: null,
         $allTransitiveDependencies: null,
       );

  @override
  String debugGetCreateSourceHash() => _$eventParticipantContextReaderHash();

  @override
  String toString() {
    return r'eventParticipantContextReaderProvider'
        ''
        '($argument)';
  }

  @$internal
  @override
  EventParticipantContextReader create() => EventParticipantContextReader();

  /// {@macro riverpod.override_with_value}
  Override overrideWithValue(AsyncValue<EventParticipantContextReview> value) {
    return $ProviderOverride(
      origin: this,
      providerOverride:
          $SyncValueProvider<AsyncValue<EventParticipantContextReview>>(value),
    );
  }

  @override
  bool operator ==(Object other) {
    return other is EventParticipantContextReaderProvider &&
        other.argument == argument;
  }

  @override
  int get hashCode {
    return argument.hashCode;
  }
}

String _$eventParticipantContextReaderHash() =>
    r'a7e768796ab5873fb80a3bb75ba60f227b0c0e08';

/// Account changes and explicit refresh hide prior identity, including same-UID re-entry.

final class EventParticipantContextReaderFamily extends $Family
    with
        $ClassFamilyOverride<
          EventParticipantContextReader,
          AsyncValue<EventParticipantContextReview>,
          AsyncValue<EventParticipantContextReview>,
          AsyncValue<EventParticipantContextReview>,
          String
        > {
  EventParticipantContextReaderFamily._()
    : super(
        retry: null,
        name: r'eventParticipantContextReaderProvider',
        dependencies: null,
        $allTransitiveDependencies: null,
        isAutoDispose: true,
      );

  /// Account changes and explicit refresh hide prior identity, including same-UID re-entry.

  EventParticipantContextReaderProvider call(String eventId) =>
      EventParticipantContextReaderProvider._(argument: eventId, from: this);

  @override
  String toString() => r'eventParticipantContextReaderProvider';
}

/// Account changes and explicit refresh hide prior identity, including same-UID re-entry.

abstract class _$EventParticipantContextReader
    extends $Notifier<AsyncValue<EventParticipantContextReview>> {
  late final _$args = ref.$arg as String;
  String get eventId => _$args;

  AsyncValue<EventParticipantContextReview> build(String eventId);
  @$mustCallSuper
  @override
  WhenComplete runBuild() {
    final ref =
        this.ref
            as $Ref<
              AsyncValue<EventParticipantContextReview>,
              AsyncValue<EventParticipantContextReview>
            >;
    final element =
        ref.element
            as $ClassProviderElement<
              AnyNotifier<
                AsyncValue<EventParticipantContextReview>,
                AsyncValue<EventParticipantContextReview>
              >,
              AsyncValue<EventParticipantContextReview>,
              Object?,
              Object?
            >;
    return element.handleCreate(ref, () => build(_$args));
  }
}

@ProviderFor(eventParticipantContextForAccount)
final eventParticipantContextForAccountProvider =
    EventParticipantContextForAccountFamily._();

final class EventParticipantContextForAccountProvider
    extends
        $FunctionalProvider<
          AsyncValue<EventParticipantContextReview>,
          EventParticipantContextReview,
          FutureOr<EventParticipantContextReview>
        >
    with
        $FutureModifier<EventParticipantContextReview>,
        $FutureProvider<EventParticipantContextReview> {
  EventParticipantContextForAccountProvider._({
    required EventParticipantContextForAccountFamily super.from,
    required (String, {AuthenticatedSession account}) super.argument,
  }) : super(
         retry: null,
         name: r'eventParticipantContextForAccountProvider',
         isAutoDispose: true,
         dependencies: null,
         $allTransitiveDependencies: null,
       );

  @override
  String debugGetCreateSourceHash() =>
      _$eventParticipantContextForAccountHash();

  @override
  String toString() {
    return r'eventParticipantContextForAccountProvider'
        ''
        '$argument';
  }

  @$internal
  @override
  $FutureProviderElement<EventParticipantContextReview> $createElement(
    $ProviderPointer pointer,
  ) => $FutureProviderElement(pointer);

  @override
  FutureOr<EventParticipantContextReview> create(Ref ref) {
    final argument = this.argument as (String, {AuthenticatedSession account});
    return eventParticipantContextForAccount(
      ref,
      argument.$1,
      account: argument.account,
    );
  }

  @override
  bool operator ==(Object other) {
    return other is EventParticipantContextForAccountProvider &&
        other.argument == argument;
  }

  @override
  int get hashCode {
    return argument.hashCode;
  }
}

String _$eventParticipantContextForAccountHash() =>
    r'b9d77769224756d086f632af9ff4ccb1542d15dd';

final class EventParticipantContextForAccountFamily extends $Family
    with
        $FunctionalFamilyOverride<
          FutureOr<EventParticipantContextReview>,
          (String, {AuthenticatedSession account})
        > {
  EventParticipantContextForAccountFamily._()
    : super(
        retry: null,
        name: r'eventParticipantContextForAccountProvider',
        dependencies: null,
        $allTransitiveDependencies: null,
        isAutoDispose: true,
      );

  EventParticipantContextForAccountProvider call(
    String eventId, {
    required AuthenticatedSession account,
  }) => EventParticipantContextForAccountProvider._(
    argument: (eventId, account: account),
    from: this,
  );

  @override
  String toString() => r'eventParticipantContextForAccountProvider';
}
