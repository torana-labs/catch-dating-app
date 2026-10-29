import 'package:catch_dating_app/contexts/audience/data/crm/host_contacts_repository.dart';
import 'package:catch_dating_app/contexts/audience/data/crm/host_saved_audience_repository.dart';
import 'package:catch_dating_app/contexts/audience/domain/crm/host_audience_contact.dart';
import 'package:catch_dating_app/contexts/audience/domain/crm/host_audience_query.dart';
import 'package:catch_dating_app/contexts/audience/domain/crm/host_saved_audience.dart';
import 'package:catch_dating_app/contexts/audience/domain/crm/host_saved_audience_definition.dart';
import 'package:catch_dating_app/contexts/audience/domain/crm/host_saved_audience_filter_options.dart';
import 'package:catch_dating_app/hosts/presentation/customers/host_customers_screen.dart';
import 'package:catch_dating_app/hosts/presentation/customers/host_saved_audience_members_controller.dart';
import 'package:catch_dating_app/hosts/presentation/forms/host_form_automations_screen.dart';
import 'package:catch_dating_app/hosts/presentation/forms/host_form_operations_controller.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:widgetbook_annotation/widgetbook_annotation.dart' as widgetbook;

import '../preview_layout_contracts.dart';

final _audience = HostSavedAudience(
  organizerId: 'preview-organizer',
  audienceId: 'preview-audience',
  name: 'Sunday regulars',
  status: 'active',
  definition: const HostSavedAudienceDefinition(
    join: HostSavedAudienceJoin.all,
    predicates: [HostSavedAudienceAttendedEvent('sunday-social')],
  ),
  definitionHash: 'preview-definition',
  definitionVersion: 2,
  revision: 1,
  lastPreviewMatchCount: 1,
  lastPreviewReachSummary: _reach,
  lastPreviewAt: DateTime(2026, 9, 3, 12),
  createdAt: DateTime(2026, 9, 3),
  updatedAt: DateTime(2026, 9, 3),
);
const _reach = HostAudienceReachSummary(
  inCatch: 0,
  automatic: 0,
  byHand: 1,
  unavailable: 0,
);

@widgetbook.UseCase(
  name: 'Membership filters and saved counts',
  type: HostSavedAudiencesList,
  path: '[P1 product surfaces]/Host operations/Customers',
)
Widget hostGroupsDirectory(BuildContext context) => ProviderScope(
  overrides: [
    hostGroupDirectoryControllerProvider(
      _audience.organizerId,
    ).overrideWithBuild(
      (ref, notifier) async => HostGroupDirectoryState(
        page: HostSavedAudienceSummaryPage(
          audiences: [HostSavedAudienceSummary.fromAudience(_audience)],
          nextCursor: null,
        ),
      ),
    ),
  ],
  child: SizedBox(
    width: WidgetbookPreviewLayout.wideContractWidth,
    height: WidgetbookPreviewLayout.hostEditorViewportHeight,
    child: CustomScrollView(
      slivers: [
        HostSavedAudiencesList(
          organizerId: _audience.organizerId,
          query: null,
          onOpen: (_) {},
        ),
      ],
    ),
  ),
);
const _options = HostSavedAudienceFilterOptions(
  forms: [
    HostAudienceSourceOption(id: 'application', title: 'Club application'),
  ],
  questions: [
    HostAudienceQuestionOption(
      formId: 'application',
      versionId: 'application-v1',
      version: 1,
      formTitle: 'Club application',
      questionId: 'drink',
      label: 'Favorite drink',
      options: [HostAudienceAnswerOption(label: 'Coffee', value: 'coffee')],
    ),
  ],
  events: [
    HostAudienceSourceOption(id: 'sunday-social', title: 'Sunday social'),
  ],
  tags: [],
);

@widgetbook.UseCase(
  name: 'Overview and explicit editing',
  type: HostSavedAudienceWorkspace,
  path: '[P1 product surfaces]/Host operations/Customers',
)
Widget hostSavedAudienceOverviewState(BuildContext context) => ProviderScope(
  overrides: [
    hostSavedAudienceFilterOptionsProvider(
      _audience.organizerId,
    ).overrideWith((_) async => _options),
    hostSavedAudienceMembersControllerProvider(
      _audience,
    ).overrideWith(_PreviewAudienceMembers.new),
  ],
  child: SizedBox(
    width: WidgetbookPreviewLayout.wideContractWidth,
    height: WidgetbookPreviewLayout.hostEditorViewportHeight,
    child: HostSavedAudienceWorkspace(audience: _audience),
  ),
);

class _PreviewAudienceMembers extends HostSavedAudienceMembersController {
  @override
  Future<HostSavedAudienceMembersState> build(
    HostSavedAudience audience,
  ) async {
    const members = [
      HostSavedAudiencePreviewContact(
        contactId: 'preview-ada',
        displayName: 'Ada',
      ),
    ];
    return HostSavedAudienceMembersState(
      members: members,
      preview: HostSavedAudiencePreview(
        audience: audience,
        matchCount: 1,
        reachSummary: _reach,
        sample: members,
        evaluatedAt: DateTime(2026, 9, 3, 12),
      ),
    );
  }
}

@widgetbook.UseCase(
  name: 'Published source filters',
  type: HostAudienceSourceRuleSection,
  path: '[P1 product surfaces]/Host operations/Customers',
)
Widget hostAudienceSourceRuleStates(BuildContext context) => SizedBox(
  width: WidgetbookPreviewLayout.wideContractWidth,
  child: SingleChildScrollView(
    child: Column(
      children: [
        for (final kind in HostAudienceSourceRuleKind.values)
          HostAudienceSourceRuleSection(
            kind: kind,
            options: _options,
            enabled: true,
            predicate: switch (kind) {
              HostAudienceSourceRuleKind.spend => const HostSavedAudienceSpend(
                operator: HostSavedAudienceAttendanceOperator.atLeast,
                currency: 'INR',
                amountMinor: 100000,
                withinDays: 90,
              ),
              HostAudienceSourceRuleKind.attendedEvent =>
                const HostSavedAudienceAttendedEvent('sunday-social'),
              HostAudienceSourceRuleKind.applicationStatus =>
                const HostSavedAudienceApplicationStatusRule(
                  formId: 'application',
                  reviewStatus: HostSavedAudienceApplicationStatus.approved,
                ),
              HostAudienceSourceRuleKind.formAnswer =>
                const HostSavedAudienceFormAnswer(
                  formId: 'application',
                  versionId: 'application-v1',
                  questionId: 'drink',
                  value: 'coffee',
                ),
            },
            onChanged: (_) {},
          ),
      ],
    ),
  ),
);

@widgetbook.UseCase(
  name: 'Members, rules and evaluated reach',
  type: HostSavedAudienceSection,
  path: '[P1 product surfaces]/Host operations/Customers',
)
Widget hostSavedAudienceOverviewOnlyState(BuildContext context) =>
    hostSavedAudienceOverviewState(context);

@widgetbook.UseCase(
  name: 'Selected and unavailable people',
  type: HostStaticAudienceMembersEditor,
  path: '[P1 product surfaces]/Host operations/Customers',
)
Widget hostStaticAudienceMembersState(BuildContext context) => ProviderScope(
  overrides: [
    hostStaticAudienceMembersProvider(
      'preview-organizer',
      '["ada","deleted"]',
    ).overrideWith(
      (_) async => const [
        HostStaticAudienceMember(
          selectedContactId: 'ada',
          contactId: 'ada',
          displayName: 'Ada',
          available: true,
        ),
        HostStaticAudienceMember(
          selectedContactId: 'deleted',
          contactId: null,
          displayName: null,
          available: false,
        ),
      ],
    ),
    hostAudienceProvider(
      'preview-organizer',
      const HostAudienceQuery(sort: HostAudienceSort.name),
    ).overrideWith(
      (_) async => const HostAudiencePage(
        organizerId: 'preview-organizer',
        contacts: [],
        nextCursor: null,
        matchCount: 0,
        matchCountCoverage: HostAudienceMatchCountCoverage.exact,
        sourceCoverage: HostAudienceSourceCoverage.exact,
        projectionVersion: 1,
      ),
    ),
  ],
  child: SizedBox(
    width: WidgetbookPreviewLayout.wideContractWidth,
    height: WidgetbookPreviewLayout.hostEditorViewportHeight,
    child: SingleChildScrollView(
      child: HostStaticAudienceMembersEditor(
        organizerId: 'preview-organizer',
        selectedIds: const {'ada', 'deleted'},
        enabled: true,
        onChanged: (_) {},
      ),
    ),
  ),
);

@widgetbook.UseCase(
  name: 'Acceptance automation editor',
  type: HostAutomationRuleEditor,
  path: '[P1 product surfaces]/Host operations/Customers',
)
Widget hostAutomationEditorState(BuildContext context) => ProviderScope(
  overrides: [
    hostFormAutomationsControllerProvider(
      'preview-organizer',
      null,
    ).overrideWith(_PreviewAutomations.new),
    hostSavedAudienceFilterOptionsProvider(
      'preview-organizer',
    ).overrideWith((_) async => _options),
  ],
  child: SizedBox(
    width: WidgetbookPreviewLayout.wideContractWidth,
    height: WidgetbookPreviewLayout.hostEditorViewportHeight,
    child: HostAutomationRuleEditor(
      organizerId: 'preview-organizer',
      onSaved: () {},
      onCancel: () {},
    ),
  ),
);

@widgetbook.UseCase(
  name: 'Organizer automations empty',
  type: HostFormAutomationsScreen,
  path: '[P1 product surfaces]/Host operations/Customers',
)
Widget hostAutomationsEmptyState(BuildContext context) => ProviderScope(
  overrides: [
    hostFormAutomationsControllerProvider(
      'preview-organizer',
      null,
    ).overrideWith(_PreviewAutomations.new),
  ],
  child: const SizedBox(
    width: WidgetbookPreviewLayout.wideContractWidth,
    height: WidgetbookPreviewLayout.hostEditorViewportHeight,
    child: HostFormAutomationsScreen(organizerId: 'preview-organizer'),
  ),
);

class _PreviewAutomations extends HostFormAutomationsController {
  @override
  Future<HostFormAutomationsState> build(
    String organizerId,
    String? formId,
  ) async =>
      const HostFormAutomationsState(rules: [], runs: [], nextCursor: null);
}
