import 'package:catch_dating_app/hosts/forms/form_question_sheet.dart';
import 'package:catch_dating_app/hosts/forms/form_rule_field.dart';
import 'package:catch_dating_app/hosts/forms/form_section_sheet.dart';
import 'package:catch_dating_app/hosts/forms/host_forms_controller.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:widgetbook_annotation/widgetbook_annotation.dart' as widgetbook;

import 'host_form_workspace_use_cases.dart';
import 'operations/preview.dart';

const _path = '[P1 product surfaces]/Host operations/Forms';
const _organizerId = 'preview-organizer';
const _formId = 'preview-form';

class _PreviewEditor extends HostFormEditorController {
  @override
  bool editorBoundTo(String? accountId) => true;

  @override
  Future<HostFormEditorState> build(String organizerId, String formId) async =>
      hostFormPreviewState;
}

Widget _frame(Widget child) => WidgetbookHostDeviceFrame(
  child: CatchRoot(
    child: CatchScreen(body: CatchPageBody.screen(child: child)),
  ),
);

@widgetbook.UseCase(
  name: 'Question settings',
  type: HostFormQuestionSheet,
  path: _path,
)
Widget hostFormQuestionSheetPreview(BuildContext context) => ProviderScope(
  overrides: [
    hostFormEditorControllerProvider(
      _organizerId,
      _formId,
    ).overrideWith(_PreviewEditor.new),
  ],
  child: Consumer(
    builder: (context, ref, _) => _frame(
      HostFormQuestionSheet(
        definition: hostFormPreviewState.editor.definition,
        sectionIndex: 0,
        questionIndex: 0,
        editor: ref.read(
          hostFormEditorControllerProvider(_organizerId, _formId).notifier,
        ),
        onRemoved: () {},
      ),
    ),
  ),
);

@widgetbook.UseCase(name: 'Answer rule', type: HostFormRuleField, path: _path)
Widget hostFormRuleFieldPreview(BuildContext context) => _frame(
  HostFormRuleField(
    name: 'max-length',
    questionId: 'preview-question',
    title: 'Maximum characters',
    value: '140',
    input: HostFormRuleFieldInput.whole,
    onCommitted: (_) {},
  ),
);

@widgetbook.UseCase(
  name: 'Choose an answer type',
  type: HostFormKindPicker,
  path: _path,
)
Widget hostFormKindPickerPreview(BuildContext context) =>
    _frame(const HostFormKindPicker());

@widgetbook.UseCase(
  name: 'Edit a section',
  type: HostFormSectionSheet,
  path: _path,
)
Widget hostFormSectionSheetPreview(BuildContext context) => _frame(
  HostFormSectionSheet(
    title: 'About you',
    index: 0,
    count: 2,
    questionCount: 3,
    sectionId: 'preview-section',
    onTitleChanged: (_) {},
    onAddQuestion: () {},
    onMove: (_) {},
    onRemove: () {},
  ),
);
