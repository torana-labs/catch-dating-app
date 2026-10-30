import 'package:catch_dating_app/design_fixtures/host_operations_fixtures.dart';
import 'package:catch_dating_app/hosts/events/presentation/host_event_entry_sheet.dart';
import 'package:catch_dating_app/hosts/events/presentation/host_event_entry_state.dart';
import 'package:catch_tokens/catch_tokens.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/material.dart';
import 'package:widgetbook_annotation/widgetbook_annotation.dart' as widgetbook;

import '../../support/geometry_preview.dart';
import '../../support/widgetbook_harness.dart';

@widgetbook.UseCase(
  name: 'Create event modal · production',
  type: CatchSection,
  path: '[Geometry system]',
)
Widget createEventModalSectionComparison(BuildContext context) {
  return widgetbookGeometryPage(
    context,
    fitContentKey: widgetbookCatalogContentKey,
    title: 'Create event modal',
    contractIds: const ['catch.bottom_sheet', 'catch.section', 'catch.field'],
    principles: const [
      'The bottom sheet owns the overlay plane and terminal device-safe region.',
      'Flat field groups align every starting path with the sheet title.',
      'Group kickers and sibling rules belong to CatchSection; the standard sheet owns height and scrolling.',
      'This page renders HostEventEntrySheet directly; it does not maintain a review-only modal implementation.',
    ],
    children: [
      widgetbookGeometrySpecimen(
        context,
        label: 'Production composition',
        description:
            'The simulated device inset exposes the production sheet safe region. Row interaction is disabled only so a preview tap cannot dismiss the Widgetbook route.',
        child: SizedBox(
          width: widgetbookGeometryComponentWidth,
          child: _HostEventModalFrame(
            child: IgnorePointer(
              child: HostEventEntrySheet(state: _hostEventEntryComparisonState),
            ),
          ),
        ),
      ),
    ],
  );
}

class _HostEventModalFrame extends StatelessWidget {
  const _HostEventModalFrame({required this.child});

  final Widget child;

  @override
  Widget build(BuildContext context) {
    final t = CatchTokens.of(context);
    final mediaQuery = MediaQuery.of(context);

    return DecoratedBox(
      decoration: BoxDecoration(
        color: t.bg,
        border: Border.all(color: t.line),
        borderRadius: BorderRadius.circular(CatchRadius.lg),
      ),
      child: Padding(
        padding: const EdgeInsets.only(top: CatchSpacing.s5),
        child: MediaQuery(
          data: mediaQuery.copyWith(
            viewPadding: mediaQuery.viewPadding.copyWith(bottom: 34),
          ),
          child: child,
        ),
      ),
    );
  }
}

final _hostEventEntryComparisonState = HostEventEntryState.resolve(
  organizerId: HostOperationsFixtures.primaryOrganizer.id,
  drafts: [HostOperationsFixtures.eventDraft],
  repeatSource: HostOperationsFixtures.upcomingEvent,
);
