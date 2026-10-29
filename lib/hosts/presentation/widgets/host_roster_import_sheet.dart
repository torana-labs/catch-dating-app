import 'package:catch_dating_app/contexts/audience/domain/host_roster_import.dart';
import 'package:catch_dating_app/core/country_markets.dart';
import 'package:catch_dating_app/core/presentation/catch_ui_copy.dart';
import 'package:catch_dating_app/hosts/presentation/widgets/host_roster_import_copy.dart';
import 'package:catch_dating_app/hosts/presentation/widgets/host_roster_mapping_field.dart';
import 'package:catch_dating_app/l10n/l10n.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/material.dart';
import 'package:intl/intl.dart';

Future<HostRosterImportPlan?> showHostRosterMapping(
  BuildContext context,
  HostRosterTable table, {
  int? suggestedRevenueAmountMinor,
  String defaultRevenueCurrency = defaultCurrencyCode,
}) => showCatchBottomSheet<HostRosterImportPlan>(
  context: context,
  builder: (context) => HostRosterImportSheet(
    table: table,
    suggestedRevenueAmountMinor: suggestedRevenueAmountMinor,
    defaultRevenueCurrency: defaultRevenueCurrency,
  ),
);

class HostRosterImportSheet extends StatefulWidget {
  const HostRosterImportSheet({
    super.key,
    required this.table,
    this.suggestedRevenueAmountMinor,
    this.defaultRevenueCurrency = defaultCurrencyCode,
  });

  final HostRosterTable table;
  final int? suggestedRevenueAmountMinor;
  final String defaultRevenueCurrency;

  @override
  State<HostRosterImportSheet> createState() => _HostRosterImportSheetState();
}

class _HostRosterImportSheetState extends State<HostRosterImportSheet> {
  late final Map<HostRosterField, int?> _mapping = {
    ...widget.table.suggestedMapping,
  };
  final _fallbackRevenueController = TextEditingController();
  late final _revenueCurrencyController = TextEditingController(
    text: widget.defaultRevenueCurrency,
  );

  @override
  void dispose() {
    _fallbackRevenueController.dispose();
    _revenueCurrencyController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final fallbackText = _fallbackRevenueController.text.trim();
    final fallbackRevenueAmountMinor = fallbackText.isEmpty
        ? null
        : parseHostRosterRevenueAmountMinor(fallbackText);
    final fallbackRevenueCurrency = _revenueCurrencyController.text
        .trim()
        .toUpperCase();
    final invalidFallback =
        fallbackText.isNotEmpty &&
        (fallbackRevenueAmountMinor == null ||
            !RegExp(r'^[A-Z]{3}$').hasMatch(fallbackRevenueCurrency));
    final mapped = widget.table.mapRows(
      _mapping,
      fallbackRevenueAmountMinor: fallbackRevenueAmountMinor,
      fallbackRevenueCurrency: fallbackRevenueCurrency,
    );
    final canImport =
        widget.table.rows.isNotEmpty &&
        !mapped.hasBlockingMappingIssue &&
        mapped.truncatedCount == 0 &&
        !invalidFallback;
    return CatchSheet.standard(
      title: context.l10n.hostsOperationalRosterImportTitle,
      subtitle: context.l10n.hostsOperationalRosterImportSubtitle,
      footer: CatchButton.sheet(
        role: CatchButtonEmphasis.commit,
        label: context.l10n.hostsOperationalRosterImportAction(
          count: mapped.rows.length,
        ),
        onPressed: canImport
            ? () => Navigator.of(context).pop(
                HostRosterImportPlan.fromMappedRows(
                  table: widget.table,
                  mapped: mapped,
                  mapping: _mapping,
                ),
              )
            : null,
      ),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          CatchBadge.functional(
            label: widget.table.adapter.adapterId.label,
            tone:
                widget.table.adapter.support ==
                    HostRosterAdapterSupport.sampleRequired
                ? CatchBadgeTone.warning
                : CatchBadgeTone.brand,
          ),
          if (widget.table.adapter.support ==
              HostRosterAdapterSupport.sampleRequired) ...[
            gapH8,
            CatchBanner.error(
              message: context.l10n.hostsOperationalRosterAdapterSampleRequired,
            ),
          ],
          if (widget.table.adapter.providerMismatch) ...[
            gapH8,
            CatchBanner.error(
              message: context.l10n.hostsOperationalRosterProviderMismatch,
            ),
          ],
          if (widget.table.usedLegacyEncoding) ...[
            gapH8,
            CatchBanner.error(
              message: context.l10n.hostsOperationalRosterLegacyEncoding,
            ),
          ],
          if (widget.table.worksheetCount > 1) ...[
            gapH8,
            CatchBanner.error(
              message: context.l10n.hostsOperationalRosterMultipleWorksheets(
                count: widget.table.worksheetCount,
              ),
            ),
          ],
          gapH12,
          CatchFieldLanes.divided(
            children: [
              for (final field in HostRosterField.values)
                HostRosterMappingField(
                  field: field,
                  headers: widget.table.headers,
                  rows: widget.table.rows,
                  value: _mapping[field],
                  onChanged: (value) => setState(() {
                    _mapping[field] = value;
                  }),
                ),
            ],
          ),
          gapH12,
          CatchFieldLanes.divided(
            children: [
              CatchField.input(
                copy: catchFieldCopy(context.l10n),
                key: const ValueKey('host-roster-revenue-fallback'),
                title: context.l10n.hostsOperationalRosterRevenueFallbackAmount,
                contractExemption:
                    'Major-unit organizer estimate is converted to the '
                    'callable minor-unit revenue contract before import.',
                controller: _fallbackRevenueController,
                keyboardType: const TextInputType.numberWithOptions(
                  decimal: true,
                ),
                labelMode: CatchFieldLabelTextMode.optional,
                helperText: widget.suggestedRevenueAmountMinor == null
                    ? context.l10n.hostsOperationalRosterRevenueFallbackHelp
                    : context.l10n
                          .hostsOperationalRosterRevenueFallbackEventPrice(
                            amount: NumberFormat.simpleCurrency(
                              name: widget.defaultRevenueCurrency,
                            ).format(widget.suggestedRevenueAmountMinor! / 100),
                          ),
                errorText: invalidFallback
                    ? context.l10n.hostsOperationalRosterRevenueFallbackInvalid
                    : null,
                onChanged: (_) => setState(() {}),
              ),
              CatchField.input(
                copy: catchFieldCopy(context.l10n),
                key: const ValueKey('host-roster-revenue-currency'),
                title: context.l10n.hostsOperationalRosterFieldCurrency,
                contractExemption:
                    'Three-letter currency is copied into each row that '
                    'uses the explicit organizer estimate.',
                controller: _revenueCurrencyController,
                maxLength: 3,
                textCapitalization: TextCapitalization.characters,
                onChanged: (_) => setState(() {}),
              ),
            ],
          ),
          gapH12,
          Wrap(
            spacing: CatchSpacing.s2,
            runSpacing: CatchSpacing.s2,
            children: [
              CatchBadge(
                label: context.l10n.hostsOperationalRosterPreviewCount(
                  count: mapped.readyCount,
                ),
                tone: CatchBadgeTone.brand,
              ),
              CatchBadge(
                label: context.l10n.hostsOperationalRosterNeedsReviewCount(
                  count: mapped.needsReviewCount,
                ),
                tone: mapped.needsReviewCount == 0
                    ? CatchBadgeTone.neutral
                    : CatchBadgeTone.warning,
              ),
              CatchBadge(
                label: context.l10n.hostsOperationalRosterExcludedCount(
                  count: mapped.excludedCount,
                ),
              ),
            ],
          ),
          if (mapped.truncatedCount > 0) ...[
            gapH8,
            CatchBanner.error(
              message: context.l10n.hostsOperationalRosterLimit(
                count: mapped.truncatedCount,
              ),
            ),
          ],
          for (final issue in mapped.issues) ...[
            gapH8,
            CatchBanner.error(message: hostRosterRowIssueCopy(context, issue)),
          ],
          if (mapped.rows.isNotEmpty) ...[
            gapH12,
            CatchSection.containedRows(
              children: [
                for (final row in mapped.rows.take(3).indexed)
                  CatchField.read(
                    content: CatchPersonLayout(
                      name: row.$2.displayName,
                      supportingText: [
                        row.$2.phone,
                        row.$2.email,
                      ].whereType<String>().join(' · '),
                    ),
                  ),
              ],
            ),
          ],
        ],
      ),
    );
  }
}

String hostRosterImportIssueCopy(
  BuildContext context,
  HostRosterImportIssue issue,
) => switch (issue) {
  HostRosterImportIssue.unsupportedFile =>
    context.l10n.hostsOperationalRosterIssueUnsupported,
  HostRosterImportIssue.fileTooLarge =>
    context.l10n.hostsOperationalRosterIssueFileTooLarge,
  HostRosterImportIssue.expandedFileTooLarge =>
    context.l10n.hostsOperationalRosterIssueExpandedFileTooLarge,
  HostRosterImportIssue.missingRows =>
    context.l10n.hostsOperationalRosterIssueMissingRows,
  HostRosterImportIssue.tooManyColumns =>
    context.l10n.hostsOperationalRosterIssueTooManyColumns,
  HostRosterImportIssue.malformedCsv =>
    context.l10n.hostsOperationalRosterIssueMalformedCsv,
  HostRosterImportIssue.unreadableXlsx ||
  HostRosterImportIssue.missingWorksheet =>
    context.l10n.hostsOperationalRosterIssueUnreadableXlsx,
};
