// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'event_assistance_checkpoint_controller.dart';

// **************************************************************************
// RiverpodGenerator
// **************************************************************************

// GENERATED CODE - DO NOT MODIFY BY HAND
// ignore_for_file: type=lint, type=warning
/// One recorded departure owns one pending checkpoint report across review refresh and sheet closure.

@ProviderFor(EventAssistanceCheckpointController)
final eventAssistanceCheckpointControllerProvider =
    EventAssistanceCheckpointControllerFamily._();

/// One recorded departure owns one pending checkpoint report across review refresh and sheet closure.
final class EventAssistanceCheckpointControllerProvider
    extends
        $NotifierProvider<
          EventAssistanceCheckpointController,
          CheckpointEditorState
        > {
  /// One recorded departure owns one pending checkpoint report across review refresh and sheet closure.
  EventAssistanceCheckpointControllerProvider._({
    required EventAssistanceCheckpointControllerFamily super.from,
    required EventAssistanceCheckpointScope super.argument,
  }) : super(
         retry: null,
         name: r'eventAssistanceCheckpointControllerProvider',
         isAutoDispose: true,
         dependencies: null,
         $allTransitiveDependencies: null,
       );

  @override
  String debugGetCreateSourceHash() =>
      _$eventAssistanceCheckpointControllerHash();

  @override
  String toString() {
    return r'eventAssistanceCheckpointControllerProvider'
        ''
        '($argument)';
  }

  @$internal
  @override
  EventAssistanceCheckpointController create() =>
      EventAssistanceCheckpointController();

  /// {@macro riverpod.override_with_value}
  Override overrideWithValue(CheckpointEditorState value) {
    return $ProviderOverride(
      origin: this,
      providerOverride: $SyncValueProvider<CheckpointEditorState>(value),
    );
  }

  @override
  bool operator ==(Object other) {
    return other is EventAssistanceCheckpointControllerProvider &&
        other.argument == argument;
  }

  @override
  int get hashCode {
    return argument.hashCode;
  }
}

String _$eventAssistanceCheckpointControllerHash() =>
    r'ec7021507e563ecc13b60c250ad1bec5e66d301c';

/// One recorded departure owns one pending checkpoint report across review refresh and sheet closure.

final class EventAssistanceCheckpointControllerFamily extends $Family
    with
        $ClassFamilyOverride<
          EventAssistanceCheckpointController,
          CheckpointEditorState,
          CheckpointEditorState,
          CheckpointEditorState,
          EventAssistanceCheckpointScope
        > {
  EventAssistanceCheckpointControllerFamily._()
    : super(
        retry: null,
        name: r'eventAssistanceCheckpointControllerProvider',
        dependencies: null,
        $allTransitiveDependencies: null,
        isAutoDispose: true,
      );

  /// One recorded departure owns one pending checkpoint report across review refresh and sheet closure.

  EventAssistanceCheckpointControllerProvider call(
    EventAssistanceCheckpointScope scope,
  ) => EventAssistanceCheckpointControllerProvider._(
    argument: scope,
    from: this,
  );

  @override
  String toString() => r'eventAssistanceCheckpointControllerProvider';
}

/// One recorded departure owns one pending checkpoint report across review refresh and sheet closure.

abstract class _$EventAssistanceCheckpointController
    extends $Notifier<CheckpointEditorState> {
  late final _$args = ref.$arg as EventAssistanceCheckpointScope;
  EventAssistanceCheckpointScope get scope => _$args;

  CheckpointEditorState build(EventAssistanceCheckpointScope scope);
  @$mustCallSuper
  @override
  WhenComplete runBuild() {
    final ref = this.ref as $Ref<CheckpointEditorState, CheckpointEditorState>;
    final element =
        ref.element
            as $ClassProviderElement<
              AnyNotifier<CheckpointEditorState, CheckpointEditorState>,
              CheckpointEditorState,
              Object?,
              Object?
            >;
    return element.handleCreate(ref, () => build(_$args));
  }
}
