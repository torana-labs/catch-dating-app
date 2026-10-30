// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'create_organizer_draft_controller.dart';

// **************************************************************************
// RiverpodGenerator
// **************************************************************************

// GENERATED CODE - DO NOT MODIFY BY HAND
// ignore_for_file: type=lint, type=warning
/// **Pattern A: Action controller + static Mutations**
///
/// Owns local create-club draft persistence. The screen owns text
/// controllers and restoration because those are UI mechanics.

@ProviderFor(CreateOrganizerDraftController)
final createOrganizerDraftControllerProvider = CreateOrganizerDraftControllerProvider._();

/// **Pattern A: Action controller + static Mutations**
///
/// Owns local create-club draft persistence. The screen owns text
/// controllers and restoration because those are UI mechanics.
final class CreateOrganizerDraftControllerProvider
    extends $NotifierProvider<CreateOrganizerDraftController, void> {
  /// **Pattern A: Action controller + static Mutations**
  ///
  /// Owns local create-club draft persistence. The screen owns text
  /// controllers and restoration because those are UI mechanics.
  CreateOrganizerDraftControllerProvider._()
    : super(
        from: null,
        argument: null,
        retry: null,
        name: r'createClubDraftControllerProvider',
        isAutoDispose: true,
        dependencies: null,
        $allTransitiveDependencies: null,
      );

  @override
  String debugGetCreateSourceHash() => _$createOrganizerDraftControllerHash();

  @$internal
  @override
  CreateOrganizerDraftController create() => CreateOrganizerDraftController();

  /// {@macro riverpod.override_with_value}
  Override overrideWithValue(void value) {
    return $ProviderOverride(
      origin: this,
      providerOverride: $SyncValueProvider<void>(value),
    );
  }
}

String _$createOrganizerDraftControllerHash() =>
    r'91d7dd6534e7ca877eddefc95eed5c0f51fd3990';

/// **Pattern A: Action controller + static Mutations**
///
/// Owns local create-club draft persistence. The screen owns text
/// controllers and restoration because those are UI mechanics.

abstract class _$CreateOrganizerDraftController extends $Notifier<void> {
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
