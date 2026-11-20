// Marketing capture `host_create_first_event`. One file per marketing capture keeps each
// capture's inputs to its own imports; see docs/marketing_app_media_pipeline.md.

import 'package:catch_dating_app/contexts/events/data/event_repository.dart';
import 'package:catch_dating_app/contexts/events/domain/event.dart';
import 'package:catch_dating_app/hosts/create/create_screen.dart';
import 'package:catch_kernel/activity_taxonomy.dart';
import '../../fixtures/sales_demo_synthetic_fixtures.dart';
import '../../support/capture_device.dart';
import '../screen_capture_entry.dart';
import '../shared/capture_fixtures.dart';
import '../shared/marketing_guest_story.dart';
import '../shared/marketing_host_organizer.dart';

// In the create flow a trivia night is the Quiz or trivia format, so the draft
// carries what choosing it sets (CreateController.setFormat), and the
// description Meher publishes.
final _draft = hostMarketingIndiaScenario
    .setupDraft(captureFixtures)
    .copyWith(
      activityKind: ActivityKind.pubQuiz.name,
      interactionModel: ActivityKind.pubQuiz.defaultInteractionModel.name,
      customActivityLabel: null,
      description: marketingGuestEvent.description,
    );

// Meher creating Evening Club's first event in Catch Host the day before:
// the first step of the create flow, filled with Saturday Trivia Social.
final hostCreateFirstEventCapture = ScreenCaptureEntry(
  id: 'host_create_first_event',
  routeIds: const <String>['hostCreateEventScreen'],
  device: CaptureDevice.genericPhone,
  marketingFixtureKeys: const <String>[
    'hostMarketingIndia.host.createFirstEvent',
  ],
  disableAnimations: true,
  providerOverrides: <Object>[
    watchEventsForOrganizerProvider(
      marketingHostOrganizer.id,
    ).overrideWith((ref) => Stream.value(const <Event>[])),
  ],
  builder: (context) => CreateScreen(
    organizer: marketingHostOrganizer,
    userId: hostMarketingIndiaScenario.scenario.host.uid,
    initialDraft: _draft,
    now: hostMarketingIndiaScenario.clock('planning'),
  ),
);
