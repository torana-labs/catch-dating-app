// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'event_assistance_group_staff_provider.dart';

// **************************************************************************
// RiverpodGenerator
// **************************************************************************

// GENERATED CODE - DO NOT MODIFY BY HAND
// ignore_for_file: type=lint, type=warning
/// The route consumes this outer provider; old-account data is never rendered.

@ProviderFor(EventAssistanceGroupStaff)
final eventAssistanceGroupStaffProvider = EventAssistanceGroupStaffFamily._();

/// The route consumes this outer provider; old-account data is never rendered.
final class EventAssistanceGroupStaffProvider
    extends
        $NotifierProvider<
          EventAssistanceGroupStaff,
          AsyncValue<EventAssistanceGroupStaffSession>
        > {
  /// The route consumes this outer provider; old-account data is never rendered.
  EventAssistanceGroupStaffProvider._({
    required EventAssistanceGroupStaffFamily super.from,
    required EventAssistanceGroupStaffLookup super.argument,
  }) : super(
         retry: null,
         name: r'eventAssistanceGroupStaffProvider',
         isAutoDispose: true,
         dependencies: null,
         $allTransitiveDependencies: null,
       );

  @override
  String debugGetCreateSourceHash() => _$eventAssistanceGroupStaffHash();

  @override
  String toString() {
    return r'eventAssistanceGroupStaffProvider'
        ''
        '($argument)';
  }

  @$internal
  @override
  EventAssistanceGroupStaff create() => EventAssistanceGroupStaff();

  /// {@macro riverpod.override_with_value}
  Override overrideWithValue(
    AsyncValue<EventAssistanceGroupStaffSession> value,
  ) {
    return $ProviderOverride(
      origin: this,
      providerOverride:
          $SyncValueProvider<AsyncValue<EventAssistanceGroupStaffSession>>(
            value,
          ),
    );
  }

  @override
  bool operator ==(Object other) {
    return other is EventAssistanceGroupStaffProvider &&
        other.argument == argument;
  }

  @override
  int get hashCode {
    return argument.hashCode;
  }
}

String _$eventAssistanceGroupStaffHash() =>
    r'4f67f89d5e8bcd08e271bf82aa072e3f67b895b1';

/// The route consumes this outer provider; old-account data is never rendered.

final class EventAssistanceGroupStaffFamily extends $Family
    with
        $ClassFamilyOverride<
          EventAssistanceGroupStaff,
          AsyncValue<EventAssistanceGroupStaffSession>,
          AsyncValue<EventAssistanceGroupStaffSession>,
          AsyncValue<EventAssistanceGroupStaffSession>,
          EventAssistanceGroupStaffLookup
        > {
  EventAssistanceGroupStaffFamily._()
    : super(
        retry: null,
        name: r'eventAssistanceGroupStaffProvider',
        dependencies: null,
        $allTransitiveDependencies: null,
        isAutoDispose: true,
      );

  /// The route consumes this outer provider; old-account data is never rendered.

  EventAssistanceGroupStaffProvider call(
    EventAssistanceGroupStaffLookup lookup,
  ) => EventAssistanceGroupStaffProvider._(argument: lookup, from: this);

  @override
  String toString() => r'eventAssistanceGroupStaffProvider';
}

/// The route consumes this outer provider; old-account data is never rendered.

abstract class _$EventAssistanceGroupStaff
    extends $Notifier<AsyncValue<EventAssistanceGroupStaffSession>> {
  late final _$args = ref.$arg as EventAssistanceGroupStaffLookup;
  EventAssistanceGroupStaffLookup get lookup => _$args;

  AsyncValue<EventAssistanceGroupStaffSession> build(
    EventAssistanceGroupStaffLookup lookup,
  );
  @$mustCallSuper
  @override
  WhenComplete runBuild() {
    final ref =
        this.ref
            as $Ref<
              AsyncValue<EventAssistanceGroupStaffSession>,
              AsyncValue<EventAssistanceGroupStaffSession>
            >;
    final element =
        ref.element
            as $ClassProviderElement<
              AnyNotifier<
                AsyncValue<EventAssistanceGroupStaffSession>,
                AsyncValue<EventAssistanceGroupStaffSession>
              >,
              AsyncValue<EventAssistanceGroupStaffSession>,
              Object?,
              Object?
            >;
    return element.handleCreate(ref, () => build(_$args));
  }
}

@ProviderFor(eventAssistanceGroupStaffForAccount)
final eventAssistanceGroupStaffForAccountProvider =
    EventAssistanceGroupStaffForAccountFamily._();

final class EventAssistanceGroupStaffForAccountProvider
    extends
        $FunctionalProvider<
          AsyncValue<EventAssistanceGroupStaffSession>,
          EventAssistanceGroupStaffSession,
          FutureOr<EventAssistanceGroupStaffSession>
        >
    with
        $FutureModifier<EventAssistanceGroupStaffSession>,
        $FutureProvider<EventAssistanceGroupStaffSession> {
  EventAssistanceGroupStaffForAccountProvider._({
    required EventAssistanceGroupStaffForAccountFamily super.from,
    required (EventAssistanceGroupStaffLookup, {AuthenticatedSession account})
    super.argument,
  }) : super(
         retry: null,
         name: r'eventAssistanceGroupStaffForAccountProvider',
         isAutoDispose: true,
         dependencies: null,
         $allTransitiveDependencies: null,
       );

  @override
  String debugGetCreateSourceHash() =>
      _$eventAssistanceGroupStaffForAccountHash();

  @override
  String toString() {
    return r'eventAssistanceGroupStaffForAccountProvider'
        ''
        '$argument';
  }

  @$internal
  @override
  $FutureProviderElement<EventAssistanceGroupStaffSession> $createElement(
    $ProviderPointer pointer,
  ) => $FutureProviderElement(pointer);

  @override
  FutureOr<EventAssistanceGroupStaffSession> create(Ref ref) {
    final argument =
        this.argument
            as (
              EventAssistanceGroupStaffLookup, {
              AuthenticatedSession account,
            });
    return eventAssistanceGroupStaffForAccount(
      ref,
      argument.$1,
      account: argument.account,
    );
  }

  @override
  bool operator ==(Object other) {
    return other is EventAssistanceGroupStaffForAccountProvider &&
        other.argument == argument;
  }

  @override
  int get hashCode {
    return argument.hashCode;
  }
}

String _$eventAssistanceGroupStaffForAccountHash() =>
    r'216aefbd749b022be79cf4ef2d0b0b0f2b9aac72';

final class EventAssistanceGroupStaffForAccountFamily extends $Family
    with
        $FunctionalFamilyOverride<
          FutureOr<EventAssistanceGroupStaffSession>,
          (EventAssistanceGroupStaffLookup, {AuthenticatedSession account})
        > {
  EventAssistanceGroupStaffForAccountFamily._()
    : super(
        retry: null,
        name: r'eventAssistanceGroupStaffForAccountProvider',
        dependencies: null,
        $allTransitiveDependencies: null,
        isAutoDispose: true,
      );

  EventAssistanceGroupStaffForAccountProvider call(
    EventAssistanceGroupStaffLookup lookup, {
    required AuthenticatedSession account,
  }) => EventAssistanceGroupStaffForAccountProvider._(
    argument: (lookup, account: account),
    from: this,
  );

  @override
  String toString() => r'eventAssistanceGroupStaffForAccountProvider';
}
