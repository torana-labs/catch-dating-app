import 'package:catch_dating_app/core/presentation/catch_ui_copy.dart';
import 'package:catch_dating_app/l10n/l10n.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/material.dart';
import 'package:widgetbook_annotation/widgetbook_annotation.dart' as widgetbook;
import 'package:widgetbook_workspace/support/widgetbook_harness.dart';

@widgetbook.UseCase(
  name: 'Required and optional step metadata',
  type: CatchFormStepSpec,
  path: '[Core patterns]/Form review',
)
Widget formStepSpecificationStates(BuildContext context) {
  const steps = [
    CatchFormStepSpec(title: 'Event basics'),
    CatchFormStepSpec(title: 'Meeting point'),
    CatchFormStepSpec(title: 'Host notes', optional: true),
  ];
  return WidgetbookCatalogFrame(
    title: 'Form step metadata',
    catalogId: 'catch.form_step_list.spec',
    children: [
      CatchFormStepList(
        fieldCopy: catchFieldCopy(context.l10n),
        statusLabelBuilder: catchFormStepStatusLabelBuilder(context.l10n),
        onStepSelected: (_) {},
        items: [
          for (var index = 0; index < steps.length; index++)
            CatchFormStepReviewItem(
              index: index,
              title: formTitleForStep(steps, index),
              status: steps[index].optional
                  ? CatchFormStepListStatus.optional
                  : index == 0
                  ? CatchFormStepListStatus.complete
                  : CatchFormStepListStatus.needsInformation,
            ),
        ],
      ),
    ],
  );
}

@widgetbook.UseCase(
  name: 'Incomplete and submission-ready review',
  type: CatchFormReviewState,
  path: '[Core patterns]/Form review',
)
Widget formReviewReadinessStates(BuildContext context) =>
    WidgetbookCatalogFrame(
      title: 'Form review readiness',
      catalogId: 'catch.screen_body.form_review_state',
      children: [
        for (final complete in [false, true])
          Builder(
            builder: (context) {
              final review = CatchFormReviewState([
                CatchFormStepReviewItem(
                  index: 0,
                  title: 'Event basics',
                  status: complete
                      ? CatchFormStepListStatus.complete
                      : CatchFormStepListStatus.needsInformation,
                ),
                const CatchFormStepReviewItem(
                  index: 1,
                  title: 'Host notes',
                  status: CatchFormStepListStatus.optional,
                ),
              ]);
              return Column(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  Text(
                    review.firstIncompleteStep == null
                        ? 'Ready for submission'
                        : 'Required step ${review.firstIncompleteStep! + 1}',
                    style: CatchTextStyles.bodyM(context),
                  ),
                  CatchFormStepList(
                    fieldCopy: catchFieldCopy(context.l10n),
                    statusLabelBuilder: catchFormStepStatusLabelBuilder(
                      context.l10n,
                    ),
                    items: review.items,
                    onStepSelected: (_) {},
                  ),
                  CatchButton(
                    label: 'Submit',
                    onPressed: review.canSubmit ? () {} : null,
                  ),
                ],
              );
            },
          ),
      ],
    );

@widgetbook.UseCase(
  name: 'Shared accordion and save contract',
  type: CatchFormRowScope,
  path: '[Core patterns]/Form rows',
)
Widget formRowScopeStates(BuildContext context) => WidgetbookCatalogFrame(
  title: 'Form row scope',
  catalogId: 'catch.field',
  children: [
    for (final mode in CatchFormListMode.values)
      _FormRowScopeFields(mode: mode),
  ],
);

class _FormRowScopeFields extends StatefulWidget {
  const _FormRowScopeFields({required this.mode});

  final CatchFormListMode mode;

  @override
  State<_FormRowScopeFields> createState() => _FormRowScopeFieldsState();
}

class _FormRowScopeFieldsState extends State<_FormRowScopeFields> {
  final _accordion = CatchAccordionController(initialExpanded: 'name');
  String _name = 'Alex';
  String _city = 'Mumbai';

  @override
  void dispose() {
    _accordion.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) => CatchFormList<(String, String)>(
    fieldCopy: catchFieldCopy(context.l10n),
    title: widget.mode == CatchFormListMode.explicit
        ? 'Explicit confirmation'
        : 'Save on blur',
    accordion: _accordion,
    textCommitMode: widget.mode,
    rows: [
      CatchFormTextRow<(String, String)>(
        id: 'name',
        icon: CatchIcons.person,
        label: 'Name',
        currentValue: _name,
        validationCopy: catchFormValidationCopy(context.l10n),
        patchForValue: (value) => ('name', value as String),
      ),
      CatchFormTextRow<(String, String)>(
        id: 'city',
        icon: CatchIcons.location,
        label: 'City',
        currentValue: _city,
        validationCopy: catchFormValidationCopy(context.l10n),
        patchForValue: (value) => ('city', value as String),
      ),
    ],
    onSave: (patch) async {
      setState(() {
        if (patch.$1 == 'name') {
          _name = patch.$2;
        } else {
          _city = patch.$2;
        }
      });
      return true;
    },
    errorTextBuilder: (_, error) => error.toString(),
  );
}
