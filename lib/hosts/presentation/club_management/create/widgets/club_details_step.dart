import 'package:catch_dating_app/core/schema_contracts/generated/field_constraints.g.dart';
import 'package:catch_dating_app/hosts/presentation/club_management/create/widgets/create_club_contact_section.dart';
import 'package:catch_dating_app/l10n/l10n.dart';
import 'package:catch_dating_app/platform/l10n/catch_ui_copy.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/material.dart';

class ClubDetailsStep extends StatelessWidget {
  const ClubDetailsStep({
    super.key,
    required this.formKey,
    this.autovalidateMode = AutovalidateMode.disabled,
    required this.descriptionController,
    required this.instagramController,
    required this.phoneController,
    required this.emailController,
  });

  final GlobalKey<FormState> formKey;
  final AutovalidateMode autovalidateMode;
  final TextEditingController descriptionController;
  final TextEditingController instagramController;
  final TextEditingController phoneController;
  final TextEditingController emailController;

  @override
  Widget build(BuildContext context) {
    return Form(
      key: formKey,
      autovalidateMode: autovalidateMode,
      child: SingleChildScrollView(
        padding: CatchInsets.formStepBodyWithBottomActions,
        child: CatchSectionList(
          emptyStateOmitted: true,
          gap: 0,
          children: [
            CatchFieldLanes.divided(
              children: [
                CatchField.input(
                  copy: catchFieldCopy(context.l10n),
                  title: context.l10n.hostsClubDetailsStepTitleDescription,
                  contract: CatchContractConstraints
                      .createClubCallablePayloadDescription,
                  controller: descriptionController,
                  icon: CatchIcons.note,
                  maxLines: 4,
                  textCapitalization: TextCapitalization.sentences,
                  textInputAction: TextInputAction.newline,
                  onValidate: (value) {
                    if (value == null || value.trim().isEmpty) {
                      return context
                          .l10n
                          .hostsClubDetailsStepVisiblecopyPleaseAddADescription;
                    }
                    return null;
                  },
                ),
              ],
            ),
            CreateClubContactSection(
              instagramController: instagramController,
              phoneController: phoneController,
              emailController: emailController,
            ),
          ],
        ),
      ),
    );
  }
}
