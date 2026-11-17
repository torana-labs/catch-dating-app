import 'package:catch_dating_app/contexts/safety/domain/messaging_permission.dart';
import 'package:catch_platform/errors/app_exception.dart';
import 'package:catch_platform/errors/backend_error_util.dart';
import 'package:catch_platform/firebase/firebase_providers.dart';
import 'package:catch_platform/schema_contracts/generated/callable_request_dtos.g.dart';
import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:cloud_functions/cloud_functions.dart';
import 'package:riverpod_annotation/riverpod_annotation.dart';

part 'messaging_permission_repository.g.dart';

// firestore-index: guestMessagingPermissions (uid:ASCENDING,scope:ASCENDING,__name__:ASCENDING)

/// The guest's messaging settings: their own rows in the
/// `guestMessagingPermissions` read model, which holds exactly what the
/// participant callable summarized. Withdrawals stay on the callable.
class MessagingPermissionRepository {
  const MessagingPermissionRepository(this._functions, this._firestore);
  final FirebaseFunctions _functions;
  final FirebaseFirestore _firestore;

  static const pageSize = 20;

  /// The guest's Catch row and one page of organizer rows, in preference
  /// id order as the callable paged them. A row not written yet is a sender
  /// the guest has no preference for. Rows carry no organizer names; the
  /// settings screen names them from the public organizer lookup.
  Future<MessagingPermissionPage> list(String uid, {String? cursor}) =>
      withBackendErrorContext(
        () async {
          final rows = _firestore.collection('guestMessagingPermissions');
          var query = rows
              .where('uid', isEqualTo: uid)
              .where('scope', isEqualTo: 'organizer')
              .orderBy(FieldPath.documentId)
              .limit(pageSize + 1);
          if (cursor != null) query = query.startAfter([cursor]);
          final (catchRow, page) = await (
            rows.doc('catchpref_$uid').get(),
            query.get(),
          ).wait;
          final docs = page.docs.take(pageSize).toList(growable: false);
          final organizerIds = [
            for (final doc in docs)
              _row(doc.data(), uid)['organizerId']! as String,
          ];
          return MessagingPermissionPage(
            catchPermission: switch (catchRow.data()) {
              final data? => MessagingPermission.fromMap(
                _row(data, uid)['preference']! as Map,
              ),
              null => const MessagingPermission(
                organizerId: null,
                organizerName: null,
                status: MessagingPermissionStatus.unknown,
                receiptId: null,
              ),
            },
            organizers: [
              for (final (index, doc) in docs.indexed)
                MessagingPermission.fromMap(
                  doc.data()['preference']! as Map,
                  organizerId: organizerIds[index],
                ),
            ],
            nextCursor: page.docs.length > pageSize ? docs.last.id : null,
          );
        },
        context: const BackendErrorContext(
          service: BackendService.firestore,
          action: 'load messaging permissions',
          resource: 'guestMessagingPermissions',
        ),
      );

  Map<String, dynamic> _row(Map<String, dynamic> data, String uid) {
    if (data['uid'] != uid || data['version'] != 1) {
      throw const FormatException('Invalid messaging permission row');
    }
    return data;
  }

  Future<MessagingPermission> withdraw(
    MessagingPermission permission,
    String requestId, {
    MessagingPermissionPurpose? purpose,
  }) async {
    final data = await _call(
      'withdrawParticipantMessagingPermission',
      WithdrawParticipantMessagingPermissionCallableRequest(
        scope: permission.scope,
        organizerId: permission.organizerId,
        purpose: purpose?.name,
        expectedReceiptId: purpose == null
            ? permission.receiptId
            : permission.purposes[purpose]?.receiptId,
        requestId: requestId,
      ).toJson(),
    );
    final result = data['preference']! as Map;
    return MessagingPermission.fromMap(
      result,
      organizerId: permission.organizerId,
      organizerName: permission.organizerName,
    );
  }

  Future<Map<Object?, Object?>> _call(
    String operation,
    Map<String, Object?> data,
  ) => withBackendErrorContext(
    () async {
      final result = await _functions
          .httpsCallable(operation)
          .call<Object?>(data);
      if (result.data case final Map value) return value;
      throw const FormatException('Invalid messaging permission response');
    },
    context: BackendErrorContext(
      service: BackendService.functions,
      action: operation,
      resource: 'messagingPermissions',
    ),
  );
}

@riverpod
MessagingPermissionRepository messagingPermissionRepository(Ref ref) =>
    MessagingPermissionRepository(
      ref.watch(firebaseFunctionsProvider),
      ref.watch(firebaseFirestoreProvider),
    );
