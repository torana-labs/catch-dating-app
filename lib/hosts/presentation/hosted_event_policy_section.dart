// ignore_for_file: prefer_initializing_formals

import 'package:catch_dating_app/core/country_markets.dart';
import 'package:catch_dating_app/core/presentation/catch_async_state.dart';
import 'package:catch_dating_app/core/presentation/catch_ui_copy.dart';
import 'package:catch_dating_app/core/schema_contracts/generated/field_constraints.g.dart';
import 'package:catch_dating_app/event_policies/domain/event_policy.dart';
import 'package:catch_dating_app/events/domain/event.dart';
import 'package:catch_dating_app/events/domain/event_formatters.dart';
import 'package:catch_dating_app/events/domain/event_private_access.dart';
import 'package:catch_dating_app/hosts/presentation/event_management/create/create_event_form_keys.dart';
import 'package:catch_dating_app/hosts/presentation/event_management/create/create_event_policy_state.dart';
import 'package:catch_dating_app/hosts/presentation/event_management/widgets/event_age_range_field.dart';
import 'package:catch_dating_app/hosts/presentation/host_event_edit_screen_state.dart';
import 'package:catch_dating_app/hosts/presentation/validators.dart';
import 'package:catch_dating_app/l10n/l10n.dart';
import 'package:catch_tokens/catch_tokens.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';

class HostedEventPolicySection extends StatelessWidget {
  const HostedEventPolicySection.editable({
    super.key,
    required HostEventEditPolicyFieldState state,
    required TextEditingController capacityController,
    required TextEditingController priceController,
    required TextEditingController minAgeController,
    required TextEditingController maxAgeController,
    required TextEditingController maxMenController,
    required TextEditingController maxWomenController,
    required TextEditingController inviteCodeController,
    required TextEditingController dynamicPricingStepController,
    required TextEditingController dynamicPricingMaxController,
    required ValueChanged<EventAdmissionPreset> onAdmissionPresetChanged,
    required ValueChanged<bool> onCohortCapsEnabledChanged,
    required ValueChanged<bool> onDynamicPricingChanged,
    required ValueChanged<EventCancellationPolicyId>
    onCancellationPolicyChanged,
    required CatchAsyncState<EventPrivateAccess?> privateAccessAsync,
  }) : _state = state,
       _event = null,
       _capacityController = capacityController,
       _priceController = priceController,
       _minAgeController = minAgeController,
       _maxAgeController = maxAgeController,
       _maxMenController = maxMenController,
       _maxWomenController = maxWomenController,
       _inviteCodeController = inviteCodeController,
       _dynamicPricingStepController = dynamicPricingStepController,
       _dynamicPricingMaxController = dynamicPricingMaxController,
       _onAdmissionPresetChanged = onAdmissionPresetChanged,
       _onCohortCapsEnabledChanged = onCohortCapsEnabledChanged,
       _onDynamicPricingChanged = onDynamicPricingChanged,
       _onCancellationPolicyChanged = onCancellationPolicyChanged,
       _privateAccessAsync = privateAccessAsync;

  const HostedEventPolicySection.readOnly({super.key, required Event event})
    : _state = null,
      _event = event,
      _capacityController = null,
      _priceController = null,
      _minAgeController = null,
      _maxAgeController = null,
      _maxMenController = null,
      _maxWomenController = null,
      _inviteCodeController = null,
      _dynamicPricingStepController = null,
      _dynamicPricingMaxController = null,
      _onAdmissionPresetChanged = null,
      _onCohortCapsEnabledChanged = null,
      _onDynamicPricingChanged = null,
      _onCancellationPolicyChanged = null,
      _privateAccessAsync = null;

  final HostEventEditPolicyFieldState? _state;
  final Event? _event;
  final TextEditingController? _capacityController;
  final TextEditingController? _priceController;
  final TextEditingController? _minAgeController;
  final TextEditingController? _maxAgeController;
  final TextEditingController? _maxMenController;
  final TextEditingController? _maxWomenController;
  final TextEditingController? _inviteCodeController;
  final TextEditingController? _dynamicPricingStepController;
  final TextEditingController? _dynamicPricingMaxController;
  final ValueChanged<EventAdmissionPreset>? _onAdmissionPresetChanged;
  final ValueChanged<bool>? _onCohortCapsEnabledChanged;
  final ValueChanged<bool>? _onDynamicPricingChanged;
  final ValueChanged<EventCancellationPolicyId>? _onCancellationPolicyChanged;
  final CatchAsyncState<EventPrivateAccess?>? _privateAccessAsync;

  @override
  Widget build(BuildContext context) {
    final readOnlyEvent = _event;
    if (readOnlyEvent != null) {
      final policy = readOnlyEvent.effectiveEventPolicy;
      return CatchSection.fieldRows(
        title: context.l10n.hostsEditHostedEventScreenLabelEventPolicy,
        children: [
          CatchField.read(
            copy: catchFieldCopy(context.l10n),
            title: context.l10n.hostsEditHostedEventScreenTextPolicyLocked,
            body: context
                .l10n
                .hostsEditHostedEventScreenTextCapacityPricingAdmissionAnd,
            bodyMaxLines: 3,
            icon: CatchIcons.lockOutlineRounded,
          ),
          CatchField.read(
            copy: catchFieldCopy(context.l10n),
            title: context.l10n.hostsEditHostedEventScreenLabelCapacity,
            valueText: context.l10n
                .hostsEditHostedEventScreenVisiblecopyCapacitylimit(
                  capacityLimit: readOnlyEvent.capacityLimit,
                ),
            icon: CatchIcons.peopleOutline,
          ),
          CatchField.read(
            copy: catchFieldCopy(context.l10n),
            title: context.l10n.hostsEditHostedEventScreenLabelPrice,
            valueText: readOnlyEvent.isFree
                ? context.l10n.hostsEditHostedEventScreenVisiblecopyFree
                : EventFormatters.priceInPaise(
                    readOnlyEvent.priceInPaise,
                    currencyCode: readOnlyEvent.currency,
                  ),
            icon: CatchIcons.paymentsOutlined,
          ),
          CatchField.read(
            copy: catchFieldCopy(context.l10n),
            title: context.l10n.hostsEditHostedEventScreenLabelAdmission,
            valueText: HostEventEditPolicyFieldState.admissionPresetForPolicy(
              policy,
            ).title(context.l10n),
            icon: CatchIcons.howToRegOutlined,
          ),
          CatchField.read(
            copy: catchFieldCopy(context.l10n),
            title: context.l10n.hostsEditHostedEventScreenLabelCancellation,
            valueText: policy.cancellationPolicy.title,
            icon: CatchIcons.ruleOutlined,
          ),
          if (policy.usesCrossPathsPairInventory)
            CatchField.read(
              copy: catchFieldCopy(context.l10n),
              title: context.l10n.hostsEventPolicyStepTitleCrossPathsPairs,
              valueText:
                  '${policy.admissionPolicy.crossPathsPairInventory.reservedPairCapacity}',
              icon: CatchIcons.peopleOutline,
            ),
        ],
      );
    }

    final state = _state!;
    final capacityController = _capacityController!;
    final priceController = _priceController!;
    final minAgeController = _minAgeController!;
    final maxAgeController = _maxAgeController!;
    final maxMenController = _maxMenController!;
    final maxWomenController = _maxWomenController!;
    final inviteCodeController = _inviteCodeController!;
    final dynamicPricingStepController = _dynamicPricingStepController!;
    final dynamicPricingMaxController = _dynamicPricingMaxController!;
    final onAdmissionPresetChanged = _onAdmissionPresetChanged!;
    final onCohortCapsEnabledChanged = _onCohortCapsEnabledChanged!;
    final onDynamicPricingChanged = _onDynamicPricingChanged!;
    final onCancellationPolicyChanged = _onCancellationPolicyChanged!;
    final privateAccessAsync = _privateAccessAsync!;

    final t = CatchTokens.of(context);
    return CatchSection.fieldRows(
      title: context.l10n.hostsEditHostedEventScreenLabelEventPolicy,
      footer: Padding(
        padding: CatchInsets.formSectionTop,
        child: CatchText(
          context.l10n.hostsEditHostedEventScreenTextEditableUntilTheFirst,
          variant: CatchTextVariant.supporting,
          color: t.ink2,
        ),
      ),
      children: [
        CatchField.input(
          copy: catchFieldCopy(context.l10n),
          key: CreateEventFormKeys.capacity,
          title: context.l10n.hostsEditHostedEventScreenTitleMaxAttendees,
          contract: CatchContractConstraints
              .updateEventCallablePayloadFieldsCapacityLimit,
          controller: capacityController,
          inputHint: '20',
          icon: CatchIcons.peopleOutline,
          keyboardType: TextInputType.number,
          inputFormatters: [FilteringTextInputFormatter.digitsOnly],
          textInputAction: TextInputAction.next,
          onValidate: (value) => positiveRequiredValidator(value, context.l10n),
        ),
        CatchField.input(
          copy: catchFieldCopy(context.l10n),
          key: CreateEventFormKeys.price,
          title: context.l10n
              .hostsEditHostedEventScreenTitleBasePriceCurrencycode(
                currencyCode: state.currencyCode,
              ),
          contract: CatchContractConstraints
              .updateEventCallablePayloadFieldsPriceInPaise,
          controller: priceController,
          inputHint: '0',
          icon: CatchIcons.paymentsOutlined,
          keyboardType: const TextInputType.numberWithOptions(decimal: true),
          inputFormatters: [
            FilteringTextInputFormatter.allow(
              RegExp(context.l10n.hostsEditHostedEventScreenVisiblecopyDD),
            ),
          ],
          textInputAction: TextInputAction.next,
          onValidate: (value) => _moneyRequiredValidator(
            value,
            currencyCode: state.currencyCode,
            l10n: context.l10n,
          ),
        ),
        CatchField<EventAdmissionPreset>.optionCards(
          copy: catchFieldCopy(context.l10n),
          title: context.l10n.hostsEditHostedEventScreenLabelAdmissionFormat,
          contract: CatchContractConstraints
              .updateEventCallablePayloadFieldsEventPolicyAdmissionFormat,
          contractValueBuilder: (preset) => switch (preset) {
            EventAdmissionPreset.openCapacity => 'open',
            EventAdmissionPreset.inviteOnly => 'inviteOnly',
            EventAdmissionPreset.requestToJoin ||
            EventAdmissionPreset.requestToJoinMembersExempt => 'manualApproval',
            EventAdmissionPreset.balancedSingles => 'balancedRatio',
          },
          values: EventAdmissionPreset.values,
          itemTitleBuilder: (preset) => preset.title(context.l10n),
          itemDescriptionBuilder: (preset) => preset.description(context.l10n),
          selected: state.admissionPreset,
          onChanged: onAdmissionPresetChanged,
          icon: CatchIcons.howToRegOutlined,
        ),
        if (state.showInviteCode)
          CatchField.input(
            copy: catchFieldCopy(context.l10n),
            key: CreateEventFormKeys.inviteCode,
            title: context.l10n.hostsEditHostedEventScreenTitleInviteCode,
            contract: CatchContractConstraints
                .updateEventCallablePayloadFieldsPrivateAccessInviteCode,
            controller: inviteCodeController,
            inputHint:
                context.l10n.hostsEditHostedEventScreenPlaceholderCatchDelhi,
            helperText: privateAccessAsync.status == CatchAsyncStatus.loading
                ? context
                      .l10n
                      .hostsEditHostedEventScreenTextLoadingCurrentInviteCode
                : null,
            icon: CatchIcons.lockOutlineRounded,
            textInputAction: TextInputAction.next,
            inputFormatters: [
              FilteringTextInputFormatter.allow(
                RegExp(
                  context.l10n.hostsEditHostedEventScreenVisiblecopyAZaZ09,
                ),
              ),
            ],
            onValidate: (value) => inviteCodeValidator(value, context.l10n),
          ),
        if (state.showCohortCapsToggle) ...[
          CatchField.toggle(
            copy: catchFieldCopy(context.l10n),
            key: CreateEventFormKeys.cohortCapsToggle,
            title: context.l10n.hostsEditHostedEventScreenTitleCohortCaps,
            contract:
                CatchContractConstraints.mobileFormStateEventCohortCapsEnabled,
            body: context
                .l10n
                .hostsEditHostedEventScreenBodyOptionallyCapStraightMen,
            bodyMaxLines: 5,
            value: state.cohortCapsEnabled,
            onChanged: onCohortCapsEnabledChanged,
          ),
          if (state.showCohortCapsFields)
            CatchSection.containedFieldRows(
              children: [
                CatchField.input(
                  copy: catchFieldCopy(context.l10n),
                  key: CreateEventFormKeys.maxMen,
                  title: context
                      .l10n
                      .hostsEditHostedEventScreenTitleMaxStraightMen,
                  contract: CatchContractConstraints
                      .updateEventCallablePayloadFieldsConstraintsMaxMen,
                  labelMode: CatchFieldLabelTextMode.optional,
                  controller: maxMenController,
                  icon: CatchIcons.maleOutlined,
                  keyboardType: TextInputType.number,
                  inputFormatters: [FilteringTextInputFormatter.digitsOnly],
                  textInputAction: TextInputAction.next,
                  onValidate: (value) =>
                      positiveOptionalValidator(value, context.l10n),
                ),
                CatchField.input(
                  copy: catchFieldCopy(context.l10n),
                  key: CreateEventFormKeys.maxWomen,
                  title: context
                      .l10n
                      .hostsEditHostedEventScreenTitleMaxStraightWomen,
                  contract: CatchContractConstraints
                      .updateEventCallablePayloadFieldsConstraintsMaxWomen,
                  labelMode: CatchFieldLabelTextMode.optional,
                  controller: maxWomenController,
                  icon: CatchIcons.femaleOutlined,
                  keyboardType: TextInputType.number,
                  inputFormatters: [FilteringTextInputFormatter.digitsOnly],
                  textInputAction: TextInputAction.next,
                  onValidate: (value) =>
                      positiveOptionalValidator(value, context.l10n),
                ),
              ],
            ),
        ],
        if (state.showRequestToJoinCopy)
          CatchField.read(
            copy: catchFieldCopy(context.l10n),
            title: state.admissionPreset.title(context.l10n),
            body:
                context.l10n.hostsEditHostedEventScreenTextRequestsAppearInHost,
            bodyMaxLines: 3,
            icon: CatchIcons.howToRegOutlined,
          ),
        if (state.showDynamicPricingToggle) ...[
          CatchField.toggle(
            copy: catchFieldCopy(context.l10n),
            key: CreateEventFormKeys.dynamicPricingToggle,
            title: context.l10n.hostsEditHostedEventScreenTitleDemandPricing,
            contract: CatchContractConstraints
                .mobileFormStateEventDynamicPricingEnabled,
            body:
                context.l10n.hostsEditHostedEventScreenBodyIncreasePriceForThe,
            value: state.dynamicPricingEnabled,
            onChanged: onDynamicPricingChanged,
          ),
          if (state.showDynamicPricingFields)
            CatchSection.containedFieldRows(
              children: [
                CatchField.input(
                  copy: catchFieldCopy(context.l10n),
                  key: CreateEventFormKeys.dynamicPricingStep,
                  title: context.l10n
                      .hostsEditHostedEventScreenTitleStepCurrencycode(
                        currencyCode: state.currencyCode,
                      ),
                  contract: CatchContractConstraints
                      .updateEventCallablePayloadFieldsEventPolicyPricingDemandPricingRulesItemsStepAdjustmentInPaise,
                  controller: dynamicPricingStepController,
                  inputHint: '250',
                  icon: CatchIcons.trendingUpRounded,
                  keyboardType: TextInputType.number,
                  inputFormatters: [FilteringTextInputFormatter.digitsOnly],
                  textInputAction: TextInputAction.next,
                  onValidate: (value) =>
                      positiveRequiredValidator(value, context.l10n),
                ),
                CatchField.input(
                  copy: catchFieldCopy(context.l10n),
                  key: CreateEventFormKeys.dynamicPricingMax,
                  title: context.l10n
                      .hostsEditHostedEventScreenTitleMaxCurrencycode(
                        currencyCode: state.currencyCode,
                      ),
                  contract: CatchContractConstraints
                      .updateEventCallablePayloadFieldsEventPolicyPricingDemandPricingRulesItemsMaxAdjustmentInPaise,
                  controller: dynamicPricingMaxController,
                  inputHint: '1500',
                  icon: CatchIcons.priceChangeOutlined,
                  keyboardType: TextInputType.number,
                  inputFormatters: [FilteringTextInputFormatter.digitsOnly],
                  textInputAction: TextInputAction.next,
                  onValidate: (value) =>
                      positiveRequiredValidator(value, context.l10n),
                ),
              ],
            ),
        ],
        EventAgeRangeField(
          key: CreateEventFormKeys.minAge,
          minAgeController: minAgeController,
          maxAgeController: maxAgeController,
          minimumContract: CatchContractConstraints
              .updateEventCallablePayloadFieldsConstraintsMinAge,
          maximumContract: CatchContractConstraints
              .updateEventCallablePayloadFieldsConstraintsMaxAge,
        ),
        ValueListenableBuilder<TextEditingValue>(
          valueListenable: priceController,
          builder: (context, price, _) {
            final priceInMinorUnits = parseMajorCurrencyAmountToMinorUnits(
              price.text,
              currencyCode: state.currencyCode,
            );
            if (priceInMinorUnits == 0) return const SizedBox.shrink();
            return CatchFieldLanes.single(
              child: CatchField<EventCancellationPolicyId>.optionCards(
                copy: catchFieldCopy(context.l10n),
                title: context
                    .l10n
                    .hostsEditHostedEventScreenLabelCancellationPolicy,
                contract: CatchContractConstraints
                    .updateEventCallablePayloadFieldsEventPolicyCancellationPolicyId,
                contractValueBuilder: (value) => value.name,
                values: EventCancellationPolicyId.values
                    .where((value) => value.isApplicable)
                    .toList(growable: false),
                itemTitleBuilder: (policyId) => policyFor(policyId).title,
                itemDescriptionBuilder: (policyId) =>
                    policyFor(policyId).attendeeSummary,
                selected: state.cancellationPolicyId.isApplicable
                    ? state.cancellationPolicyId
                    : EventCancellationPolicyId.standard,
                onChanged: onCancellationPolicyChanged,
                icon: CatchIcons.ruleOutlined,
              ),
            );
          },
        ),
      ],
    );
  }
}

String? _moneyRequiredValidator(
  String? value, {
  required String currencyCode,
  required AppLocalizations l10n,
}) {
  if (value == null || value.trim().isEmpty) {
    return l10n.sharedValidationRequired;
  }
  final amount = parseMajorCurrencyAmountToMinorUnits(
    value,
    currencyCode: currencyCode,
  );
  if (amount == null) return l10n.sharedValidationInvalid;
  return null;
}
