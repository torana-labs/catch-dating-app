import 'package:catch_dating_app/contexts/audience/domain/crm/host_event_roster_insights.dart';
import 'package:catch_dating_app/contexts/events/domain/event.dart';
import 'package:flutter/foundation.dart';

/// Where the guests screen is: reading, showing the lists, or unable to.
enum HostEventGuestsStatus { loading, ready, error }

/// The guest lists the screen switches between.
enum HostEventGuestList { booked, asked, waitlist, cancelled }

/// One guest on one of the lists.
@immutable
class HostEventGuest {
  const HostEventGuest({
    required this.id,
    required this.name,
    this.uid,
    this.photoUrl,
    this.insight,
    this.offered = false,
  });

  /// Stable across rebuilds: the attendee id, or the account for a guest
  /// who asked and has no attendee row yet.
  final String id;
  final String name;

  /// The guest's account, which letting in and offering a place need.
  final String? uid;
  final String? photoUrl;
  final HostEventRosterInsight? insight;

  /// A waitlisted guest who holds an open or accepted place offer.
  final bool offered;
}

/// Everything the guests screen shows, as plain values.
@immutable
class HostEventGuestsState {
  const HostEventGuestsState({
    required this.status,
    this.event,
    this.lists = const <HostEventGuestList, List<HostEventGuest>>{},
    this.firstTime,
    this.error,
  });

  const HostEventGuestsState.loading()
    : this(status: HostEventGuestsStatus.loading);

  final HostEventGuestsStatus status;
  final Event? event;
  final Map<HostEventGuestList, List<HostEventGuest>> lists;

  /// Booked guests coming for the first time; null until counted.
  final int? firstTime;
  final Object? error;

  List<HostEventGuest> listOf(HostEventGuestList list) =>
      lists[list] ?? const <HostEventGuest>[];

  int get booked => listOf(HostEventGuestList.booked).length;

  /// Places still free; null when the event sets no capacity.
  /// Waiting guests to offer the places left to, first in line first: those
  /// with an account and no open offer, as many as there are places.
  List<String> get offerAllUids {
    final left = placesLeft ?? 0;
    if (left <= 0) return const <String>[];
    return [
      for (final guest in listOf(HostEventGuestList.waitlist))
        if (guest.uid case final uid? when !guest.offered) uid,
    ].take(left).toList(growable: false);
  }

  int? get placesLeft {
    final capacity = event?.capacityLimit ?? 0;
    return capacity <= 0 ? null : (capacity - booked).clamp(0, capacity);
  }
}
