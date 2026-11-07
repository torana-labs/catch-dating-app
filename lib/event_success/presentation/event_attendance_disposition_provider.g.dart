// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'event_attendance_disposition_provider.dart';

// **************************************************************************
// RiverpodGenerator
// **************************************************************************

// GENERATED CODE - DO NOT MODIFY BY HAND
// ignore_for_file: type=lint, type=warning

@ProviderFor(EventAttendanceDisposition)
final eventAttendanceDispositionProvider = EventAttendanceDispositionFamily._();

final class EventAttendanceDispositionProvider
    extends
        $NotifierProvider<
          EventAttendanceDisposition,
          AsyncValue<EventAttendanceDispositionReview>
        > {
  EventAttendanceDispositionProvider._({
    required EventAttendanceDispositionFamily super.from,
    required EventAssistanceGuestScope super.argument,
  }) : super(
         retry: null,
         name: r'eventAttendanceDispositionProvider',
         isAutoDispose: true,
         dependencies: null,
         $allTransitiveDependencies: null,
       );

  @override
  String debugGetCreateSourceHash() => _$eventAttendanceDispositionHash();

  @override
  String toString() {
    return r'eventAttendanceDispositionProvider'
        ''
        '($argument)';
  }

  @$internal
  @override
  EventAttendanceDisposition create() => EventAttendanceDisposition();

  /// {@macro riverpod.override_with_value}
  Override overrideWithValue(
    AsyncValue<EventAttendanceDispositionReview> value,
  ) {
    return $ProviderOverride(
      origin: this,
      providerOverride:
          $SyncValueProvider<AsyncValue<EventAttendanceDispositionReview>>(
            value,
          ),
    );
  }

  @override
  bool operator ==(Object other) {
    return other is EventAttendanceDispositionProvider &&
        other.argument == argument;
  }

  @override
  int get hashCode {
    return argument.hashCode;
  }
}

String _$eventAttendanceDispositionHash() =>
    r'5a09a0304b55ee69e504a948a756aba2bef87fe7';

final class EventAttendanceDispositionFamily extends $Family
    with
        $ClassFamilyOverride<
          EventAttendanceDisposition,
          AsyncValue<EventAttendanceDispositionReview>,
          AsyncValue<EventAttendanceDispositionReview>,
          AsyncValue<EventAttendanceDispositionReview>,
          EventAssistanceGuestScope
        > {
  EventAttendanceDispositionFamily._()
    : super(
        retry: null,
        name: r'eventAttendanceDispositionProvider',
        dependencies: null,
        $allTransitiveDependencies: null,
        isAutoDispose: true,
      );

  EventAttendanceDispositionProvider call(EventAssistanceGuestScope scope) =>
      EventAttendanceDispositionProvider._(argument: scope, from: this);

  @override
  String toString() => r'eventAttendanceDispositionProvider';
}

abstract class _$EventAttendanceDisposition
    extends $Notifier<AsyncValue<EventAttendanceDispositionReview>> {
  late final _$args = ref.$arg as EventAssistanceGuestScope;
  EventAssistanceGuestScope get scope => _$args;

  AsyncValue<EventAttendanceDispositionReview> build(
    EventAssistanceGuestScope scope,
  );
  @$mustCallSuper
  @override
  WhenComplete runBuild() {
    final ref =
        this.ref
            as $Ref<
              AsyncValue<EventAttendanceDispositionReview>,
              AsyncValue<EventAttendanceDispositionReview>
            >;
    final element =
        ref.element
            as $ClassProviderElement<
              AnyNotifier<
                AsyncValue<EventAttendanceDispositionReview>,
                AsyncValue<EventAttendanceDispositionReview>
              >,
              AsyncValue<EventAttendanceDispositionReview>,
              Object?,
              Object?
            >;
    return element.handleCreate(ref, () => build(_$args));
  }
}

@ProviderFor(eventAttendanceDispositionForAccount)
final eventAttendanceDispositionForAccountProvider =
    EventAttendanceDispositionForAccountFamily._();

final class EventAttendanceDispositionForAccountProvider
    extends
        $FunctionalProvider<
          AsyncValue<EventAttendanceDispositionReview>,
          EventAttendanceDispositionReview,
          FutureOr<EventAttendanceDispositionReview>
        >
    with
        $FutureModifier<EventAttendanceDispositionReview>,
        $FutureProvider<EventAttendanceDispositionReview> {
  EventAttendanceDispositionForAccountProvider._({
    required EventAttendanceDispositionForAccountFamily super.from,
    required (EventAssistanceGuestScope, {EventAssistanceAccount account})
    super.argument,
  }) : super(
         retry: null,
         name: r'eventAttendanceDispositionForAccountProvider',
         isAutoDispose: true,
         dependencies: null,
         $allTransitiveDependencies: null,
       );

  @override
  String debugGetCreateSourceHash() =>
      _$eventAttendanceDispositionForAccountHash();

  @override
  String toString() {
    return r'eventAttendanceDispositionForAccountProvider'
        ''
        '$argument';
  }

  @$internal
  @override
  $FutureProviderElement<EventAttendanceDispositionReview> $createElement(
    $ProviderPointer pointer,
  ) => $FutureProviderElement(pointer);

  @override
  FutureOr<EventAttendanceDispositionReview> create(Ref ref) {
    final argument =
        this.argument
            as (EventAssistanceGuestScope, {EventAssistanceAccount account});
    return eventAttendanceDispositionForAccount(
      ref,
      argument.$1,
      account: argument.account,
    );
  }

  @override
  bool operator ==(Object other) {
    return other is EventAttendanceDispositionForAccountProvider &&
        other.argument == argument;
  }

  @override
  int get hashCode {
    return argument.hashCode;
  }
}

String _$eventAttendanceDispositionForAccountHash() =>
    r'f91a5d9d7937583fffa0f641c79aa5591d0be905';

final class EventAttendanceDispositionForAccountFamily extends $Family
    with
        $FunctionalFamilyOverride<
          FutureOr<EventAttendanceDispositionReview>,
          (EventAssistanceGuestScope, {EventAssistanceAccount account})
        > {
  EventAttendanceDispositionForAccountFamily._()
    : super(
        retry: null,
        name: r'eventAttendanceDispositionForAccountProvider',
        dependencies: null,
        $allTransitiveDependencies: null,
        isAutoDispose: true,
      );

  EventAttendanceDispositionForAccountProvider call(
    EventAssistanceGuestScope scope, {
    required EventAssistanceAccount account,
  }) => EventAttendanceDispositionForAccountProvider._(
    argument: (scope, account: account),
    from: this,
  );

  @override
  String toString() => r'eventAttendanceDispositionForAccountProvider';
}
