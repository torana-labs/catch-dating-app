// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'event_rehearsal_accountability_controller.dart';

// **************************************************************************
// RiverpodGenerator
// **************************************************************************

// GENERATED CODE - DO NOT MODIFY BY HAND
// ignore_for_file: type=lint, type=warning
/// One synthetic guest owns one pending decision across refresh and closure.

@ProviderFor(EventRehearsalAccountabilityController)
final eventRehearsalAccountabilityControllerProvider =
    EventRehearsalAccountabilityControllerFamily._();

/// One synthetic guest owns one pending decision across refresh and closure.
final class EventRehearsalAccountabilityControllerProvider
    extends
        $NotifierProvider<
          EventRehearsalAccountabilityController,
          RehearsalAccountabilityEditorState
        > {
  /// One synthetic guest owns one pending decision across refresh and closure.
  EventRehearsalAccountabilityControllerProvider._({
    required EventRehearsalAccountabilityControllerFamily super.from,
    required RehearsalAccountabilityScope super.argument,
  }) : super(
         retry: null,
         name: r'eventRehearsalAccountabilityControllerProvider',
         isAutoDispose: true,
         dependencies: null,
         $allTransitiveDependencies: null,
       );

  @override
  String debugGetCreateSourceHash() =>
      _$eventRehearsalAccountabilityControllerHash();

  @override
  String toString() {
    return r'eventRehearsalAccountabilityControllerProvider'
        ''
        '($argument)';
  }

  @$internal
  @override
  EventRehearsalAccountabilityController create() =>
      EventRehearsalAccountabilityController();

  /// {@macro riverpod.override_with_value}
  Override overrideWithValue(RehearsalAccountabilityEditorState value) {
    return $ProviderOverride(
      origin: this,
      providerOverride: $SyncValueProvider<RehearsalAccountabilityEditorState>(
        value,
      ),
    );
  }

  @override
  bool operator ==(Object other) {
    return other is EventRehearsalAccountabilityControllerProvider &&
        other.argument == argument;
  }

  @override
  int get hashCode {
    return argument.hashCode;
  }
}

String _$eventRehearsalAccountabilityControllerHash() =>
    r'd559858722b3f1c3b391bc85829e97a693ce251e';

/// One synthetic guest owns one pending decision across refresh and closure.

final class EventRehearsalAccountabilityControllerFamily extends $Family
    with
        $ClassFamilyOverride<
          EventRehearsalAccountabilityController,
          RehearsalAccountabilityEditorState,
          RehearsalAccountabilityEditorState,
          RehearsalAccountabilityEditorState,
          RehearsalAccountabilityScope
        > {
  EventRehearsalAccountabilityControllerFamily._()
    : super(
        retry: null,
        name: r'eventRehearsalAccountabilityControllerProvider',
        dependencies: null,
        $allTransitiveDependencies: null,
        isAutoDispose: true,
      );

  /// One synthetic guest owns one pending decision across refresh and closure.

  EventRehearsalAccountabilityControllerProvider call(
    RehearsalAccountabilityScope scope,
  ) => EventRehearsalAccountabilityControllerProvider._(
    argument: scope,
    from: this,
  );

  @override
  String toString() => r'eventRehearsalAccountabilityControllerProvider';
}

/// One synthetic guest owns one pending decision across refresh and closure.

abstract class _$EventRehearsalAccountabilityController
    extends $Notifier<RehearsalAccountabilityEditorState> {
  late final _$args = ref.$arg as RehearsalAccountabilityScope;
  RehearsalAccountabilityScope get scope => _$args;

  RehearsalAccountabilityEditorState build(RehearsalAccountabilityScope scope);
  @$mustCallSuper
  @override
  WhenComplete runBuild() {
    final ref =
        this.ref
            as $Ref<
              RehearsalAccountabilityEditorState,
              RehearsalAccountabilityEditorState
            >;
    final element =
        ref.element
            as $ClassProviderElement<
              AnyNotifier<
                RehearsalAccountabilityEditorState,
                RehearsalAccountabilityEditorState
              >,
              RehearsalAccountabilityEditorState,
              Object?,
              Object?
            >;
    return element.handleCreate(ref, () => build(_$args));
  }
}
