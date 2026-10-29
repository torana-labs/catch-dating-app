import 'package:catch_dating_app/contexts/programmes/domain/program_models.dart';
import 'package:catch_dating_app/core/schema_contracts/generated/field_constraints.g.dart';
import 'package:catch_dating_app/l10n/l10n.dart';
import 'package:catch_dating_app/platform/l10n/catch_ui_copy.dart';
import 'package:catch_tokens/catch_tokens.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/material.dart';

/// Values submitted by the guest editor; blank optional fields stay absent.
typedef ProgramGuestEditResult = ({
  String displayName,
  String? householdId,
  List<String>? groupIds,
  String? phoneE164,
  String? email,
});

/// Edits one guest's contact details, household, and group selections.
class ProgramGuestEditDialog extends StatefulWidget {
  const ProgramGuestEditDialog({
    super.key,
    required this.households,
    required this.groups,
  });

  final List<ProgramHouseholdRow> households;
  final List<ProgramGuestGroupRow> groups;

  @override
  State<ProgramGuestEditDialog> createState() => _ProgramGuestEditDialogState();
}

class _ProgramGuestEditDialogState extends State<ProgramGuestEditDialog> {
  final _nameController = TextEditingController();
  final _phoneController = TextEditingController();
  final _emailController = TextEditingController();
  String? _householdId;
  final Set<String> _groupIds = {};

  @override
  void dispose() {
    _nameController.dispose();
    _phoneController.dispose();
    _emailController.dispose();
    super.dispose();
  }

  void _submit() {
    final name = _nameController.text.trim();
    if (name.isEmpty) return;
    Navigator.of(context).pop((
      displayName: name,
      householdId: _householdId,
      groupIds: _groupIds.isEmpty ? null : (_groupIds.toList()..sort()),
      phoneE164: _phoneController.text.trim().isEmpty
          ? null
          : _phoneController.text.trim(),
      email: _emailController.text.trim().isEmpty
          ? null
          : _emailController.text.trim(),
    ));
  }

  @override
  Widget build(BuildContext context) => CatchDialog<void>(
    title: context.l10n.programsGuestsAddGuest,
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
          title: context.l10n.programsGuestsNameLabel,
          controller: _nameController,
          contract: CatchContractConstraints
              .upsertProgramGuestCallablePayloadDisplayName,
          textCapitalization: TextCapitalization.words,
        ),
        CatchField.input(
          copy: catchFieldCopy(context.l10n),
          title: context.l10n.programsGuestsPhoneLabel,
          controller: _phoneController,
          contract: CatchContractConstraints
              .upsertProgramGuestCallablePayloadPhoneE164,
          keyboardType: TextInputType.phone,
        ),
        CatchField.input(
          copy: catchFieldCopy(context.l10n),
          title: context.l10n.programsGuestsEmailLabel,
          controller: _emailController,
          contract:
              CatchContractConstraints.upsertProgramGuestCallablePayloadEmail,
          keyboardType: TextInputType.emailAddress,
        ),
        if (widget.households.isNotEmpty) ...[
          gapH8,
          CatchText(
            context.l10n.programsGuestsHouseholdLabel,
            variant: CatchTextVariant.statusLabel,
          ),
          for (final household in widget.households)
            CatchFieldRow.standard(
              body: CatchText(household.label, variant: CatchTextVariant.bodyM),
              trailing: _householdId == household.householdId
                  ? Icon(CatchIcons.check, size: CatchIconSize.md)
                  : null,
              onTap: () => setState(
                () => _householdId = _householdId == household.householdId
                    ? null
                    : household.householdId,
              ),
            ),
        ],
        if (widget.groups.isNotEmpty) ...[
          gapH8,
          CatchText(
            context.l10n.programsGuestsGroupsTitle,
            variant: CatchTextVariant.statusLabel,
          ),
          for (final group in widget.groups)
            CatchFieldRow.standard(
              body: CatchText(
                '${group.label} · ${group.dimension}',
                variant: CatchTextVariant.bodyM,
              ),
              trailing: _groupIds.contains(group.groupId)
                  ? Icon(CatchIcons.check, size: CatchIconSize.md)
                  : null,
              onTap: () => setState(
                () => _groupIds.contains(group.groupId)
                    ? _groupIds.remove(group.groupId)
                    : _groupIds.add(group.groupId),
              ),
            ),
        ],
      ],
    ),
  );
}
