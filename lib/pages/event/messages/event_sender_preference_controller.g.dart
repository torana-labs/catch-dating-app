// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'event_sender_preference_controller.dart';

// **************************************************************************
// RiverpodGenerator
// **************************************************************************

// GENERATED CODE - DO NOT MODIFY BY HAND
// ignore_for_file: type=lint, type=warning
/// Shared navigation/retry ownership with channel-specific reviewed payloads.

@ProviderFor(EventSenderPreferenceController)
final eventSenderPreferenceControllerProvider =
    EventSenderPreferenceControllerFamily._();

/// Shared navigation/retry ownership with channel-specific reviewed payloads.
final class EventSenderPreferenceControllerProvider
    extends
        $NotifierProvider<
          EventSenderPreferenceController,
          EventSenderPreferenceState
        > {
  /// Shared navigation/retry ownership with channel-specific reviewed payloads.
  EventSenderPreferenceControllerProvider._({
    required EventSenderPreferenceControllerFamily super.from,
    required EventSenderPreferenceScope super.argument,
  }) : super(
         retry: null,
         name: r'eventSenderPreferenceControllerProvider',
         isAutoDispose: true,
         dependencies: null,
         $allTransitiveDependencies: null,
       );

  @override
  String debugGetCreateSourceHash() => _$eventSenderPreferenceControllerHash();

  @override
  String toString() {
    return r'eventSenderPreferenceControllerProvider'
        ''
        '($argument)';
  }

  @$internal
  @override
  EventSenderPreferenceController create() => EventSenderPreferenceController();

  /// {@macro riverpod.override_with_value}
  Override overrideWithValue(EventSenderPreferenceState value) {
    return $ProviderOverride(
      origin: this,
      providerOverride: $SyncValueProvider<EventSenderPreferenceState>(value),
    );
  }

  @override
  bool operator ==(Object other) {
    return other is EventSenderPreferenceControllerProvider &&
        other.argument == argument;
  }

  @override
  int get hashCode {
    return argument.hashCode;
  }
}

String _$eventSenderPreferenceControllerHash() =>
    r'4bfe11e602fb443aa736c5a5e913e4631f800597';

/// Shared navigation/retry ownership with channel-specific reviewed payloads.

final class EventSenderPreferenceControllerFamily extends $Family
    with
        $ClassFamilyOverride<
          EventSenderPreferenceController,
          EventSenderPreferenceState,
          EventSenderPreferenceState,
          EventSenderPreferenceState,
          EventSenderPreferenceScope
        > {
  EventSenderPreferenceControllerFamily._()
    : super(
        retry: null,
        name: r'eventSenderPreferenceControllerProvider',
        dependencies: null,
        $allTransitiveDependencies: null,
        isAutoDispose: true,
      );

  /// Shared navigation/retry ownership with channel-specific reviewed payloads.

  EventSenderPreferenceControllerProvider call(
    EventSenderPreferenceScope scope,
  ) => EventSenderPreferenceControllerProvider._(argument: scope, from: this);

  @override
  String toString() => r'eventSenderPreferenceControllerProvider';
}

/// Shared navigation/retry ownership with channel-specific reviewed payloads.

abstract class _$EventSenderPreferenceController
    extends $Notifier<EventSenderPreferenceState> {
  late final _$args = ref.$arg as EventSenderPreferenceScope;
  EventSenderPreferenceScope get scope => _$args;

  EventSenderPreferenceState build(EventSenderPreferenceScope scope);
  @$mustCallSuper
  @override
  WhenComplete runBuild() {
    final ref =
        this.ref
            as $Ref<EventSenderPreferenceState, EventSenderPreferenceState>;
    final element =
        ref.element
            as $ClassProviderElement<
              AnyNotifier<
                EventSenderPreferenceState,
                EventSenderPreferenceState
              >,
              EventSenderPreferenceState,
              Object?,
              Object?
            >;
    return element.handleCreate(ref, () => build(_$args));
  }
}
