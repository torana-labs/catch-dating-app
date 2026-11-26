import 'package:catch_dating_app/contexts/account/data/auth_repository.dart';
import 'package:catch_dating_app/contexts/organizers/domain/host_profile.dart';
import 'package:catch_dating_app/hosts/events/event_defaults_screen.dart';
import 'package:catch_dating_app/hosts/organizer/audience_body.dart';
import 'package:catch_dating_app/hosts/organizer/audience_screen.dart';
import 'package:catch_dating_app/hosts/organizer/audience_state.dart';
import 'package:catch_dating_app/hosts/organizer/event_policy_body.dart';
import 'package:catch_dating_app/hosts/organizer/event_policy_screen.dart';
import 'package:catch_dating_app/hosts/organizer/live_guide_body.dart';
import 'package:catch_dating_app/hosts/organizer/live_guide_screen.dart';
import 'package:catch_dating_app/hosts/organizer/profile_preview_sheet.dart';
import 'package:catch_test_support/design_fixtures/host_operations_fixtures.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:widgetbook_annotation/widgetbook_annotation.dart' as widgetbook;

// The organizer live event guide (the owner tunes it, a manager reads it),
// the event policy and event defaults it sits beside, and the host
// professional profile preview from Settings.

const _path = '[P1 product surfaces]/Host/Organizer';

final _organizer = HostOperationsFixtures.primaryOrganizer;

@widgetbook.UseCase(
  name: 'Owner tunes the guide',
  type: OrganizerLiveGuideBody,
  path: _path,
)
Widget organizerLiveGuideBodyOwnerUseCase(BuildContext context) =>
    OrganizerLiveGuideBody(
      defaults: _organizer.hostDefaults,
      editable: true,
      onChanged: (_) {},
    );

@widgetbook.UseCase(
  name: 'Manager reads the guide',
  type: OrganizerLiveGuideBody,
  path: _path,
)
Widget organizerLiveGuideBodyManagerUseCase(BuildContext context) =>
    OrganizerLiveGuideBody(
      defaults: _organizer.hostDefaults,
      editable: false,
      onChanged: (_) {},
    );

@widgetbook.UseCase(
  name: 'Before the organizer loads',
  type: OrganizerLiveGuideScreen,
  path: _path,
)
Widget organizerLiveGuideScreenUseCase(BuildContext context) =>
    ProviderScope(child: OrganizerLiveGuideScreen(organizerId: _organizer.id));

@widgetbook.UseCase(
  name: 'Active host with a bio',
  type: HostProfilePreviewSheet,
  path: _path,
)
Widget hostProfilePreviewSheetUseCase(BuildContext context) =>
    HostProfilePreviewSheet(
      profile: HostProfile(
        uid: HostOperationsFixtures.hostUid,
        displayName: 'Meher',
        roleTitle: 'Quizmaster',
        bio: 'Runs the Tuesday quiz and the summer pub crawl.',
        status: HostProfileStatus.active,
        createdAt: DateTime(2030),
        updatedAt: DateTime(2030),
      ),
      organizers: [_organizer],
    );

@widgetbook.UseCase(
  name: 'Audience unavailable',
  type: OrganizerAudienceBody,
  path: _path,
)
Widget organizerAudienceBodyUseCase(BuildContext context) =>
    OrganizerAudienceBody(
      state: OrganizerAudienceState(
        organizer: _organizer,
        eventCount: 12,
        upcomingCount: 3,
        audienceStatus: OrganizerAudienceStatus.unavailable,
      ),
      onRetry: () {},
    );

@widgetbook.UseCase(
  name: 'Before the organizer loads',
  type: OrganizerAudienceScreen,
  path: _path,
)
Widget organizerAudienceScreenUseCase(BuildContext context) =>
    ProviderScope(child: OrganizerAudienceScreen(organizerId: _organizer.id));

@widgetbook.UseCase(
  name: 'Owner edits the policy',
  type: OrganizerEventPolicyBody,
  path: _path,
)
Widget organizerEventPolicyBodyUseCase(BuildContext context) =>
    OrganizerEventPolicyBody(
      city: _organizer.location,
      defaults: _organizer.hostDefaults,
      editable: true,
      onChanged: (_) {},
    );

@widgetbook.UseCase(
  name: 'Before the organizer loads',
  type: OrganizerEventPolicyScreen,
  path: _path,
)
Widget organizerEventPolicyScreenUseCase(BuildContext context) => ProviderScope(
  child: OrganizerEventPolicyScreen(organizerId: _organizer.id),
);

@widgetbook.UseCase(
  name: 'Owner edits the policy',
  type: OrganizerEventPolicyEditor,
  path: _path,
)
Widget organizerEventPolicyEditorUseCase(BuildContext context) => ProviderScope(
  child: OrganizerEventPolicyEditor(organizer: _organizer, isOwner: true),
);

@widgetbook.UseCase(
  name: 'Manager reads the guide',
  type: OrganizerLiveGuideEditor,
  path: _path,
)
Widget organizerLiveGuideEditorUseCase(BuildContext context) => ProviderScope(
  child: OrganizerLiveGuideEditor(organizer: _organizer, isOwner: false),
);

@widgetbook.UseCase(
  name: 'Before the defaults load',
  type: HostEventDefaultsScreen,
  path: _path,
)
Widget hostEventDefaultsScreenUseCase(BuildContext context) => ProviderScope(
  overrides: [uidProvider.overrideWith((ref) => Stream.value(null))],
  child: HostEventDefaultsScreen(organizerId: _organizer.id),
);
