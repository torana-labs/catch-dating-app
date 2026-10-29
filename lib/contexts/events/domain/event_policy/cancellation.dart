// GENERATED CODE - DO NOT EDIT.
// Source: copy/structured_domain_copy_en.json and tool/copy/templates/structured_domain_copy/eventPolicyCancellation.dart.template

part of '../event_policy.dart';

enum EventCancellationPolicyId { notApplicable, flexible, standard, strict }

extension EventCancellationPolicyIdX on EventCancellationPolicyId {
  bool get isApplicable => this != EventCancellationPolicyId.notApplicable;
}

enum EventCancellationActor { attendee, host, platform }

enum EventCancellationRemedy {
  fullRefund,
  platformCredit,
  noRefund,
  waitlistRelease,
  platformMakesAttendeeComplete,
}

enum EventHostPayoutTiming { afterEventCompletion }

class EventCancellationPolicy {
  const EventCancellationPolicy({
    required this.id,
    required this.title,
    required this.attendeeSummary,
    required this.hostCancellationSummary,
    required this.fullRefundUntilBeforeStart,
    required this.creditUntilBeforeStart,
    required this.lateCreditPercent,
  });

  const EventCancellationPolicy.notApplicable()
    : this(
        id: EventCancellationPolicyId.notApplicable,
        title: 'No cancellation policy',
        attendeeSummary:
            'No payment was collected, so attendees can leave without a refund policy.',
        hostCancellationSummary:
            'If the host cancels, attendees are notified and no refund is required.',
        fullRefundUntilBeforeStart: Duration.zero,
        creditUntilBeforeStart: Duration.zero,
        lateCreditPercent: 0,
      );

  const EventCancellationPolicy.flexible()
    : this(
        id: EventCancellationPolicyId.flexible,
        title: 'Flexible',
        attendeeSummary:
            'Full refund until 6 hours before start; platform credit until 1 hour before start.',
        hostCancellationSummary:
            'If the host cancels, attendees are fully refunded and the host is not paid.',
        fullRefundUntilBeforeStart: const Duration(hours: 6),
        creditUntilBeforeStart: const Duration(hours: 1),
        lateCreditPercent: 100,
      );

  const EventCancellationPolicy.standard()
    : this(
        id: EventCancellationPolicyId.standard,
        title: 'Standard',
        attendeeSummary:
            'Full refund until 24 hours before start; 50% platform credit until 6 hours before start.',
        hostCancellationSummary:
            'If the host cancels, attendees are fully refunded and the host is not paid.',
        fullRefundUntilBeforeStart: const Duration(hours: 24),
        creditUntilBeforeStart: const Duration(hours: 6),
        lateCreditPercent: 50,
      );

  const EventCancellationPolicy.strict()
    : this(
        id: EventCancellationPolicyId.strict,
        title: 'Strict',
        attendeeSummary:
            'Full refund until 72 hours before start; 50% platform credit until 24 hours before start.',
        hostCancellationSummary:
            'If the host cancels, attendees are fully refunded and the host is not paid.',
        fullRefundUntilBeforeStart: const Duration(hours: 72),
        creditUntilBeforeStart: const Duration(hours: 24),
        lateCreditPercent: 50,
      );

  final EventCancellationPolicyId id;
  final String title;
  final String attendeeSummary;
  final String hostCancellationSummary;
  final Duration fullRefundUntilBeforeStart;
  final Duration creditUntilBeforeStart;
  final int lateCreditPercent;

  factory EventCancellationPolicy.fromJson(Map<String, dynamic> json) {
    final id = _enumFromName(
      EventCancellationPolicyId.values,
      json['policyId'] ?? json['id'],
      EventCancellationPolicyId.standard,
    );
    return switch (id) {
      EventCancellationPolicyId.notApplicable =>
        const EventCancellationPolicy.notApplicable(),
      EventCancellationPolicyId.flexible =>
        const EventCancellationPolicy.flexible(),
      EventCancellationPolicyId.standard =>
        const EventCancellationPolicy.standard(),
      EventCancellationPolicyId.strict =>
        const EventCancellationPolicy.strict(),
    };
  }

  Map<String, Object?> toJson() => {'policyId': id.name};

  bool get isApplicable => id != EventCancellationPolicyId.notApplicable;

  EventCancellationQuote quoteFor(EventCancellationRequest request) {
    if (request.isWaitlisted) {
      return EventCancellationQuote(
        policyId: id,
        actor: request.actor,
        remedy: EventCancellationRemedy.waitlistRelease,
        refundAmount: const MoneyAmount.inPaise(0),
        creditAmount: const MoneyAmount.inPaise(0),
        userLabel: 'Free waitlist removal',
        explanation: 'Waitlisted attendees have not paid and can leave freely.',
      );
    }

    if (request.actor == EventCancellationActor.host ||
        request.actor == EventCancellationActor.platform) {
      return EventCancellationQuote(
        policyId: id,
        actor: request.actor,
        remedy: EventCancellationRemedy.platformMakesAttendeeComplete,
        refundAmount: request.paidAmount,
        creditAmount: const MoneyAmount.inPaise(0),
        userLabel: 'Made complete',
        explanation:
            'Host or platform cancellation overrides host policy; the attendee gets a full refund before any host payout.',
      );
    }

    if (request.paidAmount.isFree) {
      return EventCancellationQuote(
        policyId: id,
        actor: request.actor,
        remedy: EventCancellationRemedy.fullRefund,
        refundAmount: request.paidAmount,
        creditAmount: const MoneyAmount.inPaise(0),
        userLabel: 'Free cancellation',
        explanation: 'No payment was collected for this event.',
      );
    }

    if (request.beforeStart >= fullRefundUntilBeforeStart) {
      return EventCancellationQuote(
        policyId: id,
        actor: request.actor,
        remedy: EventCancellationRemedy.fullRefund,
        refundAmount: request.paidAmount,
        creditAmount: const MoneyAmount.inPaise(0),
        userLabel: 'Full refund',
        explanation:
            'The attendee cancelled before the full-refund cutoff for this policy.',
      );
    }

    if (request.beforeStart >= creditUntilBeforeStart &&
        lateCreditPercent > 0) {
      final credit = request.paidAmount.percent(lateCreditPercent);
      return EventCancellationQuote(
        policyId: id,
        actor: request.actor,
        remedy: EventCancellationRemedy.platformCredit,
        refundAmount: const MoneyAmount.inPaise(0),
        creditAmount: credit,
        userLabel: '$lateCreditPercent% credit',
        explanation:
            'The cash refund window has closed, but this policy still returns platform credit.',
      );
    }

    return EventCancellationQuote(
      policyId: id,
      actor: request.actor,
      remedy: EventCancellationRemedy.noRefund,
      refundAmount: const MoneyAmount.inPaise(0),
      creditAmount: const MoneyAmount.inPaise(0),
      userLabel: 'No refund',
      explanation:
          'The attendee cancelled after the final cancellation window for this policy.',
    );
  }
}

class EventCancellationRequest {
  const EventCancellationRequest({
    required this.actor,
    required this.paidAmount,
    required this.beforeStart,
    this.isWaitlisted = false,
  });

  final EventCancellationActor actor;
  final MoneyAmount paidAmount;
  final Duration beforeStart;
  final bool isWaitlisted;
}

class EventCancellationQuote {
  const EventCancellationQuote({
    required this.policyId,
    required this.actor,
    required this.remedy,
    required this.refundAmount,
    required this.creditAmount,
    required this.userLabel,
    required this.explanation,
  });

  final EventCancellationPolicyId policyId;
  final EventCancellationActor actor;
  final EventCancellationRemedy remedy;
  final MoneyAmount refundAmount;
  final MoneyAmount creditAmount;
  final String userLabel;
  final String explanation;
}
