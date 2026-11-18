import 'package:catch_dating_app/contexts/bookings/domain/event_attendee.dart';
import 'package:catch_dating_app/contexts/events/domain/event.dart';
import 'package:catch_dating_app/contexts/live/domain/event_close_out.dart';
import 'package:catch_dating_app/design_fixtures/host_operations_fixtures.dart';
import 'package:catch_dating_app/hosts/events/event_close_out_body.dart';
import 'package:catch_dating_app/hosts/events/event_close_out_state.dart';
import 'package:catch_dating_app/hosts/live/formats/formats_run_body.dart';
import 'package:catch_dating_app/hosts/live/formats/formats_run_controller.dart';
import 'package:catch_dating_app/hosts/live/formats/formats_run_screen.dart';
import 'package:catch_dating_app/hosts/live/formats/formats_run_state.dart';
import 'package:catch_dating_app/hosts/live/formats/formats_sweep_body.dart';
import 'package:catch_dating_app/hosts/live/formats/formats_sweep_controller.dart';
import 'package:catch_dating_app/hosts/live/formats/formats_sweep_screen.dart';
import 'package:catch_dating_app/hosts/live/formats/formats_sweep_state.dart';
import 'package:catch_tokens/catch_tokens.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:widgetbook_annotation/widgetbook_annotation.dart' as widgetbook;

import '../support/contract_preview.dart';

// The run console and the return sweep a night that moves ends on, with a
// Sunday social run: 29 of 32 back, Ira, Sid and Tara still out.

const _path = '[P1 product surfaces]/Host/Live/Formats';

final _start = DateTime(2026, 11, 8, 6, 30);
final _now = DateTime(2026, 11, 8, 7, 28);

final Event _run = HostOperationsFixtures.event(
  id: 'run-live-preview',
  organizer: HostOperationsFixtures.primaryOrganizer,
  start: _start,
  bookedCount: 32,
  checkedInCount: 32,
  capacityLimit: 40,
);

HostFormatsOut _out(String id, String name, String group) => HostFormatsOut(
  attendee: EventAttendee(
    id: id,
    eventId: _run.id,
    organizerId: _run.organizerId,
    displayName: name,
    searchName: name.toLowerCase(),
    source: EventAttendeeSource.catchBooking,
    status: EventAttendeeStatus.checkedIn,
    phoneE164: '+919800000001',
    checkedInAt: _start,
    createdAt: _start,
    updatedAt: _start,
  ),
  group: group,
);

final _stillOut = [
  _out('ira', 'Ira Kapoor', 'Chatty'),
  _out('sid', 'Sid Rao', 'Steady'),
  _out('tara', 'Tara Menon', 'Brisk'),
];

const _closeOut = HostEventCloseOutState(
  status: HostEventCloseOutStatus.ready,
  organizerId: 'organizer-preview',
  closeOut: EventCloseOut(
    revision: 1,
    thankYouAtLocal: '10:00',
    openStayInTouchPicks: true,
    noShowNote: false,
  ),
);

final _sweep = HostFormatsSweepState(
  status: HostFormatsSweepStatus.ready,
  checkedIn: 32,
  out: _stillOut,
  liveControlRevision: 3,
  closeOut: _closeOut,
);

final _runState = HostFormatsRunState(
  status: HostFormatsRunStatus.running,
  stepTitle: 'Back to the jetty',
  stepIndex: 1,
  stepCount: 2,
  pods: const [
    HostFormatsRunPod(
      id: 'chatty',
      label: 'Chatty',
      back: 10,
      total: 11,
      paceSecondsPerKm: 450,
    ),
    HostFormatsRunPod(
      id: 'steady',
      label: 'Steady',
      back: 13,
      total: 14,
      paceSecondsPerKm: 390,
    ),
    HostFormatsRunPod(
      id: 'brisk',
      label: 'Brisk',
      back: 6,
      total: 7,
      paceSecondsPerKm: 330,
    ),
  ],
  sweep: _sweep,
);

Widget _night(Widget child) => CatchRoot(
  theme: CatchThemeMode.night,
  format: CatchFormat.run,
  child: child,
);

@widgetbook.UseCase(
  name: 'On the way back',
  type: HostFormatsRunBody,
  path: _path,
)
Widget hostFormatsRunBodyUseCase(BuildContext context) => _night(
  HostFormatsRunBody(
    state: _runState,
    now: _now,
    onAccounted: (_) {},
    onCall: (_) {},
    onClose: widgetbookNoop,
    onRetry: widgetbookNoop,
  ),
);

@widgetbook.UseCase(
  name: 'On the way back',
  type: HostFormatsRunScreen,
  path: _path,
)
Widget hostFormatsRunScreenUseCase(BuildContext context) => ProviderScope(
  overrides: [
    hostFormatsRunControllerProvider(_run).overrideWithValue(_runState),
    hostFormatsSweepControllerProvider(_run).overrideWithValue(_sweep),
  ],
  child: HostFormatsRunScreen(
    organizer: HostOperationsFixtures.primaryOrganizer,
    event: _run,
    now: _now,
  ),
);

@widgetbook.UseCase(
  name: 'Three still out',
  type: HostFormatsSweepBody,
  path: _path,
)
Widget hostFormatsSweepBodyUseCase(BuildContext context) => _night(
  HostFormatsSweepBody(
    state: _sweep,
    onAccounted: (_) {},
    onCall: (_) {},
    onRetry: widgetbookNoop,
    options: _closeOut.options,
    onOption: (_, _) {},
  ),
);

@widgetbook.UseCase(
  name: 'Three still out',
  type: HostFormatsSweepScreen,
  path: _path,
)
Widget hostFormatsSweepScreenUseCase(BuildContext context) => ProviderScope(
  overrides: [
    hostFormatsSweepControllerProvider(_run).overrideWithValue(_sweep),
  ],
  child: HostFormatsSweepScreen(
    organizer: HostOperationsFixtures.primaryOrganizer,
    event: _run,
  ),
);

@widgetbook.UseCase(
  name: 'A runner and a crawl guest',
  type: HostFormatsOutRow,
  path: _path,
)
Widget hostFormatsOutRowUseCase(BuildContext context) => _night(
  CatchStack(
    children: [
      HostFormatsOutRow(
        person: _stillOut.first,
        crawl: false,
        onAccounted: widgetbookNoop,
        onCall: (_) {},
      ),
      HostFormatsOutRow(
        person: _stillOut.last,
        crawl: true,
        pending: true,
        onAccounted: widgetbookNoop,
        onCall: (_) {},
      ),
    ],
  ),
);

@widgetbook.UseCase(
  name: 'On and off',
  type: HostEventCloseOutOptionRow,
  path: '[P1 product surfaces]/Host/Events/Rows',
)
Widget hostEventCloseOutOptionRowUseCase(BuildContext context) => CatchStack(
  children: [
    HostEventCloseOutOptionRow(
      option: HostEventCloseOutOption.thankYou,
      on: true,
      onChanged: (_) {},
    ),
    HostEventCloseOutOptionRow(
      option: HostEventCloseOutOption.noShowNote,
      on: false,
      onChanged: (_) {},
    ),
  ],
);
