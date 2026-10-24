import 'package:catch_dating_app/core/presentation/catch_ui_copy.dart';
import 'package:catch_dating_app/core/riverpod_ui/catch_async_boundary.dart';
import 'package:catch_dating_app/core/riverpod_ui/catch_localized_error_banner.dart';
import 'package:catch_dating_app/core/riverpod_ui/catch_notice_feedback.dart';
import 'package:catch_dating_app/event_rehearsal/presentation/event_rehearsal_assistance_view_model.dart';
import 'package:catch_dating_app/event_rehearsal/presentation/event_rehearsal_staff_controller.dart';
import 'package:catch_dating_app/event_rehearsal/presentation/widgets/event_rehearsal_staff_edit_section.dart';
import 'package:catch_dating_app/event_success/domain/event_assistance_group_staff_change.dart';
import 'package:catch_dating_app/event_success/event_success.dart'
    show assistanceGroupDutyLabel;
import 'package:catch_dating_app/l10n/l10n.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:intl/intl.dart';

/// Optional synthetic staff configuration within the rehearsal's practice tools.
class EventRehearsalStaffSection extends ConsumerWidget {
  const EventRehearsalStaffSection({super.key, required this.sessionId});
  final String sessionId;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final query = eventRehearsalAssistanceProvider(sessionId);
    final page = ref.watch(query);
    final owner = eventRehearsalStaffControllerProvider(sessionId);
    final state = ref.watch(owner);
    final controller = ref.read(owner.notifier);
    final l10n = context.l10n;
    // Retain the exact editor through a query refresh, including an unresolved save.
    if (state case final RehearsalStaffForm form) {
      return EventRehearsalStaffEditSection(
        key: ValueKey(form.review),
        sessionId: sessionId,
        form: form,
      );
    }
    void open(
      RehearsalAssistanceReview review, {
      String? operatorId,
      String? groupId,
      bool remove = false,
    }) {
      try {
        if (remove) {
          controller.open(review);
          controller.select(
            operatorId: operatorId!,
            displayName:
                review.snapshot.staffReview!.operators[operatorId]!.displayName,
            groupId: groupId!,
            decision: const AssistanceRemoveGroupDuty(),
          );
        } else {
          controller.configure(
            review,
            defaultName: l10n.hostEventRehearsalStaffDefaultName(
              number: review.snapshot.staffReview!.operators.length + 1,
            ),
            operatorId: operatorId,
            groupId: groupId,
          );
        }
      } on Object catch (error) {
        showCatchNoticeError(context, error);
      }
    }

    return CatchSection.divided(
      title: l10n.hostEventRehearsalStaffTitle,
      child: CatchAsyncBoundary<RehearsalAssistanceReview>(
        value: page,
        initialLoadTimeout: null,
        onRetry: () => ref.read(query.notifier).reload(),
        loadingBuilder: (_) => const CatchLoadingIndicator(),
        errorBuilder: (_, error, _, retry) =>
            CatchLocalizedErrorBanner(error, onRetry: retry),
        builder: (context, review) {
          final staff = review.snapshot.staffReview;
          if (staff == null) {
            return CatchText(
              l10n.hostEventRehearsalStaffReadOnly,
              variant: CatchTextVariant.supporting,
            );
          }
          return Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              CatchText(
                l10n.hostEventRehearsalStaffBody,
                variant: CatchTextVariant.supporting,
              ),
              if (!staff.canAssign) ...[
                gapH8,
                CatchText(
                  l10n.hostEventRehearsalStaffReadOnly,
                  variant: CatchTextVariant.supporting,
                ),
              ],
              gapH12,
              CatchFieldLanes.divided(
                children: [
                  for (final operator in staff.operators.values)
                    for (final String? groupId in <String?>[
                      ...operator.duties.keys,
                      if (operator.duties.isEmpty) null,
                    ])
                      CatchField.content(
                        copy: catchFieldCopy(l10n),
                        title: operator.displayName,
                        bodyMaxLines: 8,
                        body: groupId == null
                            ? l10n.hostEventRehearsalStaffNoDuty
                            : '${staff.groups[groupId]?.label ?? l10n.hostEventRehearsalStaffFormerGroup} · ${assistanceGroupDutyLabel(l10n, operator.duties[groupId]!.duty)}\n${operator.duties[groupId]!.expiresAt <= staff.serverTime || operator.duties[groupId]!.sourceHash != staff.groups[groupId]?.sourceHash ? l10n.hostEventRehearsalStaffExpired : l10n.hostEventRehearsalStaffUntil(time: DateFormat.jm(Localizations.localeOf(context).toLanguageTag()).format(DateTime.fromMillisecondsSinceEpoch(operator.duties[groupId]!.expiresAt)))}',
                        actions: Wrap(
                          children: [
                            if (staff.canAssign)
                              CatchButton(
                                label: l10n.hostEventRehearsalStaffEdit,
                                variant: CatchButtonVariant.ghost,
                                size: CatchButtonSize.sm,
                                onPressed: () => open(
                                  review,
                                  operatorId: operator.id,
                                  groupId: groupId,
                                ),
                              ),
                            if (groupId != null)
                              CatchButton(
                                label: l10n.hostEventRehearsalStaffRemove,
                                variant: CatchButtonVariant.ghost,
                                size: CatchButtonSize.sm,
                                onPressed: () => open(
                                  review,
                                  operatorId: operator.id,
                                  groupId: groupId,
                                  remove: true,
                                ),
                              ),
                          ],
                        ),
                      ),
                ],
              ),
              if (staff.canAssign && staff.operators.length < 50) ...[
                gapH12,
                CatchButton(
                  label: l10n.hostEventRehearsalStaffAdd,
                  variant: CatchButtonVariant.secondary,
                  onPressed: () => open(review),
                ),
              ],
            ],
          );
        },
      ),
    );
  }
}
