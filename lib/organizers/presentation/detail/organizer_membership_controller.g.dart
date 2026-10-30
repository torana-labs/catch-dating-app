// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'organizer_membership_controller.dart';

// **************************************************************************
// RiverpodGenerator
// **************************************************************************

// GENERATED CODE - DO NOT MODIFY BY HAND
// ignore_for_file: type=lint, type=warning
/// **Pattern A: Action controller + static Mutations**
///
/// Owns follow actions from both the organizer list and detail screens.
/// The UI watches mutation state to show loading spinners and error banners.

@ProviderFor(OrganizerMembershipController)
final organizerMembershipControllerProvider =
    OrganizerMembershipControllerProvider._();

/// **Pattern A: Action controller + static Mutations**
///
/// Owns follow actions from both the organizer list and detail screens.
/// The UI watches mutation state to show loading spinners and error banners.
final class OrganizerMembershipControllerProvider
    extends $NotifierProvider<OrganizerMembershipController, void> {
  /// **Pattern A: Action controller + static Mutations**
  ///
  /// Owns follow actions from both the organizer list and detail screens.
  /// The UI watches mutation state to show loading spinners and error banners.
  OrganizerMembershipControllerProvider._()
    : super(
        from: null,
        argument: null,
        retry: null,
        name: r'organizerMembershipControllerProvider',
        isAutoDispose: true,
        dependencies: null,
        $allTransitiveDependencies: null,
      );

  @override
  String debugGetCreateSourceHash() => _$organizerMembershipControllerHash();

  @$internal
  @override
  OrganizerMembershipController create() => OrganizerMembershipController();

  /// {@macro riverpod.override_with_value}
  Override overrideWithValue(void value) {
    return $ProviderOverride(
      origin: this,
      providerOverride: $SyncValueProvider<void>(value),
    );
  }
}

String _$organizerMembershipControllerHash() =>
    r'd288ec2dffd6918ec4e96172fa56da416ea653ec';

/// **Pattern A: Action controller + static Mutations**
///
/// Owns follow actions from both the organizer list and detail screens.
/// The UI watches mutation state to show loading spinners and error banners.

abstract class _$OrganizerMembershipController extends $Notifier<void> {
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
