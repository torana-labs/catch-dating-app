import 'package:catch_dating_app/hosts/organizer/live_guide_body.dart';
import 'package:catch_dating_app/hosts/organizer/live_guide_screen.dart';
import 'package:catch_test_support/design_fixtures/host_operations_fixtures.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:widgetbook_annotation/widgetbook_annotation.dart' as widgetbook;

// The organizer live event guide: the owner tunes it, a manager reads it.

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
