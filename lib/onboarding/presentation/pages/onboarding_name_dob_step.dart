import 'package:catch_dating_app/core/schema_contracts/generated/field_constraints.g.dart';
import 'package:catch_dating_app/l10n/l10n.dart';
import 'package:catch_dating_app/onboarding/presentation/onboarding_controller.dart';
import 'package:catch_dating_app/onboarding/presentation/onboarding_form_keys.dart';
import 'package:catch_dating_app/onboarding/presentation/pages/onboarding_name_dob_step_state.dart';
import 'package:catch_dating_app/onboarding/shared/onboarding_step_layout.dart';
import 'package:catch_dating_app/platform/l10n/catch_ui_copy.dart';
import 'package:catch_dating_app/platform/riverpod_ui/mutation_error_util.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

class OnboardingNameDobBody extends ConsumerStatefulWidget {
  const OnboardingNameDobBody({
    super.key,
    this.profileCompletionOnly = false,
    this.eventRequirements,
  });

  final List<String>? eventRequirements;

  final bool profileCompletionOnly;

  @override
  ConsumerState<OnboardingNameDobBody> createState() =>
      _OnboardingNameDobBodyState();
}

class _OnboardingNameDobBodyState extends ConsumerState<OnboardingNameDobBody> {
  final _formKey = GlobalKey<FormState>();
  final _firstNameController = TextEditingController();
  final _lastNameController = TextEditingController();
  final _phoneController = TextEditingController();
  final _dateController = TextEditingController();
  DateTime? _selectedDate;

  @override
  void initState() {
    super.initState();
    _seedDraft(ref.read(onboardingControllerProvider));
  }

  @override
  void dispose() {
    _firstNameController.dispose();
    _lastNameController.dispose();
    _phoneController.dispose();
    _dateController.dispose();
    super.dispose();
  }

  Future<void> _pickDate(OnboardingNameDobDatePickerRequest request) async {
    if (ref.read(OnboardingController.saveProfileMutation).isPending) return;
    final picked = await showCatchDatePicker(
      copy: catchDatePickerCopy(context.l10n),
      context: context,
      initialDate: request.initialDate,
      firstDate: request.firstDate,
      lastDate: request.lastDate,
      title: request.title,
    );
    if (picked != null && mounted) {
      setState(() {
        _selectedDate = picked;
        _dateController.text = OnboardingNameDobState.formatDate(picked);
      });
    }
  }

  void _seedDraft(OnboardingData data) {
    _firstNameController.text = data.firstName;
    _lastNameController.text = data.lastName;
    _selectedDate = data.dateOfBirth;
    _dateController.text = data.dateOfBirth != null
        ? OnboardingNameDobState.formatDate(data.dateOfBirth!)
        : '';

    _phoneController.text = data.phoneNumber;
  }

  OnboardingNameDobState _stateFor(OnboardingData data) {
    final mutation = ref.read(OnboardingController.saveProfileMutation);
    return OnboardingNameDobState.fromDraft(
      l10n: context.l10n,
      profileCompletionOnly: widget.profileCompletionOnly,
      eventRequirements: widget.eventRequirements,
      isSaving: mutation.isPending,
      saveErrorMessage: mutation.hasError
          ? mutationErrorMessage(mutation, l10n: context.l10n)
          : null,
      firstName: _firstNameController.text,
      lastName: _lastNameController.text,
      phoneNumber: _phoneController.text,
      countryCode: data.countryCode,
      dateOfBirth: _selectedDate,
      step: data.step,
      today: DateTime.now(),
    );
  }

  void _submit() {
    if (ref.read(OnboardingController.saveProfileMutation).isPending) return;
    final data = ref.read(onboardingControllerProvider);
    final state = _stateFor(data);
    if (!_formKey.currentState!.validate()) return;
    final intent = state.submitIntent(
      firstName: _firstNameController.text,
      lastName: _lastNameController.text,
      phoneNumber: _phoneController.text,
    );
    if (intent == null) return;

    final controller = ref.read(onboardingControllerProvider.notifier);
    controller.setNameDob(
      firstName: intent.firstName,
      lastName: intent.lastName,
      dateOfBirth: intent.dateOfBirth,
      phoneNumber: intent.phoneNumber,
      countryCode: intent.countryCode,
    );
    final needsCohort =
        widget.eventRequirements == null ||
        widget.eventRequirements!.contains('cohortRestricted');
    if (widget.profileCompletionOnly &&
        needsCohort &&
        (data.gender == null || data.interestedInGenders.isEmpty)) {
      controller.advanceToGenderInterest(
        firstName: intent.firstName,
        lastName: intent.lastName,
        dateOfBirth: intent.dateOfBirth,
        phoneNumber: intent.phoneNumber,
        countryCode: intent.countryCode,
      );
      return;
    }
    // The mutation retains failures for the inline error banner and retry.
    OnboardingController.saveProfileMutation.run(ref, (tx) async {
      await tx
          .get(onboardingControllerProvider.notifier)
          .saveProfile(
            socialIdentityOnly: widget.profileCompletionOnly,
            eventRequirements: widget.eventRequirements,
          );
    }).ignore();
  }

  @override
  Widget build(BuildContext context) {
    ref.watch(OnboardingController.saveProfileMutation);
    final data = ref.watch(onboardingControllerProvider);
    final state = _stateFor(data);

    return OnboardingNameDobStep(
      formKey: _formKey,
      state: state,
      controllers: OnboardingNameDobTextControllers(
        firstName: _firstNameController,
        lastName: _lastNameController,
        phone: _phoneController,
        date: _dateController,
      ),
      callbacks: OnboardingNameDobCallbacks(
        onPickDate: (request) {
          _pickDate(request);
        },
        onContinue: _submit,
      ),
    );
  }
}

class OnboardingNameDobStep extends StatelessWidget {
  const OnboardingNameDobStep({
    super.key,
    required this.formKey,
    required this.state,
    required this.controllers,
    required this.callbacks,
  });

  final GlobalKey<FormState> formKey;
  final OnboardingNameDobState state;
  final OnboardingNameDobTextControllers controllers;
  final OnboardingNameDobCallbacks callbacks;

  @override
  Widget build(BuildContext context) {
    return Form(
      key: formKey,
      child: OnboardingStepLayout(
        footer: CatchButton(
          label: context.l10n.onboardingNameDobPageLabelContinue,
          onPressed: state.isSaving ? null : callbacks.onContinue,
          status: state.isSaving
              ? CatchButtonStatus.loading
              : CatchButtonStatus.idle,
          fullWidth: true,
        ),
        children: [
          CatchSection.fieldRows(
            first: true,
            children: [
              if (!state.profileCompletionOnly)
                CatchField.input(
                  copy: catchFieldCopy(context.l10n),
                  states: {if (state.isSaving) WidgetState.disabled},
                  title: context.l10n.onboardingNameDobPageTitleFirstName,
                  contract:
                      CatchContractConstraints.onboardingDraftDocumentFirstName,
                  controller: controllers.firstName,
                  autofocus: state.shouldAutofocus,
                  icon: CatchIcons.person,
                  textCapitalization: TextCapitalization.words,
                  textInputAction: TextInputAction.next,
                  autofillHints: const [AutofillHints.givenName],
                  helperText: context
                      .l10n
                      .onboardingNameDobPageHelpertextDisplayedOnYourProfile,
                  onValidate: state.validateFirstName,
                ),
              if (!state.profileCompletionOnly)
                CatchField.input(
                  copy: catchFieldCopy(context.l10n),
                  states: {if (state.isSaving) WidgetState.disabled},
                  labelMode: CatchFieldLabelTextMode.optional,
                  title: context.l10n.onboardingNameDobPageTitleLastName,
                  contract:
                      CatchContractConstraints.onboardingDraftDocumentLastName,
                  controller: controllers.lastName,
                  icon: CatchIcons.person,
                  textCapitalization: TextCapitalization.words,
                  textInputAction: TextInputAction.next,
                  autofillHints: const [AutofillHints.familyName],
                  helperText: context
                      .l10n
                      .onboardingNameDobPageHelpertextPrivateWeNeverShow,
                  onValidate: state.validateLastName,
                ),
              CatchField.input(
                copy: catchFieldCopy(context.l10n),
                key: OnboardingFormKeys.dateOfBirth,
                states: {if (state.isSaving) WidgetState.disabled},
                labelMode: state.birthdayRequired
                    ? CatchFieldLabelTextMode.visible
                    : CatchFieldLabelTextMode.optional,
                title: context.l10n.onboardingNameDobPageTitleDateOfBirth,
                contract: CatchContractConstraints
                    .mobileFormStateOnboardingDateOfBirthText,
                controller: controllers.date,
                inputMode: CatchTextInputMode.readOnly,
                onTap: () => callbacks.onPickDate(state.datePickerRequest),
                icon: CatchIcons.date,
                suffixText: state.ageSuffix,
                helperText:
                    context.l10n.onboardingNameDobPageHelpertextWeNeverShowYour,
                onValidate: (_) => state.validateDateOfBirth(),
              ),
              if (!state.profileCompletionOnly)
                CatchField.input(
                  copy: catchFieldCopy(context.l10n),
                  key: OnboardingFormKeys.phone,
                  title: context.l10n.onboardingNameDobPageTitlePhone,
                  contract: CatchContractConstraints
                      .onboardingDraftDocumentPhoneNumber,
                  controller: controllers.phone,
                  inputMode: CatchTextInputMode.inactiveWithoutSelection,
                  keyboardType: TextInputType.phone,
                  textInputAction: TextInputAction.done,
                  autofillHints: const [AutofillHints.telephoneNumberNational],
                  icon: CatchIcons.phone,
                  prefixText: state.phonePrefix,
                  trailing: Icon(CatchIcons.verified),
                  helperText: context
                      .l10n
                      .onboardingNameDobPageHelpertextVerifiedViaOtp,
                  helperTone: CatchFieldSupportRowTone.success,
                  onValidate: state.validatePhoneNumber,
                ),
            ],
          ),
          if (state.saveErrorMessage case final message?)
            CatchSection.plain(child: CatchBanner.error(message: message)),
        ],
      ),
    );
  }
}
