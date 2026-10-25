import 'package:catch_dating_app/core/presentation/catch_ui_copy.dart';
import 'package:catch_dating_app/core/riverpod_ui/mutation_error_util.dart';
import 'package:catch_dating_app/core/schema_contracts/generated/field_constraints.g.dart';
import 'package:catch_dating_app/l10n/l10n.dart';
import 'package:catch_dating_app/onboarding/presentation/onboarding_controller.dart';
import 'package:catch_dating_app/onboarding/presentation/onboarding_form_keys.dart';
import 'package:catch_dating_app/onboarding/presentation/pages/onboarding_gender_interest_step_state.dart';
import 'package:catch_dating_app/onboarding/shared/onboarding_step_layout.dart';
import 'package:catch_dating_app/user_profile/domain/user_profile.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

class OnboardingGenderInterestBody extends ConsumerStatefulWidget {
  const OnboardingGenderInterestBody({super.key, this.eventRequirements});

  final List<String>? eventRequirements;

  @override
  ConsumerState<OnboardingGenderInterestBody> createState() =>
      _OnboardingGenderInterestBodyState();
}

class _OnboardingGenderInterestBodyState
    extends ConsumerState<OnboardingGenderInterestBody> {
  final _formKey = GlobalKey<FormState>();
  Gender? _gender;
  Set<Gender> _interestedIn = {};

  @override
  void initState() {
    super.initState();
    final data = ref.read(onboardingControllerProvider);
    _gender = data.gender;
    _interestedIn = {...data.interestedInGenders};
  }

  void _submit() {
    if (ref.read(OnboardingController.saveProfileMutation).isPending) return;
    final state = _stateFor(isSaving: false, l10n: context.l10n);
    if (!_formKey.currentState!.validate()) {
      return;
    }
    final intent = state.submitIntent();
    if (intent == null) return;
    ref
        .read(onboardingControllerProvider.notifier)
        .setGenderInterest(
          gender: intent.gender,
          interestedInGenders: intent.interestedInGenders,
        );

    // The mutation retains failures for the inline error banner and retry.
    OnboardingController.saveProfileMutation.run(ref, (tx) async {
      await tx
          .get(onboardingControllerProvider.notifier)
          .saveProfile(
            socialIdentityOnly: true,
            eventRequirements: widget.eventRequirements,
          );
    }).ignore();
  }

  OnboardingGenderInterestState _stateFor({
    required bool isSaving,
    required AppLocalizations l10n,
    String? saveErrorMessage,
  }) {
    return OnboardingGenderInterestState.fromDraft(
      gender: _gender,
      interestedIn: _interestedIn,
      l10n: l10n,
      isSaving: isSaving,
      saveErrorMessage: saveErrorMessage,
    );
  }

  @override
  Widget build(BuildContext context) {
    final mutation = ref.watch(OnboardingController.saveProfileMutation);
    final state = _stateFor(
      isSaving: mutation.isPending,
      l10n: context.l10n,
      saveErrorMessage: mutation.hasError
          ? mutationErrorMessage(mutation, l10n: context.l10n)
          : null,
    );

    return OnboardingGenderInterestStep(
      formKey: _formKey,
      state: state,
      callbacks: OnboardingGenderInterestCallbacks(
        onGenderChanged: (next) {
          if (mutation.isPending) return;
          ref
              .read(onboardingControllerProvider.notifier)
              .clearSaveProfileErrorIfIdle();
          setState(() => _gender = next.isEmpty ? null : next.first);
        },
        onInterestedInChanged: (next) {
          if (mutation.isPending) return;
          ref
              .read(onboardingControllerProvider.notifier)
              .clearSaveProfileErrorIfIdle();
          setState(() => _interestedIn = next);
        },
        onContinue: _submit,
      ),
    );
  }
}

class OnboardingGenderInterestStep extends StatelessWidget {
  const OnboardingGenderInterestStep({
    super.key,
    required this.formKey,
    required this.state,
    required this.callbacks,
  });

  final GlobalKey<FormState> formKey;
  final OnboardingGenderInterestState state;
  final OnboardingGenderInterestCallbacks callbacks;

  @override
  Widget build(BuildContext context) {
    return Form(
      key: formKey,
      child: OnboardingStepLayout(
        footer: CatchButton(
          label: context.l10n.onboardingGenderInterestPageLabelContinue,
          onPressed: state.canSubmit ? callbacks.onContinue : null,
          status: (state.isSaving)
              ? CatchButtonStatus.loading
              : CatchButtonStatus.idle,
          fullWidth: true,
        ),
        children: [
          CatchSectionList(
            emptyStateOmitted: true,
            gap: CatchSpacing.s4,
            children: [
              CatchSection.fieldRows(
                first: true,
                children: [
                  FormField<Set<Gender>>(
                    initialValue: state.selectedGender,
                    validator: state.validateGender,
                    builder: (field) => CatchFieldLanes.single(
                      child: CatchField<Gender>.choices(
                        copy: catchFieldCopy(context.l10n),
                        key: OnboardingFormKeys.gender,
                        title:
                            context.l10n.onboardingGenderInterestPageLabelIAmA,
                        contract: CatchContractConstraints
                            .onboardingDraftDocumentGender,
                        contractValueBuilder: (gender) => gender.name,
                        body: _orderedGenderLabels(state.selectedGender),
                        values: Gender.values,
                        itemLabelBuilder: (gender) => gender.label,
                        selected: state.selectedGender,
                        onSelectionChanged: state.requestControlsEnabled
                            ? (selection) {
                                callbacks.onGenderChanged(selection);
                                field.didChange(selection);
                              }
                            : null,
                        states: <WidgetState>{
                          if (!state.requestControlsEnabled)
                            WidgetState.disabled,
                        },
                        disclosureMode: CatchFieldMode.localExpanded,
                        error: field.errorText,
                      ),
                    ),
                  ),
                  FormField<Set<Gender>>(
                    initialValue: state.interestedIn,
                    validator: state.validateInterestedIn,
                    builder: (field) => CatchFieldLanes.single(
                      child: CatchField<Gender>.choices(
                        copy: catchFieldCopy(context.l10n),
                        key: OnboardingFormKeys.interestedIn,
                        title: context
                            .l10n
                            .onboardingGenderInterestPageLabelShowMe,
                        contract: CatchContractConstraints
                            .onboardingDraftDocumentInterestedInGenders,
                        contractValueBuilder: (gender) => gender.name,
                        body: _orderedGenderLabels(state.interestedIn),
                        values: Gender.values,
                        itemLabelBuilder: (gender) => gender.label,
                        selected: state.interestedIn,
                        onSelectionChanged: state.requestControlsEnabled
                            ? (selection) {
                                callbacks.onInterestedInChanged(selection);
                                field.didChange(selection);
                              }
                            : null,
                        mode: CatchChipMode.multiple,
                        states: <WidgetState>{
                          if (!state.requestControlsEnabled)
                            WidgetState.disabled,
                        },
                        disclosureMode: CatchFieldMode.localExpanded,
                        error: field.errorText,
                      ),
                    ),
                  ),
                ],
              ),
              if (state.hasSaveError)
                CatchSection.plain(
                  child: CatchBanner.error(message: state.saveErrorMessage!),
                ),
            ],
          ),
        ],
      ),
    );
  }
}

String? _orderedGenderLabels(Set<Gender> selected) {
  final labels = Gender.values
      .where(selected.contains)
      .map((gender) => gender.label)
      .toList(growable: false);
  return labels.isEmpty ? null : labels.join(', ');
}
