// Marketing capture `host_formats_pods_needs_pod_fragment`: one widget cut out of `host_formats_pods_phone`, so its
// names and numbers are that screen's. One file per marketing capture keeps
// each capture's inputs to its own imports; see
// docs/marketing_app_media_pipeline.md.

import 'package:flutter/widgets.dart';
import 'package:flutter_test/flutter_test.dart';

import '../../support/capture_device.dart';
import '../../support/capture_fragment.dart';
import '../screen_capture_entry.dart';
import '../shared/capture_fragments.dart';
import 'host_formats_pods_phone.dart';

final hostFormatsPodsNeedsPodFragmentCapture = ScreenCaptureEntry(
  id: 'host_formats_pods_needs_pod_fragment',
  routeIds: const <String>['hostAppEventManageScreen'],
  device: CaptureDevice.fragmentPhone,
  marketingFixtureKeys: const <String>[
    'hostMarketingIndia.host.formatsPods.needsPod',
  ],
  providerOverrides: hostFormatsPodsPhoneCapture.providerOverrides,
  builder: hostFormatsPodsPhoneCapture.builder,
  fragment: CaptureFragment(
    find: () =>
        find.byKey(const ValueKey<String>('formats-unplaced-attendee-sameer')),
    padding: fragmentRowPadding,
  ),
);
