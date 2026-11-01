import 'dart:async';
import 'dart:math';

import 'package:catch_dating_app/contexts/forms/domain/forms/host_form_export.dart';
import 'package:catch_dating_app/hosts/presentation/forms/host_form_response_query_controller.dart';
import 'package:flutter/foundation.dart';

enum HostResponseExportStatus {
  idle,
  recovering,
  preparing,
  pending,
  ready,
  stale,
  failure,
}

@immutable
class HostResponseExportView {
  const HostResponseExportView(
    this.status, {
    this.command,
    this.receipt,
    this.error,
    this.downloadOpened = false,
  });

  final HostResponseExportStatus status;
  final HostResponseExportCommand? command;
  final HostFormExportReceipt? receipt;
  final Object? error;
  final bool downloadOpened;
}

// provider-graph: ownership-listenable:HostResponseExportController:reactive-state planned CAT156 -- HostResponseExportController is a verified existing business-state Listenable owner (the EventPreferencesEditorController entry is the shared abstract base). Migrate its manual loaded/operation/error publication to an immutable generated owner in the bounded CAT156 slice, preserving identity, cancellation, in-flight deduplication and any journal/idempotency guarantees.
/// Uses only the applied query controller view. A draft filter, page cursor,
/// account change or late receipt cannot silently change the exported set.
class HostResponseExportController extends ChangeNotifier {
  HostResponseExportController({
    required this.accountId,
    required this.organizerId,
    required this.formId,
    required this.queryController,
    required this.gateway,
    required this.currentAccountId,
    required this.openDownload,
    required this.now,
    required this.wait,
  }) {
    queryController.addListener(_queryChanged);
  }

  final String accountId;
  final String organizerId;
  final String formId;
  final HostResponseQueryController queryController;
  final HostResponseExportGateway gateway;
  final String? Function() currentAccountId;
  final Future<bool> Function(Uri) openDownload;
  final DateTime Function() now;
  final Future<void> Function(Duration) wait;
  static final Random _entropy = Random.secure();

  int _generation = 0;
  bool _disposed = false;
  String? _staleResultHash;
  HostResponseExportView _view = const HostResponseExportView(
    HostResponseExportStatus.idle,
  );
  HostResponseExportView get view => _view;

  bool _sameApplied(HostResponseExportCommand command) {
    final current = queryController.view;
    final request = current.request;
    return request != null &&
        (current.status == HostResponseQueryStatus.ready ||
            current.status == HostResponseQueryStatus.empty) &&
        command.accountId == accountId &&
        command.matches(
          request,
          current.queryHash ?? '',
          current.resultHash ?? '',
        ) &&
        request.cursor == null;
  }

  void _queryChanged() {
    final command = _view.command;
    if (command == null) {
      final current = queryController.view;
      if (_view.status == HostResponseExportStatus.stale &&
          _staleResultHash != null &&
          current.resultHash != null &&
          current.resultHash != _staleResultHash &&
          (current.status == HostResponseQueryStatus.ready ||
              current.status == HostResponseQueryStatus.empty)) {
        _staleResultHash = null;
        _publish(const HostResponseExportView(HostResponseExportStatus.idle));
      }
      return;
    }
    final matches = _sameApplied(command);
    if (!matches && _view.status != HostResponseExportStatus.stale) {
      ++_generation;
      _publish(
        HostResponseExportView(
          HostResponseExportStatus.stale,
          command: command,
        ),
      );
    } else if (matches && _view.status == HostResponseExportStatus.stale) {
      _publish(
        HostResponseExportView(
          HostResponseExportStatus.pending,
          command: command,
        ),
      );
    }
  }

  bool _current(int generation) => !_disposed && generation == _generation;
  bool get _sameAccount => currentAccountId() == accountId;

  void _publish(HostResponseExportView value) {
    if (_disposed) return;
    _view = value;
    notifyListeners();
  }

  /// Discovers the original command before allowing another export request.
  Future<void> recover() async {
    if (_view.status == HostResponseExportStatus.preparing) return;
    final generation = ++_generation;
    _publish(const HostResponseExportView(HostResponseExportStatus.recovering));
    try {
      final saved = await gateway.pending(
        accountId: accountId,
        organizerId: organizerId,
        formId: formId,
      );
      if (!_current(generation)) return;
      _publish(
        saved == null
            ? const HostResponseExportView(HostResponseExportStatus.idle)
            : HostResponseExportView(
                _sameApplied(saved)
                    ? HostResponseExportStatus.pending
                    : HostResponseExportStatus.stale,
                command: saved,
              ),
      );
    } on Object catch (error) {
      if (_current(generation)) {
        _publish(
          HostResponseExportView(
            HostResponseExportStatus.failure,
            error: error,
          ),
        );
      }
    }
  }

  Future<void> start(HostFormExportFormat format) async {
    if (_view.status == HostResponseExportStatus.recovering ||
        _view.status == HostResponseExportStatus.preparing ||
        !_sameAccount) {
      return;
    }
    final generation = ++_generation;
    final initial = queryController.view;
    final initialRequest = initial.request;
    final initialQueryHash = initial.queryHash;
    final initialResultHash = initial.resultHash;
    try {
      final pending = await gateway.pending(
        accountId: accountId,
        organizerId: organizerId,
        formId: formId,
      );
      if (!_current(generation)) return;
      if (pending != null) {
        _publish(
          HostResponseExportView(
            _sameApplied(pending)
                ? HostResponseExportStatus.pending
                : HostResponseExportStatus.stale,
            command: pending,
          ),
        );
        if (_sameApplied(pending)) await _run(pending, generation);
        return;
      }
      final applied = queryController.view;
      final request = applied.request;
      if (!identical(request, initialRequest) ||
          applied.queryHash != initialQueryHash ||
          applied.resultHash != initialResultHash ||
          (initial.status != HostResponseQueryStatus.ready &&
              initial.status != HostResponseQueryStatus.empty)) {
        return;
      }
      if (request == null ||
          (applied.status != HostResponseQueryStatus.ready &&
              applied.status != HostResponseQueryStatus.empty) ||
          request.organizerId != organizerId ||
          request.formId != formId ||
          request.cursor != null ||
          applied.queryHash == null ||
          applied.resultHash == null) {
        return;
      }
      final command = HostResponseExportCommand(
        accountId: accountId,
        organizerId: organizerId,
        formId: formId,
        versionId: request.versionId,
        requestId: _newRequestId(),
        format: format,
        statuses: request.statuses.toList()..sort(),
        responseQuery: request.withCursor(null).toJson(),
        expectedQueryHash: applied.queryHash!,
        expectedResultHash: applied.resultHash!,
        createdAtMillis: now().millisecondsSinceEpoch,
      );
      await _run(command, generation);
    } on Object catch (error) {
      if (_current(generation)) {
        _publish(
          HostResponseExportView(
            HostResponseExportStatus.failure,
            command: _view.command,
            error: error,
          ),
        );
      }
    }
  }

  Future<void> retryPending() async {
    final command = _view.command;
    if (command == null ||
        !_sameAccount ||
        _view.status == HostResponseExportStatus.preparing) {
      return;
    }
    final generation = ++_generation;
    await _run(command, generation, resolveOnly: !_sameApplied(command));
  }

  /// A changed query can still settle the original journaled request. Its
  /// terminal receipt releases the journal but is never opened for new rows.
  Future<void> _run(
    HostResponseExportCommand command,
    int generation, {
    bool resolveOnly = false,
  }) async {
    if (!_sameAccount || !resolveOnly && !_sameApplied(command)) {
      _publish(
        HostResponseExportView(
          HostResponseExportStatus.stale,
          command: command,
        ),
      );
      return;
    }
    _publish(
      HostResponseExportView(
        HostResponseExportStatus.preparing,
        command: command,
      ),
    );
    try {
      for (var attempt = 0; attempt < 12; attempt++) {
        final receipt = await gateway.execute(command);
        if (!_current(generation) ||
            !_sameAccount ||
            !resolveOnly && !_sameApplied(command)) {
          return;
        }
        if (receipt.status == HostFormExportStatus.pending ||
            receipt.status == HostFormExportStatus.running) {
          if (attempt == 11) {
            _publish(
              HostResponseExportView(
                resolveOnly
                    ? HostResponseExportStatus.stale
                    : HostResponseExportStatus.pending,
                command: command,
                receipt: receipt,
              ),
            );
            return;
          }
          await wait(hostFormExportReceiptPollingInterval);
          if (!_current(generation) ||
              !_sameAccount ||
              !resolveOnly && !_sameApplied(command)) {
            return;
          }
          continue;
        }
        if (resolveOnly) {
          _publish(const HostResponseExportView(HostResponseExportStatus.idle));
          return;
        }
        if (receipt.errorCode == 'response-query-stale') {
          _staleResultHash = command.expectedResultHash;
          _publish(
            HostResponseExportView(
              HostResponseExportStatus.stale,
              receipt: receipt,
            ),
          );
          return;
        }
        if (receipt.status != HostFormExportStatus.completed ||
            receipt.downloadUrl == null) {
          _publish(
            HostResponseExportView(
              HostResponseExportStatus.failure,
              receipt: receipt,
            ),
          );
          return;
        }
        final uri = Uri.tryParse(receipt.downloadUrl!);
        if (uri == null || uri.scheme != 'https' || uri.host.isEmpty) {
          throw const FormatException('Export download URL is invalid.');
        }
        if (!_sameAccount || !_sameApplied(command)) {
          return;
        }
        final opened = await openDownload(uri);
        if (_current(generation) && _sameAccount && _sameApplied(command)) {
          _publish(
            HostResponseExportView(
              HostResponseExportStatus.ready,
              command: command,
              receipt: receipt,
              downloadOpened: opened,
            ),
          );
        }
        return;
      }
    } on Object catch (error) {
      if (_current(generation) && _sameAccount) {
        _publish(
          HostResponseExportView(
            resolveOnly
                ? HostResponseExportStatus.stale
                : HostResponseExportStatus.pending,
            command: command,
            error: error,
          ),
        );
      }
    }
  }

  Future<void> openReady() async {
    final receipt = _view.receipt;
    final command = _view.command;
    if (receipt?.downloadUrl == null ||
        command == null ||
        !_sameApplied(command) ||
        !_sameAccount) {
      return;
    }
    final uri = Uri.tryParse(receipt!.downloadUrl!);
    if (uri == null || uri.scheme != 'https' || uri.host.isEmpty) return;
    final generation = _generation;
    if (!_sameAccount) return;
    final opened = await openDownload(uri);
    if (_current(generation) && _sameAccount && _sameApplied(command)) {
      _publish(
        HostResponseExportView(
          HostResponseExportStatus.ready,
          command: command,
          receipt: receipt,
          downloadOpened: opened,
        ),
      );
    }
  }

  static String _newRequestId() {
    final time = DateTime.now().microsecondsSinceEpoch.toRadixString(36);
    final random = List.generate(
      3,
      (_) => _entropy.nextInt(1 << 32).toRadixString(36),
    ).join();
    return 'export_${time}_$random';
  }

  @override
  void dispose() {
    _disposed = true;
    ++_generation;
    queryController.removeListener(_queryChanged);
    super.dispose();
  }
}
