part of 'host_forms_screen.dart';

Future<void> _showHostFormsFilters(
  BuildContext context, {
  required Set<HostFormPurpose> purposes,
  required Set<HostFormLifecycleStatus> statuses,
  required ValueChanged<Set<HostFormPurpose>> onPurposesChanged,
  required ValueChanged<Set<HostFormLifecycleStatus>> onStatusesChanged,
}) async {
  var selectedPurposes = Set<HostFormPurpose>.of(purposes);
  var selectedStatuses = Set<HostFormLifecycleStatus>.of(statuses);
  await showCatchBottomSheet<void>(
    context: context,
    builder: (sheetContext) => StatefulBuilder(
      builder: (context, updateSheet) => CatchSheet.filter(
        title: context.l10n.hostCustomersFilters,
        trailing: CatchButton(
          label: context.l10n.hostFiltersResetAll,
          variant: CatchButtonVariant.ghost,
          size: CatchButtonSize.md,
          onPressed: selectedPurposes.isEmpty && selectedStatuses.isEmpty
              ? null
              : () {
                  updateSheet(() {
                    selectedPurposes = {};
                    selectedStatuses = {};
                  });
                  onPurposesChanged(const {});
                  onStatusesChanged(const {});
                },
        ),
        closeLabel: context.l10n.hostSheetClose,
        onClose: () => Navigator.of(sheetContext).pop(),
        child: CatchSectionList(
          emptyStateOmitted: true,
          mainAxisSize: MainAxisSize.min,
          children: [
            CatchSection.choiceGroup(
              first: true,
              title: context.l10n.hostFormPurposeLabel,
              child: CatchChoiceInput<HostFormPurpose>(
                values: HostFormPurpose.values,
                itemLabelBuilder: (value) =>
                    hostFormPurposeLabel(context, value),
                selected: selectedPurposes,
                mode: CatchChipMode.multiple,
                allowEmptySelection: true,
                onChanged: (values) {
                  updateSheet(() => selectedPurposes = Set.of(values));
                  onPurposesChanged(Set.unmodifiable(values));
                },
              ),
            ),
            CatchSection.choiceGroup(
              first: true,
              title: context.l10n.hostAudienceFormStatusFilter,
              child: CatchChoiceInput<HostFormLifecycleStatus>(
                values: HostFormLifecycleStatus.values,
                itemLabelBuilder: (value) =>
                    hostFormStatusLabel(context, value),
                selected: selectedStatuses,
                mode: CatchChipMode.multiple,
                allowEmptySelection: true,
                onChanged: (values) {
                  updateSheet(() => selectedStatuses = Set.of(values));
                  onStatusesChanged(Set.unmodifiable(values));
                },
              ),
            ),
          ],
        ),
      ),
    ),
  );
}

List<CatchActionMenuItem<_HostFormRowAction>> _hostFormRowActions(
  BuildContext context,
  HostFormSummary form,
) => [
  if (form.activeVersionId != null)
    CatchActionMenuItem(
      value: _HostFormRowAction.analytics,
      label: context.l10n.hostFormsAnalyticsAction,
      icon: CatchIcons.insightsOutlined,
    ),
  if (form.activeVersionId != null)
    CatchActionMenuItem(
      value: _HostFormRowAction.automations,
      label: context.l10n.hostFormsAutomationsAction,
      icon: CatchIcons.autoAwesomeOutlined,
    ),
  CatchActionMenuItem(
    value: _HostFormRowAction.duplicate,
    label: context.l10n.hostFormsDuplicate,
    icon: CatchIcons.contentCopyRounded,
  ),
  if (form.canPause)
    CatchActionMenuItem(
      value: _HostFormRowAction.pause,
      label: context.l10n.hostFormsPause,
      icon: CatchIcons.pauseCircleOutlineRounded,
    ),
  if (form.canResume)
    CatchActionMenuItem(
      value: _HostFormRowAction.resume,
      label: context.l10n.hostFormsResume,
      icon: CatchIcons.playCircleOutlineRounded,
    ),
  if (form.status != HostFormLifecycleStatus.archived)
    CatchActionMenuItem(
      value: _HostFormRowAction.archive,
      label: context.l10n.hostFormsArchive,
      icon: CatchIcons.archiveOutlined,
    ),
  if (form.canDeleteDraft)
    CatchActionMenuItem(
      value: _HostFormRowAction.delete,
      label: context.l10n.hostFormsDeleteDraft,
      icon: CatchIcons.deleteOutlineRounded,
      isDestructive: true,
    ),
];
