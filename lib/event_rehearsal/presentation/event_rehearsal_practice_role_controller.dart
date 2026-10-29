import 'package:catch_dating_app/contexts/account/data/authenticated_session.dart';
import 'package:catch_dating_app/event_rehearsal/presentation/event_rehearsal_assistance_view_model.dart';
import 'package:catch_dating_app/exceptions/app_exception.dart';
import 'package:riverpod_annotation/riverpod_annotation.dart';

part 'event_rehearsal_practice_role_controller.g.dart';

typedef RehearsalPracticeRoleScope = ({String sessionId, String clockId});

/// A role selection belongs to one signed-in Host and one synthetic run.
/// It supplies query identity, never authority or a server-global acting role.
@riverpod
class EventRehearsalPracticeRoleController
    extends _$EventRehearsalPracticeRoleController {
  @override
  String? build(RehearsalPracticeRoleScope scope) {
    ref.watch(authenticatedSessionProvider);
    return null;
  }

  void select(RehearsalAssistanceReview review, String? operatorId) {
    requireRehearsalReviewAccount(ref, review.account);
    final current = ref.read(eventRehearsalAssistanceProvider(scope.sessionId));
    final staff = review.snapshot.staffReview;
    if (!review.isCurrent ||
        current.isLoading ||
        current.hasError ||
        !identical(current.asData?.value, review) ||
        staff == null ||
        !staff.isManager ||
        staff.hostUid != review.account.uid ||
        staff.session.id != scope.sessionId ||
        staff.clockId != scope.clockId ||
        operatorId != null && !staff.operators.containsKey(operatorId)) {
      throw const ValidationException('Review the current practice team.');
    }
    // Expired duties remain selectable to practise denied actions. The backend
    // returns their current permissions; this selection never restores a duty.
    state = operatorId;
  }
}
