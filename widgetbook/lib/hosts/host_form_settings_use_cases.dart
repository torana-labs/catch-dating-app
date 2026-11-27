import 'package:catch_dating_app/contexts/audience/domain/crm/host_saved_audience_filter_options.dart';
import 'package:catch_dating_app/contexts/forms/domain/forms/host_form_automation.dart';
import 'package:catch_dating_app/contexts/forms/domain/forms/host_form_payment.dart';
import 'package:catch_dating_app/hosts/forms/form_automation_action_section.dart';
import 'package:catch_dating_app/hosts/forms/form_automations_body.dart';
import 'package:catch_dating_app/hosts/forms/form_preview_body.dart';
import 'package:catch_dating_app/hosts/forms/form_preview_screen.dart';
import 'package:catch_dating_app/hosts/forms/form_publish_review_sheet.dart';
import 'package:catch_dating_app/hosts/forms/form_settings_body.dart';
import 'package:catch_dating_app/hosts/forms/form_settings_logic_sheet.dart';
import 'package:catch_dating_app/hosts/forms/form_settings_payment_section.dart';
import 'package:catch_dating_app/hosts/forms/form_settings_screen.dart';
import 'package:catch_dating_app/hosts/forms/form_settings_target_section.dart';
import 'package:catch_dating_app/hosts/forms/host_form_operations_controller.dart';
import 'package:catch_dating_app/hosts/forms/host_form_payment_controller.dart';
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

class _PreviewPayments extends HostFormPaymentController {
  @override
  Future<HostFormPaymentSetupState> build(String organizerId) async =>
      const HostFormPaymentSetupState(
        setup: HostFormPaymentSetup(available: false, connections: []),
      );
}

/// The form editor and payment setup the settings previews read.
Widget _scope(Widget child) => ProviderScope(
  overrides: [
    hostFormEditorControllerProvider(
      _organizerId,
      _formId,
    ).overrideWith(_PreviewEditor.new),
    hostFormPaymentControllerProvider(
      _organizerId,
    ).overrideWith(_PreviewPayments.new),
  ],
  child: WidgetbookHostDeviceFrame(child: child),
);

/// A settings part drawn with the preview editor.
Widget _withEditor(Widget Function(HostFormEditorController editor) builder) =>
    _scope(
      Consumer(
        builder: (context, ref, _) => CatchRoot(
          child: CatchScreen(
            body: CatchPageBody.screen(
              child: builder(
                ref.read(
                  hostFormEditorControllerProvider(
                    _organizerId,
                    _formId,
                  ).notifier,
                ),
              ),
            ),
          ),
        ),
      ),
    );

Widget _frame(Widget child) => WidgetbookHostDeviceFrame(
  child: CatchRoot(
    child: CatchScreen(body: CatchPageBody.screen(child: child)),
  ),
);

@widgetbook.UseCase(
  name: 'Form settings',
  type: HostFormSettingsScreen,
  path: _path,
)
Widget hostFormSettingsScreenPreview(BuildContext context) => _scope(
  const HostFormSettingsScreen(organizerId: _organizerId, formId: _formId),
);

@widgetbook.UseCase(
  name: 'Settings menu',
  type: HostFormLifecycleMenu,
  path: _path,
)
Widget hostFormSettingsMenuPreview(BuildContext context) => _frame(
  HostFormLifecycleMenu(
    status: hostFormPreviewState.editor.form.status,
    published: false,
    onSelected: (_) {},
  ),
);

@widgetbook.UseCase(
  name: 'Settings body',
  type: HostFormSettingsBody,
  path: _path,
)
Widget hostFormSettingsBodyPreview(BuildContext context) => _scope(
  Consumer(
    builder: (context, ref, _) => CatchRoot(
      child: CatchScreen(
        body: HostFormSettingsBody(
          organizerId: _organizerId,
          accountId: null,
          state: hostFormPreviewState,
          editor: ref.read(
            hostFormEditorControllerProvider(_organizerId, _formId).notifier,
          ),
        ),
      ),
    ),
  ),
);

@widgetbook.UseCase(
  name: 'Save notices',
  type: HostFormSettingsNotice,
  path: _path,
)
Widget hostFormSettingsNoticePreview(BuildContext context) => _withEditor(
  (editor) => HostFormSettingsNotice(
    state: hostFormPreviewState.copyWith(saveState: HostFormSaveState.failed),
    editor: editor,
  ),
);

@widgetbook.UseCase(
  name: 'WhatsApp updates',
  type: HostFormMessagingSection,
  path: _path,
)
Widget hostFormMessagingSectionPreview(BuildContext context) => _withEditor(
  (editor) => HostFormMessagingSection(
    definition: hostFormPreviewState.editor.definition,
    editor: editor,
  ),
);

@widgetbook.UseCase(
  name: 'Availability',
  type: HostFormAvailabilitySection,
  path: _path,
)
Widget hostFormAvailabilitySectionPreview(BuildContext context) => _withEditor(
  (editor) => HostFormAvailabilitySection(
    definition: hostFormPreviewState.editor.definition,
    editor: editor,
  ),
);

@widgetbook.UseCase(name: 'Date', type: HostFormDateField, path: _path)
Widget hostFormDateFieldPreview(BuildContext context) => _frame(
  CatchSection.fieldRows(
    children: [
      HostFormDateField(
        title: 'Opens',
        value: DateTime.utc(2026, 12, 1),
        onChanged: (_) {},
      ),
    ],
  ),
);

@widgetbook.UseCase(
  name: 'After submission',
  type: HostFormCompletionSection,
  path: _path,
)
Widget hostFormCompletionSectionPreview(BuildContext context) => _withEditor(
  (editor) => HostFormCompletionSection(
    definition: hostFormPreviewState.editor.definition,
    editor: editor,
  ),
);

@widgetbook.UseCase(
  name: 'Conditional logic',
  type: HostFormLogicSection,
  path: _path,
)
Widget hostFormLogicSectionPreview(BuildContext context) => _withEditor(
  (editor) => HostFormLogicSection(
    definition: hostFormPreviewState.editor.definition,
    editor: editor,
  ),
);

@widgetbook.UseCase(
  name: 'Add a rule',
  type: HostFormLogicRuleSheet,
  path: _path,
)
Widget hostFormLogicRuleSheetPreview(BuildContext context) => _frame(
  HostFormLogicRuleSheet(
    definition: hostFormPreviewState.editor.definition,
    onSave: (_) {},
  ),
);

@widgetbook.UseCase(
  name: 'Where it is used',
  type: HostFormSettingsTargetSection,
  path: _path,
)
Widget hostFormSettingsTargetSectionPreview(BuildContext context) =>
    _withEditor(
      (editor) => HostFormSettingsTargetSection(
        organizerId: _organizerId,
        accountId: 'preview-host',
        definition: hostFormPreviewState.editor.definition,
        editor: editor,
        hasPublishedVersion: false,
      ),
    );

@widgetbook.UseCase(
  name: 'Upcoming events',
  type: HostFormTargetEventList,
  path: _path,
)
Widget hostFormTargetEventListPreview(BuildContext context) => _frame(
  HostFormTargetEventList(
    targets: HostFormTargetController(
      organizerId: _organizerId,
      accountId: 'preview-host',
      loadPage: ({required organizerId, cursor}) =>
          Future.error(StateError('Preview has no events')),
      currentAccountId: () => 'preview-host',
    ),
    definition: hostFormPreviewState.editor.definition,
    onChoose: (_) {},
  ),
);

@widgetbook.UseCase(
  name: 'Fee and account',
  type: HostFormSettingsPaymentSection,
  path: _path,
)
Widget hostFormSettingsPaymentSectionPreview(BuildContext context) =>
    _withEditor(
      (editor) => HostFormSettingsPaymentSection(
        organizerId: _organizerId,
        definition: hostFormPreviewState.editor.definition,
        onChanged: (_) {},
      ),
    );

@widgetbook.UseCase(
  name: 'Payment setup',
  type: HostFormFeeSection,
  path: _path,
)
Widget hostFormPaymentSetupSectionPreview(BuildContext context) => _frame(
  HostFormFeeSection(
    state: const HostFormPaymentSetupState(
      setup: HostFormPaymentSetup(available: true, connections: []),
    ),
    definition: hostFormPreviewState.editor.definition,
    onChanged: (_) {},
    onConnect: () {},
    onReconnect: () {},
    onRefresh: () {},
    onDisconnect: (_) {},
  ),
);

@widgetbook.UseCase(name: 'Fee sheet', type: HostFormFeeSheet, path: _path)
Widget hostFormFeeSheetPreview(BuildContext context) => _frame(
  const HostFormFeeSheet(
    payment: null,
    connections: [],
    collectThroughCatch: true,
    collectionMode: HostFormPaymentMode.test,
  ),
);

@widgetbook.UseCase(
  name: 'Review before publishing',
  type: HostFormPublishReviewSheet,
  path: _path,
)
Widget hostFormPublishReviewSheetPreview(BuildContext context) => _frame(
  HostFormPublishReviewSheet(state: hostFormPreviewState, onChoose: (_) {}),
);

@widgetbook.UseCase(
  name: 'Form preview',
  type: HostFormPreviewScreen,
  path: _path,
)
Widget hostFormPreviewScreenPreview(BuildContext context) => _scope(
  const HostFormPreviewScreen(organizerId: _organizerId, formId: _formId),
);

@widgetbook.UseCase(
  name: 'Preview body',
  type: HostFormPreviewBody,
  path: _path,
)
Widget hostFormPreviewBodyPreview(BuildContext context) =>
    WidgetbookHostDeviceFrame(
      child: CatchRoot(
        child: CatchScreen(
          body: HostFormPreviewBody(
            definition: hostFormPreviewState.editor.definition,
          ),
        ),
      ),
    );

@widgetbook.UseCase(
  name: 'Preview field',
  type: HostFormPreviewField,
  path: _path,
)
Widget hostFormPreviewFieldPreview(BuildContext context) => _frame(
  CatchSection.fieldRows(
    children: [
      for (final question
          in hostFormPreviewState.editor.definition.sections.first.questions)
        HostFormPreviewField(
          question: question,
          answer: null,
          onChanged: (_) {},
        ),
    ],
  ),
);

@widgetbook.UseCase(
  name: 'Form automations',
  type: HostFormAutomationsBody,
  path: _path,
)
Widget hostFormAutomationsBodyPreview(BuildContext context) =>
    WidgetbookHostDeviceFrame(
      child: CatchRoot(
        child: CatchScreen(
          body: HostFormAutomationsBody(
            formId: _formId,
            state: const HostFormAutomationsState(
              rules: [],
              runs: [],
              hasMore: false,
            ),
            sources: null,
            onEdit: (_) {},
            onPreset: (_, _) {},
            onLoadMore: () {},
            onRetry: () {},
          ),
        ),
      ),
    );

@widgetbook.UseCase(
  name: 'Automation step',
  type: HostFormAutomationActionSection,
  path: _path,
)
Widget hostFormAutomationActionSectionPreview(BuildContext context) => _frame(
  HostFormAutomationActionSection(
    action: HostFormAutomationActionDraft('preview-step')
      ..kind = HostFormAutomationActionKind.signedWebhook,
    trigger: HostFormAutomationTrigger.responseSubmitted,
    source: const HostSavedAudienceFilterOptions(
      forms: [],
      questions: [],
      events: [],
      tags: [],
    ),
    messages: null,
    busy: false,
    canRemove: true,
    onChanged: () {},
    onKind: (_) {},
    onMessage: (_) {},
    onRemove: () {},
    onMoreMessages: () {},
  ),
);
