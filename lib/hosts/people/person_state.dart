import 'package:catch_dating_app/contexts/audience/domain/crm/host_audience_contact_detail.dart';
import 'package:catch_dating_app/contexts/audience/domain/crm/host_customer_revenue.dart';
import 'package:flutter/foundation.dart';

/// Where a person's page is: still reading, showing them, or unable to read
/// the record.
enum HostPersonStatus { loading, ready, error }

/// One person as the People pages show them: their facts, what they spent,
/// their nights with the organizer, and the team's tags and latest note.
@immutable
class HostPersonState {
  const HostPersonState({required this.status, this.detail, this.error});

  const HostPersonState.loading() : this(status: HostPersonStatus.loading);

  final HostPersonStatus status;
  final HostAudienceContactDetail? detail;
  final Object? error;

  String get name => detail?.displayName ?? '';

  /// Nights they came, from the attendance projection.
  int get nights => detail?.traits.attendedEventCount ?? 0;

  /// Nights they booked and did not come to.
  int get missed => detail?.traits.noShowCount ?? 0;

  /// Their first night with the organizer, when one is on record.
  DateTime? get since {
    DateTime? first;
    for (final event in detail?.events ?? const <HostAudienceEventFact>[]) {
      final start = event.eventStartAt;
      if (start == null) continue;
      if (first == null || start.isBefore(first)) first = start;
    }
    return first;
  }

  /// What they spent on tickets in rupees, or null when the revenue read
  /// has no rupee total.
  int? get spentMinor {
    final amounts = detail?.revenue.amounts ?? const [];
    for (final amount in amounts) {
      if (amount.currency == 'INR') return amount.amountMinor;
    }
    return null;
  }

  /// Their nights, newest first.
  List<HostAudienceEventFact> get nightsWithYou {
    final events = [...?detail?.events];
    events.sort((a, b) {
      final left = a.eventStartAt;
      final right = b.eventStartAt;
      if (left == null || right == null) {
        return left == null ? (right == null ? 0 : 1) : -1;
      }
      return right.compareTo(left);
    });
    return events;
  }
}
