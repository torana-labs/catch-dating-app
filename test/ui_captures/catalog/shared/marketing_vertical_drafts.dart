// Capture fixtures shared by more than one catalog entry. Only the entries
// that import this file depend on it.
//
// The first step of the create flow, filled in for each kind of host the
// website's vertical pages speak to: the start-the-trial bands show the event
// that host would make first.

import 'package:catch_dating_app/contexts/events/data/event_repository.dart';
import 'package:catch_dating_app/contexts/events/domain/event.dart';
import 'package:catch_dating_app/hosts/create/create_screen.dart';
import 'package:catch_kernel/activity_taxonomy.dart';
import 'package:flutter/widgets.dart';
import '../../fixtures/sales_demo_synthetic_fixtures.dart';
import 'capture_fixtures.dart';
import 'marketing_host_organizer.dart';

/// One vertical's first event, as the host types it on the first step.
typedef MarketingVerticalDraft = ({
  String name,
  ActivityKind kind,
  String description,
});

const marketingVerticalDrafts = <String, MarketingVerticalDraft>{
  'colleges': (
    name: "Freshers' Film Screening",
    kind: ActivityKind.openActivity,
    description:
        'A cult classic in the main auditorium, at the student price. Doors at 7, snacks in the lobby.',
  ),
  'communities': (
    name: 'Monthly Book Club',
    kind: ActivityKind.openActivity,
    description:
        "This month's book is short enough to finish in a weekend. Small tables, one question each to start.",
  ),
  'nightlife': (
    name: 'Friday Bandra Pub Crawl',
    kind: ActivityKind.barCrawl,
    description:
        'Four bars in small groups, with a new mix at every stop. Last stop by midnight.',
  ),
  'racket-sports': (
    name: 'Friday Pickleball Mixer',
    kind: ActivityKind.pickleball,
    description:
        'Two hours of doubles on four courts. Partners rotate every game, so you play with everyone.',
  ),
  'run-clubs': (
    name: 'Sunday 6 AM Social Run',
    kind: ActivityKind.socialRun,
    description:
        '5K along the sea face at three paces, then chai at the corner stall. Everyone finishes together.',
  ),
  'studios': (
    name: 'Saturday Sunrise Yoga',
    kind: ActivityKind.yoga,
    description:
        'An hour of slow flow for every level, mats provided. Stay for coffee after.',
  ),
  'supper-clubs': (
    name: 'Supper for Twelve',
    kind: ActivityKind.dinner,
    description:
        'Five courses at one long table. Seats are set so you sit next to someone new.',
  ),
  'teams': (
    name: 'Friday Team Social',
    kind: ActivityKind.openActivity,
    description:
        'Drinks and small games in groups that mix teams. Colleagues only, from the private link.',
  ),
  'venues': (
    name: 'Thursday Open Mic',
    kind: ActivityKind.openActivity,
    description:
        'Eight slots for music, comedy or poetry. Sign up for a slot or just come and listen.',
  ),
};

/// The create flow's first step for [vertical], with nothing published yet.
Widget marketingVerticalCreateCapture(String vertical) {
  final values = marketingVerticalDrafts[vertical]!;
  final draft = hostMarketingIndiaScenario
      .setupDraft(captureFixtures)
      .copyWith(
        name: values.name,
        activityKind: values.kind.name,
        interactionModel: values.kind.defaultInteractionModel.name,
        customActivityLabel: null,
        description: values.description,
        distance: values.kind == ActivityKind.socialRun ? '5' : null,
      );
  return CreateScreen(
    organizer: marketingHostOrganizer,
    userId: hostMarketingIndiaScenario.scenario.host.uid,
    initialDraft: draft,
    now: hostMarketingIndiaScenario.clock('planning'),
  );
}

/// The organiser has no events yet: this is the first one.
List<Object> marketingVerticalCreateOverrides() => <Object>[
  watchEventsForOrganizerProvider(
    marketingHostOrganizer.id,
  ).overrideWith((ref) => Stream.value(const <Event>[])),
];
