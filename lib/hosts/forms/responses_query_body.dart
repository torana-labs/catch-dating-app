import 'package:catch_dating_app/contexts/forms/domain/forms/host_form_export.dart';
import 'package:catch_dating_app/contexts/forms/domain/forms/host_form_response.dart';
import 'package:catch_dating_app/contexts/forms/parts/host_form_response_row.dart';
import 'package:catch_dating_app/hosts/presentation/forms/host_form_response_query_controller.dart';
import 'package:catch_dating_app/hosts/presentation/forms/host_response_export_controller.dart';
import 'package:catch_l10n/l10n.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/widgets.dart';

/// Filter by answers in board order: back to the inbox and the version it
/// reads, the sort and the answer filter, the count with Refresh, what went
/// wrong, the people chosen with Offer an event, one row per answer (each
/// with Select when it can be chosen), Load more, then the export of the
/// applied filter as CSV or Excel.
class HostResponsesQueryBody extends StatelessWidget {
  const HostResponsesQueryBody({
    super.key,
    required this.view,
    required this.version,
    required this.sortLabel,
    required this.filterCount,
    required this.now,
    required this.onExit,
    required this.onSort,
    required this.onFilter,
    required this.onClearFilter,
    required this.onRefresh,
    required this.onOpen,
    required this.onToggle,
    required this.onClearSelection,
    required this.onLoadMore,
    this.export,
    this.onOffer,
    this.onExport,
    this.onRetryExport,
    this.onOpenExport,
  });

  final HostResponseQueryView view;

  /// The published version the answers belong to.
  final int version;
  final String sortLabel;

  /// How many conditions the applied filter holds.
  final int filterCount;

  /// The clock "2 days ago" reads from.
  final DateTime now;
  final VoidCallback onExit;
  final VoidCallback onSort;
  final VoidCallback onFilter;
  final VoidCallback onClearFilter;
  final VoidCallback onRefresh;
  final ValueChanged<String> onOpen;
  final ValueChanged<String> onToggle;
  final VoidCallback onClearSelection;
  final VoidCallback onLoadMore;

  /// The export of the applied filter; null hides it.
  final HostResponseExportView? export;

  /// Offers an event to the people chosen; null hides it.
  final VoidCallback? onOffer;
  final ValueChanged<HostFormExportFormat>? onExport;
  final VoidCallback? onRetryExport;
  final VoidCallback? onOpenExport;

  @override
  Widget build(BuildContext context) {
    final l10n = context.l10n;
    final status = view.status;
    final loading = status == HostResponseQueryStatus.loading;
    final ready = status == HostResponseQueryStatus.ready;
    final counted = ready || status == HostResponseQueryStatus.empty;
    final problem = switch (status) {
      HostResponseQueryStatus.stale => l10n.hostResponseQueryStale,
      HostResponseQueryStatus.budgetExceeded =>
        l10n.hostResponseQueryBudgetExceeded,
      HostResponseQueryStatus.permissionLost =>
        l10n.hostResponseQueryPermissionLost,
      HostResponseQueryStatus.failure => l10n.hostResponseQueryFailed,
      _ => null,
    };
    final export = this.export;
    final exportBusy =
        export?.status == HostResponseExportStatus.recovering ||
        export?.status == HostResponseExportStatus.preparing;
    final exportWaiting =
        export?.status == HostResponseExportStatus.pending ||
        export?.status == HostResponseExportStatus.stale;
    return CatchPageBody.screen(
      variant: CatchPageBodyVariant.fixed,
      gap: CatchPageBodyGap.tight,
      children: [
        CatchText(
          l10n.hostResponseQueryVersionScope(version: version),
          variant: CatchTextVariant.bodySmall,
          tone: CatchTextTone.secondary,
        ),
        CatchStack(
          direction: CatchStackDirection.row,
          gap: CatchStackGap.g8,
          wrap: true,
          children: [
            CatchChip.filter(
              key: const ValueKey<String>('response-query-exit'),
              label: l10n.hostResponseQueryReviewInbox,
              leading: CatchIcon(CatchIcons.back),
              size: CatchChipSize.sm,
              onPressed: onExit,
            ),
            CatchChip.filter(
              key: const ValueKey<String>('response-query-sort'),
              label: sortLabel,
              leading: CatchIcon(CatchIcons.sort),
              size: CatchChipSize.sm,
              onPressed: loading ? null : onSort,
            ),
            CatchChip.filter(
              key: const ValueKey<String>('response-query-filter'),
              label: filterCount == 0
                  ? l10n.hostResponseQueryEditorTitle
                  : l10n.hostResponseQueryFilterCount(count: filterCount),
              leading: CatchIcon(CatchIcons.filters),
              size: CatchChipSize.sm,
              onPressed: loading || view.catalog.isEmpty ? null : onFilter,
            ),
            if (filterCount > 0)
              CatchChip.filter(
                key: const ValueKey<String>('response-query-clear'),
                label: l10n.hostFiltersResetAll,
                leading: CatchIcon(CatchIcons.close),
                size: CatchChipSize.sm,
                onPressed: loading ? null : onClearFilter,
              ),
          ],
        ),
        if (counted)
          CatchSection(
            title: l10n.hostResponseQueryResultCount(count: view.total),
            action: CatchSectionAction(
              label: l10n.hostResponseQueryRefresh,
              onPressed: onRefresh,
            ),
            dividers: CatchSectionPlacement.none,
            children: const [],
          ),
        if (problem != null)
          CatchNotice.inline(
            key: const ValueKey<String>('response-query-problem'),
            body: problem,
            tone: CatchNoticeTone.danger,
            action: CatchNoticeAction(
              label: l10n.hostResponseQueryRefresh,
              onPressed: onRefresh,
            ),
          ),
        if (loading)
          Semantics(
            label: l10n.hostResponseQueryLoading,
            liveRegion: true,
            child: CatchSkeleton.content(
              child: CatchSection(
                children: [
                  for (var row = 0; row < _placeholderRows; row++)
                    CatchIndexRow(
                      title: l10n.hostFormsAnonymous,
                      subtitle: l10n.hostFormsQuestionShortAnswer,
                      onTap: null,
                      density: CatchIndexRowSize.compact,
                    ),
                ],
              ),
            ),
          ),
        if (status == HostResponseQueryStatus.empty)
          CatchText(l10n.hostResponseQueryEmpty, tone: CatchTextTone.secondary),
        if (ready && view.selectedIds.isNotEmpty)
          CatchSurface(
            child: CatchStack(
              gap: CatchStackGap.g8,
              children: [
                Semantics(
                  liveRegion: true,
                  child: CatchText(
                    l10n.hostResponseQuerySelected(
                      count: view.selectedIds.length,
                    ),
                    key: const ValueKey<String>('response-query-selected'),
                    variant: CatchTextVariant.titleRow,
                  ),
                ),
                CatchStack(
                  direction: CatchStackDirection.row,
                  gap: CatchStackGap.g8,
                  wrap: true,
                  children: [
                    if (onOffer != null)
                      CatchButton(
                        key: const ValueKey<String>('response-query-offer'),
                        label: l10n.hostResponseOfferEvent,
                        size: CatchButtonSize.sm,
                        onPressed: onOffer,
                      ),
                    CatchButton(
                      key: const ValueKey<String>(
                        'response-query-clear-selection',
                      ),
                      label: l10n.hostResponseQueryClearSelection,
                      variant: CatchButtonVariant.quiet,
                      size: CatchButtonSize.sm,
                      onPressed: onClearSelection,
                    ),
                  ],
                ),
              ],
            ),
          ),
        if (ready)
          CatchSection(
            children: [
              for (final row in view.rows)
                CatchIndexRow(
                  key: ValueKey<String>('query-response-${row.responseId}'),
                  title: row.identity.primaryLabel ?? l10n.hostFormsAnonymous,
                  subtitle: row.formTitle,
                  meta: hostFormAgo(row.submittedAt, now),
                  selected: view.selectedIds.contains(row.responseId),
                  badge: row.status == HostFormResponseStatus.withdrawn
                      ? CatchIndexRowBadge(
                          label: l10n.hostFormResponsesWithdrawn,
                        )
                      : null,
                  onTap: () => onOpen(row.responseId),
                  density: CatchIndexRowSize.compact,
                  action:
                      onOffer == null ||
                          !view.availableIds.contains(row.responseId)
                      ? null
                      : CatchIndexRowAction(
                          label: view.selectedIds.contains(row.responseId)
                              ? l10n.hostResponseQueryDeselect
                              : l10n.hostResponseQuerySelect,
                          onPressed: () => onToggle(row.responseId),
                        ),
                ),
            ],
          ),
        if (ready && view.nextCursor != null)
          CatchButton(
            key: const ValueKey<String>('response-query-more'),
            label: l10n.hostFormResponsesLoadMore,
            variant: CatchButtonVariant.secondary,
            status: view.loadingMore
                ? CatchButtonStatus.loading
                : CatchButtonStatus.idle,
            fullWidth: true,
            onPressed: view.loadingMore ? null : onLoadMore,
          ),
        if (export != null && onExport != null)
          CatchSection(
            title: l10n.hostFormsResponsesExportTitle,
            dividers: CatchSectionPlacement.none,
            children: [
              CatchStack(
                direction: CatchStackDirection.row,
                gap: CatchStackGap.g8,
                wrap: true,
                children: [
                  for (final format in HostFormExportFormat.values)
                    CatchButton(
                      key: ValueKey<String>('response-export-${format.name}'),
                      label: exportBusy && export.command?.format == format
                          ? l10n.hostAudiencePreparingExport
                          : format == HostFormExportFormat.csv
                          ? l10n.hostFormExportCsv
                          : l10n.hostFormExportXlsx,
                      variant: CatchButtonVariant.secondary,
                      size: CatchButtonSize.sm,
                      leading: CatchIcon(CatchIcons.download),
                      onPressed: !counted || exportBusy || exportWaiting
                          ? null
                          : () => onExport!(format),
                    ),
                  if (export.command != null && exportWaiting)
                    CatchButton(
                      key: const ValueKey<String>('response-export-retry'),
                      label: l10n.hostFormExportStillPreparing,
                      variant: CatchButtonVariant.quiet,
                      size: CatchButtonSize.sm,
                      onPressed: onRetryExport,
                    ),
                  if (export.status == HostResponseExportStatus.ready &&
                      export.receipt?.downloadUrl != null)
                    CatchButton(
                      key: const ValueKey<String>('response-export-ready'),
                      label: l10n.hostFormExportReady,
                      size: CatchButtonSize.sm,
                      onPressed: onOpenExport,
                    ),
                ],
              ),
              if (switch (export.status) {
                    HostResponseExportStatus.stale =>
                      l10n.hostsHostAudienceRefresh,
                    HostResponseExportStatus.pending =>
                      l10n.hostFormExportStillPreparing,
                    HostResponseExportStatus.failure =>
                      l10n.hostFormExportFailed,
                    _ => null,
                  }
                  case final line?)
                CatchText(
                  line,
                  key: const ValueKey<String>('response-export-status'),
                  variant: CatchTextVariant.bodySmall,
                  tone: CatchTextTone.secondary,
                ),
            ],
          ),
      ],
    );
  }

  static const _placeholderRows = 3;
}
