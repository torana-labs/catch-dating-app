import 'package:catch_dating_app/contexts/events/data/event_calendar_links.dart';
import 'package:catch_dating_app/contexts/events/domain/event.dart';
import 'package:catch_dating_app/contexts/events/domain/event_location_links.dart';
import 'package:catch_dating_app/events/shared/event_invite_share_copy.dart';
import 'package:catch_dating_app/l10n/generated/app_localizations.dart';
import 'package:catch_dating_app/platform/device/external_links.dart';
import 'package:catch_dating_app/platform/device/external_share.dart';
import 'package:riverpod_annotation/riverpod_annotation.dart';

part 'payment_confirmation_controller.g.dart';

// keepalive: payment confirmation actions coordinate shared calendar, link,
// and share side effects after checkout.
@Riverpod(keepAlive: true)
PaymentConfirmationController paymentConfirmationController(Ref ref) {
  return PaymentConfirmationController(
    calendar: ref.watch(eventCalendarControllerProvider),
    links: ref.watch(externalLinkControllerProvider),
    share: ref.watch(externalShareControllerProvider),
  );
}

class PaymentConfirmationController {
  const PaymentConfirmationController({
    required this._calendar,
    required this._links,
    required this._share,
  });

  final EventCalendarController _calendar;
  final ExternalLinkController _links;
  final ExternalShareController _share;

  Future<bool> addToCalendar(Event event) => _calendar.addToCalendar(event);

  Future<bool> openDirections(Event event) =>
      _links.openExternal(directionsUri(event));

  Future<bool> openCheckout(Uri checkoutUrl) =>
      _links.openExternal(checkoutUrl);

  Future<void> inviteFriend(Event event, AppLocalizations l10n) =>
      _share.shareText(
        text: inviteText(event, l10n),
        subject: inviteSubject(event, l10n),
      );

  Future<void> shareReferral(Event event, AppLocalizations l10n) =>
      _share.shareText(
        text: referralText(event, l10n),
        subject: inviteSubject(event, l10n),
      );

  static CalendarEventPayload calendarEvent(Event event) =>
      calendarEventPayloadForEvent(event);

  static Uri directionsUri(Event event) => directionsUriForEvent(event);

  static String inviteSubject(Event event, AppLocalizations l10n) =>
      EventInviteShareCopy.subject(event, l10n);

  static String inviteText(Event event, AppLocalizations l10n) {
    return EventInviteShareCopy.bookingInviteText(event, l10n);
  }

  static String referralText(Event event, AppLocalizations l10n) {
    return EventInviteShareCopy.referralText(event, l10n);
  }
}
