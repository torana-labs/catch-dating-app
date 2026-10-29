import 'package:catch_dating_app/contexts/audience/data/crm/host_crm_callable.dart';
import 'package:catch_dating_app/contexts/audience/domain/crm/host_messaging_setup.dart';
import 'package:catch_dating_app/contexts/audience/domain/crm/host_whatsapp_thread.dart';
import 'package:catch_dating_app/core/data/read_limit_policy.dart';
import 'package:catch_dating_app/core/firebase_providers.dart';
import 'package:catch_dating_app/core/schema_contracts/generated/callable_request_dtos.g.dart';
import 'package:cloud_functions/cloud_functions.dart';
import 'package:riverpod_annotation/riverpod_annotation.dart';

part 'host_whatsapp_repository.g.dart';

class HostWhatsappRepository {
  const HostWhatsappRepository(this._functions);

  final FirebaseFunctions _functions;

  Future<HostMessagingSetup> getMessagingSetup(
    String organizerId, {
    String? connectionId,
  }) => _messagingAction(
    name: 'getOrganizerMessagingSetup',
    organizerId: organizerId,
    connectionId: connectionId,
    action: 'load WhatsApp setup',
  );

  Future<HostWhatsappThreadPage> listWhatsappThreads(
    String organizerId, {
    String? cursor,
    int limit = ReadLimitPolicy.historyPage,
  }) => callHostCrm(
    _functions,
    name: 'listOrganizerWhatsappThreads',
    payload: ListOrganizerWhatsappThreadsCallableRequest(
      organizerId: organizerId,
      limit: limit > 50 ? 50 : limit,
      cursor: cursor,
    ).toJson(),
    action: 'load organizer WhatsApp inbox',
    parse: HostWhatsappThreadPage.fromCallableData,
  );

  Future<HostWhatsappThreadDetail> getWhatsappThread({
    required String organizerId,
    required String threadId,
  }) => callHostCrm(
    _functions,
    name: 'getOrganizerWhatsappThread',
    payload: GetOrganizerWhatsappThreadCallableRequest(
      organizerId: organizerId,
      threadId: threadId,
    ).toJson(),
    action: 'load organizer WhatsApp conversation',
    parse: HostWhatsappThreadDetail.fromCallableData,
  );

  Future<void> sendWhatsappReply({
    required String organizerId,
    required HostWhatsappThreadDetail thread,
    required String body,
    required String idempotencyKey,
  }) => callHostCrm<Object?>(
    _functions,
    name: 'sendOrganizerWhatsappReply',
    payload: SendOrganizerWhatsappReplyCallableRequest(
      organizerId: organizerId,
      threadId: thread.threadId,
      body: body,
      expectedLastInboundAtMillis: thread.lastInboundAt.millisecondsSinceEpoch,
      idempotencyKey: idempotencyKey,
    ).toJson(),
    action: 'reply in organizer WhatsApp conversation',
    parse: (value) => value,
  );

  Future<HostMessagingSetup> completeWhatsappConnection(
    String organizerId,
    HostWhatsappSignupResult result,
  ) => callHostCrm(
    _functions,
    name: 'completeOrganizerWhatsappConnection',
    payload: CompleteOrganizerWhatsappConnectionCallableRequest(
      organizerId: organizerId,
      authorizationCode: result.authorizationCode,
      wabaId: result.wabaId,
      phoneNumberId: result.phoneNumberId,
      businessId: result.businessId,
    ).toJson(),
    action: 'connect WhatsApp sender',
    parse: HostMessagingSetup.fromCallableData,
  );

  Future<HostMessagingSetup> syncWhatsappTemplates(
    String organizerId,
    String connectionId,
  ) => _messagingAction(
    name: 'syncOrganizerWhatsappTemplates',
    organizerId: organizerId,
    connectionId: connectionId,
    action: 'sync WhatsApp templates',
  );

  Future<HostMessagingSetup> disconnectWhatsapp(
    String organizerId,
    String connectionId,
  ) => _messagingAction(
    name: 'disconnectOrganizerWhatsappConnection',
    organizerId: organizerId,
    connectionId: connectionId,
    action: 'disconnect WhatsApp sender',
  );

  Future<HostMessagingSetup> sendWhatsappTest({
    required String organizerId,
    required String connectionId,
    required String templateId,
    required String toE164,
    required Map<String, String> templateVariables,
  }) => callHostCrm(
    _functions,
    name: 'sendOrganizerWhatsappTest',
    payload: SendOrganizerWhatsappTestCallableRequest(
      organizerId: organizerId,
      connectionId: connectionId,
      templateId: templateId,
      toE164: toE164,
      templateVariables: templateVariables,
    ).toJson(),
    action: 'send WhatsApp verification message',
    parse: HostMessagingSetup.fromCallableData,
  );

  Future<HostMessagingSetup> _messagingAction({
    required String name,
    required String organizerId,
    required String action,
    String? connectionId,
  }) => callHostCrm(
    _functions,
    name: name,
    payload: OrganizerSenderConnectionActionCallableRequest(
      organizerId: organizerId,
      connectionId: connectionId,
    ).toJson(),
    action: action,
    parse: HostMessagingSetup.fromCallableData,
  );
}

// keepalive: Reuse the callable client for the whatsapp subdomain.
@Riverpod(keepAlive: true)
HostWhatsappRepository hostWhatsappRepository(Ref ref) =>
    HostWhatsappRepository(ref.watch(firebaseFunctionsProvider));

@riverpod
Future<HostMessagingSetup> hostMessagingSetup(Ref ref, String organizerId) =>
    ref.read(hostWhatsappRepositoryProvider).getMessagingSetup(organizerId);

@riverpod
Future<HostWhatsappThreadPage> hostWhatsappThreads(
  Ref ref,
  String organizerId,
) => ref.read(hostWhatsappRepositoryProvider).listWhatsappThreads(organizerId);
