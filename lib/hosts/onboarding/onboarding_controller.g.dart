// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'onboarding_controller.dart';

// **************************************************************************
// RiverpodGenerator
// **************************************************************************

// GENERATED CODE - DO NOT MODIFY BY HAND
// ignore_for_file: type=lint, type=warning
/// Organiser setup's step state over the create-organizer draft.
///
/// It holds what the host has typed and where they are. The commands stay
/// with their owners: the screens run `CreateOrganizerController` to create
/// the page, `CreateOrganizerDraftController` to keep the draft, and the
/// Razorpay connection controller for payouts, then report back here.

@ProviderFor(HostSetupController)
final hostSetupControllerProvider = HostSetupControllerProvider._();

/// Organiser setup's step state over the create-organizer draft.
///
/// It holds what the host has typed and where they are. The commands stay
/// with their owners: the screens run `CreateOrganizerController` to create
/// the page, `CreateOrganizerDraftController` to keep the draft, and the
/// Razorpay connection controller for payouts, then report back here.
final class HostSetupControllerProvider
    extends $NotifierProvider<HostSetupController, HostSetupState> {
  /// Organiser setup's step state over the create-organizer draft.
  ///
  /// It holds what the host has typed and where they are. The commands stay
  /// with their owners: the screens run `CreateOrganizerController` to create
  /// the page, `CreateOrganizerDraftController` to keep the draft, and the
  /// Razorpay connection controller for payouts, then report back here.
  HostSetupControllerProvider._()
    : super(
        from: null,
        argument: null,
        retry: null,
        name: r'hostSetupControllerProvider',
        isAutoDispose: true,
        dependencies: null,
        $allTransitiveDependencies: null,
      );

  @override
  String debugGetCreateSourceHash() => _$hostSetupControllerHash();

  @$internal
  @override
  HostSetupController create() => HostSetupController();

  /// {@macro riverpod.override_with_value}
  Override overrideWithValue(HostSetupState value) {
    return $ProviderOverride(
      origin: this,
      providerOverride: $SyncValueProvider<HostSetupState>(value),
    );
  }
}

String _$hostSetupControllerHash() =>
    r'406df64d229288625bcc94cb5b7c237bd3411781';

/// Organiser setup's step state over the create-organizer draft.
///
/// It holds what the host has typed and where they are. The commands stay
/// with their owners: the screens run `CreateOrganizerController` to create
/// the page, `CreateOrganizerDraftController` to keep the draft, and the
/// Razorpay connection controller for payouts, then report back here.

abstract class _$HostSetupController extends $Notifier<HostSetupState> {
  HostSetupState build();
  @$mustCallSuper
  @override
  WhenComplete runBuild() {
    final ref = this.ref as $Ref<HostSetupState, HostSetupState>;
    final element =
        ref.element
            as $ClassProviderElement<
              AnyNotifier<HostSetupState, HostSetupState>,
              HostSetupState,
              Object?,
              Object?
            >;
    return element.handleCreate(ref, build);
  }
}
