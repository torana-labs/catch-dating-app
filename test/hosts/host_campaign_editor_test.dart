import 'package:catch_dating_app/contexts/audience/data/crm/host_saved_audience_repository.dart';
import 'package:catch_dating_app/contexts/audience/data/crm/host_whatsapp_repository.dart';
import 'package:catch_dating_app/contexts/audience/domain/crm/host_audience_query.dart';
import 'package:catch_dating_app/contexts/audience/domain/crm/host_messaging_setup.dart';
import 'package:catch_dating_app/contexts/audience/domain/crm/host_saved_audience.dart';
import 'package:catch_dating_app/contexts/audience/domain/crm/host_saved_audience_definition.dart';
import 'package:catch_dating_app/contexts/events/data/event_repository.dart';
import 'package:catch_dating_app/contexts/events/domain/event.dart';
import 'package:catch_dating_app/hosts/presentation/inbox/host_campaign_editor.dart';
import 'package:catch_dating_app/l10n/generated/app_localizations.dart';
import 'package:catch_dating_app/platform/theme/app_theme.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';

import '../clubs/clubs_test_helpers.dart';

void main() {
  testWidgets('initial audience id selects the Customers-owned audience', (
    tester,
  ) async {
    const organizerId = 'organizer-1';
    final club = buildClub(id: organizerId);
    final audience = _audience(organizerId);

    await tester.pumpWidget(
      ProviderScope(
        overrides: [
          hostSavedAudiencesProvider(organizerId).overrideWithValue(
            AsyncData(
              HostSavedAudiencePage(audiences: [audience], nextCursor: null),
            ),
          ),
          hostMessagingSetupProvider(organizerId).overrideWithValue(
            const AsyncData(
              HostMessagingSetup(
                organizerId: organizerId,
                providerConfigured: true,
                embeddedSignup: HostWhatsappEmbeddedSignupConfig(
                  appId: 'app-id',
                  configId: 'config-id',
                  graphVersion: 'v24.0',
                ),
                connection: HostWhatsappConnection(
                  connectionId: 'connection-1',
                  status: 'active',
                  displayPhoneNumber: '+91 98765 43210',
                  verifiedName: 'Catch Social',
                  qualityRating: 'GREEN',
                  messagingLimitTier: 'TIER_1K',
                  templateSyncStatus: 'ready',
                  webhookStatus: 'healthy',
                  testStatus: 'verified',
                  revision: 1,
                ),
                templates: [
                  HostWhatsappTemplate(
                    templateId: 'template-1',
                    name: 'organizer_update',
                    language: 'en_US',
                    category: 'MARKETING',
                    status: 'APPROVED',
                    variableNames: [],
                    hasMediaHeader: false,
                    buttonKinds: [],
                  ),
                ],
              ),
            ),
          ),
          watchEventsForClubProvider(
            organizerId,
          ).overrideWith((ref) => Stream.value(const <Event>[])),
        ],
        child: MaterialApp(
          theme: AppTheme.light,
          localizationsDelegates: AppLocalizations.localizationsDelegates,
          supportedLocales: AppLocalizations.supportedLocales,
          home: Scaffold(
            body: SingleChildScrollView(
              child: HostCampaignEditor(
                club: club,
                initialSavedAudienceId: audience.audienceId,
              ),
            ),
          ),
        ),
      ),
    );
    await tester.pump();
    await tester.pump();

    expect(find.text('Lapsed customers · 12 people at last preview'), findsOne);
  });
}

HostSavedAudience _audience(String organizerId) => HostSavedAudience(
  organizerId: organizerId,
  audienceId: 'audience-1',
  name: 'Lapsed customers',
  status: 'active',
  definition: const HostSavedAudienceDefinition(
    join: HostSavedAudienceJoin.all,
    predicates: [
      HostSavedAudienceComputedSegment(HostAudienceSegment.lapsedRegular),
    ],
  ),
  definitionHash:
      'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
  definitionVersion: 1,
  revision: 1,
  lastPreviewMatchCount: 12,
  lastPreviewAt: DateTime(2026, 8, 30),
  createdAt: DateTime(2026, 8, 30),
  updatedAt: DateTime(2026, 8, 30),
);
