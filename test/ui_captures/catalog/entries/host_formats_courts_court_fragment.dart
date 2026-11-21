// Marketing capture `host_formats_courts_court_fragment`: one widget cut out of `host_formats_courts_phone`, so its
// names and numbers are that screen's. One file per marketing capture keeps
// each capture's inputs to its own imports; see
// docs/marketing_app_media_pipeline.md.

import 'package:flutter/widgets.dart';
import 'package:flutter_test/flutter_test.dart';

import '../../support/capture_device.dart';
import '../../support/capture_fragment.dart';
import '../screen_capture_entry.dart';
import '../shared/capture_fragments.dart';
import 'host_formats_courts_phone.dart';

final hostFormatsCourtsCourtFragmentCapture = ScreenCaptureEntry(
  id: 'host_formats_courts_court_fragment',
  routeIds: const <String>['hostAppEventManageScreen'],
  device: CaptureDevice.fragmentPhone,
  marketingFixtureKeys: const <String>[
    'hostMarketingIndia.host.formatsCourts.courtRow',
  ],
  providerOverrides: hostFormatsCourtsPhoneCapture.providerOverrides,
  builder: hostFormatsCourtsPhoneCapture.builder,
  fragment: CaptureFragment(
    find: () => find.byKey(const ValueKey<String>('formats-court-0')),
    padding: fragmentRowPadding,
  ),
);
