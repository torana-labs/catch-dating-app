// Marketing capture `host_organizer_payments_phone`. One file per marketing capture keeps each
// capture's inputs to its own imports; see docs/marketing_app_media_pipeline.md.

import 'package:catch_dating_app/design_fixtures/host_operations_fixtures.dart';
import '../../../hosts/organizer/organizer_captures.dart';
import '../../support/capture_device.dart';
import '../screen_capture_entry.dart';
import '../shared/host_routed_shell_capture.dart';
import '../shared/host_shell_capture_overrides.dart';

final hostOrganizerPaymentsPhoneCapture = ScreenCaptureEntry(
  id: 'host_organizer_payments_phone',
  routeIds: const <String>['hostOrganizerPaymentsScreen'],
  device: CaptureDevice.claudePhone390,
  marketingFixtureKeys: const <String>['hostOrganizer.payments'],
  providerOverrides: [
    ...hostShellCaptureOverrides(HostOperationsFixtures.hostUid),
    ...hostOperationsProviderOverrides(
      hostedOrganizers: [organizerCaptureOrganizer],
      ownedOrganizers: [organizerCaptureOrganizer],
    ),
    ...organizerCaptureOverrides(),
  ],
  builder: (context) => organizerPaymentsCapture(),
);
