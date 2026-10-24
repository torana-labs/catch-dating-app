import 'package:catch_dating_app/core/country_markets.dart';
import 'package:catch_dating_app/core/presentation/catch_ui_copy.dart';
import 'package:catch_dating_app/core/schema_contracts/generated/field_constraints.g.dart';
import 'package:catch_dating_app/event_policies/domain/event_policy.dart';
import 'package:catch_dating_app/hosts/presentation/event_management/create/create_event_form_keys.dart';
import 'package:catch_dating_app/hosts/presentation/event_management/create/create_event_policy_state.dart';
import 'package:catch_dating_app/hosts/presentation/event_management/widgets/event_age_range_field.dart';
import 'package:catch_dating_app/hosts/presentation/validators.dart';
import 'package:catch_dating_app/l10n/l10n.dart';
import 'package:catch_tokens/catch_tokens.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';

enum _PolicyField {
  catchBooking,
  admission,
  inviteCode,
  cohortCaps,
  cohortLimits,
  requestGuidance,
  demandPricing,
  demandAdjustments,
  crossPathsPairs,
  pairCapacity,
}

class EventPolicyStep extends StatelessWidget {
  const EventPolicyStep({
    super.key,
    this.embedded = false,
    required this.formKey,
    this.autovalidateMode = AutovalidateMode.disabled,
    required this.capacityController,
    this.onCapacityChanged,
    required this.priceController,
    required this.currencyCode,
    required this.inviteCodeController,
    required this.dynamicPricingStepController,
    required this.dynamicPricingMaxController,
    required this.minAgeController,
    required this.maxAgeController,
    required this.maxMenController,
    required this.maxWomenController,
    required this.crossPathsPairCapacityController,
    required this.admissionPreset,
    required this.onAdmissionPresetChanged,
    required this.cohortCapsEnabled,
    required this.onCohortCapsEnabledChanged,
    required this.dynamicPricingEnabled,
    required this.onDynamicPricingChanged,
    required this.crossPathsPairInventoryEnabled,
    required this.onCrossPathsPairInventoryChanged,
    required this.cancellationPolicyId,
    required this.onCancellationPolicyChanged,
    this.externalBookingMode = false,
    this.minimumCapacity,
  });

  /// When composed by the shared editor, its parent owns scrolling and Form.
  final bool embedded;
  final GlobalKey<FormState> formKey;
  final AutovalidateMode autovalidateMode;
  final TextEditingController capacityController;
  final ValueChanged<String>? onCapacityChanged;
  final TextEditingController priceController;
  final String currencyCode;
  final TextEditingController inviteCodeController;
  final TextEditingController dynamicPricingStepController;
  final TextEditingController dynamicPricingMaxController;
  final TextEditingController minAgeController;
  final TextEditingController maxAgeController;
  final TextEditingController maxMenController;
  final TextEditingController maxWomenController;
  final TextEditingController crossPathsPairCapacityController;
  final EventAdmissionPreset admissionPreset;
  final ValueChanged<EventAdmissionPreset> onAdmissionPresetChanged;
  final bool cohortCapsEnabled;
  final ValueChanged<bool> onCohortCapsEnabledChanged;
  final bool dynamicPricingEnabled;
  final ValueChanged<bool> onDynamicPricingChanged;
  final bool crossPathsPairInventoryEnabled;
  final ValueChanged<bool> onCrossPathsPairInventoryChanged;
  final EventCancellationPolicyId cancellationPolicyId;
  final ValueChanged<EventCancellationPolicyId> onCancellationPolicyChanged;
  final bool externalBookingMode;
  final int? minimumCapacity;

  @override
  Widget build(BuildContext context) {
    final t = CatchTokens.of(context);
    final dependencies = CatchFormDependencies([
      CatchFormDependency(
        id: _PolicyField.catchBooking,
        when: !externalBookingMode,
      ),
      const CatchFormDependency(
        id: _PolicyField.admission,
        prerequisites: [_PolicyField.catchBooking],
      ),
      CatchFormDependency(
        id: _PolicyField.inviteCode,
        parent: _PolicyField.admission,
        when: admissionPreset == EventAdmissionPreset.inviteOnly,
      ),
      CatchFormDependency(
        id: _PolicyField.cohortCaps,
        parent: _PolicyField.admission,
        when: admissionPreset == EventAdmissionPreset.openCapacity,
      ),
      CatchFormDependency(
        id: _PolicyField.cohortLimits,
        parent: _PolicyField.cohortCaps,
        when: cohortCapsEnabled,
      ),
      CatchFormDependency(
        id: _PolicyField.requestGuidance,
        parent: _PolicyField.admission,
        when: admissionPreset.requiresReview,
      ),
      CatchFormDependency(
        id: _PolicyField.demandPricing,
        parent: _PolicyField.admission,
        when: admissionPreset == EventAdmissionPreset.balancedSingles,
      ),
      CatchFormDependency(
        id: _PolicyField.demandAdjustments,
        parent: _PolicyField.demandPricing,
        when: dynamicPricingEnabled,
      ),
      const CatchFormDependency(
        id: _PolicyField.crossPathsPairs,
        prerequisites: [_PolicyField.catchBooking],
      ),
      CatchFormDependency(
        id: _PolicyField.pairCapacity,
        parent: _PolicyField.crossPathsPairs,
        when: crossPathsPairInventoryEnabled,
      ),
    ]);
    final content = Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      mainAxisSize: MainAxisSize.min,
      children: [
        CatchSectionList(
          emptyStateOmitted: true,
          gap: 0,
          children: [
            CatchSection.plain(
              child: CatchText(
                externalBookingMode
                    ? context.l10n.hostsEventPolicyStepExternalOperationsIntro
                    : context.l10n.hostsEventPolicyStepTextConfigureWhoCanBook,
                variant: CatchTextVariant.supporting,
                color: t.primary,
              ),
            ),
            CatchSection.fieldRows(
              children: [
                CatchField.input(
                  titleMaxLines: 4,
                  copy: catchFieldCopy(context.l10n),
                  key: CreateEventFormKeys.capacity,
                  title: context.l10n.hostsEventPolicyStepTitleMaxAttendees,
                  contract: CatchContractConstraints
                      .createEventCallablePayloadCapacityLimit,
                  controller: capacityController,
                  onChanged: onCapacityChanged,
                  inputHint: '20',
                  icon: CatchIcons.peopleOutline,
                  keyboardType: TextInputType.number,
                  inputFormatters: [FilteringTextInputFormatter.digitsOnly],
                  textInputAction: TextInputAction.next,
                  onValidate: (value) {
                    if (value == null || value.trim().isEmpty) {
                      return context
                          .l10n
                          .hostsEventPolicyStepVisiblecopyRequired;
                    }
                    final capacity = int.tryParse(value.trim());
                    if (capacity == null || capacity < 1) {
                      return context.l10n.hostsEventPolicyStepVisiblecopyMin1;
                    }
                    if (capacity > 1000) {
                      return context
                          .l10n
                          .hostsEventPolicyStepVisiblecopyInvalid;
                    }
                    final requiredCapacity = minimumCapacity;
                    if (requiredCapacity != null &&
                        capacity < requiredCapacity) {
                      return context.l10n.hostsCreateEventCapacityBelowRoster(
                        count: requiredCapacity,
                      );
                    }
                    return null;
                  },
                ),
                if (dependencies.isApplicable(_PolicyField.catchBooking))
                  CatchField.input(
                    titleMaxLines: 4,
                    copy: catchFieldCopy(context.l10n),
                    key: CreateEventFormKeys.price,
                    title: context.l10n
                        .hostsEventPolicyStepTitleBasePriceCurrencycode(
                          currencyCode: currencyCode,
                        ),
                    contract: CatchContractConstraints
                        .createEventCallablePayloadPriceInPaise,
                    controller: priceController,
                    inputHint: '0',
                    icon: CatchIcons.paymentsOutlined,
                    keyboardType: const TextInputType.numberWithOptions(
                      decimal: true,
                    ),
                    inputFormatters: [
                      FilteringTextInputFormatter.allow(
                        RegExp(context.l10n.hostsEventPolicyStepVisiblecopyDD),
                      ),
                    ],
                    textInputAction: TextInputAction.next,
                    onValidate: (value) {
                      if (value == null || value.trim().isEmpty) {
                        return context
                            .l10n
                            .hostsEventPolicyStepVisiblecopyRequired;
                      }
                      final amount = parseMajorCurrencyAmountToMinorUnits(
                        value,
                        currencyCode: currencyCode,
                      );
                      if (amount == null) {
                        return context
                            .l10n
                            .hostsEventPolicyStepVisiblecopyInvalid;
                      }
                      return null;
                    },
                  ),
                if (dependencies.isApplicable(_PolicyField.admission))
                  CatchSection.dependentFieldRows(
                    leading: CatchField<EventAdmissionPreset>.optionCards(
                      copy: catchFieldCopy(context.l10n),
                      title:
                          context.l10n.hostsEventPolicyStepLabelAdmissionFormat,
                      contract: CatchContractConstraints
                          .createEventCallablePayloadEventPolicyAdmissionFormat,
                      contractValueBuilder: (preset) => switch (preset) {
                        EventAdmissionPreset.openCapacity => 'open',
                        EventAdmissionPreset.inviteOnly => 'inviteOnly',
                        EventAdmissionPreset.requestToJoin ||
                        EventAdmissionPreset.requestToJoinMembersExempt =>
                          'manualApproval',
                        EventAdmissionPreset.balancedSingles => 'balancedRatio',
                      },
                      values: EventAdmissionPreset.values,
                      itemTitleBuilder: (preset) => preset.title(context.l10n),
                      itemDescriptionBuilder: (preset) =>
                          preset.description(context.l10n),
                      selected: admissionPreset,
                      onChanged: onAdmissionPresetChanged,
                      icon: CatchIcons.howToRegOutlined,
                    ),
                    children: [
                      if (dependencies.isApplicable(_PolicyField.inviteCode))
                        CatchField.input(
                          titleMaxLines: 4,
                          copy: catchFieldCopy(context.l10n),
                          key: CreateEventFormKeys.inviteCode,
                          title:
                              context.l10n.hostsEventPolicyStepTitleInviteCode,
                          contract: CatchContractConstraints
                              .createEventCallablePayloadPrivateAccessInviteCode,
                          controller: inviteCodeController,
                          inputHint: context
                              .l10n
                              .hostsEventPolicyStepPlaceholderCatchDelhi,
                          helperText: context
                              .l10n
                              .hostsEventPolicyStepTextTheCodeIsStored,
                          icon: CatchIcons.lockOutlineRounded,
                          textInputAction: TextInputAction.next,
                          inputFormatters: [
                            FilteringTextInputFormatter.allow(
                              RegExp(
                                context
                                    .l10n
                                    .hostsEventPolicyStepVisiblecopyAZaZ09,
                              ),
                            ),
                          ],
                          onValidate:
                              admissionPreset == EventAdmissionPreset.inviteOnly
                              ? (value) =>
                                    inviteCodeValidator(value, context.l10n)
                              : null,
                        ),
                      if (dependencies.isApplicable(
                        _PolicyField.cohortCaps,
                      )) ...[
                        CatchField.toggle(
                          emphasis: CatchFieldEmphasis.title,
                          titleMaxLines: 4,
                          copy: catchFieldCopy(context.l10n),
                          key: CreateEventFormKeys.cohortCapsToggle,
                          title:
                              context.l10n.hostsEventPolicyStepTitleCohortCaps,
                          contract: CatchContractConstraints
                              .mobileFormStateEventCohortCapsEnabled,
                          body: context
                              .l10n
                              .hostsEventPolicyStepBodyOptionallyCapStraightMen,
                          bodyMaxLines: 8,
                          value: cohortCapsEnabled,
                          onChanged: onCohortCapsEnabledChanged,
                        ),
                        if (dependencies.isApplicable(
                          _PolicyField.cohortLimits,
                        )) ...[
                          CatchField.input(
                            titleMaxLines: 4,
                            copy: catchFieldCopy(context.l10n),
                            key: CreateEventFormKeys.maxMen,
                            title: context
                                .l10n
                                .hostsEventPolicyStepTitleMaxStraightMen,
                            contract: CatchContractConstraints
                                .createEventCallablePayloadConstraintsMaxMen,
                            labelMode: CatchFieldLabelTextMode.optional,
                            controller: maxMenController,
                            inputHint: context
                                .l10n
                                .hostsEventPolicyStepPlaceholderMaxMen,
                            icon: CatchIcons.maleOutlined,
                            keyboardType: TextInputType.number,
                            inputFormatters: [
                              FilteringTextInputFormatter.digitsOnly,
                            ],
                            textInputAction: TextInputAction.next,
                            onValidate: cohortCapsEnabled
                                ? (value) => positiveOptionalValidator(
                                    value,
                                    context.l10n,
                                  )
                                : null,
                          ),
                          CatchField.input(
                            titleMaxLines: 4,
                            copy: catchFieldCopy(context.l10n),
                            key: CreateEventFormKeys.maxWomen,
                            title: context
                                .l10n
                                .hostsEventPolicyStepTitleMaxStraightWomen,
                            contract: CatchContractConstraints
                                .createEventCallablePayloadConstraintsMaxWomen,
                            labelMode: CatchFieldLabelTextMode.optional,
                            controller: maxWomenController,
                            inputHint: context
                                .l10n
                                .hostsEventPolicyStepPlaceholderMaxWomen,
                            icon: CatchIcons.femaleOutlined,
                            keyboardType: TextInputType.number,
                            inputFormatters: [
                              FilteringTextInputFormatter.digitsOnly,
                            ],
                            textInputAction: TextInputAction.next,
                            onValidate: cohortCapsEnabled
                                ? (value) => positiveOptionalValidator(
                                    value,
                                    context.l10n,
                                  )
                                : null,
                          ),
                        ],
                      ],
                      if (dependencies.isApplicable(
                        _PolicyField.requestGuidance,
                      ))
                        CatchField.read(
                          copy: catchFieldCopy(context.l10n),
                          title: admissionPreset.title(context.l10n),
                          body: context
                              .l10n
                              .hostsEventPolicyStepTextRequestsAppearInHost,
                          bodyMaxLines: 8,
                          icon: CatchIcons.howToRegOutlined,
                        ),
                      if (dependencies.isApplicable(
                        _PolicyField.demandPricing,
                      )) ...[
                        CatchField.toggle(
                          emphasis: CatchFieldEmphasis.title,
                          titleMaxLines: 4,
                          copy: catchFieldCopy(context.l10n),
                          key: CreateEventFormKeys.dynamicPricingToggle,
                          title: context
                              .l10n
                              .hostsEventPolicyStepTitleDemandPricing,
                          contract: CatchContractConstraints
                              .mobileFormStateEventDynamicPricingEnabled,
                          body: context
                              .l10n
                              .hostsEventPolicyStepBodyIncreaseTheStraightMen,
                          bodyMaxLines: 8,
                          value: dynamicPricingEnabled,
                          onChanged: onDynamicPricingChanged,
                        ),
                        if (dependencies.isApplicable(
                          _PolicyField.demandAdjustments,
                        )) ...[
                          CatchField.input(
                            titleMaxLines: 4,
                            copy: catchFieldCopy(context.l10n),
                            key: CreateEventFormKeys.dynamicPricingStep,
                            title: context.l10n
                                .hostsEventPolicyStepTitleStepCurrencycode(
                                  currencyCode: currencyCode,
                                ),
                            contract: CatchContractConstraints
                                .createEventCallablePayloadEventPolicyPricingDemandPricingRulesItemsStepAdjustmentInPaise,
                            controller: dynamicPricingStepController,
                            inputHint: '250',
                            icon: CatchIcons.trendingUpRounded,
                            keyboardType: TextInputType.number,
                            inputFormatters: [
                              FilteringTextInputFormatter.digitsOnly,
                            ],
                            textInputAction: TextInputAction.next,
                            onValidate: dynamicPricingEnabled
                                ? (value) => positiveRequiredValidator(
                                    value,
                                    context.l10n,
                                  )
                                : null,
                          ),
                          CatchField.input(
                            titleMaxLines: 4,
                            copy: catchFieldCopy(context.l10n),
                            key: CreateEventFormKeys.dynamicPricingMax,
                            title: context.l10n
                                .hostsEventPolicyStepTitleMaxCurrencycode(
                                  currencyCode: currencyCode,
                                ),
                            contract: CatchContractConstraints
                                .createEventCallablePayloadEventPolicyPricingDemandPricingRulesItemsMaxAdjustmentInPaise,
                            controller: dynamicPricingMaxController,
                            inputHint: '1500',
                            icon: CatchIcons.priceChangeOutlined,
                            keyboardType: TextInputType.number,
                            inputFormatters: [
                              FilteringTextInputFormatter.digitsOnly,
                            ],
                            textInputAction: TextInputAction.next,
                            onValidate: dynamicPricingEnabled
                                ? (value) => positiveRequiredValidator(
                                    value,
                                    context.l10n,
                                  )
                                : null,
                          ),
                        ],
                      ],
                    ],
                  ),
                if (dependencies.isApplicable(_PolicyField.crossPathsPairs))
                  CatchSection.dependentFieldRows(
                    leading: CatchField.toggle(
                      emphasis: CatchFieldEmphasis.title,
                      titleMaxLines: 4,
                      copy: catchFieldCopy(context.l10n),
                      key: CreateEventFormKeys.crossPathsPairInventoryToggle,
                      title:
                          context.l10n.hostsEventPolicyStepTitleCrossPathsPairs,
                      contract: CatchContractConstraints
                          .createEventCallablePayloadEventPolicyAdmissionCrossPathsPairInventoryEnabled,
                      body:
                          context.l10n.hostsEventPolicyStepBodyCrossPathsPairs,
                      bodyMaxLines: 8,
                      value: crossPathsPairInventoryEnabled,
                      onChanged: onCrossPathsPairInventoryChanged,
                    ),
                    children: [
                      if (dependencies.isApplicable(
                        _PolicyField.pairCapacity,
                      )) ...[
                        CatchField.input(
                          titleMaxLines: 4,
                          copy: catchFieldCopy(context.l10n),
                          key: CreateEventFormKeys.crossPathsPairCapacity,
                          title: context
                              .l10n
                              .hostsEventPolicyStepTitleCrossPathsPairCapacity,
                          contract: CatchContractConstraints
                              .createEventCallablePayloadEventPolicyAdmissionCrossPathsPairInventoryReservedPairCapacity,
                          controller: crossPathsPairCapacityController,
                          inputHint: '2',
                          icon: CatchIcons.peopleOutline,
                          keyboardType: TextInputType.number,
                          inputFormatters: [
                            FilteringTextInputFormatter.digitsOnly,
                          ],
                          onValidate: crossPathsPairInventoryEnabled
                              ? (value) {
                                  final pairCapacity = int.tryParse(
                                    value?.trim() ?? '',
                                  );
                                  final totalCapacity = int.tryParse(
                                    capacityController.text.trim(),
                                  );
                                  if (pairCapacity == null ||
                                      pairCapacity < 1 ||
                                      totalCapacity == null ||
                                      pairCapacity > totalCapacity) {
                                    return context
                                        .l10n
                                        .hostsEventPolicyStepVisiblecopyInvalid;
                                  }
                                  return null;
                                }
                              : null,
                        ),
                      ],
                    ],
                  ),
                EventAgeRangeField(
                  key: CreateEventFormKeys.minAge,
                  minAgeController: minAgeController,
                  maxAgeController: maxAgeController,
                  minimumContract: CatchContractConstraints
                      .createEventCallablePayloadConstraintsMinAge,
                  maximumContract: CatchContractConstraints
                      .createEventCallablePayloadConstraintsMaxAge,
                ),
                ValueListenableBuilder<TextEditingValue>(
                  valueListenable: priceController,
                  builder: (context, price, _) {
                    final priceInMinorUnits =
                        parseMajorCurrencyAmountToMinorUnits(
                          price.text,
                          currencyCode: currencyCode,
                        );
                    if (externalBookingMode || priceInMinorUnits == 0) {
                      return const SizedBox.shrink();
                    }
                    return CatchFieldLanes.single(
                      child: CatchField<EventCancellationPolicyId>.optionCards(
                        copy: catchFieldCopy(context.l10n),
                        title: context
                            .l10n
                            .hostsEventPolicyStepLabelCancellationPolicy,
                        contract: CatchContractConstraints
                            .createEventCallablePayloadEventPolicyCancellationPolicyId,
                        contractValueBuilder: (value) => value.name,
                        values: EventCancellationPolicyId.values
                            .where((value) => value.isApplicable)
                            .toList(growable: false),
                        itemTitleBuilder: (policyId) =>
                            policyFor(policyId).title,
                        itemDescriptionBuilder: (policyId) =>
                            policyFor(policyId).attendeeSummary,
                        selected: cancellationPolicyId.isApplicable
                            ? cancellationPolicyId
                            : EventCancellationPolicyId.standard,
                        onChanged: onCancellationPolicyChanged,
                        icon: CatchIcons.ruleOutlined,
                      ),
                    );
                  },
                ),
              ],
            ),
            ValueListenableBuilder<TextEditingValue>(
              valueListenable: priceController,
              builder: (context, price, _) {
                final priceInMinorUnits = parseMajorCurrencyAmountToMinorUnits(
                  price.text,
                  currencyCode: currencyCode,
                );
                if (externalBookingMode || priceInMinorUnits == 0) {
                  return const SizedBox.shrink();
                }
                return CatchSection.divided(
                  child: CatchText(
                    context.l10n.hostsEventPolicyStepTextHostPayoutIsReleased,
                    variant: CatchTextVariant.supporting,
                    color: t.ink2,
                  ),
                );
              },
            ),
          ],
        ),
      ],
    );
    if (embedded) return content;
    return Form(
      key: formKey,
      autovalidateMode: autovalidateMode,
      child: SingleChildScrollView(
        padding: CatchInsets.formStepBodyWithBottomActions,
        child: content,
      ),
    );
  }
}
