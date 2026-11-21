// Marketing capture `host_door_arriving_count_fragment`: one widget cut out of `host_door_arriving`, so its
// names and numbers are that screen's. One file per marketing capture keeps
// each capture's inputs to its own imports; see
// docs/marketing_app_media_pipeline.md.

import 'package:catch_ui/catch_ui.dart';
import 'package:flutter_test/flutter_test.dart';

import '../../support/capture_device.dart';
import '../../support/capture_fragment.dart';
import '../screen_capture_entry.dart';
import '../shared/capture_fragments.dart';
import 'host_door_arriving.dart';

final hostDoorArrivingCountFragmentCapture = ScreenCaptureEntry(
  id: 'host_door_arriving_count_fragment',
  routeIds: const <String>['hostEventRosterScreen'],
  device: CaptureDevice.fragmentPhone,
  marketingFixtureKeys: const <String>[
    'hostMarketingIndia.host.doorArriving.arrivalCount',
  ],
  providerOverrides: hostDoorArrivingCapture.providerOverrides,
  builder: hostDoorArrivingCapture.builder,
  fragment: CaptureFragment(
    find: () => nearestFragment(find.textContaining('of 26'), CatchStack),
    padding: fragmentCardPadding,
  ),
);
