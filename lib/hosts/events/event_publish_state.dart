import 'package:flutter/foundation.dart';

/// Where the publication screen is: reading, showing the choice, the
/// server has not written the event's setup view yet, or unable to read.
enum HostEventPublishStatus { loading, ready, missing, error }

/// Who can find the event: everyone (listed), people with its link, or
/// only the organizer's team while it is unpublished.
enum HostEventVisibility { everyone, link, team }

/// Who can book: first come first served, the organiser's followers before
/// everyone else, or the host approves each guest.
enum HostEventBookingMode { anyone, followersFirst, askFirst }

/// Everything the publication screen shows, as plain values.
@immutable
class HostEventPublishState {
  const HostEventPublishState({
    required this.status,
    this.eventTitle,
    this.published = false,
    this.canPublish = false,
    this.setupRevision,
    this.listing = 'listed',
    this.showGuestList = true,
    this.priceHiddenUntilBookingOpens = false,
    this.bookingMode,
    this.canChangeBooking = false,
    this.error,
  });

  const HostEventPublishState.loading()
    : this(status: HostEventPublishStatus.loading);

  final HostEventPublishStatus status;
  final String? eventTitle;

  /// Everyone can find and book the event; otherwise only the team sees it.
  final bool published;

  /// The server says the event has what publishing needs.
  final bool canPublish;

  /// The fence for the next publication command.
  final int? setupRevision;

  /// `listed` or `link`, with the read-time default applied.
  final String listing;
  final bool showGuestList;
  final bool priceHiddenUntilBookingOpens;

  /// The saved booking choice; null when none is saved.
  final HostEventBookingMode? bookingMode;

  /// Booking is an event preference, which only an unpublished event edits.
  final bool canChangeBooking;
  final Object? error;

  HostEventVisibility get visibility => !published
      ? HostEventVisibility.team
      : listing == 'link'
      ? HostEventVisibility.link
      : HostEventVisibility.everyone;
}
