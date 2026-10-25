import 'package:catch_dating_app/core/app_error_message.dart';
import 'package:catch_dating_app/hosts/data/host_roster_file_parser.dart';
import 'package:catch_dating_app/hosts/data/host_roster_file_service.dart';
import 'package:catch_dating_app/hosts/domain/host_roster_import.dart';
import 'package:catch_dating_app/l10n/l10n.dart';
import 'package:catch_dating_app/programs/data/program_setup_repository.dart';
import 'package:catch_dating_app/programs/domain/program_manifest_mapper.dart';
import 'package:catch_dating_app/programs/domain/program_models.dart';
import 'package:catch_dating_app/programs/presentation/program_workspace_controller.dart';
import 'package:catch_tokens/catch_tokens.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

/// Manifest import flow: pick a CSV/XLSX, map its columns to manifest fields,
/// preview server-side counts, then commit. The commit retries are idempotent
/// through `clientOperationId`; preview and commit use separate operation ids
/// because the receipt hash includes the mode.
class ProgramImportScreen extends ConsumerStatefulWidget {
  const ProgramImportScreen({super.key, required this.programId});

  final String programId;

  @override
  ConsumerState<ProgramImportScreen> createState() =>
      _ProgramImportScreenState();
}

class _ProgramImportScreenState extends ConsumerState<ProgramImportScreen> {
  HostRosterTable? _table;
  Map<ProgramManifestField, int?> _mapping = const {};
  ProgramManifestImportResult? _preview;
  ProgramManifestImportResult? _committed;
  Object? _error;
  bool _pending = false;

  String _fieldLabel(ProgramManifestField field) => switch (field) {
    ProgramManifestField.displayName =>
      context.l10n.programsImportFieldDisplayName,
    ProgramManifestField.phoneE164 => context.l10n.programsImportFieldPhone,
    ProgramManifestField.email => context.l10n.programsImportFieldEmail,
    ProgramManifestField.externalReference =>
      context.l10n.programsImportFieldExternalReference,
    ProgramManifestField.householdLabel =>
      context.l10n.programsImportFieldHousehold,
    ProgramManifestField.groupLabels => context.l10n.programsImportFieldGroups,
    ProgramManifestField.partyLabel => context.l10n.programsImportFieldParty,
    ProgramManifestField.flightNumber => context.l10n.programsImportFieldFlight,
    ProgramManifestField.originIata => context.l10n.programsImportFieldOrigin,
    ProgramManifestField.destinationIata =>
      context.l10n.programsImportFieldDestinationIata,
    ProgramManifestField.scheduledArrivalAt =>
      context.l10n.programsImportFieldArrival,
    ProgramManifestField.passengers =>
      context.l10n.programsImportFieldPassengers,
    ProgramManifestField.luggageUnits =>
      context.l10n.programsImportFieldLuggage,
    ProgramManifestField.pickupPointLabel =>
      context.l10n.programsImportFieldPickup,
    ProgramManifestField.destinationHotelName =>
      context.l10n.programsImportFieldHotel,
    ProgramManifestField.destinationLabel =>
      context.l10n.programsImportFieldDestinationLabel,
  };

  ProgramManifestMappedRows get _mapped {
    final table = _table;
    if (table == null) {
      return const ProgramManifestMappedRows(rows: [], rowIssues: []);
    }
    return mapProgramManifestRows(
      headers: table.headers,
      rows: table.rows,
      mapping: {
        for (final e in _mapping.entries)
          if (e.value != null) e.key: e.value!,
      },
    );
  }

  Future<void> _pickFile() async {
    setState(() {
      _error = null;
      _committed = null;
      _preview = null;
    });
    try {
      final picked = await ref
          .read(hostRosterFileServiceProvider)
          .pickRosterFile();
      if (picked == null) return;
      final table = parseHostRosterFile(
        fileName: picked.name,
        bytes: picked.bytes,
      );
      setState(() {
        _table = table;
        _mapping = suggestProgramManifestMapping(table.headers);
      });
    } catch (error) {
      if (mounted) setState(() => _error = error);
    }
  }

  Future<void> _pickColumn(ProgramManifestField field) async {
    final table = _table;
    if (table == null) return;
    final chosen = await showCatchSelectionSheet<int>(
      context: context,
      title: _fieldLabel(field),
      value: _mapping[field] ?? -1,
      items: [
        CatchSelectionMenuItem(
          value: -1,
          label: context.l10n.programsImportFieldSkip,
        ),
        for (var i = 0; i < table.headers.length; i++)
          CatchSelectionMenuItem(value: i, label: table.headers[i]),
      ],
    );
    if (chosen == null || !mounted) return;
    setState(() => _mapping[field] = chosen < 0 ? null : chosen);
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
      if (mode == 'commit') {
        ref.invalidate(programGuestListProvider(widget.programId));
        ref.invalidate(organizerProgramDetailProvider(widget.programId));
      }
    } catch (error) {
      if (mounted) setState(() => _error = error);
    } finally {
      if (mounted) setState(() => _pending = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final table = _table;
    final mapped = _mapped;
    return CatchRouteScaffold(
      topBarBuilder: (context, scrolledUnder) => CatchTopBar.route(
        title: context.l10n.programsImportTitle,
        emphasis: scrolledUnder
            ? CatchTopBarEmphasis.divided
            : CatchTopBarEmphasis.plain,
        navigation: const CatchTopBarNavigation(
          mode: CatchTopBarNavigationMode.back,
        ),
      ),
      body: CatchRouteBody.standardSections(
        sections: [
          if (_error != null)
            CatchSectionListItem(
              child: CatchBanner(
                title: context.l10n.programsGuestsMutationFailed,
                message: appErrorMessage(
                  _error!,
                  l10n: context.l10n,
                  context: AppErrorContext.event,
                ),
                icon: CatchIcons.info,
                tone: CatchBannerTone.danger,
              ),
            ),
          CatchSectionListItem(
            child: CatchSection.contained(
              title: context.l10n.programsImportFileTitle,
              subtitle: context.l10n.programsImportFileSubtitle,
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  CatchButton(
                    label: table == null
                        ? context.l10n.programsImportPickFile
                        : table.fileName,
                    leading: Icon(
                      CatchIcons.cloudUploadOutlined,
                      size: CatchIcon.md,
                    ),
                    variant: CatchButtonVariant.secondary,
                    onPressed: _pending ? null : _pickFile,
                  ),
                  if (table != null) ...[
                    const SizedBox(height: CatchSpacing.s2),
                    CatchText(
                      context.l10n.programsImportFileSummary(
                        count: table.rows.length,
                        columns: table.headers.length,
                      ),
                      variant: CatchTextVariant.bodyS,
                    ),
                  ],
                ],
              ),
            ),
          ),
          if (table != null)
            CatchSectionListItem(
              child: CatchSection.contained(
                title: context.l10n.programsImportMappingTitle,
                subtitle: context.l10n.programsImportMappingSubtitle,
                child: Column(
                  children: [
                    for (final field in ProgramManifestField.values)
                      CatchFieldRow.standard(
                        body: CatchText(
                          _fieldLabel(field),
                          variant: CatchTextVariant.bodyM,
                        ),
                        trailing: CatchText(
                          _mapping[field] == null
                              ? context.l10n.programsImportFieldSkip
                              : table.headers[_mapping[field]!],
                          variant: CatchTextVariant.bodyS,
                        ),
                        onTap: _pending ? null : () => _pickColumn(field),
                      ),
                  ],
                ),
              ),
            ),
          if (table != null)
            CatchSectionListItem(
              child: CatchSection.contained(
                title: context.l10n.programsImportPreviewTitle,
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.stretch,
                  children: [
                    CatchText(
                      context.l10n.programsImportRowSummary(
                        mapped: mapped.rows.length,
                        skipped: mapped.rowIssues.length,
                      ),
                      variant: CatchTextVariant.bodyM,
                    ),
                    const SizedBox(height: CatchSpacing.s3),
                    CatchButton(
                      label: context.l10n.programsImportPreview,
                      leading: Icon(
                        CatchIcons.checklistRounded,
                        size: CatchIcon.md,
                      ),
                      variant: CatchButtonVariant.secondary,
                      onPressed:
                          _pending ||
                              mapped.rows.isEmpty ||
                              _mapping[ProgramManifestField.displayName] == null
                          ? null
                          : () => _run('preview'),
                    ),
                    if (_preview != null) ...[
                      const SizedBox(height: CatchSpacing.s3),
                      ProgramImportResultSection(result: _preview!),
                      const SizedBox(height: CatchSpacing.s3),
                      CatchButton(
                        label: context.l10n.programsImportCommit,
                        leading: Icon(
                          CatchIcons.checkRounded,
                          size: CatchIcon.md,
                        ),
                        onPressed: _pending ? null : () => _run('commit'),
                      ),
                    ],
                    if (_committed != null) ...[
                      const SizedBox(height: CatchSpacing.s3),
                      ProgramImportResultSection(result: _committed!),
                    ],
                  ],
                ),
              ),
            ),
          if (table == null)
            CatchSectionListItem(
              child: CatchEmptyState(
                icon: CatchIcons.cloudUploadOutlined,
                title: context.l10n.programsImportEmptyTitle,
                message: context.l10n.programsImportEmptyMessage,
              ),
            ),
        ],
      ),
    );
  }
}

class ProgramImportResultSection extends StatelessWidget {
  const ProgramImportResultSection({super.key, required this.result});

  final ProgramManifestImportResult result;

  @override
  Widget build(BuildContext context) => Column(
    crossAxisAlignment: CrossAxisAlignment.start,
    children: [
      Wrap(
        spacing: CatchSpacing.s2,
        runSpacing: CatchSpacing.s2,
        children: [
          CatchBadge(
            label: context.l10n.programsImportResultGuests(
              created: result.guestsCreated,
              updated: result.guestsUpdated,
            ),
          ),
          CatchBadge(
            label: context.l10n.programsImportResultLegs(
              created: result.legsCreated,
              updated: result.legsUpdated,
            ),
          ),
          CatchBadge(
            label: context.l10n.programsImportResultHouseholds(
              count: result.householdsCreated,
            ),
          ),
          CatchBadge(
            label: context.l10n.programsImportResultGroups(
              count: result.groupsCreated,
            ),
          ),
          if (result.alreadyApplied)
            CatchBadge(
              label: context.l10n.programsImportAlreadyApplied,
              tone: CatchBadgeTone.warning,
            ),
        ],
      ),
      if (result.rowErrors.isNotEmpty) ...[
        const SizedBox(height: CatchSpacing.s2),
        CatchText(
          context.l10n.programsImportErrors(count: result.rowErrors.length),
          variant: CatchTextVariant.supportingStrong,
        ),
        for (final error in result.rowErrors.take(20))
          CatchText(
            context.l10n.programsImportRowError(
              index: error.index + 1,
              message: error.message,
            ),
            variant: CatchTextVariant.bodyS,
          ),
      ],
    ],
  );
}
