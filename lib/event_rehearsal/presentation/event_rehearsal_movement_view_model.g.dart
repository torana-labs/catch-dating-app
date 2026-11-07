// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'event_rehearsal_movement_view_model.dart';

// **************************************************************************
// RiverpodGenerator
// **************************************************************************

// GENERATED CODE - DO NOT MODIFY BY HAND
// ignore_for_file: type=lint, type=warning

@ProviderFor(EventRehearsalMovement)
final eventRehearsalMovementProvider = EventRehearsalMovementFamily._();

final class EventRehearsalMovementProvider
    extends
        $NotifierProvider<
          EventRehearsalMovement,
          AsyncValue<RehearsalMovementPage>
        > {
  EventRehearsalMovementProvider._({
    required EventRehearsalMovementFamily super.from,
    required RehearsalMovementSelection super.argument,
  }) : super(
         retry: null,
         name: r'eventRehearsalMovementProvider',
         isAutoDispose: true,
         dependencies: null,
         $allTransitiveDependencies: null,
       );

  @override
  String debugGetCreateSourceHash() => _$eventRehearsalMovementHash();

  @override
  String toString() {
    return r'eventRehearsalMovementProvider'
        ''
        '($argument)';
  }

  @$internal
  @override
  EventRehearsalMovement create() => EventRehearsalMovement();

  /// {@macro riverpod.override_with_value}
  Override overrideWithValue(AsyncValue<RehearsalMovementPage> value) {
    return $ProviderOverride(
      origin: this,
      providerOverride: $SyncValueProvider<AsyncValue<RehearsalMovementPage>>(
        value,
      ),
    );
  }

  @override
  bool operator ==(Object other) {
    return other is EventRehearsalMovementProvider &&
        other.argument == argument;
  }

  @override
  int get hashCode {
    return argument.hashCode;
  }
}

String _$eventRehearsalMovementHash() =>
    r'217c04eec975a32af170e45f3e2e3b8dc2905bb3';

final class EventRehearsalMovementFamily extends $Family
    with
        $ClassFamilyOverride<
          EventRehearsalMovement,
          AsyncValue<RehearsalMovementPage>,
          AsyncValue<RehearsalMovementPage>,
          AsyncValue<RehearsalMovementPage>,
          RehearsalMovementSelection
        > {
  EventRehearsalMovementFamily._()
    : super(
        retry: null,
        name: r'eventRehearsalMovementProvider',
        dependencies: null,
        $allTransitiveDependencies: null,
        isAutoDispose: true,
      );

  EventRehearsalMovementProvider call(RehearsalMovementSelection selection) =>
      EventRehearsalMovementProvider._(argument: selection, from: this);

  @override
  String toString() => r'eventRehearsalMovementProvider';
}

abstract class _$EventRehearsalMovement
    extends $Notifier<AsyncValue<RehearsalMovementPage>> {
  late final _$args = ref.$arg as RehearsalMovementSelection;
  RehearsalMovementSelection get selection => _$args;

  AsyncValue<RehearsalMovementPage> build(RehearsalMovementSelection selection);
  @$mustCallSuper
  @override
  WhenComplete runBuild() {
    final ref =
        this.ref
            as $Ref<
              AsyncValue<RehearsalMovementPage>,
              AsyncValue<RehearsalMovementPage>
            >;
    final element =
        ref.element
            as $ClassProviderElement<
              AnyNotifier<
                AsyncValue<RehearsalMovementPage>,
                AsyncValue<RehearsalMovementPage>
              >,
              AsyncValue<RehearsalMovementPage>,
              Object?,
              Object?
            >;
    return element.handleCreate(ref, () => build(_$args));
  }
}

/// These deliberate reads must describe one runtime revision. Polling can never
/// replace one half of a pending Host review or silently cross a reset.

@ProviderFor(eventRehearsalMovementForAccount)
final eventRehearsalMovementForAccountProvider =
    EventRehearsalMovementForAccountFamily._();

/// These deliberate reads must describe one runtime revision. Polling can never
/// replace one half of a pending Host review or silently cross a reset.

final class EventRehearsalMovementForAccountProvider
    extends
        $FunctionalProvider<
          AsyncValue<RehearsalMovementPage>,
          RehearsalMovementPage,
          FutureOr<RehearsalMovementPage>
        >
    with
        $FutureModifier<RehearsalMovementPage>,
        $FutureProvider<RehearsalMovementPage> {
  /// These deliberate reads must describe one runtime revision. Polling can never
  /// replace one half of a pending Host review or silently cross a reset.
  EventRehearsalMovementForAccountProvider._({
    required EventRehearsalMovementForAccountFamily super.from,
    required (RehearsalMovementSelection, {AuthenticatedSession account})
    super.argument,
  }) : super(
         retry: null,
         name: r'eventRehearsalMovementForAccountProvider',
         isAutoDispose: true,
         dependencies: null,
         $allTransitiveDependencies: null,
       );

  @override
  String debugGetCreateSourceHash() => _$eventRehearsalMovementForAccountHash();

  @override
  String toString() {
    return r'eventRehearsalMovementForAccountProvider'
        ''
        '$argument';
  }

  @$internal
  @override
  $FutureProviderElement<RehearsalMovementPage> $createElement(
    $ProviderPointer pointer,
  ) => $FutureProviderElement(pointer);

  @override
  FutureOr<RehearsalMovementPage> create(Ref ref) {
    final argument =
        this.argument
            as (RehearsalMovementSelection, {AuthenticatedSession account});
    return eventRehearsalMovementForAccount(
      ref,
      argument.$1,
      account: argument.account,
    );
  }

  @override
  bool operator ==(Object other) {
    return other is EventRehearsalMovementForAccountProvider &&
        other.argument == argument;
  }

  @override
  int get hashCode {
    return argument.hashCode;
  }
}

String _$eventRehearsalMovementForAccountHash() =>
    r'4a4edfebb72fd7a8dd771dd31ca61490a5062002';

/// These deliberate reads must describe one runtime revision. Polling can never
/// replace one half of a pending Host review or silently cross a reset.

final class EventRehearsalMovementForAccountFamily extends $Family
    with
        $FunctionalFamilyOverride<
          FutureOr<RehearsalMovementPage>,
          (RehearsalMovementSelection, {AuthenticatedSession account})
        > {
  EventRehearsalMovementForAccountFamily._()
    : super(
        retry: null,
        name: r'eventRehearsalMovementForAccountProvider',
        dependencies: null,
        $allTransitiveDependencies: null,
        isAutoDispose: true,
      );

  /// These deliberate reads must describe one runtime revision. Polling can never
  /// replace one half of a pending Host review or silently cross a reset.

  EventRehearsalMovementForAccountProvider call(
    RehearsalMovementSelection selection, {
    required AuthenticatedSession account,
  }) => EventRehearsalMovementForAccountProvider._(
    argument: (selection, account: account),
    from: this,
  );

  @override
  String toString() => r'eventRehearsalMovementForAccountProvider';
}
