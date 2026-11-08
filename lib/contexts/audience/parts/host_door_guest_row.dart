import 'package:catch_kernel/country_markets.dart';
import 'package:catch_l10n/l10n.dart';
import 'package:catch_tokens/catch_tokens.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/material.dart';

/// Where a guest is at the door: still to come, in, on the waitlist, or
/// asking to join.
enum HostDoorGuestStatus { arriving, checkedIn, waitlist, asked }

/// One guest at the door as plain facts, composed from the attendee
/// listener, the participation listener, the roster labels and the local
/// attendance outbox.
@immutable
class HostDoorGuest {
  const HostDoorGuest({
    required this.attendeeId,
    required this.name,
    required this.status,
    this.userId,
    this.firstTime = false,
    this.priorNights,
    this.paidMinor,
    this.paidCurrency,
    this.checkedInAt,
    this.askedAt,
    this.waitlistPosition,
    this.offered = false,
    this.syncing = false,
    this.busy = false,
  });

  /// The attendee row the check-in writes to.
  final String attendeeId;

  /// The Catch account behind the row; let in and offer need it.
  final String? userId;
  final String name;
  final HostDoorGuestStatus status;

  /// The roster labels call this guest a first-timer with the organizer.
  final bool firstTime;

  /// Earlier nights with the organizer, from the roster labels.
  final int? priorNights;

  /// What the guest paid, in minor units of [paidCurrency].
  final int? paidMinor;
  final String? paidCurrency;
  final DateTime? checkedInAt;

  /// When the join request was made.
  final DateTime? askedAt;

  /// One-based place on the waitlist.
  final int? waitlistPosition;

  /// A waitlist place has been offered and is waiting on the guest.
  final bool offered;

  /// A check-in or undo is on this phone and not on the server yet; the row
  /// already shows where it is going.
  final bool syncing;

  /// A command for this guest is in flight.
  final bool busy;

  /// Whether the row's one action can run now.
  bool get canAct =>
      !busy &&
      !syncing &&
      switch (status) {
        HostDoorGuestStatus.arriving || HostDoorGuestStatus.checkedIn => true,
        HostDoorGuestStatus.asked => userId != null,
        HostDoorGuestStatus.waitlist => userId != null && !offered,
      };

  /// Matches a search over the name, ignoring case.
  bool matches(String query) {
    final needle = query.trim().toLowerCase();
    return needle.isEmpty || name.toLowerCase().contains(needle);
  }
}

/// A door guest as a system row: the avatar (marked once in), the name with
/// "New" for a first-timer, the line for the guest's status and the one
/// action that status takes. It draws nothing of its own.
class HostDoorGuestRow extends StatelessWidget {
  const HostDoorGuestRow({
    super.key,
    required this.guest,
    required this.onAction,
    this.format,
  });

  final HostDoorGuest guest;
  final VoidCallback onAction;

  /// The event's format, for the "New" badge.
  final CatchFormat? format;

  @override
  Widget build(BuildContext context) {
    final l10n = context.l10n;
    final status = guest.status;
    final meta = hostDoorGuestMeta(context, guest);
    return CatchIndexRow(
      title: guest.name,
      subtitle: meta.isEmpty ? null : meta,
      onTap: null,
      density: CatchIndexRowSize.compact,
      leading: CatchAvatar(
        size: GeneratedCatchSizeTokens.avatarLg,
        name: guest.name,
        status: status == HostDoorGuestStatus.checkedIn
            ? CatchAvatarStatus.checkedIn
            : CatchAvatarStatus.none,
      ),
      badge: guest.firstTime
          ? CatchIndexRowBadge(label: l10n.doorGuestNew, format: format)
          : null,
      action: CatchIndexRowAction(
        label: switch (status) {
          HostDoorGuestStatus.arriving => l10n.doorGuestCheckIn,
          HostDoorGuestStatus.checkedIn => l10n.doorGuestUndo,
          HostDoorGuestStatus.asked => l10n.doorGuestLetIn,
          HostDoorGuestStatus.waitlist => l10n.doorGuestOffer,
        },
        variant: switch (status) {
          HostDoorGuestStatus.arriving ||
          HostDoorGuestStatus.asked => CatchIndexRowActionVariant.primary,
          HostDoorGuestStatus.checkedIn ||
          HostDoorGuestStatus.waitlist => CatchIndexRowActionVariant.secondary,
        },
        onPressed: guest.canAct ? onAction : null,
      ),
    );
  }
}

/// The line under a door guest's name: when they came in, when they asked,
/// their place on the waitlist, or what they paid and how often they have
/// come before.
String hostDoorGuestMeta(BuildContext context, HostDoorGuest guest) {
  final l10n = context.l10n;
  final localizations = MaterialLocalizations.of(context);
  String time(DateTime at) =>
      localizations.formatTimeOfDay(TimeOfDay.fromDateTime(at.toLocal()));
  final history = guest.firstTime
      ? l10n.doorGuestFirstTime
      : switch (guest.priorNights) {
          final nights? when nights > 0 => l10n.doorGuestNightsBefore(
            count: nights,
          ),
          _ => null,
        };
  final paid = switch (guest.paidMinor) {
    final amount? when amount > 0 => l10n.doorGuestPaid(
      amount: formatMinorCurrency(
        amount,
        currencyCode: guest.paidCurrency ?? defaultCurrencyCode,
      ),
    ),
    _ => null,
  };
  final parts = <String>[
    ...switch (guest.status) {
      HostDoorGuestStatus.arriving => [?paid, ?history],
      HostDoorGuestStatus.checkedIn => [
        switch (guest.checkedInAt) {
          final at? when !guest.syncing => l10n.doorGuestInAt(time: time(at)),
          _ => l10n.doorGuestInJustNow,
        },
      ],
      HostDoorGuestStatus.asked => [
        if (guest.askedAt case final at?) l10n.doorGuestAskedAt(time: time(at)),
        ?history,
      ],
      HostDoorGuestStatus.waitlist => [
        if (guest.offered)
          l10n.doorGuestOffered
        else if (guest.waitlistPosition case final position?)
          position == 1
              ? l10n.doorGuestFirstOnWaitlist
              : l10n.doorGuestWaitlistPosition(position: position),
      ],
    },
    if (guest.syncing) l10n.doorGuestNotSynced,
  ];
  return parts.join(' · ');
}
