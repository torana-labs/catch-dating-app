// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'create_event_controller.dart';

// **************************************************************************
// RiverpodGenerator
// **************************************************************************

// GENERATED CODE - DO NOT MODIFY BY HAND
// ignore_for_file: type=lint, type=warning
/// **Pattern A: Action controller + static Mutations**
///
/// Validates input and delegates event creation to [EventRepository].
/// [submitMutation] carries the created [Event] on success so the UI can
/// navigate to the event detail screen.

@ProviderFor(CreateEventController)
final createEventControllerProvider = CreateEventControllerProvider._();

/// **Pattern A: Action controller + static Mutations**
///
/// Validates input and delegates event creation to [EventRepository].
/// [submitMutation] carries the created [Event] on success so the UI can
/// navigate to the event detail screen.
final class CreateEventControllerProvider
    extends $NotifierProvider<CreateEventController, void> {
  /// **Pattern A: Action controller + static Mutations**
  ///
  /// Validates input and delegates event creation to [EventRepository].
  /// [submitMutation] carries the created [Event] on success so the UI can
  /// navigate to the event detail screen.
  CreateEventControllerProvider._()
    : super(
        from: null,
        argument: null,
        retry: null,
        name: r'createEventControllerProvider',
        isAutoDispose: true,
        dependencies: null,
        $allTransitiveDependencies: null,
      );

  @override
  String debugGetCreateSourceHash() => _$createEventControllerHash();

  @$internal
  @override
  CreateEventController create() => CreateEventController();

  /// {@macro riverpod.override_with_value}
  Override overrideWithValue(void value) {
    return $ProviderOverride(
      origin: this,
      providerOverride: $SyncValueProvider<void>(value),
    );
  }
}

String _$createEventControllerHash() =>
    r'1646d9470e816aaf740d6f82369fda5a58c7194d';

/// **Pattern A: Action controller + static Mutations**
///
/// Validates input and delegates event creation to [EventRepository].
/// [submitMutation] carries the created [Event] on success so the UI can
/// navigate to the event detail screen.

abstract class _$CreateEventController extends $Notifier<void> {
  void build();
  @$mustCallSuper
  @override
  WhenComplete runBuild() {
    final ref = this.ref as $Ref<void, void>;
    final element =
        ref.element
            as $ClassProviderElement<
              AnyNotifier<void, void>,
              void,
              Object?,
              Object?
            >;
    return element.handleCreate(ref, build);
  }
}
