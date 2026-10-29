import 'package:catch_dating_app/contexts/connections/domain/cross_paths_event_consent.dart';
import 'package:catch_dating_app/contexts/connections/domain/cross_paths_invitation.dart';
import 'package:catch_dating_app/contexts/connections/domain/cross_paths_pair_hold.dart';
import 'package:catch_dating_app/contexts/connections/domain/cross_paths_suggestion.dart';
import 'package:catch_dating_app/core/schema_contracts/generated/callable_request_dtos.g.dart'
    show
        GetCrossPathsSuggestionsCallableRequest,
        SendCrossPathsInvitationCallableRequest,
        RespondCrossPathsInvitationCallableRequest,
        CancelCrossPathsInvitationOrPlanCallableRequest,
        SetCrossPathsEventConsentCallableRequest;
import 'package:catch_dating_app/platform/errors/app_exception.dart';
import 'package:catch_dating_app/platform/errors/backend_error_util.dart';
import 'package:catch_dating_app/platform/firebase/firebase_providers.dart';
import 'package:catch_dating_app/platform/firebase/read_limit_policy.dart';
import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:cloud_functions/cloud_functions.dart';
import 'package:riverpod_annotation/riverpod_annotation.dart';

part 'cross_paths_repository.g.dart';

CrossPathsEventConsent crossPathsEventConsentFromFirestore(
  Map<String, dynamic> json,
) {
  DateTime? nullableTimestamp(Object? value) =>
      value is Timestamp ? value.toDate() : null;
  return CrossPathsEventConsent(
    eventId: json['eventId'] as String? ?? '',
    uid: json['uid'] as String? ?? '',
    enabled: json['enabled'] == true,
    termsVersion: json['termsVersion'] as int? ?? 0,
    consentedAt: nullableTimestamp(json['consentedAt']),
    updatedAt: nullableTimestamp(json['updatedAt']),
    revokedAt: nullableTimestamp(json['revokedAt']),
    source: json['source'] as String? ?? '',
  );
}

CrossPathsInvitation crossPathsInvitationFromFirestore(
  String id,
  Map<String, dynamic> json,
) {
  DateTime timestamp(String key) {
    final value = json[key];
    if (value is! Timestamp) {
      throw FormatException('$key must be a Firestore timestamp.');
    }
    return value.toDate();
  }

  DateTime? nullableTimestamp(String key) {
    final value = json[key];
    if (value == null) return null;
    if (value is! Timestamp) {
      throw FormatException('$key must be a Firestore timestamp or null.');
    }
    return value.toDate();
  }

  return CrossPathsInvitation.fromMap(id, {
    ...json,
    'createdAt': timestamp('createdAt'),
    'updatedAt': timestamp('updatedAt'),
    'expiresAt': timestamp('expiresAt'),
    'respondedAt': nullableTimestamp('respondedAt'),
    'cancelledAt': nullableTimestamp('cancelledAt'),
    'invalidatedAt': nullableTimestamp('invalidatedAt'),
  });
}

CrossPathsPairHold crossPathsPairHoldFromFirestore(
  String id,
  Map<String, dynamic> json,
) {
  final expiresAt = json['expiresAt'];
  if (expiresAt is! Timestamp) {
    throw const FormatException('expiresAt must be a Firestore timestamp.');
  }
  return CrossPathsPairHold.fromMap(id, {
    ...json,
    'expiresAt': expiresAt.toDate(),
  });
}

class CrossPathsRepository {
  const CrossPathsRepository(this._db, this._functions);

  static const _collectionPath = 'eventCrossPathsConsents';
  static const _invitationsPath = 'crossPathsInvitations';
  static const _pairHoldsPath = 'crossPathsPairHolds';
  final FirebaseFirestore _db;
  final FirebaseFunctions _functions;

  Stream<CrossPathsEventConsent?> watchEventConsent({
    required String eventId,
    required String uid,
  }) => withBackendErrorStream(
    () => _db
        .collection(_collectionPath)
        .where('eventId', isEqualTo: eventId)
        .where('uid', isEqualTo: uid)
        .limit(ReadLimitPolicy.lookup)
        .snapshots()
        .map(
          (snapshot) => snapshot.docs.isNotEmpty
              ? crossPathsEventConsentFromFirestore(snapshot.docs.first.data())
              : null,
        ),
    context: const BackendErrorContext(
      service: BackendService.firestore,
      action: 'watch Cross Paths event consent',
      resource: _collectionPath,
    ),
  );

  Future<void> setEventConsent({
    required String eventId,
    required bool enabled,
    CrossPathsConsentSource source = CrossPathsConsentSource.eventDetail,
  }) => withBackendErrorContext(
    () => _functions
        .httpsCallable('setCrossPathsEventConsent')
        .call(
          SetCrossPathsEventConsentCallableRequest(
            eventId: eventId,
            enabled: enabled,
            termsVersion: currentCrossPathsTermsVersion,
            source: source.wireValue,
          ).toJson(),
        ),
    context: const BackendErrorContext(
      service: BackendService.functions,
      action: 'update Cross Paths event consent',
      resource: _collectionPath,
    ),
  );

  Future<CrossPathsSuggestionsResponse> getSuggestions({
    required List<String> eventIds,
    required String sessionId,
  }) => withBackendErrorContext(
    () async {
      final result = await _functions
          .httpsCallable('getCrossPathsSuggestions')
          .call(
            GetCrossPathsSuggestionsCallableRequest(
              eventIds: eventIds,
              sessionId: sessionId,
            ).toJson(),
          );
      return CrossPathsSuggestionsResponse.fromCallableData(result.data);
    },
    context: const BackendErrorContext(
      service: BackendService.functions,
      action: 'fetch Cross Paths suggestions',
      resource: 'getCrossPathsSuggestions',
    ),
  );

  Stream<CrossPathsInvitation?> watchInvitation(String invitationId) =>
      withBackendErrorStream(
        () => _db
            .collection(_invitationsPath)
            .doc(invitationId)
            .snapshots()
            .map(
              (snapshot) => snapshot.exists
                  ? crossPathsInvitationFromFirestore(
                      snapshot.id,
                      snapshot.data()!,
                    )
                  : null,
            ),
        context: const BackendErrorContext(
          service: BackendService.firestore,
          action: 'watch Cross Paths invitation',
          resource: _invitationsPath,
        ),
      );

  Stream<CrossPathsPairHold?> watchPairHold(String holdId) =>
      withBackendErrorStream(
        () => _db
            .collection(_pairHoldsPath)
            .doc(holdId)
            .snapshots()
            .map(
              (snapshot) => snapshot.exists
                  ? crossPathsPairHoldFromFirestore(
                      snapshot.id,
                      snapshot.data()!,
                    )
                  : null,
            ),
        context: const BackendErrorContext(
          service: BackendService.firestore,
          action: 'watch Cross Paths pair hold',
          resource: _pairHoldsPath,
        ),
      );

  Stream<List<CrossPathsInvitation>> watchIncomingInvitations(String uid) =>
      withBackendErrorStream(
        () => _db
            .collection(_invitationsPath)
            .where('recipientUid', isEqualTo: uid)
            .limit(ReadLimitPolicy.historyPage)
            .snapshots()
            .map(
              (snapshot) =>
                  snapshot.docs
                      .map(
                        (doc) => crossPathsInvitationFromFirestore(
                          doc.id,
                          doc.data(),
                        ),
                      )
                      .toList(growable: false)
                    ..sort((a, b) => b.updatedAt.compareTo(a.updatedAt)),
            ),
        context: const BackendErrorContext(
          service: BackendService.firestore,
          action: 'watch incoming Cross Paths invitations',
          resource: _invitationsPath,
        ),
      );

  Stream<CrossPathsInvitation?> watchOutgoingInvitation({
    required String uid,
    required String eventId,
  }) => withBackendErrorStream(
    () => _db
        .collection(_invitationsPath)
        .where('senderUid', isEqualTo: uid)
        .limit(ReadLimitPolicy.historyPage)
        .snapshots()
        .map((snapshot) {
          final matching = snapshot.docs
              .where((doc) => doc.data()['eventId'] == eventId)
              .toList(growable: false);
          return matching.isEmpty
              ? null
              : crossPathsInvitationFromFirestore(
                  matching.first.id,
                  matching.first.data(),
                );
        }),
    context: const BackendErrorContext(
      service: BackendService.firestore,
      action: 'watch outgoing Cross Paths invitation',
      resource: _invitationsPath,
    ),
  );

  Future<CrossPathsInvitationReceipt> sendInvitation({
    required String eventId,
    required String recipientUid,
    required String suggestionToken,
  }) => withBackendErrorContext(
    () async {
      final result = await _functions
          .httpsCallable('sendCrossPathsInvitation')
          .call(
            SendCrossPathsInvitationCallableRequest(
              eventId: eventId,
              recipientUid: recipientUid,
              suggestionToken: suggestionToken,
            ).toJson(),
          );
      return CrossPathsInvitationReceipt.fromCallableData(result.data);
    },
    context: const BackendErrorContext(
      service: BackendService.functions,
      action: 'send Cross Paths invitation',
      resource: 'sendCrossPathsInvitation',
    ),
  );

  Future<CrossPathsInvitationReceipt> respondToInvitation({
    required String invitationId,
    required bool accept,
  }) => withBackendErrorContext(
    () async {
      final result = await _functions
          .httpsCallable('respondCrossPathsInvitation')
          .call(
            RespondCrossPathsInvitationCallableRequest(
              invitationId: invitationId,
              decision: accept ? 'accept' : 'decline',
            ).toJson(),
          );
      return CrossPathsInvitationReceipt.fromCallableData(result.data);
    },
    context: const BackendErrorContext(
      service: BackendService.functions,
      action: 'respond to Cross Paths invitation',
      resource: 'respondCrossPathsInvitation',
    ),
  );

  Future<CrossPathsInvitationReceipt> cancelInvitationOrPlan(
    String invitationId,
  ) => withBackendErrorContext(
    () async {
      final result = await _functions
          .httpsCallable('cancelCrossPathsInvitationOrPlan')
          .call(
            CancelCrossPathsInvitationOrPlanCallableRequest(
              invitationId: invitationId,
            ).toJson(),
          );
      return CrossPathsInvitationReceipt.fromCallableData(result.data);
    },
    context: const BackendErrorContext(
      service: BackendService.functions,
      action: 'cancel Cross Paths invitation or plan',
      resource: 'cancelCrossPathsInvitationOrPlan',
    ),
  );
}

// keepalive: Shared by event-detail consent listeners and mutation calls.
@Riverpod(keepAlive: true)
CrossPathsRepository crossPathsRepository(Ref ref) => CrossPathsRepository(
  ref.watch(firebaseFirestoreProvider),
  ref.watch(firebaseFunctionsProvider),
);

@riverpod
Stream<CrossPathsEventConsent?> watchCrossPathsEventConsent(
  Ref ref,
  String eventId,
  String uid,
) => ref
    .watch(crossPathsRepositoryProvider)
    .watchEventConsent(eventId: eventId, uid: uid);

@riverpod
Stream<CrossPathsInvitation?> watchCrossPathsInvitation(
  Ref ref,
  String invitationId,
) => ref.watch(crossPathsRepositoryProvider).watchInvitation(invitationId);

@riverpod
Stream<CrossPathsPairHold?> watchCrossPathsPairHold(Ref ref, String holdId) =>
    ref.watch(crossPathsRepositoryProvider).watchPairHold(holdId);

@riverpod
Stream<List<CrossPathsInvitation>> watchIncomingCrossPathsInvitations(
  Ref ref,
  String uid,
) => ref.watch(crossPathsRepositoryProvider).watchIncomingInvitations(uid);

@riverpod
Stream<CrossPathsInvitation?> watchOutgoingCrossPathsInvitation(
  Ref ref,
  String uid,
  String eventId,
) => ref
    .watch(crossPathsRepositoryProvider)
    .watchOutgoingInvitation(uid: uid, eventId: eventId);
