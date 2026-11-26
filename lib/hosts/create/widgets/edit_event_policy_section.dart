import 'package:catch_dating_app/contexts/events/domain/event.dart';
import 'package:catch_dating_app/contexts/events/domain/event_formatters.dart';
import 'package:catch_dating_app/contexts/events/domain/event_policy.dart';
import 'package:catch_dating_app/hosts/create/create_edit_handlers.dart';
import 'package:catch_dating_app/hosts/create/create_flow_state.dart';
import 'package:catch_dating_app/hosts/create/edit_event_values.dart';
import 'package:catch_dating_app/hosts/presentation/event_management/create/create_event_form_keys.dart';
import 'package:catch_dating_app/hosts/presentation/event_management/create/create_event_policy_state.dart';
import 'package:catch_dating_app/hosts/presentation/event_management/widgets/event_age_range_field.dart';
import 'package:catch_dating_app/hosts/presentation/validators.dart';
import 'package:catch_kernel/country_markets.dart';
import 'package:catch_l10n/l10n.dart';
import 'package:catch_platform/l10n/catch_ui_copy.dart';
import 'package:catch_platform/schema_contracts/generated/field_constraints.g.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/services.dart';
import 'package:flutter/widgets.dart';

/// Who can come to a saved event and on what terms: the admission format,
/// the invite code, cohort caps, demand pricing, the age range and the
/// cancellation policy of a paid event. Once bookings lock the policy it
/// shows capacity, price, admission and cancellation read-only.
///
/// It reads the edit's draft and writes through [handlers]; nothing here
/// saves.
class EditEventPolicySection extends StatefulWidget {
  const EditEventPolicySection({
    super.key,
    required this.state,
    required this.handlers,
  });

  final CreateFlowState state;
  final CreateEditHandlers handlers;

  @override
  State<EditEventPolicySection> createState() => _EditEventPolicySectionState();
}

class _EditEventPolicySectionState extends State<EditEventPolicySection> {
  // The age slider keeps its own text controllers; the draft changes when a
  // drag ends.
  late final _minAge = TextEditingController(
    text: widget.state.draft.minAge ?? '',
  );
  late final _maxAge = TextEditingController(
    text: widget.state.draft.maxAge ?? '',
  );

  @override
  void dispose() {
    _minAge.dispose();
    _maxAge.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final state = widget.state;
    final handlers = widget.handlers;
    final edit = state.edit!;
    final l10n = context.l10n;
    final copy = catchFieldCopy(l10n);
    if (edit.policyLocked) {
      // Guests have booked: what the policy is, and that it is locked.
      final event = edit.event;
      final policy = event.effectiveEventPolicy;
      return CatchSection.fieldRows(
        key: const ValueKey<String>('edit-policy-locked'),
        title: l10n.hostsEditHostedEventScreenLabelEventPolicy,
        children: [
          CatchField.read(
            copy: copy,
            title: l10n.hostsEditHostedEventScreenTextPolicyLocked,
            body:
                l10n.hostsEditHostedEventScreenTextCapacityPricingAdmissionAnd,
            bodyMaxLines: 3,
            icon: CatchIcons.locked,
          ),
          CatchField.read(
            copy: copy,
            title: l10n.hostsEditHostedEventScreenLabelCapacity,
            valueText: l10n.hostsEditHostedEventScreenVisiblecopyCapacitylimit(
              capacityLimit: event.capacityLimit,
            ),
            icon: CatchIcons.people,
          ),
          CatchField.read(
            copy: copy,
            title: l10n.hostsEditHostedEventScreenLabelPrice,
            valueText: event.isFree
                ? l10n.hostsEditHostedEventScreenVisiblecopyFree
                : EventFormatters.priceInPaise(
                    event.priceInPaise,
                    currencyCode: event.currency,
                  ),
            icon: CatchIcons.payment,
          ),
          CatchField.read(
            copy: copy,
            title: l10n.hostsEditHostedEventScreenLabelAdmission,
            valueText: editAdmissionPresetForPolicy(policy).title(l10n),
            icon: CatchIcons.checkIn,
          ),
          CatchField.read(
            copy: copy,
            title: l10n.hostsEditHostedEventScreenLabelCancellation,
            valueText: policy.cancellationPolicy.title,
            icon: CatchIcons.rules,
          ),
          if (policy.usesCrossPathsPairInventory)
            CatchField.read(
              copy: copy,
              title: l10n.hostsEventPolicyStepTitleCrossPathsPairs,
              valueText:
                  '${policy.admissionPolicy.crossPathsPairInventory.reservedPairCapacity}',
              icon: CatchIcons.people,
            ),
        ],
      );
    }
    final draft = state.draft;
    final currency = edit.currencyCode;
    final preset = editAdmissionPreset(draft);
    final cohortCaps = editCohortCapsEnabled(draft);
    final frozen = !state.canChange;
    final disabled = <WidgetState>{if (frozen) WidgetState.disabled};
    final digits = [FilteringTextInputFormatter.digitsOnly];
    final problems = state.problems;
    final price = parseMajorCurrencyAmountToMinorUnits(
      draft.price ?? '',
      currencyCode: currency,
    );
    final cancellation = editCancellationPolicy(draft);
    return CatchSection.fieldRows(
      title: l10n.hostsEditHostedEventScreenLabelEventPolicy,
      footer: CatchText(
        l10n.hostsEditHostedEventScreenTextEditableUntilTheFirst,
        variant: CatchTextVariant.bodySmall,
        tone: CatchTextTone.secondary,
      ),
      children: [
        CatchField<EventAdmissionPreset>.optionCards(
          copy: copy,
          title: l10n.hostsEditHostedEventScreenLabelAdmissionFormat,
          contract: CatchContractConstraints
              .updateEventCallablePayloadFieldsEventPolicyAdmissionFormat,
          contractValueBuilder: (value) => switch (value) {
            EventAdmissionPreset.openCapacity => 'open',
            EventAdmissionPreset.inviteOnly => 'inviteOnly',
            EventAdmissionPreset.requestToJoin ||
            EventAdmissionPreset.requestToJoinMembersExempt => 'manualApproval',
            EventAdmissionPreset.balancedSingles => 'balancedRatio',
          },
          values: EventAdmissionPreset.values,
          itemTitleBuilder: (value) => value.title(l10n),
          itemDescriptionBuilder: (value) => value.description(l10n),
          selected: preset,
          onChanged: frozen ? null : handlers.onAdmission,
          icon: CatchIcons.checkIn,
        ),
        if (preset == EventAdmissionPreset.inviteOnly)
          CatchField.input(
            // The current code arrives after the first frame.
            key: ValueKey<String>('edit-invite-code-${edit.inviteCodeSeed}'),
            copy: copy,
            title: l10n.hostsEditHostedEventScreenTitleInviteCode,
            contract: CatchContractConstraints
                .updateEventCallablePayloadFieldsPrivateAccessInviteCode,
            initialValue: draft.inviteCode ?? '',
            placeholder: l10n.hostsEditHostedEventScreenPlaceholderCatchDelhi,
            helperText: edit.inviteCodeLoading
                ? l10n.hostsEditHostedEventScreenTextLoadingCurrentInviteCode
                : null,
            icon: CatchIcons.locked,
            states: disabled,
            inputFormatters: [
              FilteringTextInputFormatter.allow(
                RegExp(l10n.hostsEditHostedEventScreenVisiblecopyAZaZ09),
              ),
            ],
            onChanged: handlers.onInviteCode,
            errorText: problems.contains(CreateProblem.inviteCode)
                ? inviteCodeValidator(draft.inviteCode, l10n)
                : null,
          ),
        if (preset == EventAdmissionPreset.openCapacity) ...[
          CatchField.toggle(
            copy: copy,
            key: CreateEventFormKeys.cohortCapsToggle,
            title: l10n.hostsEditHostedEventScreenTitleCohortCaps,
            contract:
                CatchContractConstraints.mobileFormStateEventCohortCapsEnabled,
            body: l10n.hostsEditHostedEventScreenBodyOptionallyCapStraightMen,
            bodyMaxLines: 5,
            value: cohortCaps,
            onChanged: frozen ? null : handlers.onCohortCaps,
          ),
          if (cohortCaps)
            CatchSection.containedFieldRows(
              children: [
                CatchField.input(
                  copy: copy,
                  key: CreateEventFormKeys.maxMen,
                  title: l10n.hostsEditHostedEventScreenTitleMaxStraightMen,
                  contract: CatchContractConstraints
                      .updateEventCallablePayloadFieldsConstraintsMaxMen,
                  labelMode: CatchFieldLabelTextMode.optional,
                  initialValue: draft.maxMen ?? '',
                  icon: CatchIcons.male,
                  keyboardType: TextInputType.number,
                  inputFormatters: digits,
                  states: disabled,
                  onChanged: handlers.onMaxMen,
                  errorText: problems.contains(CreateProblem.cohortCaps)
                      ? positiveOptionalValidator(draft.maxMen, l10n)
                      : null,
                ),
                CatchField.input(
                  copy: copy,
                  key: CreateEventFormKeys.maxWomen,
                  title: l10n.hostsEditHostedEventScreenTitleMaxStraightWomen,
                  contract: CatchContractConstraints
                      .updateEventCallablePayloadFieldsConstraintsMaxWomen,
                  labelMode: CatchFieldLabelTextMode.optional,
                  initialValue: draft.maxWomen ?? '',
                  icon: CatchIcons.female,
                  keyboardType: TextInputType.number,
                  inputFormatters: digits,
                  states: disabled,
                  onChanged: handlers.onMaxWomen,
                  errorText: problems.contains(CreateProblem.cohortCaps)
                      ? positiveOptionalValidator(draft.maxWomen, l10n)
                      : null,
                ),
              ],
            ),
        ],
        if (preset.requiresReview)
          CatchField.read(
            copy: copy,
            title: preset.title(l10n),
            body: l10n.hostsEditHostedEventScreenTextRequestsAppearInHost,
            bodyMaxLines: 3,
            icon: CatchIcons.checkIn,
          ),
        if (preset == EventAdmissionPreset.balancedSingles) ...[
          CatchField.toggle(
            copy: copy,
            key: CreateEventFormKeys.dynamicPricingToggle,
            title: l10n.hostsEditHostedEventScreenTitleDemandPricing,
            contract: CatchContractConstraints
                .mobileFormStateEventDynamicPricingEnabled,
            body: l10n.hostsEditHostedEventScreenBodyIncreasePriceForThe,
            value: draft.dynamicPricingEnabled,
            onChanged: frozen ? null : handlers.onDemandPricing,
          ),
          if (draft.dynamicPricingEnabled)
            CatchSection.containedFieldRows(
              children: [
                CatchField.input(
                  copy: copy,
                  key: CreateEventFormKeys.dynamicPricingStep,
                  title: l10n.hostsEditHostedEventScreenTitleStepCurrencycode(
                    currencyCode: currency,
                  ),
                  contract: CatchContractConstraints
                      .updateEventCallablePayloadFieldsEventPolicyPricingDemandPricingRulesItemsStepAdjustmentInPaise,
                  initialValue: draft.dynamicPricingStep ?? '',
                  placeholder: '250',
                  icon: CatchIcons.trend,
                  keyboardType: TextInputType.number,
                  inputFormatters: digits,
                  states: disabled,
                  onChanged: handlers.onDemandStep,
                  errorText: problems.contains(CreateProblem.demandPricing)
                      ? positiveRequiredValidator(
                          draft.dynamicPricingStep,
                          l10n,
                        )
                      : null,
                ),
                CatchField.input(
                  copy: copy,
                  key: CreateEventFormKeys.dynamicPricingMax,
                  title: l10n.hostsEditHostedEventScreenTitleMaxCurrencycode(
                    currencyCode: currency,
                  ),
                  contract: CatchContractConstraints
                      .updateEventCallablePayloadFieldsEventPolicyPricingDemandPricingRulesItemsMaxAdjustmentInPaise,
                  initialValue: draft.dynamicPricingMax ?? '',
                  placeholder: '1500',
                  icon: CatchIcons.pricing,
                  keyboardType: TextInputType.number,
                  inputFormatters: digits,
                  states: disabled,
                  onChanged: handlers.onDemandMax,
                  errorText: problems.contains(CreateProblem.demandPricing)
                      ? positiveRequiredValidator(draft.dynamicPricingMax, l10n)
                      : null,
                ),
              ],
            ),
        ],
        EventAgeRangeField(
          key: CreateEventFormKeys.minAge,
          minAgeController: _minAge,
          maxAgeController: _maxAge,
          enabled: !frozen,
          minimumContract: CatchContractConstraints
              .updateEventCallablePayloadFieldsConstraintsMinAge,
          maximumContract: CatchContractConstraints
              .updateEventCallablePayloadFieldsConstraintsMaxAge,
          onChangeEnd: handlers.onAgeRange,
        ),
        if (price != null && price > 0)
          CatchField<EventCancellationPolicyId>.optionCards(
            copy: copy,
            title: l10n.hostsEditHostedEventScreenLabelCancellationPolicy,
            contract: CatchContractConstraints
                .updateEventCallablePayloadFieldsEventPolicyCancellationPolicyId,
            contractValueBuilder: (value) => value.name,
            values: EventCancellationPolicyId.values
                .where((value) => value.isApplicable)
                .toList(growable: false),
            itemTitleBuilder: (value) => policyFor(value).title,
            itemDescriptionBuilder: (value) => policyFor(value).attendeeSummary,
            selected: cancellation.isApplicable
                ? cancellation
                : EventCancellationPolicyId.standard,
            onChanged: frozen ? null : handlers.onCancellationPolicy,
            icon: CatchIcons.rules,
          ),
      ],
    );
  }
}
