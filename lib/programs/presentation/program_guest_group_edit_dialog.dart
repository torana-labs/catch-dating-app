import 'package:catch_dating_app/contexts/programmes/domain/program_models.dart';
import 'package:catch_dating_app/core/schema_contracts/generated/field_constraints.g.dart';
import 'package:catch_dating_app/l10n/l10n.dart';
import 'package:catch_dating_app/platform/l10n/catch_ui_copy.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/material.dart';

class ProgramGuestGroupEditDialog extends StatefulWidget {
  const ProgramGuestGroupEditDialog({
    super.key,
    required this.hotels,
    this.group,
  });

  final List<ProgramHotel> hotels;
  final ProgramGuestGroupRow? group;

  @override
  State<ProgramGuestGroupEditDialog> createState() =>
      _ProgramGuestGroupEditDialogState();
}

class _ProgramGuestGroupEditDialogState
    extends State<ProgramGuestGroupEditDialog> {
  final _labelController = TextEditingController();
  final _dimensionController = TextEditingController();
  String? _hotelId;

  @override
  void initState() {
    super.initState();
    _labelController.text = widget.group?.label ?? '';
    _dimensionController.text = widget.group?.dimension ?? '';
    _hotelId = widget.group?.hotelId;
  }

  @override
  void dispose() {
    _labelController.dispose();
    _dimensionController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) => CatchDialog<void>(
    title: widget.group == null
        ? context.l10n.programsGuestsGroupNew
        : context.l10n.programsGuestsGroupEdit,
    actions: [
      CatchButton(
        label: context.l10n.coreCatchAdaptiveDialogVisiblecopyCancel,
        variant: CatchButtonVariant.secondary,
        onPressed: () => Navigator.of(context).pop(),
      ),
      CatchButton(
        label: context.l10n.programsWorkspaceFunctionSave,
        onPressed: () {
          final label = _labelController.text.trim();
          final dimension = _dimensionController.text.trim();
          if (label.isEmpty || dimension.isEmpty) return;
          Navigator.of(
            context,
          ).pop((label: label, dimension: dimension, hotelId: _hotelId));
        },
      ),
    ],
    child: CatchSection.containedFieldRows(
      children: [
        CatchField.input(
          key: const ValueKey('program-guest-group-label'),
          copy: catchFieldCopy(context.l10n),
          title: context.l10n.programsGuestsGroupLabel,
          controller: _labelController,
          contract: CatchContractConstraints
              .upsertProgramGuestGroupCallablePayloadLabel,
          textCapitalization: TextCapitalization.words,
        ),
        CatchField.input(
          key: const ValueKey('program-guest-group-dimension'),
          copy: catchFieldCopy(context.l10n),
          title: context.l10n.programsGuestsGroupDimension,
          controller: _dimensionController,
          contract: CatchContractConstraints
              .upsertProgramGuestGroupCallablePayloadDimension,
          inputHint: context.l10n.programsGuestsGroupDimensionHint,
        ),
        if (widget.hotels.isNotEmpty || widget.group?.hotelId != null)
          CatchField<String>.choices(
            key: const ValueKey('program-guest-group-hotel'),
            copy: catchFieldCopy(context.l10n),
            title: context.l10n.programsGuestsGroupHotel,
            contract: CatchContractConstraints
                .upsertProgramGuestGroupCallablePayloadHotelId,
            contractValueBuilder: (value) => value,
            values: [
              for (final hotel in widget.hotels) hotel.hotelId,
              if (widget.group?.hotelId case final existingId?)
                if (!widget.hotels.any((hotel) => hotel.hotelId == existingId))
                  existingId,
            ],
            itemLabelBuilder: (hotelId) =>
                widget.hotels
                    .where((hotel) => hotel.hotelId == hotelId)
                    .firstOrNull
                    ?.name ??
                context.l10n.programsGuestsHotelUnavailable,
            selected: {?_hotelId},
            allowEmptySelection: true,
            emptyValueText: context.l10n.programsGuestsGroupNoHotel,
            onSelectionChanged: (selection) =>
                setState(() => _hotelId = selection.firstOrNull),
          )
        else
          CatchText(
            context.l10n.programsGuestsNoHotelsAvailable,
            variant: CatchTextVariant.bodyS,
          ),
      ],
    ),
  );
}
