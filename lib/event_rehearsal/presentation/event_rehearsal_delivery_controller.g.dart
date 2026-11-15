// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'event_rehearsal_delivery_controller.dart';

// **************************************************************************
// RiverpodGenerator
// **************************************************************************

// GENERATED CODE - DO NOT MODIFY BY HAND
// ignore_for_file: type=lint, type=warning
/// One message owns one pending request across page refreshes and sheet closure.

@ProviderFor(EventRehearsalDeliveryController)
final eventRehearsalDeliveryControllerProvider =
    EventRehearsalDeliveryControllerFamily._();

/// One message owns one pending request across page refreshes and sheet closure.
final class EventRehearsalDeliveryControllerProvider
    extends
        $NotifierProvider<
          EventRehearsalDeliveryController,
          RehearsalDeliveryEditorState
        > {
  /// One message owns one pending request across page refreshes and sheet closure.
  EventRehearsalDeliveryControllerProvider._({
    required EventRehearsalDeliveryControllerFamily super.from,
    required RehearsalDeliveryScope super.argument,
  }) : super(
         retry: null,
         name: r'eventRehearsalDeliveryControllerProvider',
         isAutoDispose: true,
         dependencies: null,
         $allTransitiveDependencies: null,
       );

  @override
  String debugGetCreateSourceHash() => _$eventRehearsalDeliveryControllerHash();

  @override
  String toString() {
    return r'eventRehearsalDeliveryControllerProvider'
        ''
        '($argument)';
  }

  @$internal
  @override
  EventRehearsalDeliveryController create() =>
      EventRehearsalDeliveryController();

  /// {@macro riverpod.override_with_value}
  Override overrideWithValue(RehearsalDeliveryEditorState value) {
    return $ProviderOverride(
      origin: this,
      providerOverride: $SyncValueProvider<RehearsalDeliveryEditorState>(value),
    );
  }

  @override
  bool operator ==(Object other) {
    return other is EventRehearsalDeliveryControllerProvider &&
        other.argument == argument;
  }

  @override
  int get hashCode {
    return argument.hashCode;
  }
}

String _$eventRehearsalDeliveryControllerHash() =>
    r'ae928e2865e316bbf636a28aec7a1ea11f2be8ca';

/// One message owns one pending request across page refreshes and sheet closure.

final class EventRehearsalDeliveryControllerFamily extends $Family
    with
        $ClassFamilyOverride<
          EventRehearsalDeliveryController,
          RehearsalDeliveryEditorState,
          RehearsalDeliveryEditorState,
          RehearsalDeliveryEditorState,
          RehearsalDeliveryScope
        > {
  EventRehearsalDeliveryControllerFamily._()
    : super(
        retry: null,
        name: r'eventRehearsalDeliveryControllerProvider',
        dependencies: null,
        $allTransitiveDependencies: null,
        isAutoDispose: true,
      );

  /// One message owns one pending request across page refreshes and sheet closure.

  EventRehearsalDeliveryControllerProvider call(RehearsalDeliveryScope scope) =>
      EventRehearsalDeliveryControllerProvider._(argument: scope, from: this);

  @override
  String toString() => r'eventRehearsalDeliveryControllerProvider';
}

/// One message owns one pending request across page refreshes and sheet closure.

abstract class _$EventRehearsalDeliveryController
    extends $Notifier<RehearsalDeliveryEditorState> {
  late final _$args = ref.$arg as RehearsalDeliveryScope;
  RehearsalDeliveryScope get scope => _$args;

  RehearsalDeliveryEditorState build(RehearsalDeliveryScope scope);
  @$mustCallSuper
  @override
  WhenComplete runBuild() {
    final ref =
        this.ref
            as $Ref<RehearsalDeliveryEditorState, RehearsalDeliveryEditorState>;
    final element =
        ref.element
            as $ClassProviderElement<
              AnyNotifier<
                RehearsalDeliveryEditorState,
                RehearsalDeliveryEditorState
              >,
              RehearsalDeliveryEditorState,
              Object?,
              Object?
            >;
    return element.handleCreate(ref, () => build(_$args));
  }
}
