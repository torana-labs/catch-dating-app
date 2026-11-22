import 'package:catch_dating_app/contexts/account/data/require_signed_in_uid.dart';
import 'package:catch_dating_app/contexts/safety/data/safety_notice_repository.dart';
import 'package:flutter_riverpod/experimental/mutation.dart';
import 'package:riverpod_annotation/riverpod_annotation.dart';

part 'safety_appeal_controller.g.dart';

/// Sends the appeal of a safety decision from a From Catch notice.
/// [appealMutation] tracks the send so the sheet can show it is on its way.
@riverpod
class SafetyAppealController extends _$SafetyAppealController {
  static final appealMutation = Mutation<void>();

  @override
  void build() {}

  Future<void> appeal({required String actionId, required String text}) async {
    requireSignedInUid(ref, action: 'send an appeal');
    await ref
        .read(safetyNoticeRepositoryProvider)
        .submitAppeal(actionId: actionId, text: text.trim());
  }
}
