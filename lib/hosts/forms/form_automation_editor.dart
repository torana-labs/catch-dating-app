import 'dart:async';

import 'package:catch_dating_app/contexts/audience/data/crm/host_saved_audience_repository.dart';
import 'package:catch_dating_app/contexts/audience/domain/crm/host_saved_audience_filter_options.dart';
import 'package:catch_dating_app/contexts/forms/domain/forms/host_form_automation.dart';
import 'package:catch_dating_app/hosts/forms/form_automation_action_section.dart';
import 'package:catch_dating_app/hosts/forms/form_automation_labels.dart';
import 'package:catch_dating_app/hosts/presentation/forms/host_form_operations_controller.dart';
import 'package:catch_l10n/l10n.dart';
import 'package:catch_platform/errors/app_error_message.dart';
import 'package:catch_platform/l10n/catch_ui_copy.dart';
import 'package:catch_platform/riverpod_ui/catch_async_value_adapter.dart';
import 'package:catch_platform/riverpod_ui/catch_localized_error_state.dart';
import 'package:catch_platform/schema_contracts/generated/field_constraints.g.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/widgets.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

/// A new or existing automation rule: its name, what starts it (a form
/// answer, a withdrawal, a matching answer, an accepted application or an
/// attended event), which form or event, a delay, the steps it runs and
/// whether it is on.
///
/// Reads the organizer's forms, tags, events and published questions, and
/// draft messages while a step hands off to one. Save checks the rule and
/// sends it through the existing revision-fenced automation command; it
/// runs nothing for anyone. Back returns to the list unless a save is on
/// its way.
class HostFormAutomationEditor extends ConsumerStatefulWidget {
  const HostFormAutomationEditor({
    super.key,
    required this.organizerId,
    required this.onSaved,
    required this.onCancel,
    this.scopeFormId,
    this.initialRule,
  });

  final String organizerId;

  /// The form the list is scoped to; the rule is bound to it.
  final String? scopeFormId;
  final HostFormAutomationRule? initialRule;
  final VoidCallback onSaved;
  final VoidCallback onCancel;

  @override
  ConsumerState<HostFormAutomationEditor> createState() =>
      _HostFormAutomationEditorState();
}

class _HostFormAutomationEditorState
    extends ConsumerState<HostFormAutomationEditor> {
  final _form = GlobalKey<FormState>();
  final _requestId = 'automation_${DateTime.now().microsecondsSinceEpoch}';
  late final TextEditingController _name;
  late final TextEditingController _delay;
  late HostFormAutomationTrigger _trigger;
  late String? _formId;
  String? _eventId;
  Map<String, Object?>? _condition;
  late bool _enabled;
  late List<HostFormAutomationActionDraft> _actions;
  bool _busy = false;
  Object? _error;
  VoidCallback? _retryError;
  String? _validation;
  int _sequence = 0;

  HostFormAutomationsController get _controller => ref.read(
    hostFormAutomationsControllerProvider(
      widget.organizerId,
      widget.scopeFormId,
    ).notifier,
  );

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
    _actions = [
      for (final action in rule?.actions ?? const <HostFormAutomationAction>[])
        HostFormAutomationActionDraft.fromAction(action),
    ];
    if (_actions.isEmpty) _actions.add(_newAction());
  }

  HostFormAutomationActionDraft _newAction() =>
      HostFormAutomationActionDraft('action_${_requestId}_${_sequence++}');

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
    final l10n = context.l10n;
    // Keep the list's controller while the editor stands in for the list.
    ref.watch(
      hostFormAutomationsControllerProvider(
        widget.organizerId,
        widget.scopeFormId,
      ).notifier,
    );
    final optionsProvider = hostSavedAudienceFilterOptionsProvider(
      widget.organizerId,
    );
    final options = catchAsyncStateFromAsyncValue(ref.watch(optionsProvider));
    final source = options.value;
    final messagesProvider = hostAutomationMessagesControllerProvider(
      widget.organizerId,
    );
    final needsMessages = _actions.any(
      (action) => action.kind == HostFormAutomationActionKind.campaignHandoff,
    );
    final messagesValue = needsMessages
        ? catchAsyncStateFromAsyncValue(ref.watch(messagesProvider))
        : null;
    final messages =
        messagesValue?.value ??
        (messagesValue?.hasError ?? false
            ? HostAutomationMessagesState(
                messages: const [],
                error: messagesValue!.error,
              )
            : null);
    final loadingMessage = _actions.any((action) => action.loadingMessage);
    final Widget body;
    if (source != null) {
      body = _body(context, source, messages, () {
        if (messagesValue?.value == null) {
          ref.invalidate(messagesProvider);
        } else {
          ref.read(messagesProvider.notifier).loadMore();
        }
      });
    } else if (options.hasError) {
      body = CatchPageBody.screen(
        child: CatchLocalizedErrorState(
          options.error!,
          context: AppErrorContext.forms,
          onRetry: () => ref.invalidate(optionsProvider),
        ),
      );
    } else {
      body = const CatchPageBody.screen(child: CatchLoadingIndicator());
    }
    return PopScope(
      canPop: false,
      onPopInvokedWithResult: (didPop, _) {
        if (!didPop && !_busy) widget.onCancel();
      },
      child: CatchRoot(
        child: CatchScreen(
          key: const ValueKey<String>('host-form-automation-editor'),
          topBar: CatchTopBar(
            variant: CatchTopBarVariant.tool,
            title: widget.initialRule == null
                ? l10n.hostAutomationNew
                : l10n.hostAutomationEdit,
            back: CatchTopBarBack(
              label: l10n.hostFormsBack,
              onPressed: _busy ? null : widget.onCancel,
            ),
          ),
          body: body,
          dock: CatchDock(
            primary: CatchDockAction(
              label: l10n.hostAutomationSave,
              loading: _busy,
              onPressed: _busy || loadingMessage || source == null
                  ? null
                  : () => unawaited(_save()),
            ),
          ),
        ),
      ),
    );
  }

  Widget _body(
    BuildContext context,
    HostSavedAudienceFilterOptions source,
    HostAutomationMessagesState? messages,
    VoidCallback onMoreMessages,
  ) {
    final l10n = context.l10n;
    final copy = catchFieldCopy(l10n);
    final disabled = <WidgetState>{if (_busy) WidgetState.disabled};
    final questions = [
      for (final question in source.questions)
        if (question.formId == _formId && question.activeVersion) question,
    ];
    final question = questions
        .where((q) => q.questionId == _condition?['questionId'])
        .firstOrNull;
    final expected = (_condition?['expectedValues'] as List?)?.firstOrNull;
    final formRequired =
        _trigger == HostFormAutomationTrigger.responseSubmitted ||
        _trigger == HostFormAutomationTrigger.responseWithdrawn ||
        _trigger == HostFormAutomationTrigger.answerMatches;
    return CatchPageBody.screen(
      child: Form(
        key: _form,
        child: CatchStack(
          gap: CatchStackGap.g24,
          children: [
            if (_error case final error?)
              CatchLocalizedErrorState(
                error,
                context: AppErrorContext.forms,
                mode: CatchErrorStateMode.compact,
                onRetry: _busy
                    ? null
                    : (_retryError ?? () => unawaited(_save())),
              ),
            if (_validation case final message?)
              CatchNotice.inline(
                key: const ValueKey<String>('automation-validation'),
                body: message,
                tone: CatchNoticeTone.danger,
              ),
            CatchSection(
              title: l10n.hostAudienceAutomationWhen,
              dividers: CatchSectionPlacement.none,
              children: [
                CatchField.input(
                  key: const ValueKey('automation-name'),
                  copy: copy,
                  title: l10n.hostAutomationName,
                  contract: CatchContractConstraints
                      .createOrganizerFormAutomationCallablePayloadName,
                  controller: _name,
                  states: disabled,
                ),
                CatchField<HostFormAutomationTrigger>.select(
                  copy: copy,
                  title: l10n.hostAutomationTrigger,
                  contract: CatchContractConstraints
                      .createOrganizerFormAutomationCallablePayloadTrigger,
                  contractValueBuilder: (value) => value.name,
                  values: [
                    for (final value in HostFormAutomationTrigger.values)
                      if (widget.scopeFormId == null ||
                          value != HostFormAutomationTrigger.eventAttended)
                        value,
                  ],
                  itemLabelBuilder: (value) =>
                      hostFormAutomationTriggerText(l10n, value),
                  value: _trigger,
                  states: disabled,
                  onChanged: (value) {
                    if (value != null) setState(() => _setTrigger(value));
                  },
                ),
                if (_trigger != HostFormAutomationTrigger.eventAttended)
                  CatchField<String>.select(
                    copy: copy,
                    title: l10n.hostAutomationForm,
                    contractExemption:
                        'The empty selection represents the nullable formId '
                        'for any application form; required response '
                        'triggers are checked before saving.',
                    values: [
                      if (!formRequired) '',
                      for (final form in source.forms) form.id,
                      if (_formId != null &&
                          !source.forms.any((form) => form.id == _formId))
                        _formId!,
                    ],
                    itemLabelBuilder: (value) => value.isEmpty
                        ? l10n.hostAutomationAnyForm
                        : source.forms
                                  .where((form) => form.id == value)
                                  .firstOrNull
                                  ?.title ??
                              l10n.hostAutomationConfigured,
                    value: _formId ?? (formRequired ? null : ''),
                    states: {
                      if (_busy || widget.scopeFormId != null)
                        WidgetState.disabled,
                    },
                    onChanged: (value) => setState(() {
                      _formId = value == '' ? null : value;
                      _condition = null;
                    }),
                  ),
                if (formRequired && source.forms.isEmpty)
                  CatchText(
                    l10n.hostAutomationNoForm,
                    variant: CatchTextVariant.bodySmall,
                    tone: CatchTextTone.danger,
                  ),
                if (_trigger == HostFormAutomationTrigger.eventAttended)
                  CatchField<String>.select(
                    copy: copy,
                    title: l10n.hostAutomationEvent,
                    contractExemption:
                        'Empty selection maps to nullable triggerEventId; '
                        'event IDs come from the authorized organizer source '
                        'options.',
                    values: [
                      '',
                      for (final event in source.events) event.id,
                      if (_eventId != null &&
                          !source.events.any((event) => event.id == _eventId))
                        _eventId!,
                    ],
                    itemLabelBuilder: (value) => value.isEmpty
                        ? l10n.hostAutomationAnyEvent
                        : source.events
                                  .where((event) => event.id == value)
                                  .firstOrNull
                                  ?.title ??
                              l10n.hostAutomationConfigured,
                    value: _eventId ?? '',
                    states: disabled,
                    onChanged: (value) =>
                        setState(() => _eventId = value == '' ? null : value),
                  ),
                CatchField.input(
                  key: const ValueKey('automation-delay'),
                  copy: copy,
                  title: l10n.hostAutomationDelay,
                  contractExemption:
                      'Text entry is parsed as an integer delayMinutes and '
                      'validated in the generated range 0 through 10080.',
                  helperText: l10n.hostAutomationDelayHelp,
                  controller: _delay,
                  keyboardType: TextInputType.number,
                  states: disabled,
                  onValidate: (text) {
                    final value = int.tryParse(text?.trim() ?? '');
                    return value == null || value < 0 || value > 10080
                        ? l10n.hostAutomationDelayInvalid
                        : null;
                  },
                ),
                if (_trigger == HostFormAutomationTrigger.answerMatches) ...[
                  CatchText(
                    l10n.hostAutomationQuestionHelp,
                    variant: CatchTextVariant.bodySmall,
                    tone: CatchTextTone.secondary,
                  ),
                  CatchField<HostAudienceQuestionOption>.select(
                    copy: copy,
                    title: l10n.hostAutomationQuestion,
                    contractExemption:
                        'Question IDs are selected from the current published '
                        'version; server validation binds the condition to '
                        'that version.',
                    values: questions,
                    itemLabelBuilder: (q) => q.label,
                    value: question,
                    states: disabled,
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
                    copy: copy,
                    title: l10n.hostAutomationAnswer,
                    contractExemption:
                        'Typed boolean or choice values come from the selected '
                        'published question.',
                    values: question?.options ?? const [],
                    itemLabelBuilder: (answer) => answer.label,
                    value: question?.options
                        .where((answer) => answer.value == expected)
                        .firstOrNull,
                    states: {
                      if (_busy || question == null) WidgetState.disabled,
                    },
                    onChanged: (answer) {
                      if (answer == null) return;
                      setState(
                        () => _condition = {
                          ...?_condition,
                          'expectedValues': [answer.value],
                        },
                      );
                    },
                  ),
                ],
              ],
            ),
            for (final action in _actions)
              HostFormAutomationActionSection(
                key: ValueKey(action.id),
                action: action,
                trigger: _trigger,
                source: source,
                messages: messages,
                busy: _busy,
                canRemove: _actions.length > 1,
                onChanged: () => setState(() {}),
                onKind: (kind) => setState(() => action.changeKind(kind)),
                onMessage: (id) => unawaited(_selectMessage(action, id)),
                onRemove: () => setState(() {
                  _actions.remove(action);
                  action.dispose();
                }),
                onMoreMessages: onMoreMessages,
              ),
            if (_actions.length < 10)
              CatchButton(
                key: const ValueKey<String>('automation-add-action'),
                label: l10n.hostAutomationAddAction,
                variant: CatchButtonVariant.secondary,
                leading: CatchIcon(CatchIcons.add),
                fullWidth: true,
                onPressed: _busy
                    ? null
                    : () => setState(() => _actions.add(_newAction())),
              ),
            CatchSection(
              dividers: CatchSectionPlacement.none,
              children: [
                CatchField.toggle(
                  copy: copy,
                  title: l10n.hostAutomationEnabled,
                  contract: CatchContractConstraints
                      .createOrganizerFormAutomationCallablePayloadEnabled,
                  body: l10n.hostAutomationEnableHelp,
                  value: _enabled,
                  onChanged: _busy
                      ? null
                      : (value) => setState(() => _enabled = value),
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }

  /// A new trigger clears the answer condition and event, drops steps the
  /// trigger does not allow and keeps at least one step.
  void _setTrigger(HostFormAutomationTrigger value) {
    _trigger = value;
    _condition = null;
    _eventId = null;
    if (value == HostFormAutomationTrigger.eventAttended) _formId = null;
    final allowed = hostFormAutomationAllowedActions(value);
    _actions.removeWhere((action) {
      if (allowed.contains(action.kind)) return false;
      action.dispose();
      return true;
    });
    if (_actions.isEmpty) _actions.add(_newAction());
  }

  Future<void> _selectMessage(
    HostFormAutomationActionDraft action,
    String id,
  ) async {
    setState(() {
      action
        ..loadingMessage = true
        ..campaignId = id
        ..campaignRevision = null;
      _error = null;
    });
    try {
      final campaign = await _controller.inspectMessage(id);
      if (!mounted || !_actions.contains(action) || action.campaignId != id) {
        return;
      }
      setState(() => action.campaignRevision = campaign.revision);
    } on Object catch (error) {
      if (mounted) {
        setState(() {
          _error = error;
          _retryError = () => unawaited(_selectMessage(action, id));
        });
      }
    } finally {
      if (mounted && _actions.contains(action)) {
        setState(() => action.loadingMessage = false);
      }
    }
  }

  Future<void> _save() async {
    if (_busy || !(_form.currentState?.validate() ?? false)) return;
    final requiresForm = !const [
      HostFormAutomationTrigger.applicationAccepted,
      HostFormAutomationTrigger.eventAttended,
    ].contains(_trigger);
    if (_actions.isEmpty ||
        _name.text.trim().isEmpty ||
        (requiresForm && _formId == null) ||
        (_trigger == HostFormAutomationTrigger.answerMatches &&
            ((_condition?['expectedValues'] as List?)?.isNotEmpty != true)) ||
        _actions.any((action) => !action.complete)) {
      setState(() => _validation = context.l10n.hostAutomationRequired);
      return;
    }
    setState(() {
      _busy = true;
      _error = null;
      _validation = null;
    });
    try {
      await _controller.saveRule(
        requestId: _requestId,
        name: _name.text.trim(),
        enabled: _enabled,
        trigger: _trigger,
        selectedFormId: _formId,
        triggerEventId: _eventId,
        delayMinutes: int.parse(_delay.text.trim()),
        condition: _condition,
        actions: [for (final action in _actions) action.toJson()],
        existing: widget.initialRule,
      );
      if (mounted) widget.onSaved();
    } on Object catch (error) {
      if (mounted) {
        setState(() {
          _error = error;
          _retryError = () => unawaited(_save());
        });
      }
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }
}
