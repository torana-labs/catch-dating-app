// Marketing capture `host_response_phone`. One file per marketing capture keeps each
// capture's inputs to its own imports; see docs/marketing_app_media_pipeline.md.

import '../../../hosts/forms/forms_captures.dart';
import '../../support/capture_device.dart';
import '../screen_capture_entry.dart';

final hostResponsePhoneCapture = ScreenCaptureEntry(
  id: 'host_response_phone',
  routeIds: const <String>['hostFormResponseDetailScreen'],
  device: CaptureDevice.claudePhone390,
  marketingFixtureKeys: const <String>['hostAudience.forms.response'],
  builder: (_) => hostFormsCaptures['host_response_phone']!(),
);
