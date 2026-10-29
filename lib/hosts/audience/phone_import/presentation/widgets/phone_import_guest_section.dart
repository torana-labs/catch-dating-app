import 'package:catch_dating_app/contexts/programmes/domain/phone_import_draft.dart';
import 'package:catch_dating_app/l10n/l10n.dart';
import 'package:catch_dating_app/platform/l10n/catch_ui_copy.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/material.dart';

/// One guest's local review fields. Controller commands own all draft changes;
/// text-controller lifetime and focus remain Flutter mechanics here.
class PhoneImportGuestSection extends StatefulWidget {
  const PhoneImportGuestSection({
    super.key,
    required this.entry,
    required this.guestNumber,
    required this.busy,
    required this.sharedPhone,
    required this.onRename,
    required this.onChoosePhone,
    required this.onFamilySideChanged,
    required this.onHouseholdChanged,
    required this.onRemove,
    this.onInternationalPhoneChanged,
  });

  final PhoneImportEntry entry;
  final int guestNumber;
  final bool busy;
  final bool sharedPhone;
  final ValueChanged<String> onRename;
  final ValueChanged<String?> onChoosePhone;
  final ValueChanged<PhoneImportFamilySide> onFamilySideChanged;
  final ValueChanged<String> onHouseholdChanged;
  final VoidCallback onRemove;
  final ValueChanged<String>? onInternationalPhoneChanged;

  @override
  State<PhoneImportGuestSection> createState() =>
      _PhoneImportGuestSectionState();
}

class _PhoneImportGuestSectionState extends State<PhoneImportGuestSection> {
  late final _name = TextEditingController(text: widget.entry.displayName);
  late final _internationalPhone = TextEditingController(
    text:
        widget.entry.reviewedInternationalPhone ??
        widget.entry.phoneForImport ??
        '',
  );
  late final _household = TextEditingController(text: widget.entry.household);

  @override
  void didUpdateWidget(covariant PhoneImportGuestSection oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (_name.text != widget.entry.displayName) {
      _name.text = widget.entry.displayName;
    }
    if (oldWidget.entry.selectedPhone != widget.entry.selectedPhone) {
      _internationalPhone.text =
          widget.entry.reviewedInternationalPhone ??
          widget.entry.phoneForImport ??
          '';
    }
    if (_household.text != widget.entry.household) {
      _household.text = widget.entry.household;
    }
  }

  @override
  void dispose() {
    _name.dispose();
    _household.dispose();
    _internationalPhone.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final entry = widget.entry;
    final manual = entry.source == PhoneImportEntrySource.manualHouseholdMember;
    final copy = catchFieldCopy(context.l10n);
    final states = widget.busy ? {WidgetState.disabled} : <WidgetState>{};
    return CatchSection.containedFieldRows(
      title: context.l10n.phoneImportGuestTitle(number: widget.guestNumber),
      children: [
        CatchField.read(
          copy: copy,
          title: context.l10n.phoneImportSource,
          body: manual
              ? context.l10n.phoneImportManualSource
              : entry.nameEdited
              ? context.l10n.phoneImportEditedSource
              : context.l10n.phoneImportPickerSource,
          bodyMaxLines: 3,
        ),
        CatchField.input(
          key: ValueKey('phone-import-name-${entry.id}'),
          copy: copy,
          title: context.l10n.phoneImportGuestName,
          controller: _name,
          contractExemption:
              'Review input for canonical importProgramManifest.displayName; no write before explicit sharing.',
          textCapitalization: TextCapitalization.words,
          states: states,
          errorText: entry.displayName.trim().isEmpty
              ? context.l10n.phoneImportNameRequired
              : null,
          onChanged: widget.onRename,
        ),
        if (manual)
          CatchField.read(
            copy: copy,
            title: context.l10n.phoneImportPhoneNumber,
            body: context.l10n.phoneImportNoPhoneNeeded,
            bodyMaxLines: 3,
          )
        else if (entry.numbers.isEmpty)
          CatchBanner(
            message: context.l10n.phoneImportNoContactNumber,
            icon: CatchIcons.info,
            tone: CatchBannerTone.warning,
          )
        else
          CatchField<String>.select(
            key: ValueKey('phone-import-phone-${entry.id}'),
            copy: copy,
            title: context.l10n.phoneImportChosenNumber,
            contractExemption:
                'Only user-selected local phone values are reviewed; no ownership or verification is asserted.',
            values: [for (final number in entry.numbers) number.value],
            itemLabelBuilder: (value) {
              final number = entry.numbers.firstWhere(
                (number) => number.value == value,
              );
              return number.label.trim().isEmpty
                  ? value
                  : '${number.label} · $value';
            },
            value: entry.selectedPhone,
            hintText: context.l10n.phoneImportChooseNumber,
            states: states,
            onChanged: widget.busy ? null : widget.onChoosePhone,
            helperText: widget.sharedPhone
                ? context.l10n.phoneImportSharedGuest
                : entry.selectedPhone == null
                ? context.l10n.phoneImportChooseNumberHelp
                : context.l10n.phoneImportReviewNumberHelp,
            helperTone: widget.sharedPhone
                ? CatchFieldSupportRowTone.brand
                : CatchFieldSupportRowTone.neutral,
          ),
        if (!manual &&
            entry.selectedPhone != null &&
            widget.onInternationalPhoneChanged != null)
          CatchField.input(
            key: ValueKey('phone-import-international-${entry.id}'),
            copy: copy,
            title: context.l10n.phoneImportInternationalNumber,
            controller: _internationalPhone,
            keyboardType: TextInputType.phone,
            contractExemption:
                'Explicit country-code review of the chosen phone; no country or ownership is inferred.',
            states: states,
            onChanged: widget.onInternationalPhoneChanged,
            helperText: context.l10n.phoneImportInternationalHelp,
            errorText: entry.phoneForImport == null
                ? context.l10n.phoneImportInternationalRequired
                : null,
          ),
        CatchField<PhoneImportFamilySide>.select(
          key: ValueKey('phone-import-family-${entry.id}'),
          copy: copy,
          title: context.l10n.phoneImportFamilySide,
          contractExemption:
              'Review input for canonical importProgramManifest.groupLabels; no direct cohort write.',
          values: PhoneImportFamilySide.values,
          itemLabelBuilder: (side) => switch (side) {
            PhoneImportFamilySide.unassigned =>
              context.l10n.phoneImportSideNone,
            PhoneImportFamilySide.partnerOne => context.l10n.phoneImportSideOne,
            PhoneImportFamilySide.partnerTwo => context.l10n.phoneImportSideTwo,
            PhoneImportFamilySide.both => context.l10n.phoneImportSideBoth,
          },
          value: entry.familySide,
          states: states,
          onChanged: widget.busy
              ? null
              : (value) {
                  if (value != null) widget.onFamilySideChanged(value);
                },
        ),
        CatchField.input(
          key: ValueKey('phone-import-household-${entry.id}'),
          copy: copy,
          title: context.l10n.phoneImportHousehold,
          inputHint: context.l10n.phoneImportHousehold,
          controller: _household,
          contractExemption:
              'Review input for canonical importProgramManifest.householdLabel; no direct household write.',
          labelMode: CatchFieldLabelTextMode.hiddenOptional,
          helperText:
              '${copy.label.optionalLabel} · ${context.l10n.phoneImportHouseholdHelp}',
          states: states,
          onChanged: widget.onHouseholdChanged,
        ),
        CatchButton(
          key: ValueKey('phone-import-remove-${entry.id}'),
          label: context.l10n.phoneImportRemoveGuest(
            number: widget.guestNumber,
          ),
          semanticsLabel: entry.displayName.trim().isEmpty
              ? context.l10n.phoneImportRemoveGuest(number: widget.guestNumber)
              : context.l10n.phoneImportRemoveNamedGuest(
                  name: entry.displayName,
                ),
          variant: CatchButtonVariant.quiet,
          onPressed: widget.busy ? null : widget.onRemove,
        ),
      ],
    );
  }
}
