// Marketing capture `host_formats_courts_sitting_out_fragment`: one widget cut out of `host_formats_courts_phone`, so its
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

final hostFormatsCourtsSittingOutFragmentCapture = ScreenCaptureEntry(
  id: 'host_formats_courts_sitting_out_fragment',
  routeIds: const <String>['hostAppEventManageScreen'],
  device: CaptureDevice.fragmentPhone,
  marketingFixtureKeys: const <String>[
    'hostMarketingIndia.host.formatsCourts.sittingOut',
  ],
  providerOverrides: hostFormatsCourtsPhoneCapture.providerOverrides,
  builder: hostFormatsCourtsPhoneCapture.builder,
  fragment: CaptureFragment(
    find: () => find.byKey(const ValueKey<String>('formats-sitter-Neel Shah')),
    padding: fragmentRowPadding,
  ),
);
