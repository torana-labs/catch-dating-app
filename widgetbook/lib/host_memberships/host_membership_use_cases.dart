import 'package:catch_dating_app/contexts/account/data/auth_repository.dart';
import 'package:catch_dating_app/contexts/payments/data/host_membership_repository.dart';
import 'package:catch_dating_app/contexts/payments/domain/host_membership.dart';
import 'package:catch_dating_app/contexts/payments/domain/host_membership_plan.dart';
import 'package:catch_dating_app/host_memberships/presentation/host_membership_badge.dart';
import 'package:catch_dating_app/host_memberships/presentation/host_membership_plan_sheet.dart';
import 'package:catch_dating_app/host_memberships/presentation/host_membership_plans_section.dart';
import 'package:catch_dating_app/host_memberships/presentation/host_membership_profile_section.dart';
import 'package:catch_dating_app/host_memberships/presentation/host_membership_section.dart';
import 'package:catch_dating_app/host_memberships/presentation/host_membership_upsell_banner.dart';
import 'package:catch_dating_app/host_memberships/presentation/my_memberships_screen.dart';
import 'package:catch_dating_app/host_memberships/presentation/my_memberships_state.dart';
import 'package:catch_dating_app/host_memberships/presentation/my_memberships_view_model.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/misc.dart' show Override;
import 'package:widgetbook_annotation/widgetbook_annotation.dart' as widgetbook;

import '../support/page_preview.dart';
import '../support/widgetbook_harness.dart';
import '../utility/preview.dart';
import 'fixtures.dart';

const _path = '[P2 consumer surfaces]/Host memberships';

List<Override> _memberOverrides({
  String? uid = widgetbookMembershipViewerUid,
  List<HostMembership>? memberships,
  List<HostMembershipPlan>? plans,
  MyMembershipsState? state,
}) => [
  uidProvider.overrideWith((ref) => Stream<String?>.value(uid)),
  watchMyHostMembershipsProvider(widgetbookMembershipViewerUid).overrideWith(
    (ref) => Stream.value(memberships ?? [widgetbookMembership()]),
  ),
  watchPublishedHostMembershipPlansProvider(
    widgetbookMembershipOrganizerId,
  ).overrideWith((ref) => Stream.value(plans ?? widgetbookMembershipPlans)),
  myMembershipsViewModelProvider(
    widgetbookMembershipViewerUid,
  ).overrideWith((ref) async => state ?? widgetbookMyMembershipsState()),
];

@widgetbook.UseCase(name: 'Statuses', type: HostMembershipBadge, path: _path)
Widget hostMembershipBadgeStates(BuildContext context) =>
    WidgetbookScrollCatalogFrame(
      title: 'Member badge',
      catalogId: 'host_memberships.badge',
      children: [
        for (final status in HostMembershipStatus.values)
          WidgetbookPageStateCard(
            label: status.wireValue,
            child: WidgetbookContentFrame(
              child: Align(
                alignment: Alignment.centerLeft,
                child: HostMembershipBadge(
                  planName: 'Sunday Runners',
                  status: status,
                ),
              ),
            ),
          ),
        const WidgetbookPageStateCard(
          label: 'compact (no plan name)',
          child: WidgetbookContentFrame(
            child: Align(
              alignment: Alignment.centerLeft,
              child: HostMembershipBadge(),
            ),
          ),
        ),
      ],
    );

@widgetbook.UseCase(
  name: 'Included, discount and members-only',
  type: HostMembershipUpsellBanner,
  path: _path,
)
Widget hostMembershipUpsellBannerStates(BuildContext context) =>
    WidgetbookScrollCatalogFrame(
      title: 'Checkout membership upsell',
      catalogId: 'host_memberships.upsell',
      children: [
        for (final (label, offer) in [
          ('event included', widgetbookMembershipOffer()),
          (
            'member discount',
            widgetbookMembershipOffer(memberPriceInPaise: 35000),
          ),
          (
            'unlocks a members-only event',
            widgetbookMembershipOffer(unlocksAccess: true),
          ),
        ])
          WidgetbookPageStateCard(
            label: label,
            child: WidgetbookContentFrame(
              child: HostMembershipUpsellBanner(offer: offer, onJoin: () {}),
            ),
          ),
      ],
    );

@widgetbook.UseCase(
  name: 'Plans and current member',
  type: HostMembershipPlansList,
  path: _path,
)
Widget hostMembershipPlansListStates(BuildContext context) =>
    WidgetbookScrollCatalogFrame(
      title: 'Club memberships',
      catalogId: 'host_memberships.plans_list',
      children: [
        WidgetbookPageStateCard(
          label: 'not a member',
          child: WidgetbookContentFrame(
            child: HostMembershipPlansList(
              plans: widgetbookMembershipPlans,
              currentMembership: null,
              onOpenPlan: (_) {},
            ),
          ),
        ),
        WidgetbookPageStateCard(
          label: 'current member',
          child: WidgetbookContentFrame(
            child: HostMembershipPlansList(
              plans: widgetbookMembershipPlans,
              currentMembership: widgetbookMembership(),
              onOpenPlan: (_) {},
            ),
          ),
        ),
      ],
    );

@widgetbook.UseCase(
  name: 'Club page section',
  type: HostMembershipPlansSection,
  path: _path,
)
Widget hostMembershipPlansSectionStates(BuildContext context) =>
    WidgetbookFixtureScope(
      overrides: _memberOverrides(memberships: const []),
      child: const WidgetbookScrollCatalogFrame(
        title: 'Club memberships section',
        catalogId: 'host_memberships.plans_section',
        children: [
          WidgetbookContentFrame(
            child: HostMembershipPlansSection(
              organizerId: widgetbookMembershipOrganizerId,
            ),
          ),
        ],
      ),
    );

@widgetbook.UseCase(
  name: 'Plan details',
  type: HostMembershipJoinSheet,
  path: _path,
)
Widget hostMembershipJoinSheetStates(BuildContext context) =>
    WidgetbookFixtureScope(
      overrides: const [],
      child: WidgetbookScrollCatalogFrame(
        title: 'Join a membership',
        catalogId: 'host_memberships.join_sheet',
        children: [
          for (final plan in widgetbookMembershipPlans)
            WidgetbookPageStateCard(
              label: plan.name,
              child: WidgetbookUtilitySheetFrame(
                child: HostMembershipJoinSheet(plan: plan),
              ),
            ),
        ],
      ),
    );

@widgetbook.UseCase(
  name: 'Resolved plan',
  type: HostMembershipPlanSheet,
  path: _path,
)
Widget hostMembershipPlanSheetStates(BuildContext context) =>
    WidgetbookFixtureScope(
      overrides: _memberOverrides(),
      child: const WidgetbookScrollCatalogFrame(
        title: 'Membership plan sheet',
        catalogId: 'host_memberships.plan_sheet',
        children: [
          WidgetbookUtilitySheetFrame(
            child: HostMembershipPlanSheet(
              organizerId: widgetbookMembershipOrganizerId,
              planId: widgetbookMembershipPlanId,
            ),
          ),
        ],
      ),
    );

@widgetbook.UseCase(
  name: 'Signed-in member',
  type: HostMembershipProfileSection,
  path: _path,
)
Widget hostMembershipProfileSectionStates(BuildContext context) =>
    WidgetbookScrollCatalogFrame(
      title: 'Settings membership row',
      catalogId: 'host_memberships.profile_section',
      children: [
        for (final (label, memberships) in [
          (
            'two current memberships',
            [
              widgetbookMembership(),
              widgetbookMembership(planName: 'Track Club', status: 'trialing'),
            ],
          ),
          ('no current memberships', const <HostMembership>[]),
        ])
          WidgetbookPageStateCard(
            label: label,
            child: WidgetbookFixtureScope(
              overrides: _memberOverrides(memberships: memberships),
              child: const WidgetbookContentFrame(
                child: HostMembershipProfileSection(),
              ),
            ),
          ),
      ],
    );

@widgetbook.UseCase(
  name: 'Statuses and actions',
  type: HostMembershipSection,
  path: _path,
)
Widget hostMembershipSectionStates(BuildContext context) =>
    WidgetbookScrollCatalogFrame(
      title: 'Membership row',
      catalogId: 'host_memberships.section',
      children: [
        for (final (label, membership) in [
          ('active', widgetbookMembership()),
          ('canceling', widgetbookMembership(status: 'canceling')),
          (
            'member paused',
            widgetbookMembership(status: 'paused', pausedBy: 'member'),
          ),
          (
            'host paused billing',
            widgetbookMembership(status: 'paused', pausedBy: 'host'),
          ),
          ('payment failing', widgetbookMembership(status: 'past_due')),
        ])
          WidgetbookPageStateCard(
            label: label,
            child: WidgetbookContentFrame(
              child: HostMembershipSection(
                row: MyMembershipRow(
                  membership: membership,
                  savedInPaise: 85000,
                ),
                now: widgetbookMembershipNow,
                onAction: (_) {},
                first: true,
              ),
            ),
          ),
        WidgetbookPageStateCard(
          label: 'action pending',
          child: WidgetbookContentFrame(
            child: HostMembershipSection(
              row: MyMembershipRow(
                membership: widgetbookMembership(),
                savedInPaise: 0,
              ),
              now: widgetbookMembershipNow,
              onAction: (_) {},
              pendingAction: HostMembershipAction.pause,
              first: true,
            ),
          ),
        ),
      ],
    );

@widgetbook.UseCase(
  name: 'Populated and empty',
  type: MyMembershipsList,
  path: _path,
)
Widget myMembershipsListStates(BuildContext context) =>
    WidgetbookScrollCatalogFrame(
      title: 'My memberships list',
      catalogId: 'host_memberships.my_list',
      children: [
        for (final (label, state) in [
          ('populated with savings', widgetbookMyMembershipsState()),
          ('empty', widgetbookMyMembershipsState(empty: true)),
        ])
          WidgetbookPageStateCard(
            label: label,
            child: WidgetbookUtilityDeviceFrame(
              child: SingleChildScrollView(
                child: MyMembershipsList(
                  state: state,
                  now: widgetbookMembershipNow,
                  onAction: (_, _) {},
                ),
              ),
            ),
          ),
      ],
    );

@widgetbook.UseCase(
  name: 'Resolved memberships',
  type: MyMembershipsBody,
  path: _path,
)
Widget myMembershipsBodyStates(BuildContext context) => WidgetbookFixtureScope(
  overrides: _memberOverrides(),
  child: const WidgetbookScrollCatalogFrame(
    title: 'My memberships body',
    catalogId: 'host_memberships.my_body',
    children: [
      WidgetbookUtilityDeviceFrame(
        child: SingleChildScrollView(
          child: MyMembershipsBody(uid: widgetbookMembershipViewerUid),
        ),
      ),
    ],
  ),
);

@widgetbook.UseCase(
  name: 'Screen states',
  type: MyMembershipsScreen,
  path: _path,
)
Widget myMembershipsScreenStates(BuildContext context) =>
    WidgetbookPageCatalogFrame(
      title: 'MyMembershipsScreen',
      contractId: 'screen.memberships.mine',
      children: [
        for (final (label, overrides) in [
          ('populated', _memberOverrides()),
          (
            'empty',
            _memberOverrides(state: widgetbookMyMembershipsState(empty: true)),
          ),
          ('signed out', _memberOverrides(uid: null)),
        ])
          WidgetbookPageStateCard(
            label: label,
            child: WidgetbookFixtureScope(
              overrides: overrides,
              child: const WidgetbookUtilityDeviceFrame(
                child: MyMembershipsScreen(),
              ),
            ),
          ),
      ],
    );
