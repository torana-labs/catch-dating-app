import 'package:catch_dating_app/contexts/safety/domain/messaging_permission.dart';
import 'package:catch_dating_app/core/schema_contracts/generated/callable_request_dtos.g.dart';
import 'package:catch_dating_app/platform/errors/app_exception.dart';
import 'package:catch_dating_app/platform/errors/backend_error_util.dart';
import 'package:catch_dating_app/platform/firebase/firebase_providers.dart';
import 'package:cloud_functions/cloud_functions.dart';
import 'package:riverpod_annotation/riverpod_annotation.dart';

part 'messaging_permission_repository.g.dart';

class MessagingPermissionRepository {
  const MessagingPermissionRepository(this._functions);
  final FirebaseFunctions _functions;
  Future<MessagingPermissionPage> list({String? cursor}) async =>
      MessagingPermissionPage.fromMap(
        await _call(
          'listParticipantMessagingPreferences',
          ListParticipantMessagingPreferencesCallableRequest(
            cursor: cursor,
            limit: 20,
          ).toJson(),
        ),
      );
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
    MessagingPermissionRepository(ref.watch(firebaseFunctionsProvider));
