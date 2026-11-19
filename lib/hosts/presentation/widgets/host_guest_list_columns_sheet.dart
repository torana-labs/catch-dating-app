import 'dart:async';

import 'package:catch_dating_app/contexts/audience/domain/guest_list_import_preview.dart';
import 'package:catch_dating_app/contexts/audience/domain/host_roster_import.dart';
import 'package:catch_dating_app/hosts/presentation/widgets/host_roster_mapping_field.dart';
import 'package:catch_kernel/country_markets.dart';
import 'package:catch_l10n/l10n.dart';
import 'package:catch_platform/errors/app_error_message.dart';
import 'package:catch_platform/l10n/catch_ui_copy.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/material.dart';
import 'package:intl/intl.dart';

/// Reads the file again on the server with the host's choices.
typedef GuestListRepreview =
    Future<GuestListImportPreview> Function(
      Map<HostRosterField, int?> mapping,
      GuestListFallbackRevenue? fallbackRevenue,
    );

/// Shows the columns guests.import-list read, lets the host change them and
/// add a fallback ticket price, and returns the preview to review: its rows
/// are already in the host's review session (owner decision on #2061,
/// question 6). The file is read on the server, so columns show what they
/// hold rather than sample values.
Future<GuestListImportPreview?> showHostGuestListColumns(
  BuildContext context, {
  required GuestListImportPreview initial,
  required GuestListRepreview repreview,
  int? suggestedRevenueAmountMinor,
  String defaultRevenueCurrency = defaultCurrencyCode,
}) => showCatchBottomSheet<GuestListImportPreview>(
  context: context,
  builder: (context) => HostGuestListColumnsSheet(
    initial: initial,
    repreview: repreview,
    suggestedRevenueAmountMinor: suggestedRevenueAmountMinor,
    defaultRevenueCurrency: defaultRevenueCurrency,
  ),
);

class HostGuestListColumnsSheet extends StatefulWidget {
  const HostGuestListColumnsSheet({
    super.key,
    required this.initial,
    required this.repreview,
    this.suggestedRevenueAmountMinor,
    this.defaultRevenueCurrency = defaultCurrencyCode,
  });

  final GuestListImportPreview initial;
  final GuestListRepreview repreview;
  final int? suggestedRevenueAmountMinor;
  final String defaultRevenueCurrency;

  @override
  State<HostGuestListColumnsSheet> createState() =>
      _HostGuestListColumnsSheetState();
}

class _HostGuestListColumnsSheetState extends State<HostGuestListColumnsSheet> {
  late GuestListImportPreview _preview = widget.initial;
  late final Map<HostRosterField, int?> _mapping = {...widget.initial.mapping};
  final _fallbackRevenueController = TextEditingController();
  late final _revenueCurrencyController = TextEditingController(
    text: widget.defaultRevenueCurrency,
  );
  Timer? _debounce;
  int _generation = 0;
  bool _checking = false;
  Object? _error;

  @override
  void dispose() {
    _debounce?.cancel();
    _fallbackRevenueController.dispose();
    _revenueCurrencyController.dispose();
    super.dispose();
  }

  GuestListFallbackRevenue? get _fallback {
    final text = _fallbackRevenueController.text.trim();
    if (text.isEmpty) return null;
    final amountMinor = parseHostRosterRevenueAmountMinor(text);
    final currency = _revenueCurrencyController.text.trim().toUpperCase();
    if (amountMinor == null || !RegExp(r'^[A-Z]{3}$').hasMatch(currency)) {
      return null;
    }
    return (amountMinor: amountMinor, currency: currency);
  }

  bool get _invalidFallback =>
      _fallbackRevenueController.text.trim().isNotEmpty && _fallback == null;

  /// Asks the server again once the host stops changing choices.
  void _choicesChanged() {
    setState(() {});
    _debounce?.cancel();
    if (_invalidFallback) return;
    _debounce = Timer(const Duration(milliseconds: 400), _repreview);
  }

  Future<void> _repreview() async {
    final generation = ++_generation;
    setState(() {
      _checking = true;
      _error = null;
    });
    try {
      final preview = await widget.repreview({..._mapping}, _fallback);
      if (!mounted || generation != _generation) return;
      setState(() => _preview = preview);
    } on Object catch (error) {
      if (!mounted || generation != _generation) return;
      setState(() => _error = error);
    } finally {
      if (mounted && generation == _generation) {
        setState(() => _checking = false);
      }
    }
  }

  String _shapeHint(
    BuildContext context,
    GuestListColumnShape shape,
  ) => switch (shape) {
    GuestListColumnShape.empty => context.l10n.hostsGuestListColumnShapeEmpty,
    GuestListColumnShape.phoneLike =>
      context.l10n.hostsGuestListColumnShapePhone,
    GuestListColumnShape.emailLike =>
      context.l10n.hostsGuestListColumnShapeEmail,
    GuestListColumnShape.dateLike => context.l10n.hostsGuestListColumnShapeDate,
    GuestListColumnShape.number => context.l10n.hostsGuestListColumnShapeNumber,
    GuestListColumnShape.text => context.l10n.hostsGuestListColumnShapeText,
  };

  @override
  Widget build(BuildContext context) {
    final preview = _preview;
    final ready = preview.count('add') + preview.count('update');
    final needsReview =
        preview.count('needsReview') + preview.count('identityConflict');
    final left = preview.count('excluded') + preview.count('skipped');
    final canReview =
        preview.canReview &&
        !_checking &&
        _error == null &&
        !_invalidFallback &&
        _debounce?.isActive != true;
    final hints = [
      for (final shape in preview.columnShapes) _shapeHint(context, shape),
    ];
    return CatchSheet.standard(
      title: context.l10n.hostsOperationalRosterImportTitle,
      subtitle: context.l10n.hostsOperationalRosterImportSubtitle,
      footer: CatchButton.sheet(
        role: CatchButtonEmphasis.commit,
        label: context.l10n.hostsGuestListReviewAction,
        onPressed: canReview ? () => Navigator.of(context).pop(preview) : null,
      ),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          CatchBanner(
            message: [preview.headline, ...preview.lines.take(3)].join('\n'),
          ),
          if (preview.needsMapping) ...[
            gapH8,
            CatchBanner.error(message: context.l10n.hostsGuestListNeedsName),
          ],
          if (_checking) ...[
            gapH8,
            CatchBanner(message: context.l10n.hostsGuestListChecking),
          ],
          if (_error != null) ...[
            gapH8,
            CatchBanner.error(
              message: appErrorMessage(_error!, l10n: context.l10n),
            ),
          ],
          gapH12,
          CatchFieldLanes.divided(
            children: [
              for (final field in HostRosterField.values)
                HostRosterMappingField(
                  field: field,
                  headers: preview.headers,
                  rows: const [],
                  columnHints: hints,
                  value: _mapping[field],
                  onChanged: (value) {
                    _mapping[field] = value;
                    _choicesChanged();
                  },
                ),
            ],
          ),
          gapH12,
          CatchFieldLanes.divided(
            children: [
              CatchField.input(
                copy: catchFieldCopy(context.l10n),
                key: const ValueKey('host-guest-list-revenue-fallback'),
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
                errorText: _invalidFallback
                    ? context.l10n.hostsOperationalRosterRevenueFallbackInvalid
                    : null,
                onChanged: (_) => _choicesChanged(),
              ),
              CatchField.input(
                copy: catchFieldCopy(context.l10n),
                key: const ValueKey('host-guest-list-revenue-currency'),
                title: context.l10n.hostsOperationalRosterFieldCurrency,
                contractExemption:
                    'Three-letter currency is copied into each row that '
                    'uses the explicit organizer estimate.',
                controller: _revenueCurrencyController,
                maxLength: 3,
                textCapitalization: TextCapitalization.characters,
                onChanged: (_) => _choicesChanged(),
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
                  count: ready,
                ),
                tone: CatchBadgeTone.brand,
              ),
              CatchBadge(
                label: context.l10n.hostsOperationalRosterNeedsReviewCount(
                  count: needsReview,
                ),
                tone: needsReview == 0
                    ? CatchBadgeTone.neutral
                    : CatchBadgeTone.warning,
              ),
              CatchBadge(
                label: context.l10n.hostsOperationalRosterExcludedCount(
                  count: left,
                ),
              ),
            ],
          ),
          if (preview.sampleNames.isNotEmpty) ...[
            gapH12,
            CatchSection.containedRows(
              children: [
                for (final name in preview.sampleNames)
                  CatchField.read(content: CatchPersonLayout(name: name)),
              ],
            ),
          ],
        ],
      ),
    );
  }
}
