import 'package:catch_dating_app/contexts/audience/data/crm/host_saved_audience_repository.dart';
import 'package:catch_dating_app/contexts/audience/domain/crm/host_saved_audience_filter_options.dart';
import 'package:catch_dating_app/hosts/presentation/forms/host_form_automations_screen.dart';
import 'package:catch_dating_app/hosts/presentation/forms/host_form_operations_controller.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:widgetbook_annotation/widgetbook_annotation.dart' as widgetbook;

import '../preview_layout_contracts.dart';

const _options = HostSavedAudienceFilterOptions(
  forms: [
    HostAudienceSourceOption(id: 'application', title: 'Club application'),
  ],
  questions: [
    HostAudienceQuestionOption(
      formId: 'application',
      versionId: 'application-v1',
      version: 1,
      formTitle: 'Club application',
      questionId: 'drink',
      label: 'Favorite drink',
      options: [HostAudienceAnswerOption(label: 'Coffee', value: 'coffee')],
    ),
  ],
  events: [
    HostAudienceSourceOption(id: 'sunday-social', title: 'Sunday social'),
  ],
  tags: [],
);

@widgetbook.UseCase(
  name: 'Acceptance automation editor',
  type: HostAutomationRuleEditor,
  path: '[P1 product surfaces]/Host operations/Customers',
)
Widget hostAutomationEditorState(BuildContext context) => ProviderScope(
  overrides: [
    hostFormAutomationsControllerProvider(
      'preview-organizer',
      null,
    ).overrideWith(_PreviewAutomations.new),
    hostSavedAudienceFilterOptionsProvider(
      'preview-organizer',
    ).overrideWith((_) async => _options),
  ],
  child: SizedBox(
    width: WidgetbookPreviewLayout.wideContractWidth,
    height: WidgetbookPreviewLayout.hostEditorViewportHeight,
    child: HostAutomationRuleEditor(
      organizerId: 'preview-organizer',
      onSaved: () {},
      onCancel: () {},
    ),
  ),
);

@widgetbook.UseCase(
  name: 'Organizer automations empty',
  type: HostFormAutomationsScreen,
  path: '[P1 product surfaces]/Host operations/Customers',
)
Widget hostAutomationsEmptyState(BuildContext context) => ProviderScope(
  overrides: [
    hostFormAutomationsControllerProvider(
      'preview-organizer',
      null,
    ).overrideWith(_PreviewAutomations.new),
  ],
  child: const SizedBox(
    width: WidgetbookPreviewLayout.wideContractWidth,
    height: WidgetbookPreviewLayout.hostEditorViewportHeight,
    child: HostFormAutomationsScreen(organizerId: 'preview-organizer'),
  ),
);

class _PreviewAutomations extends HostFormAutomationsController {
  @override
  Future<HostFormAutomationsState> build(
    String organizerId,
    String? formId,
  ) async =>
      const HostFormAutomationsState(rules: [], runs: [], nextCursor: null);
}
