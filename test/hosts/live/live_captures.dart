import 'package:catch_dating_app/design_fixtures/host_operations_fixtures.dart';
import 'package:catch_dating_app/hosts/live/live_controller.dart';
import 'package:catch_dating_app/hosts/live/live_needs_screen.dart';
import 'package:catch_dating_app/hosts/live/live_scores_screen.dart';
import 'package:catch_dating_app/hosts/live/live_scores_state.dart';
import 'package:catch_dating_app/hosts/live/live_screen.dart';
import 'package:catch_dating_app/hosts/live/live_state.dart';
import 'package:flutter/widgets.dart';
import 'package:riverpod/misc.dart' show Override;

import 'live_fixtures.dart';

/// The live console's capture fixtures: Tuesday Trivia Night in round two,
/// four minutes into the step, with two guests needing the host.

/// The landscape tablet the operations layout is drawn for.
const hostLiveTabletLandscapeSize = Size(1194, 834);

/// Four minutes into the second step.
DateTime get hostLiveCaptureNow =>
    livePlanSteps(1)[1].startsAt.add(const Duration(minutes: 4, seconds: 20));

final HostLiveState _state = liveState(
  needs: [
    HostLiveHelpNeed(liveHelpRequest()),
    HostLiveArrivalNeed(liveArrival),
    HostLiveDeliveryNeed(liveDelivery()),
  ],
  units: const [
    HostLiveUnit(label: 'Harbour Lights', seated: 3, size: 4),
    HostLiveUnit(label: 'Quizzy Rascals', seated: 4, size: 4),
  ],
);

const HostLiveScoresState _scores = HostLiveScoresState(
  status: HostLiveScoresStatus.ready,
  units: [
    HostLiveScoreUnit(id: 'qr', label: 'Quizzy Rascals', total: 41),
    HostLiveScoreUnit(id: 'hl', label: 'Harbour Lights', total: 38),
    HostLiveScoreUnit(id: 'vp', label: 'Vada Pav Theory', total: 35),
    HostLiveScoreUnit(id: 'lo', label: 'The Late Ones', total: 29),
  ],
  roundIndex: 1,
  standingsRevision: 4,
  liveControlRevision: 3,
  revealRoundIndex: 0,
  countdownSeconds: 10,
  standings: liveStandings,
);

/// The console's controllers answered with the fixture night.
List<Override> hostLiveCaptureOverrides() => [
  hostLiveControllerProvider(liveEvent).overrideWithValue(_state),
  hostLiveScoresControllerProvider(liveEvent).overrideWithValue(_scores),
];

Widget hostLiveNowCapture() => HostLiveScreen(
  organizer: HostOperationsFixtures.primaryOrganizer,
  event: liveEvent,
  onBack: () {},
  onOpenGuests: () {},
  now: hostLiveCaptureNow,
);

Widget hostLiveNeedsCapture() => HostLiveNeedsScreen(
  organizer: HostOperationsFixtures.primaryOrganizer,
  event: liveEvent,
  onOpenGuests: () {},
  now: hostLiveCaptureNow,
);

Widget hostLiveScoresCapture() => HostLiveScoresScreen(
  organizer: HostOperationsFixtures.primaryOrganizer,
  event: liveEvent,
  onOpenGuests: () {},
  now: hostLiveCaptureNow,
);
