// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'event_rehearsal_runtime_operation_controller.dart';

// **************************************************************************
// RiverpodGenerator
// **************************************************************************

// GENERATED CODE - DO NOT MODIFY BY HAND
// ignore_for_file: type=lint, type=warning
/// Owns one exact runtime request until the backend proves its outcome.
///
/// A multi-unit outcome round advances through one revision-fenced command at
/// a time. If a response is uncertain, the current command and action id stay
/// frozen; a retry resumes that command before it builds the remaining ones.

@ProviderFor(EventRehearsalRuntimeOperationController)
final eventRehearsalRuntimeOperationControllerProvider =
    EventRehearsalRuntimeOperationControllerFamily._();

/// Owns one exact runtime request until the backend proves its outcome.
///
/// A multi-unit outcome round advances through one revision-fenced command at
/// a time. If a response is uncertain, the current command and action id stay
/// frozen; a retry resumes that command before it builds the remaining ones.
final class EventRehearsalRuntimeOperationControllerProvider
    extends
        $NotifierProvider<
          EventRehearsalRuntimeOperationController,
          RehearsalRuntimeOperationState
        > {
  /// Owns one exact runtime request until the backend proves its outcome.
  ///
  /// A multi-unit outcome round advances through one revision-fenced command at
  /// a time. If a response is uncertain, the current command and action id stay
  /// frozen; a retry resumes that command before it builds the remaining ones.
  EventRehearsalRuntimeOperationControllerProvider._({
    required EventRehearsalRuntimeOperationControllerFamily super.from,
    required String super.argument,
  }) : super(
         retry: null,
         name: r'eventRehearsalRuntimeOperationControllerProvider',
         isAutoDispose: true,
         dependencies: null,
         $allTransitiveDependencies: null,
       );

  @override
  String debugGetCreateSourceHash() =>
      _$eventRehearsalRuntimeOperationControllerHash();

  @override
  String toString() {
    return r'eventRehearsalRuntimeOperationControllerProvider'
        ''
        '($argument)';
  }

  @$internal
  @override
  EventRehearsalRuntimeOperationController create() =>
      EventRehearsalRuntimeOperationController();

  /// {@macro riverpod.override_with_value}
  Override overrideWithValue(RehearsalRuntimeOperationState value) {
    return $ProviderOverride(
      origin: this,
      providerOverride: $SyncValueProvider<RehearsalRuntimeOperationState>(
        value,
      ),
    );
  }

  @override
  bool operator ==(Object other) {
    return other is EventRehearsalRuntimeOperationControllerProvider &&
        other.argument == argument;
  }

  @override
  int get hashCode {
    return argument.hashCode;
  }
}

String _$eventRehearsalRuntimeOperationControllerHash() =>
    r'cc872604056a77ef7000dec48cc79174fe47c4c2';

/// Owns one exact runtime request until the backend proves its outcome.
///
/// A multi-unit outcome round advances through one revision-fenced command at
/// a time. If a response is uncertain, the current command and action id stay
/// frozen; a retry resumes that command before it builds the remaining ones.

final class EventRehearsalRuntimeOperationControllerFamily extends $Family
    with
        $ClassFamilyOverride<
          EventRehearsalRuntimeOperationController,
          RehearsalRuntimeOperationState,
          RehearsalRuntimeOperationState,
          RehearsalRuntimeOperationState,
          String
        > {
  EventRehearsalRuntimeOperationControllerFamily._()
    : super(
        retry: null,
        name: r'eventRehearsalRuntimeOperationControllerProvider',
        dependencies: null,
        $allTransitiveDependencies: null,
        isAutoDispose: true,
      );

  /// Owns one exact runtime request until the backend proves its outcome.
  ///
  /// A multi-unit outcome round advances through one revision-fenced command at
  /// a time. If a response is uncertain, the current command and action id stay
  /// frozen; a retry resumes that command before it builds the remaining ones.

  EventRehearsalRuntimeOperationControllerProvider call(String sessionId) =>
      EventRehearsalRuntimeOperationControllerProvider._(
        argument: sessionId,
        from: this,
      );

  @override
  String toString() => r'eventRehearsalRuntimeOperationControllerProvider';
}

/// Owns one exact runtime request until the backend proves its outcome.
///
/// A multi-unit outcome round advances through one revision-fenced command at
/// a time. If a response is uncertain, the current command and action id stay
/// frozen; a retry resumes that command before it builds the remaining ones.

abstract class _$EventRehearsalRuntimeOperationController
    extends $Notifier<RehearsalRuntimeOperationState> {
  late final _$args = ref.$arg as String;
  String get sessionId => _$args;

  RehearsalRuntimeOperationState build(String sessionId);
  @$mustCallSuper
  @override
  WhenComplete runBuild() {
    final ref =
        this.ref
            as $Ref<
              RehearsalRuntimeOperationState,
              RehearsalRuntimeOperationState
            >;
    final element =
        ref.element
            as $ClassProviderElement<
              AnyNotifier<
                RehearsalRuntimeOperationState,
                RehearsalRuntimeOperationState
              >,
              RehearsalRuntimeOperationState,
              Object?,
              Object?
            >;
    return element.handleCreate(ref, () => build(_$args));
  }
}
