// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'event_assistance_case_editor.dart';

// **************************************************************************
// RiverpodGenerator
// **************************************************************************

// GENERATED CODE - DO NOT MODIFY BY HAND
// ignore_for_file: type=lint, type=warning
/// One case owns one pending decision across page refresh and sheet closure.

@ProviderFor(EventAssistanceCaseEditor)
final eventAssistanceCaseEditorProvider = EventAssistanceCaseEditorFamily._();

/// One case owns one pending decision across page refresh and sheet closure.
final class EventAssistanceCaseEditorProvider
    extends
        $NotifierProvider<
          EventAssistanceCaseEditor,
          AssistanceCaseEditorState
        > {
  /// One case owns one pending decision across page refresh and sheet closure.
  EventAssistanceCaseEditorProvider._({
    required EventAssistanceCaseEditorFamily super.from,
    required EventAssistanceCaseScope super.argument,
  }) : super(
         retry: null,
         name: r'eventAssistanceCaseEditorProvider',
         isAutoDispose: true,
         dependencies: null,
         $allTransitiveDependencies: null,
       );

  @override
  String debugGetCreateSourceHash() => _$eventAssistanceCaseEditorHash();

  @override
  String toString() {
    return r'eventAssistanceCaseEditorProvider'
        ''
        '($argument)';
  }

  @$internal
  @override
  EventAssistanceCaseEditor create() => EventAssistanceCaseEditor();

  /// {@macro riverpod.override_with_value}
  Override overrideWithValue(AssistanceCaseEditorState value) {
    return $ProviderOverride(
      origin: this,
      providerOverride: $SyncValueProvider<AssistanceCaseEditorState>(value),
    );
  }

  @override
  bool operator ==(Object other) {
    return other is EventAssistanceCaseEditorProvider &&
        other.argument == argument;
  }

  @override
  int get hashCode {
    return argument.hashCode;
  }
}

String _$eventAssistanceCaseEditorHash() =>
    r'ee79f83a5163c78c4b358fff1a076119a55e47bd';

/// One case owns one pending decision across page refresh and sheet closure.

final class EventAssistanceCaseEditorFamily extends $Family
    with
        $ClassFamilyOverride<
          EventAssistanceCaseEditor,
          AssistanceCaseEditorState,
          AssistanceCaseEditorState,
          AssistanceCaseEditorState,
          EventAssistanceCaseScope
        > {
  EventAssistanceCaseEditorFamily._()
    : super(
        retry: null,
        name: r'eventAssistanceCaseEditorProvider',
        dependencies: null,
        $allTransitiveDependencies: null,
        isAutoDispose: true,
      );

  /// One case owns one pending decision across page refresh and sheet closure.

  EventAssistanceCaseEditorProvider call(EventAssistanceCaseScope scope) =>
      EventAssistanceCaseEditorProvider._(argument: scope, from: this);

  @override
  String toString() => r'eventAssistanceCaseEditorProvider';
}

/// One case owns one pending decision across page refresh and sheet closure.

abstract class _$EventAssistanceCaseEditor
    extends $Notifier<AssistanceCaseEditorState> {
  late final _$args = ref.$arg as EventAssistanceCaseScope;
  EventAssistanceCaseScope get scope => _$args;

  AssistanceCaseEditorState build(EventAssistanceCaseScope scope);
  @$mustCallSuper
  @override
  WhenComplete runBuild() {
    final ref =
        this.ref as $Ref<AssistanceCaseEditorState, AssistanceCaseEditorState>;
    final element =
        ref.element
            as $ClassProviderElement<
              AnyNotifier<AssistanceCaseEditorState, AssistanceCaseEditorState>,
              AssistanceCaseEditorState,
              Object?,
              Object?
            >;
    return element.handleCreate(ref, () => build(_$args));
  }
}
