import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/material.dart';
import 'package:widgetbook_annotation/widgetbook_annotation.dart' as widgetbook;
import 'package:widgetbook_workspace/support/contract_preview.dart';

const _copy = CatchTimelineListCopy(done: 'Done', current: 'Now', next: 'Next');

@widgetbook.UseCase(
  name: 'Contract states',
  type: CatchTimelineList,
  path: '[Core patterns]/Sections',
)
Widget catchTimelineListContractStates(BuildContext context) =>
    WidgetbookContractFrame(
      title: 'CatchTimelineList',
      contractId: 'catch.section.timeline_list',
      states: const [
        'done',
        'current',
        'current-warning',
        'current-danger',
        'next',
      ],
      children: [
        for (final (label, tone) in const [
          ('neutral', CatchSectionStepTone.neutral),
          ('warning', CatchSectionStepTone.warning),
          ('danger', CatchSectionStepTone.danger),
        ])
          WidgetbookContractStateCard(
            label: label,
            child: CatchTimelineList(
              copy: _copy,
              steps: [
                const CatchSectionStep(
                  title: 'Someone nominated Afterfly',
                  subtitle: 'Catch built a page from luma.com/afterfly',
                  meta: 'Mon 28 Oct',
                  status: CatchSectionStepStatus.done,
                ),
                CatchSectionStep(
                  title: 'You asked to claim it',
                  subtitle: 'We check claims within a day',
                  meta: 'Today',
                  status: CatchSectionStepStatus.current,
                  tone: tone,
                ),
                const CatchSectionStep(
                  title: 'Run your page',
                  subtitle: 'Edit it, add photos, connect payments',
                  meta: 'Next',
                  status: CatchSectionStepStatus.next,
                ),
              ],
            ),
          ),
      ],
    );
