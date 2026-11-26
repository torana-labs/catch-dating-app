import 'package:catch_dating_app/contexts/forms/domain/forms/host_form_analytics.dart';
import 'package:catch_dating_app/contexts/forms/domain/forms/host_form_response.dart';
import 'package:catch_dating_app/contexts/forms/parts/host_form_labels.dart';
import 'package:catch_dating_app/contexts/forms/parts/host_form_response_row.dart';
import 'package:catch_dating_app/hosts/forms/responses_state.dart';
import 'package:catch_l10n/l10n.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/widgets.dart';

/// Responses in board order: the form views, the status filter, the sort
/// and the version and answer filters with what they narrow to, the answers
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
    this.onSort,
    this.onFilters,
    this.onClearFilters,
    this.onOpenQuery,
  });

  final HostResponsesState state;

  /// The clock "2 days ago" reads from.
  final DateTime now;
  final ValueChanged<HostResponsesView> onView;
  final ValueChanged<HostResponsesFilter> onFilter;
  final ValueChanged<HostFormInboxEntry> onOpen;
  final VoidCallback onLoadMore;

  /// Opens the sort choice: newest or oldest first.
  final VoidCallback? onSort;

  /// Opens the version and answer filters.
  final VoidCallback? onFilters;

  /// Clears the version and answer filters.
  final VoidCallback? onClearFilters;

  /// Opens Filter by answers on the live version; null hides it.
  final VoidCallback? onOpenQuery;

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
            CatchPageTabBar<HostResponsesFilter>.segmented(
              selected: filter,
              size: CatchPageTabBarSize.sm,
              fill: false,
              label: l10n.hostFormsResponsesShow,
              options: [
                for (final option in HostResponsesFilter.values)
                  CatchOption(
                    value: option,
                    label: switch (option) {
                      HostResponsesFilter.all => l10n.hostFormsFilterAll,
                      HostResponsesFilter.offered =>
                        l10n.hostFormsOfferStatusOffered,
                      _ => hostFormReviewText(l10n, option.reviewStatus!),
                    },
                    count: state.counts[option],
                  ),
              ],
              onChanged: onFilter,
            ),
          if (onSort != null ||
              onOpenQuery != null ||
              (state.canFilter && onFilters != null))
            CatchStack(
              direction: CatchStackDirection.row,
              gap: CatchStackGap.g8,
              wrap: true,
              children: [
                if (onSort != null)
                  CatchChip.filter(
                    key: const ValueKey<String>('host-responses-sort'),
                    label: state.oldestFirst
                        ? l10n.hostApplicationsSortOldest
                        : l10n.hostApplicationsSortNewest,
                    leading: CatchIcon(CatchIcons.sort),
                    size: CatchChipSize.sm,
                    onPressed: onSort,
                  ),
                if (state.canFilter && onFilters != null)
                  CatchChip.filter(
                    key: const ValueKey<String>('host-responses-filters'),
                    label: state.filterCount == 0
                        ? l10n.hostCustomersFilters
                        : l10n.hostFormsResponsesFiltersCount(
                            count: state.filterCount,
                          ),
                    leading: CatchIcon(CatchIcons.filters),
                    size: CatchChipSize.sm,
                    onPressed: onFilters,
                  ),
                if (state.filterCount > 0 && onClearFilters != null)
                  CatchChip.filter(
                    key: const ValueKey<String>('host-responses-clear'),
                    label: l10n.hostCustomersClearFilter,
                    leading: CatchIcon(CatchIcons.close),
                    size: CatchChipSize.sm,
                    onPressed: onClearFilters,
                  ),
                if (onOpenQuery != null)
                  CatchChip.filter(
                    key: const ValueKey<String>('host-responses-query'),
                    label: l10n.hostResponseQueryOpenAnswers,
                    leading: CatchIcon(CatchIcons.magic),
                    size: CatchChipSize.sm,
                    onPressed: onOpenQuery,
                  ),
              ],
            ),
          if (state.version case final version?)
            CatchText(
              key: const ValueKey<String>('host-responses-version'),
              version.selected == null
                  ? l10n.hostAudienceResponsesAllVersions
                  : l10n.hostAudienceResultsVersion(version: version.selected!),
              variant: CatchTextVariant.bodySmall,
              tone: CatchTextTone.secondary,
            ),
          if (state.filterSummary case final summary?)
            CatchText(
              summary,
              key: const ValueKey<String>('host-responses-filter-summary'),
              variant: CatchTextVariant.bodySmall,
              tone: CatchTextTone.secondary,
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
          else if (state.entries.isEmpty && !state.canLoadMore)
            CatchEmptyState(
              key: const ValueKey<String>('host-responses-empty'),
              icon: CatchIcons.document,
              title: state.filtered
                  ? l10n.hostFormResponsesNoMatchesTitle
                  : l10n.hostFormResponsesEmptyTitle,
              message: state.filtered
                  ? l10n.hostFormResponsesNoMatchesBody
                  : l10n.hostFormResponsesEmptyBody,
            )
          else
            CatchSection(
              children: [
                for (final entry in state.entries)
                  HostFormResponseRow(
                    key: ValueKey<String>('host-responses-${entry.entryId}'),
                    entry: entry,
                    now: now,
                    showForm: !state.forForm,
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
