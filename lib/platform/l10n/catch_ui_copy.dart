import 'package:catch_dating_app/l10n/generated/app_localizations.dart';
import 'package:catch_ui/catch_ui.dart';

/// Resolves field grammar and actions at the app's localization boundary.
CatchFieldCopy catchFieldCopy(AppLocalizations l10n) => CatchFieldCopy(
  label: catchFieldLabelTextCopy(l10n),
  validation: catchFormValidationCopy(l10n),
  cancelLabel: l10n.coreCatchFieldLabelCancel,
  doneLabel: l10n.coreCatchFieldLabelDone,
  clearLabel: l10n.exploreExploreScreenLabelClear,
  savingLabel: l10n.coreCatchFieldLabelSaving,
  savingSemanticLabel: l10n.coreCatchFieldSemanticSaving,
  savedSemanticLabel: l10n.coreCatchFieldSemanticSaved,
  emptyValueText: (title) {
    final label = title.trim();
    final fieldLabel = l10n.localeName.startsWith('en')
        ? label.toLowerCase()
        : label;
    return l10n.coreCatchFieldVisiblecopyAddFieldLabel(fieldLabel: fieldLabel);
  },
  selectPlaceholder: (title) {
    final normalizedTitle = title?.trim();
    if (normalizedTitle == null || normalizedTitle.isEmpty) {
      return l10n.coreCatchFieldVisiblecopySelect;
    }
    return l10n.coreCatchFieldVisiblecopySelectTolowercase(
      toLowerCase: normalizedTitle.toLowerCase(),
    );
  },
  clearTooltip: (title) => l10n.coreCatchFieldTooltipClearValue1(
    value1: title ?? l10n.coreCatchFieldTooltipField,
  ),
);

/// Keeps validation messages and their numeric grammar in the app catalog.
CatchFormValidationCopy catchFormValidationCopy(
  AppLocalizations l10n,
) => CatchFormValidationCopy(
  requiredMessage: (label) =>
      l10n.coreCatchFormValidationRequired(field: label),
  minLengthMessage: (label, minLength) =>
      l10n.coreCatchFormValidationMinLength(field: label, minLength: minLength),
  maxLengthMessage: (label, maxLength) =>
      l10n.coreCatchFormValidationMaxLength(field: label, maxLength: maxLength),
  patternMessage: (label) => l10n.coreCatchFormValidationPattern(field: label),
);

/// Resolves optional-field copy at the app's localization boundary.
CatchFieldLabelTextCopy catchFieldLabelTextCopy(AppLocalizations l10n) =>
    CatchFieldLabelTextCopy(
      optionalLabel: l10n.coreCatchFormFieldLabelTextOptional,
      optionalSuffix: l10n.coreCatchFieldTextOptionalSuffix,
      optionalSemantics: (label) =>
          l10n.coreCatchFormFieldLabelLabelLabelOptional(label: label),
    );

/// Resolves recovery copy without coupling shared error widgets to the app.
CatchFrameworkErrorCopy catchFrameworkErrorCopy(AppLocalizations l10n) =>
    CatchFrameworkErrorCopy(
      title: l10n.coreCatchFrameworkErrorViewTextSomethingWentWrong,
      message: l10n.coreCatchFrameworkErrorViewTextThisScreenHitA,
      debugDetailsLabel: l10n.coreCatchFrameworkErrorViewTextDeveloperDetails,
    );

/// Keeps visibility labels and badge modes paired at the localization boundary.
CatchPrivacyBadgeCopy catchPrivacyBadgeCopy(AppLocalizations l10n) =>
    CatchPrivacyBadgeCopy(
      privateToYouLabel: l10n.coreCatchPrivacyBadgeLabelPrivateToYou,
      hostCanSeeLabel: l10n.coreCatchPrivacyBadgeLabelHostCanSee,
      catchPrivateLabel: l10n.coreCatchPrivacyBadgeLabelCatchPrivate,
    );

/// Formats avatar overflow counts at the app's localization boundary.
String Function(int) catchAvatarCountLabelBuilder(AppLocalizations l10n) =>
    (count) => l10n.coreCatchPersonAvatarTextCount(count: count);

/// Resolves person-row text and count semantics without app imports in the UI package.
CatchPersonRowCopy catchPersonRowCopy(AppLocalizations l10n) =>
    CatchPersonRowCopy(
      typingLabel: l10n.coreCatchPersonRowTextTyping,
      newMatchLabel: l10n.coreCatchPersonRowLabelNewMatch,
      unreadCountLabel: (count) => count == 1
          ? l10n.coreCatchPersonRowLabelUnreadChat
          : l10n.coreCatchPersonRowLabelLabelUnreadChats(
              label: catchCountLabel(count),
            ),
    );

/// Resolves the date picker's fixed toolbar and default-title copy.
CatchPickerCopy catchDatePickerCopy(AppLocalizations l10n) => CatchPickerCopy(
  title: l10n.coreCatchAdaptivePickerVisiblecopySelectDate,
  cancelLabel: l10n.coreCatchAdaptivePickerTextCancel,
  doneLabel: l10n.coreCatchAdaptivePickerTextDone,
);

/// Resolves the time picker's fixed toolbar and default-title copy.
CatchPickerCopy catchTimePickerCopy(AppLocalizations l10n) => CatchPickerCopy(
  title: l10n.coreCatchAdaptivePickerVisiblecopySelectTime,
  cancelLabel: l10n.coreCatchAdaptivePickerTextCancel,
  doneLabel: l10n.coreCatchAdaptivePickerTextDone,
);

/// Resolves confirmation defaults without importing the app catalog in shared UI.
CatchDialogCopy catchDialogCopy(AppLocalizations l10n) => CatchDialogCopy(
  cancelLabel: l10n.coreCatchAdaptiveDialogVisiblecopyCancel,
  confirmLabel: l10n.coreCatchAdaptiveDialogVisiblecopyConfirm,
);

/// Resolves form-review statuses at the app's localization boundary.
String Function(CatchFormStepListStatus) catchFormStepStatusLabelBuilder(
  AppLocalizations l10n,
) =>
    (status) => switch (status) {
      CatchFormStepListStatus.complete => l10n.hostsWizardStatusComplete,
      CatchFormStepListStatus.needsInformation =>
        l10n.hostsWizardStatusNeedsInformation,
      CatchFormStepListStatus.optional => l10n.hostsWizardStatusOptional,
    };

/// Formats a wizard counter without coupling shared headers to app copy.
String Function(int step, int total) catchStepHeaderLabelBuilder(
  AppLocalizations l10n,
) =>
    (step, total) => l10n.coreCatchStepFlowHeaderTextStepClampedstepOfTotal(
      clampedStep: step,
      total: total,
    );

/// Supplies the compact counter used when the caller enables large text.
String Function(int step, int total) catchStepHeaderCompactLabelBuilder(
  AppLocalizations l10n,
) =>
    (step, total) =>
        l10n.coreCatchStepFlowHeaderTextCompactStepClampedstepTotal(
          clampedStep: step,
          total: total,
        );

/// Resolves search defaults and action tooltips without app imports in shared UI.
CatchSearchFieldCopy catchSearchFieldCopy(AppLocalizations l10n) =>
    CatchSearchFieldCopy(
      searchLabel: l10n.sharedSearchLabel,
      clearTooltip: (placeholder) =>
          l10n.coreCatchSearchFieldTooltipClearPlaceholder(
            placeholder: placeholder,
          ),
      closeSearchLabel: l10n.coreCatchSearchFieldVisiblecopyCloseSearch,
    );
