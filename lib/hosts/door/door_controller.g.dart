// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'door_controller.dart';

// **************************************************************************
// RiverpodGenerator
// **************************************************************************

// GENERATED CODE - DO NOT MODIFY BY HAND
// ignore_for_file: type=lint, type=warning
/// The door's commands and local state. Check-in and undo go through the
/// attendance outbox; let in and offer through the roster commands. After
/// a command nothing is invalidated: the listeners deliver the result, and
/// the local state lets go once they have.

@ProviderFor(DoorSession)
final doorSessionProvider = DoorSessionFamily._();

/// The door's commands and local state. Check-in and undo go through the
/// attendance outbox; let in and offer through the roster commands. After
/// a command nothing is invalidated: the listeners deliver the result, and
/// the local state lets go once they have.
final class DoorSessionProvider
    extends $NotifierProvider<DoorSession, DoorSessionState> {
  /// The door's commands and local state. Check-in and undo go through the
  /// attendance outbox; let in and offer through the roster commands. After
  /// a command nothing is invalidated: the listeners deliver the result, and
  /// the local state lets go once they have.
  DoorSessionProvider._({
    required DoorSessionFamily super.from,
    required String super.argument,
  }) : super(
         retry: null,
         name: r'doorSessionProvider',
         isAutoDispose: true,
         dependencies: null,
         $allTransitiveDependencies: null,
       );

  @override
  String debugGetCreateSourceHash() => _$doorSessionHash();

  @override
  String toString() {
    return r'doorSessionProvider'
        ''
        '($argument)';
  }

  @$internal
  @override
  DoorSession create() => DoorSession();

  /// {@macro riverpod.override_with_value}
  Override overrideWithValue(DoorSessionState value) {
    return $ProviderOverride(
      origin: this,
      providerOverride: $SyncValueProvider<DoorSessionState>(value),
    );
  }

  @override
  bool operator ==(Object other) {
    return other is DoorSessionProvider && other.argument == argument;
  }

  @override
  int get hashCode {
    return argument.hashCode;
  }
}

String _$doorSessionHash() => r'5a6917dcaed8ee8f9224ec5372d9703f752f8ee6';

/// The door's commands and local state. Check-in and undo go through the
/// attendance outbox; let in and offer through the roster commands. After
/// a command nothing is invalidated: the listeners deliver the result, and
/// the local state lets go once they have.

final class DoorSessionFamily extends $Family
    with
        $ClassFamilyOverride<
          DoorSession,
          DoorSessionState,
          DoorSessionState,
          DoorSessionState,
          String
        > {
  DoorSessionFamily._()
    : super(
        retry: null,
        name: r'doorSessionProvider',
        dependencies: null,
        $allTransitiveDependencies: null,
        isAutoDispose: true,
      );

  /// The door's commands and local state. Check-in and undo go through the
  /// attendance outbox; let in and offer through the roster commands. After
  /// a command nothing is invalidated: the listeners deliver the result, and
  /// the local state lets go once they have.

  DoorSessionProvider call(String eventId) =>
      DoorSessionProvider._(argument: eventId, from: this);

  @override
  String toString() => r'doorSessionProvider';
}

/// The door's commands and local state. Check-in and undo go through the
/// attendance outbox; let in and offer through the roster commands. After
/// a command nothing is invalidated: the listeners deliver the result, and
/// the local state lets go once they have.

abstract class _$DoorSession extends $Notifier<DoorSessionState> {
  late final _$args = ref.$arg as String;
  String get eventId => _$args;

  DoorSessionState build(String eventId);
  @$mustCallSuper
  @override
  WhenComplete runBuild() {
    final ref = this.ref as $Ref<DoorSessionState, DoorSessionState>;
    final element =
        ref.element
            as $ClassProviderElement<
              AnyNotifier<DoorSessionState, DoorSessionState>,
              DoorSessionState,
              Object?,
              Object?
            >;
    return element.handleCreate(ref, () => build(_$args));
  }
}

/// The door for one event, composed from its listeners: the attendees
/// (who is booked and who is in), the participations (who is waiting or
/// asking), the roster labels (first-timers and history) and the event,
/// with the door's own outbox, filter and search over them.

@ProviderFor(doorController)
final doorControllerProvider = DoorControllerFamily._();

/// The door for one event, composed from its listeners: the attendees
/// (who is booked and who is in), the participations (who is waiting or
/// asking), the roster labels (first-timers and history) and the event,
/// with the door's own outbox, filter and search over them.

final class DoorControllerProvider
    extends $FunctionalProvider<DoorState, DoorState, DoorState>
    with $Provider<DoorState> {
  /// The door for one event, composed from its listeners: the attendees
  /// (who is booked and who is in), the participations (who is waiting or
  /// asking), the roster labels (first-timers and history) and the event,
  /// with the door's own outbox, filter and search over them.
  DoorControllerProvider._({
    required DoorControllerFamily super.from,
    required String super.argument,
  }) : super(
         retry: null,
         name: r'doorControllerProvider',
         isAutoDispose: true,
         dependencies: null,
         $allTransitiveDependencies: null,
       );

  @override
  String debugGetCreateSourceHash() => _$doorControllerHash();

  @override
  String toString() {
    return r'doorControllerProvider'
        ''
        '($argument)';
  }

  @$internal
  @override
  $ProviderElement<DoorState> $createElement($ProviderPointer pointer) =>
      $ProviderElement(pointer);

  @override
  DoorState create(Ref ref) {
    final argument = this.argument as String;
    return doorController(ref, argument);
  }

  /// {@macro riverpod.override_with_value}
  Override overrideWithValue(DoorState value) {
    return $ProviderOverride(
      origin: this,
      providerOverride: $SyncValueProvider<DoorState>(value),
    );
  }

  @override
  bool operator ==(Object other) {
    return other is DoorControllerProvider && other.argument == argument;
  }

  @override
  int get hashCode {
    return argument.hashCode;
  }
}

String _$doorControllerHash() => r'222524c24b9676057823c81d662097d5daa6358c';

/// The door for one event, composed from its listeners: the attendees
/// (who is booked and who is in), the participations (who is waiting or
/// asking), the roster labels (first-timers and history) and the event,
/// with the door's own outbox, filter and search over them.

final class DoorControllerFamily extends $Family
    with $FunctionalFamilyOverride<DoorState, String> {
  DoorControllerFamily._()
    : super(
        retry: null,
        name: r'doorControllerProvider',
        dependencies: null,
        $allTransitiveDependencies: null,
        isAutoDispose: true,
      );

  /// The door for one event, composed from its listeners: the attendees
  /// (who is booked and who is in), the participations (who is waiting or
  /// asking), the roster labels (first-timers and history) and the event,
  /// with the door's own outbox, filter and search over them.

  DoorControllerProvider call(String eventId) =>
      DoorControllerProvider._(argument: eventId, from: this);

  @override
  String toString() => r'doorControllerProvider';
}
