import 'package:catch_dating_app/contexts/organizers/data/host_event_staff_repository.dart';
import 'package:catch_dating_app/hosts/programmes/staff/staff_event_screen.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:widgetbook_annotation/widgetbook_annotation.dart' as widgetbook;

// The event a staff member opens from the work list. An active grant opens
// the door (see the door cases); a cancelled event says so instead.

const _staffPath = '[P1 product surfaces]/Host/Staff';
const _eventId = 'quiz-night';

@widgetbook.UseCase(
  name: 'Cancelled event',
  type: StaffEventScreen,
  path: _staffPath,
)
Widget staffEventScreenCancelledUseCase(BuildContext context) => ProviderScope(
  overrides: [
    hostEventOperatorAccessProvider(_eventId).overrideWithValue(
      AsyncData(
        HostEventOperatorAccess(
          eventId: _eventId,
          organizerId: 'org-1',
          title: 'Quiz night',
          startAt: DateTime(2030, 6, 21, 19),
          endAt: DateTime(2030, 6, 21, 22),
          eventStatus: 'cancelled',
          actorRole: HostEventOperatorRole.operator,
          permissions: const {HostEventOperatorPermission.viewRoster},
          grantExpiresAt: DateTime(2030, 6, 22, 1),
        ),
      ),
    ),
  ],
  child: const StaffEventScreen(eventId: _eventId),
);
