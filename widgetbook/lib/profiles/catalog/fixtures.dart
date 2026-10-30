import 'package:catch_dating_app/contexts/profiles/domain/photo_upload_state.dart';
import 'package:catch_dating_app/contexts/profiles/domain/user_profile.dart';
import 'package:catch_dating_app/design_fixtures/profile_surface_fixtures.dart';
import 'package:catch_dating_app/platform/schema_contracts/generated/callable_request_dtos.g.dart'
    show UpdateUserProfilePatch;
import 'package:catch_dating_app/platform/schema_contracts/generated/field_constraints.g.dart';
import 'package:catch_dating_app/user_profile/presentation/widgets/profile_inline_editors.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/material.dart';

final widgetbookProfileViewer = ProfileSurfaceFixtures.viewer;

final widgetbookProfileIncompleteViewer =
    ProfileSurfaceFixtures.incompleteViewer;

final widgetbookProfileTargetProfile =
    ProfileSurfaceFixtures.targetPublicProfile;

final widgetbookProfileOwnProfile = ProfileSurfaceFixtures.ownPublicProfile;

const widgetbookProfileIdlePhotoUploadState = PhotoUploadState();

class ProfileInlineRelationshipGoalChoiceEntryEditor extends StatelessWidget {
  const ProfileInlineRelationshipGoalChoiceEntryEditor({super.key});

  @override
  Widget build(BuildContext context) {
    return ProfileInlineSingleChoiceEntryEditor<RelationshipGoal>(
      icon: CatchIcons.like,
      label: 'Looking for',
      contract: CatchContractConstraints.updateUserProfilePatchRelationshipGoal,
      contractValue: (value) => value.name,
      values: RelationshipGoal.values,
      currentValue: RelationshipGoal.relationship,
      fieldName: 'relationshipGoal',
      isExpanded: true,
      onTap: () {},
      onSaved: () {},
      onCancel: () {},
      patchForValue: (value) => UpdateUserProfilePatch(relationshipGoal: value),
    );
  }
}

class ProfileInlineLanguageMultiChoiceEntryEditor extends StatelessWidget {
  const ProfileInlineLanguageMultiChoiceEntryEditor({super.key});

  @override
  Widget build(BuildContext context) {
    return ProfileInlineMultiChoiceEntryEditor<Language>(
      icon: CatchIcons.web,
      label: 'Languages',
      contract: CatchContractConstraints.updateUserProfilePatchLanguages,
      contractValue: (value) => value.name,
      values: Language.values,
      currentValues: const [Language.english, Language.hindi],
      fieldName: 'languages',
      isExpanded: true,
      onTap: () {},
      onSaved: () {},
      onCancel: () {},
      patchForValues: (values) => UpdateUserProfilePatch(languages: values),
    );
  }
}

String widgetbookProfilePaceLabel(double value) {
  final seconds = value.round();
  final minutes = seconds ~/ 60;
  final remainder = (seconds % 60).toString().padLeft(2, '0');
  return '$minutes:$remainder';
}
