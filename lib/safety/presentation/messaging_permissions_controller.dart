import 'dart:convert';
import 'dart:math';

import 'package:catch_dating_app/contexts/account/data/auth_repository.dart';
import 'package:catch_dating_app/contexts/account/data/require_signed_in_uid.dart';
import 'package:catch_dating_app/contexts/safety/data/messaging_permission_repository.dart';
import 'package:catch_dating_app/contexts/safety/domain/messaging_permission.dart';
import 'package:catch_dating_app/exceptions/app_exception.dart';
import 'package:riverpod_annotation/riverpod_annotation.dart';

part 'messaging_permissions_controller.g.dart';

class MessagingPermissionsState {
  const MessagingPermissionsState({
    required this.uid,
    required this.page,
    this.loadingMore = false,
    this.pendingKey,
    this.error,
  });
  final String uid;
  final MessagingPermissionPage page;
  final bool loadingMore;
  final String? pendingKey;
  final Object? error;
  bool get busy => loadingMore || pendingKey != null;
}

@riverpod
class MessagingPermissionsController extends _$MessagingPermissionsController {
  int _generation = 0;
  final _requests = <String, String>{};
  @override
  Future<MessagingPermissionsState> build() async {
    _generation++;
    _requests.clear();
    final uid = await ref.watch(uidProvider.future);
    if (uid == null) {
      throw const SignInRequiredException('manage WhatsApp permissions');
    }
    final page = await ref.watch(messagingPermissionRepositoryProvider).list();
    return MessagingPermissionsState(uid: uid, page: page);
  }

  bool _isCurrent(String uid, int generation) =>
      ref.mounted &&
      generation == _generation &&
      ref.read(uidProvider).asData?.value == uid;

  Future<void> loadMore() async {
    final current = state.asData?.value;
    if (current == null || current.busy || current.page.nextCursor == null) {
      return;
    }
    final generation = _generation;
    final uid = requireSignedInUid(ref, action: 'manage WhatsApp permissions');
    if (uid != current.uid) return;
    state = AsyncData(
      MessagingPermissionsState(
        uid: uid,
        page: current.page,
        loadingMore: true,
      ),
    );
    try {
      final next = await ref
          .read(messagingPermissionRepositoryProvider)
          .list(cursor: current.page.nextCursor);
      if (!_isCurrent(uid, generation)) return;
      final rows = {
        for (final row in current.page.organizers) row.key: row,
        for (final row in next.organizers) row.key: row,
      };
      state = AsyncData(
        MessagingPermissionsState(
          uid: uid,
          page: MessagingPermissionPage(
            catchPermission: next.catchPermission,
            organizers: rows.values,
            nextCursor: next.nextCursor,
          ),
        ),
      );
    } on Object catch (error) {
      if (_isCurrent(uid, generation)) {
        state = AsyncData(
          MessagingPermissionsState(uid: uid, page: current.page, error: error),
        );
      }
    }
  }

  Future<void> withdraw(
    String reviewedUid,
    MessagingPermission permission,
    {MessagingPermissionPurpose? purpose}
  ) async {
    final current = state.asData?.value;
    if (current == null || current.busy) return;
    final uid = requireSignedInUid(ref, action: 'stop WhatsApp updates');
    if (uid != reviewedUid || uid != current.uid) return;
    final row = current.page.permission(permission.key);
    if (row == null || row.receiptId != permission.receiptId ||
        (purpose == null &&
          row.effectiveStatus == MessagingPermissionStatus.optedOut) ||
        (purpose != null &&
          (row.purposes[purpose]?.receiptId !=
            permission.purposes[purpose]?.receiptId ||
            row.purposes[purpose]?.status !=
                MessagingPermissionStatus.optedIn))) {
      return;
    }
    final generation = _generation;
    final key = jsonEncode([uid, permission.key, purpose?.name,
      purpose == null ? permission.receiptId :
        permission.purposes[purpose]?.receiptId]);
    final requestId = _requests.putIfAbsent(
      key,
      () => base64Url.encode(
        List.generate(24, (_) => Random.secure().nextInt(256)),
      ),
    );
    state = AsyncData(
      MessagingPermissionsState(
        uid: uid,
        page: current.page,
        pendingKey: purpose == null ? permission.key :
          '${permission.key}:${purpose.name}',
      ),
    );
    try {
      final saved = await ref
          .read(messagingPermissionRepositoryProvider)
          .withdraw(permission, requestId, purpose: purpose);
      if (!_isCurrent(uid, generation)) return;
      _requests.remove(key);
      state = AsyncData(
        MessagingPermissionsState(
          uid: uid,
          page: current.page.replacing(saved),
        ),
      );
    } on Object catch (error) {
      if (_isCurrent(uid, generation)) {
        state = AsyncData(
          MessagingPermissionsState(uid: uid, page: current.page, error: error),
        );
      }
    }
  }
}
