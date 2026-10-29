/// Product routes are intentionally more specific than transports.
///
/// Two routes may both use WhatsApp while retaining different sender,
/// consent, delivery, and observability contracts.
enum CommunicationRouteId {
  personalWhatsappHandoff,
  personalEmailHandoff,
  organizerWhatsappCampaign,
  catchWhatsapp,
  catchChat,
  catchEventAnnouncement,
  organizerFollowerUpdate,
  catchEventSms,
  catchEventRcs,
  organizerEventWhatsapp,
}

enum CommunicationTransport { catchApp, whatsapp, sms, rcs, email }

enum CommunicationSenderIdentity {
  hostPersonalDevice,
  organizerManaged,
  catchPlatform,
}

enum CommunicationDeliveryMode {
  externalHandoff,
  directConversation,
  campaign,
  eventAnnouncement,
  followerUpdate,
  platformMessage,
  eventService,
}

enum CommunicationConsentScope {
  directUserAction,
  linkedCatchAccount,
  eventService,
  organizerMarketing,
  followPreference,
  catchMessaging,
}

enum CommunicationAudienceScope {
  singleContact,
  organizerCrmSegment,
  catchPermissionedAudience,
  linkedCatchAccount,
  eventRoster,
  organizerFollowers,
}

enum CommunicationObservability { none, catchActivity, providerReceipts }

class CommunicationRouteCapability {
  const CommunicationRouteCapability({
    required this.id,
    required this.transport,
    required this.adapterKey,
    required this.senderIdentity,
    required this.deliveryMode,
    required this.audienceScope,
    required this.consentScope,
    required this.observability,
    required this.requiresHostFinalSend,
    required this.supportsReplies,
    required this.supportsScheduling,
  });

  final CommunicationRouteId id;
  final CommunicationTransport transport;

  /// Stable adapter identifier. New market providers add a route/adapter
  /// without weakening the sender or consent boundary of existing routes.
  final String adapterKey;
  final CommunicationSenderIdentity senderIdentity;
  final CommunicationDeliveryMode deliveryMode;
  final CommunicationAudienceScope audienceScope;
  final CommunicationConsentScope consentScope;
  final CommunicationObservability observability;
  final bool requiresHostFinalSend;
  final bool supportsReplies;
  final bool supportsScheduling;
}

const communicationRouteCatalog =
    <CommunicationRouteId, CommunicationRouteCapability>{
      CommunicationRouteId.personalWhatsappHandoff:
          CommunicationRouteCapability(
            id: CommunicationRouteId.personalWhatsappHandoff,
            transport: CommunicationTransport.whatsapp,
            adapterKey: 'whatsapp_handoff',
            senderIdentity: CommunicationSenderIdentity.hostPersonalDevice,
            deliveryMode: CommunicationDeliveryMode.externalHandoff,
            audienceScope: CommunicationAudienceScope.singleContact,
            consentScope: CommunicationConsentScope.directUserAction,
            observability: CommunicationObservability.none,
            requiresHostFinalSend: true,
            supportsReplies: true,
            supportsScheduling: false,
          ),
      CommunicationRouteId.personalEmailHandoff:
          CommunicationRouteCapability(
            id: CommunicationRouteId.personalEmailHandoff,
            transport: CommunicationTransport.email,
            adapterKey: 'mailto_handoff',
            senderIdentity: CommunicationSenderIdentity.hostPersonalDevice,
            deliveryMode: CommunicationDeliveryMode.externalHandoff,
            audienceScope: CommunicationAudienceScope.singleContact,
            consentScope: CommunicationConsentScope.directUserAction,
            observability: CommunicationObservability.none,
            requiresHostFinalSend: true,
            supportsReplies: true,
            supportsScheduling: false,
          ),
      CommunicationRouteId.organizerWhatsappCampaign:
          CommunicationRouteCapability(
            id: CommunicationRouteId.organizerWhatsappCampaign,
            transport: CommunicationTransport.whatsapp,
            adapterKey: 'meta_whatsapp_business',
            senderIdentity: CommunicationSenderIdentity.organizerManaged,
            deliveryMode: CommunicationDeliveryMode.campaign,
            audienceScope: CommunicationAudienceScope.organizerCrmSegment,
            consentScope: CommunicationConsentScope.organizerMarketing,
            observability: CommunicationObservability.providerReceipts,
            requiresHostFinalSend: false,
            supportsReplies: true,
            supportsScheduling: true,
          ),
      CommunicationRouteId.catchWhatsapp: CommunicationRouteCapability(
        id: CommunicationRouteId.catchWhatsapp,
        transport: CommunicationTransport.whatsapp,
        adapterKey: 'catch_whatsapp_business',
        senderIdentity: CommunicationSenderIdentity.catchPlatform,
        deliveryMode: CommunicationDeliveryMode.platformMessage,
        audienceScope: CommunicationAudienceScope.catchPermissionedAudience,
        consentScope: CommunicationConsentScope.catchMessaging,
        observability: CommunicationObservability.providerReceipts,
        requiresHostFinalSend: false,
        supportsReplies: true,
        supportsScheduling: true,
      ),
      CommunicationRouteId.catchChat: CommunicationRouteCapability(
        id: CommunicationRouteId.catchChat,
        transport: CommunicationTransport.catchApp,
        adapterKey: 'catch_chat',
        senderIdentity: CommunicationSenderIdentity.organizerManaged,
        deliveryMode: CommunicationDeliveryMode.directConversation,
        audienceScope: CommunicationAudienceScope.linkedCatchAccount,
        consentScope: CommunicationConsentScope.linkedCatchAccount,
        observability: CommunicationObservability.catchActivity,
        requiresHostFinalSend: false,
        supportsReplies: true,
        supportsScheduling: false,
      ),
      CommunicationRouteId.catchEventAnnouncement: CommunicationRouteCapability(
        id: CommunicationRouteId.catchEventAnnouncement,
        transport: CommunicationTransport.catchApp,
        adapterKey: 'catch_activity_push',
        senderIdentity: CommunicationSenderIdentity.organizerManaged,
        deliveryMode: CommunicationDeliveryMode.eventAnnouncement,
        audienceScope: CommunicationAudienceScope.eventRoster,
        consentScope: CommunicationConsentScope.eventService,
        observability: CommunicationObservability.catchActivity,
        requiresHostFinalSend: false,
        supportsReplies: false,
        supportsScheduling: false,
      ),
      CommunicationRouteId.organizerFollowerUpdate:
          CommunicationRouteCapability(
            id: CommunicationRouteId.organizerFollowerUpdate,
            transport: CommunicationTransport.catchApp,
            adapterKey: 'catch_activity_push',
            senderIdentity: CommunicationSenderIdentity.organizerManaged,
            deliveryMode: CommunicationDeliveryMode.followerUpdate,
            audienceScope: CommunicationAudienceScope.organizerFollowers,
            consentScope: CommunicationConsentScope.followPreference,
            observability: CommunicationObservability.catchActivity,
            requiresHostFinalSend: false,
            supportsReplies: false,
            supportsScheduling: false,
          ),
      CommunicationRouteId.catchEventSms: CommunicationRouteCapability(
        id: CommunicationRouteId.catchEventSms,
        transport: CommunicationTransport.sms,
        adapterKey: 'event_service_sms',
        senderIdentity: CommunicationSenderIdentity.catchPlatform,
        deliveryMode: CommunicationDeliveryMode.eventService,
        audienceScope: CommunicationAudienceScope.eventRoster,
        consentScope: CommunicationConsentScope.eventService,
        observability: CommunicationObservability.providerReceipts,
        requiresHostFinalSend: false,
        supportsReplies: false,
        supportsScheduling: false,
      ),
      CommunicationRouteId.catchEventRcs: CommunicationRouteCapability(
        id: CommunicationRouteId.catchEventRcs,
        transport: CommunicationTransport.rcs,
        adapterKey: 'event_service_rcs',
        senderIdentity: CommunicationSenderIdentity.catchPlatform,
        deliveryMode: CommunicationDeliveryMode.eventService,
        audienceScope: CommunicationAudienceScope.eventRoster,
        consentScope: CommunicationConsentScope.eventService,
        observability: CommunicationObservability.providerReceipts,
        requiresHostFinalSend: false,
        supportsReplies: true,
        supportsScheduling: false,
      ),
      CommunicationRouteId.organizerEventWhatsapp: CommunicationRouteCapability(
        id: CommunicationRouteId.organizerEventWhatsapp,
        transport: CommunicationTransport.whatsapp,
        adapterKey: 'meta_whatsapp_business',
        senderIdentity: CommunicationSenderIdentity.organizerManaged,
        deliveryMode: CommunicationDeliveryMode.eventService,
        audienceScope: CommunicationAudienceScope.eventRoster,
        consentScope: CommunicationConsentScope.eventService,
        observability: CommunicationObservability.providerReceipts,
        requiresHostFinalSend: false,
        supportsReplies: true,
        supportsScheduling: false,
      ),
    };

CommunicationRouteCapability communicationRouteCapability(
  CommunicationRouteId id,
) => communicationRouteCatalog[id]!;
