import 'package:catch_dating_app/core/presentation/catch_ui_copy.dart';
import 'package:catch_dating_app/core/riverpod_ui/catch_localized_error_banner.dart';
import 'package:catch_dating_app/core/schema_contracts/generated/field_constraints.g.dart';
import 'package:catch_dating_app/event_rehearsal/presentation/event_rehearsal_assistance_view_model.dart';
import 'package:catch_dating_app/event_rehearsal/presentation/event_rehearsal_staff_controller.dart';
import 'package:catch_dating_app/event_success/domain/event_assistance_group_staff.dart';
import 'package:catch_dating_app/event_success/domain/event_assistance_group_staff_change.dart';
import 'package:catch_dating_app/event_success/event_success.dart'
    show assistanceGroupDutyLabel, assistanceGroupDutyBody;
import 'package:catch_dating_app/l10n/l10n.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:intl/intl.dart';

/// Inline explicit-save duty editor; the controller retains uncertain saves.
class EventRehearsalStaffEditSection extends ConsumerWidget {
  const EventRehearsalStaffEditSection({
    super.key,
    required this.sessionId,
    required this.form,
  });
  final String sessionId;
  final RehearsalStaffForm form;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final controller = ref.read(
      eventRehearsalStaffControllerProvider(sessionId).notifier,
    );
    final l10n = context.l10n;
    final change = form.change;
    final current = form.review.isCurrent;
    final editable = form.canSelect && current;
    final status = form.phase == RehearsalStaffPhase.submitting
        ? CatchFieldStatus.saving
        : CatchFieldStatus.idle;
    final disabled = <WidgetState>{if (!editable) WidgetState.disabled};
    final staff = form.review.snapshot.staffReview!;
    final assignment = change?.decision;
    final end =
        staff.session.virtualStartedAt!.millisecondsSinceEpoch +
        staff.session.setup.durationMinutes * 60000;
    void select({
      String? name,
      String? groupId,
      AssistanceGroupDuty? duty,
      int? expiresAt,
    }) {
      if (change == null || assignment is! AssistanceAssignGroupDuty) return;
      final group = groupId ?? change.groupId;
      final available = staff.groups[group]!.availableDuties;
      final selected =
          duty ??
          (available.contains(assignment.duty)
              ? assignment.duty
              : available.first);
      controller.select(
        operatorId: change.operatorId,
        displayName: name ?? form.draftName ?? change.displayName,
        groupId: group,
        decision: AssistanceAssignGroupDuty(
          duty: selected,
          expiresAt: expiresAt ?? assignment.expiresAt,
        ),
      );
    }

    Future<void> save() async {
      try {
        await (form.canRetry ? controller.retry() : controller.submit());
      } on Object {
        // The controller's inline error retains the exact save and recovery action.
      }
    }

    void reload() {
      controller.close();
      ref.read(eventRehearsalAssistanceProvider(sessionId).notifier).reload();
    }

    final expiryOptions = <int>{
      if (end > staff.serverTime) end,
      for (final minutes in [30, 60])
        if (staff.serverTime + minutes * 60000 <= end + 14400000)
          staff.serverTime + minutes * 60000,
      if (assignment is AssistanceAssignGroupDuty) assignment.expiresAt,
    }.toList()..sort();
    return CatchSection.divided(
      title: l10n.hostEventRehearsalStaffTitle,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          if (form.phase == RehearsalStaffPhase.saved)
            CatchText(
              l10n.hostEventRehearsalStaffSaved,
              variant: CatchTextVariant.supporting,
            )
          else ...[
            if (change != null && assignment is AssistanceAssignGroupDuty)
              CatchFieldLanes.divided(
                children: [
                  CatchField.input(
                    copy: catchFieldCopy(l10n),
                    title: l10n.hostEventRehearsalStaffName,
                    contract: CatchContractConstraints
                        .controlEventRehearsalCallablePayloadStaffDisplayName,
                    initialValue: form.draftName ?? change.displayName,
                    inputMode: editable
                        ? CatchTextInputMode.editable
                        : CatchTextInputMode.readOnly,
                    states: disabled,
                    status: status,
                    onChanged: editable ? (name) => select(name: name) : null,
                  ),
                  CatchField<String>.select(
                    copy: catchFieldCopy(l10n),
                    title: l10n.hostEventRehearsalStaffGroup,
                    contract: CatchContractConstraints
                        .controlEventRehearsalCallablePayloadStaffGroupId,
                    values: staff.groups.keys.toList(),
                    value: change.groupId,
                    itemLabelBuilder: (id) => staff.groups[id]!.label,
                    states: disabled,
                    onChanged: editable
                        ? (id) {
                            if (id != null) select(groupId: id);
                          }
                        : null,
                  ),
                  CatchField<AssistanceGroupDuty>.select(
                    copy: catchFieldCopy(l10n),
                    title: l10n.hostEventRehearsalStaffDuty,
                    contract: CatchContractConstraints
                        .controlEventRehearsalCallablePayloadStaffDecisionDuty,
                    contractValueBuilder: (duty) => duty.name,
                    values: staff.groups[change.groupId]!.availableDuties
                        .toList(),
                    value: assignment.duty,
                    itemLabelBuilder: (duty) =>
                        assistanceGroupDutyLabel(l10n, duty),
                    helperText: assistanceGroupDutyBody(l10n, assignment.duty),
                    states: disabled,
                    onChanged: editable
                        ? (duty) {
                            if (duty != null) select(duty: duty);
                          }
                        : null,
                  ),
                  CatchField<int>.select(
                    copy: catchFieldCopy(l10n),
                    title: l10n.hostEventRehearsalStaffExpiry,
                    contract: CatchContractConstraints
                        .controlEventRehearsalCallablePayloadStaffDecisionExpiresAtMillis,
                    values: expiryOptions,
                    value: assignment.expiresAt,
                    states: disabled,
                    itemLabelBuilder: (time) => time == end
                        ? l10n.hostEventRehearsalStaffEndOfEvent
                        : time == staff.serverTime + 1800000 ||
                              time == staff.serverTime + 3600000
                        ? l10n.hostEventRehearsalStaffMinutes(
                            minutes: (time - staff.serverTime) ~/ 60000,
                          )
                        : l10n.hostEventRehearsalStaffUntil(
                            time: DateFormat.jm(
                              Localizations.localeOf(context).toLanguageTag(),
                            ).format(DateTime.fromMillisecondsSinceEpoch(time)),
                          ),
                    onChanged: editable
                        ? (time) {
                            if (time != null) select(expiresAt: time);
                          }
                        : null,
                  ),
                ],
              )
            else if (change != null)
              CatchFieldLanes.single(
                child: CatchField.content(
                  copy: catchFieldCopy(l10n),
                  title: change.displayName,
                  body:
                      '${l10n.hostEventRehearsalStaffRemove} · ${staff.groups[change.groupId]?.label ?? l10n.hostEventRehearsalStaffFormerGroup}',
                ),
              ),
            if (form.error case final error?) ...[
              gapH12,
              CatchLocalizedErrorBanner(error),
            ],
            if (form.canRetry) ...[
              gapH12,
              CatchText(
                l10n.hostEventRehearsalStaffPending,
                variant: CatchTextVariant.supporting,
              ),
            ],
            if (!current && form.canReload) ...[
              gapH12,
              CatchText(
                l10n.hostEventRehearsalStaffReviewChanged,
                variant: CatchTextVariant.supporting,
              ),
            ],
          ],
          gapH12,
          Wrap(
            spacing: CatchSpacing.s2,
            runSpacing: CatchSpacing.s2,
            children: [
              if (form.phase == RehearsalStaffPhase.saved)
                CatchButton(
                  label: l10n.coreCatchFieldLabelDone,
                  onPressed: controller.close,
                )
              else ...[
                if (form.canRetry ||
                    form.canSelect && change != null ||
                    status == CatchFieldStatus.saving)
                  CatchButton(
                    label: form.canRetry
                        ? l10n.hostEventRehearsalStaffRetry
                        : assignment is AssistanceRemoveGroupDuty
                        ? l10n.hostEventRehearsalStaffRemove
                        : l10n.hostEventRehearsalStaffSave,
                    status: status == CatchFieldStatus.saving
                        ? CatchButtonStatus.loading
                        : CatchButtonStatus.idle,
                    onPressed: form.canRetry || form.canSubmit && current
                        ? save
                        : null,
                  ),
                if (form.canReload &&
                    (!current ||
                        form.phase == RehearsalStaffPhase.refreshRequired))
                  CatchButton(
                    label: l10n.hostEventRehearsalStaffRefresh,
                    variant: CatchButtonVariant.secondary,
                    onPressed: reload,
                  ),
                if (form.canDismiss && !form.canRetry)
                  CatchButton(
                    label: l10n.coreCatchFieldLabelCancel,
                    variant: CatchButtonVariant.ghost,
                    onPressed: controller.close,
                  ),
              ],
            ],
          ),
        ],
      ),
    );
  }
}
