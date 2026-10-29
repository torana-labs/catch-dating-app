import 'package:catch_dating_app/contexts/profiles/domain/user_profile.dart';
import 'package:catch_dating_app/l10n/l10n.dart';
import 'package:catch_dating_app/platform/l10n/catch_ui_copy.dart';
import 'package:catch_dating_app/user_profile/presentation/widgets/profile_inline_editors.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/material.dart';
import 'package:widgetbook_annotation/widgetbook_annotation.dart' as widgetbook;

import '../../preview_layout_contracts.dart';
import 'fixtures.dart';
import 'preview.dart';

@widgetbook.UseCase(
  name: 'Inline single choice editor states',
  type: ProfileInlineSingleChoiceEntryEditor,
  path: '[P1 product surfaces]/Profiles/Inline Editors',
)
Widget profileInlineSingleChoiceEntryEditorStates(BuildContext context) {
  return WidgetbookProfileProfileCatalog(
    title: 'ProfileInlineSingleChoiceEntryEditor',
    contractId: 'screen.profile.inline.single_choice',
    children: [
      WidgetbookProfileStateCard(
        label: 'expanded choice set',
        child: WidgetbookProfileSectionFrame(
          height: WidgetbookPreviewLayout.profileStandardPreviewHeight,
          child: const ProfileInlineRelationshipGoalChoiceEntryEditor(),
        ),
      ),
    ],
  );
}

@widgetbook.UseCase(
  name: 'Inline multi choice editor states',
  type: ProfileInlineMultiChoiceEntryEditor,
  path: '[P1 product surfaces]/Profiles/Inline Editors',
)
Widget profileInlineMultiChoiceEntryEditorStates(BuildContext context) {
  return WidgetbookProfileProfileCatalog(
    title: 'ProfileInlineMultiChoiceEntryEditor',
    contractId: 'screen.profile.inline.multi_choice',
    children: [
      WidgetbookProfileStateCard(
        label: 'expanded choice set',
        child: WidgetbookProfileSectionFrame(
          height: WidgetbookPreviewLayout.profileStandardPreviewHeight,
          child: const ProfileInlineLanguageMultiChoiceEntryEditor(),
        ),
      ),
    ],
  );
}

@widgetbook.UseCase(
  name: 'Canonical single-choice chip states',
  type: CatchChip,
  path: '[P1 product surfaces]/Profiles/Inline Editors',
)
Widget profileSingleChipValueStates(BuildContext context) {
  return WidgetbookProfileProfileCatalog(
    title: 'CatchChip',
    contractId: 'catch.chip.choice.single',
    children: [
      WidgetbookProfileStateCard(
        label: 'selected',
        child: WidgetbookProfileSectionFrame(
          height: WidgetbookPreviewLayout.profileCompactPreviewHeight,
          child: Center(
            child: CatchChip.choice(
              label: RelationshipGoal.relationship.label,
              selected: true,
              onPressed: () {},
              mode: CatchChipMode.single,
            ),
          ),
        ),
      ),
      WidgetbookProfileStateCard(
        label: 'unselected',
        child: WidgetbookProfileSectionFrame(
          height: WidgetbookPreviewLayout.profileCompactPreviewHeight,
          child: Center(
            child: CatchChip.choice(
              label: RelationshipGoal.friendship.label,
              selected: false,
              onPressed: () {},
              mode: CatchChipMode.single,
            ),
          ),
        ),
      ),
      WidgetbookProfileStateCard(
        label: 'selected disabled',
        child: WidgetbookProfileSectionFrame(
          height: WidgetbookPreviewLayout.profileCompactPreviewHeight,
          child: Center(
            child: CatchChip.choice(
              label: RelationshipGoal.relationship.label,
              selected: true,
              onPressed: null,
              mode: CatchChipMode.single,
            ),
          ),
        ),
      ),
    ],
  );
}

@widgetbook.UseCase(
  name: 'Canonical wrapping choice control states',
  type: CatchChoiceInput,
  path: '[P1 product surfaces]/Profiles/Inline Editors',
)
Widget profileMultiChipValueStates(BuildContext context) {
  return WidgetbookProfileProfileCatalog(
    title: 'CatchChoiceInput',
    contractId: 'catch.chip.field.multi',
    children: [
      WidgetbookProfileStateCard(
        label: 'selected and unselected wrap',
        child: WidgetbookProfileSectionFrame(
          height: WidgetbookPreviewLayout.profileInlinePreviewHeight,
          child: Padding(
            padding: CatchInsets.content,
            child: CatchChoiceInput<Language>(
              values: const [
                Language.english,
                Language.hindi,
                Language.marathi,
                Language.tamil,
                Language.gujarati,
              ],
              selected: const {Language.english, Language.hindi},
              mode: CatchChipMode.multiple,
              itemLabelBuilder: (value) => value.label,
              onChanged: (_) {},
            ),
          ),
        ),
      ),
      WidgetbookProfileStateCard(
        label: 'disabled wrap',
        child: WidgetbookProfileSectionFrame(
          height: WidgetbookPreviewLayout.profileInlinePreviewHeight,
          child: Padding(
            padding: CatchInsets.content,
            child: CatchChoiceInput<Language>(
              values: const [
                Language.english,
                Language.hindi,
                Language.marathi,
                Language.tamil,
                Language.gujarati,
              ],
              selected: const {Language.english, Language.hindi},
              mode: CatchChipMode.multiple,
              itemLabelBuilder: (value) => value.label,
              onChanged: null,
            ),
          ),
        ),
      ),
    ],
  );
}

@widgetbook.UseCase(
  name: 'Canonical collapsed choice states',
  type: CatchField,
  path: '[P1 product surfaces]/Profiles/Inline Editors',
)
Widget profileChipPlaceholderStates(BuildContext context) {
  return WidgetbookProfileProfileCatalog(
    title: 'CatchField.choices collapsed',
    contractId: 'catch.field.choices.collapsed',
    children: [
      WidgetbookProfileStateCard(
        label: 'empty and selected values',
        child: WidgetbookProfileSectionFrame(
          height: WidgetbookPreviewLayout.profileInlinePreviewHeight,
          child: Column(
            children: [
              CatchField<Language>.choices(
                copy: catchFieldCopy(context.l10n),
                title: 'Languages',
                values: const [Language.english, Language.hindi],
                itemLabelBuilder: (value) => value.label,
                selected: const {},
                mode: CatchChipMode.multiple,
                onSelectionChanged: (_) {},
              ),
              CatchField<Language>.choices(
                copy: catchFieldCopy(context.l10n),
                title: 'Languages',
                values: const [Language.english, Language.hindi],
                itemLabelBuilder: (value) => value.label,
                selected: const {Language.english, Language.hindi},
                mode: CatchChipMode.multiple,
                onSelectionChanged: (_) {},
              ),
            ],
          ),
        ),
      ),
    ],
  );
}

@widgetbook.UseCase(
  name: 'Canonical choice option states',
  type: CatchChoiceInput,
  path: '[P1 product surfaces]/Profiles/Inline Editors',
)
Widget profileChipOptionsStates(BuildContext context) {
  return WidgetbookProfileProfileCatalog(
    title: 'CatchChoiceInput options',
    contractId: 'catch.chip.field.options',
    children: [
      WidgetbookProfileStateCard(
        label: 'enabled selected',
        child: WidgetbookProfileSectionFrame(
          height: WidgetbookPreviewLayout.compactPanelHeight,
          child: Padding(
            padding: CatchInsets.content,
            child: CatchChoiceInput<Language>(
              values: const [
                Language.english,
                Language.hindi,
                Language.marathi,
              ],
              selected: const {Language.english},
              mode: CatchChipMode.multiple,
              itemLabelBuilder: (value) => value.label,
              onChanged: (_) {},
            ),
          ),
        ),
      ),
      WidgetbookProfileStateCard(
        label: 'disabled',
        child: WidgetbookProfileSectionFrame(
          height: WidgetbookPreviewLayout.compactPanelHeight,
          child: Padding(
            padding: CatchInsets.content,
            child: CatchChoiceInput<Language>(
              values: const [
                Language.english,
                Language.hindi,
                Language.marathi,
              ],
              selected: const {Language.english, Language.hindi},
              mode: CatchChipMode.multiple,
              itemLabelBuilder: (value) => value.label,
              onChanged: null,
            ),
          ),
        ),
      ),
    ],
  );
}
