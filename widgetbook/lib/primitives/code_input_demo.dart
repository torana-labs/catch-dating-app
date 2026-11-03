import 'package:catch_l10n/l10n.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/material.dart';

/// Owns deterministic fixture text for the production editable code input.
class WidgetbookCodeInputDemo extends StatefulWidget {
  const WidgetbookCodeInputDemo({
    super.key,
    this.value = '',
    this.length = 6,
    this.active,
    this.caret = true,
    this.status = CatchCodeInputStatus.ready,
  });

  final String value;
  final int length;
  final int? active;
  final bool caret;
  final CatchCodeInputStatus status;

  @override
  State<WidgetbookCodeInputDemo> createState() =>
      _WidgetbookCodeInputDemoState();
}

class _WidgetbookCodeInputDemoState extends State<WidgetbookCodeInputDemo> {
  late final _controller = TextEditingController(text: widget.value);

  @override
  void didUpdateWidget(WidgetbookCodeInputDemo oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (oldWidget.value != widget.value) _controller.text = widget.value;
  }

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) => CatchCodeInput(
    controller: _controller,
    semanticsLabel: context.l10n.coreCatchOtpCodeFieldSemanticLabel,
    length: widget.length,
    active: widget.active,
    caret: widget.caret,
    status: widget.status,
    onChanged: (_) {},
    onSubmitted: (_) {},
  );
}
