import 'package:catch_dating_app/contexts/account/account.dart';
import 'package:catch_dating_app/contexts/audience/data/crm/host_crm_callable.dart';
import 'package:catch_dating_app/contexts/audience/domain/crm/host_messaging_setup.dart';
import 'package:catch_dating_app/contexts/audience/domain/crm/host_whatsapp_thread.dart';
import 'package:catch_kernel/read_model_family.dart';
import 'package:catch_platform/cache/app_clock.dart';
import 'package:catch_platform/errors/app_exception.dart';
import 'package:catch_platform/errors/backend_error_util.dart';
import 'package:catch_platform/firebase/firebase_providers.dart';
import 'package:catch_platform/firebase/live_pages.dart';
import 'package:catch_platform/firebase/read_limit_policy.dart';
import 'package:catch_platform/firebase/scoped_read_models.dart';
import 'package:catch_platform/schema_contracts/generated/callable_request_dtos.g.dart';
import 'package:catch_platform/streams/clocked_listener.dart';
import 'package:catch_platform/streams/combine_latest.dart';
import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:cloud_functions/cloud_functions.dart';
import 'package:riverpod_annotation/riverpod_annotation.dart';

part 'host_whatsapp_repository.g.dart';

/// How many of a thread's newest messages the conversation shows, as the
/// conversation callable did.
const hostWhatsappThreadMessageLimit = 200;

class HostWhatsappRepository {
  const HostWhatsappRepository(
    this._functions, {
    required this._firestore,
    required this._summaries,
    required this._clock,
  });

  static const threadViews = 'hostWhatsappThreadViews';
  static const messages = 'organizerWhatsappMessages';

  final FirebaseFunctions _functions;
  final FirebaseFirestore _firestore;
  final ScopedReadModelReader _summaries;
  final AppClock _clock;

  Future<HostMessagingSetup> getMessagingSetup(
    String organizerId, {
    String? connectionId,
  }) => _messagingAction(
    name: 'getOrganizerMessagingSetup',
    organizerId: organizerId,
    connectionId: connectionId,
    action: 'load WhatsApp setup',
  );

  /// The organizer's WhatsApp threads from `hostWhatsappThreadViews`,
  /// newest message first, [pageSize] at a time. Every row shown stays live:
  /// a new message from the webhook moves its thread at once, and the list
  /// opens offline from the device cache. Rules let only the organizer's
  /// current managers read the views.
  // firestore-index: hostWhatsappThreadViews(organizerId:ASCENDING, lastMessageAtMillis:DESCENDING, __name__:DESCENDING)
  LivePager<HostWhatsappThreadSummary> watchWhatsappThreads(
    String organizerId, {
    int pageSize = ReadLimitPolicy.historyPage,
  }) => _summaries
      .watchPages(
        collection: threadViews,
        scopeId: organizerId,
        orderField: 'lastMessageAtMillis',
        descending: true,
        pageSize: pageSize,
      )
      .map((doc) => HostWhatsappThreadSummary.fromView(doc, now: _clock.now()));

  /// One thread while it is listened to: its view and its newest messages,
  /// oldest first. Null while the thread has no view (not written yet, or
  /// past retention). The reply window closes on screen when it lapses.
  Stream<HostWhatsappThreadDetail?> watchWhatsappThread({
    required String organizerId,
    required String threadId,
  }) {
    final view = _summaries.watchDocument(
      collection: threadViews,
      scopeId: organizerId,
      id: threadId,
    );
    return clockedListener<
      (Map<String, dynamic>?, List<Map<String, Object?>>),
      HostWhatsappThreadDetail?
    >(
      combineLatest(
        view,
        _watchMessages(organizerId, threadId),
        (view, messages) => (view, messages),
      ),
      clock: _clock,
      build: (value, now) {
        final (view, messages) = value;
        if (view == null) return null;
        final summary = HostWhatsappThreadSummary.fromView(view, now: now);
        if (!summary.isRetainedAt(now)) return null;
        final retained = [
          for (final message in messages)
            if ((message['expiresAtMillis']! as int) >
                now.millisecondsSinceEpoch)
              HostWhatsappMessage.fromMap(message),
        ];
        return HostWhatsappThreadDetail.fromView(
          organizerId: organizerId,
          summary: summary,
          messages: retained
              .take(hostWhatsappThreadMessageLimit)
              .toList()
              .reversed
              .toList(),
          messagesTruncated: messages.length > hostWhatsappThreadMessageLimit,
          now: now,
        );
      },
      nextRebuildAt: (detail) => detail != null && detail.serviceWindowOpen
          ? detail.serviceWindowExpiresAt
          : null,
    );
  }

  /// The thread's newest messages, newest first, one more than the
  /// conversation shows so it can say there are older ones.
  // firestore-index: organizerWhatsappMessages(organizerId:ASCENDING, threadId:ASCENDING, occurredAt:DESCENDING, __name__:DESCENDING)
  Stream<List<Map<String, Object?>>> _watchMessages(
    String organizerId,
    String threadId,
  ) => withBackendErrorStream(
    () => _firestore
        .collection(messages)
        .where('organizerId', isEqualTo: organizerId)
        .where('threadId', isEqualTo: threadId)
        .orderBy('occurredAt', descending: true)
        .orderBy(FieldPath.documentId, descending: true)
        .limit(hostWhatsappThreadMessageLimit + 1)
        .snapshots()
        .map(
          (snapshot) => [
            for (final doc in snapshot.docs) _message(doc, organizerId),
          ],
        ),
    context: const BackendErrorContext(
      service: BackendService.firestore,
      action: 'watch organizer WhatsApp conversation',
      resource: messages,
    ),
  );

  static Map<String, Object?> _message(
    QueryDocumentSnapshot<Map<String, dynamic>> doc,
    String organizerId,
  ) {
    final data = doc.data();
    final occurredAt = data['occurredAt'];
    final expiresAt = data['expiresAt'];
    if (data['organizerId'] != organizerId ||
        occurredAt is! Timestamp ||
        expiresAt is! Timestamp) {
      throw const FormatException('Unsupported WhatsApp message.');
    }
    return {
      'messageId': doc.id,
      'direction': data['direction'],
      'body': data['body'],
      'occurredAtMillis': occurredAt.millisecondsSinceEpoch,
      'expiresAtMillis': expiresAt.millisecondsSinceEpoch,
    };
  }

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

// keepalive: account-free: Reuse the callable client for the whatsapp
// subdomain.
@Riverpod(keepAlive: true)
HostWhatsappRepository hostWhatsappRepository(Ref ref) {
  ref.watch(authenticatedSessionProvider);
  return HostWhatsappRepository(
    ref.watch(firebaseFunctionsProvider),
    firestore: ref.watch(firebaseFirestoreProvider),
    summaries: ScopedReadModelReader(
      ref.watch(firebaseFirestoreProvider),
      family: hostReadModels,
      actorId: () => ref.read(firebaseAuthProvider).currentUser?.uid,
    ),
    clock: ref.watch(appClockProvider),
  );
}

@riverpod
Future<HostMessagingSetup> hostMessagingSetup(Ref ref, String organizerId) =>
    ref.watch(hostWhatsappRepositoryProvider).getMessagingSetup(organizerId);

/// The organizer's WhatsApp threads, a page at a time, every row shown
/// live. Threads past their retention are left out.
@riverpod
class HostWhatsappThreadPages extends _$HostWhatsappThreadPages {
  late LivePager<HostWhatsappThreadSummary> _pager;

  @override
  Stream<LivePages<HostWhatsappThreadSummary>> build(String organizerId) {
    final clock = ref.watch(appClockProvider);
    _pager = ref
        .watch(hostWhatsappRepositoryProvider)
        .watchWhatsappThreads(organizerId);
    return _pager.pages.map((pages) {
      final now = clock.now();
      return LivePages(
        items: List.unmodifiable(
          pages.items.where((thread) => thread.isRetainedAt(now)),
        ),
        hasMore: pages.hasMore,
        loadingMore: pages.loadingMore,
        nextPageError: pages.nextPageError,
        nextPageStackTrace: pages.nextPageStackTrace,
      );
    });
  }

  /// Opens the next page, or retries the one that failed.
  void loadMore() => _pager.loadMore();
}

/// The WhatsApp threads opened so far, live: the first page until the
/// inbox asks for more.
@riverpod
Future<List<HostWhatsappThreadSummary>> hostWhatsappThreads(
  Ref ref,
  String organizerId,
) async => (await ref.watch(
  hostWhatsappThreadPagesProvider(organizerId).future,
)).items;
