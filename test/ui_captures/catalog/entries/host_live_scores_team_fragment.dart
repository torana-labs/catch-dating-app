// Marketing capture `host_live_scores_team_fragment`: one widget cut out of `host_live_scores_phone`, so its
// names and numbers are that screen's. One file per marketing capture keeps
// each capture's inputs to its own imports; see
// docs/marketing_app_media_pipeline.md.

import 'package:flutter/widgets.dart';
import 'package:flutter_test/flutter_test.dart';

import '../../support/capture_device.dart';
import '../../support/capture_fragment.dart';
import '../screen_capture_entry.dart';
import '../shared/capture_fragments.dart';
import 'host_live_scores_phone.dart';

final hostLiveScoresTeamFragmentCapture = ScreenCaptureEntry(
  id: 'host_live_scores_team_fragment',
  routeIds: const <String>['hostAppEventManageScreen'],
  device: CaptureDevice.fragmentPhone,
  marketingFixtureKeys: const <String>[
    'hostMarketingIndia.host.liveScores.teamScore',
  ],
  providerOverrides: hostLiveScoresPhoneCapture.providerOverrides,
  builder: hostLiveScoresPhoneCapture.builder,
  fragment: CaptureFragment(
    find: () => find.byKey(const ValueKey<String>('host-live-scores-qr')),
    padding: fragmentRowPadding,
  ),
);
