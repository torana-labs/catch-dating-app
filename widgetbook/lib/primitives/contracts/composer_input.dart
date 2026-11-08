import 'package:catch_tokens/catch_tokens.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/material.dart';
import 'package:widgetbook_annotation/widgetbook_annotation.dart' as widgetbook;
import 'package:widgetbook_workspace/preview_layout_contracts.dart';
import 'package:widgetbook_workspace/primitives/contracts/shell_preview.dart';
import 'package:widgetbook_workspace/support/contract_preview.dart';

// The system ChatComposer: the message field at the foot of a chat.

Widget _state(
  BuildContext context, {
  required String label,
  required String description,
  required Widget child,
}) => WidgetbookContractStateCard(
  label: label,
  description: description,
  child: SizedBox(
    width: WidgetbookPreviewLayout.standardContractWidth,
    child: CatchRoot(
      theme: widgetbookThemeOf(context),
      format: CatchFormat.nightsOut,
      child: TickerMode(enabled: false, child: child),
    ),
  ),
);

@widgetbook.UseCase(
  name: 'Contract states',
  type: CatchComposerInput,
  path: '[Core primitives]/Inputs',
)
Widget catchComposerInputContractStates(BuildContext context) {
  return WidgetbookContractFrame(
    title: 'CatchComposerInput',
    contractId: 'catch.composer_input',
    states: const ['empty', 'draft', 'leading', 'closed'],
    children: [
      _state(
        context,
        label: 'empty',
        description: 'The send button waits for text.',
        child: CatchComposerInput(
          placeholder: 'Message',
          sendLabel: 'Send',
          onSend: (_) {},
        ),
      ),
      _state(
        context,
        label: 'draft',
        description: 'With text the send button wakes up.',
        child: CatchComposerInput(
          placeholder: 'Message',
          sendLabel: 'Send',
          controller: TextEditingController(text: 'On my way'),
          onSend: (_) {},
        ),
      ),
      _state(
        context,
        label: 'leading',
        description: 'An add-a-photo action before the field.',
        child: CatchComposerInput(
          placeholder: 'Message the group',
          sendLabel: 'Send',
          onSend: (_) {},
          leading: CatchIconAction(
            variant: CatchIconActionVariant.plain,
            tooltip: 'Add a photo',
            onPressed: widgetbookNoop,
            child: Icon(CatchIcons.addPhoto),
          ),
        ),
      ),
      _state(
        context,
        label: 'closed',
        description: 'A closed chat shows a note instead of the field.',
        child: const CatchComposerInput(
          placeholder: 'Message',
          sendLabel: 'Send',
          closedNote: 'This chat closed when the event ended.',
        ),
      ),
    ],
  );
}
