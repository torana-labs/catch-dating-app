import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/material.dart';
import 'package:widgetbook_annotation/widgetbook_annotation.dart' as widgetbook;
import 'package:widgetbook_workspace/support/contract_preview.dart';

@widgetbook.UseCase(
  name: 'Contract states',
  type: CatchCheckboxInput,
  path: '[Core primitives]/Inputs',
)
Widget catchCheckboxInputContractStates(
  BuildContext context,
) => WidgetbookContractFrame(
  title: 'CatchCheckboxInput',
  contractId: 'catch.checkbox',
  states: const [
    'unchecked',
    'checked',
    'disabled',
    'disabled-checked',
    'description',
    'semantic-labelled',
    'long-copy',
  ],
  children: [
    for (final value in [false, true])
      WidgetbookContractStateCard(
        label: value ? 'checked' : 'unchecked',
        child: CatchCheckboxInput(
          value: value,
          onChanged: (_) {},
          label: 'I acknowledge the venue rules',
        ),
      ),
    for (final value in [false, true])
      WidgetbookContractStateCard(
        label: value ? 'disabled-checked' : 'disabled',
        child: CatchCheckboxInput(
          value: value,
          onChanged: null,
          label: 'Locked acknowledgement',
        ),
      ),
    WidgetbookContractStateCard(
      label: 'description',
      child: CatchCheckboxInput(
        value: false,
        onChanged: (_) {},
        label: 'Confirm attendee details',
        description: 'This applies to everyone in the booking.',
      ),
    ),
    WidgetbookContractStateCard(
      label: 'semantic-labelled',
      child: CatchCheckboxInput(
        value: true,
        onChanged: (_) {},
        label: 'Agree',
        semanticLabel: 'Acknowledge venue rules',
      ),
    ),
    WidgetbookContractStateCard(
      label: 'long-copy',
      child: CatchCheckboxInput(
        value: false,
        onChanged: (_) {},
        label:
            'I acknowledge the complete venue and attendee conduct requirements.',
        description: 'Full details remain readable and are never truncated.',
      ),
    ),
  ],
);
