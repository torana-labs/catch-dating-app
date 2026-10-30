import 'package:catch_dating_app/contexts/payments/domain/host_membership_admin.dart';
import 'package:catch_dating_app/design_fixtures/host_operations_fixtures.dart';
import 'package:catch_dating_app/hosts/presentation/host_operations_screen.dart';
import 'package:catch_dating_app/hosts/presentation/hosted_event_membership_rules_section.dart';
import 'package:catch_dating_app/hosts/presentation/memberships/host_event_membership_rules_controller.dart';
import 'package:catch_dating_app/hosts/presentation/memberships/host_membership_plan_editor_sheet.dart';
import 'package:catch_dating_app/hosts/presentation/memberships/host_memberships_controller.dart';
import 'package:catch_dating_app/hosts/presentation/memberships/host_memberships_section.dart';
import 'package:catch_dating_app/hosts/presentation/memberships/host_memberships_state.dart';
import 'package:flutter/material.dart';
import 'package:widgetbook_annotation/widgetbook_annotation.dart' as widgetbook;
import 'package:widgetbook_workspace/host_memberships/fixtures.dart';
import 'package:widgetbook_workspace/hosts/operations/shell_fixture.dart';
import 'package:widgetbook_workspace/support/page_preview.dart';
import 'package:widgetbook_workspace/support/widgetbook_harness.dart';
import 'package:widgetbook_workspace/utility/preview.dart';

const _path = '[P2 host surfaces]/Memberships';
const _previewEventId = 'event-preview';

@widgetbook.UseCase(
  name: 'Off, payouts blocked, live and billing paused',
  type: HostMembershipsSection,
  path: _path,
)
Widget hostMembershipsSectionStates(BuildContext context) =>
    WidgetbookFixtureScope(
      overrides: const [],
      child: WidgetbookScrollCatalogFrame(
        title: 'Memberships settings',
        catalogId: 'host.memberships.section',
        children: [
          for (final (label, state) in [
            ('program off', widgetbookHostMembershipsState(enabled: false)),
            (
              'payout account not ready',
              widgetbookHostMembershipsState(enabled: false, routeReady: false),
            ),
            ('enabled with plans', widgetbookHostMembershipsState()),
            (
              'billing paused',
              widgetbookHostMembershipsState(billingPauseState: 'paused'),
            ),
          ])
            WidgetbookPageStateCard(
              label: label,
              child: WidgetbookContentFrame(
                child: HostMembershipsSection(
                  state: state,
                  onProgramCommand: (_) {},
                  onOpenPlan: (_) {},
                ),
              ),
            ),
        ],
      ),
    );

@widgetbook.UseCase(
  name: 'Owner loaded',
  type: HostMembershipsCard,
  path: _path,
)
Widget hostMembershipsCardStates(BuildContext context) =>
    WidgetbookFixtureScope(
      overrides: [
        hostMembershipsControllerProvider(
          HostOperationsFixtures.primaryClub.id,
        ).overrideWith(_PreviewMembershipsController.new),
      ],
      child: WidgetbookScrollCatalogFrame(
        title: 'Memberships card',
        catalogId: 'host.memberships.card',
        children: [
          WidgetbookContentFrame(
            child: HostMembershipsCard(
              club: HostOperationsFixtures.primaryClub,
              isOwner: true,
            ),
          ),
        ],
      ),
    );

@widgetbook.UseCase(
  name: 'Owner loaded',
  type: HostClubMembershipsScreen,
  path: _path,
)
Widget hostClubMembershipsScreenLoaded(BuildContext context) =>
    WidgetbookPageCatalogFrame(
      title: 'HostClubMembershipsScreen',
      contractId: 'screen.host.clubs',
      children: [
        WidgetbookPageStateCard(
          label: 'owner loaded',
          child: WidgetbookHostShellScope(
            child: WidgetbookFixtureScope(
              overrides: [
                hostMembershipsControllerProvider(
                  HostOperationsFixtures.primaryClub.id,
                ).overrideWith(_PreviewMembershipsController.new),
              ],
              child: WidgetbookUtilityDeviceFrame(
                child: HostClubMembershipsScreen(
                  clubId: HostOperationsFixtures.primaryClub.id,
                ),
              ),
            ),
          ),
        ),
      ],
    );

@widgetbook.UseCase(
  name: 'New and existing plan',
  type: HostMembershipPlanEditorSheet,
  path: _path,
)
Widget hostMembershipPlanEditorSheetStates(BuildContext context) =>
    WidgetbookFixtureScope(
      overrides: const [],
      child: WidgetbookScrollCatalogFrame(
        title: 'Membership plan editor',
        catalogId: 'host.memberships.plan_editor',
        children: [
          const WidgetbookPageStateCard(
            label: 'new plan',
            child: WidgetbookUtilitySheetFrame(
              child: HostMembershipPlanEditorSheet(
                organizerId: widgetbookMembershipOrganizerId,
              ),
            ),
          ),
          WidgetbookPageStateCard(
            label: 'published plan',
            child: WidgetbookUtilitySheetFrame(
              child: HostMembershipPlanEditorSheet(
                organizerId: widgetbookMembershipOrganizerId,
                plan: widgetbookMembershipPlan(),
              ),
            ),
          ),
        ],
      ),
    );

@widgetbook.UseCase(
  name: 'Unset and configured',
  type: HostedEventMembershipRulesEditor,
  path: _path,
)
Widget hostedEventMembershipRulesEditorStates(BuildContext context) =>
    WidgetbookFixtureScope(
      overrides: const [],
      child: WidgetbookScrollCatalogFrame(
        title: 'Event member rules',
        catalogId: 'host.memberships.event_rules_editor',
        children: [
          for (final (label, rules) in [
            ('no rules yet', widgetbookEventMembershipRules(configured: false)),
            ('included, 48h early access', widgetbookEventMembershipRules()),
          ])
            WidgetbookPageStateCard(
              label: label,
              child: WidgetbookContentFrame(
                child: HostedEventMembershipRulesEditor(rules: rules),
              ),
            ),
        ],
      ),
    );

@widgetbook.UseCase(
  name: 'Loaded rules',
  type: HostedEventMembershipRulesSection,
  path: _path,
)
Widget hostedEventMembershipRulesSectionStates(BuildContext context) =>
    WidgetbookFixtureScope(
      overrides: [
        hostEventMembershipRulesControllerProvider(
          _previewEventId,
        ).overrideWith(_PreviewEventRulesController.new),
      ],
      child: const WidgetbookScrollCatalogFrame(
        title: 'Event member rules section',
        catalogId: 'host.memberships.event_rules_section',
        children: [
          WidgetbookContentFrame(
            child: HostedEventMembershipRulesSection(eventId: _previewEventId),
          ),
        ],
      ),
    );

class _PreviewMembershipsController extends HostMembershipsController {
  @override
  Future<HostMembershipsState> build(String organizerId) async =>
      widgetbookHostMembershipsState();
}

class _PreviewEventRulesController extends HostEventMembershipRulesController {
  @override
  Future<HostEventMembershipRules> build(String eventId) async =>
      widgetbookEventMembershipRules();
}
