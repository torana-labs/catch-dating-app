import 'dart:convert';

import 'package:catch_dating_app/core/time_formatters.dart';
import 'package:catch_dating_app/hosts/domain/forms/host_form_export.dart';
import 'package:catch_dating_app/hosts/domain/forms/host_form_response.dart';
import 'package:catch_dating_app/hosts/domain/forms/host_response_query.dart';
import 'package:catch_dating_app/hosts/presentation/forms/host_event_offer_workspace_section.dart';
import 'package:catch_dating_app/hosts/presentation/forms/host_form_response_query_controller.dart';
import 'package:catch_dating_app/hosts/presentation/forms/host_response_export_action.dart';
import 'package:catch_dating_app/hosts/presentation/forms/host_response_query_editor_section.dart';
import 'package:catch_dating_app/l10n/l10n.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/material.dart';

const _ascendingSortDirection = 'asc';

/// Labels are supplied by the owning Forms route when its callable is live.
class HostResponseQueryWorkspaceCopy {
  const HostResponseQueryWorkspaceCopy({
    required this.filter,
    required this.sort,
    required this.newest,
    required this.oldest,
    required this.refresh,
    required this.loadMore,
    required this.loading,
    required this.empty,
    required this.stale,
    required this.budgetExceeded,
    required this.permissionLost,
    required this.failed,
    required this.selected,
    required this.clearSelection,
    required this.reviewSelection,
    required this.withdrawn,
    required this.select,
    required this.deselect,
    required this.editor,
  });

  final String filter;
  final String sort;
  final String newest;
  final String oldest;
  final String refresh;
  final String loadMore;
  final String loading;
  final String empty;
  final String stale;
  final String budgetExceeded;
  final String permissionLost;
  final String failed;
  final String Function(int) selected;
  final String clearSelection;
  final String reviewSelection;
  final String withdrawn;
  final String select;
  final String deselect;
  final HostResponseQueryEditorCopy editor;
}

/// Opt-in boundary supplied by the Forms route only after the manager query
/// callable and localized copy are registered. The legacy inbox stays in use
/// until then.
class HostResponseQueryCapability {
  const HostResponseQueryCapability({
    required this.versionId,
    required this.copy,
    this.gateway,
    this.onReviewSelection,
    this.offerWorkspace,
    this.openEventSettings,
    this.exportGateway,
    this.exportAccountId,
  });

  final String versionId;

  /// Optional test/custom gateway; the Forms panel creates one state-owned
  /// repository when this capability is explicitly enabled by its route.
  final HostResponseQueryGateway? gateway;
  final HostResponseQueryWorkspaceCopy copy;
  final void Function(List<String> ids, String resultHash)? onReviewSelection;
  final HostEventOfferWorkspaceCopy? offerWorkspace;
  final Future<void> Function(String eventId)? openEventSettings;
  final HostResponseExportGateway? exportGateway;
  final String? exportAccountId;
}

/// Manager query workspace for one published form version. Its bulk callback
/// carries review intent only; the write endpoint must independently recheck
/// current manager, response, identity, query hash and conversion authority.
class HostResponseQueryWorkspaceSection extends StatefulWidget {
  const HostResponseQueryWorkspaceSection({
    super.key,
    required this.controller,
    required this.request,
    required this.copy,
    required this.onOpenResponse,
    this.onReviewSelection,
    this.offerWorkspace,
    this.exportGateway,
    this.exportAccountId,
  });

  final HostResponseQueryController controller;
  final HostResponseQueryRequest request;
  final HostResponseQueryWorkspaceCopy copy;
  final ValueChanged<String> onOpenResponse;
  final void Function(List<String> ids, String resultHash)? onReviewSelection;
  final Widget? offerWorkspace;
  final HostResponseExportGateway? exportGateway;
  final String? exportAccountId;

  @override
  State<HostResponseQueryWorkspaceSection> createState() =>
      _HostResponseQueryWorkspaceSectionState();
}

class _HostResponseQueryWorkspaceSectionState
    extends State<HostResponseQueryWorkspaceSection> {
  late HostResponseQueryRequest _request;
  bool _showFilter = false;

  @override
  void initState() {
    super.initState();
    _request = widget.request.withCursor(null);
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (mounted) widget.controller.apply(_request);
    });
  }

  @override
  void didUpdateWidget(covariant HostResponseQueryWorkspaceSection oldWidget) {
    super.didUpdateWidget(oldWidget);
    final changed =
        jsonEncode(oldWidget.request.toJson()) !=
        jsonEncode(widget.request.toJson());
    if (changed || oldWidget.controller != widget.controller) {
      _request = widget.request.withCursor(null);
      _showFilter = false;
      WidgetsBinding.instance.addPostFrameCallback((_) {
        if (mounted) widget.controller.apply(_request);
      });
    }
  }

  void _apply(HostResponseQueryRequest request) {
    setState(() {
      _request = request.withCursor(null);
      _showFilter = false;
    });
    widget.controller.apply(_request);
  }

  HostResponseQueryRequest _with({
    HostResponsePredicate? predicate,
    bool clearPredicate = false,
    HostResponseSort? sort,
  }) => HostResponseQueryRequest(
    organizerId: _request.organizerId,
    formId: _request.formId,
    versionId: _request.versionId,
    statuses: _request.statuses,
    predicate: clearPredicate ? null : predicate ?? _request.predicate,
    sort: sort ?? _request.sort,
    limit: _request.limit,
  );

  Future<void> _chooseSort(HostResponseQueryView view) async {
    final options = <HostResponseSort>[
      const HostResponseSort(),
      const HostResponseSort(direction: _ascendingSortDirection),
      for (final field in view.catalog.where((field) => field.sortable)) ...[
        HostResponseSort(questionId: field.questionId),
        HostResponseSort(
          questionId: field.questionId,
          direction: _ascendingSortDirection,
        ),
      ],
    ];
    final chosen = await showCatchSelectionSheet<int>(
      context: context,
      title: widget.copy.sort,
      value: options.indexWhere(
        (item) =>
            item.questionId == _request.sort.questionId &&
            item.direction == _request.sort.direction,
      ),
      items: [
        for (var index = 0; index < options.length; index++)
          CatchSelectionMenuItem(
            value: index,
            label: options[index].questionId == null
                ? options[index].direction == _ascendingSortDirection
                      ? widget.copy.oldest
                      : widget.copy.newest
                : _sortLabel(options[index], view),
          ),
      ],
    );
    if (!mounted || chosen == null || chosen < 0 || chosen >= options.length) {
      return;
    }
    _apply(_with(sort: options[chosen]));
  }

  String _sortLabel(HostResponseSort sort, HostResponseQueryView view) {
    if (sort.questionId == null) {
      return sort.direction == _ascendingSortDirection
          ? widget.copy.oldest
          : widget.copy.newest;
    }
    final field = view.catalog
        .where((field) => field.questionId == sort.questionId)
        .firstOrNull;
    final direction = sort.direction == _ascendingSortDirection
        ? context.l10n.hostResponseQueryAscending
        : context.l10n.hostResponseQueryDescending;
    return field == null ? direction : '${field.label} · $direction';
  }

  @override
  Widget build(BuildContext context) => AnimatedBuilder(
    animation: widget.controller,
    builder: (context, _) {
      final view = widget.controller.view;
      final copy = widget.copy;
      final loading = view.status == HostResponseQueryStatus.loading;
      final ready = view.status == HostResponseQueryStatus.ready;
      final canSelect =
          widget.onReviewSelection != null || widget.offerWorkspace != null;
      final filterCount = _request.predicate?.conditionCount ?? 0;
      final errorMessage = switch (view.status) {
        HostResponseQueryStatus.stale => copy.stale,
        HostResponseQueryStatus.budgetExceeded => copy.budgetExceeded,
        HostResponseQueryStatus.permissionLost => copy.permissionLost,
        HostResponseQueryStatus.failure => copy.failed,
        _ => null,
      };
      return Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          CatchSection.controls(
            sortLabel: context.l10n.hostCustomersSortControl(
              label: _sortLabel(_request.sort, view),
            ),
            onSort: loading ? null : () => _chooseSort(view),
            filtersLabel: copy.filter,
            onFilters: loading || view.catalog.isEmpty
                ? null
                : () => setState(() => _showFilter = !_showFilter),
            activeFilters: filterCount == 0
                ? null
                : context.l10n.hostResponseQueryFilterCount(count: filterCount),
            clearLabel: filterCount == 0 ? null : copy.editor.reset,
            onClear: filterCount == 0
                ? null
                : () => _apply(_with(clearPredicate: true)),
          ),
          if (_showFilter && view.catalog.isNotEmpty)
            CatchSection.content(
              child: HostResponseQueryEditorSection(
                fields: view.catalog,
                copy: copy.editor,
                initial: _request.predicate,
                onApply: (predicate) => _apply(
                  _with(
                    predicate: predicate,
                    clearPredicate: predicate == null,
                  ),
                ),
              ),
            ),
          if (ready || view.status == HostResponseQueryStatus.empty)
            CatchSection.content(
              child: Wrap(
                alignment: WrapAlignment.spaceBetween,
                crossAxisAlignment: WrapCrossAlignment.center,
                spacing: CatchSpacing.s4,
                runSpacing: CatchSpacing.s2,
                children: [
                  Semantics(
                    liveRegion: true,
                    child: CatchText(
                      context.l10n.hostResponseQueryResultCount(
                        count: view.total,
                      ),
                      variant: CatchTextVariant.sectionTitle,
                    ),
                  ),
                  CatchButton.command(
                    label: copy.refresh,
                    onPressed: () => widget.controller.apply(_request),
                  ),
                ],
              ),
            ),
          if (loading)
            Semantics(
              label: copy.loading,
              liveRegion: true,
              child: CatchSection.loadingRows(
                layouts: const [
                  CatchPersonLayout.placeholder(
                    hasSupportingText: true,
                    hasContext: true,
                  ),
                  CatchPersonLayout.placeholder(
                    hasSupportingText: true,
                    hasContext: true,
                  ),
                  CatchPersonLayout.placeholder(
                    hasSupportingText: true,
                    hasContext: true,
                  ),
                ],
              ),
            ),
          if (errorMessage != null)
            CatchSection.content(
              child: CatchBanner.errorWithRetry(
                message: errorMessage,
                retryLabel: copy.refresh,
                onRetry: () => widget.controller.apply(_request),
              ),
            ),
          if (view.status == HostResponseQueryStatus.empty)
            CatchSection.content(
              child: CatchText(
                copy.empty,
                variant: CatchTextVariant.supporting,
              ),
            ),
          if (ready && view.selectedIds.isNotEmpty)
            CatchSection.content(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  Semantics(
                    liveRegion: true,
                    child: CatchText(
                      copy.selected(view.selectedIds.length),
                      variant: CatchTextVariant.supporting,
                    ),
                  ),
                  gapH8,
                  Wrap(
                    spacing: CatchSpacing.s3,
                    runSpacing: CatchSpacing.s2,
                    children: [
                      if (widget.onReviewSelection != null)
                        CatchButton(
                          label: copy.reviewSelection,
                          onPressed: () {
                            final intent = widget.controller.selectionIntent;
                            if (intent != null) {
                              widget.onReviewSelection!(
                                intent.ids,
                                intent.resultHash,
                              );
                            }
                          },
                        ),
                      CatchButton.command(
                        label: copy.clearSelection,
                        onPressed: widget.controller.clearSelection,
                      ),
                    ],
                  ),
                ],
              ),
            ),
          if (ready)
            CatchSection.rows(
              children: [
                for (final row in view.rows)
                  CatchField.navigate(
                    key: ValueKey('query-response-${row.responseId}'),
                    states: view.selectedIds.contains(row.responseId)
                        ? const {WidgetState.selected}
                        : const {},
                    content: CatchPersonLayout(
                      name:
                          row.identity.primaryLabel ??
                          context.l10n.hostFormResponsesAnonymous,
                      supportingText: row.formTitle,
                      context: AppTimeFormatters.compactRelativeTime(
                        row.submittedAt,
                      ),
                      badges: [
                        if (row.status == HostFormResponseStatus.withdrawn)
                          CatchRowBadge(
                            label: copy.withdrawn,
                            tone: CatchBadgeTone.neutral,
                          ),
                      ],
                    ),
                    onActivate: () => widget.onOpenResponse(row.responseId),
                    secondaryAction:
                        !canSelect ||
                            !view.availableIds.contains(row.responseId)
                        ? null
                        : CatchFieldSecondaryAction.command(
                            label:
                                '${view.selectedIds.contains(row.responseId) ? copy.deselect : copy.select}: ${row.identity.primaryLabel ?? context.l10n.hostFormResponsesAnonymous}',
                            icon: view.selectedIds.contains(row.responseId)
                                ? CatchIcons.checkCircleFilled
                                : CatchIcons.circle,
                            onActivate: () => widget.controller.toggleSelection(
                              row.responseId,
                            ),
                          ),
                  ),
              ],
            ),
          if (ready && view.nextCursor != null)
            CatchSection.content(
              child: CatchButton(
                label: copy.loadMore,
                variant: CatchButtonVariant.secondary,
                fullWidth: true,
                status: view.loadingMore
                    ? CatchButtonStatus.loading
                    : CatchButtonStatus.idle,
                onPressed: view.loadingMore ? null : widget.controller.loadMore,
              ),
            ),
          if (widget.exportGateway != null && widget.exportAccountId != null)
            HostResponseExportAction(
              accountId: widget.exportAccountId!,
              organizerId: _request.organizerId,
              formId: _request.formId,
              queryController: widget.controller,
              gateway: widget.exportGateway!,
            ),
          if (ready && widget.offerWorkspace != null) widget.offerWorkspace!,
        ],
      );
    },
  );
}
