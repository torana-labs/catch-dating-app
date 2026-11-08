import 'package:catch_tokens/catch_tokens.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/material.dart';
import 'package:widgetbook_annotation/widgetbook_annotation.dart' as widgetbook;
import 'package:widgetbook_workspace/preview_layout_contracts.dart';
import 'package:widgetbook_workspace/primitives/contracts/shell_preview.dart';
import 'package:widgetbook_workspace/support/contract_preview.dart';

// Seconds counting down to a reveal on the guest phone. Tickers are off in
// these previews, so each state holds its first frame.

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
  type: CatchCountdownIndicator,
  path: '[Core primitives]/Feedback',
)
Widget catchCountdownIndicatorContractStates(BuildContext context) {
  return WidgetbookContractFrame(
    title: 'CatchCountdownIndicator',
    contractId: 'catch.countdown_indicator',
    states: const ['text', 'ring', 'done'],
    children: [
      _state(
        context,
        label: 'text',
        description: 'Big figures over the label.',
        child: const Center(
          child: CatchCountdownIndicator(seconds: 10, label: 'Tables in'),
        ),
      ),
      _state(
        context,
        label: 'ring',
        description: 'The figures inside a ring in the event colour.',
        child: const Center(
          child: CatchCountdownIndicator(
            seconds: 10,
            label: 'Tables in',
            variant: CatchCountdownIndicatorVariant.ring,
          ),
        ),
      ),
      _state(
        context,
        label: 'done',
        description: 'At zero it calls onDone once; the caller moves on.',
        child: const Center(
          child: CatchCountdownIndicator(
            seconds: 1,
            label: 'Revealing',
            onDone: widgetbookNoop,
          ),
        ),
      ),
    ],
  );
}
