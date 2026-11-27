import 'package:catch_dating_app/hosts/create/create_event_form_keys.dart';
import 'package:catch_dating_app/hosts/create/create_event_policy_state.dart';
import 'package:catch_dating_app/hosts/create/create_flow_state.dart';
import 'package:catch_dating_app/hosts/create/create_policy_handlers.dart';
import 'package:catch_dating_app/hosts/create/edit_event_values.dart';
import 'package:catch_dating_app/hosts/create/widgets/edit_event_policy_section.dart';
import 'package:catch_l10n/l10n.dart';
import 'package:catch_platform/l10n/catch_ui_copy.dart';
import 'package:catch_platform/schema_contracts/generated/field_constraints.g.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/services.dart';
import 'package:flutter/widgets.dart';
import 'package:intl/intl.dart';

/// The places a new event starts with.
const createDefaultPlaces = 30;

/// Who can come when tickets sell elsewhere, by the copy's admission name.
const _elsewhereAdmissions = {
  EventAdmissionPreset.openCapacity: 'open',
  EventAdmissionPreset.inviteOnly: 'invite',
};

/// Step three in board order: where tickets are sold, the price beside the
/// places, who can come and on what terms (the admission format with its
/// invite code, cohort caps or demand pricing, the age range and a paid
/// event's cancellation policy), the waitlist, and how payouts work.
/// Selling elsewhere keeps the price, places and terms off the event and
/// asks only whether anyone can book or it is invite only. A
/// request-to-join format always asks the host, so its approval toggle
/// gives way to the format's note.
///
/// Editing a saved event keeps the price in the event's currency and adds
/// [trailing] after the terms; once bookings lock the policy, the terms
/// show it read-only instead of the price and places.
class CreateTicketsBody extends StatelessWidget {
  const CreateTicketsBody({
    super.key,
    required this.state,
    required this.onSellElsewhere,
    required this.onPrice,
    required this.onPlaces,
    required this.policy,
    this.onWaitlist,
    this.onApproveEach,
    this.onBookingLink,
    this.showTitle = false,
    this.trailing = const <Widget>[],
  });

  final CreateFlowState state;
  final ValueChanged<bool> onSellElsewhere;
  final ValueChanged<String> onPrice;
  final ValueChanged<int> onPlaces;

  /// The admission fields: who can come and on what terms.
  final CreatePolicyHandlers policy;
  final ValueChanged<bool>? onWaitlist;
  final ValueChanged<bool>? onApproveEach;

  /// The page where guests buy tickets when they are sold elsewhere.
  final ValueChanged<String>? onBookingLink;
  final bool showTitle;

  /// Fields an edit adds after the terms.
  final List<Widget> trailing;

  @override
  Widget build(BuildContext context) {
    final copy = catchFieldCopy(context.l10n);
    final draft = state.draft;
    final edit = state.edit;
    if (edit != null) {
      // A saved event: the price in its currency beside the places, then
      // the policy fields.
      final locale = Localizations.localeOf(context).toLanguageTag();
      final symbol = NumberFormat.simpleCurrency(
        locale: locale,
        name: edit.currencyCode,
      ).currencySymbol;
      final frozen = !state.canChange;
      final places = int.tryParse(draft.capacity ?? '') ?? createDefaultPlaces;
      return CatchStack(
        gap: CatchStackGap.g24,
        children: [
          if (showTitle)
            CatchText(
              context.l10n.hostCreateStepTitle(step: CreateStep.tickets.name),
              variant: CatchTextVariant.displaySection,
            ),
          if (!edit.policyLocked)
            CatchStack(
              direction: CatchStackDirection.row,
              gap: CatchStackGap.g16,
              // As when creating: the stepper keeps its own width.
              align: CatchStackAlign.baseline,
              children: [
                Expanded(
                  child: CatchFieldLanes.single(
                    child: CatchField.input(
                      key: CreateEventFormKeys.price,
                      copy: copy,
                      title: context.l10n.hostCreatePricePerPlace,
                      // Large text wraps the label instead of cutting it.
                      titleMaxLines: 2,
                      contract: CatchContractConstraints
                          .updateEventCallablePayloadFieldsPriceInPaise,
                      initialValue: draft.price ?? '',
                      prefixText: symbol,
                      keyboardType: const TextInputType.numberWithOptions(
                        decimal: true,
                      ),
                      inputFormatters: [
                        FilteringTextInputFormatter.allow(
                          RegExp(
                            context
                                .l10n
                                .hostsEditHostedEventScreenVisiblecopyDD,
                          ),
                        ),
                      ],
                      states: {if (frozen) WidgetState.disabled},
                      onChanged: onPrice,
                      errorText: state.problems.contains(CreateProblem.price)
                          ? context.l10n.hostCreatePriceNeeded
                          : null,
                    ),
                  ),
                ),
                CatchStack(
                  gap: CatchStackGap.g8,
                  children: [
                    CatchText(
                      context.l10n.hostCreatePlaces,
                      variant: CatchTextVariant.labelAction,
                    ),
                    CatchStepper(
                      key: CreateEventFormKeys.capacity,
                      value: places,
                      min: 1,
                      max:
                          CatchContractConstraints
                              .updateEventCallablePayloadFieldsCapacityLimit
                              .maximum ??
                          1000,
                      decreaseSemanticLabel: context.l10n.hostCreateFewerPlaces,
                      increaseSemanticLabel: context.l10n.hostCreateMorePlaces,
                      onChanged: frozen
                          ? null
                          : (value) => onPlaces(value.toInt()),
                    ),
                  ],
                ),
              ],
            ),
          EditEventPolicySection(state: state, handlers: policy),
          ...trailing,
        ],
      );
    }
    final elsewhere = draft.externalBookingMode;
    // A request-to-join format always asks; its note says so.
    final reviewed = editAdmissionPreset(draft).requiresReview;
    final invited =
        editAdmissionPreset(draft) == EventAdmissionPreset.inviteOnly;
    final places = int.tryParse(draft.capacity ?? '') ?? createDefaultPlaces;
    return CatchStack(
      gap: CatchStackGap.g24,
      children: [
        if (showTitle)
          CatchText(
            context.l10n.hostCreateStepTitle(step: CreateStep.tickets.name),
            variant: CatchTextVariant.displaySection,
          ),
        CatchPageTabBar<bool>.segmented(
          key: const ValueKey<String>('create-where-sold'),
          label: context.l10n.hostCreateWhereSold,
          options: [
            CatchOption(
              value: false,
              label: context.l10n.hostCreateSellOnCatch,
            ),
            CatchOption(
              value: true,
              label: context.l10n.hostCreateSellElsewhere,
            ),
          ],
          selected: elsewhere,
          onChanged: onSellElsewhere,
        ),
        if (elsewhere && onBookingLink != null)
          CatchFieldLanes.single(
            child: CatchField.input(
              key: const ValueKey<String>('create-booking-link'),
              copy: copy,
              title: context.l10n.hostCreateBookingLink,
              contract: CatchContractConstraints
                  .updatePrivateEventDetailsCallablePayloadDetailsExternalBookingValueUrl,
              initialValue: draft.externalEventUrl ?? '',
              placeholder: context.l10n.hostCreateBookingLinkHint,
              keyboardType: TextInputType.url,
              onChanged: onBookingLink!,
            ),
          ),
        if (!elsewhere)
          CatchStack(
            direction: CatchStackDirection.row,
            gap: CatchStackGap.g16,
            // The two labels share a line, whatever sits under them. The
            // stepper keeps the width its buttons and number need, at any
            // text size; the price takes the rest.
            align: CatchStackAlign.baseline,
            children: [
              Expanded(
                child: CatchFieldLanes.single(
                  child: CatchField.input(
                    key: const ValueKey<String>('create-price'),
                    copy: copy,
                    title: context.l10n.hostCreatePricePerPlace,
                    // Large text wraps the label instead of cutting it.
                    titleMaxLines: 2,
                    contract: CatchContractConstraints
                        .updatePrivateEventDetailsCallablePayloadDetailsAdmissionTermsPriceInPaise,
                    initialValue: draft.price ?? '',
                    prefixText: '₹',
                    keyboardType: TextInputType.number,
                    inputFormatters: [FilteringTextInputFormatter.digitsOnly],
                    onChanged: onPrice,
                    errorText: state.problems.contains(CreateProblem.price)
                        ? context.l10n.hostCreatePriceNeeded
                        : null,
                  ),
                ),
              ),
              CatchStack(
                gap: CatchStackGap.g8,
                children: [
                  CatchText(
                    context.l10n.hostCreatePlaces,
                    variant: CatchTextVariant.labelAction,
                  ),
                  CatchStepper(
                    key: const ValueKey<String>('create-places'),
                    value: places,
                    min: 1,
                    max: 500,
                    decreaseSemanticLabel: context.l10n.hostCreateFewerPlaces,
                    increaseSemanticLabel: context.l10n.hostCreateMorePlaces,
                    onChanged: (value) => onPlaces(value.toInt()),
                  ),
                ],
              ),
            ],
          ),
        if (!elsewhere) EditEventPolicySection(state: state, handlers: policy),
        // Selling elsewhere keeps the two simple choices, saved as the
        // event's admission preference.
        if (elsewhere)
          CatchStack(
            gap: CatchStackGap.g8,
            children: [
              CatchText(
                context.l10n.hostCreateWhoCanCome,
                variant: CatchTextVariant.labelAction,
              ),
              for (final MapEntry(key: preset, value: admission)
                  in _elsewhereAdmissions.entries)
                CatchChoiceTile(
                  key: ValueKey<String>('create-admission-$admission'),
                  variant: CatchChoiceTileVariant.row,
                  title: context.l10n.hostCreateAdmissionTitle(
                    admission: admission,
                  ),
                  subtitle: context.l10n.hostCreateAdmissionNote(
                    admission: admission,
                  ),
                  contract: CatchContractConstraints
                      .updatePrivateEventPreferencesCallablePayloadIntentsAdmissionPresetValue,
                  contractValue: preset.name,
                  selected:
                      invited == (preset == EventAdmissionPreset.inviteOnly),
                  onTap: () => policy.onAdmission(preset),
                ),
            ],
          ),
        if (!elsewhere)
          CatchStack(
            gap: CatchStackGap.none,
            children: [
              CatchIndexRow(
                title: context.l10n.hostCreateWaitlist,
                subtitle: context.l10n.hostCreateWaitlistBody,
                onTap: null,
                trailing: CatchToggleInput(
                  key: const ValueKey<String>('create-waitlist'),
                  value: state.waitlist,
                  semanticLabel: context.l10n.hostCreateWaitlist,
                  contractExemption:
                      'An event preference saved with the tickets step.',
                  onChanged: onWaitlist,
                ),
              ),
              if (!reviewed)
                CatchIndexRow(
                  title: context.l10n.hostCreateApproveEach,
                  subtitle: context.l10n.hostCreateApproveEachBody,
                  onTap: null,
                  trailing: CatchToggleInput(
                    key: const ValueKey<String>('create-approve-each'),
                    value: state.approveEach,
                    semanticLabel: context.l10n.hostCreateApproveEach,
                    contractExemption:
                        'An event preference saved with the tickets step.',
                    onChanged: onApproveEach,
                  ),
                ),
            ],
          ),
        if (!elsewhere)
          CatchNotice.inline(body: context.l10n.hostCreatePayoutNotice),
      ],
    );
  }
}
