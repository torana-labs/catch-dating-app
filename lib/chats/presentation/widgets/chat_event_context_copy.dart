import 'package:catch_dating_app/activity/domain/activity_taxonomy.dart';
import 'package:catch_dating_app/chats/presentation/chat_conversation_context.dart';
import 'package:catch_dating_app/contexts/events/domain/event.dart';

const chatContextFallbackStamp = 'MATCHED THROUGH CATCH';

String chatContextStampFor(
  Event? event, {
  ChatConversationContext conversationContext = ChatConversationContext.match,
}) {
  if (conversationContext != ChatConversationContext.match) {
    return conversationContext == ChatConversationContext.crossPathsEventPlan
        ? 'EVENT PLAN'
        : 'EVENT QUESTION';
  }
  if (event == null) return chatContextFallbackStamp;
  return chatContextStampForActivity(event.activityKind);
}

String chatContextStampForActivity(ActivityKind kind) {
  return switch (kind) {
    ActivityKind.socialRun || ActivityKind.running => 'YOU BOTH RAN',
    ActivityKind.walking => 'YOU BOTH WALKED',
    ActivityKind.pickleball => 'BOTH PLAYED PICKLEBALL',
    ActivityKind.padel => 'BOTH PLAYED PADEL',
    ActivityKind.tennis => 'BOTH PLAYED TENNIS',
    ActivityKind.badminton => 'BOTH PLAYED BADMINTON',
    ActivityKind.cycling => 'YOU BOTH RODE',
    ActivityKind.spinClass => 'MET AT SPIN CLASS',
    ActivityKind.yoga => 'MET THROUGH YOGA',
    ActivityKind.strengthTraining => 'MET THROUGH STRENGTH',
    ActivityKind.pubQuiz => 'MET AT PUB QUIZ',
    ActivityKind.barCrawl => 'MET ON BAR CRAWL',
    ActivityKind.dinner => 'MATCHED AFTER DINNER',
    ActivityKind.singlesMixer => 'MATCHED AFTER MIXER',
    ActivityKind.openActivity => 'MATCHED AFTER EVENT',
  };
}

String chatShareCardTitleFor(Event? event) {
  if (event == null) return 'After the event';
  return 'After ${event.eventFormat.eventTitleLabel.toLowerCase()}';
}

String chatEmptyThreadMessageFor({
  required Event? event,
  required String otherName,
  ChatConversationContext conversationContext = ChatConversationContext.match,
}) {
  final eventName = event?.title ?? 'the event';
  switch (conversationContext) {
    case ChatConversationContext.contactedHost:
      return 'Ask $otherName about $eventName.';
    case ChatConversationContext.attendeeInquiry:
      return 'Reply to $otherName about $eventName.';
    case ChatConversationContext.crossPathsEventPlan:
      return 'Make a plan with $otherName for $eventName.';
    case ChatConversationContext.match:
      break;
  }
  if (event == null) return 'Say hi to $otherName!';
  return '${_emptyThreadContextLead(event)}. Say hi to $otherName!';
}

String _emptyThreadContextLead(Event event) {
  final title = event.title;
  return switch (event.activityKind) {
    ActivityKind.socialRun || ActivityKind.running => 'You both ran $title',
    ActivityKind.walking => 'You both walked $title',
    ActivityKind.pickleball => 'You both played pickleball at $title',
    ActivityKind.padel => 'You both played padel at $title',
    ActivityKind.tennis => 'You both played tennis at $title',
    ActivityKind.badminton => 'You both played badminton at $title',
    ActivityKind.cycling => 'You both rode $title',
    ActivityKind.spinClass ||
    ActivityKind.yoga ||
    ActivityKind.strengthTraining ||
    ActivityKind.pubQuiz ||
    ActivityKind.barCrawl ||
    ActivityKind.dinner ||
    ActivityKind.singlesMixer ||
    ActivityKind.openActivity => 'You both met at $title',
  };
}
