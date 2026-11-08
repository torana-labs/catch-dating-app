import 'package:catch_dating_app/contexts/forms/domain/forms/host_form_configuration.dart';
import 'package:catch_dating_app/contexts/forms/domain/forms/host_form_response.dart';
import 'package:catch_dating_app/contexts/forms/parts/host_form_labels.dart';
import 'package:catch_dating_app/contexts/forms/parts/host_form_response_row.dart';
import 'package:catch_dating_app/hosts/forms/form_state.dart';
import 'package:catch_l10n/l10n.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/widgets.dart';

/// One form in board order: its status, name and questions, the three
/// funnel stats, the answers waiting for the host, what happens when the
/// host lets someone in, and Share and Edit questions.
class HostFormDetailBody extends StatelessWidget {
  const HostFormDetailBody({
    super.key,
    required this.state,
    required this.now,
    required this.onOpenResponse,
    required this.onLetIn,
    required this.onSeeAll,
    required this.onChangeConsequences,
    required this.onShare,
    required this.onEditQuestions,
    required this.onPublish,
  });

  final HostFormState state;

  /// The clock a waiting answer's age reads from.
  final DateTime now;
  final ValueChanged<HostFormInboxEntry> onOpenResponse;
  final ValueChanged<HostFormInboxEntry> onLetIn;
  final VoidCallback onSeeAll;
  final VoidCallback onChangeConsequences;
  final VoidCallback onShare;
  final VoidCallback onEditQuestions;

  /// Publishes a draft; the form page offers it in place of Share.
  final VoidCallback onPublish;

  @override
  Widget build(BuildContext context) {
    final l10n = context.l10n;
    final form = state.form;
    if (state.status == HostFormStatus.loading || form == null) {
      return CatchPageBody.screen(
        variant: CatchPageBodyVariant.fixed,
        gap: CatchPageBodyGap.tight,
        children: [
          CatchSkeleton.content(
            child: CatchStack(
              gap: CatchStackGap.g6,
              children: [
                CatchBadge(label: l10n.hostFormsStatusTakingAnswers),
                CatchText(
                  l10n.hostFormsKindApplication,
                  variant: CatchTextVariant.pageTitle,
                ),
              ],
            ),
          ),
        ],
      );
    }
    final analytics = state.analytics;
    final labels = state.questionLabels;
    final consequences = state.consequences;
    return CatchPageBody.screen(
      variant: CatchPageBodyVariant.fixed,
      gap: CatchPageBodyGap.tight,
      children: [
        CatchStack(
          gap: CatchStackGap.g6,
          children: [
            CatchStack(
              direction: CatchStackDirection.row,
              children: [
                CatchBadge(
                  label: hostFormStatusText(l10n, form.status),
                  tone: hostFormStatusTone(form.status),
                  dot: form.status == HostFormLifecycleStatus.published,
                ),
              ],
            ),
            CatchText(
              l10n.hostFormsFormKicker(
                placement: hostFormPlacementText(l10n, form.defaultTargetKind),
              ),
              variant: CatchTextVariant.labelKicker,
              tone: CatchTextTone.secondary,
            ),
            CatchText(form.title, variant: CatchTextVariant.pageTitle),
            CatchText(
              labels.isEmpty
                  ? l10n.hostFormsNoQuestions
                  : l10n.hostFormsQuestionsLine(
                      count: labels.length,
                      labels: labels.join(', '),
                    ),
              variant: CatchTextVariant.bodySmall,
              tone: CatchTextTone.secondary,
              maxLines: 2,
            ),
          ],
        ),
        if (analytics != null)
          CatchStack(
            direction: CatchStackDirection.row,
            gap: CatchStackGap.g8,
            equal: true,
            children: [
              CatchMetricTile.stat(
                label: l10n.hostFormsStatOpened,
                value: '${analytics.opens}',
              ),
              CatchMetricTile.stat(
                label: l10n.hostFormsStatStarted,
                value: '${analytics.starts}',
                note: analytics.opens == 0
                    ? null
                    : l10n.hostFormsStatOfOpens(
                        percent: (analytics.starts * 100 / analytics.opens)
                            .round(),
                      ),
              ),
              CatchMetricTile.stat(
                label: l10n.hostFormsStatSent,
                value: '${analytics.submissions}',
                note: l10n.hostFormsStatFinished(
                  percent: (analytics.completionRate * 100).round(),
                ),
              ),
            ],
          ),
        if (state.letInFailed)
          CatchNotice.inline(
            body: l10n.hostFormsLetInFailed,
            tone: CatchNoticeTone.danger,
          ),
        CatchSection(
          title: l10n.hostFormsWaitingTitle,
          note: state.waiting.isEmpty
              ? null
              : l10n.hostFormsWaitingNote(count: state.waiting.length),
          empty: state.waitingPending ? null : l10n.hostFormsWaitingEmpty,
          children: [
            for (final entry in state.waiting.take(_waitingShown))
              HostFormResponseRow(
                key: ValueKey<String>('host-form-waiting-${entry.entryId}'),
                entry: entry,
                now: now,
                onTap: () => onOpenResponse(entry),
                action: CatchIndexRowAction(
                  label: l10n.hostFormsLetIn,
                  variant: CatchIndexRowActionVariant.primary,
                  onPressed:
                      state.lettingIn.contains(entry.application?.applicationId)
                      ? null
                      : () => onLetIn(entry),
                ),
              ),
            if (form.submittedResponseCount > 0)
              CatchIndexRow(
                key: const ValueKey<String>('host-form-see-all'),
                title: l10n.hostFormsSeeAllAnswers(
                  count: form.submittedResponseCount,
                ),
                onTap: onSeeAll,
                density: CatchIndexRowSize.compact,
                chevron: true,
              ),
          ],
        ),
        CatchSection(
          title: l10n.hostFormsThenTitle,
          action: CatchSectionAction(
            label: l10n.hostFormsThenChange,
            onPressed: onChangeConsequences,
          ),
          empty: l10n.hostFormsThenEmpty,
          children: [
            for (final (index, kind) in consequences.indexed)
              CatchIndexRow(
                title: hostFormConsequenceText(l10n, kind),
                onTap: null,
                density: CatchIndexRowSize.compact,
                leading: CatchMarker.number(index + 1),
              ),
          ],
        ),
        CatchStack(
          direction: CatchStackDirection.row,
          gap: CatchStackGap.g8,
          equal: true,
          children: [
            if (state.isDraft)
              CatchButton(
                key: const ValueKey<String>('host-form-publish'),
                label: l10n.hostFormsPublish,
                fullWidth: true,
                status: state.busy
                    ? CatchButtonStatus.loading
                    : CatchButtonStatus.idle,
                onPressed: state.busy ? null : onPublish,
              )
            else
              CatchButton(
                key: const ValueKey<String>('host-form-share'),
                label: l10n.hostFormsShareForm,
                fullWidth: true,
                onPressed: onShare,
              ),
            CatchButton(
              key: const ValueKey<String>('host-form-edit-questions'),
              label: l10n.hostFormsEditQuestions,
              variant: CatchButtonVariant.secondary,
              fullWidth: true,
              onPressed: onEditQuestions,
            ),
          ],
        ),
      ],
    );
  }

  /// The waiting rows the page shows before See all.
  static const _waitingShown = 3;
}
