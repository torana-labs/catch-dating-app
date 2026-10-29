// GENERATED CODE - DO NOT EDIT.
// Source: copy/structured_domain_copy_en.json and tool/copy/templates/structured_domain_copy/metrics.dart.template

import 'package:catch_dating_app/contexts/formats/domain/event_success_models.dart';

abstract final class EventSuccessMetricCatalog {
  static const checkInRate = EventSuccessMetric(
    id: 'check_in_rate',
    label: 'Check-in rate',
    description: 'Share of booked attendees who actually arrive.',
    target: '85 percent or higher for repeatable events.',
  );

  static const introCoverage = EventSuccessMetric(
    id: 'intro_coverage',
    label: 'Intro coverage',
    description: 'Share of attendees who met at least two new people.',
    target: '70 percent or higher for guided formats.',
  );

  static const wingmanRequestRate = EventSuccessMetric(
    id: 'wingman_requests_rate',
    label: 'Wingman request rate',
    description: 'Share of checked-in attendees who asked the host for help.',
    target: 'Use as a live facilitation signal, not a success target.',
  );

  static const mutualMatchRate = EventSuccessMetric(
    id: 'mutual_match_rate',
    label: 'Mutual match rate',
    description:
        'Share of attendees who convert into at least one mutual match.',
    target: 'Measure by format; optimize trend, not one-event spikes.',
  );

  static const chatStartRate = EventSuccessMetric(
    id: 'chat_start_rate',
    label: 'Chat start rate',
    description: 'Share of mutual matches where someone sends a first message.',
    target: '60 percent or higher when contextual openers are available.',
  );

  static const dimensionRatings = EventSuccessMetric(
    id: 'dimension_ratings',
    label: 'Dimension ratings',
    description: 'Welcome, crowd balance, structure, safety, and venue scores.',
    target: 'Use private coaching before public host-quality labels.',
  );

  static const core = <EventSuccessMetric>[
    checkInRate,
    introCoverage,
    wingmanRequestRate,
    mutualMatchRate,
    chatStartRate,
    dimensionRatings,
  ];
}
