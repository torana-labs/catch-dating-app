import 'package:catch_dating_app/contexts/events/domain/event.dart';
import 'package:catch_dating_app/contexts/events/domain/event_formatters.dart';
import 'package:catch_dating_app/contexts/payments/domain/payment_confirmation_data.dart';
import 'package:catch_dating_app/l10n/l10n.dart';
import 'package:catch_dating_app/pages/celebration/celebration_effects_controller.dart';
import 'package:catch_dating_app/pages/celebration/celebration_screen.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/material.dart';

class EventJoinedCelebrationScreen extends StatelessWidget {
  const EventJoinedCelebrationScreen({
    super.key,
    required this.event,
    required this.onViewEvent,
    required this.onBackHome,
    this.organizerName,
    this.paymentData,
    this.supplementalChildren = const [],
    this.viewEventKey,
    this.backHomeKey,
  });

  final Event event;
  final String? organizerName;
  final PaymentConfirmationData? paymentData;
  final VoidCallback onViewEvent;
  final VoidCallback onBackHome;
  final List<Widget> supplementalChildren;
  final Key? viewEventKey;
  final Key? backHomeKey;

  @override
  Widget build(BuildContext context) {
    final paymentData = this.paymentData;

    return CelebrationScreen(
      kind: CelebrationMomentKind.eventJoined,
      eyebrow: context
          .l10n
          .eventsEventJoinedCelebrationScreenEyebrowBookingConfirmed,
      title: context.l10n.eventsEventJoinedCelebrationScreenTitleYouReIn,
      message: context.l10n
          .eventsEventJoinedCelebrationScreenMessageYourSpotIsConfirmed(
            title: event.title,
            value2: organizerName == null
                ? ''
                : context.l10n
                      .eventsEventJoinedCelebrationScreenMessageWithOrganizername(
                        organizerName: organizerName!,
                      ),
          ),
      details: [
        CelebrationDetail(
          icon: CatchIcons.date,
          label: context.l10n.eventsEventJoinedCelebrationScreenLabelWhen,
          value: '${event.longDateLabel} · ${event.timeRangeLabel}',
        ),
        CelebrationDetail(
          icon: CatchIcons.location,
          label: context.l10n.eventsEventJoinedCelebrationScreenLabelWhere,
          value: event.locationName,
        ),
        CelebrationDetail(
          icon: CatchIcons.activity,
          label: context.l10n.eventsEventJoinedCelebrationScreenLabelEvent,
          value: event.activitySummaryLabel,
        ),
        if (paymentData != null) ...[
          CelebrationDetail(
            icon: CatchIcons.payment,
            label: context.l10n.eventsEventJoinedCelebrationScreenLabelPaid,
            value: EventFormatters.priceInPaise(
              paymentData.amountInPaise,
              currencyCode: paymentData.currency,
            ),
          ),
          CelebrationDetail(
            icon: CatchIcons.receipt,
            label:
                context.l10n.eventsEventJoinedCelebrationScreenLabelPaymentId,
            value: paymentData.paymentId,
          ),
        ],
      ],
      note:
          context.l10n.eventsEventJoinedCelebrationScreenNoteArriveByTheMeeting,
      supplementalChildren: supplementalChildren,
      primaryAction: CelebrationAction(
        key: viewEventKey,
        label: context.l10n.eventsEventJoinedCelebrationScreenLabelViewEvent,
        onPressed: onViewEvent,
        icon: Icon(CatchIcons.activity),
      ),
      secondaryAction: CelebrationAction(
        key: backHomeKey,
        label: context.l10n.eventsEventJoinedCelebrationScreenLabelBackToHome,
        onPressed: onBackHome,
      ),
      onClose: onBackHome,
    );
  }
}
