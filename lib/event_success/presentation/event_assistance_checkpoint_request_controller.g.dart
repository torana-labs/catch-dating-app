// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'event_assistance_checkpoint_request_controller.dart';

// **************************************************************************
// RiverpodGenerator
// **************************************************************************

// GENERATED CODE - DO NOT MODIFY BY HAND
// ignore_for_file: type=lint, type=warning
/// One departure owns one pending request action across review refresh and sheet closure.

@ProviderFor(EventAssistanceCheckpointRequestController)
final eventAssistanceCheckpointRequestControllerProvider =
    EventAssistanceCheckpointRequestControllerFamily._();

/// One departure owns one pending request action across review refresh and sheet closure.
final class EventAssistanceCheckpointRequestControllerProvider
    extends
        $NotifierProvider<
          EventAssistanceCheckpointRequestController,
          CheckpointRequestEditorState
        > {
  /// One departure owns one pending request action across review refresh and sheet closure.
  EventAssistanceCheckpointRequestControllerProvider._({
    required EventAssistanceCheckpointRequestControllerFamily super.from,
    required EventAssistanceCheckpointScope super.argument,
  }) : super(
         retry: null,
         name: r'eventAssistanceCheckpointRequestControllerProvider',
         isAutoDispose: true,
         dependencies: null,
         $allTransitiveDependencies: null,
       );

  @override
  String debugGetCreateSourceHash() =>
      _$eventAssistanceCheckpointRequestControllerHash();

  @override
  String toString() {
    return r'eventAssistanceCheckpointRequestControllerProvider'
        ''
        '($argument)';
  }

  @$internal
  @override
  EventAssistanceCheckpointRequestController create() =>
      EventAssistanceCheckpointRequestController();

  /// {@macro riverpod.override_with_value}
  Override overrideWithValue(CheckpointRequestEditorState value) {
    return $ProviderOverride(
      origin: this,
      providerOverride: $SyncValueProvider<CheckpointRequestEditorState>(value),
    );
  }

  @override
  bool operator ==(Object other) {
    return other is EventAssistanceCheckpointRequestControllerProvider &&
        other.argument == argument;
  }

  @override
  int get hashCode {
    return argument.hashCode;
  }
}

String _$eventAssistanceCheckpointRequestControllerHash() =>
    r'69cde33f6f5999d69f0f2f5f8e02796731e2c47c';

/// One departure owns one pending request action across review refresh and sheet closure.

final class EventAssistanceCheckpointRequestControllerFamily extends $Family
    with
        $ClassFamilyOverride<
          EventAssistanceCheckpointRequestController,
          CheckpointRequestEditorState,
          CheckpointRequestEditorState,
          CheckpointRequestEditorState,
          EventAssistanceCheckpointScope
        > {
  EventAssistanceCheckpointRequestControllerFamily._()
    : super(
        retry: null,
        name: r'eventAssistanceCheckpointRequestControllerProvider',
        dependencies: null,
        $allTransitiveDependencies: null,
        isAutoDispose: true,
      );

  /// One departure owns one pending request action across review refresh and sheet closure.

  EventAssistanceCheckpointRequestControllerProvider call(
    EventAssistanceCheckpointScope scope,
  ) => EventAssistanceCheckpointRequestControllerProvider._(
    argument: scope,
    from: this,
  );

  @override
  String toString() => r'eventAssistanceCheckpointRequestControllerProvider';
}

/// One departure owns one pending request action across review refresh and sheet closure.

abstract class _$EventAssistanceCheckpointRequestController
    extends $Notifier<CheckpointRequestEditorState> {
  late final _$args = ref.$arg as EventAssistanceCheckpointScope;
  EventAssistanceCheckpointScope get scope => _$args;

  CheckpointRequestEditorState build(EventAssistanceCheckpointScope scope);
  @$mustCallSuper
  @override
  WhenComplete runBuild() {
    final ref =
        this.ref
            as $Ref<CheckpointRequestEditorState, CheckpointRequestEditorState>;
    final element =
        ref.element
            as $ClassProviderElement<
              AnyNotifier<
                CheckpointRequestEditorState,
                CheckpointRequestEditorState
              >,
              CheckpointRequestEditorState,
              Object?,
              Object?
            >;
    return element.handleCreate(ref, () => build(_$args));
  }
}
