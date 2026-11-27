import 'package:catch_dating_app/hosts/people/add_person_state.dart';
import 'package:catch_l10n/l10n.dart';
import 'package:catch_platform/l10n/catch_ui_copy.dart';
import 'package:catch_platform/schema_contracts/generated/field_constraints.g.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/material.dart';

/// Add person: the name the team sees, a mobile number or an email (at least
/// one), and an optional private note. Adding someone does not grant
/// permission to message them, and the form says so. [busy] freezes every
/// field while the person is being added; [contactMethodMissing] shows why
/// Add did nothing when both ways to reach them are blank.
class HostAddPersonBody extends StatelessWidget {
  const HostAddPersonBody({
    super.key,
    required this.formKey,
    required this.noteFormKey,
    required this.name,
    required this.phone,
    required this.email,
    required this.note,
    required this.onContactMethodChanged,
    required this.onSubmit,
    this.busy = false,
    this.contactMethodMissing = false,
  });

  final GlobalKey<FormState> formKey;

  /// The note validates on its own: it is checked only when one is typed.
  final GlobalKey<FormState> noteFormKey;
  final TextEditingController name;
  final TextEditingController phone;
  final TextEditingController email;
  final TextEditingController note;

  /// The number or email changed, so a missing-contact notice can go.
  final VoidCallback onContactMethodChanged;

  /// The keyboard's done on the last field adds the person.
  final VoidCallback onSubmit;
  final bool busy;
  final bool contactMethodMissing;

  @override
  Widget build(BuildContext context) {
    final l10n = context.l10n;
    final copy = catchFieldCopy(l10n);
    final states = <WidgetState>{if (busy) WidgetState.disabled};
    return Form(
      key: formKey,
      child: CatchPageBody.screen(
        children: [
          CatchSection(
            key: const ValueKey<String>('host-add-customer-details'),
            title: l10n.hostCustomersContactDetails,
            dividers: CatchSectionPlacement.none,
            children: [
              CatchField.input(
                key: const ValueKey<String>('host-add-customer-name'),
                copy: copy,
                title: l10n.hostCustomersName,
                contract: CatchContractConstraints
                    .createOrganizerContactCallablePayloadDisplayName,
                controller: name,
                textCapitalization: TextCapitalization.words,
                textInputAction: TextInputAction.next,
                autofillHints: const [AutofillHints.name],
                states: states,
                onValidate: (value) => (value ?? '').trim().isEmpty
                    ? l10n.hostCustomersNameRequired
                    : null,
              ),
            ],
          ),
          CatchSection(
            key: const ValueKey<String>('host-add-customer-contact'),
            title: l10n.hostAudienceContactMethod,
            dividers: CatchSectionPlacement.none,
            children: [
              CatchText(
                l10n.hostAudienceContactRequirement,
                variant: CatchTextVariant.bodySmall,
                tone: CatchTextTone.secondary,
              ),
              CatchField.input(
                key: const ValueKey<String>('host-add-customer-phone'),
                copy: copy,
                title: l10n.hostCustomersPhone,
                contract: CatchContractConstraints
                    .createOrganizerContactCallablePayloadPhoneE164,
                controller: phone,
                labelMode: CatchFieldLabelTextMode.optional,
                keyboardType: TextInputType.phone,
                textInputAction: TextInputAction.next,
                autofillHints: const [AutofillHints.telephoneNumber],
                placeholder: '+919876543210',
                states: states,
                onValidate: (value) => hostAddPersonPhoneValid(value ?? '')
                    ? null
                    : l10n.hostCustomersPhoneInvalid,
                onChanged: (_) => onContactMethodChanged(),
              ),
              CatchField.input(
                key: const ValueKey<String>('host-add-customer-email'),
                copy: copy,
                title: l10n.hostCustomersEmail,
                contract: CatchContractConstraints
                    .createOrganizerContactCallablePayloadEmail,
                controller: email,
                labelMode: CatchFieldLabelTextMode.optional,
                keyboardType: TextInputType.emailAddress,
                textInputAction: TextInputAction.next,
                autofillHints: const [AutofillHints.email],
                states: states,
                onValidate: (value) => hostAddPersonEmailValid(value ?? '')
                    ? null
                    : l10n.hostCustomersEmailInvalid,
                onChanged: (_) => onContactMethodChanged(),
              ),
              CatchText(
                l10n.hostAudienceAddedContactPermission,
                variant: CatchTextVariant.bodySmall,
                tone: CatchTextTone.secondary,
              ),
              if (contactMethodMissing)
                CatchNotice.inline(
                  key: const ValueKey<String>(
                    'host-add-customer-contact-error',
                  ),
                  tone: CatchNoticeTone.danger,
                  body: l10n.hostCustomersContactMethodRequired,
                ),
            ],
          ),
          Form(
            key: noteFormKey,
            child: CatchSection(
              key: const ValueKey<String>('host-add-customer-memory'),
              title: l10n.hostCustomersInitialNote,
              dividers: CatchSectionPlacement.none,
              children: [
                CatchText(
                  l10n.hostCustomersInitialNoteHelp,
                  variant: CatchTextVariant.bodySmall,
                  tone: CatchTextTone.secondary,
                ),
                CatchField.input(
                  key: const ValueKey<String>('host-add-customer-note'),
                  copy: copy,
                  title: l10n.hostCustomersInitialNote,
                  contract: CatchContractConstraints
                      .createOrganizerContactCallablePayloadInitialNote,
                  controller: note,
                  labelMode: CatchFieldLabelTextMode.optional,
                  minLines: 3,
                  maxLines: 5,
                  textCapitalization: TextCapitalization.sentences,
                  textInputAction: TextInputAction.done,
                  states: states,
                  onSubmitted: (_) => onSubmit(),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}
