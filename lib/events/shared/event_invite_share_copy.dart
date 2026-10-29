import 'package:catch_dating_app/contexts/events/domain/event.dart';
import 'package:catch_dating_app/contexts/events/domain/event_formatters.dart';
import 'package:catch_dating_app/l10n/generated/app_localizations.dart';
import 'package:catch_dating_app/routing/app_deep_links.dart';

abstract final class EventInviteShareCopy {
  static Uri eventUri(
    Event event, {
    String? inviteCode,
    String? inviteLinkId,
  }) => AppDeepLinks.event(
    clubId: event.clubId,
    eventId: event.id,
    inviteCode: inviteCode,
    inviteLinkId: inviteLinkId,
  );

  static String subject(Event event, AppLocalizations l10n) =>
      l10n.eventsInviteShareSubject(eventTitle: event.title);

  static String eventDetailInviteText(
    Event event, {
    required AppLocalizations l10n,
    String? inviteCode,
    String? inviteLinkId,
    Uri? inviteUri,
  }) {
    return _composeInvite(
      event,
      l10n: l10n,
      intro: l10n.eventsInviteShareEventDetailIntro,
      inviteCode: inviteCode,
      inviteLinkId: inviteLinkId,
      inviteUri: inviteUri,
    );
  }

  static String bookingInviteText(Event event, AppLocalizations l10n) {
    return _composeInvite(
      event,
      l10n: l10n,
      intro: l10n.eventsInviteShareBookingIntro,
    );
  }

  static String referralText(Event event, AppLocalizations l10n) {
    return _composeInvite(
      event,
      l10n: l10n,
      intro: l10n.eventsInviteShareReferralIntro,
    );
  }

  static String hostPrivateInviteText({
    required Event event,
    required AppLocalizations l10n,
    required String clubName,
    required String inviteLink,
  }) {
    return [
      l10n.eventsInviteShareHostPrivateIntro(
        eventTitle: event.title,
        clubName: clubName,
      ),
      '',
      _eventLine(event, l10n),
      event.locationName,
      '',
      l10n.eventsInviteShareHostPrivatePrompt,
      inviteLink,
    ].join('\n');
  }

  static String _composeInvite(
    Event event, {
    required AppLocalizations l10n,
    required String intro,
    String? inviteCode,
    String? inviteLinkId,
    Uri? inviteUri,
  }) {
    final link =
        inviteUri ??
        eventUri(event, inviteCode: inviteCode, inviteLinkId: inviteLinkId);
    return [
      intro,
      '',
      event.title,
      _eventLine(event, l10n),
      event.locationName,
      '',
      l10n.eventsInviteShareBookingPrompt,
      link.toString(),
    ].join('\n');
  }

  static String _eventLine(Event event, AppLocalizations l10n) {
    final price = event.isFree
        ? l10n.eventsInviteShareFree
        : EventFormatters.priceInPaise(
            event.priceInPaise,
            currencyCode: event.currency,
          );
    return [
      event.longDateLabel,
      event.timeRangeLabel,
      event.activitySummaryLabel,
      price,
    ].join(' | ');
  }
}
