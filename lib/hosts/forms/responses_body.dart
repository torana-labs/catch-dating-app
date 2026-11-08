import 'package:catch_dating_app/contexts/forms/domain/forms/host_form_analytics.dart';
import 'package:catch_dating_app/contexts/forms/domain/forms/host_form_response.dart';
import 'package:catch_dating_app/contexts/forms/domain/host_application_summary.dart';
import 'package:catch_dating_app/contexts/forms/parts/host_form_labels.dart';
import 'package:catch_dating_app/contexts/forms/parts/host_form_response_row.dart';
import 'package:catch_dating_app/hosts/forms/responses_state.dart';
import 'package:catch_l10n/l10n.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/widgets.dart';

/// Responses in board order: the form views, the review filter, the answers
/// and Load more; or, on Results, each question's answers counted.
class HostResponsesBody extends StatelessWidget {
  const HostResponsesBody({
    super.key,
    required this.state,
    required this.now,
    required this.onView,
    required this.onFilter,
    required this.onOpen,
    required this.onLoadMore,
  });

  final HostResponsesState state;

  /// The clock "2 days ago" reads from.
  final DateTime now;
  final ValueChanged<HostResponsesView> onView;
  final ValueChanged<HostApplicationReviewStatus> onFilter;
  final ValueChanged<HostFormInboxEntry> onOpen;
  final VoidCallback onLoadMore;

  @override
  Widget build(BuildContext context) {
    final l10n = context.l10n;
    final filter = state.filter;
    return CatchPageBody.screen(
      variant: CatchPageBodyVariant.fixed,
      gap: CatchPageBodyGap.tight,
      children: [
        if (state.forForm)
          CatchPageTabBar<HostResponsesView>.segmented(
            selected: state.view,
            label: l10n.hostFormsResponsesViews,
            options: [
              CatchOption(
                value: HostResponsesView.responses,
                label: l10n.hostFormsResponsesViewResponses,
              ),
              CatchOption(
                value: HostResponsesView.questions,
                label: l10n.hostFormsResponsesViewQuestions,
              ),
              CatchOption(
                value: HostResponsesView.results,
                label: l10n.hostFormsResponsesViewResults,
              ),
            ],
            onChanged: onView,
          ),
        if (state.view == HostResponsesView.results)
          _HostResponsesResults(state: state)
        else ...[
          if (filter != null)
            CatchPageTabBar<HostApplicationReviewStatus>.segmented(
              selected: filter,
              size: CatchPageTabBarSize.sm,
              fill: false,
              label: l10n.hostFormsResponsesShow,
              options: [
                for (final status in hostResponsesFilters)
                  CatchOption(
                    value: status,
                    label: hostFormReviewText(l10n, status),
                  ),
              ],
              onChanged: onFilter,
            ),
          if (state.status == HostResponsesStatus.loading)
            CatchSkeleton.content(
              child: CatchSection(
                children: [
                  for (var row = 0; row < _placeholderRows; row++)
                    CatchIndexRow(
                      title: l10n.hostFormsAnonymous,
                      subtitle: l10n.hostFormsQuestionShortAnswer,
                      leading: CatchAvatar.system(size: CatchAvatarSize.md),
                      onTap: null,
                      density: CatchIndexRowSize.compact,
                    ),
                ],
              ),
            )
          else
            CatchSection(
              empty: l10n.hostFormsResponsesEmpty,
              children: [
                for (final entry in state.entries)
                  HostFormResponseRow(
                    key: ValueKey<String>('host-responses-${entry.entryId}'),
                    entry: entry,
                    now: now,
                    onTap: () => onOpen(entry),
                  ),
              ],
            ),
          if (state.canLoadMore || state.loadingMore)
            CatchButton(
              label: l10n.hostFormsResponsesMore,
              variant: CatchButtonVariant.secondary,
              status: state.loadingMore
                  ? CatchButtonStatus.loading
                  : CatchButtonStatus.idle,
              fullWidth: true,
              onPressed: state.loadingMore ? null : onLoadMore,
            ),
          if (state.loadMoreError != null)
            CatchNotice.inline(
              body: l10n.hostFormsLoadMoreFailed,
              tone: CatchNoticeTone.danger,
              action: CatchNoticeAction(
                label: l10n.hostFormsTryAgain,
                onPressed: onLoadMore,
              ),
            ),
        ],
      ],
    );
  }

  static const _placeholderRows = 3;
}

/// Results: each question's answers counted, or why there is nothing yet.
class _HostResponsesResults extends StatelessWidget {
  const _HostResponsesResults({required this.state});

  final HostResponsesState state;

  @override
  Widget build(BuildContext context) {
    final l10n = context.l10n;
    if (state.resultsPending) {
      return CatchSkeleton.content(
        child: CatchSection(
          title: l10n.hostFormsResponsesViewResults,
          children: [
            CatchIndexRow(
              title: l10n.hostFormsQuestionShortAnswer,
              value: '0',
              onTap: null,
              density: CatchIndexRowSize.compact,
            ),
          ],
        ),
      );
    }
    if (state.results.isEmpty) {
      return CatchText(
        l10n.hostFormsResultsEmpty,
        tone: CatchTextTone.secondary,
      );
    }
    return CatchStack(
      gap: CatchStackGap.g16,
      children: [
        for (final question in state.results)
          CatchSection(
            key: ValueKey<String>('host-results-${question.questionId}'),
            title: question.label,
            note: l10n.hostFormsResultsAnswers(count: question.responseCount),
            empty:
                hostResponsesNumeric(l10n, question) ??
                l10n.hostFormsResultsPrivate,
            children: [
              for (final choice in question.choiceCounts)
                CatchIndexRow(
                  title: choice.label,
                  value: '${choice.count}',
                  onTap: null,
                  density: CatchIndexRowSize.compact,
                ),
            ],
          ),
      ],
    );
  }
}

/// A number question's range; null when it has none.
String? hostResponsesNumeric(
  AppLocalizations l10n,
  HostFormQuestionAggregate question,
) {
  final min = question.numericMin;
  final max = question.numericMax;
  if (question.numericCount == 0 || min == null || max == null) return null;
  return l10n.hostFormsResultsRange(
    average: (question.numericSum / question.numericCount).toStringAsFixed(1),
    min: '$min',
    max: '$max',
  );
}
