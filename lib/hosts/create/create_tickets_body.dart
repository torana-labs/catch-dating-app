import 'package:catch_dating_app/hosts/create/create_copy.dart';
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
    this.showTitle = false,
  });

  final CreateFlowState state;
  final ValueChanged<bool> onSellElsewhere;
  final ValueChanged<String> onPrice;
  final ValueChanged<int> onPlaces;
  final ValueChanged<CreateAdmission> onAdmission;
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
            CreateCopy.stepTitle(CreateStep.tickets),
            variant: CatchTextVariant.displaySection,
          ),
        CatchPageTabBar<bool>.segmented(
          key: const ValueKey<String>('create-where-sold'),
          label: CreateCopy.whereSold,
          options: const [
            CatchOption(value: false, label: CreateCopy.sellOnCatch),
            CatchOption(value: true, label: CreateCopy.sellElsewhere),
          ],
          selected: elsewhere,
          onChanged: onSellElsewhere,
        ),
        if (!elsewhere)
          CatchStack(
            direction: CatchStackDirection.row,
            gap: CatchStackGap.g16,
            equal: true,
            align: CatchStackAlign.end,
            children: [
              CatchField.input(
                key: const ValueKey<String>('create-price'),
                copy: copy,
                title: CreateCopy.pricePerPlace,
                initialValue: draft.price ?? '',
                prefixText: '₹',
                keyboardType: TextInputType.number,
                inputFormatters: [FilteringTextInputFormatter.digitsOnly],
                onChanged: onPrice,
                errorText: state.problems.contains(CreateProblem.price)
                    ? CreateCopy.priceNeeded
                    : null,
              ),
              CatchStack(
                gap: CatchStackGap.g8,
                children: [
                  const CatchText(
                    CreateCopy.places,
                    variant: CatchTextVariant.labelAction,
                  ),
                  CatchStepper(
                    key: const ValueKey<String>('create-places'),
                    value: places,
                    min: 1,
                    max: 500,
                    decreaseSemanticLabel: CreateCopy.fewerPlaces,
                    increaseSemanticLabel: CreateCopy.morePlaces,
                    onChanged: (value) => onPlaces(value.toInt()),
                  ),
                ],
              ),
            ],
          ),
        CatchStack(
          gap: CatchStackGap.g8,
          children: [
            const CatchText(
              CreateCopy.whoCanCome,
              variant: CatchTextVariant.labelAction,
            ),
            for (final admission in CreateAdmission.values)
              CatchChoiceTile(
                key: ValueKey<String>('create-admission-${admission.name}'),
                variant: CatchChoiceTileVariant.row,
                title: CreateCopy.admissionTitle(admission),
                subtitle: CreateCopy.admissionNote(admission),
                selected: state.admission == admission,
                onTap: () => onAdmission(admission),
              ),
          ],
        ),
        if (!elsewhere) CatchNotice.inline(body: CreateCopy.payoutNotice),
      ],
    );
  }
}
