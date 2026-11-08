import 'package:catch_dating_app/contexts/organizers/domain/organizer.dart';
import 'package:catch_dating_app/contexts/payments/domain/host_membership_admin.dart';
import 'package:catch_dating_app/contexts/payments/domain/host_membership_plan.dart';
import 'package:catch_dating_app/hosts/organizer/memberships_body.dart';
import 'package:catch_dating_app/hosts/organizer/memberships_state.dart';
import 'package:catch_dating_app/hosts/organizer/settings_body.dart';
import 'package:catch_dating_app/hosts/organizer/settings_state.dart';
import 'package:catch_dating_app/hosts/organizer/team_body.dart';
import 'package:catch_dating_app/hosts/organizer/team_state.dart';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';

import '../../host_memberships/host_membership_fixtures.dart';
import 'organizer_fixtures.dart';

void main() {
  group('Team', () {
    Future<(List<String>, List<OrganizerHostProfile>, List<String>)> pump(
      WidgetTester tester,
      OrganizerTeamState state,
    ) async {
      final phones = <String>[];
      final hosts = <OrganizerHostProfile>[];
      final invites = <String>[];
      await pumpOrganizerBody(
        tester,
        OrganizerTeamBody(
          state: state,
          onPhone: phones.add,
          onInvite: () => invites.add('invite'),
          onHost: hosts.add,
        ),
      );
      return (phones, hosts, invites);
    }

    testWidgets('the owner sees the team, the invite and the roles', (
      tester,
    ) async {
      final (phones, hosts, invites) = await pump(
        tester,
        OrganizerTeamState(
          organizer: lanternLane(),
          currentUid: organizerOwnerUid,
          dialCode: '+91',
          phone: '98201 44718',
        ),
      );

      expect(find.text('Meher'), findsOneWidget);
      expect(find.text('You'), findsOneWidget);
      expect(find.text('Owner'), findsWidgets);
      expect(find.text('Dev Patel'), findsOneWidget);
      expect(find.text('Invite someone'), findsOneWidget);
      expect(find.text('What each role can do'), findsOneWidget);

      await tester.tap(find.text('Dev Patel'));
      await tester.tap(find.text('Meher'));
      await tester.tap(find.byKey(const ValueKey('team-invite-send')));
      expect(hosts.map((host) => host.uid), [organizerHostUid]);
      expect(invites, ['invite']);
      expect(phones, isEmpty);
    });

    testWidgets('a host sees the team without the invite', (tester) async {
      final (_, hosts, _) = await pump(
        tester,
        OrganizerTeamState(
          organizer: lanternLane(),
          currentUid: organizerHostUid,
          dialCode: '+91',
        ),
      );

      expect(find.text('Invite someone'), findsNothing);
      await tester.tap(find.text('Meher'));
      expect(hosts, isEmpty);
    });

    test('the invite number takes the calling code unless typed', () {
      OrganizerTeamState state(String phone) => OrganizerTeamState(
        organizer: lanternLane(),
        currentUid: organizerOwnerUid,
        dialCode: '+91',
        phone: phone,
      );
      expect(state('98201 44718').invitePhone, '+919820144718');
      expect(state('+44 7700 900123').invitePhone, '+447700900123');
      expect(state('123').canInvite, isFalse);
      expect(state('98201 44718').canInvite, isTrue);
    });
  });

  group('Settings', () {
    testWidgets('shows notifications, the account, help, sign out and the '
        'version', (tester) async {
      final actions = <OrganizerSettingsAction>[];
      final messages = <bool>[];
      await pumpOrganizerBody(
        tester,
        OrganizerSettingsBody(
          state: OrganizerSettingsState(
            name: 'Meher',
            phone: settingsMaskedPhone('+91 98201 44718'),
            organizerNames: const [
              'Lantern Lane Social',
              'Harbour Quiz League',
            ],
            messagesOn: true,
            version: '4.0.1',
            guidesAvailable: true,
            termsAvailable: true,
          ),
          onAction: actions.add,
          onMessages: messages.add,
        ),
      );

      expect(find.text('Tell me when'), findsOneWidget);
      expect(find.text('+91 98201 ·····'), findsOneWidget);
      expect(
        find.text('Lantern Lane Social, Harbour Quiz League'),
        findsOneWidget,
      );
      expect(find.text('Catch Host · version 4.0.1'), findsOneWidget);
      expect(find.text('Privacy'), findsNothing);

      await tester.tap(find.byKey(const ValueKey('settings-notify-messages')));
      await tester.tap(find.text('Your name'));
      await tester.tap(find.text('Organisers you run'));
      await tester.tap(find.text('Guides'));
      await tester.tap(find.text('Terms'));
      await tester.tap(find.text('Delete your account'));
      await tester.tap(find.text('Sign out'));
      expect(messages, [false]);
      expect(actions, [
        OrganizerSettingsAction.editName,
        OrganizerSettingsAction.switchOrganizer,
        OrganizerSettingsAction.guides,
        OrganizerSettingsAction.terms,
        OrganizerSettingsAction.deleteAccount,
        OrganizerSettingsAction.signOut,
      ]);
    });
  });

  group('Memberships', () {
    HostMembershipProgramView program({bool enabled = false}) =>
        HostMembershipProgramView(
          enabled: enabled,
          testMode: false,
          billingPause: HostMembershipBillingPauseState.active,
          memberCount: enabled ? 12 : 0,
          routeAccountReady: true,
          feeConfigured: true,
          exists: enabled,
          paymentMode: HostMembershipPaymentMode.hostCollected,
        );

    Future<(List<OrganizerMembershipsAction>, List<HostMembershipPlan>)> pump(
      WidgetTester tester,
      OrganizerMembershipsState state,
    ) async {
      final actions = <OrganizerMembershipsAction>[];
      final plans = <HostMembershipPlan>[];
      await pumpOrganizerBody(
        tester,
        OrganizerMembershipsBody(
          state: state,
          onAction: actions.add,
          onOpenPlan: plans.add,
        ),
      );
      return (actions, plans);
    }

    testWidgets('an off programme can be turned on', (tester) async {
      final (actions, _) = await pump(
        tester,
        OrganizerMembershipsState(program: program(), isOwner: true),
      );

      expect(find.text('Off'), findsOneWidget);
      expect(find.text('No plans yet.'), findsOneWidget);
      await tester.tap(find.byKey(const ValueKey('host-memberships-enable')));
      await tester.tap(find.text('New plan'));
      expect(actions, [
        OrganizerMembershipsAction.enable,
        OrganizerMembershipsAction.newPlan,
      ]);
    });

    testWidgets('a live programme pauses billing and opens its plans', (
      tester,
    ) async {
      final plan = testPlan();
      final (actions, plans) = await pump(
        tester,
        OrganizerMembershipsState(
          program: program(enabled: true),
          plans: [plan],
          isOwner: true,
        ),
      );

      await tester.tap(
        find.byKey(const ValueKey('host-memberships-billing-pause')),
      );
      await tester.tap(find.byKey(ValueKey('host-membership-plan-${plan.id}')));
      expect(actions, [OrganizerMembershipsAction.pauseBilling]);
      expect(plans, [plan]);
    });

    testWidgets('a failed read offers a retry', (tester) async {
      final (actions, _) = await pump(
        tester,
        OrganizerMembershipsState(error: StateError('offline')),
      );

      await tester.tap(find.text('Try again'));
      expect(actions, [OrganizerMembershipsAction.retry]);
    });
  });
}
