import 'package:catch_dating_app/l10n/l10n.dart';
import 'package:catch_dating_app/platform/l10n/catch_ui_copy.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/material.dart';
import 'package:widgetbook_annotation/widgetbook_annotation.dart' as widgetbook;
import 'package:widgetbook_workspace/support/contract_preview.dart';

import '../../preview_layout_contracts.dart';

@widgetbook.UseCase(
  name: 'Contract states',
  type: CatchFormStepList,
  path: '[Core primitives]/Navigation',
)
Widget catchFormStepListContractStates(BuildContext context) {
  final fieldCopy = catchFieldCopy(context.l10n);
  final statusLabelBuilder = catchFormStepStatusLabelBuilder(context.l10n);

  Widget stepList(List<CatchFormStepReviewItem> items) => CatchFormStepList(
    fieldCopy: fieldCopy,
    statusLabelBuilder: statusLabelBuilder,
    onStepSelected: (_) {},
    items: items,
  );

  return WidgetbookContractFrame(
    title: 'CatchFormStepList',
    contractId: 'catch.form_step_list',
    states: const [
      'complete',
      'needs-information',
      'optional',
      'mixed-progress',
      'long-title',
    ],
    children: [
      WidgetbookContractStateCard(
        label: 'complete',
        child: stepList(const [
          CatchFormStepReviewItem(
            index: 0,
            title: 'Event basics',
            status: CatchFormStepListStatus.complete,
          ),
          CatchFormStepReviewItem(
            index: 1,
            title: 'Meeting point',
            status: CatchFormStepListStatus.complete,
          ),
        ]),
      ),
      WidgetbookContractStateCard(
        label: 'needs-information',
        child: stepList(const [
          CatchFormStepReviewItem(
            index: 0,
            title: 'Tickets and pricing',
            status: CatchFormStepListStatus.needsInformation,
          ),
        ]),
      ),
      WidgetbookContractStateCard(
        label: 'optional',
        child: stepList(const [
          CatchFormStepReviewItem(
            index: 0,
            title: 'Host notes',
            status: CatchFormStepListStatus.optional,
          ),
        ]),
      ),
      WidgetbookContractStateCard(
        label: 'mixed-progress',
        child: stepList(const [
          CatchFormStepReviewItem(
            index: 0,
            title: 'Event basics',
            status: CatchFormStepListStatus.complete,
          ),
          CatchFormStepReviewItem(
            index: 1,
            title: 'Meeting point',
            status: CatchFormStepListStatus.needsInformation,
          ),
          CatchFormStepReviewItem(
            index: 2,
            title: 'Host notes',
            status: CatchFormStepListStatus.optional,
          ),
        ]),
      ),
      WidgetbookContractStateCard(
        label: 'long-title',
        child: SizedBox(
          width: WidgetbookPreviewLayout.standardContractWidth,
          child: stepList(const [
            CatchFormStepReviewItem(
              index: 0,
              title:
                  'Guest questions, dietary requirements and accessibility notes',
              status: CatchFormStepListStatus.needsInformation,
            ),
            CatchFormStepReviewItem(
              index: 1,
              title: 'A concise final section',
              status: CatchFormStepListStatus.complete,
            ),
          ]),
        ),
      ),
    ],
  );
}
