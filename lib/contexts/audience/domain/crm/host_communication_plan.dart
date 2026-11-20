enum HostCommunicationRouteId {
  personalWhatsappHandoff,
  personalEmailHandoff,
  organizerWhatsappCampaign,
  catchWhatsapp,
  catchChat,
  catchEventAnnouncement,
  organizerFollowerUpdate,
}

enum HostCommunicationRouteBlocker {
  catchAccountRequired,
  identityAmbiguous,
  missingPhone,
  missingEmail,
  organizerSuppressed,
  contactOptedOut,
  permissionRequired,
  senderUnavailable,
  intentUnsupported,
  contactUnavailable,
  endpointChanged,
}
