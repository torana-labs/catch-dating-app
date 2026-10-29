import 'package:catch_dating_app/contexts/events/domain/event_runtime_claim_request.dart';
import 'package:catch_dating_app/core/backend_error_util.dart';
import 'package:catch_dating_app/core/data/read_limit_policy.dart';
import 'package:catch_dating_app/core/firebase_providers.dart';
import 'package:catch_dating_app/core/firestore_converters.dart';
import 'package:catch_dating_app/core/schema_contracts/generated/callable_request_dtos.g.dart'
    show ApproveEventRuntimeClaimCallableRequest;
import 'package:catch_dating_app/exceptions/app_exception.dart';
import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:cloud_functions/cloud_functions.dart';
import 'package:riverpod_annotation/riverpod_annotation.dart';

part 'event_runtime_claim_repository.g.dart';

enum EventRuntimeClaimDecision { approve, reject }

class EventRuntimeClaimRepository {
  const EventRuntimeClaimRepository(this._db, this._functions);

  static const _collectionPath = 'eventRuntimeClaimRequests';

  final FirebaseFirestore _db;
  final FirebaseFunctions _functions;

  CollectionReference<EventRuntimeClaimRequest> get _claimsRef => _db
      .collection(_collectionPath)
      .withDocumentIdConverter<EventRuntimeClaimRequest>(
        idField: 'id',
        fromJson: EventRuntimeClaimRequest.fromJson,
        toJson: (claim) => claim.toJson(),
      );

  Stream<List<EventRuntimeClaimRequest>> watchPendingForEvent(String eventId) =>
      withBackendErrorStream(
        () => _claimsRef
            .where('eventId', isEqualTo: eventId)
            .limit(ReadLimitPolicy.boundedWorkingSet)
            .snapshots()
            .map((snapshot) {
              final claims = snapshot.docs
                  .map((document) => document.data())
                  .where((claim) => claim.isPending)
                  .toList();
              claims.sort(
                (left, right) => left.createdAt.compareTo(right.createdAt),
              );
              return claims;
            }),
        context: const BackendErrorContext(
          service: BackendService.firestore,
          action: 'watch event runtime claim requests',
          resource: _collectionPath,
        ),
      );

  Future<EventRuntimeClaimStatus> review({
    required String eventId,
    required String uid,
    required EventRuntimeClaimDecision decision,
    String? attendeeId,
    String? reason,
  }) => withBackendErrorContext(
    () async {
      final result = await _functions
          .httpsCallable('approveEventRuntimeClaim')
          .call<Object?>(
            ApproveEventRuntimeClaimCallableRequest(
              eventId: eventId,
              uid: uid,
              decision: decision.name,
              attendeeId: attendeeId,
              reason: reason,
            ).toJson(),
          );
      final data = result.data;
      if (data case {'status': final String status}) {
        return EventRuntimeClaimStatus.values.byName(status);
      }
      throw const FormatException('Invalid event runtime claim response.');
    },
    context: const BackendErrorContext(
      service: BackendService.functions,
      action: 'review event runtime claim request',
      resource: _collectionPath,
    ),
  );
}

// keepalive: Host roster claim review is an event-management repository shared
// across the live roster, approval queue, and manual check-in surfaces.
@Riverpod(keepAlive: true)
EventRuntimeClaimRepository eventRuntimeClaimRepository(Ref ref) =>
    EventRuntimeClaimRepository(
      ref.watch(firebaseFirestoreProvider),
      ref.watch(firebaseFunctionsProvider),
    );

@riverpod
Stream<List<EventRuntimeClaimRequest>> watchPendingEventRuntimeClaims(
  Ref ref,
  String eventId,
) => ref
    .watch(eventRuntimeClaimRepositoryProvider)
    .watchPendingForEvent(eventId);
