import 'package:catch_dating_app/contexts/profiles/domain/profile_prompts.dart';
import 'package:catch_dating_app/user_profile/presentation/widgets/profile_inline_editors.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/material.dart';
import 'package:widgetbook_annotation/widgetbook_annotation.dart' as widgetbook;

import '../../preview_layout_contracts.dart';
import 'fixtures.dart';
import 'preview.dart';

@widgetbook.UseCase(
  name: 'Inline prompt editor states',
  type: ProfileInlinePromptEntryEditor,
  path: '[P1 product surfaces]/Profiles/Inline Editors',
)
Widget profileInlinePromptEntryEditorStates(BuildContext context) {
  final prompt = widgetbookProfileViewer.profilePrompts.first;
  Widget promptEditor({required bool expanded}) {
    return ProfileInlinePromptEntryEditor(
      icon: CatchIcons.quote,
      label: profilePromptDefinition(prompt.promptId).title,
      currentAnswer: prompt.answer,
      currentPromptId: prompt.promptId,
      currentPrompts: widgetbookProfileViewer.profilePrompts,
      promptIndex: 0,
      availablePromptIds: profilePromptCatalog
          .map((definition) => definition.id)
          .take(5)
          .toList(growable: false),
      fieldName: 'profilePrompt:0',
      isExpanded: expanded,
      onTap: () {},
      onSaved: () {},
      onCancel: () {},
    );
  }

  return WidgetbookProfileProfileCatalog(
    title: 'ProfileInlinePromptEntryEditor',
    contractId: 'screen.profile.inline.prompt_entry',
    children: [
      WidgetbookProfileStateCard(
        label: 'collapsed question + separate answer',
        child: WidgetbookProfileSectionFrame(
          height: WidgetbookPreviewLayout.profileInlinePreviewHeight,
          child: promptEditor(expanded: false),
        ),
      ),
      WidgetbookProfileStateCard(
        label: 'expanded inline question choices + separate answer',
        child: WidgetbookProfileSectionFrame(
          height: WidgetbookPreviewLayout.profileExpandedEditorHeight,
          child: promptEditor(expanded: true),
        ),
      ),
    ],
  );
}
