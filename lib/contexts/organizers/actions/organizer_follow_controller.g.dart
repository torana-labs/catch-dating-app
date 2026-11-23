// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'organizer_follow_controller.dart';

// **************************************************************************
// RiverpodGenerator
// **************************************************************************

// GENERATED CODE - DO NOT MODIFY BY HAND
// ignore_for_file: type=lint, type=warning
/// **Pattern A: Action controller + static Mutations**
///
/// Owns follow actions from both the organizer list and detail screens.
/// The UI watches mutation state to show loading spinners and error banners.

@ProviderFor(OrganizerFollowController)
final organizerFollowControllerProvider = OrganizerFollowControllerProvider._();

/// **Pattern A: Action controller + static Mutations**
///
/// Owns follow actions from both the organizer list and detail screens.
/// The UI watches mutation state to show loading spinners and error banners.
final class OrganizerFollowControllerProvider
    extends $NotifierProvider<OrganizerFollowController, void> {
  /// **Pattern A: Action controller + static Mutations**
  ///
  /// Owns follow actions from both the organizer list and detail screens.
  /// The UI watches mutation state to show loading spinners and error banners.
  OrganizerFollowControllerProvider._()
    : super(
        from: null,
        argument: null,
        retry: null,
        name: r'organizerFollowControllerProvider',
        isAutoDispose: true,
        dependencies: null,
        $allTransitiveDependencies: null,
      );

  @override
  String debugGetCreateSourceHash() => _$organizerFollowControllerHash();

  @$internal
  @override
  OrganizerFollowController create() => OrganizerFollowController();

  /// {@macro riverpod.override_with_value}
  Override overrideWithValue(void value) {
    return $ProviderOverride(
      origin: this,
      providerOverride: $SyncValueProvider<void>(value),
    );
  }
}

String _$organizerFollowControllerHash() =>
    r'314999749db4c7662231b91e331867da553678eb';

/// **Pattern A: Action controller + static Mutations**
///
/// Owns follow actions from both the organizer list and detail screens.
/// The UI watches mutation state to show loading spinners and error banners.

abstract class _$OrganizerFollowController extends $Notifier<void> {
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
