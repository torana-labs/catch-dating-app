// Marketing capture `host_formats_courts_rotate_fragment`: one widget cut out of `host_formats_courts_phone`, so its
// names and numbers are that screen's. One file per marketing capture keeps
// each capture's inputs to its own imports; see
// docs/marketing_app_media_pipeline.md.

import 'package:catch_ui/catch_ui.dart';
import 'package:flutter_test/flutter_test.dart';

import '../../support/capture_device.dart';
import '../../support/capture_fragment.dart';
import '../screen_capture_entry.dart';
import '../shared/capture_fragments.dart';
import 'host_formats_courts_phone.dart';

final hostFormatsCourtsRotateFragmentCapture = ScreenCaptureEntry(
  id: 'host_formats_courts_rotate_fragment',
  routeIds: const <String>['hostAppEventManageScreen'],
  device: CaptureDevice.fragmentPhone,
  marketingFixtureKeys: const <String>[
    'hostMarketingIndia.host.formatsCourts.rotateTimer',
  ],
  providerOverrides: hostFormatsCourtsPhoneCapture.providerOverrides,
  builder: hostFormatsCourtsPhoneCapture.builder,
  fragment: CaptureFragment(
    find: () => nearestFragment(find.text('Round 4 of 8'), CatchSurface),
    padding: fragmentCardPadding,
  ),
);
