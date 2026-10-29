import 'package:catch_dating_app/contexts/live/domain/event_rehearsal.dart';
import 'package:catch_dating_app/event_rehearsal/presentation/widgets/event_rehearsal_guest_link_section.dart';
import 'package:catch_dating_app/event_rehearsal/presentation/widgets/event_rehearsal_simulator_body.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/material.dart';
import 'package:widgetbook_annotation/widgetbook_annotation.dart' as widgetbook;

import 'rehearsal_settings_use_cases.dart'
    show loadRehearsalSettingsPreviewFixture;

const _path = '[P1 product surfaces]/Event Success/Rehearsal run';

@widgetbook.UseCase(
  name: 'Guest link',
  type: EventRehearsalGuestLinkSection,
  path: _path,
)
Widget rehearsalGuestLinkSection(BuildContext context) => _RehearsalPreview(
  builder: (rehearsal) => EventRehearsalGuestLinkSection(
    guestUrl: rehearsal.guestUrl,
    isLoading: false,
    onCopy: () {},
    onShare: () {},
    onRotate: () {},
  ),
);

@widgetbook.UseCase(
  name: 'Run controls',
  type: EventRehearsalRunSection,
  path: _path,
)
Widget rehearsalRunSection(BuildContext context) => _RehearsalPreview(
  builder: (rehearsal) => EventRehearsalRunSection(
    session: rehearsal.session,
    isLoading: false,
    onControl: (_, _) {},
  ),
);

@widgetbook.UseCase(
  name: 'Simulator',
  type: EventRehearsalSimulatorBody,
  path: _path,
)
Widget rehearsalSimulatorBody(BuildContext context) => _RehearsalPreview(
  builder: (rehearsal) => EventRehearsalSimulatorBody(
    rehearsal: rehearsal,
    isLoading: false,
    onBehavior: (_, _) {},
    onFault: (_) {},
  ),
);

@widgetbook.UseCase(
  name: 'Roster',
  type: EventRehearsalRosterSection,
  path: _path,
)
Widget rehearsalRosterSection(BuildContext context) => _RehearsalPreview(
  builder: (rehearsal) => EventRehearsalRosterSection(rehearsal: rehearsal),
);

@widgetbook.UseCase(
  name: 'Recap',
  type: EventRehearsalRecapSection,
  path: _path,
)
Widget rehearsalRecapSection(BuildContext context) => _RehearsalPreview(
  builder: (rehearsal) => EventRehearsalRecapSection(
    rehearsal: rehearsal,
    isLoading: false,
    onReset: () {},
    onFork: () {},
    onExport: () {},
  ),
);

/// Loads the shared rehearsal fixture once and renders one section from it.
class _RehearsalPreview extends StatelessWidget {
  const _RehearsalPreview({required this.builder});

  final Widget Function(EventRehearsalBootstrap rehearsal) builder;

  @override
  Widget build(BuildContext context) => FutureBuilder<EventRehearsalBootstrap>(
    future: loadRehearsalSettingsPreviewFixture(),
    builder: (context, async) {
      if (async.hasError) return Text('Preview unavailable: ${async.error}');
      if (!async.hasData) return const CatchLoadingIndicator();
      return SingleChildScrollView(
        padding: CatchInsets.content,
        child: builder(async.requireData),
      );
    },
  );
}
