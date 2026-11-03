import 'package:catch_l10n/l10n.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/material.dart';

class EventAssistanceDeliveryEntrySection extends StatelessWidget {
  const EventAssistanceDeliveryEntrySection({
    super.key,
    required this.onReview,
    this.confirmationNeeded = false,
  });
  final VoidCallback onReview;
  final bool confirmationNeeded;
  @override
  Widget build(BuildContext context) => CatchSection.action(
    title: context.l10n.eventAssistanceDeliveryTitle,
    message: confirmationNeeded
        ? context.l10n.eventAssistanceDeliveryPendingBody
        : context.l10n.eventAssistanceDeliveryBody,
    actionLabel: confirmationNeeded
        ? context.l10n.eventAssistanceDeliveryPending
        : context.l10n.eventAssistanceDeliveryReview,
    onAction: onReview,
  );
}
