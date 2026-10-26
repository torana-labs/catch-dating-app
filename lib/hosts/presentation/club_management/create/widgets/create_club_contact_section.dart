import 'package:catch_dating_app/core/presentation/catch_ui_copy.dart';
import 'package:catch_dating_app/core/schema_contracts/generated/field_constraints.g.dart';
import 'package:catch_dating_app/l10n/l10n.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';

class CreateClubContactSection extends StatelessWidget {
  const CreateClubContactSection({
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
          ? context.l10n.hostsCreateClubContactFieldsLabelContact
          : null,
      count: showLabel
          ? context.l10n.coreCatchFormFieldLabelTextOptional
          : null,
      children: [
        CatchField.input(
          copy: catchFieldCopy(context.l10n),
          title: context.l10n.hostsCreateClubContactFieldsTitleInstagramHandle,
          contract:
              CatchContractConstraints.createClubCallablePayloadInstagramHandle,
          controller: instagramController,
          labelMode: CatchFieldLabelTextMode.optional,
          icon: CatchIcons.handle,
          inputHint:
              context.l10n.hostsCreateClubContactFieldsPlaceholderYourclub,
          keyboardType: TextInputType.text,
          textInputAction: TextInputAction.next,
        ),
        CatchField.input(
          copy: catchFieldCopy(context.l10n),
          title: context.l10n.hostsCreateClubContactFieldsTitlePhoneNumber,
          contract:
              CatchContractConstraints.createClubCallablePayloadPhoneNumber,
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
          title: context.l10n.hostsCreateClubContactFieldsTitleEmail,
          contract: CatchContractConstraints.createClubCallablePayloadEmail,
          controller: emailController,
          labelMode: CatchFieldLabelTextMode.optional,
          icon: CatchIcons.email,
          inputHint: context
              .l10n
              .hostsCreateClubContactFieldsPlaceholderHelloYourclubCom,
          keyboardType: TextInputType.emailAddress,
          textInputAction: TextInputAction.next,
        ),
      ],
    );
  }
}
