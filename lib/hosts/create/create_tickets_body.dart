import 'package:catch_dating_app/hosts/create/create_flow_state.dart';
import 'package:catch_l10n/l10n.dart';
import 'package:catch_platform/l10n/catch_ui_copy.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/services.dart';
import 'package:flutter/widgets.dart';

/// The places a new event starts with.
const createDefaultPlaces = 30;

/// Step three in board order: where tickets are sold, the price beside the
/// places, who can come, and how payouts work. Selling elsewhere keeps the
/// price and places off the event.
class CreateTicketsBody extends StatelessWidget {
  const CreateTicketsBody({
    super.key,
    required this.state,
    required this.onSellElsewhere,
    required this.onPrice,
    required this.onPlaces,
    required this.onAdmission,
    this.onWaitlist,
    this.onApproveEach,
    this.onBookingLink,
    this.showTitle = false,
  });

  final CreateFlowState state;
  final ValueChanged<bool> onSellElsewhere;
  final ValueChanged<String> onPrice;
  final ValueChanged<int> onPlaces;
  final ValueChanged<CreateAdmission> onAdmission;
  final ValueChanged<bool>? onWaitlist;
  final ValueChanged<bool>? onApproveEach;

  /// The page where guests buy tickets when they are sold elsewhere.
  final ValueChanged<String>? onBookingLink;
  final bool showTitle;

  @override
  Widget build(BuildContext context) {
    final copy = catchFieldCopy(context.l10n);
    final draft = state.draft;
    final elsewhere = draft.externalBookingMode;
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
            equal: true,
            align: CatchStackAlign.end,
            children: [
              CatchFieldLanes.single(
                child: CatchField.input(
                  key: const ValueKey<String>('create-price'),
                  copy: copy,
                  title: context.l10n.hostCreatePricePerPlace,
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
        CatchStack(
          gap: CatchStackGap.g8,
          children: [
            CatchText(
              context.l10n.hostCreateWhoCanCome,
              variant: CatchTextVariant.labelAction,
            ),
            for (final admission in CreateAdmission.values)
              CatchChoiceTile(
                key: ValueKey<String>('create-admission-${admission.name}'),
                variant: CatchChoiceTileVariant.row,
                title: context.l10n.hostCreateAdmissionTitle(
                  admission: admission.name,
                ),
                subtitle: context.l10n.hostCreateAdmissionNote(
                  admission: admission.name,
                ),
                selected: state.admission == admission,
                onTap: () => onAdmission(admission),
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
