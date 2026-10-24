part of 'organizer_moments_screen.dart';

/// Creates or revises a moment through upsertOrganizerMoment. Revising an
/// armed moment drops it back to draft with approval cleared — the backend
/// owns that lifecycle; the form only submits the new definition.
class OrganizerMomentEditScreen extends ConsumerStatefulWidget {
  const OrganizerMomentEditScreen({
    super.key,
    required this.scope,
    this.initialMoment,
    required this.onSaved,
    required this.onCancel,
  });

  final OrganizerMomentScope scope;
  final OrganizerMoment? initialMoment;
  final VoidCallback onSaved;
  final VoidCallback onCancel;

  @override
  ConsumerState<OrganizerMomentEditScreen> createState() =>
      _OrganizerMomentEditScreenState();
}

class _OrganizerMomentEditScreenState
    extends ConsumerState<OrganizerMomentEditScreen> {
  final _formKey = GlobalKey<FormState>();
  late final TextEditingController _name;
  late final TextEditingController _anchorId;
  late final TextEditingController _offset;
  late final TextEditingController _triggerFunctionId;
  late final TextEditingController _audienceFunctionId;
  late final TextEditingController _audienceDuty;
  late final TextEditingController _audienceScopeIds;
  late final TextEditingController _connectionId;
  late final TextEditingController _templateId;
  late final TextEditingController _variables;
  late final TextEditingController _notificationType;
  late final TextEditingController _preferenceKey;
  late final TextEditingController _actionDuty;
  late final TextEditingController _titleTemplate;

  late OrganizerMomentInitiationKind _initiationKind;
  DateTime? _scheduledAt;
  late OrganizerMomentAnchorKind _anchorKind;
  late OrganizerMomentTriggerKind _triggerKind;
  late OrganizerMomentSense _sense;
  late OrganizerMomentAudienceKind _audienceKind;
  late bool _participantsSignedUp;
  late Set<OrganizerMomentRsvpState> _audienceRsvp;
  late bool _householdDedupe;
  late bool _travelTimeLead;
  late bool _rsvpPendingOnly;
  late OrganizerMomentActionKind _actionKind;
  late OrganizerMomentAttentionSeverity _severity;

  bool _busy = false;
  Object? _error;
  VoidCallback? _retryError;
  String? _validation;

  @override
  void initState() {
    super.initState();
    final moment = widget.initialMoment;
    _name = TextEditingController(text: moment?.name ?? '');
    _initiationKind =
        moment?.initiation.kind ?? OrganizerMomentInitiationKind.manual;
    _scheduledAt = moment?.initiation.atMillis == null
        ? null
        : DateTime.fromMillisecondsSinceEpoch(moment!.initiation.atMillis!);
    _anchorKind =
        moment?.initiation.anchorKind ?? OrganizerMomentAnchorKind.scopeStart;
    _anchorId = TextEditingController(text: moment?.initiation.anchorId ?? '');
    _offset = TextEditingController(
      text: '${moment?.initiation.offsetMinutes ?? 0}',
    );
    _triggerKind =
        moment?.initiation.triggerKind ??
        OrganizerMomentTriggerKind.flightDisrupted;
    _triggerFunctionId = TextEditingController(
      text: moment?.initiation.functionId ?? '',
    );
    _sense = moment?.sense ?? OrganizerMomentSense.audience;
    _audienceKind =
        moment?.audience.kind ?? OrganizerMomentAudienceKind.eventParticipants;
    _participantsSignedUp =
        moment?.audience.statuses.contains('signedUp') ?? true;
    _audienceFunctionId = TextEditingController(
      text: moment?.audience.functionId ?? '',
    );
    _audienceRsvp =
        (moment?.audience.rsvp ?? const [OrganizerMomentRsvpState.attending])
            .toSet();
    _householdDedupe = moment?.audience.householdDedupe ?? true;
    _travelTimeLead = moment?.audience.travelTimeLead ?? false;
    _rsvpPendingOnly = moment?.audience.rsvpPendingOnly ?? false;
    _audienceDuty = TextEditingController(text: moment?.audience.duty ?? '');
    _audienceScopeIds = TextEditingController(
      text: (moment?.audience.scopeIds ?? const []).join(', '),
    );
    _actionKind = moment?.action.kind ?? OrganizerMomentActionKind.push;
    _connectionId = TextEditingController(
      text: moment?.action.connectionId ?? '',
    );
    _templateId = TextEditingController(text: moment?.action.templateId ?? '');
    _variables = TextEditingController(
      text: (moment?.action.variables ?? const {}).entries
          .map((entry) => '${entry.key}=${entry.value}')
          .join('\n'),
    );
    _notificationType = TextEditingController(
      text: moment?.action.notificationType ?? '',
    );
    _preferenceKey = TextEditingController(
      text: moment?.action.preferenceKey ?? '',
    );
    _actionDuty = TextEditingController(text: moment?.action.duty ?? '');
    _severity =
        moment?.action.severity ?? OrganizerMomentAttentionSeverity.info;
    _titleTemplate = TextEditingController(
      text: moment?.action.titleTemplate ?? '',
    );
  }

  @override
  void dispose() {
    for (final controller in [
      _name,
      _anchorId,
      _offset,
      _triggerFunctionId,
      _audienceFunctionId,
      _audienceDuty,
      _audienceScopeIds,
      _connectionId,
      _templateId,
      _variables,
      _notificationType,
      _preferenceKey,
      _actionDuty,
      _titleTemplate,
    ]) {
      controller.dispose();
    }
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final l = context.l10n;
    return PopScope(
      canPop: !_busy,
      child: CatchRouteScaffold(
        resizeToAvoidBottomInset: true,
        topBarBuilder: (context, scrolledUnder) => CatchTopBar.route(
          title: widget.initialMoment == null
              ? l.hostMomentsNew
              : l.hostMomentEdit,
          navigation: CatchTopBarNavigation(
            mode: CatchTopBarNavigationMode.back,
            onPressed: _busy ? () {} : widget.onCancel,
          ),
          emphasis: scrolledUnder
              ? CatchTopBarEmphasis.divided
              : CatchTopBarEmphasis.plain,
        ),
        footer: CatchDock.primary(
          label: l.hostMomentSave,
          buttonKey: const ValueKey('moment-save'),
          isLoading: _busy,
          onPressed: _busy ? null : _save,
        ),
        body: CatchRouteBody.standard(
          child: Form(
            key: _formKey,
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                if (_error case final error?) ...[
                  CatchLocalizedErrorState(
                    error,
                    context: AppErrorContext.event,
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
                  children: [
                    CatchField.input(
                      copy: catchFieldCopy(l),
                      key: const ValueKey('moment-name'),
                      title: l.hostMomentName,
                      contract: CatchContractConstraints
                          .upsertOrganizerMomentCallablePayloadName,
                      controller: _name,
                      states: <WidgetState>{if (_busy) WidgetState.disabled},
                    ),
                  ],
                ),
                gapH24,
                CatchSection.fieldRows(
                  title: l.hostMomentWhen,
                  children: [
                    CatchField<OrganizerMomentInitiationKind>.select(
                      copy: catchFieldCopy(l),
                      title: l.hostMomentInitiation,
                      contract: CatchContractConstraints
                          .upsertOrganizerMomentCallablePayloadInitiationKind,
                      contractValueBuilder: (kind) => kind.name,
                      values: OrganizerMomentInitiationKind.values,
                      itemLabelBuilder: (kind) => _initiationLabel(l, kind),
                      value: _initiationKind,
                      states: <WidgetState>{if (_busy) WidgetState.disabled},
                      onChanged: (kind) {
                        if (kind != null) {
                          setState(() => _initiationKind = kind);
                        }
                      },
                    ),
                    if (_initiationKind ==
                        OrganizerMomentInitiationKind.scheduled)
                      CatchField.nav(
                        copy: catchFieldCopy(l),
                        title: l.hostMomentFireTime,
                        body: _scheduledAt == null
                            ? l.hostMomentFireTimeEmpty
                            : AppTimeFormatters.dateTime(_scheduledAt!),
                        icon: CatchIcons.calendarMonthOutlined,
                        onTap: _busy ? null : _pickSchedule,
                      ),
                    if (_initiationKind ==
                        OrganizerMomentInitiationKind.anchored) ...[
                      CatchField<OrganizerMomentAnchorKind>.select(
                        copy: catchFieldCopy(l),
                        title: l.hostMomentAnchor,
                        contract: CatchContractConstraints
                            .upsertOrganizerMomentCallablePayloadInitiationAnchorKind,
                        contractValueBuilder: (anchor) => anchor.name,
                        values: OrganizerMomentAnchorKind.values,
                        itemLabelBuilder: (anchor) => _anchorLabel(l, anchor),
                        value: _anchorKind,
                        states: <WidgetState>{if (_busy) WidgetState.disabled},
                        onChanged: (anchor) {
                          if (anchor != null) {
                            setState(() => _anchorKind = anchor);
                          }
                        },
                      ),
                      CatchField.input(
                        copy: catchFieldCopy(l),
                        key: const ValueKey('moment-offset'),
                        title: l.hostMomentOffset,
                        contract: CatchContractConstraints
                            .upsertOrganizerMomentCallablePayloadInitiationOffsetMinutes,
                        controller: _offset,
                        keyboardType: TextInputType.number,
                        states: <WidgetState>{if (_busy) WidgetState.disabled},
                      ),
                      CatchField.input(
                        copy: catchFieldCopy(l),
                        key: const ValueKey('moment-anchor-id'),
                        title: l.hostMomentAnchorId,
                        contract: CatchContractConstraints
                            .upsertOrganizerMomentCallablePayloadInitiationAnchorId,
                        controller: _anchorId,
                        states: <WidgetState>{if (_busy) WidgetState.disabled},
                      ),
                    ],
                    if (_initiationKind ==
                        OrganizerMomentInitiationKind.triggered) ...[
                      CatchField<OrganizerMomentTriggerKind>.select(
                        copy: catchFieldCopy(l),
                        title: l.hostMomentTrigger,
                        contract: CatchContractConstraints
                            .upsertOrganizerMomentCallablePayloadInitiationTriggerKind,
                        contractValueBuilder: (trigger) => trigger.name,
                        values: OrganizerMomentTriggerKind.values,
                        itemLabelBuilder: (trigger) =>
                            _triggerLabel(l, trigger),
                        value: _triggerKind,
                        states: <WidgetState>{if (_busy) WidgetState.disabled},
                        onChanged: (trigger) {
                          if (trigger != null) {
                            setState(() => _triggerKind = trigger);
                          }
                        },
                      ),
                      CatchField.input(
                        copy: catchFieldCopy(l),
                        key: const ValueKey('moment-trigger-function'),
                        title: l.hostMomentFunctionId,
                        contract: CatchContractConstraints
                            .upsertOrganizerMomentCallablePayloadInitiationFunctionId,
                        controller: _triggerFunctionId,
                        states: <WidgetState>{if (_busy) WidgetState.disabled},
                      ),
                    ],
                  ],
                ),
                gapH24,
                CatchSection.fieldRows(
                  title: l.hostMomentAudienceSection,
                  children: [
                    CatchField<OrganizerMomentSense>.select(
                      copy: catchFieldCopy(l),
                      title: l.hostMomentSense,
                      contract: CatchContractConstraints
                          .upsertOrganizerMomentCallablePayloadSense,
                      contractValueBuilder: (sense) => sense.name,
                      values: OrganizerMomentSense.values,
                      itemLabelBuilder: (sense) => switch (sense) {
                        OrganizerMomentSense.individual =>
                          l.hostMomentSenseIndividual,
                        OrganizerMomentSense.audience =>
                          l.hostMomentSenseAudience,
                      },
                      value: _sense,
                      states: <WidgetState>{if (_busy) WidgetState.disabled},
                      onChanged: (sense) {
                        if (sense != null) setState(() => _sense = sense);
                      },
                    ),
                    CatchField<OrganizerMomentAudienceKind>.select(
                      copy: catchFieldCopy(l),
                      title: l.hostMomentAudience,
                      contract: CatchContractConstraints
                          .upsertOrganizerMomentCallablePayloadAudienceKind,
                      contractValueBuilder: (kind) => kind.name,
                      values: OrganizerMomentAudienceKind.values,
                      itemLabelBuilder: (kind) => _audienceLabel(l, kind),
                      value: _audienceKind,
                      states: <WidgetState>{if (_busy) WidgetState.disabled},
                      onChanged: (kind) {
                        if (kind != null) setState(() => _audienceKind = kind);
                      },
                    ),
                    if (_audienceKind ==
                        OrganizerMomentAudienceKind.eventParticipants)
                      CatchField.toggle(
                        copy: catchFieldCopy(l),
                        title: l.hostMomentSignedUpOnly,
                        contractExemption:
                            'Toggle derives the eventParticipants statuses array; signedUp is the only supported status today.',
                        value: _participantsSignedUp,
                        onChanged: _busy
                            ? null
                            : (v) => setState(() => _participantsSignedUp = v),
                      ),
                    if (_audienceKind ==
                        OrganizerMomentAudienceKind.functionGuests) ...[
                      CatchField.input(
                        copy: catchFieldCopy(l),
                        key: const ValueKey('moment-audience-function'),
                        title: l.hostMomentFunctionId,
                        contract: CatchContractConstraints
                            .upsertOrganizerMomentCallablePayloadAudienceFunctionId,
                        controller: _audienceFunctionId,
                        states: <WidgetState>{if (_busy) WidgetState.disabled},
                      ),
                      CatchField<OrganizerMomentRsvpState>.choices(
                        copy: catchFieldCopy(l),
                        title: l.hostMomentRsvp,
                        contract: CatchContractConstraints
                            .upsertOrganizerMomentCallablePayloadAudienceRsvpItems,
                        contractValueBuilder: (state) => state.name,
                        values: OrganizerMomentRsvpState.values,
                        itemLabelBuilder: (state) => switch (state) {
                          OrganizerMomentRsvpState.attending =>
                            l.hostMomentRsvpAttending,
                          OrganizerMomentRsvpState.maybe =>
                            l.hostMomentRsvpMaybe,
                        },
                        selected: _audienceRsvp,
                        mode: CatchChipMode.multiple,
                        allowEmptySelection: true,
                        states: <WidgetState>{if (_busy) WidgetState.disabled},
                        onSelectionChanged: (selection) =>
                            setState(() => _audienceRsvp = selection),
                      ),
                      CatchField.toggle(
                        copy: catchFieldCopy(l),
                        title: l.hostMomentHouseholdDedupe,
                        contract: CatchContractConstraints
                            .upsertOrganizerMomentCallablePayloadAudienceHouseholdDedupe,
                        value: _householdDedupe,
                        onChanged: _busy
                            ? null
                            : (v) => setState(() => _householdDedupe = v),
                      ),
                      CatchField.toggle(
                        copy: catchFieldCopy(l),
                        key: const ValueKey('moment-audience-travel-lead'),
                        title: l.hostMomentTravelTimeLead,
                        contract: CatchContractConstraints
                            .upsertOrganizerMomentCallablePayloadAudienceTravelTimeLead,
                        value: _travelTimeLead,
                        onChanged: _busy
                            ? null
                            : (v) => setState(() => _travelTimeLead = v),
                      ),
                    ],
                    if (_audienceKind == OrganizerMomentAudienceKind.households)
                      CatchField.toggle(
                        copy: catchFieldCopy(l),
                        title: l.hostMomentRsvpPendingOnly,
                        contract: CatchContractConstraints
                            .upsertOrganizerMomentCallablePayloadAudienceRsvpPendingOnly,
                        value: _rsvpPendingOnly,
                        onChanged: _busy
                            ? null
                            : (v) => setState(() => _rsvpPendingOnly = v),
                      ),
                    if (_audienceKind ==
                        OrganizerMomentAudienceKind.staffDuty) ...[
                      CatchField.input(
                        copy: catchFieldCopy(l),
                        key: const ValueKey('moment-audience-duty'),
                        title: l.hostMomentDuty,
                        contract: CatchContractConstraints
                            .upsertOrganizerMomentCallablePayloadAudienceDuty,
                        controller: _audienceDuty,
                        states: <WidgetState>{if (_busy) WidgetState.disabled},
                      ),
                      CatchField.input(
                        copy: catchFieldCopy(l),
                        key: const ValueKey('moment-audience-scopes'),
                        title: l.hostMomentScopeIds,
                        contractExemption:
                            'Comma-separated function/pickupPoint/hotel ids; blank sends to every holder of the duty.',
                        controller: _audienceScopeIds,
                        states: <WidgetState>{if (_busy) WidgetState.disabled},
                      ),
                    ],
                  ],
                ),
                gapH24,
                CatchSection.fieldRows(
                  title: l.hostMomentActionSection,
                  children: [
                    CatchField<OrganizerMomentActionKind>.select(
                      copy: catchFieldCopy(l),
                      title: l.hostMomentAction,
                      contract: CatchContractConstraints
                          .upsertOrganizerMomentCallablePayloadActionKind,
                      contractValueBuilder: (kind) => kind.name,
                      values: OrganizerMomentActionKind.values,
                      itemLabelBuilder: (kind) => _actionLabel(l, kind),
                      value: _actionKind,
                      states: <WidgetState>{if (_busy) WidgetState.disabled},
                      onChanged: (kind) {
                        if (kind != null) setState(() => _actionKind = kind);
                      },
                    ),
                    if (_actionKind ==
                        OrganizerMomentActionKind.sendTemplate) ...[
                      CatchField.input(
                        copy: catchFieldCopy(l),
                        key: const ValueKey('moment-connection'),
                        title: l.hostMomentConnectionId,
                        contract: CatchContractConstraints
                            .upsertOrganizerMomentCallablePayloadActionConnectionId,
                        controller: _connectionId,
                        states: <WidgetState>{if (_busy) WidgetState.disabled},
                      ),
                      CatchField.input(
                        copy: catchFieldCopy(l),
                        key: const ValueKey('moment-template'),
                        title: l.hostMomentTemplateId,
                        contract: CatchContractConstraints
                            .upsertOrganizerMomentCallablePayloadActionTemplateId,
                        controller: _templateId,
                        states: <WidgetState>{if (_busy) WidgetState.disabled},
                      ),
                      CatchField.input(
                        copy: catchFieldCopy(l),
                        key: const ValueKey('moment-variables'),
                        title: l.hostMomentVariables,
                        contractExemption:
                            'Template substitutions; one key=value pair per line.',
                        controller: _variables,
                        minLines: 2,
                        states: <WidgetState>{if (_busy) WidgetState.disabled},
                      ),
                    ],
                    if (_actionKind == OrganizerMomentActionKind.push) ...[
                      CatchField.input(
                        copy: catchFieldCopy(l),
                        key: const ValueKey('moment-notification-type'),
                        title: l.hostMomentNotificationType,
                        contract: CatchContractConstraints
                            .upsertOrganizerMomentCallablePayloadActionNotificationType,
                        controller: _notificationType,
                        states: <WidgetState>{if (_busy) WidgetState.disabled},
                      ),
                      CatchField.input(
                        copy: catchFieldCopy(l),
                        key: const ValueKey('moment-preference-key'),
                        title: l.hostMomentPreferenceKey,
                        contract: CatchContractConstraints
                            .upsertOrganizerMomentCallablePayloadActionPreferenceKey,
                        controller: _preferenceKey,
                        states: <WidgetState>{if (_busy) WidgetState.disabled},
                      ),
                    ],
                    if (_actionKind ==
                        OrganizerMomentActionKind.staffAttention) ...[
                      CatchField.input(
                        copy: catchFieldCopy(l),
                        key: const ValueKey('moment-action-duty'),
                        title: l.hostMomentDuty,
                        contract: CatchContractConstraints
                            .upsertOrganizerMomentCallablePayloadActionDuty,
                        controller: _actionDuty,
                        states: <WidgetState>{if (_busy) WidgetState.disabled},
                      ),
                      CatchField<OrganizerMomentAttentionSeverity>.select(
                        copy: catchFieldCopy(l),
                        title: l.hostMomentSeverity,
                        contract: CatchContractConstraints
                            .upsertOrganizerMomentCallablePayloadActionSeverity,
                        contractValueBuilder: (severity) => severity.name,
                        values: OrganizerMomentAttentionSeverity.values,
                        itemLabelBuilder: (severity) => switch (severity) {
                          OrganizerMomentAttentionSeverity.info =>
                            l.hostMomentSeverityInfo,
                          OrganizerMomentAttentionSeverity.warning =>
                            l.hostMomentSeverityWarning,
                          OrganizerMomentAttentionSeverity.urgent =>
                            l.hostMomentSeverityUrgent,
                        },
                        value: _severity,
                        states: <WidgetState>{if (_busy) WidgetState.disabled},
                        onChanged: (severity) {
                          if (severity != null) {
                            setState(() => _severity = severity);
                          }
                        },
                      ),
                      CatchField.input(
                        copy: catchFieldCopy(l),
                        key: const ValueKey('moment-title-template'),
                        title: l.hostMomentTitleTemplate,
                        contract: CatchContractConstraints
                            .upsertOrganizerMomentCallablePayloadActionTitleTemplate,
                        controller: _titleTemplate,
                        states: <WidgetState>{if (_busy) WidgetState.disabled},
                      ),
                    ],
                  ],
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }

  Future<void> _pickSchedule() async {
    final now = DateTime.now();
    final date = await showDatePicker(
      context: context,
      initialDate: _scheduledAt ?? now.add(const Duration(hours: 1)),
      firstDate: now.subtract(const Duration(days: 365)),
      lastDate: now.add(const Duration(days: 3650)),
    );
    if (!mounted || date == null) return;
    final time = await showTimePicker(
      context: context,
      initialTime: TimeOfDay.fromDateTime(_scheduledAt ?? now),
    );
    if (!mounted || time == null) return;
    setState(
      () => _scheduledAt = DateTime(
        date.year,
        date.month,
        date.day,
        time.hour,
        time.minute,
      ),
    );
  }

  String? _requiredId(TextEditingController controller) {
    final value = controller.text.trim();
    return value.isEmpty ? null : value;
  }

  Map<String, String> _parseVariables() {
    final variables = <String, String>{};
    for (final line in _variables.text.split('\n')) {
      final trimmed = line.trim();
      if (trimmed.isEmpty) continue;
      final split = trimmed.indexOf('=');
      if (split <= 0) continue;
      variables[trimmed.substring(0, split).trim()] = trimmed
          .substring(split + 1)
          .trim();
    }
    return variables;
  }

  OrganizerMomentInitiation _buildInitiation() => switch (_initiationKind) {
    OrganizerMomentInitiationKind.manual => const OrganizerMomentInitiation(
      kind: OrganizerMomentInitiationKind.manual,
    ),
    OrganizerMomentInitiationKind.scheduled => OrganizerMomentInitiation(
      kind: OrganizerMomentInitiationKind.scheduled,
      atMillis: _scheduledAt!.millisecondsSinceEpoch,
    ),
    OrganizerMomentInitiationKind.anchored => OrganizerMomentInitiation(
      kind: OrganizerMomentInitiationKind.anchored,
      anchorKind: _anchorKind,
      anchorId: _requiredId(_anchorId),
      offsetMinutes: int.parse(_offset.text.trim()),
    ),
    OrganizerMomentInitiationKind.triggered => OrganizerMomentInitiation(
      kind: OrganizerMomentInitiationKind.triggered,
      triggerKind: _triggerKind,
      functionId: _requiredId(_triggerFunctionId),
    ),
  };

  OrganizerMomentAudience _buildAudience() => switch (_audienceKind) {
    OrganizerMomentAudienceKind.subject => const OrganizerMomentAudience(
      kind: OrganizerMomentAudienceKind.subject,
    ),
    OrganizerMomentAudienceKind.eventParticipants => OrganizerMomentAudience(
      kind: OrganizerMomentAudienceKind.eventParticipants,
      statuses: _participantsSignedUp ? const ['signedUp'] : const [],
    ),
    OrganizerMomentAudienceKind.functionGuests => OrganizerMomentAudience(
      kind: OrganizerMomentAudienceKind.functionGuests,
      functionId: _requiredId(_audienceFunctionId),
      rsvp: _audienceRsvp.toList(growable: false),
      householdDedupe: _householdDedupe,
      travelTimeLead: _travelTimeLead,
    ),
    OrganizerMomentAudienceKind.households => OrganizerMomentAudience(
      kind: OrganizerMomentAudienceKind.households,
      rsvpPendingOnly: _rsvpPendingOnly,
    ),
    OrganizerMomentAudienceKind.staffDuty => OrganizerMomentAudience(
      kind: OrganizerMomentAudienceKind.staffDuty,
      duty: _requiredId(_audienceDuty),
      scopeIds: _audienceScopeIds.text
          .split(',')
          .map((id) => id.trim())
          .where((id) => id.isNotEmpty)
          .toList(growable: false),
    ),
  };

  OrganizerMomentAction _buildAction() => switch (_actionKind) {
    OrganizerMomentActionKind.sendTemplate => OrganizerMomentAction(
      kind: OrganizerMomentActionKind.sendTemplate,
      connectionId: _requiredId(_connectionId),
      templateId: _requiredId(_templateId),
      variables: _parseVariables(),
    ),
    OrganizerMomentActionKind.push => OrganizerMomentAction(
      kind: OrganizerMomentActionKind.push,
      notificationType: _requiredId(_notificationType),
      preferenceKey: _requiredId(_preferenceKey),
    ),
    OrganizerMomentActionKind.staffAttention => OrganizerMomentAction(
      kind: OrganizerMomentActionKind.staffAttention,
      duty: _requiredId(_actionDuty),
      severity: _severity,
      titleTemplate: _requiredId(_titleTemplate),
    ),
  };

  String? _validate() {
    final l = context.l10n;
    if (_name.text.trim().isEmpty) return l.hostMomentNameRequired;
    if (_initiationKind == OrganizerMomentInitiationKind.scheduled &&
        _scheduledAt == null) {
      return l.hostMomentFireTimeRequired;
    }
    if (_initiationKind == OrganizerMomentInitiationKind.anchored &&
        int.tryParse(_offset.text.trim()) == null) {
      return l.hostMomentOffsetInvalid;
    }
    if (_audienceKind == OrganizerMomentAudienceKind.functionGuests &&
        _requiredId(_audienceFunctionId) == null) {
      return l.hostMomentFunctionIdRequired;
    }
    if (_audienceKind == OrganizerMomentAudienceKind.staffDuty &&
        _requiredId(_audienceDuty) == null) {
      return l.hostMomentDutyRequired;
    }
    if (_actionKind == OrganizerMomentActionKind.sendTemplate &&
        (_requiredId(_connectionId) == null ||
            _requiredId(_templateId) == null)) {
      return l.hostMomentTemplateRequired;
    }
    return null;
  }

  Future<void> _save() async {
    if (_busy) return;
    if (!(_formKey.currentState?.validate() ?? false)) return;
    final invalid = _validate();
    if (invalid != null) {
      setState(() => _validation = invalid);
      return;
    }
    setState(() {
      _busy = true;
      _error = null;
      _validation = null;
    });
    try {
      await ref
          .read(organizerMomentsControllerProvider(widget.scope).notifier)
          .save(
            momentId: widget.initialMoment?.momentId,
            name: _name.text.trim(),
            initiation: _buildInitiation(),
            sense: _sense,
            audience: _buildAudience(),
            action: _buildAction(),
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
