import 'package:catch_dating_app/contexts/messaging/domain/communication_route.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  test('every supported route declares a stable adapter contract', () {
    expect(communicationRouteCatalog.keys, CommunicationRouteId.values);
    expect(
      communicationRouteCatalog.values.every(
        (route) => route.adapterKey.trim().isNotEmpty,
      ),
      isTrue,
    );
  });

  test('personal WhatsApp is an untracked host-confirmed handoff', () {
    final route = communicationRouteCapability(
      CommunicationRouteId.personalWhatsappHandoff,
    );

    expect(
      route.senderIdentity,
      CommunicationSenderIdentity.hostPersonalDevice,
    );
    expect(route.requiresHostFinalSend, isTrue);
    expect(route.audienceScope, CommunicationAudienceScope.singleContact);
    expect(route.observability, CommunicationObservability.none);
    expect(route.supportsScheduling, isFalse);
  });

  test('organizer and Catch WhatsApp never share sender or consent scope', () {
    final organizer = communicationRouteCapability(
      CommunicationRouteId.organizerWhatsappCampaign,
    );
    final catchRoute = communicationRouteCapability(
      CommunicationRouteId.catchWhatsapp,
    );

    expect(
      organizer.senderIdentity,
      CommunicationSenderIdentity.organizerManaged,
    );
    expect(
      organizer.consentScope,
      CommunicationConsentScope.organizerMarketing,
    );
    expect(
      organizer.audienceScope,
      CommunicationAudienceScope.organizerCrmSegment,
    );
    expect(
      catchRoute.senderIdentity,
      CommunicationSenderIdentity.catchPlatform,
    );
    expect(catchRoute.consentScope, CommunicationConsentScope.catchMessaging);
    expect(
      catchRoute.audienceScope,
      CommunicationAudienceScope.catchPermissionedAudience,
    );
    expect(catchRoute.adapterKey, isNot(organizer.adapterKey));
  });

  test('Catch chat, announcements, and follower updates stay distinct', () {
    expect(
      communicationRouteCapability(CommunicationRouteId.catchChat).deliveryMode,
      CommunicationDeliveryMode.directConversation,
    );
    expect(
      communicationRouteCapability(
        CommunicationRouteId.catchChat,
      ).audienceScope,
      CommunicationAudienceScope.linkedCatchAccount,
    );
    expect(
      communicationRouteCapability(
        CommunicationRouteId.catchEventAnnouncement,
      ).consentScope,
      CommunicationConsentScope.eventService,
    );
    expect(
      communicationRouteCapability(
        CommunicationRouteId.catchEventAnnouncement,
      ).audienceScope,
      CommunicationAudienceScope.eventRoster,
    );
    expect(
      communicationRouteCapability(
        CommunicationRouteId.organizerFollowerUpdate,
      ).consentScope,
      CommunicationConsentScope.followPreference,
    );
    expect(
      communicationRouteCapability(
        CommunicationRouteId.organizerFollowerUpdate,
      ).audienceScope,
      CommunicationAudienceScope.organizerFollowers,
    );
  });

  test(
    'event-service routes do not inherit marketing or native SMS replies',
    () {
      for (final id in [
        CommunicationRouteId.catchEventSms,
        CommunicationRouteId.catchEventRcs,
        CommunicationRouteId.organizerEventWhatsapp,
      ]) {
        final route = communicationRouteCapability(id);
        expect(route.consentScope, CommunicationConsentScope.eventService);
        expect(route.audienceScope, CommunicationAudienceScope.eventRoster);
        expect(route.requiresHostFinalSend, isFalse);
      }
      expect(
        communicationRouteCapability(
          CommunicationRouteId.catchEventSms,
        ).supportsReplies,
        isFalse,
      );
    },
  );
}
