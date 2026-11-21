import 'package:catch_dating_app/contexts/audience/domain/crm/host_contact_merge.dart';
import 'package:catch_dating_app/hosts/people/duplicates/duplicates_state.dart';
import 'package:catch_l10n/l10n.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/material.dart';

/// Confirms a merge: which record stays, what moves to it, the phone or
/// email differences the host is confirming, and that it can be undone. It
/// pops the id of the record to keep, or null when the host closes it.
class HostMergeConfirmSheet extends StatefulWidget {
  const HostMergeConfirmSheet({super.key, required this.pair});

  final HostContactMergeCandidate pair;

  @override
  State<HostMergeConfirmSheet> createState() => _HostMergeConfirmSheetState();
}

class _HostMergeConfirmSheetState extends State<HostMergeConfirmSheet> {
  late String _survivorId = hostDefaultSurvivorId(widget.pair);

  @override
  Widget build(BuildContext context) {
    final l10n = context.l10n;
    final contacts = widget.pair.contacts;
    final survivor = contacts.firstWhere(
      (contact) => contact.contactId == _survivorId,
    );
    final source = contacts.firstWhere(
      (contact) => contact.contactId != _survivorId,
    );
    final conflicts = hostMergeConflicts(widget.pair);
    return CatchSheet.standard(
      title: l10n.hostPeopleMergeTitle,
      footer: CatchButton.sheet(
        key: const ValueKey<String>('host-merge-confirm'),
        label: l10n.hostPeopleDuplicatesMerge,
        role: CatchButtonEmphasis.commit,
        onPressed: () => Navigator.of(context).pop(_survivorId),
      ),
      child: CatchStack(
        gap: CatchStackGap.g16,
        children: [
          CatchRail(
            label: l10n.hostPeopleMergeKeep,
            children: [
              for (final contact in contacts)
                CatchChip.choice(
                  key: ValueKey<String>('host-merge-keep-${contact.contactId}'),
                  label: contact.displayName,
                  selected: contact.contactId == _survivorId,
                  mode: CatchChipMode.single,
                  onPressed: () =>
                      setState(() => _survivorId = contact.contactId),
                ),
            ],
          ),
          CatchText(
            l10n.hostPeopleMergeMoves(
              source: source.displayName,
              survivor: survivor.displayName,
            ),
          ),
          if (conflicts.contains(HostMergeConflict.phone))
            CatchText(
              l10n.hostPeopleMergePhoneDiffers,
              tone: CatchTextTone.warning,
            ),
          if (conflicts.contains(HostMergeConflict.email))
            CatchText(
              l10n.hostPeopleMergeEmailDiffers,
              tone: CatchTextTone.warning,
            ),
          CatchText(
            l10n.hostPeopleMergeUndoHint(survivor: survivor.displayName),
            variant: CatchTextVariant.bodySmall,
            tone: CatchTextTone.secondary,
          ),
        ],
      ),
    );
  }
}
