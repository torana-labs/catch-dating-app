import 'package:catch_dating_app/contexts/payments/domain/payment_confirmation_data.dart';
import 'package:catch_dating_app/events/shared/event_check_in_celebration_screen.dart';
import 'package:catch_dating_app/events/shared/event_joined_celebration_screen.dart';
import 'package:flutter/material.dart';
import 'package:widgetbook_annotation/widgetbook_annotation.dart' as widgetbook;

import '../../support/contract_preview.dart';
import 'fixtures.dart';
import 'preview.dart';

@widgetbook.UseCase(
  name: 'Joined confirmation',
  type: EventJoinedCelebrationScreen,
  path: '[Event Detail]/Screens',
)
Widget eventJoinedCelebrationScreenState(BuildContext context) {
  return WidgetbookEventDeviceFrame(
    child: EventJoinedCelebrationScreen(
      event: widgetbookEvent,
      organizerName: widgetbookEventsOrganizer.name,
      paymentData: const PaymentConfirmationData(
        paymentId: 'pay_widgetbook_123',
        orderId: 'order_widgetbook_123',
        amountInPaise: 140000,
        currency: 'INR',
        eventId: 'widgetbook-event-detail',
      ),
      onViewEvent: widgetbookNoop,
      onBackHome: widgetbookNoop,
    ),
  );
}

@widgetbook.UseCase(
  name: 'Check-in confirmation',
  type: EventCheckInCelebrationScreen,
  path: '[Event Detail]/Screens',
)
Widget eventCheckInCelebrationScreenState(BuildContext context) {
  return WidgetbookEventDeviceFrame(
    child: EventCheckInCelebrationScreen(
      event: widgetbookEvent,
      onViewEvent: widgetbookNoop,
      onBackHome: widgetbookNoop,
    ),
  );
}
