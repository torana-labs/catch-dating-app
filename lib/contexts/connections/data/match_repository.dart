import 'dart:async';

import 'package:catch_dating_app/contexts/connections/domain/match.dart';
import 'package:catch_dating_app/platform/app_config.dart';
import 'package:catch_dating_app/platform/errors/app_exception.dart';
import 'package:catch_dating_app/platform/errors/backend_error_util.dart';
import 'package:catch_dating_app/platform/firebase/cursor_page.dart';
import 'package:catch_dating_app/platform/firebase/firebase_providers.dart';
import 'package:catch_dating_app/platform/firebase/firestore_converters.dart';
import 'package:catch_dating_app/platform/firebase/read_limit_policy.dart';
import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:riverpod_annotation/riverpod_annotation.dart';

part 'match_repository.g.dart';

class MatchPageCursor {
  const MatchPageCursor({
    this.user1Cursor,
    this.user2Cursor,
    this.user1Exhausted = false,
    this.user2Exhausted = false,
  });

  final DocumentSnapshot<Match>? user1Cursor;
  final DocumentSnapshot<Match>? user2Cursor;
  final bool user1Exhausted;
  final bool user2Exhausted;
}

class MatchRepository {
  const MatchRepository(this._db);

  static const _collectionPath = 'matches';

  final FirebaseFirestore _db;

  CollectionReference<Match> get _matchesRef => _db
      .collection(_collectionPath)
      .withDocumentIdConverter<Match>(
        idField: 'id',
        fromJson: Match.fromJson,
        toJson: (match) => match.toJson(),
      );

  DocumentReference<Match> _matchRef(String id) => _matchesRef.doc(id);

  // ── Read ──────────────────────────────────────────────────────────────────

  /// Streams all active matches where the given user is a participant.
  ///
  /// This intentionally uses two equality queries instead of the denormalized
  /// `participantIds` array. Firestore rules can prove `user1Id == uid` and
  /// `user2Id == uid` list queries directly, while the array query is not
  /// accepted by the rules engine for this rule shape.
  Stream<List<Match>> watchMatchesForUser({required String uid}) {
    late final StreamSubscription<List<Match>> user1Subscription;
    late final StreamSubscription<List<Match>> user2Subscription;
    List<Match>? user1Matches;
    List<Match>? user2Matches;

    return withBackendErrorStream(
      () => Stream.multi((controller) {
        void emitIfReady() {
          final first = user1Matches;
          final second = user2Matches;
          if (first == null || second == null) return;

          final byId = <String, Match>{};
          for (final match in [...first, ...second]) {
            byId[match.id] = match;
          }

          final matches = byId.values.toList()
            ..sort((a, b) => b.createdAt.compareTo(a.createdAt));
          controller.add(matches);
        }

        user1Subscription =
            _watchActiveMatchesByParticipantField(
              field: 'user1Id',
              uid: uid,
            ).listen((matches) {
              user1Matches = matches;
              emitIfReady();
            }, onError: controller.addError);
        user2Subscription =
            _watchActiveMatchesByParticipantField(
              field: 'user2Id',
              uid: uid,
            ).listen((matches) {
              user2Matches = matches;
              emitIfReady();
            }, onError: controller.addError);

        controller.onCancel = () async {
          await user1Subscription.cancel();
          await user2Subscription.cancel();
        };
      }),
      context: const BackendErrorContext(
        service: BackendService.firestore,
        action: 'watch matches',
        resource: _collectionPath,
      ),
    );
  }

  Stream<List<Match>> _watchActiveMatchesByParticipantField({
    required String field,
    required String uid,
  }) => withBackendErrorStream(
    () => _matchesRef
        .where(field, isEqualTo: uid)
        .where('status', isEqualTo: 'active')
        .orderBy('createdAt', descending: true)
        .limit(ReadLimitPolicy.historyPage)
        .snapshots()
        .map((snap) => snap.docs.map((d) => d.data()).toList()),
    context: const BackendErrorContext(
      service: BackendService.firestore,
      action: 'watch active matches',
      resource: _collectionPath,
    ),
  );

  /// Fetches the next page across both rule-compatible participant queries.
  /// The compound cursor remembers when either branch is exhausted so a later
  /// page never restarts that branch from its beginning.
  Future<CursorPage<Match, MatchPageCursor>> fetchMatchesForUserPage({
    required String uid,
    MatchPageCursor? startAfter,
    int limit = ReadLimitPolicy.historyPage,
  }) => withBackendErrorContext(
    () async {
      final cursor = startAfter ?? const MatchPageCursor();
      final user1Future = cursor.user1Exhausted
          ? Future.value(CursorPage.empty<Match, DocumentSnapshot<Match>>())
          : _fetchActiveMatchesByParticipantFieldPage(
              field: 'user1Id',
              uid: uid,
              startAfter: cursor.user1Cursor,
              limit: limit,
            );
      final user2Future = cursor.user2Exhausted
          ? Future.value(CursorPage.empty<Match, DocumentSnapshot<Match>>())
          : _fetchActiveMatchesByParticipantFieldPage(
              field: 'user2Id',
              uid: uid,
              startAfter: cursor.user2Cursor,
              limit: limit,
            );
      final (user1Page, user2Page) = await (user1Future, user2Future).wait;

      final byId = <String, Match>{
        for (final match in [...user1Page.items, ...user2Page.items])
          match.id: match,
      };
      final matches = byId.values.toList(growable: false)
        ..sort((left, right) => right.createdAt.compareTo(left.createdAt));
      final hasMore = user1Page.hasMore || user2Page.hasMore;
      return CursorPage(
        items: List.unmodifiable(matches),
        nextCursor: hasMore
            ? MatchPageCursor(
                user1Cursor: user1Page.nextCursor,
                user2Cursor: user2Page.nextCursor,
                user1Exhausted: !user1Page.hasMore,
                user2Exhausted: !user2Page.hasMore,
              )
            : null,
        hasMore: hasMore,
      );
    },
    context: const BackendErrorContext(
      service: BackendService.firestore,
      action: 'fetch matches page',
      resource: _collectionPath,
    ),
  );

  Future<CursorPage<Match, DocumentSnapshot<Match>>>
  _fetchActiveMatchesByParticipantFieldPage({
    required String field,
    required String uid,
    required DocumentSnapshot<Match>? startAfter,
    required int limit,
  }) async {
    final page = await _matchesRef
        .where(field, isEqualTo: uid)
        .where('status', isEqualTo: 'active')
        .orderBy('createdAt', descending: true)
        .fetchDocumentCursorPage(
          limit: limit,
          startAfter: startAfter,
          errorContext: const BackendErrorContext(
            service: BackendService.firestore,
            action: 'fetch matches page',
            resource: _collectionPath,
          ),
        );
    return CursorPage(
      items: List.unmodifiable(page.items.map((document) => document.data())),
      nextCursor: page.nextCursor,
      hasMore: page.hasMore,
    );
  }

  Stream<Match?> watchMatch({required String matchId}) =>
      withBackendErrorStream(
        () => _matchRef(
          matchId,
        ).snapshots().map((doc) => doc.exists ? doc.data() : null),
        context: const BackendErrorContext(
          service: BackendService.firestore,
          action: 'watch match',
          resource: _collectionPath,
        ),
      );

  // ── Write ─────────────────────────────────────────────────────────────────

  /// Resets the unread count for [uid] in the given match to zero.
  /// Called when the user opens a chat, both on entry and exit.
  ///
  /// Only swallows [FirebaseException] with code `not-found` — the match
  /// document may not exist yet if a Cloud Function hasn't created it.
  /// All other errors (permission-denied, network, etc.) propagate.
  Future<void> resetUnread({required String matchId, required String uid}) =>
      withBackendErrorContext(
        () => _matchRef(matchId)
            .update({'unreadCounts.$uid': 0})
            .catchError(
              (Object _) {},
              test: (Object error) =>
                  error is FirebaseException && error.code == 'not-found',
            ),
        context: const BackendErrorContext(
          service: BackendService.firestore,
          action: 'reset unread count',
          resource: _collectionPath,
        ),
      );
}

List<Match> collapseMatchesByOtherUser(List<Match> matches, String uid) {
  final buckets =
      <
        ({
          MatchConversationType type,
          String? clubId,
          String? eventId,
          String otherId,
        }),
        List<Match>
      >{};
  for (final match in matches) {
    final otherId = match.otherId(uid);
    final bucketKey = match.isScopedConversation
        ? (
            type: match.conversationType,
            clubId: match.clubId,
            eventId: match.latestEventId,
            otherId: otherId,
          )
        : (
            type: match.conversationType,
            clubId: null,
            eventId: null,
            otherId: otherId,
          );
    buckets.putIfAbsent(bucketKey, () => []).add(match);
  }

  return buckets.values.map((bucket) {
    bucket.sort((a, b) => _chatSortTime(b).compareTo(_chatSortTime(a)));

    final conversationMatches =
        bucket.where((match) => match.lastMessagePreview != null).toList()
          ..sort((a, b) => _chatSortTime(b).compareTo(_chatSortTime(a)));
    final selected = conversationMatches.isNotEmpty
        ? conversationMatches.first
        : bucket.first;
    final hasUnreadIncoming = bucket.any(
      (match) => match.hasUnreadIncomingFor(uid),
    );

    final mergedEventIds = <String>[];
    for (final match in bucket.reversed) {
      for (final eventId in match.eventIds) {
        if (!mergedEventIds.contains(eventId)) mergedEventIds.add(eventId);
      }
    }

    return selected.copyWith(
      eventIds: mergedEventIds,
      unreadCounts: {...selected.unreadCounts, uid: hasUnreadIncoming ? 1 : 0},
    );
  }).toList();
}

DateTime _chatSortTime(Match match) => match.lastMessageAt ?? match.createdAt;

@riverpod
MatchRepository matchRepository(Ref ref) =>
    MatchRepository(ref.watch(firebaseFirestoreProvider));

@riverpod
Stream<List<Match>> watchMatchesForUser(Ref ref, String uid) =>
    ref.watch(matchRepositoryProvider).watchMatchesForUser(uid: uid);

@riverpod
Stream<Match?> matchStream(Ref ref, String matchId) =>
    ref.watch(matchRepositoryProvider).watchMatch(matchId: matchId);

@riverpod
int totalUnreadCount(Ref ref, String uid) {
  final matches =
      ref.watch(watchMatchesForUserProvider(uid)).asData?.value ?? [];
  final roleMatches = AppConfig.appRole.isHost
      ? matches.where((match) => match.isClubHostInquiry).toList()
      : matches;
  return collapseMatchesByOtherUser(roleMatches, uid)
      .where((match) => !match.isBlocked)
      .fold(0, (total, match) => total + match.unreadConversationCountFor(uid));
}
