part of 'host_form_automations_screen.dart';

/// Explicit approval of a versioned rule; no customer actions run in the editor.
class HostAutomationRuleEditor extends ConsumerStatefulWidget {
  const HostAutomationRuleEditor({
    super.key,
    required this.organizerId,
    this.scopeFormId,
    this.initialRule,
    required this.onSaved,
    required this.onCancel,
  });
  final String organizerId;
  final String? scopeFormId;
  final HostFormAutomationRule? initialRule;
  final VoidCallback onSaved;
  final VoidCallback onCancel;
  @override
  ConsumerState<HostAutomationRuleEditor> createState() =>
      _HostAutomationRuleEditorState();
}

class _HostAutomationRuleEditorState
    extends ConsumerState<HostAutomationRuleEditor> {
  final _formKey = GlobalKey<FormState>();
  final _requestId = 'automation_${DateTime.now().microsecondsSinceEpoch}';
  late final TextEditingController _name;
  late final TextEditingController _delay;
  late HostFormAutomationTrigger _trigger;
  late String? _formId;
  String? _eventId;
  Map<String, Object?>? _condition;
  late bool _enabled;
  late List<_AutomationActionDraft> _actions;
  bool _busy = false;
  Object? _error;
  VoidCallback? _retryError;
  String? _validation;
  int _sequence = 0;

  @override
  void initState() {
    super.initState();
    final rule = widget.initialRule;
    _name = TextEditingController(text: rule?.name ?? '');
    _delay = TextEditingController(text: '${rule?.delayMinutes ?? 0}');
    _formId = rule?.formId ?? widget.scopeFormId;
    _eventId = rule?.triggerEventId;
    _trigger =
        rule?.trigger ??
        (_formId == null
            ? HostFormAutomationTrigger.applicationAccepted
            : HostFormAutomationTrigger.responseSubmitted);
    _condition = rule?.condition?.cast<String, Object?>();
    _enabled = rule?.enabled ?? false;
    _actions =
        rule?.actions.map(_AutomationActionDraft.fromAction).toList() ??
        [_newAction()];
  }

  _AutomationActionDraft _newAction() =>
      _AutomationActionDraft('action_${_requestId}_${_sequence++}');

  @override
  void dispose() {
    _name.dispose();
    _delay.dispose();
    for (final action in _actions) {
      action.dispose();
    }
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final l = context.l10n;
    // Retain the async controller while this inline editor replaces the list.
    ref.watch(
      hostFormAutomationsControllerProvider(
        widget.organizerId,
        widget.scopeFormId,
      ).notifier,
    );
    final optionsProvider = hostSavedAudienceFilterOptionsProvider(
      widget.organizerId,
    );
    final options = ref.watch(optionsProvider);
    final messagesProvider = hostAutomationMessagesControllerProvider(
      widget.organizerId,
    );
    final needsMessages = _actions.any(
      (a) => a.kind == HostFormAutomationActionKind.campaignHandoff,
    );
    final messages = needsMessages
        ? ref.watch(messagesProvider)
        : const AsyncData<HostAutomationMessagesState>(
            HostAutomationMessagesState(messages: []),
          );
    final loadingMessage = _actions.any((a) => a.loadingMessage);
    return PopScope(
      canPop: !_busy,
      child: CatchRouteScaffold(
        resizeToAvoidBottomInset: true,
        topBarBuilder: (context, scrolledUnder) => CatchTopBar.route(
          title: widget.initialRule == null
              ? l.hostAutomationNew
              : l.hostAutomationEdit,
          navigation: CatchTopBarNavigation(
            mode: CatchTopBarNavigationMode.back,
            onPressed: _busy ? () {} : widget.onCancel,
          ),

          emphasis: scrolledUnder
              ? CatchTopBarEmphasis.divided
              : CatchTopBarEmphasis.plain,
        ),
        footer: CatchDock.primary(
          label: l.hostAutomationSave,
          buttonKey: const ValueKey('automation-save'),
          isLoading: _busy,
          onPressed:
              _busy ||
                  loadingMessage ||
                  catchAsyncBoundaryStatus(options) !=
                      CatchAsyncBoundaryStatus.data
              ? null
              : _save,
        ),
        body: CatchRouteBody.standard(
          child: CatchAsyncBoundary<HostSavedAudienceFilterOptions>(
            value: options,
            errorContext: AppErrorContext.forms,
            onRetry: () => ref.invalidate(optionsProvider),
            builder: (context, source) {
              final questions = source.questions
                  .where((q) => q.formId == _formId && q.activeVersion)
                  .toList();
              final question = questions
                  .where((q) => q.questionId == _condition?['questionId'])
                  .firstOrNull;
              final expected =
                  (_condition?['expectedValues'] as List?)?.firstOrNull;
              final formRequired =
                  _trigger == HostFormAutomationTrigger.responseSubmitted ||
                  _trigger == HostFormAutomationTrigger.responseWithdrawn ||
                  _trigger == HostFormAutomationTrigger.answerMatches;
              return Form(
                key: _formKey,
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.stretch,
                  children: [
                    if (_error case final error?) ...[
                      CatchLocalizedErrorState(
                        error,
                        context: AppErrorContext.forms,
                        mode: CatchErrorStateMode.compact,
                        onRetry: _busy ? null : (_retryError ?? _save),
                      ),
                      gapH16,
                    ],
                    if (_validation case final message?) ...[
                      CatchText(
                        message,
                        variant: CatchTextVariant.supporting,
                        color: CatchTokens.of(context).danger,
                      ),
                      gapH16,
                    ],
                    CatchSection.fieldRows(
                      title: l.hostAudienceAutomationWhen,
                      children: [
                        CatchField.input(
                          copy: catchFieldCopy(context.l10n),
                          key: const ValueKey('automation-name'),
                          title: l.hostAutomationName,
                          contract: CatchContractConstraints
                              .createOrganizerFormAutomationCallablePayloadName,
                          controller: _name,
                          states: <WidgetState>{
                            if (_busy) WidgetState.disabled,
                          },
                        ),
                        CatchField<HostFormAutomationTrigger>.select(
                          copy: catchFieldCopy(context.l10n),
                          title: l.hostAutomationTrigger,
                          contract: CatchContractConstraints
                              .createOrganizerFormAutomationCallablePayloadTrigger,
                          contractValueBuilder: (v) => v.name,
                          values: HostFormAutomationTrigger.values
                              .where(
                                (v) =>
                                    widget.scopeFormId == null ||
                                    v !=
                                        HostFormAutomationTrigger.eventAttended,
                              )
                              .toList(),
                          itemLabelBuilder: (v) => _triggerLabel(context, v),
                          value: _trigger,
                          states: <WidgetState>{
                            if (_busy) WidgetState.disabled,
                          },
                          onChanged: (v) {
                            if (v == null) return;
                            setState(() {
                              _trigger = v;
                              _condition = null;
                              _eventId = null;
                              if (v ==
                                  HostFormAutomationTrigger.eventAttended) {
                                _formId = null;
                              }
                              _actions.removeWhere((a) {
                                if (_allowedActions(v).contains(a.kind)) {
                                  return false;
                                }
                                a.dispose();
                                return true;
                              });
                              if (_actions.isEmpty) _actions.add(_newAction());
                            });
                          },
                        ),
                        if (_trigger != HostFormAutomationTrigger.eventAttended)
                          CatchField<String>.select(
                            copy: catchFieldCopy(context.l10n),
                            title: l.hostAutomationForm,
                            contractExemption:
                                'The empty selection represents the nullable formId for any application form; required response triggers are checked before saving.',
                            values: [
                              if (!formRequired) '',
                              ...source.forms.map((f) => f.id),
                              if (_formId != null &&
                                  !source.forms.any((f) => f.id == _formId))
                                _formId!,
                            ],
                            itemLabelBuilder: (v) => v.isEmpty
                                ? l.hostAutomationAnyForm
                                : source.forms
                                          .where((f) => f.id == v)
                                          .firstOrNull
                                          ?.title ??
                                      l.hostAutomationConfigured,
                            value: _formId ?? (formRequired ? null : ''),
                            states: <WidgetState>{
                              if (!(!_busy && widget.scopeFormId == null))
                                WidgetState.disabled,
                            },
                            onChanged: (v) => setState(() {
                              _formId = v == '' ? null : v;
                              _condition = null;
                            }),
                          ),
                        if (formRequired && source.forms.isEmpty)
                          CatchField.read(
                            copy: catchFieldCopy(context.l10n),
                            title: l.hostAutomationNoForm,
                          ),
                        if (_trigger == HostFormAutomationTrigger.eventAttended)
                          CatchField<String>.select(
                            copy: catchFieldCopy(context.l10n),
                            title: l.hostAutomationEvent,
                            contractExemption:
                                'Empty selection maps to nullable triggerEventId; event IDs come from the authorized organizer source options.',
                            values: [
                              '',
                              ...source.events.map((e) => e.id),
                              if (_eventId != null &&
                                  !source.events.any((e) => e.id == _eventId))
                                _eventId!,
                            ],
                            itemLabelBuilder: (v) => v.isEmpty
                                ? l.hostAutomationAnyEvent
                                : source.events
                                          .where((e) => e.id == v)
                                          .firstOrNull
                                          ?.title ??
                                      l.hostAutomationConfigured,
                            value: _eventId ?? '',
                            states: <WidgetState>{
                              if (_busy) WidgetState.disabled,
                            },
                            onChanged: (v) =>
                                setState(() => _eventId = v == '' ? null : v),
                          ),
                        CatchField.input(
                          copy: catchFieldCopy(context.l10n),
                          key: const ValueKey('automation-delay'),
                          title: l.hostAutomationDelay,
                          contractExemption:
                              'Text entry is parsed as an integer delayMinutes and validated in the generated range 0 through 10080.',
                          helperText: l.hostAutomationDelayHelp,
                          controller: _delay,
                          keyboardType: TextInputType.number,
                          states: <WidgetState>{
                            if (_busy) WidgetState.disabled,
                          },
                          onValidate: (text) {
                            final value = int.tryParse(text?.trim() ?? '');
                            return value == null || value < 0 || value > 10080
                                ? l.hostAutomationDelayInvalid
                                : null;
                          },
                        ),
                        if (_trigger ==
                            HostFormAutomationTrigger.answerMatches) ...[
                          CatchField.read(
                            copy: catchFieldCopy(context.l10n),
                            title: l.hostAutomationQuestion,
                            body: l.hostAutomationQuestionHelp,
                          ),
                          CatchField<HostAudienceQuestionOption>.select(
                            copy: catchFieldCopy(context.l10n),
                            title: l.hostAutomationQuestion,
                            contractExemption:
                                'Question IDs are selected from the current published version; server validation binds the condition to that version.',
                            values: questions,
                            itemLabelBuilder: (q) => q.label,
                            value: question,
                            states: <WidgetState>{
                              if (_busy) WidgetState.disabled,
                            },
                            onChanged: (q) => setState(
                              () => _condition = q == null
                                  ? null
                                  : {
                                      'questionId': q.questionId,
                                      'operator': 'contains',
                                      'expectedValues': <Object?>[],
                                    },
                            ),
                          ),
                          CatchField<HostAudienceAnswerOption>.select(
                            copy: catchFieldCopy(context.l10n),
                            title: l.hostAutomationAnswer,
                            contractExemption:
                                'Typed boolean or choice values come from the selected published question.',
                            values: question?.options ?? [],
                            itemLabelBuilder: (a) => a.label,
                            value: question?.options
                                .where((a) => a.value == expected)
                                .firstOrNull,
                            states: <WidgetState>{
                              if (!(!_busy && question != null))
                                WidgetState.disabled,
                            },
                            onChanged: (a) {
                              if (a != null) {
                                setState(
                                  () => _condition = {
                                    ...?_condition,
                                    'expectedValues': [a.value],
                                  },
                                );
                              }
                            },
                          ),
                        ],
                      ],
                    ),
                    gapH24,
                    for (final action in _actions) ...[
                      CatchSection.fieldRows(
                        key: ValueKey(action.id),
                        title: l.hostAudienceAutomationThen,
                        children: [
                          CatchField<HostFormAutomationActionKind>.select(
                            copy: catchFieldCopy(context.l10n),
                            title: l.hostAutomationAction,
                            contract: CatchContractConstraints
                                .createOrganizerFormAutomationCallablePayloadActionsItemsKind,
                            contractValueBuilder: (v) => v.name,
                            values: _allowedActions(_trigger),
                            itemLabelBuilder: (v) => _actionLabel(context, v),
                            value: action.kind,
                            states: <WidgetState>{
                              if (_busy) WidgetState.disabled,
                            },
                            onChanged: (v) {
                              if (v != null) {
                                setState(() => action.changeKind(v));
                              }
                            },
                          ),
                          if (action.kind ==
                              HostFormAutomationActionKind.addOrganizerTag)
                            CatchField<String>.select(
                              copy: catchFieldCopy(context.l10n),
                              title: l.hostAutomationTag,
                              contract: CatchContractConstraints
                                  .createOrganizerFormAutomationCallablePayloadActionsItemsTagId,
                              values: source.tags.map((t) => t.tagId).toList(),
                              itemLabelBuilder: (v) => source.tags
                                  .firstWhere((t) => t.tagId == v)
                                  .label,
                              value:
                                  source.tags.any(
                                    (t) => t.tagId == action.tagId,
                                  )
                                  ? action.tagId
                                  : null,
                              states: <WidgetState>{
                                if (_busy) WidgetState.disabled,
                              },
                              onChanged: (v) =>
                                  setState(() => action.tagId = v),
                            ),
                          if (action.kind ==
                              HostFormAutomationActionKind.proposeEventAttendee)
                            CatchField<String>.select(
                              copy: catchFieldCopy(context.l10n),
                              title: l.hostAutomationEvent,
                              contract: CatchContractConstraints
                                  .createOrganizerFormAutomationCallablePayloadActionsItemsEventId,
                              values: source.events.map((e) => e.id).toList(),
                              itemLabelBuilder: (v) => source.events
                                  .firstWhere((e) => e.id == v)
                                  .title,
                              value:
                                  source.events.any(
                                    (e) => e.id == action.eventId,
                                  )
                                  ? action.eventId
                                  : null,
                              states: <WidgetState>{
                                if (_busy) WidgetState.disabled,
                              },
                              onChanged: (v) =>
                                  setState(() => action.eventId = v),
                            ),
                          if (action.kind ==
                              HostFormAutomationActionKind.signedWebhook) ...[
                            CatchField.read(
                              copy: catchFieldCopy(context.l10n),
                              title: l.hostAutomationWebhook,
                              body: l.hostAutomationWebhookHelp,
                            ),
                            CatchField.input(
                              copy: catchFieldCopy(context.l10n),
                              key: ValueKey('automation-url-${action.id}'),
                              title: l.hostAutomationWebhookUrl,
                              contract: CatchContractConstraints
                                  .createOrganizerFormAutomationCallablePayloadActionsItemsWebhookUrl,
                              controller: action.url,
                              keyboardType: TextInputType.url,
                              states: <WidgetState>{
                                if (_busy) WidgetState.disabled,
                              },
                              onValidate: (text) =>
                                  isHostAutomationWebhookUrl(text)
                                  ? null
                                  : l.hostAutomationUrlInvalid,
                            ),
                            CatchField.input(
                              copy: catchFieldCopy(context.l10n),
                              key: ValueKey('automation-secret-${action.id}'),
                              title: l.hostAutomationWebhookSecret,
                              contractExemption:
                                  'Blank preserves an existing secret only for the same URL; otherwise 32 through 256 characters are required by the callable.',
                              controller: action.secret,
                              inputVariant: CatchTextInputVariant.obscured,
                              states: <WidgetState>{
                                if (_busy) WidgetState.disabled,
                              },
                              helperText: l.hostAutomationSecretHelp,
                              onValidate: (text) {
                                final value = text ?? '';
                                if (value.isEmpty &&
                                    action.keepSecret &&
                                    action.url.text.trim() ==
                                        action.originalUrl) {
                                  return null;
                                }
                                return value.length < 32 || value.length > 256
                                    ? l.hostAutomationSecretInvalid
                                    : null;
                              },
                            ),
                          ],
                          if (action.kind ==
                              HostFormAutomationActionKind.campaignHandoff) ...[
                            CatchField.read(
                              copy: catchFieldCopy(context.l10n),
                              title: l.hostAutomationMessage,
                              body: l.hostAutomationDraftHelp,
                            ),
                            CatchAsyncBoundary<HostAutomationMessagesState>(
                              value: messages,
                              errorContext: AppErrorContext.forms,
                              onRetry: () => ref.invalidate(messagesProvider),
                              builder: (context, page) => CatchFieldLanes.divided(
                                children: [
                                  CatchField<HostCampaignSendSummary>.select(
                                    copy: catchFieldCopy(context.l10n),
                                    title: l.hostAutomationDraft,
                                    contract: CatchContractConstraints
                                        .createOrganizerFormAutomationCallablePayloadActionsItemsCampaignId,
                                    contractValueBuilder: (m) => m.campaignId,
                                    values: page.messages,
                                    itemLabelBuilder: (m) =>
                                        '${m.name} · ${m.templateName ?? m.name} · ${m.savedAudienceName ?? l.hostSavedAudiencesManage}',
                                    value: page.messages
                                        .where(
                                          (m) =>
                                              m.campaignId == action.campaignId,
                                        )
                                        .firstOrNull,
                                    states: <WidgetState>{
                                      if (!(!_busy && !action.loadingMessage))
                                        WidgetState.disabled,
                                    },
                                    onChanged: (m) {
                                      if (m != null) {
                                        _selectMessage(action, m.campaignId);
                                      }
                                    },
                                  ),
                                  if (page.messages.isEmpty)
                                    CatchField.read(
                                      copy: catchFieldCopy(context.l10n),
                                      title: l.hostAutomationDraftsEmpty,
                                    ),
                                  if (action.campaignId != null)
                                    CatchField.read(
                                      copy: catchFieldCopy(context.l10n),
                                      title: l.hostAutomationCurrentDraft,
                                      valueText: action.loadingMessage
                                          ? l.hostFormAutomationRunning
                                          : '${l.hostAutomationConfigured} · v${action.campaignRevision ?? 0}',
                                    ),
                                  if (page.error case final error?)
                                    CatchLocalizedErrorState(
                                      error,
                                      context: AppErrorContext.forms,
                                      mode: CatchErrorStateMode.compact,
                                      onRetry: () => ref
                                          .read(messagesProvider.notifier)
                                          .loadMore(),
                                    ),
                                  if (page.nextCursor != null)
                                    CatchButton(
                                      label: l.hostAutomationDraftsMore,
                                      variant: CatchButtonVariant.secondary,
                                      status: (page.loadingMore)
                                          ? CatchButtonStatus.loading
                                          : CatchButtonStatus.idle,
                                      onPressed: page.loadingMore
                                          ? null
                                          : () => ref
                                                .read(messagesProvider.notifier)
                                                .loadMore(),
                                    ),
                                ],
                              ),
                            ),
                          ],
                          if (_actions.length > 1)
                            CatchButton(
                              label: l.hostAutomationRemoveAction,
                              variant: CatchButtonVariant.secondary,
                              onPressed: _busy
                                  ? null
                                  : () => setState(() {
                                      _actions.remove(action);
                                      action.dispose();
                                    }),
                            ),
                        ],
                      ),
                      gapH16,
                    ],
                    if (_actions.length < 10)
                      CatchButton(
                        label: l.hostAutomationAddAction,
                        variant: CatchButtonVariant.secondary,
                        onPressed: _busy
                            ? null
                            : () => setState(() => _actions.add(_newAction())),
                      ),
                    gapH24,
                    CatchSection.fieldRows(
                      children: [
                        CatchField.toggle(
                          copy: catchFieldCopy(context.l10n),
                          title: l.hostAutomationEnabled,
                          contract: CatchContractConstraints
                              .createOrganizerFormAutomationCallablePayloadEnabled,
                          body: l.hostAutomationEnableHelp,
                          value: _enabled,
                          onChanged: _busy
                              ? null
                              : (v) => setState(() => _enabled = v),
                        ),
                      ],
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

  Future<void> _selectMessage(_AutomationActionDraft action, String id) async {
    setState(() {
      action.loadingMessage = true;
      action.campaignId = id;
      action.campaignRevision = null;
      _error = null;
    });
    try {
      final campaign = await ref
          .read(
            hostFormAutomationsControllerProvider(
              widget.organizerId,
              widget.scopeFormId,
            ).notifier,
          )
          .inspectMessage(id);
      if (!mounted || !_actions.contains(action) || action.campaignId != id) {
        return;
      }
      setState(() => action.campaignRevision = campaign.revision);
    } on Object catch (error) {
      if (mounted) {
        setState(() {
          _error = error;
          _retryError = () => _selectMessage(action, id);
        });
      }
    } finally {
      if (mounted && _actions.contains(action)) {
        setState(() => action.loadingMessage = false);
      }
    }
  }

  Future<void> _save() async {
    if (_busy || !(_formKey.currentState?.validate() ?? false)) return;
    final requiresForm = ![
      HostFormAutomationTrigger.applicationAccepted,
      HostFormAutomationTrigger.eventAttended,
    ].contains(_trigger);
    if (_actions.isEmpty ||
        _name.text.trim().isEmpty ||
        (requiresForm && _formId == null) ||
        (_trigger == HostFormAutomationTrigger.answerMatches &&
            ((_condition?['expectedValues'] as List?)?.isNotEmpty != true)) ||
        _actions.any((a) => !a.complete)) {
      setState(() => _validation = context.l10n.hostAutomationRequired);
      return;
    }
    setState(() {
      _busy = true;
      _error = null;
      _validation = null;
    });
    try {
      await ref
          .read(
            hostFormAutomationsControllerProvider(
              widget.organizerId,
              widget.scopeFormId,
            ).notifier,
          )
          .saveRule(
            requestId: _requestId,
            name: _name.text.trim(),
            enabled: _enabled,
            trigger: _trigger,
            selectedFormId: _formId,
            triggerEventId: _eventId,
            delayMinutes: int.parse(_delay.text.trim()),
            condition: _condition,
            actions: _actions.map((a) => a.toJson()).toList(),
            existing: widget.initialRule,
          );
      if (mounted) widget.onSaved();
    } on Object catch (error) {
      if (mounted) {
        setState(() {
          _error = error;
          _retryError = _save;
        });
      }
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }
}

List<HostFormAutomationActionKind> _allowedActions(
  HostFormAutomationTrigger trigger,
) => HostFormAutomationActionKind.values
    .where((kind) {
      if (trigger == HostFormAutomationTrigger.responseWithdrawn) {
        return kind == HostFormAutomationActionKind.notifyTeam ||
            kind == HostFormAutomationActionKind.signedWebhook;
      }
      if (trigger == HostFormAutomationTrigger.applicationAccepted ||
          trigger == HostFormAutomationTrigger.eventAttended) {
        return ![
          HostFormAutomationActionKind.createCrmContact,
          HostFormAutomationActionKind.addApplicationQueue,
          HostFormAutomationActionKind.proposeEventAttendee,
        ].contains(kind);
      }
      return true;
    })
    .toList(growable: false);

class _AutomationActionDraft {
  _AutomationActionDraft(this.id);
  factory _AutomationActionDraft.fromAction(HostFormAutomationAction a) =>
      _AutomationActionDraft(a.actionId)
        ..kind = a.kind
        ..tagId = a.tagId
        ..eventId = a.eventId
        ..url.text = a.webhookUrl ?? ''
        ..originalUrl = a.webhookUrl
        ..keepSecret = a.webhookSecretConfigured
        ..campaignId = a.campaignId
        ..campaignRevision = a.campaignRevision;
  final String id;
  HostFormAutomationActionKind kind = HostFormAutomationActionKind.notifyTeam;
  String? tagId, eventId, campaignId, originalUrl;
  int? campaignRevision;
  bool keepSecret = false, loadingMessage = false;
  final url = TextEditingController();
  final secret = TextEditingController();
  bool get complete => switch (kind) {
    HostFormAutomationActionKind.addOrganizerTag => tagId != null,
    HostFormAutomationActionKind.proposeEventAttendee => eventId != null,
    HostFormAutomationActionKind.campaignHandoff =>
      campaignId != null && campaignRevision != null && !loadingMessage,
    _ => true,
  };
  void changeKind(HostFormAutomationActionKind value) {
    kind = value;
    tagId = null;
    eventId = null;
    campaignId = null;
    campaignRevision = null;
    url.clear();
    secret.clear();
    originalUrl = null;
    keepSecret = false;
  }

  Map<String, Object?> toJson() => {
    'actionId': id,
    'kind': kind.name,
    'tagId': tagId,
    'eventId': eventId,
    'webhookUrl': kind == HostFormAutomationActionKind.signedWebhook
        ? url.text.trim()
        : null,
    'webhookSecret': secret.text.isEmpty ? null : secret.text,
    'channel': kind == HostFormAutomationActionKind.campaignHandoff
        ? 'whatsapp'
        : null,
    'campaignId': campaignId,
    'campaignRevision': campaignRevision,
  };
  void dispose() {
    url.dispose();
    secret.dispose();
  }
}
