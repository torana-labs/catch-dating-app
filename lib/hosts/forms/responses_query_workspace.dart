import 'package:catch_dating_app/contexts/forms/data/host_forms_repository.dart';
import 'package:catch_dating_app/contexts/forms/data/host_response_query_repository.dart';
import 'package:catch_dating_app/contexts/forms/domain/forms/host_response_query.dart';
import 'package:catch_dating_app/hosts/forms/responses_query_body.dart';
import 'package:catch_dating_app/hosts/forms/responses_query_editor.dart';
import 'package:catch_dating_app/hosts/presentation/forms/host_form_response_query_controller.dart';
import 'package:catch_dating_app/hosts/presentation/forms/host_response_export_controller.dart';
import 'package:catch_l10n/l10n.dart';
import 'package:catch_platform/device/external_links.dart';
import 'package:catch_platform/firebase/firebase_providers.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/widgets.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

const _ascending = 'asc';

/// Filter by answers on one published version of a form: the manager
/// response query, read page by page through the query callable, with the
/// answer-condition editor, sorting by when it arrived or by a sortable
/// question, choosing up to 25 people for an event offer, and exporting
/// what the filter matches as CSV or Excel through the journalled export
/// command (an unfinished export is picked up again on return).
///
/// The query starts on the version's submitted answers, newest first.
class HostResponsesQueryWorkspace extends ConsumerStatefulWidget {
  const HostResponsesQueryWorkspace({
    super.key,
    required this.organizerId,
    required this.formId,
    required this.versionId,
    required this.accountId,
    required this.onExit,
    required this.onOpenResponse,
    this.onOffer,
    this.now,
  });

  final String organizerId;
  final String formId;
  final String versionId;

  /// The signed-in manager the export journal belongs to.
  final String accountId;
  final VoidCallback onExit;
  final ValueChanged<String> onOpenResponse;

  /// Opens the event offer for the people chosen in [controller].
  final ValueChanged<HostResponseQueryController>? onOffer;

  /// A fixed clock for previews and tests; null reads the device clock.
  final DateTime? now;

  @override
  ConsumerState<HostResponsesQueryWorkspace> createState() =>
      _HostResponsesQueryWorkspaceState();
}

class _HostResponsesQueryWorkspaceState
    extends ConsumerState<HostResponsesQueryWorkspace> {
  late HostResponseQueryController _query;
  late HostResponseExportController _export;
  late HostResponseQueryRequest _request;

  @override
  void initState() {
    super.initState();
    _bind();
  }

  @override
  void didUpdateWidget(covariant HostResponsesQueryWorkspace oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (oldWidget.organizerId != widget.organizerId ||
        oldWidget.formId != widget.formId ||
        oldWidget.versionId != widget.versionId ||
        oldWidget.accountId != widget.accountId) {
      _unbind();
      _bind();
    }
  }

  @override
  void dispose() {
    _unbind();
    super.dispose();
  }

  void _bind() {
    _request = HostResponseQueryRequest(
      organizerId: widget.organizerId,
      formId: widget.formId,
      versionId: widget.versionId,
    );
    _query = HostResponseQueryController(
      ref.read(hostResponseQueryGatewayProvider),
    )..addListener(_changed);
    _export = HostResponseExportController(
      accountId: widget.accountId,
      organizerId: widget.organizerId,
      formId: widget.formId,
      queryController: _query,
      gateway: ref.read(hostResponseExportGatewayProvider),
      currentAccountId: () => ref.read(firebaseAuthProvider).currentUser?.uid,
      openDownload: ref.read(externalLinkControllerProvider).open,
      now: DateTime.now,
      wait: Future<void>.delayed,
    )..addListener(_changed);
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (!mounted) return;
      _query.apply(_request);
      _export.recover();
    });
  }

  void _unbind() {
    _export
      ..removeListener(_changed)
      ..dispose();
    _query
      ..removeListener(_changed)
      ..dispose();
  }

  void _changed() {
    if (mounted) setState(() {});
  }

  void _apply({
    HostResponsePredicate? predicate,
    bool clearPredicate = false,
    HostResponseSort? sort,
  }) {
    _request = HostResponseQueryRequest(
      organizerId: _request.organizerId,
      formId: _request.formId,
      versionId: _request.versionId,
      statuses: _request.statuses,
      predicate: clearPredicate ? null : predicate ?? _request.predicate,
      sort: sort ?? _request.sort,
      limit: _request.limit,
    );
    _query.apply(_request);
  }

  String _sortLabel(AppLocalizations l10n, HostResponseSort sort) {
    if (sort.questionId == null) {
      return sort.direction == _ascending
          ? l10n.hostApplicationsSortOldest
          : l10n.hostApplicationsSortNewest;
    }
    final direction = sort.direction == _ascending
        ? l10n.hostResponseQueryAscending
        : l10n.hostResponseQueryDescending;
    final field = _query.view.catalog
        .where((field) => field.questionId == sort.questionId)
        .firstOrNull;
    return field == null ? direction : '${field.label} · $direction';
  }

  Future<void> _chooseSort() async {
    final l10n = context.l10n;
    final options = <HostResponseSort>[
      const HostResponseSort(),
      const HostResponseSort(direction: _ascending),
      for (final field in _query.view.catalog.where((field) => field.sortable))
        for (final direction in const ['desc', _ascending])
          HostResponseSort(questionId: field.questionId, direction: direction),
    ];
    final chosen = await showCatchSelectionSheet<int>(
      context: context,
      title: l10n.hostCustomersSort,
      value: options.indexWhere(
        (sort) =>
            sort.questionId == _request.sort.questionId &&
            sort.direction == _request.sort.direction,
      ),
      items: [
        for (final (index, sort) in options.indexed)
          CatchSelectionMenuItem(value: index, label: _sortLabel(l10n, sort)),
      ],
    );
    if (!mounted || chosen == null || chosen < 0) return;
    _apply(sort: options[chosen]);
  }

  Future<void> _openFilter() => showCatchBottomSheet<void>(
    context: context,
    builder: (sheetContext) => HostResponsesQueryEditor(
      fields: _query.view.catalog,
      initial: _request.predicate,
      onApply: (predicate) {
        Navigator.of(sheetContext).pop();
        _apply(predicate: predicate, clearPredicate: predicate == null);
      },
    ),
  );

  @override
  Widget build(BuildContext context) {
    final l10n = context.l10n;
    final onOffer = widget.onOffer;
    return HostResponsesQueryBody(
      view: _query.view,
      version: int.tryParse(widget.versionId.split('_v').last) ?? 0,
      sortLabel: _sortLabel(l10n, _request.sort),
      filterCount: _request.predicate?.conditionCount ?? 0,
      now: widget.now ?? DateTime.now(),
      onExit: () {
        _query.clearSelection();
        widget.onExit();
      },
      onSort: _chooseSort,
      onFilter: _openFilter,
      onClearFilter: () => _apply(clearPredicate: true),
      onRefresh: () => _query.apply(_request),
      onOpen: widget.onOpenResponse,
      onToggle: _query.toggleSelection,
      onClearSelection: _query.clearSelection,
      onLoadMore: _query.loadMore,
      export: _export.view,
      onOffer: onOffer == null ? null : () => onOffer(_query),
      onExport: _export.start,
      onRetryExport: _export.retryPending,
      onOpenExport: _export.openReady,
    );
  }
}
