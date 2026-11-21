// Marketing capture `host_form_responses_new_fragment`: one widget cut out of `host_responses_phone`, so its
// names and numbers are that screen's. One file per marketing capture keeps
// each capture's inputs to its own imports; see
// docs/marketing_app_media_pipeline.md.

import 'package:flutter/widgets.dart';
import 'package:flutter_test/flutter_test.dart';

import '../../support/capture_device.dart';
import '../../support/capture_fragment.dart';
import '../screen_capture_entry.dart';
import '../shared/capture_fragments.dart';
import 'host_responses_phone.dart';

final hostFormResponsesNewFragmentCapture = ScreenCaptureEntry(
  id: 'host_form_responses_new_fragment',
  routeIds: const <String>['hostFormBuilderScreen', 'hostFormAnalyticsScreen'],
  device: CaptureDevice.fragmentPhone,
  marketingFixtureKeys: const <String>[
    'hostAudience.forms.responses.newResponse',
  ],
  builder: hostResponsesPhoneCapture.builder,
  fragment: CaptureFragment(
    find: () => find.byKey(const ValueKey<String>('host-responses-entry-tara')),
    padding: fragmentRowPadding,
  ),
);
