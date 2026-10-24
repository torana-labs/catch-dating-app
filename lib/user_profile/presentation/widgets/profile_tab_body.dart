import 'dart:async';

import 'package:catch_dating_app/core/app_error_message.dart';
import 'package:catch_dating_app/core/labelled.dart';
import 'package:catch_dating_app/core/presentation/catch_ui_copy.dart';
import 'package:catch_dating_app/core/schema_contracts/generated/callable_request_dtos.g.dart'
    show UpdateUserProfilePatch;
import 'package:catch_dating_app/image_uploads/domain/photo_upload_state.dart';
import 'package:catch_dating_app/image_uploads/shared/photo_grid.dart';
import 'package:catch_dating_app/image_uploads/shared/photo_upload_controller.dart';
import 'package:catch_dating_app/image_uploads/shared/profile_photo_editor_screen.dart';
import 'package:catch_dating_app/l10n/l10n.dart';
import 'package:catch_dating_app/user_profile/domain/profile_photo_policy.dart';
import 'package:catch_dating_app/user_profile/domain/profile_prompts.dart';
import 'package:catch_dating_app/user_profile/domain/user_profile.dart';
import 'package:catch_dating_app/user_profile/presentation/profile_edit_controller.dart';
import 'package:catch_dating_app/user_profile/presentation/self_profile_edit_tab_state.dart';
import 'package:catch_dating_app/user_profile/presentation/self_profile_photo_intent_factory.dart';
import 'package:catch_dating_app/user_profile/presentation/widgets/profile_inline_editors.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

export 'package:catch_dating_app/user_profile/presentation/widgets/profile_tab_skeleton.dart';

class ProfileTabSliverBody extends ConsumerWidget {
  const ProfileTabSliverBody({
    super.key,
    required this.user,
    required this.uploadState,
  });

  final UserProfile user;
  final PhotoUploadState uploadState;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    return ProfileTabBody(
      user: user,
      uploadState: uploadState,
      builder: (context, children) => SliverToBoxAdapter(
        child: SizedBox(
          width: double.infinity,
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: children,
          ),
        ),
      ),
    );
  }
}

typedef ProfileTabBodyBuilder =
    Widget Function(BuildContext context, List<Widget> children);

class ProfileTabBody extends ConsumerStatefulWidget {
  const ProfileTabBody({
    super.key,
    required this.user,
    required this.uploadState,
    required this.builder,
  });

  final UserProfile user;
  final PhotoUploadState uploadState;
  final ProfileTabBodyBuilder builder;

  @override
  ConsumerState<ProfileTabBody> createState() => _ProfileTabBodyState();
}

class _ProfileTabBodyState extends ConsumerState<ProfileTabBody> {
  static const _firstPromptPadding = EdgeInsets.only(top: CatchSpacing.s3);
  static const _promptCardPadding = EdgeInsets.only(top: CatchSpacing.micro10);
  static const _promptAddPadding = EdgeInsets.only(top: CatchSpacing.s1);

  late final CatchAccordionController _fieldAccordion;

  @override
  void initState() {
    super.initState();
    _fieldAccordion = CatchAccordionController()
      ..addListener(_handleAccordionChanged);
  }

  void _handleAccordionChanged() {
    if (mounted) setState(() {});
  }

  Future<bool> _saveAboutPatch(UpdateUserProfilePatch patch) async {
    await ProfileEditController.saveFieldsMutation.run(
      ref,
      (tx) async =>
          tx.get(profileEditControllerProvider.notifier).saveFields(patch),
    );
    return true;
  }

  String _profileSaveErrorText(BuildContext context, Object error) {
    return appErrorMessage(
      error,
      l10n: context.l10n,
      context: AppErrorContext.profile,
    );
  }

  @override
  void dispose() {
    _fieldAccordion
      ..removeListener(_handleAccordionChanged)
      ..dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final user = widget.user;
    final uploadState = widget.uploadState;
    final editState = SelfProfileEditTabState.fromProfile(
      l10n: context.l10n,
      user: user,
      today: DateTime.now(),
      uploadState: uploadState,
    );
    const photoActions = SelfProfilePhotoIntentFactory();
    final visiblePromptSlots = editState.promptSlots
        .take(editState.completedPromptCount + 1)
        .toList(growable: false);
    final prompts = [
      for (final slot in visiblePromptSlots)
        ProfilePromptRow(
          user: user,
          slot: slot,
          isExpanded: _fieldAccordion.isExpanded(slot.fieldName),
          onTap: () => _fieldAccordion.toggle(slot.fieldName),
          onSaved: _fieldAccordion.collapse,
          onCancel: _fieldAccordion.collapse,
        ),
    ];

    return widget.builder(context, [
      CatchSectionList(
        emptyStateOmitted: true,
        gap: 0,
        children: [
          CatchPageBody(
            padding: CatchInsets.pageHorizontal,
            child: CatchSection.content(
              title: context.l10n.profileCoreDetailsTitle,
              child: CatchText(
                context.l10n.profileCoreDetailsBody,
                variant: CatchTextVariant.supporting,
              ),
            ),
          ),
          CatchPageBody(
            padding: CatchInsets.pageHorizontal,
            child: ProfilePhotosSection(
              first: true,
              state: editState.photoGrid,
              onSlotTapped: (index) {
                final request = photoActions.editorRequest(
                  state: editState.photoGrid,
                  index: index,
                );
                unawaited(
                  openProfilePhotoEditor(
                    context: context,
                    ref: ref,
                    index: request.index,
                    photo: request.photo,
                    canDelete: request.canDelete,
                  ),
                );
              },
              onDeletePhoto: (index) {
                final intent = photoActions.deleteIntent(index);
                unawaited(
                  PhotoUploadController.uploadPhotoMutation.run(ref, (
                    tx,
                  ) async {
                    await tx
                        .get(photoUploadControllerProvider.notifier)
                        .deletePhoto(intent.index);
                  }),
                );
              },
              onReorderPhoto: (fromIndex, toIndex) {
                final intent = photoActions.reorderIntent(
                  fromIndex: fromIndex,
                  toIndex: toIndex,
                );
                unawaited(
                  PhotoUploadController.uploadPhotoMutation.run(ref, (
                    tx,
                  ) async {
                    await tx
                        .get(photoUploadControllerProvider.notifier)
                        .reorderPhoto(
                          fromIndex: intent.fromIndex,
                          toIndex: intent.toIndex,
                        );
                  }),
                );
              },
            ),
          ),
          CatchPageBody(
            padding: CatchInsets.pageHorizontal,
            child: CatchSection.divided(
              title: context.l10n.userProfileProfileTabTitlePrompts,
              count: context.l10n
                  .userProfileProfileTabVisiblecopyCompletedpromptcountOfMaxprofilepromptanswersAnswered(
                    completedPromptCount: editState.completedPromptCount,
                    maxProfilePromptAnswers: maxProfilePromptAnswers,
                  ),
              showInternalDividers: false,
              children: [
                for (var index = 0; index < prompts.length; index++)
                  Padding(
                    padding: index == 0
                        ? _firstPromptPadding
                        : visiblePromptSlots[index].isAddAffordance
                        ? _promptAddPadding
                        : _promptCardPadding,
                    child: prompts[index],
                  ),
              ],
            ),
          ),
          CatchFormList<UpdateUserProfilePatch>(
            fieldCopy: catchFieldCopy(context.l10n),
            title: context.l10n.userProfileProfileTabTitleAboutYou,
            rows: editState.aboutSectionRows,
            accordion: _fieldAccordion,
            onSave: _saveAboutPatch,
            errorTextBuilder: _profileSaveErrorText,
          ),
          CatchPageBody(
            padding: CatchInsets.pageHorizontal,
            child: CatchSection.fieldRows(
              title: context.l10n.userProfileProfileTabTitleLifestyle,
              children: [
                for (final row in editState.lifestyleRows)
                  ProfileFieldRow(
                    descriptor: row,
                    isExpanded: _fieldAccordion.isExpanded,
                    onToggle: _fieldAccordion.toggle,
                    onSaved: _fieldAccordion.collapse,
                    onCancel: _fieldAccordion.collapse,
                  ),
              ],
            ),
          ),
          CatchPageBody(
            padding: CatchInsets.pageHorizontal,
            child: CatchSection.fieldRows(
              title: context.l10n.profileActivityPreferencesTitle,
              children: [
                CatchField.control(
                  key: const ValueKey('profile-running-preferences'),
                  copy: catchFieldCopy(context.l10n),
                  title: context.l10n.userProfileProfileTabTitleRunning,
                  emphasis: CatchFieldEmphasis.title,
                  body: context.l10n.profileActivityPreferencesBody,
                  titleMaxLines: 3,
                  bodyMaxLines: 6,
                  contractExemption:
                      'Disclosure only; child editors own their activity-specific schema contracts.',
                  child: CatchSection.fieldRows(
                    first: true,
                    children: [
                      for (final row in editState.runningRows)
                        ProfileFieldRow(
                          descriptor: row,
                          isExpanded: _fieldAccordion.isExpanded,
                          onToggle: _fieldAccordion.toggle,
                          onSaved: _fieldAccordion.collapse,
                          onCancel: _fieldAccordion.collapse,
                        ),
                    ],
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
      gapH32,
    ]);
  }
}

class ProfileFieldRow extends StatelessWidget {
  const ProfileFieldRow({
    super.key,
    required this.descriptor,
    required this.isExpanded,
    required this.onToggle,
    required this.onSaved,
    required this.onCancel,
  });

  final SelfProfileFieldRowDescriptor descriptor;
  final bool Function(String fieldId) isExpanded;
  final ValueChanged<String> onToggle;
  final VoidCallback onSaved;
  final VoidCallback onCancel;

  @override
  Widget build(BuildContext context) {
    return descriptor.map(
      singleChoice: <T extends Labelled>(descriptor) => ProfileSingleEnumRow<T>(
        icon: descriptor.icon,
        label: descriptor.label,
        values: descriptor.values,
        value: descriptor.value,
        fieldName: descriptor.fieldName,
        contract: descriptor.contract,
        contractValue: descriptor.contractValue,
        patchForValue: descriptor.patchForValue,
        emptyValueText: descriptor.emptyValueText,
        allowEmptySelection: descriptor.allowEmptySelection,
        showOptionalLabel: descriptor.showOptionalLabel,
        isExpanded: isExpanded(descriptor.fieldName),
        onTap: () => onToggle(descriptor.fieldName),
        onSaved: onSaved,
        onCancel: onCancel,
      ),
      multiChoice: <T extends Labelled>(descriptor) => ProfileMultiEnumRow<T>(
        icon: descriptor.icon,
        label: descriptor.label,
        values: descriptor.values,
        selected: descriptor.selected,
        fieldName: descriptor.fieldName,
        contract: descriptor.contract,
        contractValue: descriptor.contractValue,
        emptyValueText: descriptor.emptyValueText,
        patchForValues: descriptor.patchForValues,
        patchForLatestProfile: descriptor.patchForLatestProfile,
        allowEmptySelection: descriptor.allowEmptySelection,
        showOptionalLabel: descriptor.showOptionalLabel,
        isExpanded: isExpanded(descriptor.fieldName),
        onTap: () => onToggle(descriptor.fieldName),
        onSaved: onSaved,
        onCancel: onCancel,
        isAddAffordanceWhenEmpty: descriptor.isAddAffordanceWhenEmpty,
      ),
      range: (descriptor) => ProfileInlineRangeEditor(
        key: ValueKey('inline-${descriptor.id}-editor'),
        icon: descriptor.icon,
        title: descriptor.label,
        value: descriptor.value,
        currentMin: descriptor.currentMin,
        currentMax: descriptor.currentMax,
        isExpanded: isExpanded(descriptor.id),
        onTap: () => onToggle(descriptor.id),
        sliderMin: descriptor.sliderMin,
        sliderMax: descriptor.sliderMax,
        divisions: descriptor.divisions,
        labelText: descriptor.labelText,
        patchForRange: descriptor.patchForRange,
        patchForLatestProfile: descriptor.patchForLatestProfile,
        saveEndValue: descriptor.saveEndValue,
        savedCurrentMax: descriptor.savedCurrentMax,
        minimumContract: descriptor.contract,
        maximumContract: descriptor.maximumContract,
        onSaved: onSaved,
        onCancel: onCancel,
      ),
    );
  }
}

class ProfileSingleEnumRow<T extends Labelled> extends StatelessWidget {
  const ProfileSingleEnumRow({
    super.key,
    required this.icon,
    required this.label,
    required this.values,
    required this.fieldName,
    required this.patchForValue,
    required this.contract,
    required this.contractValue,
    required this.isExpanded,
    required this.onTap,
    required this.onSaved,
    required this.onCancel,
    this.value,
    this.emptyValueText,
    this.allowEmptySelection = true,
    this.showOptionalLabel = false,
  });

  final IconData icon;
  final String label;
  final List<T> values;
  final T? value;
  final String fieldName;
  final UpdateUserProfilePatch Function(T? value) patchForValue;
  final CatchContractFieldConstraints contract;
  final String Function(T value) contractValue;
  final String? emptyValueText;
  final bool allowEmptySelection;
  final bool showOptionalLabel;
  final bool isExpanded;
  final VoidCallback onTap;
  final VoidCallback onSaved;
  final VoidCallback onCancel;

  @override
  Widget build(BuildContext context) {
    return ProfileInlineSingleChoiceEntryEditor<T>(
      key: ValueKey('inline-$fieldName-entry-editor'),
      icon: icon,
      label: label,
      values: values,
      currentValue: value,
      emptyValueText: emptyValueText,
      allowEmptySelection: allowEmptySelection,
      showOptionalLabel: showOptionalLabel,
      fieldName: fieldName,
      contract: contract,
      contractValue: contractValue,
      patchForValue: patchForValue,
      isExpanded: isExpanded,
      isAddAffordance: value == null,
      onTap: onTap,
      onSaved: onSaved,
      onCancel: onCancel,
    );
  }
}

class ProfileMultiEnumRow<T extends Labelled> extends StatelessWidget {
  const ProfileMultiEnumRow({
    super.key,
    required this.icon,
    required this.label,
    required this.values,
    required this.selected,
    required this.fieldName,
    required this.patchForValues,
    required this.contract,
    required this.contractValue,
    required this.isExpanded,
    required this.onTap,
    required this.onSaved,
    required this.onCancel,
    this.patchForLatestProfile,
    this.emptyValueText,
    this.isAddAffordanceWhenEmpty = true,
    this.allowEmptySelection = true,
    this.showOptionalLabel = false,
  });

  final IconData icon;
  final String label;
  final List<T> values;
  final List<T> selected;
  final String fieldName;
  final String? emptyValueText;
  final UpdateUserProfilePatch Function(List<T> values) patchForValues;
  final CatchContractFieldConstraints contract;
  final String Function(T value) contractValue;
  final UpdateUserProfilePatch Function(UserProfile user, List<T> values)?
  patchForLatestProfile;
  final bool isExpanded;
  final VoidCallback onTap;
  final VoidCallback onSaved;
  final VoidCallback onCancel;
  final bool isAddAffordanceWhenEmpty;
  final bool allowEmptySelection;
  final bool showOptionalLabel;

  @override
  Widget build(BuildContext context) {
    final isEmpty = selected.isEmpty;
    return ProfileInlineMultiChoiceEntryEditor<T>(
      key: ValueKey('inline-$fieldName-entry-editor'),
      icon: icon,
      label: label,
      values: values,
      currentValues: selected,
      emptyValueText: emptyValueText,
      fieldName: fieldName,
      contract: contract,
      contractValue: contractValue,
      patchForValues: patchForValues,
      patchForLatestProfile: patchForLatestProfile,
      isExpanded: isExpanded,
      isAddAffordance: isEmpty && isAddAffordanceWhenEmpty,
      allowEmptySelection: allowEmptySelection,
      showOptionalLabel: showOptionalLabel,
      onTap: onTap,
      onSaved: onSaved,
      onCancel: onCancel,
    );
  }
}

class ProfilePromptRow extends StatelessWidget {
  const ProfilePromptRow({
    super.key,
    required this.user,
    required this.slot,
    required this.isExpanded,
    required this.onTap,
    required this.onSaved,
    required this.onCancel,
  });

  final UserProfile user;
  final SelfProfilePromptSlotState slot;
  final bool isExpanded;
  final VoidCallback onTap;
  final VoidCallback onSaved;
  final VoidCallback onCancel;

  @override
  Widget build(BuildContext context) {
    final text = slot.displayText;
    return ProfileInlinePromptEntryEditor(
      key: ValueKey('inline-${slot.fieldName}-entry-editor'),
      icon: CatchIcons.formatQuoteRounded,
      label: slot.definition.title,
      currentAnswer: text,
      currentPromptId: slot.currentPromptId,
      currentPrompts: user.profilePrompts,
      promptIndex: slot.index,
      availablePromptIds: slot.availablePromptIds,
      fieldName: slot.fieldName,
      isExpanded: isExpanded,
      isAddAffordance: slot.isAddAffordance,
      onTap: onTap,
      onSaved: onSaved,
      onCancel: onCancel,
    );
  }
}

class ProfilePhotosSection extends StatelessWidget {
  const ProfilePhotosSection({
    super.key,
    required this.first,
    required this.state,
    required this.onSlotTapped,
    required this.onDeletePhoto,
    required this.onReorderPhoto,
  });

  final bool first;
  final SelfProfilePhotoGridState state;
  final void Function(int index) onSlotTapped;
  final void Function(int index) onDeletePhoto;
  final void Function(int fromIndex, int toIndex) onReorderPhoto;

  @override
  Widget build(BuildContext context) {
    final completedCount = state.profilePhotos.length;

    return CatchSection.fieldRows(
      title: context.l10n.userProfileProfileTabTitlePhotos,
      count: context.l10n
          .userProfileProfileTabVisiblecopyCompletedcountOfMaximumprofilephotocountAdded(
            completedCount: completedCount,
            maximumProfilePhotoCount: maximumProfilePhotoCount,
          ),
      first: first,
      child: Padding(
        padding: CatchInsets.fieldSectionChildTop,
        child: PhotoGrid(
          profilePhotos: state.profilePhotos,
          loadingIndices: state.loadingIndices,
          onSlotTapped: onSlotTapped,
          canDeletePhotos: state.canDeletePhotos,
          onDeletePhoto: state.canDeletePhotos ? onDeletePhoto : null,
          onReorderPhoto: onReorderPhoto,
        ),
      ),
    );
  }
}
