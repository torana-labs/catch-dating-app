import 'package:catch_dating_app/l10n/l10n.dart';
import 'package:catch_dating_app/platform/l10n/catch_ui_copy.dart';
import 'package:catch_dating_app/platform/schema_contracts/generated/field_constraints.g.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';

class CreateOrganizerContactSection extends StatelessWidget {
  const CreateOrganizerContactSection({
    super.key,
    required this.instagramController,
    required this.phoneController,
    required this.emailController,
    this.showLabel = true,
    this.first = false,
  });

  final TextEditingController instagramController;
  final TextEditingController phoneController;
  final TextEditingController emailController;
  final bool showLabel;
  final bool first;

  @override
  Widget build(BuildContext context) {
    return CatchSection.fieldRows(
      first: first,
      title: showLabel
          ? context.l10n.hostsCreateOrganizerContactFieldsLabelContact
          : null,
      count: showLabel
          ? context.l10n.coreCatchFormFieldLabelTextOptional
          : null,
      children: [
        CatchField.input(
          copy: catchFieldCopy(context.l10n),
          title: context
              .l10n
              .hostsCreateOrganizerContactFieldsTitleInstagramHandle,
          contract: CatchContractConstraints
              .createOrganizerCallablePayloadInstagramHandle,
          controller: instagramController,
          labelMode: CatchFieldLabelTextMode.optional,
          icon: CatchIcons.handle,
          inputHint: context
              .l10n
              .hostsCreateOrganizerContactFieldsPlaceholderYourorganizer,
          keyboardType: TextInputType.text,
          textInputAction: TextInputAction.next,
        ),
        CatchField.input(
          copy: catchFieldCopy(context.l10n),
          title: context.l10n.hostsCreateOrganizerContactFieldsTitlePhoneNumber,
          contract: CatchContractConstraints
              .createOrganizerCallablePayloadPhoneNumber,
          controller: phoneController,
          labelMode: CatchFieldLabelTextMode.optional,
          icon: CatchIcons.phone,
          inputHint: '98765 43210',
          keyboardType: TextInputType.phone,
          textInputAction: TextInputAction.next,
          inputFormatters: [
            FilteringTextInputFormatter.digitsOnly,
            LengthLimitingTextInputFormatter(15),
          ],
        ),
        CatchField.input(
          copy: catchFieldCopy(context.l10n),
          title: context.l10n.hostsCreateOrganizerContactFieldsTitleEmail,
          contract:
              CatchContractConstraints.createOrganizerCallablePayloadEmail,
          controller: emailController,
          labelMode: CatchFieldLabelTextMode.optional,
          icon: CatchIcons.email,
          inputHint: context
              .l10n
              .hostsCreateOrganizerContactFieldsPlaceholderHelloYourorganizerCom,
          keyboardType: TextInputType.emailAddress,
          textInputAction: TextInputAction.next,
        ),
      ],
    );
  }
}
