import 'package:catch_dating_app/contexts/bookings/bookings.dart';
import 'package:catch_dating_app/contexts/events/events.dart';
import 'package:catch_dating_app/l10n/generated/structured_domain_copy.g.dart';

class HostReportExport {
  const HostReportExport({
    required this.fileName,
    required this.subject,
    required this.csv,
  });

  final String fileName;
  final String subject;
  final String csv;
}

HostReportExport buildHostRevenueReportExport({
  required Event event,
  required List<EventParticipation> participations,
  required Map<String, String> namesByUid,
  required DateTime exportedAt,
}) {
  final sorted = _sortParticipations(participations);
  final totalEstimatedRevenue = sorted.fold<int>(
    0,
    (sum, participation) =>
        sum + (_estimatedActiveRevenueMinor(event, participation) ?? 0),
  );
  final noShowCount = sorted.where(_isNoShow).length;
  final cancelledCount = sorted
      .where((p) => p.status == EventParticipationStatus.cancelled)
      .length;

  final rows = <List<Object?>>[
    const [
      'row_type',
      'event_id',
      'event_title',
      'event_start_at',
      'exported_at',
      'customer_name',
      'user_id',
      'participation_status',
      'attendance_status',
      'booking_status',
      'amount_minor',
      'amount_major',
      'currency',
      'amount_source',
      'payment_status',
      'payment_id',
      'invite_link_id',
      'invite_source',
      'invite_captured_at',
      'signed_up_at',
      'checked_in_at',
      'cancelled_at',
      'waitlisted_at',
      'no_show',
    ],
    for (final participation in sorted)
      _revenueRow(
        event: event,
        participation: participation,
        namesByUid: namesByUid,
        exportedAt: exportedAt,
      ),
    _revenueSummaryRow(
      event: event,
      label: 'TOTAL_ESTIMATED_ACTIVE_REVENUE',
      amountMinor: totalEstimatedRevenue,
      amountSource: 'active_payment_id_event_price_estimate',
      exportedAt: exportedAt,
    ),
    _revenueCountRow(
      event: event,
      label: 'NO_SHOW_COUNT',
      count: noShowCount,
      exportedAt: exportedAt,
    ),
    _revenueCountRow(
      event: event,
      label: 'CANCELLED_COUNT',
      count: cancelledCount,
      exportedAt: exportedAt,
    ),
  ];

  return HostReportExport(
    fileName: '${_eventSlug(event)}-revenue.csv',
    subject:
        '${StructuredDomainCopy.hostRevenueReportSubjectPrefix}${event.title}',
    csv: _csv(rows),
  );
}

HostReportExport buildHostOpsReportExport({
  required Event event,
  required List<EventParticipation> participations,
  required Map<String, String> namesByUid,
  required DateTime exportedAt,
}) {
  final sorted = _sortParticipations(participations);
  final arrivalOrderByUid = _arrivalOrderByUid(sorted);
  final rows = <List<Object?>>[
    const [
      'event_id',
      'event_title',
      'event_start_at',
      'exported_at',
      'person_name',
      'user_id',
      'roster_status',
      'attendance_status',
      'host_approval_status',
      'waitlist_offer_status',
      'waitlist_offered_at',
      'waitlist_offer_expires_at',
      'waitlist_offer_accepted_at',
      'invite_link_id',
      'invite_source',
      'invite_captured_at',
      'arrival_order',
      'signed_up_at',
      'waitlisted_at',
      'checked_in_at',
      'cancelled_at',
      'gender_at_signup',
      'cohort_at_signup',
      'payment_id',
      'ops_note',
    ],
    for (final participation in sorted)
      [
        event.id,
        event.title,
        _iso(event.startTime),
        _iso(exportedAt),
        namesByUid[participation.uid] ?? participation.uid,
        participation.uid,
        participation.status.name,
        _attendanceStatus(participation),
        participation.hostApprovalStatus?.name ?? '',
        participation.waitlistOfferStatus?.name ?? '',
        _iso(participation.waitlistOfferedAt),
        _iso(participation.waitlistOfferExpiresAt),
        _iso(participation.waitlistOfferAcceptedAt),
        participation.inviteLinkId ?? '',
        participation.inviteSource ?? '',
        _iso(participation.inviteCapturedAt),
        arrivalOrderByUid[participation.uid] ?? '',
        _iso(participation.signedUpAt),
        _iso(participation.waitlistedAt),
        _iso(participation.attendedAt),
        _iso(participation.cancelledAt),
        participation.genderAtSignup?.name ?? '',
        participation.cohortAtSignup ?? '',
        participation.paymentId ?? '',
        _opsNote(participation),
      ],
  ];

  return HostReportExport(
    fileName: '${_eventSlug(event)}-ops.csv',
    subject: '${StructuredDomainCopy.hostOpsReportSubjectPrefix}${event.title}',
    csv: _csv(rows),
  );
}

List<Object?> _revenueRow({
  required Event event,
  required EventParticipation participation,
  required Map<String, String> namesByUid,
  required DateTime exportedAt,
}) {
  final amountMinor = _estimatedActiveRevenueMinor(event, participation);
  final amountSource = _amountSource(event, participation, amountMinor);
  return [
    'detail',
    event.id,
    event.title,
    _iso(event.startTime),
    _iso(exportedAt),
    namesByUid[participation.uid] ?? participation.uid,
    participation.uid,
    participation.status.name,
    _attendanceStatus(participation),
    _bookingStatus(participation),
    amountMinor,
    amountMinor == null ? '' : _minorToMajor(amountMinor),
    event.currency,
    amountSource,
    _paymentStatus(event, participation),
    participation.paymentId ?? '',
    participation.inviteLinkId ?? '',
    participation.inviteSource ?? '',
    _iso(participation.inviteCapturedAt),
    _iso(participation.signedUpAt),
    _iso(participation.attendedAt),
    _iso(participation.cancelledAt),
    _iso(participation.waitlistedAt),
    _isNoShow(participation),
  ];
}

List<Object?> _revenueSummaryRow({
  required Event event,
  required String label,
  required int amountMinor,
  required String amountSource,
  required DateTime exportedAt,
}) {
  return [
    'summary',
    event.id,
    event.title,
    _iso(event.startTime),
    _iso(exportedAt),
    label,
    '',
    '',
    '',
    '',
    amountMinor,
    _minorToMajor(amountMinor),
    event.currency,
    amountSource,
    '',
    '',
    '',
    '',
    '',
    '',
    '',
    '',
    '',
    '',
  ];
}

List<Object?> _revenueCountRow({
  required Event event,
  required String label,
  required int count,
  required DateTime exportedAt,
}) {
  return [
    'summary',
    event.id,
    event.title,
    _iso(event.startTime),
    _iso(exportedAt),
    label,
    '',
    '',
    '',
    '',
    count,
    '',
    '',
    'count',
    '',
    '',
    '',
    '',
    '',
    '',
    '',
    '',
    '',
    '',
  ];
}

Map<String, int> _arrivalOrderByUid(List<EventParticipation> participations) {
  final checkedIn =
      participations.where((p) => p.attendedAt != null).toList(growable: false)
        ..sort((a, b) {
          final byTime = a.attendedAt!.compareTo(b.attendedAt!);
          if (byTime != 0) return byTime;
          return a.uid.compareTo(b.uid);
        });
  return {for (var i = 0; i < checkedIn.length; i++) checkedIn[i].uid: i + 1};
}

List<EventParticipation> _sortParticipations(
  List<EventParticipation> participations,
) {
  return [...participations]..sort((a, b) {
    final byRank = _statusRank(a.status).compareTo(_statusRank(b.status));
    if (byRank != 0) return byRank;
    final byTime = _primaryTime(a).compareTo(_primaryTime(b));
    if (byTime != 0) return byTime;
    return a.uid.compareTo(b.uid);
  });
}

int _statusRank(EventParticipationStatus status) {
  return switch (status) {
    EventParticipationStatus.attended => 0,
    EventParticipationStatus.signedUp => 1,
    EventParticipationStatus.waitlisted => 2,
    EventParticipationStatus.cancelled => 3,
    EventParticipationStatus.deleted => 4,
  };
}

DateTime _primaryTime(EventParticipation participation) {
  return participation.attendedAt ??
      participation.signedUpAt ??
      participation.waitlistedAt ??
      participation.cancelledAt ??
      participation.deletedAt ??
      participation.createdAt;
}

int? _estimatedActiveRevenueMinor(
  Event event,
  EventParticipation participation,
) {
  if (event.priceInPaise == 0) return 0;
  if (participation.status != EventParticipationStatus.signedUp &&
      participation.status != EventParticipationStatus.attended) {
    return null;
  }
  if (participation.paymentId == null || participation.paymentId!.isEmpty) {
    return null;
  }
  return event.priceInPaise;
}

String _amountSource(
  Event event,
  EventParticipation participation,
  int? amountMinor,
) {
  if (event.priceInPaise == 0) return 'free_event';
  if (amountMinor != null) return 'event_price_estimate_payment_id_present';
  return switch (participation.status) {
    EventParticipationStatus.waitlisted => 'not_charged_waitlist',
    EventParticipationStatus.cancelled =>
      'requires_payment_record_for_refund_status',
    EventParticipationStatus.deleted => 'deleted_participation_no_amount',
    EventParticipationStatus.signedUp ||
    EventParticipationStatus.attended => 'missing_payment_id',
  };
}

String _paymentStatus(Event event, EventParticipation participation) {
  if (event.priceInPaise == 0) return 'free';
  if (participation.paymentId == null || participation.paymentId!.isEmpty) {
    return switch (participation.status) {
      EventParticipationStatus.waitlisted => 'not_charged',
      EventParticipationStatus.cancelled => 'cancelled_no_payment_id',
      EventParticipationStatus.deleted => 'deleted_no_payment_id',
      EventParticipationStatus.signedUp ||
      EventParticipationStatus.attended => 'payment_id_missing',
    };
  }
  return participation.status == EventParticipationStatus.cancelled
      ? 'payment_recorded_cancelled_reconcile_refund_status'
      : 'payment_recorded';
}

String _bookingStatus(EventParticipation participation) {
  return switch (participation.status) {
    EventParticipationStatus.attended ||
    EventParticipationStatus.signedUp => 'booked',
    EventParticipationStatus.waitlisted => 'waitlisted',
    EventParticipationStatus.cancelled => 'cancelled',
    EventParticipationStatus.deleted => 'deleted',
  };
}

String _attendanceStatus(EventParticipation participation) {
  return switch (participation.status) {
    EventParticipationStatus.attended => 'checked_in',
    EventParticipationStatus.signedUp => 'not_checked_in',
    EventParticipationStatus.waitlisted => 'waitlisted',
    EventParticipationStatus.cancelled => 'cancelled',
    EventParticipationStatus.deleted => 'deleted',
  };
}

String _opsNote(EventParticipation participation) {
  return switch (participation.status) {
    EventParticipationStatus.attended => 'Checked in on site.',
    EventParticipationStatus.signedUp =>
      'Booked but not checked in; treat as no-show after the event.',
    EventParticipationStatus.waitlisted =>
      'Waitlist or pending request context.',
    EventParticipationStatus.cancelled =>
      'Cancelled; reconcile refund/payment status outside this roster export.',
    EventParticipationStatus.deleted => 'Deleted participation record.',
  };
}

bool _isNoShow(EventParticipation participation) =>
    participation.status == EventParticipationStatus.signedUp &&
    participation.attendedAt == null;

String _minorToMajor(int amountMinor) => (amountMinor / 100).toStringAsFixed(2);

String _iso(DateTime? value) => value?.toUtc().toIso8601String() ?? '';

String _eventSlug(Event event) {
  final slug = event.title
      .toLowerCase()
      .replaceAll(RegExp(r'[^a-z0-9]+'), '-')
      .replaceAll(RegExp(r'^-+|-+$'), '');
  final date = event.startTime.toUtc().toIso8601String().split('T').first;
  return '${slug.isEmpty ? 'event' : slug}-$date';
}

String _csv(List<List<Object?>> rows) {
  return '${rows.map((row) => row.map(_csvCell).join(',')).join('\n')}\n';
}

String _csvCell(Object? value) {
  final text = value?.toString() ?? '';
  if (!text.contains(',') &&
      !text.contains('"') &&
      !text.contains('\n') &&
      !text.contains('\r')) {
    return text;
  }
  return '"${text.replaceAll('"', '""')}"';
}
