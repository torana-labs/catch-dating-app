import 'package:catch_dating_app/contexts/programmes/domain/program_models.dart';
import 'package:catch_l10n/l10n.dart';
import 'package:catch_platform/l10n/catch_ui_copy.dart';
import 'package:catch_platform/schema_contracts/generated/field_constraints.g.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/material.dart';

/// What the group sheet asks for: save the group with its label, kind and
/// hotel, or delete it.
@immutable
class HostProgrammeGroupDecision {
  const HostProgrammeGroupDecision.save({
    required String this.label,
    required String this.dimension,
    this.hotelId,
  }) : delete = false;

  const HostProgrammeGroupDecision.delete()
    : label = null,
      dimension = null,
      hotelId = null,
      delete = true;

  final String? label;
  final String? dimension;

  /// Null leaves the group without a hotel.
  final String? hotelId;
  final bool delete;
}

/// A guest group, new or existing: its label, what kind of group it is
/// (side, family, friends) and the hotel its guests stay at. Save or Delete
/// returns a [HostProgrammeGroupDecision]; nothing is written here.
class HostProgrammeGroupSheet extends StatefulWidget {
  const HostProgrammeGroupSheet({super.key, required this.hotels, this.group});

  final List<ProgramHotel> hotels;

  /// Null makes a new group.
  final ProgramGuestGroupRow? group;

  @override
  State<HostProgrammeGroupSheet> createState() =>
      _HostProgrammeGroupSheetState();
}

class _HostProgrammeGroupSheetState extends State<HostProgrammeGroupSheet> {
  late String _label = widget.group?.label ?? '';
  late String _dimension = widget.group?.dimension ?? '';
  late String? _hotelId = widget.group?.hotelId;

  @override
  Widget build(BuildContext context) {
    final l10n = context.l10n;
    final copy = catchFieldCopy(l10n);
    final group = widget.group;
    final hotels = [
      for (final hotel in widget.hotels) (hotel.hotelId, hotel.name),
      if (group?.hotelId case final existing?)
        if (!widget.hotels.any((hotel) => hotel.hotelId == existing))
          (existing, l10n.programsGuestsHotelUnavailable),
    ];
    final valid = _label.trim().isNotEmpty && _dimension.trim().isNotEmpty;
    return CatchSheet.standard(
      key: const ValueKey<String>('host-programme-group-sheet'),
      title: group == null
          ? l10n.programsGuestsGroupNew
          : l10n.programsGuestsGroupEdit,
      footer: CatchButton.sheet(
        key: const ValueKey<String>('host-programme-group-save'),
        label: l10n.programsWorkspaceFunctionSave,
        role: CatchButtonEmphasis.commit,
        onPressed: valid
            ? () => Navigator.of(context).pop(
                HostProgrammeGroupDecision.save(
                  label: _label.trim(),
                  dimension: _dimension.trim(),
                  hotelId: _hotelId,
                ),
              )
            : null,
      ),
      child: CatchSection(
        dividers: CatchSectionPlacement.none,
        children: [
          CatchField.input(
            key: const ValueKey<String>('host-programme-group-label'),
            copy: copy,
            title: l10n.programsGuestsGroupLabel,
            initialValue: _label,
            contract: CatchContractConstraints
                .upsertProgramGuestGroupCallablePayloadLabel,
            textCapitalization: TextCapitalization.words,
            onChanged: (value) => setState(() => _label = value),
          ),
          CatchField.input(
            key: const ValueKey<String>('host-programme-group-dimension'),
            copy: copy,
            title: l10n.programsGuestsGroupDimension,
            initialValue: _dimension,
            inputHint: l10n.programsGuestsGroupDimensionHint,
            contract: CatchContractConstraints
                .upsertProgramGuestGroupCallablePayloadDimension,
            onChanged: (value) => setState(() => _dimension = value),
          ),
          CatchStack(
            gap: CatchStackGap.g6,
            children: [
              CatchText(
                l10n.programsGuestsGroupHotel,
                variant: CatchTextVariant.labelAction,
              ),
              if (hotels.isEmpty)
                CatchText(
                  l10n.programsGuestsNoHotelsAvailable,
                  variant: CatchTextVariant.bodySmall,
                  tone: CatchTextTone.secondary,
                )
              else
                CatchStack(
                  direction: CatchStackDirection.row,
                  gap: CatchStackGap.g6,
                  wrap: true,
                  children: [
                    CatchChip.choice(
                      key: const ValueKey<String>(
                        'host-programme-group-no-hotel',
                      ),
                      label: l10n.programsGuestsGroupNoHotel,
                      selected: _hotelId == null,
                      mode: CatchChipMode.single,
                      size: CatchChipSize.sm,
                      onPressed: () => setState(() => _hotelId = null),
                    ),
                    for (final (id, name) in hotels)
                      CatchChip.choice(
                        key: ValueKey<String>('host-programme-group-hotel-$id'),
                        label: name,
                        selected: _hotelId == id,
                        mode: CatchChipMode.single,
                        size: CatchChipSize.sm,
                        onPressed: () => setState(() => _hotelId = id),
                      ),
                  ],
                ),
            ],
          ),
          if (group != null)
            CatchButton(
              key: const ValueKey<String>('host-programme-group-delete'),
              label: l10n.programsGuestsGroupDelete,
              variant: CatchButtonVariant.danger,
              fullWidth: true,
              onPressed: () => Navigator.of(
                context,
              ).pop(const HostProgrammeGroupDecision.delete()),
            ),
        ],
      ),
    );
  }
}
