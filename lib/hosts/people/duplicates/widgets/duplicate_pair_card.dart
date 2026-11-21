import 'package:catch_dating_app/contexts/audience/domain/crm/host_contact_merge.dart';
import 'package:catch_l10n/l10n.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/widgets.dart';

/// One possible duplicate: both people side by side with their phone,
/// email, source and Catch account, then the evidence the review found and
/// the actions. A pair to review offers Merge and Not the same person; a
/// pair marked different offers Show again.
class HostDuplicatePairCard extends StatelessWidget {
  const HostDuplicatePairCard({
    super.key,
    required this.pair,
    this.onMerge,
    this.onDifferent,
    this.onReopen,
    this.busy = false,
    this.pending = false,
  });

  final HostContactMergeCandidate pair;

  /// Merge the pair; null when the pair is marked different.
  final VoidCallback? onMerge;

  /// Mark the pair as different people; null when it already is.
  final VoidCallback? onDifferent;

  /// Put a pair marked different back to review; null for a pair to review.
  final VoidCallback? onReopen;

  /// A command is running, so no other action starts.
  final bool busy;

  /// The running command is this pair's.
  final bool pending;

  @override
  Widget build(BuildContext context) {
    final l10n = context.l10n;
    final status = pending ? CatchButtonStatus.loading : CatchButtonStatus.idle;
    final marked = onReopen != null;
    return CatchSurface(
      child: CatchStack(
        gap: CatchStackGap.g16,
        children: [
          CatchStack(
            direction: CatchStackDirection.row,
            gap: CatchStackGap.g16,
            align: CatchStackAlign.start,
            equal: true,
            children: [
              // One side of the pair: who they are and what it holds.
              for (final person in pair.contacts)
                CatchStack(
                  gap: CatchStackGap.g4,
                  align: CatchStackAlign.start,
                  children: [
                    CatchAvatar.system(
                      size: CatchAvatarSize.md,
                      name: person.displayName,
                    ),
                    CatchText(
                      person.displayName,
                      variant: CatchTextVariant.titleRow,
                    ),
                    if (person.phoneE164 case final phone?)
                      CatchText(
                        phone,
                        variant: CatchTextVariant.bodySmall,
                        numeric: true,
                      ),
                    if (person.email case final email?)
                      CatchText(email, variant: CatchTextVariant.bodySmall),
                    if (person.phoneE164 == null && person.email == null)
                      CatchText(
                        l10n.hostPeopleDuplicatesNoContact,
                        variant: CatchTextVariant.bodySmall,
                        tone: CatchTextTone.secondary,
                      ),
                    CatchText(
                      hostDuplicateSourceLabel(l10n, person.primarySource),
                      variant: CatchTextVariant.bodyMeta,
                      tone: CatchTextTone.secondary,
                    ),
                    if (person.linkedAccount)
                      CatchBadge(
                        label: l10n.hostPeopleDuplicatesCatchAccount,
                        tone: CatchBadgeTone.brand,
                      ),
                  ],
                ),
            ],
          ),
          CatchStack(
            direction: CatchStackDirection.row,
            gap: CatchStackGap.g6,
            wrap: true,
            children: [
              for (final kind in HostContactMergeMatchKind.values)
                if (pair.matchKinds.contains(kind))
                  CatchChip.tag(
                    label: hostDuplicateEvidenceLabel(l10n, kind),
                    size: CatchChipSize.sm,
                  ),
            ],
          ),
          CatchText(
            l10n.hostPeopleDuplicatesSharedNights(count: pair.sharedEventCount),
            variant: CatchTextVariant.bodySmall,
            tone: CatchTextTone.secondary,
          ),
          if (marked) ...[
            if (!pair.canReopen)
              CatchText(
                l10n.hostPeopleDuplicatesReopenOwnerOnly,
                variant: CatchTextVariant.bodyMeta,
                tone: CatchTextTone.secondary,
              ),
            CatchStack(
              direction: CatchStackDirection.row,
              wrap: true,
              children: [
                CatchButton(
                  key: ValueKey<String>(
                    'host-duplicate-reopen-${pair.candidateId}',
                  ),
                  label: l10n.hostPeopleDuplicatesReopen,
                  variant: CatchButtonVariant.secondary,
                  size: CatchButtonSize.sm,
                  status: status,
                  onPressed: busy || !pair.canReopen ? null : onReopen,
                ),
              ],
            ),
          ] else
            CatchStack(
              direction: CatchStackDirection.row,
              gap: CatchStackGap.g8,
              wrap: true,
              children: [
                CatchButton(
                  key: ValueKey<String>(
                    'host-duplicate-merge-${pair.candidateId}',
                  ),
                  label: l10n.hostPeopleDuplicatesMerge,
                  variant: CatchButtonVariant.secondary,
                  size: CatchButtonSize.sm,
                  status: status,
                  onPressed: busy ? null : onMerge,
                ),
                CatchButton(
                  key: ValueKey<String>(
                    'host-duplicate-different-${pair.candidateId}',
                  ),
                  label: l10n.hostPeopleDuplicatesDifferent,
                  variant: CatchButtonVariant.quiet,
                  size: CatchButtonSize.sm,
                  onPressed: busy ? null : onDifferent,
                ),
              ],
            ),
        ],
      ),
    );
  }
}

/// The evidence a pair rests on, as the review names it.
String hostDuplicateEvidenceLabel(
  AppLocalizations l10n,
  HostContactMergeMatchKind kind,
) => switch (kind) {
  HostContactMergeMatchKind.sameVerifiedUid =>
    l10n.hostPeopleDuplicatesEvidenceAccount,
  HostContactMergeMatchKind.sameVerifiedPhone =>
    l10n.hostPeopleDuplicatesEvidenceVerifiedPhone,
  HostContactMergeMatchKind.sameImportedPhone =>
    l10n.hostPeopleDuplicatesEvidenceImportedPhone,
  HostContactMergeMatchKind.sameEmail => l10n.hostPeopleDuplicatesEvidenceEmail,
};

/// Where a record first came from.
String hostDuplicateSourceLabel(AppLocalizations l10n, String source) =>
    switch (source) {
      'catchBooking' => l10n.hostPeopleDuplicatesSourceCatchBooking,
      'hostImport' => l10n.hostPeopleDuplicatesSourceImport,
      'webOtp' => l10n.hostPeopleDuplicatesSourceWeb,
      'providerSync' => l10n.hostPeopleDuplicatesSourceProvider,
      'hostForm' => l10n.hostPeopleDuplicatesSourceForm,
      _ => l10n.hostPeopleDuplicatesSourceManual,
    };
