import 'package:catch_dating_app/contexts/audience/domain/host_roster_import.dart';
import 'package:catch_dating_app/contexts/programmes/domain/program_models.dart';
import 'package:catch_l10n/l10n.dart';
import 'package:catch_platform/l10n/catch_ui_copy.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/widgets.dart';

/// The fields the board maps, in board order; the rest stay on Skip it
/// unless the file suggests them.
const hostProgrammeImportFields = [
  ProgramManifestField.displayName,
  ProgramManifestField.phoneE164,
  ProgramManifestField.householdLabel,
  ProgramManifestField.groupLabels,
  ProgramManifestField.flightNumber,
  ProgramManifestField.scheduledArrivalAt,
  ProgramManifestField.destinationHotelName,
];

/// Adding the guest list in board order: the file with Change, how many
/// guests and households the check found, what each column is, and the
/// rows that need a look.
class HostProgrammeImportBody extends StatelessWidget {
  const HostProgrammeImportBody({
    super.key,
    required this.table,
    required this.mapping,
    required this.preview,
    required this.issues,
    required this.onPick,
    required this.onMap,
    this.committed,
    this.error,
  });

  /// Null until a file is picked.
  final HostRosterTable? table;
  final Map<ProgramManifestField, int?> mapping;

  /// The server check of the mapped rows; null until it ran.
  final ProgramManifestImportResult? preview;
  final ProgramManifestImportResult? committed;

  /// Rows the mapping could not read, as (row number, reason).
  final List<({int index, String reason})> issues;
  final VoidCallback onPick;
  final void Function(ProgramManifestField field, int? column) onMap;

  /// The last failure, already in words.
  final String? error;

  @override
  Widget build(BuildContext context) {
    final l10n = context.l10n;
    final copy = catchFieldCopy(l10n);
    final table = this.table;
    final preview = this.preview;
    final committed = this.committed;
    final serverIssues = preview?.rowErrors ?? const [];
    return CatchPageBody.screen(
      gap: CatchPageBodyGap.tight,
      children: [
        if (error != null)
          CatchNotice.inline(
            tone: CatchNoticeTone.danger,
            icon: CatchIcons.error,
            body: error!,
          ),
        if (committed != null)
          CatchNotice.inline(
            tone: CatchNoticeTone.success,
            icon: CatchIcons.check,
            title: l10n.hostProgrammeImportDone,
            body: l10n.hostProgrammeImportDoneBody(
              created: committed.guestsCreated,
              updated: committed.guestsUpdated,
            ),
          ),
        CatchSection(
          children: [
            CatchIndexRow(
              key: const ValueKey<String>('host-programme-import-file'),
              icon: CatchIcons.document,
              title: table?.fileName ?? l10n.hostProgrammeImportNoFile,
              subtitle: table == null
                  ? l10n.hostProgrammeImportFileHelp
                  : l10n.hostProgrammeImportRows(count: table.rows.length),
              action: CatchIndexRowAction(
                label: table == null
                    ? l10n.hostProgrammeImportPick
                    : l10n.hostProgrammeImportChange,
                onPressed: committed == null ? onPick : null,
              ),
              onTap: null,
            ),
          ],
        ),
        if (preview != null)
          CatchText(
            l10n.hostProgrammeImportFound(
              guests: preview.guestsCreated + preview.guestsUpdated,
              households: preview.householdsCreated,
            ),
            variant: CatchTextVariant.pageTitle,
          ),
        if (table != null) ...[
          CatchSection(
            title: l10n.hostProgrammeImportColumns,
            dividers: CatchSectionPlacement.none,
            children: [
              for (final field in hostProgrammeImportFields)
                CatchField.select(
                  key: ValueKey<String>('host-programme-import-${field.name}'),
                  copy: copy,
                  title: programmeImportFieldLabel(l10n, field),
                  contractExemption:
                      'Which file column fills a manifest field.',
                  values: [
                    -1,
                    for (var i = 0; i < table.headers.length; i++) i,
                  ],
                  value: mapping[field] ?? -1,
                  itemLabelBuilder: (column) => column < 0
                      ? l10n.hostProgrammeImportSkip
                      : table.headers[column],
                  onChanged: committed != null
                      ? null
                      : (int? column) => onMap(
                          field,
                          column == null || column < 0 ? null : column,
                        ),
                ),
            ],
          ),
          if (issues.isNotEmpty || serverIssues.isNotEmpty)
            CatchSection(
              title: l10n.hostProgrammeImportIssues(
                count: issues.length + serverIssues.length,
              ),
              note: l10n.hostProgrammeImportIssuesNote,
              children: [
                for (final issue in issues.take(20))
                  CatchIndexRow(
                    key: ValueKey<String>(
                      'host-programme-import-issue-${issue.index}',
                    ),
                    marker: CatchIndexRowTone.warning,
                    title: l10n.hostProgrammeImportRow(row: issue.index + 1),
                    subtitle: issue.reason,
                    onTap: null,
                  ),
                for (final issue in serverIssues.take(20))
                  CatchIndexRow(
                    key: ValueKey<String>(
                      'host-programme-import-server-${issue.index}',
                    ),
                    marker: CatchIndexRowTone.warning,
                    title: l10n.hostProgrammeImportRow(row: issue.index + 1),
                    subtitle: issue.message,
                    onTap: null,
                  ),
              ],
            ),
        ],
      ],
    );
  }
}

String programmeImportFieldLabel(
  AppLocalizations l10n,
  ProgramManifestField field,
) => switch (field) {
  ProgramManifestField.displayName => l10n.hostProgrammeImportName,
  ProgramManifestField.phoneE164 => l10n.hostProgrammeSetupPhone,
  ProgramManifestField.householdLabel =>
    l10n.hostProgrammeGuestsColumnHousehold,
  ProgramManifestField.groupLabels => l10n.hostProgrammeImportGroups,
  ProgramManifestField.flightNumber => l10n.hostProgrammeImportFlight,
  ProgramManifestField.scheduledArrivalAt => l10n.hostProgrammeImportLands,
  ProgramManifestField.destinationHotelName => l10n.hostProgrammeSetupHotel,
  _ => field.name,
};
