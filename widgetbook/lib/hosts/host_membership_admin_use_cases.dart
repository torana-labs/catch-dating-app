import 'package:catch_dating_app/contexts/payments/domain/host_membership_admin.dart';
import 'package:catch_dating_app/hosts/presentation/hosted_event_membership_rules_section.dart';
import 'package:catch_dating_app/hosts/presentation/memberships/host_event_membership_rules_controller.dart';
import 'package:catch_dating_app/hosts/presentation/memberships/host_membership_plan_editor_sheet.dart';
import 'package:flutter/material.dart';
import 'package:widgetbook_annotation/widgetbook_annotation.dart' as widgetbook;
import 'package:widgetbook_workspace/host_memberships/fixtures.dart';
import 'package:widgetbook_workspace/support/page_preview.dart';
import 'package:widgetbook_workspace/support/widgetbook_harness.dart';
import 'package:widgetbook_workspace/utility/preview.dart';

const _path = '[P2 host surfaces]/Memberships';
const _previewEventId = 'event-preview';

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

class _PreviewEventRulesController extends HostEventMembershipRulesController {
  @override
  Future<HostEventMembershipRules> build(String eventId) async =>
      widgetbookEventMembershipRules();
}
