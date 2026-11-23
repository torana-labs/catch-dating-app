enum ChatConversationContext {
  match,
  contactedHost,
  attendeeInquiry,
  crossPathsEventPlan,
}

ChatConversationContext chatConversationContextFor({
  required bool isHostInquiry,
  required bool viewerIsHost,
  bool isCrossPathsEventPlan = false,
}) {
  if (isCrossPathsEventPlan) {
    return ChatConversationContext.crossPathsEventPlan;
  }
  if (!isHostInquiry) return ChatConversationContext.match;
  return viewerIsHost
      ? ChatConversationContext.attendeeInquiry
      : ChatConversationContext.contactedHost;
}
