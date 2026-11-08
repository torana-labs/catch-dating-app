import 'package:catch_l10n/l10n.dart';
import 'package:catch_platform/l10n/catch_ui_copy.dart';
import 'package:catch_tokens/catch_tokens.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/services.dart';
import 'package:flutter/widgets.dart';

/// A choice in the dispatch sheet: a vehicle class, a vendor or a party to
/// wait for.
@immutable
class StaffDispatchChoice {
  const StaffDispatchChoice({required this.id, required this.label});

  final String id;
  final String label;
}

/// Sending a car, contained over dispatch with no scrim so the cars behind
/// stay readable: the number plate, the vehicle, the vendor, parties still
/// inside to wait for, who goes where, and Dispatch now.
class StaffDispatchSheet extends StatelessWidget {
  const StaffDispatchSheet({
    super.key,
    required this.vehicle,
    required this.summary,
    required this.plate,
    required this.onPlateChanged,
    required this.classes,
    required this.classId,
    required this.onClass,
    required this.vendors,
    required this.vendorId,
    required this.onVendor,
    required this.holds,
    required this.held,
    required this.onHold,
    required this.canDispatch,
    required this.busy,
    required this.onDispatch,
    required this.onClose,
    this.vendorNote,
    this.error,
  });

  /// The suggested vehicle, for the title.
  final String vehicle;

  /// Vendor, people and destination: "Shree Travels · 6 guests to the Taj".
  final String summary;
  final TextEditingController plate;
  final ValueChanged<String> onPlateChanged;
  final List<StaffDispatchChoice> classes;
  final String classId;
  final ValueChanged<String> onClass;
  final List<StaffDispatchChoice> vendors;
  final String? vendorId;
  final ValueChanged<String?> onVendor;

  /// Shown instead of the vendors while they load or when there are none.
  final String? vendorNote;

  /// Parties bound for the same place, not out yet, the car could wait for.
  final List<StaffDispatchChoice> holds;
  final Set<String> held;
  final ValueChanged<String> onHold;
  final bool canDispatch;
  final bool busy;
  final String? error;
  final VoidCallback onDispatch;
  final VoidCallback onClose;

  @override
  Widget build(BuildContext context) {
    final l10n = context.l10n;
    return CatchSheet.contained(
      key: const ValueKey<String>('staff-dispatch-sheet'),
      scrim: false,
      title: l10n.hostStaffDispatchSheetTitle(vehicle: vehicle),
      footer: CatchStack(
        gap: CatchStackGap.g8,
        children: [
          CatchButton(
            key: const ValueKey<String>('staff-dispatch-now'),
            label: l10n.hostStaffDispatchNow,
            leading: CatchIcon(CatchIcons.taxi, size: CatchIconSize.md),
            fullWidth: true,
            status: busy ? CatchButtonStatus.loading : CatchButtonStatus.idle,
            onPressed: canDispatch && !busy ? onDispatch : null,
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
          if (error case final message?)
            CatchNotice.inline(tone: CatchNoticeTone.danger, body: message),
          CatchFieldLanes.single(
            child: CatchField.input(
              key: const ValueKey<String>('staff-dispatch-plate'),
              copy: catchFieldCopy(l10n),
              title: l10n.hostStaffDispatchPlate,
              placeholder: l10n.hostStaffDispatchPlateHint,
              contractExemption:
                  'The dispatch command validates the plate; no field constraint is generated for it.',
              controller: plate,
              onChanged: onPlateChanged,
              keyboardType: TextInputType.visiblePassword,
              textCapitalization: TextCapitalization.characters,
            ),
          ),
          if (classes.length > 1)
            CatchStack(
              direction: CatchStackDirection.row,
              gap: CatchStackGap.g8,
              wrap: true,
              children: [
                for (final choice in classes)
                  CatchChip.choice(
                    label: choice.label,
                    selected: choice.id == classId,
                    mode: CatchChipMode.single,
                    size: CatchChipSize.sm,
                    onPressed: () => onClass(choice.id),
                  ),
              ],
            ),
          if (vendorNote case final note?)
            CatchText(
              note,
              variant: CatchTextVariant.bodySmall,
              tone: CatchTextTone.secondary,
            )
          else
            CatchStack(
              direction: CatchStackDirection.row,
              gap: CatchStackGap.g8,
              wrap: true,
              children: [
                for (final choice in vendors)
                  CatchChip.choice(
                    label: choice.label,
                    selected: choice.id == vendorId,
                    mode: CatchChipMode.single,
                    size: CatchChipSize.sm,
                    onPressed: () =>
                        onVendor(choice.id == vendorId ? null : choice.id),
                  ),
              ],
            ),
          if (holds.isNotEmpty) ...[
            CatchText(
              l10n.hostStaffDispatchHold,
              variant: CatchTextVariant.labelAction,
            ),
            CatchStack(
              direction: CatchStackDirection.row,
              gap: CatchStackGap.g8,
              wrap: true,
              children: [
                for (final choice in holds)
                  CatchChip.choice(
                    label: choice.label,
                    selected: held.contains(choice.id),
                    mode: CatchChipMode.multiple,
                    size: CatchChipSize.sm,
                    onPressed: () => onHold(choice.id),
                  ),
              ],
            ),
          ],
          CatchText(
            summary,
            variant: CatchTextVariant.bodySmall,
            tone: CatchTextTone.secondary,
          ),
        ],
      ),
    );
  }
}
