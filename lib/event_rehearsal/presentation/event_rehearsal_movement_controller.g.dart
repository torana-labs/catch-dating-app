// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'event_rehearsal_movement_controller.dart';

// **************************************************************************
// RiverpodGenerator
// **************************************************************************

// GENERATED CODE - DO NOT MODIFY BY HAND
// ignore_for_file: type=lint, type=warning
/// A group owns one pending departure, report or checkpoint decision across
/// refresh and sheet closure. It is never keyed to an arbitrary guest.

@ProviderFor(EventRehearsalMovementController)
final eventRehearsalMovementControllerProvider =
    EventRehearsalMovementControllerFamily._();

/// A group owns one pending departure, report or checkpoint decision across
/// refresh and sheet closure. It is never keyed to an arbitrary guest.
final class EventRehearsalMovementControllerProvider
    extends
        $NotifierProvider<
          EventRehearsalMovementController,
          RehearsalMovementEditorState
        > {
  /// A group owns one pending departure, report or checkpoint decision across
  /// refresh and sheet closure. It is never keyed to an arbitrary guest.
  EventRehearsalMovementControllerProvider._({
    required EventRehearsalMovementControllerFamily super.from,
    required RehearsalMovementScope super.argument,
  }) : super(
         retry: null,
         name: r'eventRehearsalMovementControllerProvider',
         isAutoDispose: true,
         dependencies: null,
         $allTransitiveDependencies: null,
       );

  @override
  String debugGetCreateSourceHash() => _$eventRehearsalMovementControllerHash();

  @override
  String toString() {
    return r'eventRehearsalMovementControllerProvider'
        ''
        '($argument)';
  }

  @$internal
  @override
  EventRehearsalMovementController create() =>
      EventRehearsalMovementController();

  /// {@macro riverpod.override_with_value}
  Override overrideWithValue(RehearsalMovementEditorState value) {
    return $ProviderOverride(
      origin: this,
      providerOverride: $SyncValueProvider<RehearsalMovementEditorState>(value),
    );
  }

  @override
  bool operator ==(Object other) {
    return other is EventRehearsalMovementControllerProvider &&
        other.argument == argument;
  }

  @override
  int get hashCode {
    return argument.hashCode;
  }
}

String _$eventRehearsalMovementControllerHash() =>
    r'7806d25166548f3f2180b8dfec7b6882dbc8bbaa';

/// A group owns one pending departure, report or checkpoint decision across
/// refresh and sheet closure. It is never keyed to an arbitrary guest.

final class EventRehearsalMovementControllerFamily extends $Family
    with
        $ClassFamilyOverride<
          EventRehearsalMovementController,
          RehearsalMovementEditorState,
          RehearsalMovementEditorState,
          RehearsalMovementEditorState,
          RehearsalMovementScope
        > {
  EventRehearsalMovementControllerFamily._()
    : super(
        retry: null,
        name: r'eventRehearsalMovementControllerProvider',
        dependencies: null,
        $allTransitiveDependencies: null,
        isAutoDispose: true,
      );

  /// A group owns one pending departure, report or checkpoint decision across
  /// refresh and sheet closure. It is never keyed to an arbitrary guest.

  EventRehearsalMovementControllerProvider call(RehearsalMovementScope scope) =>
      EventRehearsalMovementControllerProvider._(argument: scope, from: this);

  @override
  String toString() => r'eventRehearsalMovementControllerProvider';
}

/// A group owns one pending departure, report or checkpoint decision across
/// refresh and sheet closure. It is never keyed to an arbitrary guest.

abstract class _$EventRehearsalMovementController
    extends $Notifier<RehearsalMovementEditorState> {
  late final _$args = ref.$arg as RehearsalMovementScope;
  RehearsalMovementScope get scope => _$args;

  RehearsalMovementEditorState build(RehearsalMovementScope scope);
  @$mustCallSuper
  @override
  WhenComplete runBuild() {
    final ref =
        this.ref
            as $Ref<RehearsalMovementEditorState, RehearsalMovementEditorState>;
    final element =
        ref.element
            as $ClassProviderElement<
              AnyNotifier<
                RehearsalMovementEditorState,
                RehearsalMovementEditorState
              >,
              RehearsalMovementEditorState,
              Object?,
              Object?
            >;
    return element.handleCreate(ref, () => build(_$args));
  }
}
