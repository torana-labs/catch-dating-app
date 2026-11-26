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
    r'6f8392ff9257cf104d1baa46fea34ca4e6536b60';

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

/// The pages Catch found for the signed-in person's number. A failed read
/// counts as nothing found: setup starts a new page, as it did before.

@ProviderFor(hostClaimableOrganizers)
final hostClaimableOrganizersProvider = HostClaimableOrganizersProvider._();

/// The pages Catch found for the signed-in person's number. A failed read
/// counts as nothing found: setup starts a new page, as it did before.

final class HostClaimableOrganizersProvider
    extends
        $FunctionalProvider<
          AsyncValue<ClaimableOrganizers>,
          ClaimableOrganizers,
          FutureOr<ClaimableOrganizers>
        >
    with
        $FutureModifier<ClaimableOrganizers>,
        $FutureProvider<ClaimableOrganizers> {
  /// The pages Catch found for the signed-in person's number. A failed read
  /// counts as nothing found: setup starts a new page, as it did before.
  HostClaimableOrganizersProvider._()
    : super(
        from: null,
        argument: null,
        retry: null,
        name: r'hostClaimableOrganizersProvider',
        isAutoDispose: true,
        dependencies: null,
        $allTransitiveDependencies: null,
      );

  @override
  String debugGetCreateSourceHash() => _$hostClaimableOrganizersHash();

  @$internal
  @override
  $FutureProviderElement<ClaimableOrganizers> $createElement(
    $ProviderPointer pointer,
  ) => $FutureProviderElement(pointer);

  @override
  FutureOr<ClaimableOrganizers> create(Ref ref) {
    return hostClaimableOrganizers(ref);
  }
}

String _$hostClaimableOrganizersHash() =>
    r'd4e0fe1cd1167994799ab43f58aa8ef4ca1b93d7';

/// **Pattern A: Action controller + static Mutations**
///
/// Sends the claim for a found page. [requestMutation] tracks it; the claim
/// form watches it for the pending state and the error.

@ProviderFor(HostOrganizerClaimController)
final hostOrganizerClaimControllerProvider =
    HostOrganizerClaimControllerProvider._();

/// **Pattern A: Action controller + static Mutations**
///
/// Sends the claim for a found page. [requestMutation] tracks it; the claim
/// form watches it for the pending state and the error.
final class HostOrganizerClaimControllerProvider
    extends $NotifierProvider<HostOrganizerClaimController, void> {
  /// **Pattern A: Action controller + static Mutations**
  ///
  /// Sends the claim for a found page. [requestMutation] tracks it; the claim
  /// form watches it for the pending state and the error.
  HostOrganizerClaimControllerProvider._()
    : super(
        from: null,
        argument: null,
        retry: null,
        name: r'hostOrganizerClaimControllerProvider',
        isAutoDispose: true,
        dependencies: null,
        $allTransitiveDependencies: null,
      );

  @override
  String debugGetCreateSourceHash() => _$hostOrganizerClaimControllerHash();

  @$internal
  @override
  HostOrganizerClaimController create() => HostOrganizerClaimController();

  /// {@macro riverpod.override_with_value}
  Override overrideWithValue(void value) {
    return $ProviderOverride(
      origin: this,
      providerOverride: $SyncValueProvider<void>(value),
    );
  }
}

String _$hostOrganizerClaimControllerHash() =>
    r'5115cb86870ac8600b71a9ab41ee620700bdb7c6';

/// **Pattern A: Action controller + static Mutations**
///
/// Sends the claim for a found page. [requestMutation] tracks it; the claim
/// form watches it for the pending state and the error.

abstract class _$HostOrganizerClaimController extends $Notifier<void> {
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
