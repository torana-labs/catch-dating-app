import 'package:catch_dating_app/contexts/audience/data/crm/host_whatsapp_repository.dart';
import 'package:catch_dating_app/contexts/audience/domain/crm/host_whatsapp_thread.dart';
import 'package:catch_dating_app/contexts/messaging/data/conversation_repository.dart';
import 'package:riverpod_annotation/riverpod_annotation.dart';

part 'host_person_conversation_controller.g.dart';

@riverpod
Future<HostWhatsappThreadDetail> hostPersonWhatsappDetail(
  Ref ref,
  String organizerId,
  String threadId,
) => ref
    .watch(hostWhatsappRepositoryProvider)
    .getWhatsappThread(organizerId: organizerId, threadId: threadId);

@riverpod
HostPersonConversationController hostPersonConversationController(Ref ref) =>
    HostPersonConversationController(ref);

class HostPersonConversationController {
  HostPersonConversationController(this.ref);
  final Ref ref;
  Future<void> markRead(String conversationId, String uid) => ref
      .read(conversationRepositoryProvider)
      .markRead(conversationId: conversationId, uid: uid);
  Future<void> reply({
    required String organizerId,
    required HostWhatsappThreadDetail thread,
    required String body,
    required String idempotencyKey,
  }) async {
    await ref
        .read(hostWhatsappRepositoryProvider)
        .sendWhatsappReply(
          organizerId: organizerId,
          thread: thread,
          body: body,
          idempotencyKey: idempotencyKey,
        );
    if (!ref.mounted) return;
    ref.invalidate(
      hostPersonWhatsappDetailProvider(organizerId, thread.threadId),
    );
    ref.invalidate(hostWhatsappThreadsProvider(organizerId));
  }
}
