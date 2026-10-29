import 'package:catch_dating_app/contexts/forms/domain/forms/host_form_export.dart';
import 'package:catch_dating_app/contexts/forms/domain/forms/host_response_query.dart';
import 'package:catch_dating_app/hosts/presentation/forms/host_form_response_query_controller.dart';
import 'package:catch_dating_app/hosts/presentation/forms/host_response_export_action.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:widgetbook_annotation/widgetbook_annotation.dart' as widgetbook;

enum _ExportMode { readyOnClick, pending, stale }

@widgetbook.UseCase(
  name: 'Filtered CSV ready on action',
  type: HostResponseExportAction,
  path: '[P1 product surfaces]/Host operations/RSVP review',
)
Widget hostResponseExportReady(BuildContext context) =>
    const _ExportFixture(mode: _ExportMode.readyOnClick);

@widgetbook.UseCase(
  name: 'Filtered export pending replay',
  type: HostResponseExportAction,
  path: '[P1 product surfaces]/Host operations/RSVP review',
)
Widget hostResponseExportPending(BuildContext context) =>
    const _ExportFixture(mode: _ExportMode.pending);

@widgetbook.UseCase(
  name: 'Filtered export needs fresh results',
  type: HostResponseExportAction,
  path: '[P1 product surfaces]/Host operations/RSVP review',
)
Widget hostResponseExportStale(BuildContext context) =>
    const _ExportFixture(mode: _ExportMode.stale);

class _ExportFixture extends StatefulWidget {
  const _ExportFixture({required this.mode});
  final _ExportMode mode;

  @override
  State<_ExportFixture> createState() => _ExportFixtureState();
}

class _ExportFixtureState extends State<_ExportFixture> {
  late final HostResponseQueryController _query = HostResponseQueryController(
    _FixtureQuery(),
  );
  bool _loaded = false;

  @override
  void initState() {
    super.initState();
    _query
        .apply(
          const HostResponseQueryRequest(
            organizerId: 'org_demo',
            formId: 'form_demo',
            versionId: 'version_2',
          ),
        )
        .then((_) {
          if (mounted) setState(() => _loaded = true);
        });
  }

  @override
  void dispose() {
    _query.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) => ProviderScope(
    child: SizedBox(
      width: 580,
      child: _loaded
          ? HostResponseExportAction(
              accountId: 'manager_demo',
              organizerId: 'org_demo',
              formId: 'form_demo',
              queryController: _query,
              gateway: _FixtureExport(widget.mode),
              currentAccountId: () => 'manager_demo',
              openDownload: (_) async => true,
            )
          : const Center(child: CircularProgressIndicator()),
    ),
  );
}

class _FixtureQuery implements HostResponseQueryGateway {
  @override
  Future<HostResponseQueryPage> query(HostResponseQueryRequest request) async =>
      const HostResponseQueryPage(
        form: HostResponseQueryForm(
          formId: 'form_demo',
          title: 'Saturday Social application',
          versionId: 'version_2',
          version: 2,
        ),
        items: [],
        nextCursor: null,
        total: 0,
        selectedIds: {},
        queryHash: 'fixture-query-hash',
        resultHash: 'fixture-result-hash',
        fieldCatalog: [],
      );
}

class _FixtureExport implements HostResponseExportGateway {
  const _FixtureExport(this.mode);
  final _ExportMode mode;

  @override
  Future<HostResponseExportCommand?> pending({
    required String accountId,
    required String organizerId,
    required String formId,
  }) async {
    if (mode == _ExportMode.readyOnClick) return null;
    return HostResponseExportCommand(
      accountId: accountId,
      organizerId: organizerId,
      formId: formId,
      versionId: 'version_2',
      requestId: 'fixture_export_request',
      format: HostFormExportFormat.csv,
      statuses: const ['submitted'],
      responseQuery: const HostResponseQueryRequest(
        organizerId: 'org_demo',
        formId: 'form_demo',
        versionId: 'version_2',
      ).toJson(),
      expectedQueryHash: 'fixture-query-hash',
      expectedResultHash: mode == _ExportMode.stale
          ? 'old-result-hash'
          : 'fixture-result-hash',
      createdAtMillis: 1000,
    );
  }

  @override
  Future<HostFormExportReceipt> execute(
    HostResponseExportCommand command,
  ) async => HostFormExportReceipt(
    exportId: 'formexport_fixture',
    status: mode == _ExportMode.pending
        ? HostFormExportStatus.pending
        : HostFormExportStatus.completed,
    format: command.format,
    rowCount: 0,
    downloadUrl: mode == _ExportMode.pending
        ? null
        : 'https://catch.example/fixture-export.csv',
    expiresAt: DateTime.utc(2026, 10, 1),
    errorMessage: null,
  );
}
