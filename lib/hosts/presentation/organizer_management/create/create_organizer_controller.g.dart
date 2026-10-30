// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'create_organizer_controller.dart';

// **************************************************************************
// RiverpodGenerator
// **************************************************************************

// GENERATED CODE - DO NOT MODIFY BY HAND
// ignore_for_file: type=lint, type=warning
/// **Pattern A: Action controller + static Mutations**
///
/// Handles create and edit club submission. [submitMutation] tracks the
/// lifecycle of the async submit operation. The UI watches
/// `ref.watch(createOrganizerControllerProvider.submitMutation)`.

@ProviderFor(CreateOrganizerController)
final createOrganizerControllerProvider = CreateOrganizerControllerProvider._();

/// **Pattern A: Action controller + static Mutations**
///
/// Handles create and edit club submission. [submitMutation] tracks the
/// lifecycle of the async submit operation. The UI watches
/// `ref.watch(createOrganizerControllerProvider.submitMutation)`.
final class CreateOrganizerControllerProvider
    extends $NotifierProvider<CreateOrganizerController, void> {
  /// **Pattern A: Action controller + static Mutations**
  ///
  /// Handles create and edit club submission. [submitMutation] tracks the
  /// lifecycle of the async submit operation. The UI watches
  /// `ref.watch(createOrganizerControllerProvider.submitMutation)`.
  CreateOrganizerControllerProvider._()
    : super(
        from: null,
        argument: null,
        retry: null,
        name: r'createClubControllerProvider',
        isAutoDispose: true,
        dependencies: null,
        $allTransitiveDependencies: null,
      );

  @override
  String debugGetCreateSourceHash() => _$createOrganizerControllerHash();

  @$internal
  @override
  CreateOrganizerController create() => CreateOrganizerController();

  /// {@macro riverpod.override_with_value}
  Override overrideWithValue(void value) {
    return $ProviderOverride(
      origin: this,
      providerOverride: $SyncValueProvider<void>(value),
    );
  }
}

String _$createOrganizerControllerHash() =>
    r'6edcec0f8c6d6590e8cea285c7adeb35dbd5ebac';

/// **Pattern A: Action controller + static Mutations**
///
/// Handles create and edit club submission. [submitMutation] tracks the
/// lifecycle of the async submit operation. The UI watches
/// `ref.watch(createOrganizerControllerProvider.submitMutation)`.

abstract class _$CreateOrganizerController extends $Notifier<void> {
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
