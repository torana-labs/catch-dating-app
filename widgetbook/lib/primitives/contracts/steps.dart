import 'package:catch_dating_app/core/presentation/catch_ui_copy.dart';
import 'package:catch_dating_app/l10n/l10n.dart';
import 'package:catch_tokens/catch_tokens.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/material.dart';
import 'package:widgetbook_annotation/widgetbook_annotation.dart' as widgetbook;
import 'package:widgetbook_workspace/support/contract_preview.dart';

import '../../preview_layout_contracts.dart';

@widgetbook.UseCase(
  name: 'Contract states',
  type: CatchStepList,
  path: '[Core primitives]/Sections',
)
Widget catchStepRowListContractStates(BuildContext context) {
  final t = CatchTokens.of(context);

  return WidgetbookContractFrame(
    title: 'CatchStepList',
    contractId: 'catch.journey_steps',
    states: const [
      'numbered-trace',
      'titles-only',
      'accented',
      'long-copy',
      'timed',
    ],
    children: [
      const WidgetbookContractStateCard(
        label: 'numbered-trace',
        child: CatchStepList(
          steps: [
            CatchStepRowData(
              title: 'Pick your room',
              body: 'Choose the event format and guest count.',
            ),
            CatchStepRowData(
              title: 'Confirm the guest list',
              body: 'Review attendance, private access, and reminders.',
            ),
            CatchStepRowData(
              title: 'Host the moment',
              body: 'Use check-in and post-event tools from the same flow.',
            ),
          ],
        ),
      ),
      WidgetbookContractStateCard(
        label: 'titles-only',
        child: CatchStepList(
          accent: t.success,
          steps: const [
            CatchStepRowData(title: 'Arrive'),
            CatchStepRowData(title: 'Check in'),
            CatchStepRowData(title: 'Start matching'),
          ],
        ),
      ),
      WidgetbookContractStateCard(
        label: 'accented',
        child: CatchStepList(
          accent: t.like,
          steps: const [
            CatchStepRowData(
              title: 'Open requests',
              body: 'Let the host approve a balanced room.',
            ),
            CatchStepRowData(
              title: 'Send reminders',
              body: 'Guests receive the final timing and arrival notes.',
            ),
          ],
        ),
      ),
      const WidgetbookContractStateCard(
        label: 'long-copy',
        child: SizedBox(
          width: WidgetbookPreviewLayout.standardContractWidth,
          child: CatchStepList(
            steps: [
              CatchStepRowData(
                title:
                    'A longer step title that should wrap without pushing the trace out of alignment',
                body:
                    'Long supporting copy stays in the content column while the numbered rail keeps a stable width.',
              ),
              CatchStepRowData(
                title: 'A concise final step',
                body: 'The trace ends without a dangling connector.',
              ),
            ],
          ),
        ),
      ),
      WidgetbookContractStateCard(
        label: 'timed, with tags',
        child: CatchStepList(
          accent: t.primary,
          steps: const [
            CatchStepRowData(
              marker: '5:45',
              title: 'Meet at Carter Road jetty',
              body: 'Bag drop, water and a quick warm-up.',
              tag: 'Pace groups: 6:00, 6:45 and 7:30 per km',
            ),
            CatchStepRowData(
              marker: '6:00',
              title: 'Run to Bandstand and back',
              body: 'Water at 5K and 10K.',
            ),
            CatchStepRowData(marker: '8:30', title: 'Breakfast at the jetty'),
          ],
        ),
      ),
    ],
  );
}

@widgetbook.UseCase(
  name: 'Contract states',
  type: CatchStepHeader,
  path: '[Core primitives]/Navigation',
)
Widget catchStepHeaderContractStates(BuildContext context) {
  return WidgetbookContractFrame(
    title: 'CatchStepHeader',
    contractId: 'catch.step_header',
    states: const [
      'with-progress',
      'without-progress',
      'with-back',
      'with-close',
      'interactive-step-overview',
      'no-back',
      'custom-trailing',
      'no-gutter',
    ],
    children: [
      WidgetbookContractStateCard(
        label: 'with-progress',
        child: WidgetbookContractTopBarFrame(
          child: CatchStepHeader(
            stepLabelBuilder: catchStepHeaderLabelBuilder(context.l10n),
            compactStepLabelBuilder: catchStepHeaderCompactLabelBuilder(
              context.l10n,
            ),
            title: 'Create event',
            subtitle: 'Set up the room',
            step: 2,
            total: 5,
            onBack: widgetbookNoop,
          ),
        ),
      ),
      WidgetbookContractStateCard(
        label: 'without-progress',
        child: WidgetbookContractTopBarFrame(
          child: CatchStepHeader(
            stepLabelBuilder: catchStepHeaderLabelBuilder(context.l10n),
            compactStepLabelBuilder: catchStepHeaderCompactLabelBuilder(
              context.l10n,
            ),
            title: 'Preferences',
          ),
        ),
      ),
      WidgetbookContractStateCard(
        label: 'with-back',
        child: WidgetbookContractTopBarFrame(
          child: CatchStepHeader(
            stepLabelBuilder: catchStepHeaderLabelBuilder(context.l10n),
            compactStepLabelBuilder: catchStepHeaderCompactLabelBuilder(
              context.l10n,
            ),
            title: 'Guest list',
            onBack: widgetbookNoop,
          ),
        ),
      ),
      WidgetbookContractStateCard(
        label: 'with-close',
        child: WidgetbookContractTopBarFrame(
          child: CatchStepHeader(
            stepLabelBuilder: catchStepHeaderLabelBuilder(context.l10n),
            compactStepLabelBuilder: catchStepHeaderCompactLabelBuilder(
              context.l10n,
            ),
            title: 'Create event',
            leadingType: CatchTopBarNavigationMode.close,
            onBack: widgetbookNoop,
          ),
        ),
      ),
      WidgetbookContractStateCard(
        label: 'interactive-step-overview',
        child: WidgetbookContractTopBarFrame(
          child: CatchStepHeader(
            stepLabelBuilder: catchStepHeaderLabelBuilder(context.l10n),
            compactStepLabelBuilder: catchStepHeaderCompactLabelBuilder(
              context.l10n,
            ),
            title: 'Create event',
            step: 3,
            total: 5,
            onStepOverview: widgetbookNoop,
            stepOverviewSemanticsLabel: 'Review all event sections',
          ),
        ),
      ),
      WidgetbookContractStateCard(
        label: 'no-back',
        child: WidgetbookContractTopBarFrame(
          child: CatchStepHeader(
            stepLabelBuilder: catchStepHeaderLabelBuilder(context.l10n),
            compactStepLabelBuilder: catchStepHeaderCompactLabelBuilder(
              context.l10n,
            ),
            title: 'Finished',
            showBack: false,
          ),
        ),
      ),
      WidgetbookContractStateCard(
        label: 'custom-trailing',
        child: WidgetbookContractTopBarFrame(
          child: CatchStepHeader(
            stepLabelBuilder: catchStepHeaderLabelBuilder(context.l10n),
            compactStepLabelBuilder: catchStepHeaderCompactLabelBuilder(
              context.l10n,
            ),
            title: 'Review',
            trailing: const CatchBadge(label: 'DRAFT'),
          ),
        ),
      ),
      WidgetbookContractStateCard(
        label: 'no-gutter',
        child: WidgetbookContractTopBarFrame(
          child: CatchStepHeader(
            stepLabelBuilder: catchStepHeaderLabelBuilder(context.l10n),
            compactStepLabelBuilder: catchStepHeaderCompactLabelBuilder(
              context.l10n,
            ),
            title: 'Embedded',
            gutter: false,
          ),
        ),
      ),
    ],
  );
}
