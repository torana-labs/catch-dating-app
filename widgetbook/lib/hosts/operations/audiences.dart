import 'dart:async';

import 'package:catch_dating_app/contexts/audience/data/crm/host_saved_audience_repository.dart';
import 'package:catch_dating_app/contexts/audience/data/crm/host_whatsapp_repository.dart';
import 'package:catch_dating_app/contexts/audience/domain/crm/host_audience_query.dart';
import 'package:catch_dating_app/contexts/audience/domain/crm/host_messaging_setup.dart';
import 'package:catch_dating_app/contexts/audience/domain/crm/host_saved_audience.dart';
import 'package:catch_dating_app/contexts/audience/domain/crm/host_saved_audience_definition.dart';
import 'package:catch_dating_app/design_fixtures/host_operations_fixtures.dart';
import 'package:catch_dating_app/hosts/presentation/customers/host_customers_screen.dart';
import 'package:catch_dating_app/hosts/presentation/host_audience_view.dart';
import 'package:catch_dating_app/hosts/presentation/host_operations_screen.dart';
import 'package:catch_dating_app/hosts/presentation/inbox/host_campaign_editor.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:widgetbook_annotation/widgetbook_annotation.dart' as widgetbook;

import '../../preview_layout_contracts.dart';
import '../../support/page_preview.dart';
import '../../support/widgetbook_harness.dart';
import 'preview.dart';
import 'shell_fixture.dart';

@widgetbook.UseCase(
  name: 'Saved audience states',
  type: HostSavedAudiencesWorkspace,
  path: '[P1 product surfaces]/Host operations/Customers',
)
Widget hostSavedAudiencesStates(BuildContext context) {
  final organizerId = HostOperationsFixtures.primaryOrganizer.id;
  final audience = HostSavedAudience(
    organizerId: organizerId,
    audienceId: 'design-repeat-runners',
    name: 'Repeat runners',
    status: 'active',
    definition: const HostSavedAudienceDefinition(
      join: HostSavedAudienceJoin.all,
      predicates: [
        HostSavedAudienceComputedSegment(HostAudienceSegment.repeatAttendee),
      ],
    ),
    definitionHash: 'design-repeat-runners-hash',
    definitionVersion: 1,
    revision: 2,
    lastPreviewMatchCount: 24,
    lastPreviewReachSummary: const HostAudienceReachSummary(
      inCatch: 14,
      automatic: 0,
      byHand: 8,
      unavailable: 2,
    ),
    lastPreviewAt: DateTime(2030, 6, 20, 10),
    createdAt: DateTime(2030, 6, 18, 10),
    updatedAt: DateTime(2030, 6, 20, 10),
  );
  Widget frame(AsyncValue<HostSavedAudiencePage> value) =>
      WidgetbookHostDeviceFrame(
        height: WidgetbookPreviewLayout.feedbackViewportHeight,
        child: WidgetbookFixtureScope(
          overrides: [
            hostGroupDirectoryControllerProvider(organizerId).overrideWithBuild(
              (ref, notifier) => value.when(
                data: (page) => HostGroupDirectoryState(
                  page: HostSavedAudienceSummaryPage(
                    audiences: page.audiences
                        .map(HostSavedAudienceSummary.fromAudience)
                        .toList(),
                    nextCursor: page.nextCursor,
                  ),
                ),
                error: (error, stack) => Future.error(error, stack),
                loading: () => Completer<HostGroupDirectoryState>().future,
              ),
            ),
          ],
          child: CatchRootScreenScaffold.withPrimaryRail(
            header: CatchRootScreenHeader.custom(
              HostAudienceHeader(
                primaryAction: CatchTopBarPrimaryButton(
                  label: 'New group',
                  icon: CatchIcons.add,
                  onPressed: () {},
                ),
              ),
            ),
            actions: HostAudienceTabRail(
              selected: HostAudienceView.audiences,
              selectionPosition: 1,
              onChanged: (_) {},
            ),
            body: CatchRootScreenBody.single(
              page: CatchRootScreenPageSpec.scroll(
                page: HostSavedAudiencesWorkspace(
                  organizerId: organizerId,
                  query: null,
                  onOpen: (_) {},
                ),
              ),
            ),
          ),
        ),
      );
  return WidgetbookPageCatalogFrame(
    title: 'HostSavedAudiencesWorkspace',
    contractId: 'screen.host.customers',
    children: [
      WidgetbookPageStateCard(
        label: 'populated divided directory',
        child: frame(
          AsyncData(
            HostSavedAudiencePage(audiences: [audience], nextCursor: null),
          ),
        ),
      ),
      WidgetbookPageStateCard(
        label: 'empty',
        child: frame(
          const AsyncData(
            HostSavedAudiencePage(audiences: [], nextCursor: null),
          ),
        ),
      ),
      WidgetbookPageStateCard(
        label: 'error',
        child: frame(
          AsyncError(
            StateError('Saved audiences unavailable'),
            StackTrace.empty,
          ),
        ),
      ),
    ],
  );
}

@widgetbook.UseCase(
  name: 'Shared Audience header with group states',
  type: HostAudienceHeader,
  path: '[P1 product surfaces]/Host operations/Composed sections',
)
Widget hostAudienceHeaderStates(BuildContext context) =>
    hostSavedAudiencesStates(context);

@widgetbook.UseCase(
  name: 'Sender setup states',
  type: HostWhatsappSetupSection,
  path: '[P1 product surfaces]/Host operations/Messaging',
)
Widget hostWhatsappSetupSectionStates(BuildContext context) =>
    hostCustomerMessagingStates(context);

@widgetbook.UseCase(
  name: 'Campaign and sender states',
  type: HostCampaignEditor,
  path: '[P1 product surfaces]/Host operations/Messaging',
)
Widget hostCustomerMessagingStates(BuildContext context) {
  final organizerId = HostOperationsFixtures.primaryOrganizer.id;
  final messagingSetup = HostMessagingSetup(
    organizerId: organizerId,
    providerConfigured: true,
    embeddedSignup: HostWhatsappEmbeddedSignupConfig(
      appId: 'design-app',
      configId: 'design-config',
      graphVersion: 'v24.0',
    ),
    connection: HostWhatsappConnection(
      connectionId: 'design-whatsapp',
      status: 'active',
      displayPhoneNumber: '+91 98765 43210',
      verifiedName: 'Sunday Social Club',
      qualityRating: 'GREEN',
      messagingLimitTier: 'TIER_1K',
      templateSyncStatus: 'ready',
      webhookStatus: 'healthy',
      testStatus: 'verified',
      revision: 2,
    ),
    templates: [
      HostWhatsappTemplate(
        templateId: 'design-invitation',
        name: 'event_invitation',
        language: 'en_US',
        category: 'MARKETING',
        status: 'APPROVED',
        variableNames: ['first_name', 'invite_url'],
        hasMediaHeader: false,
        buttonKinds: ['URL'],
      ),
    ],
  );
  return WidgetbookPageCatalogFrame(
    title: 'Host Messaging',
    contractId: 'screen.host.inbox',
    children: [
      WidgetbookPageStateCard(
        label: 'campaign and sender workspace',
        child: WidgetbookHostDeviceFrame(
          child: WidgetbookHostShellScope(
            child: WidgetbookFixtureScope(
              overrides: [
                hostMessagingSetupProvider(
                  organizerId,
                ).overrideWithValue(AsyncData(messagingSetup)),
              ],
              child: Scaffold(
                body: SingleChildScrollView(
                  padding: CatchInsets.pageBody,
                  child: CatchSectionList(
                    emptyStateOmitted: true,
                    children: [
                      HostWhatsappSetupSection(
                        organizer: HostOperationsFixtures.primaryOrganizer,
                      ),
                      HostCampaignEditor(
                        organizer: HostOperationsFixtures.primaryOrganizer,
                      ),
                    ],
                  ),
                ),
              ),
            ),
          ),
        ),
      ),
    ],
  );
}
