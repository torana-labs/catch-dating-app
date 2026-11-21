// Marketing capture `host_live_scores_standings_fragment`: one widget cut out of `host_live_scores_phone`, so its
// names and numbers are that screen's. One file per marketing capture keeps
// each capture's inputs to its own imports; see
// docs/marketing_app_media_pipeline.md.

import 'package:catch_ui/catch_ui.dart';
import 'package:flutter_test/flutter_test.dart';

import '../../support/capture_device.dart';
import '../../support/capture_fragment.dart';
import '../screen_capture_entry.dart';
import '../shared/capture_fragments.dart';
import 'host_live_scores_phone.dart';

final hostLiveScoresStandingsFragmentCapture = ScreenCaptureEntry(
  id: 'host_live_scores_standings_fragment',
  routeIds: const <String>['hostAppEventManageScreen'],
  device: CaptureDevice.fragmentPhone,
  marketingFixtureKeys: const <String>[
    'hostMarketingIndia.host.liveScores.standings',
  ],
  providerOverrides: hostLiveScoresPhoneCapture.providerOverrides,
  builder: hostLiveScoresPhoneCapture.builder,
  fragment: CaptureFragment(
    find: () =>
        nearestFragment(find.text('Standings if you save now'), CatchSurface),
    padding: fragmentCardPadding,
  ),
);
