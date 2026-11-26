import 'package:catch_dating_app/contexts/programmes/domain/program_models.dart';
import 'package:catch_l10n/l10n.dart';
import 'package:catch_platform/l10n/catch_ui_copy.dart';
import 'package:catch_platform/schema_contracts/generated/field_constraints.g.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/material.dart';

/// One guest added by hand: what `upsertProgramGuest` takes.
@immutable
class HostProgrammeGuestDraft {
  const HostProgrammeGuestDraft({
    required this.displayName,
    this.householdId,
    this.groupIds = const <String>[],
    this.phoneE164,
    this.email,
  });

  final String displayName;
  final String? householdId;
  final List<String> groupIds;
  final String? phoneE164;
  final String? email;
}

/// Add a guest: their name, phone and email, then the household and groups
/// they belong to. Save returns a [HostProgrammeGuestDraft]; nothing is
/// written here.
class HostProgrammeGuestSheet extends StatefulWidget {
  const HostProgrammeGuestSheet({
    super.key,
    required this.households,
    required this.groups,
  });

  final List<ProgramHouseholdRow> households;
  final List<ProgramGuestGroupRow> groups;

  @override
  State<HostProgrammeGuestSheet> createState() =>
      _HostProgrammeGuestSheetState();
}

class _HostProgrammeGuestSheetState extends State<HostProgrammeGuestSheet> {
  String _name = '';
  String _phone = '';
  String _email = '';
  String? _householdId;
  final Set<String> _groupIds = {};

  void _save() {
    final phone = _phone.trim();
    final email = _email.trim();
    Navigator.of(context).pop(
      HostProgrammeGuestDraft(
        displayName: _name.trim(),
        householdId: _householdId,
        groupIds: _groupIds.toList()..sort(),
        phoneE164: phone.isEmpty ? null : phone,
        email: email.isEmpty ? null : email,
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final l10n = context.l10n;
    final copy = catchFieldCopy(l10n);
    return CatchSheet.standard(
      key: const ValueKey<String>('host-programme-guest-sheet'),
      title: l10n.programsGuestsAddGuest,
      footer: CatchButton.sheet(
        key: const ValueKey<String>('host-programme-guest-save'),
        label: l10n.programsWorkspaceFunctionSave,
        role: CatchButtonEmphasis.commit,
        onPressed: _name.trim().isEmpty ? null : _save,
      ),
      child: CatchSection(
        dividers: CatchSectionPlacement.none,
        children: [
          CatchField.input(
            key: const ValueKey<String>('host-programme-guest-name'),
            copy: copy,
            title: l10n.programsGuestsNameLabel,
            contract: CatchContractConstraints
                .upsertProgramGuestCallablePayloadDisplayName,
            textCapitalization: TextCapitalization.words,
            onChanged: (value) => setState(() => _name = value),
          ),
          CatchField.input(
            key: const ValueKey<String>('host-programme-guest-phone'),
            copy: copy,
            title: l10n.programsGuestsPhoneLabel,
            contract: CatchContractConstraints
                .upsertProgramGuestCallablePayloadPhoneE164,
            keyboardType: TextInputType.phone,
            onChanged: (value) => _phone = value,
          ),
          CatchField.input(
            key: const ValueKey<String>('host-programme-guest-email'),
            copy: copy,
            title: l10n.programsGuestsEmailLabel,
            contract:
                CatchContractConstraints.upsertProgramGuestCallablePayloadEmail,
            keyboardType: TextInputType.emailAddress,
            onChanged: (value) => _email = value,
          ),
          if (widget.households.isNotEmpty)
            CatchStack(
              gap: CatchStackGap.g6,
              children: [
                CatchText(
                  l10n.programsGuestsHouseholdLabel,
                  variant: CatchTextVariant.labelAction,
                ),
                CatchStack(
                  direction: CatchStackDirection.row,
                  gap: CatchStackGap.g6,
                  wrap: true,
                  children: [
                    for (final household in widget.households)
                      CatchChip.choice(
                        key: ValueKey<String>(
                          'host-programme-guest-household-'
                          '${household.householdId}',
                        ),
                        label: household.label,
                        selected: _householdId == household.householdId,
                        mode: CatchChipMode.single,
                        size: CatchChipSize.sm,
                        onPressed: () => setState(
                          () => _householdId =
                              _householdId == household.householdId
                              ? null
                              : household.householdId,
                        ),
                      ),
                  ],
                ),
              ],
            ),
          if (widget.groups.isNotEmpty)
            CatchStack(
              gap: CatchStackGap.g6,
              children: [
                CatchText(
                  l10n.programsGuestsGroupsTitle,
                  variant: CatchTextVariant.labelAction,
                ),
                CatchStack(
                  direction: CatchStackDirection.row,
                  gap: CatchStackGap.g6,
                  wrap: true,
                  children: [
                    for (final group in widget.groups)
                      CatchChip.choice(
                        key: ValueKey<String>(
                          'host-programme-guest-group-${group.groupId}',
                        ),
                        label: '${group.label} · ${group.dimension}',
                        selected: _groupIds.contains(group.groupId),
                        mode: CatchChipMode.multiple,
                        size: CatchChipSize.sm,
                        onPressed: () => setState(
                          () => _groupIds.contains(group.groupId)
                              ? _groupIds.remove(group.groupId)
                              : _groupIds.add(group.groupId),
                        ),
                      ),
                  ],
                ),
              ],
            ),
        ],
      ),
    );
  }
}
