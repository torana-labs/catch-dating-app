import 'dart:async';

import 'package:catch_dating_app/contexts/account/account.dart';
import 'package:catch_dating_app/contexts/programmes/data/program_access_repository.dart';
import 'package:catch_dating_app/contexts/programmes/domain/program_inbox_views.dart';
import 'package:catch_dating_app/contexts/programmes/domain/program_whatsapp_models.dart';
import 'package:catch_platform/cache/app_clock.dart';
import 'package:catch_platform/errors/app_exception.dart';
import 'package:catch_platform/errors/backend_error_util.dart';
import 'package:catch_platform/firebase/firebase_providers.dart';
import 'package:catch_platform/firebase/live_paged_query.dart';
import 'package:catch_platform/streams/clocked_listener.dart';
import 'package:catch_platform/streams/combine_latest.dart';
import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:riverpod_annotation/riverpod_annotation.dart';

part 'program_inbox_views_repository.g.dart';

typedef _Rows = List<Map<Object?, Object?>>;

/// The wedding's WhatsApp inbox read through listeners (#1339) instead of
/// `listProgramWhatsappThreads`, `getProgramWhatsappThread` and
/// `listProgramWhatsappCannedReplies`: thread rows from
/// `programWhatsappThreadViews`, a conversation's messages from
/// `programWhatsappMessages` and the saved replies from
/// `programWhatsappCannedReplies`. Every read is gated on the duties that
/// talk to guests, communications or guest relations (the owner holds both),
/// so cached rows stop at the instant the last one ends. Replies, take-over
/// and mark-read stay commands.
class ProgramInboxViewsRepository {
  const ProgramInboxViewsRepository(this._firestore, this._access, this._clock);

  static const threadPageSize = 50;
  static const maxThreads = 500;
  static const messagePageSize = 50;
  static const cannedPageSize = 50;
  static const maxCannedReplies = 100;

  final FirebaseFirestore _firestore;
  final ProgramAccessRepository _access;
  final AppClock _clock;

  static const _threadsContext = BackendErrorContext(
    service: BackendService.firestore,
    action: 'load the guest messages',
    resource: 'programWhatsappThreadViews',
  );
  static const _threadContext = BackendErrorContext(
    service: BackendService.firestore,
    action: 'load the conversation',
    resource: 'programWhatsappMessages',
  );
  static const _cannedContext = BackendErrorContext(
    service: BackendService.firestore,
    action: 'load the saved replies',
    resource: 'programWhatsappCannedReplies',
  );

  Stream<T> _gated<T>(
    String programId,
    String uid,
    Stream<T> Function() data,
  ) => _access.gated<T>(
    programId,
    uid,
    needs: const {},
    allows: (state) => state.view!.holdsInbox(state.evaluatedAt),
    scopeOf: (state) => 'inbox',
    data: (state) => data(),
  );

  /// Every thread of the programme, newest message first, as raw rows.
  /// The inbox is a short list, so each next page opens as soon as the one
  /// before it has arrived.
  Stream<List<Map<Object?, Object?>>> watchThreadRows(
    String programId,
    String uid,
  ) => _gated(programId, uid, () => _threads(programId));

  Stream<_Rows> _threads(String programId) {
    final rows = _firestore
        .collection('programWhatsappThreadViews')
        .where('programId', isEqualTo: programId);
    return _allPages(
      _newestThreads(rows),
      pageSize: threadPageSize,
      maxRows: maxThreads,
      context: _threadsContext,
    ).map((pages) => pages.rows);
  }

  // firestore-index: programWhatsappThreadViews(programId:ASCENDING, lastMessageAtMillis:DESCENDING, __name__:DESCENDING)
  Query<Map<String, dynamic>> _newestThreads(
    Query<Map<String, dynamic>> rows,
  ) => rows
      .orderBy('lastMessageAtMillis', descending: true)
      .orderBy(FieldPath.documentId, descending: true);

  /// One conversation: the thread's view and its newest messages, with the
  /// window of the 24-hour service reply rebuilt at the instant it closes.
  Stream<ProgramWhatsappThread> watchThread(
    String programId,
    String threadId,
    String uid,
  ) {
    final source =
        _gated<({Map<Object?, Object?> thread, _Rows messages, bool more})>(
          programId,
          uid,
          () => combineLatest(
            _threadRow(threadId),
            _messages(programId, threadId),
            (thread, messages) => (
              thread: thread,
              messages: messages.rows,
              more: messages.hasMore,
            ),
          ),
        );
    return clockedListener<
          ({Map<Object?, Object?> thread, _Rows messages, bool more}),
          ({ProgramWhatsappThread value, DateTime? next})
        >(
          source,
          clock: _clock,
          build: (raw, now) {
            final value = programWhatsappThreadFromViews(
              programId: programId,
              threadRow: raw.thread,
              messageRows: raw.messages,
              moreMessages: raw.more,
              now: now,
            );
            final closes = value.summary.serviceWindowExpiresAt;
            return (value: value, next: closes.isAfter(now) ? closes : null);
          },
          nextRebuildAt: (built) => built.next,
        )
        .map((built) => built.value);
  }

  Stream<Map<Object?, Object?>> _threadRow(String threadId) =>
      withBackendErrorStream(
        () => _firestore
            .collection('programWhatsappThreadViews')
            .doc(threadId)
            .snapshots()
            .map(
              (snapshot) =>
                  snapshot.data() ??
                  (throw const DocumentNotFoundException('conversation')),
            ),
        context: _threadContext,
      );

  // firestore-index: programWhatsappMessages(programId:ASCENDING, threadId:ASCENDING, createdAtMillis:DESCENDING)
  Stream<({_Rows rows, bool hasMore})> _messages(
    String programId,
    String threadId,
  ) => _allPages(
    _firestore
        .collection('programWhatsappMessages')
        .where('programId', isEqualTo: programId)
        .where('threadId', isEqualTo: threadId)
        .orderBy('createdAtMillis', descending: true)
        .orderBy(FieldPath.documentId, descending: true),
    pageSize: messagePageSize,
    maxRows: programWhatsappThreadMessageWindow,
    context: _threadContext,
  );

  /// The programme's saved replies, live.
  Stream<List<ProgramCannedReply>> watchCannedReplies(
    String programId,
    String uid,
  ) => _gated(
    programId,
    uid,
    () => _allPages(
      _cannedReplies(programId),
      pageSize: cannedPageSize,
      maxRows: maxCannedReplies,
      context: _cannedContext,
    ).map((pages) => programCannedRepliesFromViews(pages.rows)),
  );

  Query<Map<String, dynamic>> _cannedReplies(String programId) => _firestore
      .collection('programWhatsappCannedReplies')
      .where('programId', isEqualTo: programId)
      .orderBy(FieldPath.documentId);

  /// Every row of [query], a page at a time (each page its own listener),
  /// with whether the cap cut the list short.
  Stream<({_Rows rows, bool hasMore})> _allPages(
    Query<Map<String, dynamic>> query, {
    required int pageSize,
    required int maxRows,
    required BackendErrorContext context,
  }) {
    final pager = LivePagedQuery<Map<String, dynamic>, Map<Object?, Object?>>(
      query: query,
      pageSize: pageSize,
      maxRows: maxRows,
      convert: (doc) => doc.data(),
      errorContext: context,
    );
    return pager.pages.map((pages) {
      if (pages.hasMore &&
          !pages.loadingMore &&
          pages.nextPageError == null &&
          pages.items.length < maxRows) {
        pager.loadMore();
      }
      return (
        rows: pages.items,
        hasMore: pages.hasMore && pages.items.length >= maxRows,
      );
    });
  }
}

// keepalive: account-free: a stateless repository over account-free SDK
// singletons.
@Riverpod(keepAlive: true)
ProgramInboxViewsRepository programInboxViewsRepository(Ref ref) =>
    ProgramInboxViewsRepository(
      ref.watch(firebaseFirestoreProvider),
      ref.watch(programAccessRepositoryProvider),
      ref.watch(appClockProvider),
    );

String _signedInUid(Ref ref, String action) {
  final uid = ref.watch(uidProvider).asData?.value;
  if (uid == null || uid.isEmpty) throw SignInRequiredException(action);
  return uid;
}

/// Every thread row of the programme, live.
@riverpod
Stream<List<Map<Object?, Object?>>> programWhatsappThreadRowsStream(
  Ref ref,
  String programId,
) => ref
    .watch(programInboxViewsRepositoryProvider)
    .watchThreadRows(programId, _signedInUid(ref, 'view the guest messages'));

/// One conversation, live.
@riverpod
Stream<ProgramWhatsappThread> programWhatsappThreadStream(
  Ref ref,
  String programId,
  String threadId,
) => ref
    .watch(programInboxViewsRepositoryProvider)
    .watchThread(
      programId,
      threadId,
      _signedInUid(ref, 'view the conversation'),
    );

/// The programme's saved replies, live.
@riverpod
Stream<List<ProgramCannedReply>> programCannedRepliesStream(
  Ref ref,
  String programId,
) => ref
    .watch(programInboxViewsRepositoryProvider)
    .watchCannedReplies(programId, _signedInUid(ref, 'view the saved replies'));
