import 'package:catch_dating_app/contexts/profiles/domain/user_profile.dart';
import 'package:catch_dating_app/design_fixtures/profile_surface_fixtures.dart';
import 'package:catch_dating_app/l10n/l10n.dart';
import 'package:catch_dating_app/platform/l10n/catch_ui_copy.dart';
import 'package:catch_dating_app/platform/schema_contracts/generated/callable_request_dtos.g.dart'
    show UpdateUserProfilePatch;
import 'package:catch_dating_app/platform/schema_contracts/generated/field_constraints.g.dart';
import 'package:catch_dating_app/user_profile/presentation/self_profile_edit_tab_state.dart';
import 'package:catch_dating_app/user_profile/presentation/widgets/profile_tab_body.dart';
import 'package:catch_tokens/catch_tokens.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/material.dart';
import 'package:widgetbook_annotation/widgetbook_annotation.dart' as widgetbook;

import '../../preview_layout_contracts.dart';
import 'fixtures.dart';
import 'preview.dart';

@widgetbook.UseCase(
  name: 'Field row states',
  type: ProfileFieldRow,
  path: '[P1 product surfaces]/Profiles/Sections',
)
Widget profileFieldRowStates(BuildContext context) {
  final editState = SelfProfileEditTabState.fromProfile(
    l10n: context.l10n,
    user: widgetbookProfileViewer,
    today: ProfileSurfaceFixtures.now,
    uploadState: widgetbookProfileIdlePhotoUploadState,
  );
  final rows = [
    ...editState.runningRows.take(3),
    ...editState.lifestyleRows.take(3),
  ];

  return WidgetbookProfileProfileCatalog(
    title: 'ProfileFieldRow',
    contractId: 'screen.profile.edit_tab.field_row',
    children: [
      WidgetbookProfileStateCard(
        label: 'descriptor rows',
        child: WidgetbookProfileSectionFrame(
          height: CatchLayout.maxContentWidth,
          child: _ProfileFieldRowCatalog(rows: rows),
        ),
      ),
    ],
  );
}

@widgetbook.UseCase(
  name: 'Field row section states',
  type: CatchSection,
  path: '[P1 product surfaces]/Profiles/Sections',
)
Widget profileFieldRowSectionStates(BuildContext context) {
  return WidgetbookProfileProfileCatalog(
    title: 'CatchSection.fieldRows',
    contractId: 'screen.profile.edit_tab.field_row_section',
    children: [
      WidgetbookProfileStateCard(
        label: 'running section',
        child: WidgetbookProfileSectionFrame(
          height: WidgetbookPreviewLayout.profileMediaPreviewHeight,
          child: ListView(
            padding: EdgeInsets.zero,
            children: [
              CatchSection.fieldRows(
                title: 'Running',
                children: [
                  CatchField.nav(
                    copy: catchFieldCopy(context.l10n),
                    icon: CatchIcons.pace,
                    title: 'Pace range',
                    body: '9:00-9:00/km',
                  ),
                  CatchField.nav(
                    copy: catchFieldCopy(context.l10n),
                    icon: CatchIcons.measure,
                    title: 'Preferred distances',
                    body: '5 km, 10 km, 21 km',
                  ),
                  CatchField.nav(
                    copy: catchFieldCopy(context.l10n),
                    icon: CatchIcons.activity,
                    title: 'Why I event',
                    body: 'Weight loss',
                  ),
                  CatchField.nav(
                    copy: catchFieldCopy(context.l10n),
                    icon: CatchIcons.twilight,
                    title: 'Favorite event times',
                    body: 'Early morning, Morning',
                  ),
                ],
              ),
            ],
          ),
        ),
      ),
      WidgetbookProfileStateCard(
        label: 'count and first section',
        child: WidgetbookProfileSectionFrame(
          height: WidgetbookPreviewLayout.profileStandardPreviewHeight,
          child: ListView(
            padding: EdgeInsets.zero,
            children: [
              CatchSection.fieldRows(
                title: 'Prompts',
                count: '3 of 3 answered',
                first: true,
                children: [
                  CatchField.nav(
                    copy: catchFieldCopy(context.l10n),
                    icon: CatchIcons.quote,
                    title: 'A perfect event with me looks like...',
                    body: 'Catch me if you can',
                  ),
                  CatchField.nav(
                    copy: catchFieldCopy(context.l10n),
                    icon: CatchIcons.quote,
                    title: 'After an event, you can usually find me...',
                    body: 'ABCD',
                  ),
                ],
              ),
            ],
          ),
        ),
      ),
      WidgetbookProfileStateCard(
        label: 'footer slot',
        child: WidgetbookProfileSectionFrame(
          height: WidgetbookPreviewLayout.profileStandardPreviewHeight,
          child: ListView(
            padding: EdgeInsets.zero,
            children: [
              CatchSection.fieldRows(
                title: 'Privacy & safety',
                footer: const Text(
                  'Footer content stays below the field-row section.',
                ),
                children: [
                  CatchField.read(
                    copy: catchFieldCopy(context.l10n),
                    icon: CatchIcons.safety,
                    title: 'Blocked users',
                    valueText: '0',
                  ),
                  CatchField.read(
                    copy: catchFieldCopy(context.l10n),
                    icon: CatchIcons.show,
                    title: 'Who can see you',
                    valueText: 'Runners on my events',
                  ),
                ],
              ),
            ],
          ),
        ),
      ),
    ],
  );
}

@widgetbook.UseCase(
  name: 'Single enum entry adapter states',
  type: ProfileSingleEnumRow,
  path: '[P1 product surfaces]/Profiles/Sections',
)
Widget profileSingleEnumEntryStates(BuildContext context) {
  return WidgetbookProfileProfileCatalog(
    title: 'ProfileSingleEnumRow',
    contractId: 'screen.profile.edit_tab.single_enum_entry',
    children: [
      WidgetbookProfileStateCard(
        label: 'selected collapsed',
        child: WidgetbookProfileSectionFrame(
          height: CatchLayout.activityArtDefaultHeight,
          child: ProfileSingleEnumRow<EducationLevel>(
            icon: CatchIcons.education,
            label: 'Education',
            contract: CatchContractConstraints.updateUserProfilePatchEducation,
            contractValue: (value) => value.name,
            values: EducationLevel.values,
            value: EducationLevel.masters,
            fieldName: 'education',
            patchForValue: (value) => UpdateUserProfilePatch(education: value),
            isExpanded: false,
            onTap: () {},
            onSaved: () {},
            onCancel: () {},
          ),
        ),
      ),
      WidgetbookProfileStateCard(
        label: 'empty expanded',
        child: WidgetbookProfileSectionFrame(
          height: WidgetbookPreviewLayout.profileMediumPreviewHeight,
          child: ProfileSingleEnumRow<EducationLevel>(
            icon: CatchIcons.education,
            label: 'Education',
            contract: CatchContractConstraints.updateUserProfilePatchEducation,
            contractValue: (value) => value.name,
            values: EducationLevel.values,
            value: null,
            fieldName: 'education',
            patchForValue: (value) => UpdateUserProfilePatch(education: value),
            isExpanded: true,
            onTap: () {},
            onSaved: () {},
            onCancel: () {},
          ),
        ),
      ),
    ],
  );
}

@widgetbook.UseCase(
  name: 'Multi enum entry adapter states',
  type: ProfileMultiEnumRow,
  path: '[P1 product surfaces]/Profiles/Sections',
)
Widget profileMultiEnumEntryStates(BuildContext context) {
  return WidgetbookProfileProfileCatalog(
    title: 'ProfileMultiEnumRow',
    contractId: 'screen.profile.edit_tab.multi_enum_entry',
    children: [
      WidgetbookProfileStateCard(
        label: 'selected collapsed',
        child: WidgetbookProfileSectionFrame(
          height: CatchLayout.activityArtDefaultHeight,
          child: ProfileMultiEnumRow<Language>(
            icon: CatchIcons.web,
            label: 'Languages',
            contract: CatchContractConstraints.updateUserProfilePatchLanguages,
            contractValue: (value) => value.name,
            values: Language.values,
            selected: const [Language.english, Language.hindi],
            fieldName: 'languages',
            patchForValues: (values) =>
                UpdateUserProfilePatch(languages: values),
            isExpanded: false,
            onTap: () {},
            onSaved: () {},
            onCancel: () {},
          ),
        ),
      ),
      WidgetbookProfileStateCard(
        label: 'empty expanded',
        child: WidgetbookProfileSectionFrame(
          height: WidgetbookPreviewLayout.profileMediumPreviewHeight,
          child: ProfileMultiEnumRow<Language>(
            icon: CatchIcons.web,
            label: 'Languages',
            contract: CatchContractConstraints.updateUserProfilePatchLanguages,
            contractValue: (value) => value.name,
            values: Language.values,
            selected: const [],
            fieldName: 'languages',
            patchForValues: (values) =>
                UpdateUserProfilePatch(languages: values),
            isExpanded: true,
            onTap: () {},
            onSaved: () {},
            onCancel: () {},
          ),
        ),
      ),
    ],
  );
}

@widgetbook.UseCase(
  name: 'Prompt entry adapter states',
  type: ProfilePromptRow,
  path: '[P1 product surfaces]/Profiles/Sections',
)
Widget profilePromptEntryStates(BuildContext context) {
  final editState = SelfProfileEditTabState.fromProfile(
    l10n: context.l10n,
    user: widgetbookProfileViewer,
    today: ProfileSurfaceFixtures.now,
    uploadState: widgetbookProfileIdlePhotoUploadState,
  );
  final slot = editState.promptSlots.first;

  return WidgetbookProfileProfileCatalog(
    title: 'ProfilePromptRow',
    contractId: 'screen.profile.edit_tab.prompt_entry',
    children: [
      WidgetbookProfileStateCard(
        label: 'collapsed prompt',
        child: WidgetbookProfileSectionFrame(
          height: CatchLayout.activityArtDefaultHeight,
          child: ProfilePromptRow(
            user: widgetbookProfileViewer,
            slot: slot,
            isExpanded: false,
            onTap: () {},
            onSaved: () {},
            onCancel: () {},
          ),
        ),
      ),
      WidgetbookProfileStateCard(
        label: 'expanded prompt',
        child: WidgetbookProfileSectionFrame(
          height: CatchLayout.eventDetailHeroTicketWideHeight,
          child: ProfilePromptRow(
            user: widgetbookProfileViewer,
            slot: slot,
            isExpanded: true,
            onTap: () {},
            onSaved: () {},
            onCancel: () {},
          ),
        ),
      ),
    ],
  );
}

class _ProfileFieldRowCatalog extends StatefulWidget {
  const _ProfileFieldRowCatalog({required this.rows});

  final List<SelfProfileFieldRowDescriptor> rows;

  @override
  State<_ProfileFieldRowCatalog> createState() =>
      _ProfileFieldRowCatalogState();
}

class _ProfileFieldRowCatalogState extends State<_ProfileFieldRowCatalog> {
  String? _expandedField;

  @override
  Widget build(BuildContext context) {
    return Column(
      children: [
        for (final row in widget.rows)
          ProfileFieldRow(
            descriptor: row,
            isExpanded: (fieldId) => _expandedField == fieldId,
            onToggle: (fieldId) {
              setState(() {
                _expandedField = _expandedField == fieldId ? null : fieldId;
              });
            },
            onSaved: _collapse,
            onCancel: _collapse,
          ),
      ],
    );
  }

  void _collapse() {
    if (_expandedField == null) return;
    setState(() => _expandedField = null);
  }
}
