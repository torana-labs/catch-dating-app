// Marketing capture `host_application_detail`. One file per marketing capture keeps each
// capture's inputs to its own imports; see docs/marketing_app_media_pipeline.md.

import 'package:catch_dating_app/contexts/audience/data/crm/host_saved_audience_repository.dart';
import 'package:catch_dating_app/contexts/forms/data/host_application_repository.dart';
import 'package:catch_dating_app/contexts/forms/domain/forms/host_form_response.dart';
import 'package:catch_dating_app/hosts/presentation/applications/host_application_detail_screen.dart';
import 'package:catch_dating_app/hosts/presentation/forms/host_form_operations_controller.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart' show AsyncData;
import '../../fixtures/host_audience_journey_fixture.dart';
import '../../support/capture_device.dart';
import '../screen_capture_entry.dart';

// One guest's application to a Saturday social in Catch Host: their answers,
// a note only the team sees, and Offer a place.
final hostApplicationDetailCapture = ScreenCaptureEntry(
  id: 'host_application_detail',
  routeIds: const <String>['hostApplicationDetailScreen'],
  device: CaptureDevice.iphone17Pro,
  marketingFixtureKeys: const <String>['hostAudience.applications.detail'],
  builder: (_) => const HostApplicationDetailScreen(
    organizerId: 'org_1',
    applicationId: 'design-application-1',
  ),
  providerOverrides: [
    hostFormResponseDetailProvider(
      organizerId: 'org_1',
      responseId: _journey.responseId,
    ).overrideWith(
      (_) async =>
          HostFormResponseDetail.fromCallableData(_journey.responseData()),
    ),
    hostSavedAudienceFilterOptionsProvider(
      'org_1',
    ).overrideWith((_) async => _journey.filterOptions),
    hostApplicationDetailProvider(
      'org_1',
      'design-application-1',
    ).overrideWithValue(AsyncData(_journey.application())),
  ],
  includeOverlays: true,
);

final _journey = HostAudienceJourneyFixture.maya;
