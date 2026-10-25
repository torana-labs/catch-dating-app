part of 'program_workspace_screen.dart';

/// Workspace edit surface: function, station/hotel tiles, pickup-point and
/// hotel drafts+dialogs. Split into a part file so the workspace screen
/// stays under the handwritten-source size budget.
class ProgramFunctionDraft {
  const ProgramFunctionDraft({
    required this.name,
    required this.startsAt,
    required this.endsAt,
    required this.venueName,
    required this.status,
    this.venueNotes,
  });

  final String name;
  final DateTime startsAt;
  final DateTime endsAt;
  final String venueName;
  final String? venueNotes;
  final ProgramFunctionStatus status;
}

class ProgramFunctionEditDialog extends StatefulWidget {
  const ProgramFunctionEditDialog({super.key, this.existing});

  final OrganizerFunctionDetail? existing;

  @override
  State<ProgramFunctionEditDialog> createState() =>
      _ProgramFunctionEditDialogState();
}

class _ProgramFunctionEditDialogState extends State<ProgramFunctionEditDialog> {
  late final TextEditingController _nameController;
  late final TextEditingController _venueController;
  late final TextEditingController _notesController;
  late ProgramFunctionStatus _status;
  DateTime? _startsAt;
  DateTime? _endsAt;

  @override
  void initState() {
    super.initState();
    final existing = widget.existing;
    _nameController = TextEditingController(text: existing?.name ?? '');
    _venueController = TextEditingController(text: existing?.venueName ?? '');
    _notesController = TextEditingController();
    _status = existing?.status ?? ProgramFunctionStatus.scheduled;
    _startsAt = existing?.startsAt;
    _endsAt = existing?.endsAt;
  }

  @override
  void dispose() {
    _nameController.dispose();
    _venueController.dispose();
    _notesController.dispose();
    super.dispose();
  }

  Future<void> _pickDateTime({required bool isStart}) async {
    final base = isStart ? _startsAt : _endsAt;
    final initial = base ?? DateTime.now();
    final date = await showCatchDatePicker(
      copy: catchDatePickerCopy(context.l10n),
      context: context,
      initialDate: initial,
      firstDate: DateTime(initial.year - 2),
      lastDate: DateTime(initial.year + 5),
    );
    if (date == null || !mounted) return;
    final time = await showCatchTimePicker(
      copy: catchTimePickerCopy(context.l10n),
      context: context,
      initialTime: TimeOfDay.fromDateTime(initial),
    );
    if (time == null || !mounted) return;
    setState(() {
      final combined = DateTime(
        date.year,
        date.month,
        date.day,
        time.hour,
        time.minute,
      );
      if (isStart) {
        _startsAt = combined;
        if (_endsAt != null && _endsAt!.isBefore(combined)) {
          _endsAt = combined.add(const Duration(hours: 2));
        }
      } else {
        _endsAt = combined.isBefore(_startsAt ?? combined)
            ? (_startsAt ?? combined).add(const Duration(hours: 2))
            : combined;
      }
    });
  }

  void _submit() {
    final name = _nameController.text.trim();
    final venue = _venueController.text.trim();
    final startsAt = _startsAt;
    final endsAt = _endsAt;
    if (name.isEmpty || venue.isEmpty || startsAt == null || endsAt == null) {
      return;
    }
    Navigator.of(context).pop(
      ProgramFunctionDraft(
        name: name,
        startsAt: startsAt,
        endsAt: endsAt,
        venueName: venue,
        venueNotes: _notesController.text.trim().isEmpty
            ? null
            : _notesController.text.trim(),
        status: _status,
      ),
    );
  }

  @override
  Widget build(BuildContext context) => CatchDialog<void>(
    title: widget.existing == null
        ? context.l10n.programsWorkspaceFunctionNew
        : context.l10n.programsWorkspaceFunctionEdit,
    actions: [
      CatchButton(
        label: context.l10n.coreCatchAdaptiveDialogVisiblecopyCancel,
        variant: CatchButtonVariant.secondary,
        onPressed: () => Navigator.of(context).pop(),
      ),
      CatchButton(
        label: context.l10n.programsWorkspaceFunctionSave,
        onPressed: _submit,
      ),
    ],
    child: CatchSection.containedFieldRows(
      children: [
        CatchField.input(
          copy: catchFieldCopy(context.l10n),
          title: context.l10n.programsWorkspaceFunctionName,
          controller: _nameController,
          contract:
              CatchContractConstraints.upsertProgramFunctionCallablePayloadName,
          textCapitalization: TextCapitalization.words,
        ),
        CatchField.input(
          copy: catchFieldCopy(context.l10n),
          title: context.l10n.programsWorkspaceFunctionVenue,
          controller: _venueController,
          contract: CatchContractConstraints
              .upsertProgramFunctionCallablePayloadVenueName,
          textCapitalization: TextCapitalization.words,
        ),
        CatchFieldRow.standard(
          leading: Icon(CatchIcons.scheduleOutlined),
          body: CatchText(
            _startsAt == null
                ? context.l10n.programsWorkspaceFunctionStarts
                : AppTimeFormatters.dateTime(_startsAt!),
            variant: CatchTextVariant.bodyM,
          ),
          trailing: Icon(CatchIcons.chevronRightRounded),
          onTap: () => _pickDateTime(isStart: true),
        ),
        CatchFieldRow.standard(
          leading: Icon(CatchIcons.scheduleOutlined),
          body: CatchText(
            _endsAt == null
                ? context.l10n.programsWorkspaceFunctionEnds
                : AppTimeFormatters.dateTime(_endsAt!),
            variant: CatchTextVariant.bodyM,
          ),
          trailing: Icon(CatchIcons.chevronRightRounded),
          onTap: () => _pickDateTime(isStart: false),
        ),
        CatchChoiceInput<ProgramFunctionStatus>.segmented(
          options: [
            for (final status in ProgramFunctionStatus.values)
              CatchOption(value: status, label: status.name),
          ],
          selected: _status,
          contract: CatchContractConstraints
              .upsertProgramFunctionCallablePayloadStatus,
          contractValueBuilder: (status) => status.name,
          onChanged: (status) => setState(() => _status = status),
        ),
        CatchField.input(
          copy: catchFieldCopy(context.l10n),
          title: context.l10n.programsWorkspaceFunctionVenueNotes,
          controller: _notesController,
          contract: CatchContractConstraints
              .upsertProgramFunctionCallablePayloadVenueNotes,
          maxLines: 3,
        ),
      ],
    ),
  );
}

class ProgramWorkspaceStationTile extends StatelessWidget {
  const ProgramWorkspaceStationTile({
    super.key,
    required this.station,
    required this.onEdit,
  });

  final ProgramStation station;
  final VoidCallback onEdit;

  @override
  Widget build(BuildContext context) {
    final station = this.station;
    final isActive = station.active ?? true;
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        CatchFieldRow.standard(
          leading: Icon(CatchIcons.flightLanding),
          body: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              CatchText(station.label, variant: CatchTextVariant.sectionTitle),
              const SizedBox(height: CatchSpacing.s1),
              CatchText(
                [
                  station.kind,
                  if (station.iataCode != null && station.iataCode!.isNotEmpty)
                    station.iataCode!,
                  if (station.terminal != null && station.terminal!.isNotEmpty)
                    station.terminal!,
                ].join(' · '),
                variant: CatchTextVariant.bodyS,
              ),
              const SizedBox(height: CatchSpacing.s2),
              Wrap(
                spacing: CatchSpacing.s2,
                runSpacing: CatchSpacing.s2,
                children: [
                  CatchBadge(label: station.kind),
                  if (!isActive)
                    CatchBadge(
                      label: context.l10n.programsWorkspaceLogisticsInactive,
                      tone: CatchBadgeTone.warning,
                    ),
                ],
              ),
              if (station.meetingZone != null &&
                  station.meetingZone!.isNotEmpty) ...[
                gapH8,
                CatchText(
                  station.meetingZone!,
                  variant: CatchTextVariant.bodyS,
                ),
              ],
              if (station.instructions != null &&
                  station.instructions!.isNotEmpty) ...[
                gapH8,
                CatchText(
                  station.instructions!,
                  variant: CatchTextVariant.bodyS,
                ),
              ],
              gapH12,
              Wrap(
                spacing: CatchSpacing.s2,
                children: [
                  CatchButton(
                    label: context.l10n.programsWorkspacePickupEdit,
                    leading: Icon(CatchIcons.editOutlined, size: CatchIcon.sm),
                    variant: CatchButtonVariant.secondary,
                    size: CatchButtonSize.sm,
                    onPressed: onEdit,
                  ),
                ],
              ),
            ],
          ),
        ),
        gapH8,
      ],
    );
  }
}

class ProgramWorkspaceHotelTile extends StatelessWidget {
  const ProgramWorkspaceHotelTile({
    super.key,
    required this.hotel,
    required this.onEdit,
  });

  final ProgramHotel hotel;
  final VoidCallback onEdit;

  @override
  Widget build(BuildContext context) {
    final isActive = hotel.active ?? true;
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        CatchFieldRow.standard(
          leading: Icon(CatchIcons.hotel),
          body: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              CatchText(hotel.name, variant: CatchTextVariant.sectionTitle),
              if (hotel.address != null && hotel.address!.isNotEmpty) ...[
                const SizedBox(height: CatchSpacing.s1),
                CatchText(hotel.address!, variant: CatchTextVariant.bodyS),
              ],
              if (hotel.receptionContact != null &&
                  hotel.receptionContact!.isNotEmpty) ...[
                const SizedBox(height: CatchSpacing.s1),
                CatchText(
                  hotel.receptionContact!,
                  variant: CatchTextVariant.bodyS,
                ),
              ],
              const SizedBox(height: CatchSpacing.s2),
              Wrap(
                spacing: CatchSpacing.s2,
                runSpacing: CatchSpacing.s2,
                children: [
                  if (!isActive)
                    CatchBadge(
                      label: context.l10n.programsWorkspaceLogisticsInactive,
                      tone: CatchBadgeTone.warning,
                    ),
                ],
              ),
              gapH12,
              Wrap(
                spacing: CatchSpacing.s2,
                children: [
                  CatchButton(
                    label: context.l10n.programsWorkspaceHotelEdit,
                    leading: Icon(CatchIcons.editOutlined, size: CatchIcon.sm),
                    variant: CatchButtonVariant.secondary,
                    size: CatchButtonSize.sm,
                    onPressed: onEdit,
                  ),
                ],
              ),
            ],
          ),
        ),
        gapH8,
      ],
    );
  }
}

class ProgramPickupPointDraft {
  const ProgramPickupPointDraft({
    required this.kind,
    required this.label,
    required this.active,
    this.iataCode,
    this.terminal,
    this.meetingZone,
    this.instructions,
  });

  final String kind;
  final String label;
  final bool active;
  final String? iataCode;
  final String? terminal;
  final String? meetingZone;
  final String? instructions;
}

class ProgramPickupPointEditDialog extends StatefulWidget {
  const ProgramPickupPointEditDialog({super.key, this.existing});

  final ProgramStation? existing;

  @override
  State<ProgramPickupPointEditDialog> createState() =>
      _ProgramPickupPointEditDialogState();
}

class _ProgramPickupPointEditDialogState
    extends State<ProgramPickupPointEditDialog> {
  static const _kinds = ['airport', 'railway', 'venue', 'other'];

  late final TextEditingController _labelController;
  late final TextEditingController _iataController;
  late final TextEditingController _terminalController;
  late final TextEditingController _meetingZoneController;
  late final TextEditingController _instructionsController;
  late String _kind;
  late bool _active;

  @override
  void initState() {
    super.initState();
    final existing = widget.existing;
    _labelController = TextEditingController(text: existing?.label ?? '');
    _iataController = TextEditingController(text: existing?.iataCode ?? '');
    _terminalController = TextEditingController(text: existing?.terminal ?? '');
    _meetingZoneController = TextEditingController(
      text: existing?.meetingZone ?? '',
    );
    _instructionsController = TextEditingController(
      text: existing?.instructions ?? '',
    );
    _kind = existing?.kind ?? 'airport';
    _active = existing?.active ?? true;
  }

  @override
  void dispose() {
    _labelController.dispose();
    _iataController.dispose();
    _terminalController.dispose();
    _meetingZoneController.dispose();
    _instructionsController.dispose();
    super.dispose();
  }

  String? _blankToNull(TextEditingController controller) {
    final value = controller.text.trim();
    return value.isEmpty ? null : value;
  }

  void _submit() {
    final label = _labelController.text.trim();
    if (label.isEmpty) return;
    Navigator.of(context).pop(
      ProgramPickupPointDraft(
        kind: _kind,
        label: label,
        active: _active,
        iataCode: _blankToNull(_iataController),
        terminal: _blankToNull(_terminalController),
        meetingZone: _blankToNull(_meetingZoneController),
        instructions: _blankToNull(_instructionsController),
      ),
    );
  }

  @override
  Widget build(BuildContext context) => CatchDialog<void>(
    title: widget.existing == null
        ? context.l10n.programsWorkspacePickupNew
        : context.l10n.programsWorkspacePickupEdit,
    actions: [
      CatchButton(
        label: context.l10n.coreCatchAdaptiveDialogVisiblecopyCancel,
        variant: CatchButtonVariant.secondary,
        onPressed: () => Navigator.of(context).pop(),
      ),
      CatchButton(
        label: context.l10n.programsWorkspaceFunctionSave,
        onPressed: _submit,
      ),
    ],
    child: Flexible(
      child: SingleChildScrollView(
        child: CatchSection.containedFieldRows(
          children: [
            CatchText(
              context.l10n.programsWorkspacePickupKind,
              variant: CatchTextVariant.supportingStrong,
            ),
            gapH8,
            CatchChoiceInput<String>.segmented(
              scrollable: true,
              options: [
                for (final kind in _kinds)
                  CatchOption(value: kind, label: kind),
              ],
              selected: _kind,
              contract: CatchContractConstraints
                  .upsertProgramPickupPointCallablePayloadKind,
              contractValueBuilder: (kind) => kind,
              onChanged: (kind) => setState(() => _kind = kind),
            ),
            CatchField.input(
              key: const ValueKey('program-pickup-label'),
              copy: catchFieldCopy(context.l10n),
              title: context.l10n.programsWorkspacePickupLabel,
              controller: _labelController,
              contract: CatchContractConstraints
                  .upsertProgramPickupPointCallablePayloadLabel,
              textCapitalization: TextCapitalization.words,
            ),
            CatchField.input(
              key: const ValueKey('program-pickup-iata'),
              copy: catchFieldCopy(context.l10n),
              title: context.l10n.programsWorkspacePickupIata,
              controller: _iataController,
              contract: CatchContractConstraints
                  .upsertProgramPickupPointCallablePayloadIataCode,
              textCapitalization: TextCapitalization.characters,
            ),
            CatchField.input(
              key: const ValueKey('program-pickup-terminal'),
              copy: catchFieldCopy(context.l10n),
              title: context.l10n.programsWorkspacePickupTerminal,
              controller: _terminalController,
              contract: CatchContractConstraints
                  .upsertProgramPickupPointCallablePayloadTerminal,
            ),
            CatchField.input(
              key: const ValueKey('program-pickup-meeting-zone'),
              copy: catchFieldCopy(context.l10n),
              title: context.l10n.programsWorkspacePickupMeetingZone,
              controller: _meetingZoneController,
              contract: CatchContractConstraints
                  .upsertProgramPickupPointCallablePayloadMeetingZone,
            ),
            CatchField.input(
              key: const ValueKey('program-pickup-instructions'),
              copy: catchFieldCopy(context.l10n),
              title: context.l10n.programsWorkspacePickupInstructions,
              controller: _instructionsController,
              contract: CatchContractConstraints
                  .upsertProgramPickupPointCallablePayloadInstructions,
              maxLines: 3,
            ),
            CatchField.toggle(
              key: const ValueKey('program-pickup-active'),
              copy: catchFieldCopy(context.l10n),
              title: context.l10n.programsWorkspaceLogisticsActive,
              contract: CatchContractConstraints
                  .upsertProgramPickupPointCallablePayloadActive,
              value: _active,
              onChanged: (value) => setState(() => _active = value),
            ),
          ],
        ),
      ),
    ),
  );
}

class ProgramHotelDraft {
  const ProgramHotelDraft({
    required this.name,
    required this.address,
    required this.active,
    this.receptionContact,
    this.notes,
  });

  final String name;
  final String address;
  final bool active;
  final String? receptionContact;
  final String? notes;
}

class ProgramHotelEditDialog extends StatefulWidget {
  const ProgramHotelEditDialog({super.key, this.existing});

  final ProgramHotel? existing;

  @override
  State<ProgramHotelEditDialog> createState() => _ProgramHotelEditDialogState();
}

class _ProgramHotelEditDialogState extends State<ProgramHotelEditDialog> {
  late final TextEditingController _nameController;
  late final TextEditingController _addressController;
  late final TextEditingController _receptionController;
  late final TextEditingController _notesController;
  late bool _active;

  @override
  void initState() {
    super.initState();
    final existing = widget.existing;
    _nameController = TextEditingController(text: existing?.name ?? '');
    _addressController = TextEditingController(text: existing?.address ?? '');
    _receptionController = TextEditingController(
      text: existing?.receptionContact ?? '',
    );
    _notesController = TextEditingController();
    _active = existing?.active ?? true;
  }

  @override
  void dispose() {
    _nameController.dispose();
    _addressController.dispose();
    _receptionController.dispose();
    _notesController.dispose();
    super.dispose();
  }

  String? _blankToNull(TextEditingController controller) {
    final value = controller.text.trim();
    return value.isEmpty ? null : value;
  }

  void _submit() {
    final name = _nameController.text.trim();
    final address = _addressController.text.trim();
    if (name.isEmpty || address.isEmpty) return;
    Navigator.of(context).pop(
      ProgramHotelDraft(
        name: name,
        address: address,
        active: _active,
        receptionContact: _blankToNull(_receptionController),
        notes: _blankToNull(_notesController),
      ),
    );
  }

  @override
  Widget build(BuildContext context) => CatchDialog<void>(
    title: widget.existing == null
        ? context.l10n.programsWorkspaceHotelNew
        : context.l10n.programsWorkspaceHotelEdit,
    actions: [
      CatchButton(
        label: context.l10n.coreCatchAdaptiveDialogVisiblecopyCancel,
        variant: CatchButtonVariant.secondary,
        onPressed: () => Navigator.of(context).pop(),
      ),
      CatchButton(
        label: context.l10n.programsWorkspaceFunctionSave,
        onPressed: _submit,
      ),
    ],
    child: Flexible(
      child: SingleChildScrollView(
        child: CatchSection.containedFieldRows(
          children: [
            CatchField.input(
              key: const ValueKey('program-hotel-name'),
              copy: catchFieldCopy(context.l10n),
              title: context.l10n.programsWorkspaceHotelName,
              controller: _nameController,
              contract: CatchContractConstraints
                  .upsertProgramHotelCallablePayloadName,
              textCapitalization: TextCapitalization.words,
            ),
            CatchField.input(
              key: const ValueKey('program-hotel-address'),
              copy: catchFieldCopy(context.l10n),
              title: context.l10n.programsWorkspaceHotelAddress,
              controller: _addressController,
              contract: CatchContractConstraints
                  .upsertProgramHotelCallablePayloadAddress,
              maxLines: 2,
            ),
            CatchField.input(
              key: const ValueKey('program-hotel-reception'),
              copy: catchFieldCopy(context.l10n),
              title: context.l10n.programsWorkspaceHotelReception,
              controller: _receptionController,
              contract: CatchContractConstraints
                  .upsertProgramHotelCallablePayloadReceptionContact,
            ),
            CatchField.input(
              key: const ValueKey('program-hotel-notes'),
              copy: catchFieldCopy(context.l10n),
              title: context.l10n.programsWorkspaceHotelNotes,
              controller: _notesController,
              contract: CatchContractConstraints
                  .upsertProgramHotelCallablePayloadNotes,
              maxLines: 3,
            ),
            CatchField.toggle(
              key: const ValueKey('program-hotel-active'),
              copy: catchFieldCopy(context.l10n),
              title: context.l10n.programsWorkspaceLogisticsActive,
              contract: CatchContractConstraints
                  .upsertProgramHotelCallablePayloadActive,
              value: _active,
              onChanged: (value) => setState(() => _active = value),
            ),
          ],
        ),
      ),
    ),
  );
}
