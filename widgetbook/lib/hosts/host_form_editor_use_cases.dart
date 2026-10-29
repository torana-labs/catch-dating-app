import 'package:catch_dating_app/contexts/account/data/auth_repository.dart';
import 'package:catch_dating_app/contexts/forms/data/host_forms_repository.dart';
import 'package:catch_dating_app/contexts/forms/domain/forms/host_form_definition.dart';
import 'package:catch_dating_app/contexts/forms/domain/forms/host_form_editor.dart';
import 'package:catch_dating_app/contexts/forms/domain/forms/host_form_payment.dart';
import 'package:catch_dating_app/contexts/forms/domain/forms/host_form_question.dart';
import 'package:catch_dating_app/core/firebase_providers.dart';
import 'package:catch_dating_app/hosts/presentation/forms/host_form_availability_field.dart';
import 'package:catch_dating_app/hosts/presentation/forms/host_form_editor_notice.dart';
import 'package:catch_dating_app/hosts/presentation/forms/host_form_editor_viewport.dart';
import 'package:catch_dating_app/hosts/presentation/forms/host_form_number_field.dart';
import 'package:catch_dating_app/hosts/presentation/forms/host_form_question_section.dart';
import 'package:catch_dating_app/hosts/presentation/forms/host_form_questions_page_body.dart';
import 'package:catch_dating_app/hosts/presentation/forms/host_form_settings_section_list.dart';
import 'package:catch_dating_app/hosts/presentation/forms/host_form_validation_field_lanes.dart';
import 'package:catch_dating_app/hosts/presentation/forms/host_form_validation_text_field.dart';
import 'package:catch_dating_app/hosts/presentation/forms/host_forms_controller.dart';
import 'package:firebase_auth/firebase_auth.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:widgetbook_annotation/widgetbook_annotation.dart' as widgetbook;
import 'package:widgetbook_workspace/hosts/host_form_workspace_use_cases.dart';
import 'package:widgetbook_workspace/support/page_preview.dart';
import 'package:widgetbook_workspace/support/widgetbook_harness.dart';

@widgetbook.UseCase(
  name: 'Autosaved form settings',
  type: HostFormSettingsSectionList,
  path: '[P1 product surfaces]/Host operations/Forms',
)
Widget hostFormSettingsSectionListPreview(BuildContext context) =>
    _editorPreview(
      title: 'HostFormSettingsSectionList',
      catalogId: 'host.form_settings',
      children: (state, notifier) => [
        WidgetbookContentFrame(
          child: HostFormSettingsSectionList(
            organizerId: 'org_1',
            definition: state.editor.definition,
            notifier: notifier,
          ),
        ),
      ],
    );

@widgetbook.UseCase(
  name: 'Opening and closing dates',
  type: HostFormAvailabilityField,
  path: '[P1 product surfaces]/Host operations/Forms',
)
Widget hostFormAvailabilityFieldPreview(BuildContext context) =>
    WidgetbookScrollCatalogFrame(
      title: 'HostFormAvailabilityField',
      catalogId: 'host.form_availability',
      children: [
        for (final endOfDay in [false, true])
          WidgetbookPageStateCard(
            label: endOfDay ? 'Closing date' : 'Opening date',
            child: WidgetbookContentFrame(
              child: HostFormAvailabilityField(
                title: endOfDay ? 'Closes at' : 'Opens at',
                value: endOfDay ? DateTime.utc(2026, 10, 1) : null,
                endOfDay: endOfDay,
                onChanged: (_) {},
              ),
            ),
          ),
      ],
    );

@widgetbook.UseCase(
  name: 'Inline and inspector question editing',
  type: HostFormQuestionSection,
  path: '[P1 product surfaces]/Host operations/Forms',
)
Widget hostFormQuestionSectionPreview(BuildContext context) => _editorPreview(
  title: 'HostFormQuestionSection',
  catalogId: 'host.form_question',
  children: (state, notifier) => [
    for (final compact in [true, false])
      WidgetbookPageStateCard(
        label: compact ? 'Inline editor' : 'Inspector',
        child: WidgetbookContentFrame(
          child: HostFormQuestionSection(
            sectionIndex: 0,
            questionIndex: 0,
            question: state.editor.definition.sections.first.questions.first,
            questionCount:
                state.editor.definition.sections.first.questions.length,
            sections: state.editor.definition.sections,
            notifier: notifier,
            compact: compact,
          ),
        ),
      ),
  ],
);

@widgetbook.UseCase(
  name: 'Text answer validation',
  type: HostFormValidationFieldLanes,
  path: '[P1 product surfaces]/Host operations/Forms',
)
Widget hostFormTextValidationPreview(BuildContext context) => _editorPreview(
  title: 'HostFormValidationFieldLanes',
  catalogId: 'host.form_validation.shortText',
  firstQuestionKind: HostFormQuestionKind.shortText,
  children: (state, notifier) => [
    WidgetbookContentFrame(
      child: HostFormValidationFieldLanes(
        sectionIndex: 0,
        questionIndex: 0,
        question: state.editor.definition.sections.first.questions.first,
        notifier: notifier,
      ),
    ),
  ],
);

@widgetbook.UseCase(
  name: 'Number answer validation',
  type: HostFormValidationFieldLanes,
  path: '[P1 product surfaces]/Host operations/Forms',
)
Widget hostFormNumberValidationPreview(BuildContext context) => _editorPreview(
  title: 'HostFormValidationFieldLanes',
  catalogId: 'host.form_validation.number',
  firstQuestionKind: HostFormQuestionKind.number,
  children: (state, notifier) => [
    WidgetbookContentFrame(
      child: HostFormValidationFieldLanes(
        sectionIndex: 0,
        questionIndex: 0,
        question: state.editor.definition.sections.first.questions.first,
        notifier: notifier,
      ),
    ),
  ],
);

@widgetbook.UseCase(
  name: 'Date answer validation',
  type: HostFormValidationFieldLanes,
  path: '[P1 product surfaces]/Host operations/Forms',
)
Widget hostFormDateValidationPreview(BuildContext context) => _editorPreview(
  title: 'HostFormValidationFieldLanes',
  catalogId: 'host.form_validation.date',
  firstQuestionKind: HostFormQuestionKind.date,
  children: (state, notifier) => [
    WidgetbookContentFrame(
      child: HostFormValidationFieldLanes(
        sectionIndex: 0,
        questionIndex: 0,
        question: state.editor.definition.sections.first.questions.first,
        notifier: notifier,
      ),
    ),
  ],
);

@widgetbook.UseCase(
  name: 'Choices answer validation',
  type: HostFormValidationFieldLanes,
  path: '[P1 product surfaces]/Host operations/Forms',
)
Widget hostFormChoicesValidationPreview(BuildContext context) => _editorPreview(
  title: 'HostFormValidationFieldLanes',
  catalogId: 'host.form_validation.multiChoice',
  firstQuestionKind: HostFormQuestionKind.multiChoice,
  children: (state, notifier) => [
    WidgetbookContentFrame(
      child: HostFormValidationFieldLanes(
        sectionIndex: 0,
        questionIndex: 0,
        question: state.editor.definition.sections.first.questions.first,
        notifier: notifier,
      ),
    ),
  ],
);

@widgetbook.UseCase(
  name: 'File answer validation',
  type: HostFormValidationFieldLanes,
  path: '[P1 product surfaces]/Host operations/Forms',
)
Widget hostFormFileValidationPreview(BuildContext context) => _editorPreview(
  title: 'HostFormValidationFieldLanes',
  catalogId: 'host.form_validation.file',
  firstQuestionKind: HostFormQuestionKind.file,
  children: (state, notifier) => [
    WidgetbookContentFrame(
      child: HostFormValidationFieldLanes(
        sectionIndex: 0,
        questionIndex: 0,
        question: state.editor.definition.sections.first.questions.first,
        notifier: notifier,
      ),
    ),
  ],
);

@widgetbook.UseCase(
  name: 'Integer and decimal limits',
  type: HostFormNumberField,
  path: '[P1 product surfaces]/Host operations/Forms',
)
Widget hostFormNumberFieldPreview(BuildContext context) =>
    WidgetbookScrollCatalogFrame(
      title: 'HostFormNumberField',
      catalogId: 'host.form_number',
      children: [
        for (final decimal in [false, true])
          WidgetbookContentFrame(
            child: HostFormNumberField(
              fieldKey: decimal ? 'min-number' : 'min-length',
              questionId: 'preview',
              title: decimal ? 'Minimum number' : 'Minimum length',
              value: decimal ? 1.5 : 10,
              decimal: decimal,
              onChanged: (_) {},
            ),
          ),
      ],
    );

@widgetbook.UseCase(
  name: 'Date rule and optional error copy',
  type: HostFormValidationTextField,
  path: '[P1 product surfaces]/Host operations/Forms',
)
Widget hostFormValidationTextFieldPreview(BuildContext context) =>
    WidgetbookScrollCatalogFrame(
      title: 'HostFormValidationTextField',
      catalogId: 'host.form_validation_text',
      children: [
        for (final value in ['2026-10-01', null])
          WidgetbookContentFrame(
            child: HostFormValidationTextField(
              fieldKey: value == null ? 'custom-error' : 'earliest-date',
              questionId: 'preview',
              title: value == null ? 'Custom error' : 'Earliest date',
              value: value,
              onChanged: (_) {},
            ),
          ),
      ],
    );

@widgetbook.UseCase(
  name: 'Phone questions workspace',
  type: HostFormQuestionsPageBody,
  path: '[P1 product surfaces]/Host operations/Forms',
)
Widget hostFormQuestionsPageBodyPreview(BuildContext context) => _editorPreview(
  title: 'HostFormQuestionsPageBody',
  catalogId: 'hostFormQuestionsPageBodyPreview',
  children: (state, notifier) => [
    WidgetbookContentFrame(
      child: HostFormQuestionsPageBody(
        organizerId: 'org_1',
        formId: 'form_1',
        state: state,
        notifier: notifier,
        onSelectionChanged: (_, _) {},
      ),
    ),
  ],
);

@widgetbook.UseCase(
  name: 'Sections with editable question rows',
  type: HostFormQuestionSectionList,
  path: '[P1 product surfaces]/Host operations/Forms',
)
Widget hostFormQuestionSectionListPreview(BuildContext context) =>
    _editorPreview(
      title: 'HostFormQuestionSectionList',
      catalogId: 'hostFormQuestionSectionListPreview',
      children: (state, notifier) => [
        WidgetbookContentFrame(
          child: HostFormQuestionSectionList(
            organizerId: 'org_1',
            formId: 'form_1',
            definition: state.editor.definition,
            status: state.editor.form.status,
            notifier: notifier,
            expandedQuestionId: null,
            onQuestionExpansionChanged: (_) {},
            onSelectionChanged: (_, _) {},
          ),
        ),
      ],
    );

@widgetbook.UseCase(
  name: 'Form section with an expanded question',
  type: HostFormSectionAccordion,
  path: '[P1 product surfaces]/Host operations/Forms',
)
Widget hostFormSectionAccordionPreview(BuildContext context) => _editorPreview(
  title: 'HostFormSectionAccordion',
  catalogId: 'hostFormSectionAccordionPreview',
  children: (state, notifier) => [
    WidgetbookContentFrame(
      child: HostFormSectionAccordion(
        organizerId: 'org_1',
        formId: 'form_1',
        definition: state.editor.definition,
        sectionIndex: 0,
        section: state.editor.definition.sections.first,
        sectionCount: state.editor.definition.sections.length,
        notifier: notifier,
        expandedQuestionId:
            state.editor.definition.sections.first.questions.first.questionId,
        onQuestionExpansionChanged: (_) {},
        onSelectionChanged: (_, _) {},
      ),
    ),
  ],
);

@widgetbook.UseCase(
  name: 'Reorderable question rows',
  type: HostFormQuestionRowList,
  path: '[P1 product surfaces]/Host operations/Forms',
)
Widget hostFormQuestionRowListPreview(BuildContext context) => _editorPreview(
  title: 'HostFormQuestionRowList',
  catalogId: 'hostFormQuestionRowListPreview',
  children: (state, notifier) => [
    WidgetbookContentFrame(
      child: HostFormQuestionRowList(
        organizerId: 'org_1',
        formId: 'form_1',
        definition: state.editor.definition,
        sectionIndex: 0,
        section: state.editor.definition.sections.first,
        notifier: notifier,
        expandedQuestionId: null,
        onQuestionExpansionChanged: (_) {},
        onSelectionChanged: (_, _) {},
      ),
    ),
  ],
);

@widgetbook.UseCase(
  name: 'Settings and respondent preview links',
  type: HostFormSettingsMenu,
  path: '[P1 product surfaces]/Host operations/Forms',
)
Widget hostFormSettingsMenuPreview(BuildContext context) => _editorPreview(
  title: 'HostFormSettingsMenu',
  catalogId: 'hostFormSettingsMenuPreview',
  children: (state, notifier) => [
    WidgetbookContentFrame(
      child: HostFormSettingsMenu(organizerId: 'org_1', formId: 'form_1'),
    ),
  ],
);

@widgetbook.UseCase(
  name: 'Question count and publication prompt',
  type: HostFormPublishText,
  path: '[P1 product surfaces]/Host operations/Forms',
)
Widget hostFormPublishTextPreview(BuildContext context) => _editorPreview(
  title: 'HostFormPublishText',
  catalogId: 'hostFormPublishTextPreview',
  children: (state, notifier) => [
    WidgetbookContentFrame(child: HostFormPublishText(state: state)),
  ],
);

@widgetbook.UseCase(
  name: 'Desktop section and question selection',
  type: HostFormOutlineMenu,
  path: '[P1 product surfaces]/Host operations/Forms',
)
Widget hostFormOutlineMenuPreview(BuildContext context) => _editorPreview(
  title: 'HostFormOutlineMenu',
  catalogId: 'hostFormOutlineMenuPreview',
  children: (state, notifier) => [
    WidgetbookContentFrame(
      child: HostFormOutlineMenu(
        definition: state.editor.definition,
        selectedSection: 0,
        selectedQuestion: 0,
        onSelected: (_, _) {},
        notifier: notifier,
      ),
    ),
  ],
);

@widgetbook.UseCase(
  name: 'Section title and question actions',
  type: HostFormSectionField,
  path: '[P1 product surfaces]/Host operations/Forms',
)
Widget hostFormSectionFieldPreview(BuildContext context) => _editorPreview(
  title: 'HostFormSectionField',
  catalogId: 'hostFormSectionFieldPreview',
  children: (state, notifier) => [
    WidgetbookContentFrame(
      child: HostFormSectionField(
        sectionIndex: 0,
        section: state.editor.definition.sections.first,
        sectionCount: state.editor.definition.sections.length,
        notifier: notifier,
        onSelectionChanged: (_, _) {},
      ),
    ),
  ],
);

@widgetbook.UseCase(
  name: 'Desktop form, section, and question inspectors',
  type: HostFormInspectorSection,
  path: '[P1 product surfaces]/Host operations/Forms',
)
Widget hostFormInspectorSectionPreview(BuildContext context) => _editorPreview(
  title: 'HostFormInspectorSection',
  catalogId: 'host.form_inspector',
  children: (state, notifier) => [
    for (final selection in [(null, null), (0, null), (0, 0)])
      WidgetbookPageStateCard(
        label: selection.$1 == null
            ? 'Form settings'
            : selection.$2 == null
            ? 'Section'
            : 'Question',
        child: WidgetbookContentFrame(
          child: HostFormInspectorSection(
            organizerId: 'org_1',
            definition: state.editor.definition,
            sectionIndex: selection.$1,
            questionIndex: selection.$2,
            notifier: notifier,
          ),
        ),
      ),
  ],
);

@widgetbook.UseCase(
  name: 'Desktop outline, canvas, and inspector',
  type: HostFormEditorViewport,
  path: '[P1 product surfaces]/Host operations/Forms',
)
Widget hostFormEditorViewportPreview(BuildContext context) => _editorPreview(
  title: 'HostFormEditorViewport',
  catalogId: 'host.form_editor_viewport',
  children: (state, notifier) => [
    SingleChildScrollView(
      scrollDirection: Axis.horizontal,
      child: WidgetbookViewportFrame.device(
        size: const Size(1200, 1000),
        child: MediaQuery(
          data: MediaQuery.of(context).copyWith(size: const Size(1200, 1000)),
          child: HostFormEditorViewport(
            organizerId: 'org_1',
            state: state,
            notifier: notifier,
            sectionIndex: 0,
            questionIndex: 0,
            onSelectionChanged: (_, _) {},
          ),
        ),
      ),
    ),
  ],
);

@widgetbook.UseCase(
  name: 'Save failure, revision conflict, and invalid draft',
  type: HostFormEditorNotice,
  path: '[P1 product surfaces]/Host operations/Forms',
)
Widget hostFormEditorNoticePreview(BuildContext context) => _editorPreview(
  title: 'HostFormEditorNotice',
  catalogId: 'host.form_editor_notice',
  children: (state, notifier) => [
    for (final noticeState in [
      state.copyWith(
        saveState: HostFormSaveState.failed,
        error: StateError('Preview save failure'),
      ),
      state.copyWith(saveState: HostFormSaveState.conflict),
      state.copyWith(
        editor: state.editor.copyWith(
          validationIssues: const [
            HostFormValidationIssue(
              code: 'missing-label',
              path: 'sections[0].questions[0].label',
              message: 'Add a question label before publishing.',
              severity: HostFormValidationSeverity.error,
            ),
          ],
        ),
      ),
    ])
      WidgetbookContentFrame(
        child: HostFormEditorNotice(state: noticeState, notifier: notifier),
      ),
  ],
);

Widget _editorPreview({
  required String title,
  required String catalogId,
  required List<Widget> Function(HostFormEditorState, HostFormEditorController)
  children,
  HostFormQuestionKind? firstQuestionKind,
}) => WidgetbookFixtureScope(
  overrides: [
    uidProvider.overrideWithValue(const AsyncData<String?>('preview-host')),
    firebaseAuthProvider.overrideWithValue(_PreviewFormAuth()),
    hostFormsRepositoryProvider.overrideWithValue(
      _PreviewFormRepository(firstQuestionKind: firstQuestionKind),
    ),
  ],
  child: Consumer(
    builder: (context, ref, _) {
      final provider = hostFormEditorControllerProvider('org_1', 'form_1');
      final state = ref.watch(provider).asData?.value;
      return WidgetbookScrollCatalogFrame(
        title: title,
        catalogId: catalogId,
        children: state == null
            ? []
            : children(state, ref.read(provider.notifier)),
      );
    },
  ),
);

// Keep real controller edits, undo and autosave inside this in-memory fixture.
// Unsupported operations fail here instead of reaching a backend.
class _PreviewFormRepository implements HostFormsRepository {
  _PreviewFormRepository({HostFormQuestionKind? firstQuestionKind}) {
    if (firstQuestionKind != null) {
      final definition = _editor.definition;
      final section = definition.sections.first;
      _editor = _editor.copyWith(
        definition: definition.replaceSection(
          0,
          section.replaceQuestion(
            0,
            section.questions.first.copyWith(kind: firstQuestionKind),
          ),
        ),
      );
    }
  }

  HostFormEditor _editor = hostFormPreviewState.editor;

  @override
  Future<HostFormPaymentSetup> managePaymentConnection({
    required String organizerId,
    required HostFormPaymentConnectionAction action,
    String? connectionId,
  }) async => const HostFormPaymentSetup(available: false, connections: []);

  @override
  Future<HostFormEditor> getEditor({
    required String organizerId,
    required String formId,
  }) async => _editor;

  @override
  Future<HostFormEditor> updateDraft({
    required String organizerId,
    required String formId,
    required int expectedRevision,
    required HostFormDefinition definition,
  }) async {
    _editor = _editor.copyWith(definition: definition);
    return _editor;
  }

  @override
  dynamic noSuchMethod(Invocation invocation) => throw StateError(
    'Unsupported form preview operation: ${invocation.memberName}',
  );
}

class _PreviewFormAuth implements FirebaseAuth {
  @override
  User get currentUser => _PreviewFormUser();

  @override
  dynamic noSuchMethod(Invocation invocation) => super.noSuchMethod(invocation);
}

class _PreviewFormUser implements User {
  @override
  String get uid => 'preview-host';

  @override
  dynamic noSuchMethod(Invocation invocation) => super.noSuchMethod(invocation);
}
