// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'event_assistance_runtime_editor.dart';

// **************************************************************************
// RiverpodGenerator
// **************************************************************************

// GENERATED CODE - DO NOT MODIFY BY HAND
// ignore_for_file: type=lint, type=warning
/// One event owns one pending automation decision across page refresh and sheet closure.

@ProviderFor(EventAssistanceRuntimeEditor)
final eventAssistanceRuntimeEditorProvider =
    EventAssistanceRuntimeEditorFamily._();

/// One event owns one pending automation decision across page refresh and sheet closure.
final class EventAssistanceRuntimeEditorProvider
    extends
        $NotifierProvider<
          EventAssistanceRuntimeEditor,
          AssistanceRuntimeEditorState
        > {
  /// One event owns one pending automation decision across page refresh and sheet closure.
  EventAssistanceRuntimeEditorProvider._({
    required EventAssistanceRuntimeEditorFamily super.from,
    required EventAssistanceRuntimeScope super.argument,
  }) : super(
         retry: null,
         name: r'eventAssistanceRuntimeEditorProvider',
         isAutoDispose: true,
         dependencies: null,
         $allTransitiveDependencies: null,
       );

  @override
  String debugGetCreateSourceHash() => _$eventAssistanceRuntimeEditorHash();

  @override
  String toString() {
    return r'eventAssistanceRuntimeEditorProvider'
        ''
        '($argument)';
  }

  @$internal
  @override
  EventAssistanceRuntimeEditor create() => EventAssistanceRuntimeEditor();

  /// {@macro riverpod.override_with_value}
  Override overrideWithValue(AssistanceRuntimeEditorState value) {
    return $ProviderOverride(
      origin: this,
      providerOverride: $SyncValueProvider<AssistanceRuntimeEditorState>(value),
    );
  }

  @override
  bool operator ==(Object other) {
    return other is EventAssistanceRuntimeEditorProvider &&
        other.argument == argument;
  }

  @override
  int get hashCode {
    return argument.hashCode;
  }
}

String _$eventAssistanceRuntimeEditorHash() =>
    r'9c4d846a618a85b3bfcc8dade3563afe7089d16a';

/// One event owns one pending automation decision across page refresh and sheet closure.

final class EventAssistanceRuntimeEditorFamily extends $Family
    with
        $ClassFamilyOverride<
          EventAssistanceRuntimeEditor,
          AssistanceRuntimeEditorState,
          AssistanceRuntimeEditorState,
          AssistanceRuntimeEditorState,
          EventAssistanceRuntimeScope
        > {
  EventAssistanceRuntimeEditorFamily._()
    : super(
        retry: null,
        name: r'eventAssistanceRuntimeEditorProvider',
        dependencies: null,
        $allTransitiveDependencies: null,
        isAutoDispose: true,
      );

  /// One event owns one pending automation decision across page refresh and sheet closure.

  EventAssistanceRuntimeEditorProvider call(
    EventAssistanceRuntimeScope scope,
  ) => EventAssistanceRuntimeEditorProvider._(argument: scope, from: this);

  @override
  String toString() => r'eventAssistanceRuntimeEditorProvider';
}

/// One event owns one pending automation decision across page refresh and sheet closure.

abstract class _$EventAssistanceRuntimeEditor
    extends $Notifier<AssistanceRuntimeEditorState> {
  late final _$args = ref.$arg as EventAssistanceRuntimeScope;
  EventAssistanceRuntimeScope get scope => _$args;

  AssistanceRuntimeEditorState build(EventAssistanceRuntimeScope scope);
  @$mustCallSuper
  @override
  WhenComplete runBuild() {
    final ref =
        this.ref
            as $Ref<AssistanceRuntimeEditorState, AssistanceRuntimeEditorState>;
    final element =
        ref.element
            as $ClassProviderElement<
              AnyNotifier<
                AssistanceRuntimeEditorState,
                AssistanceRuntimeEditorState
              >,
              AssistanceRuntimeEditorState,
              Object?,
              Object?
            >;
    return element.handleCreate(ref, () => build(_$args));
  }
}
