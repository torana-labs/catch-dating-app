// Marketing capture `host_organizer_memberships`. One file per marketing capture keeps each
// capture's inputs to its own imports; see docs/marketing_app_media_pipeline.md.

import 'package:catch_dating_app/contexts/payments/domain/host_membership_admin.dart';
import 'package:catch_dating_app/contexts/payments/domain/host_membership_plan.dart';
import 'package:catch_dating_app/design_fixtures/host_operations_fixtures.dart';
import 'package:catch_dating_app/hosts/organizer/memberships_screen.dart';
import 'package:catch_dating_app/hosts/presentation/memberships/host_memberships_controller.dart';
import 'package:catch_dating_app/hosts/presentation/memberships/host_memberships_state.dart';
import '../../../hosts/organizer/organizer_captures.dart';
import '../../support/capture_device.dart';
import '../screen_capture_entry.dart';
import '../shared/host_routed_shell_capture.dart';
import '../shared/host_shell_capture_overrides.dart';

// Paid memberships in Catch Host: the programme is on, with a monthly plan
// for regulars and a capped founding plan, each with its member benefits.
final hostOrganizerMembershipsCapture = ScreenCaptureEntry(
  id: 'host_organizer_memberships',
  routeIds: const <String>['hostOrganizerMembershipsScreen'],
  device: CaptureDevice.genericPhone,
  marketingFixtureKeys: const <String>['hostOrganizer.memberships'],
  disableAnimations: true,
  providerOverrides: [
    ...hostShellCaptureOverrides(HostOperationsFixtures.hostUid),
    ...hostOperationsProviderOverrides(
      hostedOrganizers: [organizerCaptureOrganizer],
      ownedOrganizers: [organizerCaptureOrganizer],
    ),
    ...organizerCaptureOverrides(),
    hostMembershipsControllerProvider(
      organizerCaptureOrganizer.id,
    ).overrideWith(() => _StoryMemberships(_state)),
  ],
  builder: (context) =>
      OrganizerMembershipsScreen(organizerId: organizerCaptureOrganizer.id),
);

final _state = HostMembershipsState(
  program: const HostMembershipProgramView(
    enabled: true,
    testMode: false,
    billingPause: HostMembershipBillingPauseState.active,
    memberCount: 46,
    routeAccountReady: true,
    feeConfigured: true,
    exists: true,
    paymentMode: HostMembershipPaymentMode.hostCollected,
  ),
  plans: [
    HostMembershipPlan(
      id: 'plan-regulars',
      organizerId: organizerCaptureOrganizer.id,
      name: 'Regulars',
      description: 'For people who come most weeks.',
      status: HostMembershipPlanStatus.published,
      monthlyPriceInPaise: 150000,
      annualPriceInPaise: 1500000,
      memberCap: null,
      activeMemberCount: 34,
      trialDays: 0,
      benefits: const [
        HostMembershipEventDiscount(20),
        HostMembershipEarlyAccess(),
      ],
      perks: const ['A coffee on the house after each run'],
      maxUpcomingMemberPricedBookings: null,
      sortOrder: 0,
      revision: 1,
    ),
    HostMembershipPlan(
      id: 'plan-founding',
      organizerId: organizerCaptureOrganizer.id,
      name: 'Founding circle',
      description: 'A year of runs, and the members-only long runs.',
      status: HostMembershipPlanStatus.published,
      monthlyPriceInPaise: null,
      annualPriceInPaise: 1200000,
      memberCap: 20,
      activeMemberCount: 12,
      trialDays: 0,
      benefits: const [
        HostMembershipEventDiscount(30),
        HostMembershipEarlyAccess(),
        HostMembershipMembersOnlyAccess(),
      ],
      perks: const [],
      maxUpcomingMemberPricedBookings: null,
      sortOrder: 1,
      revision: 1,
    ),
  ],
);

/// The memberships controller with the programme and plans above and no reads.
class _StoryMemberships extends HostMembershipsController {
  _StoryMemberships(this._value);

  final HostMembershipsState _value;

  @override
  Future<HostMembershipsState> build(String organizerId) async => _value;
}
