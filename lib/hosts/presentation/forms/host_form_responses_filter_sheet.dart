part of 'host_form_responses_section.dart';

extension _HostFormResponsesFilters on _HostFormResponsesSectionState {
  String _formLabel(BuildContext context, HostFormResponsesState? loaded) =>
      widget.formId == null
      ? context.l10n.hostAudienceAllForms
      : widget.formTitle ??
            loaded?.responses.firstOrNull?.formTitle ??
            context.l10n.hostAudienceSelectedForm;

  Future<void> _openFilters() {
    var formId = widget.formId;
    var options = _filterOptions;
    return showCatchBottomSheet<void>(
      context: context,
      builder: (sheetContext) => StatefulBuilder(
        builder: (context, updateSheet) => Consumer(
          builder: (context, ref, _) {
            final responseState = ref.watch(
              hostFormResponsesControllerProvider(_responseRequest(formId)),
            );
            final loaded = catchAsyncStateFromAsyncValue(responseState).value;
            if (loaded != null) options = loaded.answerFilterOptions;
            final scope =
                loaded?.versionScope ??
                (formId == widget.formId ? _versionScope : null);
            final hasVersionOverride =
                formId == widget.formId &&
                scope != null &&
                _versionResolved &&
                _versionId != scope.activeVersionId;
            void changeForm(String? value) {
              if (formId == value) return;
              updateSheet(() {
                formId = value;
                options = const [];
              });
              _updateFilters(_answerFilters.clear);
              widget.onFormChanged?.call(value);
            }

            return CatchSheet.filter(
              title: context.l10n.hostCustomersFilters,
              closeLabel: context.l10n.hostSheetClose,
              onClose: () => Navigator.of(sheetContext).pop(),
              trailing: CatchButton(
                label: context.l10n.hostFiltersResetAll,
                variant: CatchButtonVariant.ghost,
                size: CatchButtonSize.md,
                onPressed:
                    _answerFilters.isEmpty &&
                        !hasVersionOverride &&
                        (formId == null || widget.onFormChanged == null)
                    ? null
                    : () {
                        if (hasVersionOverride) {
                          _selectVersion(scope.activeVersionId);
                        }
                        _updateFilters(_answerFilters.clear);
                        if (widget.onFormChanged != null) changeForm(null);
                        updateSheet(() {});
                      },
              ),
              child: CatchSectionList(
                emptyStateOmitted: true,
                mainAxisSize: MainAxisSize.min,
                children: [
                  if (widget.showFormContext)
                    CatchSection.choiceGroup(
                      first: true,
                      title: context.l10n.hostAudienceFormWorkspaceTitle,
                      child: Consumer(
                        builder: (context, ref, _) {
                          final request = HostFormListRequest(
                            organizerId: widget.organizerId,
                          );
                          final directory = ref.watch(
                            hostFormsDirectoryControllerProvider(request),
                          );
                          final forms =
                              catchAsyncStateFromAsyncValue(
                                directory,
                              ).value?.forms ??
                              const <HostFormSummary>[];
                          final labels = <String, String>{
                            '': context.l10n.hostAudienceAllForms,
                            for (final form in forms) form.formId: form.title,
                            if (formId != null &&
                                !forms.any((form) => form.formId == formId))
                              formId!:
                                  widget.formTitle ??
                                  context.l10n.hostAudienceSelectedForm,
                          };
                          final choices = CatchChoiceInput<String>(
                            values: labels.keys.toList(),
                            selected: {formId ?? ''},
                            itemLabelBuilder: (value) => labels[value]!,
                            mode: CatchChipMode.single,
                            onChanged: widget.onFormChanged == null
                                ? null
                                : (values) => changeForm(
                                    values.single.isEmpty
                                        ? null
                                        : values.single,
                                  ),
                          );
                          return CatchAsyncBoundary<HostFormsDirectoryState>(
                            value: directory,
                            onRetry: () => ref.invalidate(
                              hostFormsDirectoryControllerProvider(request),
                            ),
                            loadingBuilder: (_) =>
                                CatchSkeleton.content(child: choices),
                            builder: (context, state) => Column(
                              mainAxisSize: MainAxisSize.min,
                              crossAxisAlignment: CrossAxisAlignment.stretch,
                              children: [
                                choices,
                                if (state.canLoadMore || state.loadingMore)
                                  CatchButton.command(
                                    label: context.l10n.hostFormsLoadMore,
                                    onPressed: state.loadingMore
                                        ? null
                                        : () => ref
                                              .read(
                                                hostFormsDirectoryControllerProvider(
                                                  request,
                                                ).notifier,
                                              )
                                              .loadMore(),
                                  ),
                                if (state.loadMoreError case final error?)
                                  CatchLocalizedErrorState(
                                    error,
                                    context: AppErrorContext.forms,
                                    mode: CatchErrorStateMode.compact,
                                    onRetry: () => ref
                                        .read(
                                          hostFormsDirectoryControllerProvider(
                                            request,
                                          ).notifier,
                                        )
                                        .loadMore(),
                                  ),
                              ],
                            ),
                          );
                        },
                      ),
                    ),
                  if (formId != null &&
                      scope != null &&
                      scope.activeVersionId != null)
                    CatchSection.choiceGroup(
                      title: context.l10n.hostAudienceResultsVersion(
                        version: scope.publishedVersion,
                      ),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.stretch,
                        children: [
                          CatchChoiceInput<String>(
                            values: [
                              '',
                              for (
                                var number = scope.publishedVersion;
                                number >= 1 &&
                                    number > scope.publishedVersion - 50;
                                number--
                              )
                                '${formId}_v$number',
                              if (_versionId != null &&
                                  _versionNumber(_versionId!) <=
                                      scope.publishedVersion - 50)
                                _versionId!,
                            ],
                            selected: {_versionId ?? ''},
                            itemLabelBuilder: (id) => id.isEmpty
                                ? context.l10n.hostAudienceResponsesAllVersions
                                : context.l10n.hostAudienceResultsVersion(
                                    version: _versionNumber(id),
                                  ),
                            itemKeyBuilder: (id) =>
                                ValueKey('response-version-$id'),
                            mode: CatchChipMode.single,
                            onChanged: (values) {
                              _selectVersion(
                                values.single.isEmpty ? null : values.single,
                              );
                              updateSheet(() => options = const []);
                            },
                          ),
                          if (scope.publishedVersion > 50)
                            CatchField.input(
                              copy: catchFieldCopy(context.l10n),
                              title: context.l10n.hostAudienceResultsVersion(
                                version: scope.publishedVersion,
                              ),
                              keyboardType: TextInputType.number,
                              maxLength: 7,
                              contractExemption:
                                  'Historical published version number is bounded by the form contract.',
                              onSubmitted: (value) {
                                final number = int.tryParse(value);
                                if (number == null ||
                                    number < 1 ||
                                    number > scope.publishedVersion) {
                                  return;
                                }
                                _selectVersion('${formId}_v$number');
                                updateSheet(() => options = const []);
                              },
                            ),
                        ],
                      ),
                    ),
                  for (final filter in options)
                    if (scope == null || _versionId != null)
                      CatchSection.choiceGroup(
                        first: true,
                        title: filter.label,
                        child: CatchChoiceInput<String>(
                          values: filter.options.keys.toList(),
                          selected:
                              _answerFilters[filter.questionId] ?? const {},
                          itemLabelBuilder: (value) => filter.options[value]!,
                          itemKeyBuilder: (value) => ValueKey(
                            'response-filter-${filter.questionId}-$value',
                          ),
                          mode: CatchChipMode.multiple,
                          allowEmptySelection: true,
                          onChanged:
                              _answerFilters.containsKey(filter.questionId) ||
                                  _answerFilters.length <
                                      CatchContractConstraints
                                          .listOrganizerFormResponsesCallablePayloadAnswerFilters
                                          .maxItems!
                              ? (values) {
                                  final maximum = CatchContractConstraints
                                      .listOrganizerFormResponsesCallablePayloadAnswerFiltersItemsValues
                                      .maxItems!;
                                  if (values.length > maximum) {
                                    showCatchNotice(
                                      context,
                                      context.l10n
                                          .hostResponseFilterSelectionLimit(
                                            count: maximum,
                                          ),
                                    );
                                    return;
                                  }
                                  _updateFilters(() {
                                    if (values.isEmpty) {
                                      _answerFilters.remove(filter.questionId);
                                    } else {
                                      _answerFilters[filter.questionId] =
                                          Set.unmodifiable(values);
                                    }
                                  });
                                  updateSheet(() {});
                                }
                              : null,
                        ),
                      ),
                ],
              ),
            );
          },
        ),
      ),
    );
  }
}
