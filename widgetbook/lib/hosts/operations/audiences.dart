import 'package:catch_dating_app/contexts/audience/data/crm/host_whatsapp_repository.dart';
import 'package:catch_dating_app/contexts/audience/domain/crm/host_messaging_setup.dart';
import 'package:catch_dating_app/design_fixtures/host_operations_fixtures.dart';
import 'package:catch_dating_app/hosts/presentation/host_audience_view.dart';
import 'package:catch_dating_app/hosts/presentation/host_operations_screen.dart';
import 'package:catch_dating_app/hosts/presentation/inbox/host_campaign_editor.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:widgetbook_annotation/widgetbook_annotation.dart' as widgetbook;

import '../../support/page_preview.dart';
import '../../support/widgetbook_harness.dart';
import 'preview.dart';
import 'shell_fixture.dart';

@widgetbook.UseCase(
  name: 'Shared Audience header',
  type: HostAudienceHeader,
  path: '[P1 product surfaces]/Host operations/Composed sections',
)
Widget hostAudienceHeaderStates(BuildContext context) =>
    WidgetbookPageCatalogFrame(
      title: 'HostAudienceHeader',
      contractId: 'screen.host.customers',
      children: [
        const WidgetbookPageStateCard(
          label: 'no organizer',
          child: WidgetbookHostDeviceFrame(child: HostAudienceHeader()),
        ),
        WidgetbookPageStateCard(
          label: 'organizer actions',
          child: WidgetbookHostDeviceFrame(
            child: HostAudienceHeader(
              organizerId: HostOperationsFixtures.primaryOrganizer.id,
            ),
          ),
        ),
      ],
    );

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
