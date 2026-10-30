import 'package:catch_dating_app/contexts/audience/data/crm/host_whatsapp_repository.dart';
import 'package:catch_dating_app/contexts/audience/domain/crm/host_messaging_setup.dart';
import 'package:catch_dating_app/contexts/bookings/data/event_participation_repository.dart';
import 'package:catch_dating_app/contexts/events/data/event_repository.dart';
import 'package:catch_dating_app/contexts/organizers/data/organizer_posts_repository.dart';
import 'package:catch_dating_app/design_fixtures/host_inbox_surface_fixtures.dart';
import 'package:catch_dating_app/hosts/presentation/inbox/host_event_announcement_field.dart';
import 'package:catch_dating_app/hosts/presentation/inbox/host_inbox_view_model.dart';
import 'package:catch_dating_app/hosts/presentation/inbox/host_send_intent_menu.dart';
import 'package:catch_dating_app/hosts/presentation/inbox/host_sends_back_button.dart';
import 'package:flutter/material.dart';
import 'package:widgetbook_annotation/widgetbook_annotation.dart' as widgetbook;
import 'package:widgetbook_workspace/support/page_preview.dart';
import 'package:widgetbook_workspace/support/widgetbook_harness.dart';

@widgetbook.UseCase(
  name: 'Ready and unavailable channels',
  type: HostSendIntentMenu,
  path: '[P1 product surfaces]/Host/Inbox/Components',
)
Widget hostSendIntentMenuStates(BuildContext context) =>
    WidgetbookScrollCatalogFrame(
      title: 'HostSendIntentMenu',
      catalogId: 'host.send_intent',
      children: [
        for (final available in [true, false])
          WidgetbookPageStateCard(
            label: available ? 'All channels ready' : 'Channels unavailable',
            child: _HostSendIntentFixture(
              available: available,
              child: HostSendIntentMenu(
                organizer: HostInboxSurfaceFixtures.organizer,
                onBack: _noop,
                onOpenInbox: _noop,
                onStartCampaign: _noop,
                onStartEventAnnouncement: (_) async {},
                onStartFollowerUpdate: (_) async {},
                preferredEventId: HostInboxSurfaceFixtures.eventId,
                initialSegment: HostInboxAudienceSegment.booked,
                broadcastEnabled: available,
                now: HostInboxSurfaceFixtures.now,
              ),
            ),
          ),
      ],
    );

@widgetbook.UseCase(
  name: 'Ready and disabled announcement',
  type: HostEventAnnouncementField,
  path: '[P1 product surfaces]/Host/Inbox/Components',
)
Widget hostEventAnnouncementFieldStates(BuildContext context) =>
    WidgetbookScrollCatalogFrame(
      title: 'HostEventAnnouncementField',
      catalogId: 'host.event_announcement',
      children: [
        for (final available in [true, false])
          WidgetbookPageStateCard(
            label: available
                ? 'Booked and waitlisted audience'
                : 'Send disabled',
            child: _HostSendIntentFixture(
              available: available,
              child: HostEventAnnouncementField(
                organizerId: HostInboxSurfaceFixtures.clubId,
                preferredEventId: HostInboxSurfaceFixtures.eventId,
                initialSegment: HostInboxAudienceSegment.booked,
                sendingEnabled: available,
                now: HostInboxSurfaceFixtures.now,
                onStart: (_) async {},
              ),
            ),
          ),
      ],
    );

@widgetbook.UseCase(
  name: 'Enabled and busy',
  type: HostSendsBackButton,
  path: '[P1 product surfaces]/Host/Inbox/Components',
)
Widget hostSendsBackButtonStates(BuildContext context) =>
    const WidgetbookScrollCatalogFrame(
      title: 'HostSendsBackButton',
      catalogId: 'host.sends_back',
      children: [
        WidgetbookPageStateCard(
          label: 'Enabled',
          child: HostSendsBackButton(onPressed: _noop),
        ),
        WidgetbookPageStateCard(
          label: 'Busy',
          child: HostSendsBackButton(onPressed: null),
        ),
      ],
    );

class _HostSendIntentFixture extends StatelessWidget {
  const _HostSendIntentFixture({required this.available, required this.child});

  final bool available;
  final Widget child;

  @override
  Widget build(BuildContext context) => WidgetbookFixtureScope(
    overrides: [
      hostMessagingSetupProvider(HostInboxSurfaceFixtures.clubId).overrideWith(
        (ref) async => HostMessagingSetup(
          organizerId: HostInboxSurfaceFixtures.clubId,
          providerConfigured: available,
          embeddedSignup: const HostWhatsappEmbeddedSignupConfig(
            appId: null,
            configId: null,
            graphVersion: null,
          ),
          connection: available
              ? const HostWhatsappConnection(
                  connectionId: 'preview-sender',
                  status: 'active',
                  displayPhoneNumber: null,
                  verifiedName: 'Quiz House Social',
                  qualityRating: 'GREEN',
                  messagingLimitTier: null,
                  templateSyncStatus: 'complete',
                  webhookStatus: 'ready',
                  testStatus: 'passed',
                  revision: 1,
                )
              : null,
          templates: const [
            HostWhatsappTemplate(
              templateId: 'preview-invitation',
              name: 'Event invitation',
              language: 'en',
              category: 'MARKETING',
              status: 'APPROVED',
              variableNames: [],
              hasMediaHeader: false,
              buttonKinds: [],
            ),
          ],
        ),
      ),
      watchOrganizerPostRemainingWeeklyQuotaProvider(
        HostInboxSurfaceFixtures.clubId,
      ).overrideWith((ref) => Stream.value(available ? 3 : 0)),
      watchEventsForOrganizerProvider(
        HostInboxSurfaceFixtures.clubId,
      ).overrideWith((ref) => Stream.value([HostInboxSurfaceFixtures.event])),
      watchEventParticipationsForEventProvider(
        HostInboxSurfaceFixtures.eventId,
      ).overrideWith(
        (ref) => Stream.value(HostInboxSurfaceFixtures.participations),
      ),
    ],
    child: WidgetbookContentFrame(child: child),
  );
}

void _noop() {}
