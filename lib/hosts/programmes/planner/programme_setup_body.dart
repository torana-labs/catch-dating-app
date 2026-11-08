import 'package:catch_dating_app/contexts/programmes/domain/program_models.dart';
import 'package:catch_dating_app/hosts/programmes/planner/programme_setup_state.dart';
import 'package:catch_l10n/l10n.dart';
import 'package:catch_platform/l10n/catch_ui_copy.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/widgets.dart';

/// A hotel, pickup point or car vendor form in board order. It keeps
/// nothing: every keystroke goes back through [onChanged].
class HostProgrammeSetupBody extends StatelessWidget {
  const HostProgrammeSetupBody({
    super.key,
    required this.kind,
    required this.draft,
    required this.revision,
    required this.onChanged,
    this.vendors = const [],
  });

  final HostProgrammeSetupKind kind;
  final HostProgrammeSetupDraft draft;

  /// Changes when a saved record is loaded into the form.
  final int revision;
  final ValueChanged<HostProgrammeSetupDraft> onChanged;

  /// The vendors already on the programme (vendor page only).
  final List<ProgramVendorOption> vendors;

  @override
  Widget build(BuildContext context) {
    final l10n = context.l10n;
    final copy = catchFieldCopy(l10n);
    CatchField field(
      String id,
      String title,
      String value,
      HostProgrammeSetupDraft Function(String) update, {
      IconData? icon,
      TextInputType? keyboardType,
      int maxLength = 140,
      String? helper,
    }) => CatchField.input(
      key: ValueKey<String>('host-programme-setup-$id-$revision'),
      copy: copy,
      title: title,
      contractExemption: 'Programme setup field the planner types.',
      initialValue: value,
      leading: icon == null ? null : CatchIcon(icon),
      keyboardType: keyboardType,
      maxLength: maxLength,
      helperText: helper,
      onChanged: (text) => onChanged(update(text)),
    );
    final fields = switch (kind) {
      HostProgrammeSetupKind.hotel => [
        field(
          'name',
          l10n.hostProgrammeSetupHotel,
          draft.name,
          (v) => draft.copyWith(name: v),
          icon: CatchIcons.hotel,
        ),
        field(
          'address',
          l10n.hostProgrammeSetupAddress,
          draft.address,
          (v) => draft.copyWith(address: v),
          maxLength: 240,
        ),
        field(
          'contact',
          l10n.hostProgrammeSetupReception,
          draft.contact,
          (v) => draft.copyWith(contact: v),
          keyboardType: TextInputType.phone,
        ),
      ],
      HostProgrammeSetupKind.pickup => [
        CatchPageTabBar<HostProgrammePickupKind>.segmented(
          selected: draft.pickupKind,
          label: l10n.hostProgrammeSetupKind,
          onChanged: (value) => onChanged(draft.copyWith(pickupKind: value)),
          options: [
            for (final value in HostProgrammePickupKind.values)
              CatchOption<HostProgrammePickupKind>(
                value: value,
                label: switch (value) {
                  HostProgrammePickupKind.airport =>
                    l10n.hostProgrammeSetupAirport,
                  HostProgrammePickupKind.railway =>
                    l10n.hostProgrammeSetupStation,
                  HostProgrammePickupKind.venue => l10n.hostProgrammeSetupVenue,
                  HostProgrammePickupKind.other => l10n.hostProgrammeSetupOther,
                },
              ),
          ],
        ),
        field(
          'name',
          l10n.hostProgrammeSetupWhere,
          draft.name,
          (v) => draft.copyWith(name: v),
          icon: CatchIcons.arrivals,
        ),
        if (draft.pickupKind == HostProgrammePickupKind.airport)
          CatchStack(
            direction: CatchStackDirection.row,
            equal: true,
            children: [
              field(
                'code',
                l10n.hostProgrammeSetupCode,
                draft.code,
                (v) => draft.copyWith(code: v),
                maxLength: 3,
              ),
              field(
                'terminal',
                l10n.hostProgrammeSetupTerminal,
                draft.terminal,
                (v) => draft.copyWith(terminal: v),
                maxLength: 40,
              ),
            ],
          ),
        field(
          'zone',
          l10n.hostProgrammeSetupGreeters,
          draft.meetingZone,
          (v) => draft.copyWith(meetingZone: v),
        ),
        field(
          'instructions',
          l10n.hostProgrammeSetupInstructions,
          draft.instructions,
          (v) => draft.copyWith(instructions: v),
          maxLength: 500,
        ),
      ],
      HostProgrammeSetupKind.vendor => [
        field(
          'name',
          l10n.hostProgrammeSetupVendor,
          draft.name,
          (v) => draft.copyWith(name: v),
          icon: CatchIcons.taxi,
        ),
        CatchStack(
          direction: CatchStackDirection.row,
          equal: true,
          children: [
            field(
              'contact',
              l10n.hostProgrammeSetupContact,
              draft.contact,
              (v) => draft.copyWith(contact: v),
            ),
            field(
              'phone',
              l10n.hostProgrammeSetupPhone,
              draft.phone,
              (v) => draft.copyWith(phone: v),
              keyboardType: TextInputType.phone,
              helper: l10n.hostProgrammeSetupPhoneHelp,
            ),
          ],
        ),
      ],
    };
    return CatchPageBody.screen(
      children: [
        CatchSection(dividers: CatchSectionPlacement.none, children: fields),
        if (kind == HostProgrammeSetupKind.vendor)
          CatchSection(
            title: l10n.hostProgrammeSetupVendors,
            empty: l10n.hostProgrammeSetupVendorsEmpty,
            children: [
              for (final vendor in vendors)
                CatchIndexRow(
                  key: ValueKey<String>(
                    'host-programme-vendor-${vendor.vendorId}',
                  ),
                  icon: CatchIcons.taxi,
                  title: vendor.name,
                  value: vendor.boundToProgram
                      ? l10n.hostProgrammeSetupVendorHere
                      : null,
                  onTap: null,
                ),
            ],
          ),
      ],
    );
  }
}
