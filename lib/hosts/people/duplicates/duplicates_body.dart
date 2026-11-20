import 'package:catch_dating_app/contexts/audience/domain/crm/host_contact_merge.dart';
import 'package:catch_dating_app/hosts/people/duplicates/duplicates_state.dart';
import 'package:catch_dating_app/hosts/people/duplicates/widgets/duplicate_pair_card.dart';
import 'package:catch_l10n/l10n.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/widgets.dart';

/// The duplicate review, in board order: what makes a pair, the To review
/// and Marked different views with their counts, the pairs with their
/// evidence and actions, and Show more while the review has more pages.
class HostPeopleDuplicatesBody extends StatelessWidget {
  const HostPeopleDuplicatesBody({
    super.key,
    required this.state,
    required this.onView,
    required this.onMerge,
    required this.onDifferent,
    required this.onReopen,
    required this.onLoadMore,
    required this.onRetry,
    this.pendingPairId,
  });

  final HostDuplicatesState state;
  final ValueChanged<HostDuplicatesView> onView;
  final ValueChanged<HostContactMergeCandidate> onMerge;
  final ValueChanged<HostContactMergeCandidate> onDifferent;
  final ValueChanged<HostContactMergeCandidate> onReopen;
  final VoidCallback onLoadMore;
  final VoidCallback onRetry;

  /// The pair a running command acts on; every action waits until it ends.
  final String? pendingPairId;

  @override
  Widget build(BuildContext context) {
    final l10n = context.l10n;
    final busy = pendingPairId != null;
    final open = state.view == HostDuplicatesView.open;
    final Widget content = switch (state.status) {
      HostDuplicatesStatus.loading => const CatchLoadingIndicator(),
      HostDuplicatesStatus.error => CatchErrorState(
        title: l10n.hostPeopleDuplicatesErrorTitle,
        message: l10n.hostPeopleDuplicatesErrorBody,
        retryLabel: l10n.hostPeopleRetry,
        onRetry: onRetry,
        mode: CatchErrorStateMode.inline,
      ),
      HostDuplicatesStatus.ready =>
        state.pairs.isEmpty
            ? CatchEmptyState(
                icon: CatchIcons.people,
                title: open
                    ? l10n.hostPeopleDuplicatesEmpty
                    : l10n.hostPeopleDuplicatesEmptyDifferent,
              )
            : CatchStack(
                children: [
                  for (final pair in state.pairs)
                    HostDuplicatePairCard(
                      key: ValueKey<String>(
                        'host-duplicate-pair-${pair.candidateId}',
                      ),
                      pair: pair,
                      busy: busy,
                      pending: pair.candidateId == pendingPairId,
                      onMerge: open ? () => onMerge(pair) : null,
                      onDifferent: open ? () => onDifferent(pair) : null,
                      onReopen: open ? null : () => onReopen(pair),
                    ),
                ],
              ),
    };
    return CatchPageBody(
      child: CatchStack(
        gap: CatchStackGap.g16,
        children: [
          CatchText(
            l10n.hostPeopleDuplicatesIntro,
            variant: CatchTextVariant.bodySmall,
            tone: CatchTextTone.secondary,
          ),
          CatchRail(
            label: l10n.hostPeopleShowLabel,
            wrap: CatchRailMode.never,
            children: [
              for (final view in HostDuplicatesView.values)
                CatchChip.choice(
                  key: ValueKey<String>('host-duplicates-view-${view.name}'),
                  label: switch (view) {
                    HostDuplicatesView.open =>
                      l10n.hostPeopleDuplicatesViewOpen,
                    HostDuplicatesView.markedDifferent =>
                      l10n.hostPeopleDuplicatesViewDifferent,
                  },
                  count: state.status == HostDuplicatesStatus.ready
                      ? switch (view) {
                          HostDuplicatesView.open => state.openCount,
                          HostDuplicatesView.markedDifferent =>
                            state.markedCount,
                        }
                      : null,
                  selected: view == state.view,
                  mode: CatchChipMode.single,
                  onPressed: () => onView(view),
                ),
            ],
          ),
          if (state.truncated)
            CatchText(
              l10n.hostPeopleDuplicatesTruncated,
              variant: CatchTextVariant.bodyMeta,
              tone: CatchTextTone.secondary,
            ),
          content,
          if (state.status == HostDuplicatesStatus.ready && state.canLoadMore)
            CatchStack(
              gap: CatchStackGap.g4,
              align: CatchStackAlign.start,
              children: [
                if (state.loadMoreError != null)
                  CatchText(
                    l10n.hostPeopleDuplicatesMoreError,
                    variant: CatchTextVariant.bodyMeta,
                    tone: CatchTextTone.danger,
                  ),
                CatchButton(
                  key: const ValueKey<String>('host-duplicates-show-more'),
                  label: l10n.hostPeopleShowMore,
                  variant: CatchButtonVariant.quiet,
                  size: CatchButtonSize.sm,
                  status: state.loadingMore
                      ? CatchButtonStatus.loading
                      : CatchButtonStatus.idle,
                  onPressed: state.loadingMore ? null : onLoadMore,
                ),
              ],
            ),
        ],
      ),
    );
  }
}
