import 'package:catch_dating_app/contexts/audience/data/host_roster_intake_repository.dart';
import 'package:catch_dating_app/contexts/audience/domain/host_roster_import.dart';
import 'package:catch_dating_app/hosts/presentation/widgets/host_roster_import_copy.dart';
import 'package:catch_dating_app/l10n/l10n.dart';
import 'package:catch_dating_app/platform/l10n/catch_ui_copy.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';

Future<HostRosterIntakeReview?> showHostRosterIntakeReview(
  BuildContext context, {
  required HostRosterIntakeReview review,
  required ValueListenable<int> scopeRevision,
  required Future<HostRosterIntakeReview> Function(
    HostRosterIntakeReview review,
    Iterable<String> rowIds,
  )
  onSetExcluded,
  required Future<HostRosterIntakeReview> Function(
    HostRosterIntakeReview review,
  )
  onApply,
}) => showCatchBottomSheet<HostRosterIntakeReview>(
  context: context,
  builder: (context) => HostRosterIntakeReviewSheet(
    review: review,
    scopeRevision: scopeRevision,
    onSetExcluded: onSetExcluded,
    onApply: onApply,
  ),
);

class HostRosterIntakeReviewSheet extends StatefulWidget {
  const HostRosterIntakeReviewSheet({
    super.key,
    required this.review,
    required this.scopeRevision,
    required this.onSetExcluded,
    required this.onApply,
  });

  final HostRosterIntakeReview review;
  final ValueListenable<int> scopeRevision;
  final Future<HostRosterIntakeReview> Function(
    HostRosterIntakeReview review,
    Iterable<String> rowIds,
  )
  onSetExcluded;
  final Future<HostRosterIntakeReview> Function(HostRosterIntakeReview review)
  onApply;

  @override
  State<HostRosterIntakeReviewSheet> createState() =>
      _HostRosterIntakeReviewSheetState();
}

class _HostRosterIntakeReviewSheetState
    extends State<HostRosterIntakeReviewSheet> {
  late HostRosterIntakeReview _review = widget.review;
  late final int _initialScopeRevision;
  var _pending = false;
  var _scopeInvalidated = false;
  Object? _error;

  @override
  void initState() {
    super.initState();
    _initialScopeRevision = widget.scopeRevision.value;
    widget.scopeRevision.addListener(_handleScopeChange);
  }

  @override
  void dispose() {
    widget.scopeRevision.removeListener(_handleScopeChange);
    super.dispose();
  }

  void _handleScopeChange() {
    if (_scopeInvalidated ||
        widget.scopeRevision.value == _initialScopeRevision) {
      return;
    }
    setState(() => _scopeInvalidated = true);
    Navigator.of(context).maybePop();
  }

  Future<void> _excludeUnresolved() async {
    final ids = _review.unresolvedRowIds.toList(growable: false);
    if (_pending || ids.isEmpty) return;
    setState(() {
      _pending = true;
      _error = null;
    });
    try {
      // provider-graph: ownership-widget-async-callback:_HostRosterIntakeReviewSheetState._excludeUnresolved:await:widget.onSetExcluded watch CAT156 -- Existing bounded review signal at _HostRosterIntakeReviewSheetState._excludeUnresolved (await:widget.onSetExcluded). The method combines local completion publication with an awaited provider seam or declared Future callback. Its mutated fields/caller contract need focused classification: navigation, form/media/animation feedback may be mechanical, while loaded data, authorization, server pending/error or retry identity need a generated owner. This watch disposition does not certify compliance or declare a confirmed violation; inspect the exact responsibility before its CAT156 migration.
      final review = await widget.onSetExcluded(_review, {
        ..._review.excludedRowIds,
        ...ids,
      });
      if (mounted && !_scopeInvalidated) setState(() => _review = review);
    } catch (error) {
      if (mounted && !_scopeInvalidated) setState(() => _error = error);
    } finally {
      if (mounted && !_scopeInvalidated) setState(() => _pending = false);
    }
  }

  Future<void> _restoreExcluded() async {
    if (_pending || _review.excludedRowIds.isEmpty) return;
    setState(() {
      _pending = true;
      _error = null;
    });
    try {
      // provider-graph: ownership-widget-async-callback:_HostRosterIntakeReviewSheetState._restoreExcluded:await:widget.onSetExcluded watch CAT156 -- Existing bounded review signal at _HostRosterIntakeReviewSheetState._restoreExcluded (await:widget.onSetExcluded). The method combines local completion publication with an awaited provider seam or declared Future callback. Its mutated fields/caller contract need focused classification: navigation, form/media/animation feedback may be mechanical, while loaded data, authorization, server pending/error or retry identity need a generated owner. This watch disposition does not certify compliance or declare a confirmed violation; inspect the exact responsibility before its CAT156 migration.
      final review = await widget.onSetExcluded(_review, const []);
      if (mounted && !_scopeInvalidated) setState(() => _review = review);
    } catch (error) {
      if (mounted && !_scopeInvalidated) setState(() => _error = error);
    } finally {
      if (mounted && !_scopeInvalidated) setState(() => _pending = false);
    }
  }

  Future<void> _apply() async {
    if (_pending || !_review.eligibleForApply) return;
    setState(() {
      _pending = true;
      _error = null;
    });
    try {
      // provider-graph: ownership-widget-async-callback:_HostRosterIntakeReviewSheetState._apply:await:widget.onApply watch CAT156 -- Existing bounded review signal at _HostRosterIntakeReviewSheetState._apply (await:widget.onApply). The method combines local completion publication with an awaited provider seam or declared Future callback. Its mutated fields/caller contract need focused classification: navigation, form/media/animation feedback may be mechanical, while loaded data, authorization, server pending/error or retry identity need a generated owner. This watch disposition does not certify compliance or declare a confirmed violation; inspect the exact responsibility before its CAT156 migration.
      final applied = await widget.onApply(_review);
      if (mounted && !_scopeInvalidated) Navigator.of(context).pop(applied);
    } catch (error) {
      if (mounted && !_scopeInvalidated) setState(() => _error = error);
    } finally {
      if (mounted && !_scopeInvalidated) setState(() => _pending = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    if (_scopeInvalidated) return const SizedBox.shrink();
    final unresolved = _review.unresolvedRowIds.length;
    return CatchSheet.standard(
      title: context.l10n.hostsOperationalRosterIntakeReviewTitle,
      subtitle: context.l10n.hostsOperationalRosterIntakeReviewSubtitle(
        fileName: _review.fileName,
      ),
      footer: CatchButton.sheet(
        key: const ValueKey('host-roster-intake-apply'),
        role: CatchButtonEmphasis.commit,
        label: context.l10n.hostsOperationalRosterIntakeApply,
        status: _pending ? CatchButtonStatus.loading : CatchButtonStatus.idle,
        onPressed: _review.eligibleForApply && !_pending ? _apply : null,
      ),
      child: Semantics(
        liveRegion: true,
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            Wrap(
              spacing: CatchSpacing.s2,
              runSpacing: CatchSpacing.s2,
              children: [
                for (final kind in const [
                  'add',
                  'update',
                  'unchanged',
                  'excluded',
                  'needsReview',
                  'identityConflict',
                ])
                  CatchBadge(
                    label: context.l10n.hostsOperationalRosterIntakeCount(
                      kind: _kindLabel(context, kind, null),
                      count: _review.counts[kind] ?? 0,
                    ),
                    tone: {'needsReview', 'identityConflict'}.contains(kind)
                        ? CatchBadgeTone.warning
                        : CatchBadgeTone.neutral,
                  ),
              ],
            ),
            if (unresolved > 0) ...[
              gapH12,
              CatchBanner.error(
                message: context.l10n.hostsOperationalRosterIntakeExceptions(
                  count: unresolved,
                ),
              ),
              gapH8,
              Align(
                alignment: AlignmentDirectional.centerStart,
                child: CatchButton(
                  key: const ValueKey('host-roster-intake-exclude'),
                  label: context.l10n.hostsOperationalRosterIntakeExclude(
                    count: unresolved,
                  ),
                  onPressed: _pending ? null : _excludeUnresolved,
                  variant: CatchButtonVariant.secondary,
                ),
              ),
              gapH8,
              Align(
                alignment: AlignmentDirectional.centerStart,
                child: CatchButton(
                  key: const ValueKey('host-roster-intake-correct'),
                  label:
                      context.l10n.hostsOperationalRosterIntakeCorrectMapping,
                  onPressed: _pending
                      ? null
                      : () => Navigator.of(context).pop(),
                  variant: CatchButtonVariant.quiet,
                ),
              ),
            ],
            if (_review.excludedRowIds.isNotEmpty) ...[
              gapH8,
              Align(
                alignment: AlignmentDirectional.centerStart,
                child: CatchButton(
                  key: const ValueKey('host-roster-intake-restore'),
                  label: context.l10n.hostsOperationalRosterIntakeRestore(
                    count: _review.excludedRowIds.length,
                  ),
                  onPressed: _pending ? null : _restoreExcluded,
                  variant: CatchButtonVariant.quiet,
                ),
              ),
            ],
            if (_error != null) ...[
              gapH12,
              CatchBanner.error(
                message: context.l10n.hostsOperationalRosterIntakeRetry,
              ),
            ],
            gapH12,
            CatchFieldLanes.divided(
              children: [
                for (final row in _review.rows)
                  CatchField.read(
                    copy: catchFieldCopy(context.l10n),
                    title: row.displayName.trim().isEmpty
                        ? context.l10n.hostsOperationalRosterIntakeRow(
                            row: row.sourceRowNumber,
                          )
                        : context.l10n.hostsOperationalRosterIntakeRowIdentity(
                            name: row.displayName,
                            row: row.sourceRowNumber,
                          ),
                    body: _rowBody(context, row),
                    bodyMaxLines: 14,
                  ),
              ],
            ),
          ],
        ),
      ),
    );
  }
}

String _kindLabel(BuildContext context, String kind, String? issue) =>
    switch (kind) {
      'add' => context.l10n.hostsOperationalRosterIntakeKindAdd,
      'update' => context.l10n.hostsOperationalRosterIntakeKindUpdate,
      'unchanged' => context.l10n.hostsOperationalRosterIntakeKindUnchanged,
      'excluded' => context.l10n.hostsOperationalRosterIntakeKindExcluded,
      'needsReview' => context.l10n.hostsOperationalRosterIntakeKindNeedsReview,
      'identityConflict' =>
        context.l10n.hostsOperationalRosterIntakeKindIdentityConflict,
      _ => kind,
    };

String _rowBody(BuildContext context, HostRosterIntakePreviewRow row) => [
  _kindLabel(context, row.kind, row.issueCode),
  if (row.issueCode != null) _issueCopy(context, row.issueCode!),
  if (row.externalReference case final reference?)
    context.l10n.hostsOperationalRosterIntakeReference(reference: reference),
  for (final change in row.fieldChanges)
    context.l10n.hostsOperationalRosterIntakeFieldChange(
      field: _fieldCopy(context, change.field),
      before:
          change.currentValue ??
          context.l10n.hostsOperationalRosterIntakeValueMissing,
      after:
          change.proposedValue ??
          context.l10n.hostsOperationalRosterIntakeValueMissing,
      source: _originCopy(context, change.origin),
    ),
].join('\n');

String _fieldCopy(BuildContext context, String field) => switch (field) {
  'displayName' => hostRosterFieldCopy(context, HostRosterField.displayName),
  'phone' => hostRosterFieldCopy(context, HostRosterField.phone),
  'email' => hostRosterFieldCopy(context, HostRosterField.email),
  'cityMarketId' => hostRosterFieldCopy(context, HostRosterField.city),
  'externalReference' => hostRosterFieldCopy(
    context,
    HostRosterField.externalReference,
  ),
  'arrivalGroup' => hostRosterFieldCopy(context, HostRosterField.arrivalGroup),
  'ticketType' => hostRosterFieldCopy(context, HostRosterField.ticketType),
  'revenueAmountMinor' => hostRosterFieldCopy(
    context,
    HostRosterField.revenueAmount,
  ),
  'revenueCurrency' => hostRosterFieldCopy(
    context,
    HostRosterField.revenueCurrency,
  ),
  'revenueSource' => context.l10n.hostsOperationalRosterIntakeRevenueSource,
  'status' => hostRosterFieldCopy(context, HostRosterField.status),
  _ => field,
};

String _originCopy(BuildContext context, String? origin) => switch (origin) {
  'upload' => context.l10n.hostsOperationalRosterIntakeOriginUpload,
  'hostCorrection' =>
    context.l10n.hostsOperationalRosterIntakeOriginHostCorrection,
  'modelProposal' =>
    context.l10n.hostsOperationalRosterIntakeOriginModelProposal,
  'default' => context.l10n.hostsOperationalRosterIntakeOriginDefault,
  _ => context.l10n.hostsOperationalRosterIntakeOriginExisting,
};

String _issueCopy(BuildContext context, String code) => switch (code) {
  'missing-name' || 'missing-name-column' || 'duplicate-mapped-column' =>
    context.l10n.hostsOperationalRosterIntakeIssueName,
  'missing-stable-identity' ||
  'email-only-identity' ||
  'duplicate-row' ||
  'duplicate-identity' =>
    context.l10n.hostsOperationalRosterIntakeIssueTicketIdentity,
  'invalid-phone' ||
  'shared-phone-identity' ||
  'contact-belongs-to-another-attendee' =>
    context.l10n.hostsOperationalRosterIntakeIssuePhoneIdentity,
  'invalid-email' => context.l10n.hostsOperationalRosterIntakeIssueEmail,
  'invalid-city' => context.l10n.hostsOperationalRosterIntakeIssueCity,
  'invalid-revenue-amount' || 'missing-revenue-currency' =>
    context.l10n.hostsOperationalRosterIntakeIssueRevenue,
  'unknown-status' ||
  'excluded-status' ||
  'cancelled-status-needs-explicit-review' =>
    context.l10n.hostsOperationalRosterIntakeIssueStatus,
  'catch-booking-authority' =>
    context.l10n.hostsOperationalRosterIntakeIssueCatchBooking,
  'claimed-identity' =>
    context.l10n.hostsOperationalRosterIntakeIssueClaimedIdentity,
  _ => context.l10n.hostsOperationalRosterIntakeIssueGeneric,
};
