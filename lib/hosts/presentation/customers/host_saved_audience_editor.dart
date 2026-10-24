part of 'host_customers_screen.dart';

class HostSavedAudienceEditorScreen extends ConsumerWidget {
  const HostSavedAudienceEditorScreen({
    super.key,
    required this.organizerId,
    this.audienceId,
    this.initialAudience,
  });

  final String organizerId;
  final String? audienceId;
  final HostSavedAudience? initialAudience;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final supplied = initialAudience;
    if (supplied != null) {
      return HostSavedAudienceWorkspace(audience: supplied);
    }
    if (audienceId == null) {
      return _HostSavedAudienceEditorForm(
        organizerId: organizerId,
        initialAudience: supplied,
      );
    }
    final audiences = ref.watch(hostAllSavedAudiencesProvider(organizerId));
    return CatchAsyncBoundary<HostSavedAudiencePage>(
      value: audiences,
      onRetry: () => ref.invalidate(hostAllSavedAudiencesProvider(organizerId)),
      initialLoadTimeout: null,
      loadingBuilder: (_) =>
          HostLoadingScreen(title: context.l10n.hostSavedAudiencesManage),
      errorBuilder: (_, error, _, onBoundaryRetry) => CatchRouteScaffold(
        topBarBuilder: (context, scrolledUnder) => CatchTopBar.route(
          title: context.l10n.hostSavedAudiencesManage,
          navigation: const CatchTopBarNavigation(
            mode: CatchTopBarNavigationMode.back,
          ),
          emphasis: scrolledUnder
              ? CatchTopBarEmphasis.divided
              : CatchTopBarEmphasis.plain,
        ),
        body: CatchRouteBody.standardViewport(
          child: CatchLocalizedErrorState(
            error,
            context: AppErrorContext.customers,
            onRetry: onBoundaryRetry,
          ),
        ),
      ),
      builder: (context, page) {
        final audience = page.audiences
            .where((item) => item.audienceId == audienceId)
            .firstOrNull;
        if (audience == null) {
          return CatchRouteScaffold(
            topBarBuilder: (context, scrolledUnder) => CatchTopBar.route(
              title: context.l10n.hostSavedAudiencesManage,
              navigation: const CatchTopBarNavigation(
                mode: CatchTopBarNavigationMode.back,
              ),
              emphasis: scrolledUnder
                  ? CatchTopBarEmphasis.divided
                  : CatchTopBarEmphasis.plain,
            ),
            body: CatchRouteBody.standardViewport(
              child: CatchLocalizedErrorState(
                StateError(context.l10n.hostSavedAudienceNotFound),
                context: AppErrorContext.customers,
                onRetry: () =>
                    ref.invalidate(hostAllSavedAudiencesProvider(organizerId)),
              ),
            ),
          );
        }
        return HostSavedAudienceWorkspace(audience: audience);
      },
    );
  }
}

class _HostSavedAudienceEditorForm extends ConsumerStatefulWidget {
  const _HostSavedAudienceEditorForm({
    super.key,
    required this.organizerId,
    required this.initialAudience,
    this.onSaved,
  });

  final String organizerId;
  final HostSavedAudience? initialAudience;
  final ValueChanged<HostSavedAudience>? onSaved;

  @override
  ConsumerState<_HostSavedAudienceEditorForm> createState() =>
      _HostSavedAudienceEditorFormState();
}

class _HostSavedAudienceEditorFormState
    extends ConsumerState<_HostSavedAudienceEditorForm> {
  final _formKey = GlobalKey<FormState>();
  late final TextEditingController _nameController;
  late HostSavedAudienceJoin _join;
  late List<_AudienceRuleDraft> _rules;
  HostSavedAudience? _audience;
  String? _pendingCreateRequestId;
  bool _busy = false;
  Object? _previewError;
  bool _previewFailedAfterSave = false;
  HostSavedAudience? _previewAudience;
  late bool _static;
  late Set<String> _selectedIds;

  @override
  void initState() {
    super.initState();
    _audience = widget.initialAudience;
    _static = _audience?.definition.isStatic ?? false;
    _selectedIds = {...?_audience?.definition.selectedContactIds};
    _nameController = TextEditingController(text: _audience?.name ?? '');
    _join = _audience?.definition.join ?? HostSavedAudienceJoin.all;
    _rules = (_audience?.definition.predicates ?? const [])
        .where((predicate) => predicate is! HostSavedAudienceStaticMembers)
        .map(_AudienceRuleDraft.fromPredicate)
        .toList(growable: true);
    if (_rules.isEmpty) _rules.add(_AudienceRuleDraft.defaults());
  }

  @override
  void dispose() {
    _nameController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final options = ref.watch(
      hostSavedAudienceFilterOptionsProvider(widget.organizerId),
    );
    final editing = _audience != null;
    return PopScope(
      canPop: !_busy,
      child: CatchRouteScaffold(
        resizeToAvoidBottomInset: true,
        topBarBuilder: (context, scrolledUnder) => CatchTopBar.route(
          title: editing
              ? context.l10n.hostAudienceEditGroup
              : context.l10n.hostSavedAudienceNew,
          navigation: const CatchTopBarNavigation(
            mode: CatchTopBarNavigationMode.back,
          ),
          emphasis: scrolledUnder
              ? CatchTopBarEmphasis.divided
              : CatchTopBarEmphasis.plain,
        ),
        footer: CatchDock.primary(
          label: editing
              ? context.l10n.hostAudienceSaveCheckMembership
              : context.l10n.hostAudienceCreateCheckMembership,
          buttonKey: const ValueKey('host-saved-audience-save'),
          isLoading: _busy,
          onPressed: _busy ? null : _save,
        ),
        body: CatchRouteBody.standard(
          child: CatchAsyncBoundary<HostSavedAudienceFilterOptions>(
            value: options,
            errorContext: AppErrorContext.customers,
            onRetry: () => ref.invalidate(
              hostSavedAudienceFilterOptionsProvider(widget.organizerId),
            ),
            builder: (context, filterOptions) {
              final manualTags = filterOptions.tags
                  .map(
                    (tag) => HostCustomerManualTag(
                      tagId: tag.tagId,
                      label: tag.label,
                    ),
                  )
                  .toList();
              return Form(
                key: _formKey,
                child: CatchSectionList.responsive(
                  emptyStateOmitted: true,
                  items: [
                    CatchSectionListItem(
                      child: CatchSection.fieldRows(
                        title: context.l10n.hostSavedAudienceDetails,
                        children: [
                          CatchField.input(
                            copy: catchFieldCopy(context.l10n),
                            key: const ValueKey('host-saved-audience-name'),
                            title: context.l10n.hostSavedAudienceName,
                            contract: CatchContractConstraints
                                .upsertOrganizerSavedAudienceCallablePayloadName,
                            controller: _nameController,
                            textCapitalization: TextCapitalization.sentences,
                            textInputAction: TextInputAction.next,
                            states: <WidgetState>{
                              if (_busy) WidgetState.disabled,
                            },
                            onValidate: (value) => (value ?? '').trim().isEmpty
                                ? context.l10n.hostSavedAudienceNameRequired
                                : null,
                          ),
                          CatchField<HostSavedAudienceMembershipMode>.select(
                            copy: catchFieldCopy(context.l10n),
                            key: const ValueKey('host-saved-audience-mode'),
                            title: context.l10n.hostAudienceMembershipMode,
                            contractExemption:
                                'Chooses the staticMembers-only definition or the dynamic predicate vocabulary, validated by the saved-audience callable.',
                            values: HostSavedAudienceMembershipMode.values,
                            itemLabelBuilder: (value) =>
                                value == HostSavedAudienceMembershipMode.rules
                                ? context.l10n.hostAudienceRuleMembership
                                : context.l10n.hostAudienceStaticMembership,
                            value: _static
                                ? HostSavedAudienceMembershipMode.selectedPeople
                                : HostSavedAudienceMembershipMode.rules,
                            states: <WidgetState>{
                              if (_busy) WidgetState.disabled,
                            },
                            onChanged: (value) {
                              if (value != null) {
                                setState(
                                  () => _static =
                                      value ==
                                      HostSavedAudienceMembershipMode
                                          .selectedPeople,
                                );
                              }
                            },
                          ),
                          if (!_static)
                            CatchField<HostSavedAudienceJoin>.select(
                              copy: catchFieldCopy(context.l10n),
                              key: const ValueKey('host-saved-audience-join'),
                              title: context.l10n.hostSavedAudienceMatch,
                              contract: CatchContractConstraints
                                  .upsertOrganizerSavedAudienceCallablePayloadDefinitionJoin,
                              contractValueBuilder: (value) => value.name,
                              values: HostSavedAudienceJoin.values,
                              itemLabelBuilder: (value) => switch (value) {
                                HostSavedAudienceJoin.all =>
                                  context.l10n.hostSavedAudienceMatchAll,
                                HostSavedAudienceJoin.any =>
                                  context.l10n.hostSavedAudienceMatchAny,
                              },
                              value: _join,
                              states: <WidgetState>{
                                if (_busy) WidgetState.disabled,
                              },
                              onChanged: (value) {
                                if (value != null) {
                                  setState(() => _join = value);
                                }
                              },
                            ),
                        ],
                      ),
                    ),
                    if (_static)
                      CatchSectionListItem(
                        child: HostStaticAudienceMembersEditor(
                          organizerId: widget.organizerId,
                          selectedIds: _selectedIds,
                          enabled: !_busy,
                          onChanged: (ids) =>
                              setState(() => _selectedIds = ids),
                        ),
                      ),
                    if (!_static)
                      for (var index = 0; index < _rules.length; index++)
                        CatchSectionListItem(
                          child: _HostSavedAudienceRuleSection(
                            key: ValueKey('host-saved-audience-rule-$index'),
                            number: index + 1,
                            draft: _rules[index],
                            manualTags: manualTags,
                            filterOptions: filterOptions,
                            enabled: !_busy,
                            canRemove: _rules.length > 1,
                            onChanged: (draft) =>
                                setState(() => _rules[index] = draft),
                            onRemove: () =>
                                setState(() => _rules.removeAt(index)),
                          ),
                        ),
                    if (!_static && _rules.length < 8)
                      CatchSectionListItem(
                        child: CatchSection.fieldRows(
                          children: [
                            CatchField.add(
                              copy: catchFieldCopy(context.l10n),
                              key: const ValueKey(
                                'host-saved-audience-add-rule',
                              ),
                              title: context.l10n.hostSavedAudienceAddRule,
                              icon: CatchIcons.add,
                              onTap: _busy
                                  ? null
                                  : () => setState(
                                      () => _rules.add(
                                        _AudienceRuleDraft.defaults(),
                                      ),
                                    ),
                            ),
                          ],
                        ),
                      ),
                    CatchSectionListItem(
                      child: CatchSection.divided(
                        title: context.l10n.hostAudienceWhoWillBelong,
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.stretch,
                          children: [
                            if (_static)
                              CatchText(
                                context.l10n.hostAudienceSelectedCount(
                                  count: _selectedIds.length,
                                ),
                                variant: CatchTextVariant.bodyL,
                                color: CatchTokens.of(context).ink,
                              )
                            else ...[
                              CatchText(
                                _join == HostSavedAudienceJoin.all
                                    ? context.l10n.hostSavedAudienceMatchAll
                                    : context.l10n.hostSavedAudienceMatchAny,
                                variant: CatchTextVariant.bodyS,
                                color: CatchTokens.of(context).ink2,
                              ),
                              for (final rule in _rules)
                                if (rule.toPredicate()
                                    case final predicate?) ...[
                                  gapH8,
                                  CatchText(
                                    _savedAudienceRuleSummary(
                                      context,
                                      predicate,
                                      filterOptions,
                                    ),
                                    variant: CatchTextVariant.bodyL,
                                    color: CatchTokens.of(context).ink,
                                  ),
                                ],
                            ],
                            gapH12,
                            CatchText(
                              context.l10n.hostAudienceMembershipCheckOnSave,
                              variant: CatchTextVariant.supporting,
                            ),
                          ],
                        ),
                      ),
                    ),
                    if (_previewError case final error?)
                      CatchSectionListItem(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.stretch,
                          children: [
                            if (_previewFailedAfterSave) ...[
                              CatchText(
                                context.l10n.hostAudienceSavedPreviewFailed,
                                variant: CatchTextVariant.sectionTitle,
                                color: CatchTokens.of(context).ink,
                              ),
                              gapH8,
                            ],
                            CatchLocalizedErrorState(
                              error,
                              context: AppErrorContext.customers,
                              onRetry: _busy ? null : _refreshPreview,
                            ),
                          ],
                        ),
                      ),
                    if ((_previewAudience ?? _audience) case final audience?)
                      CatchSectionListItem(
                        child: CatchSection.fieldRows(
                          title: context.l10n.hostSavedAudienceCurrentPreview,
                          footer: CatchText(
                            context.l10n.hostAudienceSavedGroupPreviewHelp,
                            variant: CatchTextVariant.supporting,
                          ),
                          children: [
                            CatchField.read(
                              copy: catchFieldCopy(context.l10n),
                              title: context.l10n.hostSavedAudiencePeople,
                              body: _savedAudienceDirectoryBody(
                                context,
                                audience,
                              ),
                            ),
                            CatchField.action(
                              copy: catchFieldCopy(context.l10n),
                              key: const ValueKey(
                                'host-saved-audience-refresh-preview',
                              ),
                              title: context.l10n.hostSavedAudiencePreview,
                              onTap: _busy ? null : _refreshPreview,
                            ),
                          ],
                        ),
                      ),
                    if (_audience != null)
                      CatchSectionListItem(
                        child: CatchSection.fieldRows(
                          children: [
                            CatchField.action(
                              copy: catchFieldCopy(context.l10n),
                              key: const ValueKey(
                                'host-saved-audience-archive',
                              ),
                              title: context.l10n.hostSavedAudienceArchive,
                              body: context.l10n.hostSavedAudienceArchiveBody,
                              tone: CatchFieldTone.danger,
                              onTap: _busy ? null : _archive,
                            ),
                          ],
                        ),
                      ),
                  ],
                ),
              );
            },
          ),
        ),
      ),
    );
  }

  void _showError(Object error) => showCatchNoticeError(
    context,
    error,
    errorContext: AppErrorContext.customers,
  );

  Future<void> _save() async {
    if (_busy || !(_formKey.currentState?.validate() ?? false)) return;
    final predicates = _static
        ? <HostSavedAudiencePredicate?>[
            HostSavedAudienceStaticMembers(_selectedIds.toList()..sort()),
          ]
        : _rules.map((rule) => rule.toPredicate()).toList();
    if (predicates.any((predicate) => predicate == null)) {
      _showError(StateError(context.l10n.hostSavedAudienceCompleteRules));
      return;
    }
    setState(() => _busy = true);
    var savedSuccessfully = false;
    try {
      final controller = ref.read(hostAudienceControllerProvider);
      final requestId = _audience == null
          ? _pendingCreateRequestId ??= _newSavedAudienceRequestId()
          : _newSavedAudienceRequestId();
      final saved = await controller.saveAudience(
        organizerId: widget.organizerId,
        audienceId: _audience?.audienceId,
        expectedRevision: _audience?.revision,
        requestId: requestId,
        name: _nameController.text.trim(),
        definition: HostSavedAudienceDefinition(
          join: _static ? HostSavedAudienceJoin.all : _join,
          predicates: predicates.cast<HostSavedAudiencePredicate>(),
        ),
      );
      savedSuccessfully = true;
      if (!mounted) return;
      setState(() {
        _audience = saved;
        _previewAudience = null;
        _pendingCreateRequestId = null;
        _previewError = null;
      });
      _invalidateAudienceDirectories();
      final preview = await controller.previewAudience(
        organizerId: widget.organizerId,
        audience: saved,
      );
      _invalidateAudienceDirectories();
      if (!mounted) return;
      if (widget.onSaved case final onSaved?) {
        onSaved(preview.audience);
      } else {
        context.pop(preview.audience);
      }
    } on Object catch (error) {
      if (mounted && savedSuccessfully) {
        setState(() {
          _previewError = error;
          _previewFailedAfterSave = savedSuccessfully;
        });
      } else if (mounted) {
        _showError(error);
      }
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  Future<void> _refreshPreview() async {
    final audience = _audience;
    if (_busy || audience == null) return;
    setState(() => _busy = true);
    try {
      final controller = ref.read(hostAudienceControllerProvider);
      final preview = await controller.refreshAudiencePreview(
        organizerId: widget.organizerId,
        audience: audience,
        isCurrent: () => mounted,
      );
      if (!mounted) return;
      _invalidateAudienceDirectories();
      setState(() {
        // Membership refresh does not rebase the editable draft. Save keeps
        // its original expectedRevision so concurrent edits still conflict.
        _previewAudience = preview.audience;
        _previewError = null;
      });
    } on Object catch (error) {
      if (!mounted) return;
      setState(() {
        _previewError = error;
        _previewFailedAfterSave = false;
      });
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  Future<void> _archive() async {
    final audience = _audience;
    if (_busy || audience == null) return;
    final confirmed = await showCatchConfirmDialog(
      copy: catchDialogCopy(context.l10n),
      context: context,
      title: context.l10n.hostSavedAudienceArchiveTitle,
      message: context.l10n.hostSavedAudienceArchiveBody,
      confirmLabel: context.l10n.hostSavedAudienceArchive,
      danger: true,
    );
    if (confirmed != true || !mounted) return;
    setState(() => _busy = true);
    try {
      await ref
          .read(hostAudienceControllerProvider)
          .archiveAudience(organizerId: widget.organizerId, audience: audience);
      _invalidateAudienceDirectories();
      if (mounted) context.pop(audience);
    } on Object catch (error) {
      if (mounted) _showError(error);
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }
}

String _newSavedAudienceRequestId() =>
    '${DateTime.now().microsecondsSinceEpoch}-audience-editor';

class _HostSavedAudienceRuleSection extends StatelessWidget {
  const _HostSavedAudienceRuleSection({
    super.key,
    required this.number,
    required this.draft,
    required this.manualTags,
    required this.filterOptions,
    required this.enabled,
    required this.canRemove,
    required this.onChanged,
    required this.onRemove,
  });

  final int number;
  final _AudienceRuleDraft draft;
  final List<HostCustomerManualTag> manualTags;
  final HostSavedAudienceFilterOptions filterOptions;
  final bool enabled;
  final bool canRemove;
  final ValueChanged<_AudienceRuleDraft> onChanged;
  final VoidCallback onRemove;

  @override
  Widget build(BuildContext context) {
    final kinds = _AudienceRuleKind.values
        .where(
          (kind) =>
              kind != _AudienceRuleKind.manualTag ||
              manualTags.isNotEmpty ||
              draft.kind == _AudienceRuleKind.manualTag,
        )
        .toList(growable: false);
    final directoryFilters = switch (draft.sourcePredicate) {
      HostSavedAudienceDirectoryFilters value => value,
      _ => null,
    };
    final selectedFilters =
        directoryFilters?.segments
            .map(hostCustomerFilterForAudienceSegment)
            .toSet() ??
        const <HostCustomerFilter>{};
    final selectedTags = manualTags
        .where(
          (tag) => directoryFilters?.manualTagIds.contains(tag.tagId) ?? false,
        )
        .toList();
    return CatchSection.fieldRows(
      title: context.l10n.hostSavedAudienceCondition(number: number),
      trailing: !canRemove
          ? null
          : CatchButton.text(
              label: context.l10n.hostSavedAudienceRemoveRule,
              tone: CatchButtonTone.danger,
              onPressed: enabled ? onRemove : null,
            ),
      children: [
        CatchField<_AudienceRuleKind>.select(
          copy: catchFieldCopy(context.l10n),
          key: ValueKey('host-saved-audience-rule-type-$number'),
          title: context.l10n.hostSavedAudienceRuleType,
          contract: CatchContractConstraints
              .upsertOrganizerSavedAudienceCallablePayloadDefinitionPredicatesItemsKind,
          contractValueBuilder: (value) => value.wireValue,
          values: kinds,
          itemLabelBuilder: (value) => _audienceRuleKindLabel(context, value),
          value: draft.kind,
          states: <WidgetState>{if (!enabled) WidgetState.disabled},
          onChanged: (value) {
            if (value != null) onChanged(draft.withKind(value, manualTags));
          },
        ),
        ...switch (draft.kind) {
          _AudienceRuleKind.directoryFilters => [
            CatchField.nav(
              key: ValueKey('host-saved-audience-directory-filters-$number'),
              copy: catchFieldCopy(context.l10n),
              title: context.l10n.hostCustomersFilters,
              valueText: _customerSelectionLabel(
                context,
                selectedFilters,
                selectedTags,
              ),
              onTap: !enabled
                  ? null
                  : () async {
                      await showCatchBottomSheet<HostCustomerFilterSelection>(
                        context: context,
                        builder: (_) => HostCustomerFilterSheet(
                          selectedFilters: selectedFilters,
                          selectedManualTags: selectedTags,
                          manualTagVocabulary: manualTags,
                          smsReadiness: null,
                          onChanged: (selection) => onChanged(
                            draft.copyWith(
                              sourcePredicate:
                                  HostSavedAudienceDirectoryFilters(
                                    segments: {
                                      for (final filter in selection.allFilters)
                                        ?hostAudienceSegmentForCustomerFilter(
                                          filter,
                                        ),
                                    },
                                    manualTagIds: {
                                      for (final tag in selection.allManualTags)
                                        tag.tagId,
                                    },
                                  ),
                            ),
                          ),
                        ),
                      );
                    },
            ),
          ],
          _AudienceRuleKind.spend ||
          _AudienceRuleKind.applicationStatus ||
          _AudienceRuleKind.formAnswer ||
          _AudienceRuleKind.attendedEvent => [
            HostAudienceSourceRuleSection(
              kind: switch (draft.kind) {
                _AudienceRuleKind.spend => HostAudienceSourceRuleKind.spend,
                _AudienceRuleKind.applicationStatus =>
                  HostAudienceSourceRuleKind.applicationStatus,
                _AudienceRuleKind.attendedEvent =>
                  HostAudienceSourceRuleKind.attendedEvent,
                _ => HostAudienceSourceRuleKind.formAnswer,
              },
              predicate: draft.sourcePredicate,
              options: filterOptions,
              enabled: enabled,
              onChanged: (value) =>
                  onChanged(draft.copyWith(sourcePredicate: value)),
            ),
          ],
          _AudienceRuleKind.computedSegment => [
            CatchField<HostAudienceSegment>.select(
              copy: catchFieldCopy(context.l10n),
              title: context.l10n.hostSavedAudienceSegment,
              contract: CatchContractConstraints
                  .upsertOrganizerSavedAudienceCallablePayloadDefinitionPredicatesItemsSegmentId,
              contractValueBuilder: (value) => value.wireValue,
              values: HostAudienceSegment.values,
              itemLabelBuilder: (value) => _customerFilterLabel(
                context,
                hostCustomerFilterForAudienceSegment(value),
              ),
              value: draft.segment,
              states: <WidgetState>{if (!enabled) WidgetState.disabled},
              onChanged: (value) {
                if (value != null) onChanged(draft.copyWith(segment: value));
              },
            ),
          ],
          _AudienceRuleKind.manualTag => [
            CatchField<HostCustomerManualTag>.select(
              copy: catchFieldCopy(context.l10n),
              title: context.l10n.hostSavedAudienceTag,
              contract: CatchContractConstraints
                  .upsertOrganizerSavedAudienceCallablePayloadDefinitionPredicatesItemsManualTagId,
              contractValueBuilder: (value) => value.tagId,
              values: manualTags,
              itemLabelBuilder: (value) => value.label,
              value: manualTags
                  .where((tag) => tag.tagId == draft.manualTagId)
                  .firstOrNull,
              hintText: context.l10n.hostSavedAudienceChooseTag,
              states: <WidgetState>{
                if (!(enabled && manualTags.isNotEmpty)) WidgetState.disabled,
              },
              onChanged: (value) {
                if (value != null) {
                  onChanged(draft.copyWith(manualTagId: value.tagId));
                }
              },
            ),
          ],
          _AudienceRuleKind.attendanceCount => [
            CatchField<HostSavedAudienceAttendanceOperator>.select(
              copy: catchFieldCopy(context.l10n),
              title: context.l10n.hostSavedAudienceAttendanceComparison,
              contract: CatchContractConstraints
                  .upsertOrganizerSavedAudienceCallablePayloadDefinitionPredicatesItemsOperator,
              contractValueBuilder: (value) => value.name,
              values: HostSavedAudienceAttendanceOperator.values,
              itemLabelBuilder: (value) => switch (value) {
                HostSavedAudienceAttendanceOperator.atLeast =>
                  context.l10n.hostSavedAudienceAtLeast,
                HostSavedAudienceAttendanceOperator.atMost =>
                  context.l10n.hostSavedAudienceAtMost,
              },
              value: draft.operator,
              states: <WidgetState>{if (!enabled) WidgetState.disabled},
              onChanged: (value) {
                if (value != null) onChanged(draft.copyWith(operator: value));
              },
            ),
            CatchField.stepper(
              copy: catchFieldCopy(context.l10n),
              title: context.l10n.hostSavedAudienceEventsAttended,
              contract: CatchContractConstraints
                  .upsertOrganizerSavedAudienceCallablePayloadDefinitionPredicatesItemsEventCount,
              value: draft.amount,
              unit: context.l10n.hostSavedAudienceEventsUnit,
              decreaseSemanticLabel:
                  context.l10n.hostSavedAudienceDecreaseCount,
              increaseSemanticLabel:
                  context.l10n.hostSavedAudienceIncreaseCount,
              states: <WidgetState>{if (!enabled) WidgetState.disabled},
              onChanged: (value) =>
                  onChanged(draft.copyWith(amount: value.toInt())),
            ),
          ],
          _AudienceRuleKind.lastSeenWithinDays => [
            CatchField.stepper(
              copy: catchFieldCopy(context.l10n),
              title: context.l10n.hostSavedAudienceLastSeenWithin,
              contract: CatchContractConstraints
                  .upsertOrganizerSavedAudienceCallablePayloadDefinitionPredicatesItemsDays,
              value: draft.amount,
              unit: context.l10n.hostSavedAudienceDaysUnit,
              decreaseSemanticLabel: context.l10n.hostSavedAudienceDecreaseDays,
              increaseSemanticLabel: context.l10n.hostSavedAudienceIncreaseDays,
              states: <WidgetState>{if (!enabled) WidgetState.disabled},
              onChanged: (value) =>
                  onChanged(draft.copyWith(amount: value.toInt())),
            ),
          ],
          _AudienceRuleKind.campaignReachable => [
            CatchField.read(
              copy: catchFieldCopy(context.l10n),
              title: context.l10n.hostSavedAudienceManagedReach,
              body: context.l10n.hostSavedAudienceManagedReachBody,
            ),
          ],
        },
      ],
    );
  }
}
