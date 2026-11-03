import 'package:catch_l10n/l10n.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/material.dart';

class EventAssistanceHelpEntrySection extends StatelessWidget {
  const EventAssistanceHelpEntrySection({
    super.key,
    required this.onReview,
    this.confirmationNeeded = false,
  });
  final VoidCallback onReview;
  final bool confirmationNeeded;
  @override
  Widget build(BuildContext context) => CatchSection.action(
    title: context.l10n.eventAssistanceHelpTitle,
    message: confirmationNeeded
        ? context.l10n.eventAssistanceHelpPendingBody
        : context.l10n.eventAssistanceHelpBody,
    actionLabel: confirmationNeeded
        ? context.l10n.eventAssistanceHelpPending
        : context.l10n.eventAssistanceHelpReview,
    onAction: onReview,
  );
}
