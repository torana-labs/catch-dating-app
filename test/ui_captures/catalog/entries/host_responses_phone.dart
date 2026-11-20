// Marketing capture `host_responses_phone`. One file per marketing capture keeps each
// capture's inputs to its own imports; see docs/marketing_app_media_pipeline.md.

import '../../../hosts/forms/forms_captures.dart';
import '../../support/capture_device.dart';
import '../screen_capture_entry.dart';

final hostResponsesPhoneCapture = ScreenCaptureEntry(
  id: 'host_responses_phone',
  routeIds: const <String>['hostFormBuilderScreen', 'hostFormAnalyticsScreen'],
  device: CaptureDevice.claudePhone390,
  marketingFixtureKeys: const <String>['hostAudience.forms.responses'],
  builder: (_) => hostFormsCaptures['host_responses_phone']!(),
);
