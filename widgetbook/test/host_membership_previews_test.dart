import 'package:catch_dating_app/core/theme/app_theme.dart';
import 'package:catch_dating_app/host_memberships/presentation/host_membership_badge.dart';
import 'package:catch_dating_app/host_memberships/presentation/host_membership_plan_sheet.dart';
import 'package:catch_dating_app/host_memberships/presentation/host_membership_plans_section.dart';
import 'package:catch_dating_app/host_memberships/presentation/host_membership_profile_section.dart';
import 'package:catch_dating_app/host_memberships/presentation/host_membership_section.dart';
import 'package:catch_dating_app/host_memberships/presentation/host_membership_upsell_banner.dart';
import 'package:catch_dating_app/host_memberships/presentation/my_memberships_screen.dart';
import 'package:catch_dating_app/hosts/presentation/hosted_event_membership_rules_section.dart';
import 'package:catch_dating_app/hosts/presentation/memberships/host_membership_plan_editor_sheet.dart';
import 'package:catch_dating_app/hosts/presentation/memberships/host_memberships_section.dart';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:widgetbook_workspace/host_memberships/host_membership_use_cases.dart';
import 'package:widgetbook_workspace/hosts/host_membership_admin_use_cases.dart';

import '../../test/test_pump_helpers.dart';

// Each case renders offline: stateful owners read only their preview overrides.
void main() {
  final cases = <(WidgetBuilder, Type, int)>[
    (hostMembershipBadgeStates, HostMembershipBadge, 7),
    (hostMembershipUpsellBannerStates, HostMembershipUpsellBanner, 3),
    (hostMembershipPlansListStates, HostMembershipPlansList, 2),
    (hostMembershipPlansSectionStates, HostMembershipPlansList, 1),
    (hostMembershipJoinSheetStates, HostMembershipJoinSheet, 2),
    (hostMembershipPlanSheetStates, HostMembershipJoinSheet, 1),
    (hostMembershipProfileSectionStates, HostMembershipProfileSection, 2),
    (hostMembershipSectionStates, HostMembershipSection, 6),
    (myMembershipsListStates, MyMembershipsList, 2),
    (myMembershipsBodyStates, MyMembershipsList, 1),
    (myMembershipsScreenStates, MyMembershipsScreen, 3),
    (hostMembershipsSectionStates, HostMembershipsSection, 4),
    (hostMembershipsCardStates, HostMembershipsSection, 1),
    (hostClubMembershipsScreenLoaded, HostMembershipsSection, 1),
    (hostMembershipPlanEditorSheetStates, HostMembershipPlanEditorSheet, 2),
    (
      hostedEventMembershipRulesEditorStates,
      HostedEventMembershipRulesEditor,
      2,
    ),
    (
      hostedEventMembershipRulesSectionStates,
      HostedEventMembershipRulesEditor,
      1,
    ),
  ];
  // The pending-action card shows a live progress indicator, so it never
  // settles; it pumps a fixed duration instead.
  final alwaysAnimating = <WidgetBuilder>{hostMembershipSectionStates};
  for (final (index, (builder, type, count)) in cases.indexed) {
    testWidgets('case $index: $type renders offline', (tester) async {
      tester.view.devicePixelRatio = 1;
      tester.view.physicalSize = const Size(520, 4000);
      addTearDown(tester.view.resetDevicePixelRatio);
      addTearDown(tester.view.resetPhysicalSize);
      await tester.pumpWidget(
        MaterialApp(
          theme: AppTheme.light,
          home: Builder(builder: builder),
        ),
      );
      if (!alwaysAnimating.contains(builder)) await pumpFeatureUi(tester);
      await tester.pump(const Duration(seconds: 1));
      expect(tester.takeException(), isNull);
      expect(
        find.byType(type, skipOffstage: false),
        findsAtLeastNWidgets(count),
      );
      await tester.pumpWidget(const SizedBox.shrink());
      await tester.pump();
    });
  }
}
