import 'package:catch_dating_app/chats/presentation/inbox/chats_list_view_model.dart';
import 'package:catch_dating_app/contexts/audience/domain/crm/host_whatsapp_thread.dart';
import 'package:catch_dating_app/contexts/connections/domain/match.dart';

ChatThreadPreview preview(
  String id,
  String uid, {
  String org = 'org',
  List<String> events = const [],
}) {
  final match = Match(
    id: id,
    user1Id: 'host',
    user2Id: uid,
    clubId: org,
    conversationType: MatchConversationType.clubHostInquiry,
    createdAt: DateTime(2026, 9, 10),
    eventIds: events,
  );
  return ChatThreadPreview(
    match: match,
    matchId: id,
    otherUid: uid,
    displayName: 'Same name',
    photoUrl: null,
    previewText: 'Catch $id',
    timestamp: DateTime(2026, 9, 10),
    unreadCount: 2,
    hasConversation: true,
    eventIds: events,
  );
}

HostWhatsappThreadSummary wa(
  String id,
  String contact, {
  String? uid,
  List<String> events = const [],
}) => HostWhatsappThreadSummary(
  threadId: id,
  contactId: contact,
  linkedUid: uid,
  displayName: 'Same name',
  eventIds: events,
  lastMessageBody: 'WhatsApp $id',
  lastMessageDirection: HostWhatsappMessageDirection.inbound,
  lastMessageAt: DateTime(2026, 9, 11),
  lastInboundAt: DateTime(2026, 9, 11),
  serviceWindowExpiresAt: DateTime(2026, 9, 12),
  serviceWindowOpen: true,
);
