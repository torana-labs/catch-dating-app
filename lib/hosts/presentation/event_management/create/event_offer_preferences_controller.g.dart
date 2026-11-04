// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'event_offer_preferences_controller.dart';

// **************************************************************************
// RiverpodGenerator
// **************************************************************************

// GENERATED CODE - DO NOT MODIFY BY HAND
// ignore_for_file: type=lint, type=warning

@ProviderFor(eventOfferPreferencesDependencies)
final eventOfferPreferencesDependenciesProvider =
    EventOfferPreferencesDependenciesProvider._();

final class EventOfferPreferencesDependenciesProvider
    extends
        $FunctionalProvider<
          EventOfferPreferencesDependencies,
          EventOfferPreferencesDependencies,
          EventOfferPreferencesDependencies
        >
    with $Provider<EventOfferPreferencesDependencies> {
  EventOfferPreferencesDependenciesProvider._()
    : super(
        from: null,
        argument: null,
        retry: null,
        name: r'eventOfferPreferencesDependenciesProvider',
        isAutoDispose: true,
        dependencies: null,
        $allTransitiveDependencies: null,
      );

  @override
  String debugGetCreateSourceHash() =>
      _$eventOfferPreferencesDependenciesHash();

  @$internal
  @override
  $ProviderElement<EventOfferPreferencesDependencies> $createElement(
    $ProviderPointer pointer,
  ) => $ProviderElement(pointer);

  @override
  EventOfferPreferencesDependencies create(Ref ref) {
    return eventOfferPreferencesDependencies(ref);
  }

  /// {@macro riverpod.override_with_value}
  Override overrideWithValue(EventOfferPreferencesDependencies value) {
    return $ProviderOverride(
      origin: this,
      providerOverride: $SyncValueProvider<EventOfferPreferencesDependencies>(
        value,
      ),
    );
  }
}

String _$eventOfferPreferencesDependenciesHash() =>
    r'f64b9ffe93a67f23c24091bf738d049f4d71a435';

@ProviderFor(EventOfferPreferencesController)
final eventOfferPreferencesControllerProvider =
    EventOfferPreferencesControllerFamily._();

final class EventOfferPreferencesControllerProvider
    extends
        $NotifierProvider<
          EventOfferPreferencesController,
          EventPreferencesEditorState
        > {
  EventOfferPreferencesControllerProvider._({
    required EventOfferPreferencesControllerFamily super.from,
    required EventEditorScope super.argument,
  }) : super(
         retry: null,
         name: r'eventOfferPreferencesControllerProvider',
         isAutoDispose: true,
         dependencies: null,
         $allTransitiveDependencies: null,
       );

  @override
  String debugGetCreateSourceHash() => _$eventOfferPreferencesControllerHash();

  @override
  String toString() {
    return r'eventOfferPreferencesControllerProvider'
        ''
        '($argument)';
  }

  @$internal
  @override
  EventOfferPreferencesController create() => EventOfferPreferencesController();

  /// {@macro riverpod.override_with_value}
  Override overrideWithValue(EventPreferencesEditorState value) {
    return $ProviderOverride(
      origin: this,
      providerOverride: $SyncValueProvider<EventPreferencesEditorState>(value),
    );
  }

  @override
  bool operator ==(Object other) {
    return other is EventOfferPreferencesControllerProvider &&
        other.argument == argument;
  }

  @override
  int get hashCode {
    return argument.hashCode;
  }
}

String _$eventOfferPreferencesControllerHash() =>
    r'bc20bc356d30aac2d1263aafe1bda17d5f5fbbd3';

final class EventOfferPreferencesControllerFamily extends $Family
    with
        $ClassFamilyOverride<
          EventOfferPreferencesController,
          EventPreferencesEditorState,
          EventPreferencesEditorState,
          EventPreferencesEditorState,
          EventEditorScope
        > {
  EventOfferPreferencesControllerFamily._()
    : super(
        retry: null,
        name: r'eventOfferPreferencesControllerProvider',
        dependencies: null,
        $allTransitiveDependencies: null,
        isAutoDispose: true,
      );

  EventOfferPreferencesControllerProvider call(EventEditorScope scope) =>
      EventOfferPreferencesControllerProvider._(argument: scope, from: this);

  @override
  String toString() => r'eventOfferPreferencesControllerProvider';
}

abstract class _$EventOfferPreferencesController
    extends $Notifier<EventPreferencesEditorState> {
  late final _$args = ref.$arg as EventEditorScope;
  EventEditorScope get scope => _$args;

  EventPreferencesEditorState build(EventEditorScope scope);
  @$mustCallSuper
  @override
  WhenComplete runBuild() {
    final ref =
        this.ref
            as $Ref<EventPreferencesEditorState, EventPreferencesEditorState>;
    final element =
        ref.element
            as $ClassProviderElement<
              AnyNotifier<
                EventPreferencesEditorState,
                EventPreferencesEditorState
              >,
              EventPreferencesEditorState,
              Object?,
              Object?
            >;
    return element.handleCreate(ref, () => build(_$args));
  }
}
