import 'package:catch_dating_app/contexts/account/data/auth_repository.dart';
import 'package:catch_dating_app/contexts/programmes/data/program_operations_outbox.dart';
import 'package:catch_dating_app/contexts/programmes/data/program_work_repository.dart';
import 'package:catch_dating_app/contexts/programmes/domain/program_models.dart';
import 'package:catch_dating_app/programs/presentation/program_operations_controller.dart';
import 'package:catch_l10n/l10n.dart';
import 'package:catch_platform/device/external_share.dart';
import 'package:catch_platform/errors/app_error_message.dart';
import 'package:catch_platform/errors/app_exception.dart';
import 'package:catch_platform/riverpod_ui/catch_async_value_adapter.dart';
import 'package:catch_platform/time/time_formatters.dart';
import 'package:catch_tokens/catch_tokens.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

/// Exports preserved local program operations through an account-fenced share flow.
class ProgramJournalRecoverySheet extends ConsumerStatefulWidget {
  const ProgramJournalRecoverySheet({super.key, required this.accountId});
  final String accountId;

  @override
  ConsumerState<ProgramJournalRecoverySheet> createState() =>
      _ProgramJournalRecoverySheetState();
}

class _ProgramJournalRecoverySheetState
    extends ConsumerState<ProgramJournalRecoverySheet> {
  bool _exporting = false;
  Object? _error;

  bool get _current {
    if (!mounted) return false;
    final uid = catchAsyncStateFromAsyncValue(ref.read(uidProvider));
    return uid.isSettledData && uid.value == widget.accountId;
  }

  Future<void> _export(BuildContext buttonContext) async {
    if (_exporting || !_current) return;
    final box = buttonContext.findRenderObject() as RenderBox?;
    final origin = box == null
        ? null
        : box.localToGlobal(Offset.zero) & box.size;
    final subject = context.l10n.programsRecoveryTitle;
    setState(() {
      _exporting = true;
      _error = null;
    });
    try {
      final json = await ref
          .read(programOperationsOutboxProvider)
          .exportRecovery(widget.accountId);
      if (!_current) return;
      // provider-graph: ownership-widget-async:_ProgramJournalRecoverySheetState._export:await:externalShareControllerProvider.shareJsonFile watch CAT156 -- Existing bounded review signal at _ProgramJournalRecoverySheetState._export (await:externalShareControllerProvider.shareJsonFile). The method combines local completion publication with an awaited provider seam or declared Future callback. Its mutated fields/caller contract need focused classification: navigation, form/media/animation feedback may be mechanical, while loaded data, authorization, server pending/error or retry identity need a generated owner. This watch disposition does not certify compliance or declare a confirmed violation; inspect the exact responsibility before its CAT156 migration.
      await ref
          .read(externalShareControllerProvider)
          .shareJsonFile(
            json: json,
            fileName: 'catch-program-operations-recovery.json',
            subject: subject,
            origin: origin,
          );
    } on Object catch (error) {
      if (_current) setState(() => _error = error);
    } finally {
      if (mounted) setState(() => _exporting = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final uid = catchAsyncStateFromAsyncValue(ref.watch(uidProvider));
    final current = uid.isSettledData && uid.value == widget.accountId;
    return CatchSheet.standard(
      footer: Builder(
        builder: (buttonContext) => CatchButton.sheet(
          role: CatchButtonEmphasis.commit,

          label: context.l10n.programsRecoveryExport,
          status: _exporting
              ? CatchButtonStatus.loading
              : CatchButtonStatus.idle,
          onPressed: current && !_exporting
              ? () => _export(buttonContext)
              : null,
        ),
      ),
      title: context.l10n.programsRecoveryTitle,
      subtitle: context.l10n.programsRecoveryBody,
      child: Column(
        mainAxisSize: MainAxisSize.min,
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          if (!current)
            CatchBanner.error(
              message: appErrorMessage(
                const SignInRequiredException('export saved operations'),
                l10n: context.l10n,
              ),
            ),
          if (current && _error != null)
            CatchBanner.error(
              message: appErrorMessage(_error!, l10n: context.l10n),
            ),
        ],
      ),
    );
  }
}

class ProgramOperationReviewSheet extends ConsumerWidget {
  const ProgramOperationReviewSheet({
    super.key,
    required this.programId,
    required this.accountId,
    required this.pickupPointId,
  });
  final String programId;
  final String accountId;
  final String? pickupPointId;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final uidState = catchAsyncStateFromAsyncValue(ref.watch(uidProvider));
    final accountMatches =
        uidState.isSettledData && uidState.value == accountId;
    final operations = catchAsyncStateFromAsyncValue(
      ref.watch(programOperationsStateProvider(programId)),
    ).value;
    final rosterState = catchAsyncStateFromAsyncValue(
      ref.watch(programArrivalsRosterViewProvider(programId, pickupPointId)),
    );
    final roster = rosterState.isSettledData ? rosterState.value?.value : null;
    final names = {
      for (final row in roster?.rows ?? const <ArrivalsRosterRow>[])
        row.legId: row.guestDisplayName,
    };
    final entries = accountMatches
        ? operations?.outbox.entries
                  .where(
                    (entry) =>
                        entry.status ==
                        ProgramOperationOutboxStatus.needsReview,
                  )
                  .toList() ??
              <ProgramOperationOutboxEntry>[]
        : <ProgramOperationOutboxEntry>[];
    return CatchSheet.standard(
      title: context.l10n.programsOperationsReviewTitle,
      subtitle: context.l10n.programsOperationsReviewBody,
      child: Column(
        mainAxisSize: MainAxisSize.min,
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          if (entries.isEmpty)
            CatchLegacyText(
              context.l10n.programsOperationsReviewEmpty,
              variant: CatchLegacyTextVariant.bodyL,
              color: CatchTokens.of(context).ink,
            ),
          for (final entry in entries) ...[
            CatchLegacySurface.card(
              padding: CatchInsets.contentDense,
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  CatchLegacyText(
                    _operationLabel(context, entry),
                    variant: CatchLegacyTextVariant.supportingStrong,
                  ),
                  CatchLegacyText(
                    AppTimeFormatters.dateTime(entry.createdAt),
                    variant: CatchLegacyTextVariant.supporting,
                  ),
                  CatchLegacyText(
                    (entry.kind == ProgramOperationKind.dispatch
                            ? (entry.payload['legIds']! as List).map(
                                (id) =>
                                    names[id] ??
                                    context
                                        .l10n
                                        .programsOperationsGuestUnavailable,
                              )
                            : [
                                names[entry.payload['legId']] ??
                                    context
                                        .l10n
                                        .programsOperationsGuestUnavailable,
                              ])
                        .join(', '),
                    variant: CatchLegacyTextVariant.bodyL,
                    color: CatchTokens.of(context).ink,
                  ),
                  gapH8,
                  CatchButton(
                    label: context.l10n.programsOperationsDismiss,
                    variant: CatchButtonVariant.secondary,
                    onPressed: operations?.busy != false
                        ? null
                        : () => ref
                              .read(
                                programOperationsControllerProvider(
                                  programId,
                                  accountId,
                                ).notifier,
                              )
                              .dismissReview(entry.clientOperationId),
                  ),
                ],
              ),
            ),
            gapH12,
          ],
          if (operations?.error case final error?)
            CatchBanner.error(
              message: appErrorMessage(error, l10n: context.l10n),
            ),
        ],
      ),
    );
  }
}

String _operationLabel(
  BuildContext context,
  ProgramOperationOutboxEntry entry,
) => entry.kind == ProgramOperationKind.dispatch
    ? context.l10n.programsOperationsDeparture(
        plate: entry.payload['plateDisplay']! as String,
      )
    : switch (entry.payload['action']) {
        'claim' => context.l10n.programsOperationsClaim,
        'unclaim' => context.l10n.programsOperationsUnclaim,
        'markReady' => context.l10n.programsOperationsReady,
        _ => context.l10n.programsOperationsDisrupted,
      };
