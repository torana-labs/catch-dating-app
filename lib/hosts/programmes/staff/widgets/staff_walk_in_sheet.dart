import 'package:catch_l10n/l10n.dart';
import 'package:catch_platform/l10n/catch_ui_copy.dart';
import 'package:catch_platform/schema_contracts/generated/field_constraints.g.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/services.dart';
import 'package:flutter/widgets.dart';

/// Adding a walk-in at a function's door: their name, how many came and
/// Add and check in.
class StaffWalkInSheet extends StatelessWidget {
  const StaffWalkInSheet({
    super.key,
    required this.name,
    required this.onNameChanged,
    required this.party,
    required this.onParty,
    required this.busy,
    required this.onAdd,
    required this.onClose,
  });

  final TextEditingController name;
  final ValueChanged<String> onNameChanged;
  final int party;
  final ValueChanged<int> onParty;
  final bool busy;
  final VoidCallback onAdd;
  final VoidCallback onClose;

  @override
  Widget build(BuildContext context) {
    final l10n = context.l10n;
    return CatchSheet.contained(
      key: const ValueKey<String>('staff-walk-in-sheet'),
      title: l10n.hostStaffDoorAddWalkIn,
      footer: CatchStack(
        gap: CatchStackGap.g8,
        children: [
          CatchButton(
            key: const ValueKey<String>('staff-walk-in-add'),
            label: l10n.hostStaffDoorWalkInAdd(count: party),
            fullWidth: true,
            status: busy ? CatchButtonStatus.loading : CatchButtonStatus.idle,
            onPressed: busy || name.text.trim().isEmpty ? null : onAdd,
          ),
          CatchButton(
            label: l10n.hostStaffClose,
            variant: CatchButtonVariant.quiet,
            fullWidth: true,
            onPressed: onClose,
          ),
        ],
      ),
      child: CatchStack(
        children: [
          CatchField.input(
            key: const ValueKey<String>('staff-walk-in-name'),
            copy: catchFieldCopy(l10n),
            title: l10n.hostStaffDoorWalkInName,
            contract: CatchContractConstraints
                .createProgramWalkInCallablePayloadDisplayName,
            controller: name,
            onChanged: onNameChanged,
            textCapitalization: TextCapitalization.words,
          ),
          CatchStack(
            direction: CatchStackDirection.row,
            align: CatchStackAlign.center,
            children: [
              Expanded(
                child: CatchText(
                  l10n.hostStaffDoorWalkInParty,
                  variant: CatchTextVariant.labelAction,
                ),
              ),
              CatchStepper(
                key: const ValueKey<String>('staff-walk-in-party'),
                value: party,
                min: 1,
                max: 20,
                onChanged: (value) => onParty(value.toInt()),
                decreaseSemanticLabel: l10n.hostStaffDoorFewer,
                increaseSemanticLabel: l10n.hostStaffDoorMore,
              ),
            ],
          ),
        ],
      ),
    );
  }
}
