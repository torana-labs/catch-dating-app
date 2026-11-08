import 'dart:async';

import 'package:catch_dating_app/contexts/audience/data/host_roster_file_parser.dart';
import 'package:catch_dating_app/contexts/audience/data/host_roster_file_service.dart';
import 'package:catch_dating_app/contexts/audience/domain/host_roster_import.dart';
import 'package:catch_dating_app/contexts/programmes/domain/program_manifest_mapper.dart';
import 'package:catch_dating_app/contexts/programmes/domain/program_models.dart';
import 'package:catch_dating_app/hosts/programmes/planner/programme_controller.dart';
import 'package:catch_dating_app/hosts/programmes/planner/programme_import_body.dart';
import 'package:catch_dating_app/programs/presentation/program_workspace_controller.dart';
import 'package:catch_l10n/l10n.dart';
import 'package:catch_platform/errors/app_error_message.dart';
import 'package:catch_tokens/catch_tokens.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/widgets.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

/// Adding the guest list (RbHostProgramImport): pick a CSV or XLSX, map
/// its columns, check it, then add it.
///
/// Check runs `importProgramManifest` in preview mode and Add in commit
/// mode, each with its own operation id (the receipt hash includes the
/// mode), then refreshes the programme and its guest list.
class HostProgrammeImportScreen extends ConsumerStatefulWidget {
  const HostProgrammeImportScreen({super.key, required this.programId});

  final String programId;

  @override
  ConsumerState<HostProgrammeImportScreen> createState() =>
      _HostProgrammeImportScreenState();
}

class _HostProgrammeImportScreenState
    extends ConsumerState<HostProgrammeImportScreen> {
  HostRosterTable? _table;
  Map<ProgramManifestField, int?> _mapping = const {};
  ProgramManifestImportResult? _preview;
  ProgramManifestImportResult? _committed;
  Object? _error;
  bool _pending = false;

  ProgramManifestMappedRows get _mapped {
    final table = _table;
    if (table == null) {
      return const ProgramManifestMappedRows(rows: [], rowIssues: []);
    }
    return mapProgramManifestRows(
      headers: table.headers,
      rows: table.rows,
      mapping: {
        for (final entry in _mapping.entries)
          if (entry.value != null) entry.key: entry.value!,
      },
    );
  }

  Future<void> _pick() async {
    setState(() {
      _error = null;
      _preview = null;
      _committed = null;
    });
    try {
      final picked = await ref
          .read(hostRosterFileServiceProvider)
          .pickRosterFile();
      if (picked == null || !mounted) return;
      final table = parseHostRosterFile(
        fileName: picked.name,
        bytes: picked.bytes,
      );
      setState(() {
        _table = table;
        _mapping = suggestProgramManifestMapping(table.headers);
      });
    } on Object catch (error) {
      if (mounted) setState(() => _error = error);
    }
  }

  Future<void> _run(String mode) async {
    final mapped = _mapped;
    if (mapped.rows.isEmpty) return;
    setState(() {
      _pending = true;
      _error = null;
    });
    try {
      final result = await ref
          .read(programWorkspaceControllerProvider.notifier)
          .importManifest(
            programId: widget.programId,
            mode: mode,
            clientOperationId:
                'manifest_${mode}_${DateTime.now().microsecondsSinceEpoch}',
            rows: mapped.rows,
          );
      if (!mounted) return;
      setState(() {
        if (mode == 'preview') {
          _preview = result;
        } else {
          _committed = result;
        }
      });
      if (mode == 'commit') refreshHostProgramme(ref, widget.programId);
    } on Object catch (error) {
      if (mounted) setState(() => _error = error);
    } finally {
      if (mounted) setState(() => _pending = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final l10n = context.l10n;
    final title = ref
        .watch(hostProgrammeControllerProvider(widget.programId))
        .program
        ?.title;
    final mapped = _mapped;
    final preview = _preview;
    final committed = _committed;
    final error = _error;
    void close() => context.canPop() ? context.pop() : null;
    return CatchRoot(
      format: CatchFormat.nightsOut,
      child: CatchScreen(
        key: const ValueKey<String>('host-programme-import-screen'),
        bodyScrolls: false,
        topBar: CatchTopBar(
          variant: CatchTopBarVariant.tool,
          back: CatchTopBarBack(
            label: l10n.hostProgrammeCreateClose,
            close: true,
          ),
          kicker: title,
          title: l10n.hostProgrammeImportTitle,
        ),
        dock: CatchDock(
          primary: committed != null
              ? CatchDockAction(
                  label: l10n.hostProgrammeImportBack,
                  onPressed: close,
                )
              : preview == null
              ? CatchDockAction(
                  label: l10n.hostProgrammeImportCheck,
                  loading: _pending,
                  onPressed: _pending || mapped.rows.isEmpty
                      ? null
                      : () => unawaited(_run('preview')),
                )
              : CatchDockAction(
                  label: l10n.hostProgrammeImportAdd(
                    count: preview.guestsCreated + preview.guestsUpdated,
                  ),
                  loading: _pending,
                  onPressed: _pending ? null : () => unawaited(_run('commit')),
                ),
          secondary: committed != null
              ? null
              : CatchDockAction(
                  label: l10n.hostProgrammeCreateCancel,
                  onPressed: _pending ? null : close,
                ),
        ),
        body: HostProgrammeImportBody(
          table: _table,
          mapping: _mapping,
          preview: preview,
          committed: committed,
          issues: mapped.rowIssues,
          error: error == null
              ? null
              : appErrorMessage(
                  error,
                  l10n: l10n,
                  context: AppErrorContext.event,
                ),
          onPick: () => unawaited(_pick()),
          onMap: (field, column) => setState(() {
            _mapping = {..._mapping, field: column};
            _preview = null;
          }),
        ),
      ),
    );
  }
}
