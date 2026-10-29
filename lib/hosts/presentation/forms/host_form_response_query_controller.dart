import 'package:catch_dating_app/contexts/forms/data/host_response_query_repository.dart';
import 'package:catch_dating_app/contexts/forms/domain/forms/host_response_query.dart';
import 'package:catch_dating_app/core/backend_error_util.dart';
import 'package:catch_dating_app/exceptions/app_exception.dart';
import 'package:flutter/foundation.dart';

export 'package:catch_dating_app/contexts/forms/data/host_response_query_repository.dart'
    show HostResponseQueryGateway;

enum HostResponseQueryStatus {
  idle,
  loading,
  ready,
  empty,
  stale,
  budgetExceeded,
  permissionLost,
  failure,
}

@immutable
class HostResponseQueryView {
  const HostResponseQueryView({
    required this.status,
    required this.request,
    this.form,
    this.rows = const [],
    this.catalog = const [],
    this.total = 0,
    this.nextCursor,
    this.resultHash,
    this.queryHash,
    this.availableIds = const {},
    this.selectedIds = const {},
    this.loadingMore = false,
    this.error,
  });

  final HostResponseQueryStatus status;
  final HostResponseQueryRequest? request;
  final HostResponseQueryForm? form;
  final List<HostResponseQueryRow> rows;
  final List<HostResponseQueryField> catalog;
  final int total;
  final String? nextCursor;
  final String? resultHash;
  final String? queryHash;
  final Set<String> availableIds;
  final Set<String> selectedIds;
  final bool loadingMore;
  final Object? error;

  bool get canLoadMore =>
      status == HostResponseQueryStatus.ready &&
      nextCursor != null &&
      !loadingMore;

  bool get canActOnSelection =>
      status == HostResponseQueryStatus.ready && selectedIds.isNotEmpty;
}

/// Owns one exact query result across pages. Every replacement query clears
/// selection, and every later page must identify the same current result.
class HostResponseQueryController extends ChangeNotifier {
  HostResponseQueryController(this._gateway);

  final HostResponseQueryGateway _gateway;
  int _generation = 0;
  bool _disposed = false;
  HostResponseSelection? _selection;

  HostResponseQueryView _view = const HostResponseQueryView(
    status: HostResponseQueryStatus.idle,
    request: null,
  );

  HostResponseQueryView get view => _view;

  Future<void> apply(HostResponseQueryRequest request) async {
    final sameVersion =
        _view.request?.formId == request.formId &&
        _view.request?.versionId == request.versionId;
    if (sameVersion && _view.catalog.isNotEmpty) {
      request.validate(_view.catalog);
    }
    final generation = ++_generation;
    _selection = null;
    _publish(
      HostResponseQueryView(
        status: HostResponseQueryStatus.loading,
        request: request.withCursor(null),
        catalog: sameVersion ? _view.catalog : const [],
      ),
    );
    try {
      final page = await _gateway.query(request.withCursor(null));
      if (!_isCurrent(generation)) {
        return;
      }
      _requireValidPage(page, request, firstPage: true);
      _selection = HostResponseSelection(
        queryHash: page.queryHash,
        resultHash: page.resultHash,
      );
      _publish(_fromPage(request.withCursor(null), page));
    } on Object catch (error) {
      if (!_isCurrent(generation)) {
        return;
      }
      final failure = _normalizeError(error);
      _publish(
        HostResponseQueryView(
          status: _errorStatus(failure),
          request: request.withCursor(null),
          catalog: sameVersion ? _view.catalog : const [],
          error: failure,
        ),
      );
    }
  }

  Future<void> loadMore() async {
    final current = _view;
    final request = current.request;
    if (request == null || !current.canLoadMore) {
      return;
    }
    final cursor = current.nextCursor!;
    final generation = _generation;
    _publish(_copy(current, loadingMore: true));
    try {
      final page = await _gateway.query(request.withCursor(cursor));
      if (!_isCurrent(generation)) {
        return;
      }
      _requireValidPage(page, request, firstPage: false);
      if (page.queryHash != current.queryHash ||
          page.resultHash != current.resultHash ||
          page.total != current.total) {
        _selection = null;
        _publish(
          _copy(
            current,
            status: HostResponseQueryStatus.stale,
            selectedIds: const {},
            loadingMore: false,
          ),
        );
        return;
      }
      final seen = current.rows.map((row) => row.id).toSet();
      if (page.items.any((row) => seen.contains(row.id)) ||
          page.nextCursor == cursor) {
        throw const FormatException('Response query page overlaps or repeats.');
      }
      final rows = List<HostResponseQueryRow>.unmodifiable([
        ...current.rows,
        ...page.items,
      ]);
      _publish(
        HostResponseQueryView(
          status: rows.isEmpty
              ? HostResponseQueryStatus.empty
              : HostResponseQueryStatus.ready,
          request: request,
          form: page.form,
          rows: rows,
          catalog: page.fieldCatalog,
          total: page.total,
          nextCursor: page.nextCursor,
          resultHash: page.resultHash,
          queryHash: page.queryHash,
          availableIds: page.selectedIds,
          selectedIds: _selection?.ids ?? const {},
        ),
      );
    } on Object catch (error) {
      if (!_isCurrent(generation)) {
        return;
      }
      final failure = _normalizeError(error);
      _selection = null;
      _publish(
        _copy(
          current,
          status: _errorStatus(failure),
          selectedIds: const {},
          loadingMore: false,
          error: failure,
        ),
      );
    }
  }

  void toggleSelection(String responseId) {
    final current = _view;
    final selection = _selection;
    if (current.status != HostResponseQueryStatus.ready ||
        selection == null ||
        !current.availableIds.contains(responseId)) {
      throw StateError('Refresh response results before selecting.');
    }
    final page = HostResponseQueryPage(
      form: current.form!,
      items: current.rows,
      nextCursor: current.nextCursor,
      total: current.total,
      selectedIds: current.availableIds,
      queryHash: current.queryHash!,
      resultHash: current.resultHash!,
      fieldCatalog: current.catalog,
    );
    _selection = selection.toggle(responseId, page);
    _publish(_copy(current, selectedIds: _selection!.ids));
  }

  void clearSelection() {
    final current = _view;
    if (current.selectedIds.isEmpty) {
      return;
    }
    _selection = HostResponseSelection(
      queryHash: current.queryHash!,
      resultHash: current.resultHash!,
    );
    _publish(_copy(current, selectedIds: const {}));
  }

  /// IDs and hash are only a review intent. The write callable must recheck
  /// manager authority, source state, identity and this exact result itself.
  ({List<String> ids, String resultHash})? get selectionIntent {
    final current = _view;
    if (!current.canActOnSelection || current.resultHash == null) {
      return null;
    }
    return (
      ids: current.selectedIds.toList()..sort(),
      resultHash: current.resultHash!,
    );
  }

  /// Rechecks the same materialized result after an async event choice or
  /// response-detail return. This does not authorize an offer: the server's
  /// preview and commit independently resolve current source/CRM authority.
  Future<bool> revalidateSelection({
    required List<String> ids,
    required String resultHash,
  }) async {
    final view = _view;
    final request = view.request;
    final generation = _generation;
    if (request == null || ids.isEmpty || ids.length > 25 ||
        view.status != HostResponseQueryStatus.ready ||
        view.resultHash != resultHash ||
        !view.selectedIds.containsAll(ids)) {
      return false;
    }
    try {
      final page = await _gateway.query(request.withCursor(null));
      if (!_isCurrent(generation) || _view.resultHash != resultHash ||
          !_view.selectedIds.containsAll(ids) ||
          page.queryHash != view.queryHash ||
          page.resultHash != resultHash ||
          !page.selectedIds.containsAll(ids)) {
        return false;
      }
      return true;
    } on Object {
      return false;
    }
  }

  HostResponseQueryView _fromPage(
    HostResponseQueryRequest request,
    HostResponseQueryPage page,
  ) => HostResponseQueryView(
    status: page.items.isEmpty
        ? HostResponseQueryStatus.empty
        : HostResponseQueryStatus.ready,
    request: request,
    form: page.form,
    rows: page.items,
    catalog: page.fieldCatalog,
    total: page.total,
    nextCursor: page.nextCursor,
    resultHash: page.resultHash,
    queryHash: page.queryHash,
    availableIds: page.selectedIds,
  );

  void _requireValidPage(
    HostResponseQueryPage page,
    HostResponseQueryRequest request, {
    required bool firstPage,
  }) {
    if (page.form.formId != request.formId ||
        page.form.versionId != request.versionId ||
        page.items.length > request.limit ||
        page.total < page.items.length ||
        page.items.any((row) => !page.selectedIds.contains(row.id)) ||
        page.selectedIds.length != page.total ||
        page.items.map((row) => row.id).toSet().length != page.items.length ||
        firstPage && page.items.isEmpty && page.nextCursor != null) {
      throw const FormatException('Response query result is incomplete.');
    }
  }

  AppException _normalizeError(Object error) => normalizeBackendError(
    error,
    context: const BackendErrorContext(
      service: BackendService.functions,
      action: 'query form responses',
      resource: 'form_responses',
    ),
  );

  HostResponseQueryStatus _errorStatus(AppException error) {
    if (error.code == 'response-query-stale') {
      return HostResponseQueryStatus.stale;
    }
    if (error.code == 'too-many-requests') {
      return HostResponseQueryStatus.budgetExceeded;
    }
    if (error is PermissionException || error is SignInRequiredException) {
      return HostResponseQueryStatus.permissionLost;
    }
    return HostResponseQueryStatus.failure;
  }

  HostResponseQueryView _copy(
    HostResponseQueryView value, {
    HostResponseQueryStatus? status,
    Set<String>? selectedIds,
    bool? loadingMore,
    Object? error,
  }) => HostResponseQueryView(
    status: status ?? value.status,
    request: value.request,
    form: value.form,
    rows: value.rows,
    catalog: value.catalog,
    total: value.total,
    nextCursor: value.nextCursor,
    resultHash: value.resultHash,
    queryHash: value.queryHash,
    availableIds: value.availableIds,
    selectedIds: selectedIds ?? value.selectedIds,
    loadingMore: loadingMore ?? value.loadingMore,
    error: error,
  );

  void _publish(HostResponseQueryView value) {
    if (_disposed) {
      return;
    }
    _view = value;
    notifyListeners();
  }

  bool _isCurrent(int generation) => !_disposed && generation == _generation;

  @override
  void dispose() {
    _disposed = true;
    ++_generation;
    super.dispose();
  }
}
