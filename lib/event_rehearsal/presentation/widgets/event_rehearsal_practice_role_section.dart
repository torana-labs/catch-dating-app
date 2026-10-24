import 'package:catch_dating_app/core/presentation/catch_ui_copy.dart';
import 'package:catch_dating_app/core/riverpod_ui/catch_async_boundary.dart';
import 'package:catch_dating_app/core/riverpod_ui/catch_localized_error_banner.dart';
import 'package:catch_dating_app/core/riverpod_ui/catch_notice_feedback.dart';
import 'package:catch_dating_app/event_rehearsal/presentation/event_rehearsal_assistance_view_model.dart';
import 'package:catch_dating_app/event_rehearsal/presentation/event_rehearsal_practice_role_controller.dart';
import 'package:catch_dating_app/l10n/l10n.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

/// Chooses the identity used for guest/group assistance, never rehearsal control.
class EventRehearsalPracticeRoleSection extends ConsumerWidget {
  const EventRehearsalPracticeRoleSection({super.key, required this.scope});
  final RehearsalPracticeRoleScope scope;
  static const _host = 'host';

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final query = eventRehearsalAssistanceProvider(scope.sessionId);
    final role = eventRehearsalPracticeRoleControllerProvider(scope);
    final selected = ref.watch(role);
    final l10n = context.l10n;
    return CatchAsyncBoundary<RehearsalAssistanceReview>(
      value: ref.watch(query),
      initialLoadTimeout: null,
      onRetry: () => ref.read(query.notifier).reload(),
      loadingBuilder: (_) => const CatchLoadingIndicator(),
      errorBuilder: (_, error, _, retry) =>
          CatchLocalizedErrorBanner(error, onRetry: retry),
      builder: (_, review) {
        final staff = review.snapshot.staffReview;
        if (staff == null ||
            staff.clockId != scope.clockId ||
            !staff.isManager) {
          return CatchText(
            l10n.eventAssistanceVisitChanged,
            variant: CatchTextVariant.supporting,
          );
        }
        return CatchFieldLanes.single(
          child: CatchField<String>.select(
            copy: catchFieldCopy(l10n),
            title: l10n.hostEventRehearsalAssistanceRole,
            helperText: l10n.hostEventRehearsalAssistanceRoleBody,
            contractExemption:
                'Local review identity selector. Host omits practiceOperatorId; synthetic role identity and authority are verified by the review provider.',
            values: [
              _host,
              ...staff.operators.keys,
              if (selected != null && !staff.operators.containsKey(selected))
                selected,
            ],
            value: selected ?? _host,
            itemLabelBuilder: (value) => value == _host
                ? l10n.hostEventRehearsalHostRole
                : staff.operators[value]?.displayName ??
                      l10n.hostEventRehearsalUnavailableRole,
            onChanged: (value) {
              if (value == null) return;
              try {
                ref
                    .read(role.notifier)
                    .select(review, value == _host ? null : value);
              } on Object catch (error) {
                showCatchNoticeError(context, error);
              }
            },
          ),
        );
      },
    );
  }
}
