import 'package:flutter/widgets.dart';

abstract final class EventActionKeys {
  static const bookButton = ValueKey('events.detail.book.button');
  static const cancelBookingButton = ValueKey(
    'events.detail.cancelBooking.button',
  );
  static const joinWaitlistButton = ValueKey(
    'events.detail.joinWaitlist.button',
  );
}
