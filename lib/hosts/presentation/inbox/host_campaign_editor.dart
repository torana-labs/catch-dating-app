import 'package:catch_dating_app/clubs/domain/club.dart';
import 'package:catch_dating_app/core/app_error_message.dart';
import 'package:catch_dating_app/core/presentation/catch_async_state.dart';
import 'package:catch_dating_app/core/presentation/catch_ui_copy.dart';
import 'package:catch_dating_app/core/riverpod_ui/catch_async_boundary.dart';
import 'package:catch_dating_app/core/riverpod_ui/catch_async_value_adapter.dart';
import 'package:catch_dating_app/core/riverpod_ui/catch_localized_error_state.dart';
import 'package:catch_dating_app/core/riverpod_ui/catch_notice_feedback.dart';
import 'package:catch_dating_app/core/schema_contracts/generated/field_constraints.g.dart';
import 'package:catch_dating_app/core/time_formatters.dart';
import 'package:catch_dating_app/events/data/event_repository.dart';
import 'package:catch_dating_app/events/domain/event.dart';
import 'package:catch_dating_app/hosts/data/crm/host_saved_audience_repository.dart';
import 'package:catch_dating_app/hosts/data/crm/host_whatsapp_repository.dart';
import 'package:catch_dating_app/hosts/domain/crm/host_campaign.dart';
import 'package:catch_dating_app/hosts/domain/crm/host_campaign_policy.dart';
import 'package:catch_dating_app/hosts/domain/crm/host_messaging_setup.dart';
import 'package:catch_dating_app/hosts/domain/crm/host_saved_audience.dart';
import 'package:catch_dating_app/hosts/presentation/host_audience_controller.dart';
import 'package:catch_dating_app/l10n/l10n.dart';
import 'package:catch_tokens/catch_tokens.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

enum _HostCampaignMessageClass {
  eventFollowUp('eventFollowUp'),
  organizerUpdate('organizerUpdate'),
  organizerPromotion('organizerPromotion');

  const _HostCampaignMessageClass(this.wireValue);

  final String wireValue;
}

enum _HostInviteDestination {
  catchEvent('catchEvent'),
  eventRuntime('eventRuntime'),
  externalBooking('externalBooking');

  const _HostInviteDestination(this.wireValue);

  final String wireValue;
}

class HostCampaignEditor extends ConsumerStatefulWidget {
  const HostCampaignEditor({
    super.key,
    required this.club,
    this.initialSavedAudienceId,
    this.onBusyChanged,
  });

  final Club club;
  final String? initialSavedAudienceId;
  final ValueChanged<bool>? onBusyChanged;

  @override
  ConsumerState<HostCampaignEditor> createState() => _HostCampaignEditorState();
}

class _HostCampaignEditorState extends ConsumerState<HostCampaignEditor> {
  final _campaignNameController = TextEditingController();
  final Map<String, TextEditingController> _variableControllers = {};
  HostSavedAudience? _selectedAudience;
  _HostCampaignMessageClass _messageClass =
      _HostCampaignMessageClass.organizerPromotion;
  HostWhatsappTemplate? _selectedTemplate;
  Event? _selectedEvent;
  _HostInviteDestination? _inviteDestination;
  HostCampaign? _campaign;
  DateTime? _scheduledAt;
  String? _scheduleError;
  bool _busy = false;

  @override
  void didUpdateWidget(covariant HostCampaignEditor oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (oldWidget.club.id != widget.club.id ||
        oldWidget.initialSavedAudienceId != widget.initialSavedAudienceId) {
      _campaign = null;
      _scheduledAt = null;
      _scheduleError = null;
      _selectedTemplate = null;
      _selectedAudience = null;
      _disposeVariableControllers();
    }
  }

  @override
  void dispose() {
    _campaignNameController.dispose();
    _disposeVariableControllers();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final messaging = ref.watch(hostMessagingSetupProvider(widget.club.id));
    final savedAudiences = catchAsyncStateFromAsyncValue(
      ref.watch(hostSavedAudiencesProvider(widget.club.id)),
    );
    return CatchSection.divided(
      title: context.l10n.hostsHostAudienceCampaign,
      child: CatchAsyncBoundary<HostMessagingSetup>(
        value: messaging,
        onRetry: () =>
            ref.invalidate(hostMessagingSetupProvider(widget.club.id)),
        initialLoadTimeout: null,
        loadingBuilder: (_) => const CatchLoadingIndicator(),
        errorBuilder: (_, error, _, onBoundaryRetry) =>
            CatchLocalizedErrorState(
              error,
              context: AppErrorContext.club,
              mode: CatchErrorStateMode.compact,
              onRetry: onBoundaryRetry,
            ),
        builder: (context, setup) {
          final connection = setup.connection;
          final approved = setup.approvedTemplates;
          final events =
              catchAsyncStateFromAsyncValue(
                    ref.watch(watchEventsForClubProvider(widget.club.id)),
                  ).value
                  ?.where((event) => !event.isCancelled)
                  .toList(growable: false) ??
              const <Event>[];
          if (connection == null || !connection.isActive) {
            return CatchText(
              context.l10n.hostsHostAudienceCampaignNeedsActiveSender,
              variant: CatchTextVariant.supporting,
              color: CatchTokens.of(context).ink2,
            );
          }
          if (approved.isEmpty) {
            return CatchText(
              context.l10n.hostsHostAudienceCampaignNeedsTemplate,
              variant: CatchTextVariant.supporting,
              color: CatchTokens.of(context).ink2,
            );
          }
          if (savedAudiences.status == CatchAsyncStatus.error) {
            return CatchLocalizedErrorState(
              savedAudiences.error!,
              context: AppErrorContext.customers,
              mode: CatchErrorStateMode.compact,
              onRetry: () =>
                  ref.invalidate(hostSavedAudiencesProvider(widget.club.id)),
            );
          }
          if (savedAudiences.status == CatchAsyncStatus.loading) {
            return const CatchLoadingIndicator();
          }
          final audiences = savedAudiences.value?.audiences ?? const [];
          if (audiences.isEmpty) {
            return CatchNotice(
              dismissLabel: context.l10n.coreCatchNoticeTooltipDismiss,
              notice: CatchNoticeData(
                id: 'host.sends.saved-audience-required',
                title: context.l10n.hostSavedAudiencesEmptyTitle,
                message: context.l10n.hostSavedAudiencesEmptyBody,
              ),
            );
          }
          final template = _selectedTemplate ?? approved.first;
          final selectedAudience = _audienceIn(
            audiences,
            _selectedAudience,
            widget.initialSavedAudienceId,
          );
          return CatchFieldLanes.custom(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                CatchField.input(
                  copy: catchFieldCopy(context.l10n),
                  title: context.l10n.hostsHostAudienceCampaignName,
                  contract: CatchContractConstraints
                      .upsertOrganizerCampaignCallablePayloadName,
                  controller: _campaignNameController,
                  placeholder:
                      context.l10n.hostsHostAudienceCampaignNameExample,
                  states: <WidgetState>{
                    if (!(_campaign == null)) WidgetState.disabled,
                  },
                ),
                gapH12,
                CatchField<_HostCampaignMessageClass>.select(
                  copy: catchFieldCopy(context.l10n),
                  title: context.l10n.hostsHostAudienceMessageType,
                  contract: CatchContractConstraints
                      .upsertOrganizerCampaignCallablePayloadMessageClass,
                  contractValueBuilder: (value) => value.wireValue,
                  values: _HostCampaignMessageClass.values,
                  itemLabelBuilder: (value) =>
                      _messageClassLabel(context, value),
                  value: _messageClass,
                  states: <WidgetState>{
                    if (!(_campaign == null)) WidgetState.disabled,
                  },
                  onChanged: (value) {
                    if (value != null) setState(() => _messageClass = value);
                  },
                ),
                gapH12,
                Text(
                  context.l10n.hostSendsDeliveryTime,
                  style: CatchTextStyles.fieldRowTitle(context),
                ),
                gapH8,
                CatchText(
                  _scheduledAt == null
                      ? context.l10n.hostSendsSendNow
                      : AppTimeFormatters.dateTime(_scheduledAt!),
                  variant: CatchTextVariant.supporting,
                  color: CatchTokens.of(context).ink2,
                ),
                gapH8,
                Wrap(
                  spacing: CatchSpacing.s2,
                  runSpacing: CatchSpacing.s2,
                  children: [
                    CatchButton(
                      label: context.l10n.hostSendsSchedule,
                      variant: CatchButtonVariant.secondary,
                      size: CatchButtonSize.sm,
                      onPressed: _campaign == null && !_busy
                          ? _pickSchedule
                          : null,
                    ),
                    if (_scheduledAt != null)
                      CatchButton(
                        label: context.l10n.hostSendsClearSchedule,
                        variant: CatchButtonVariant.ghost,
                        size: CatchButtonSize.sm,
                        onPressed: _campaign == null && !_busy
                            ? () => setState(() {
                                _scheduledAt = null;
                                _scheduleError = null;
                              })
                            : null,
                      ),
                  ],
                ),
                if (_scheduleError case final error?) ...[
                  gapH8,
                  CatchText(
                    error,
                    variant: CatchTextVariant.supporting,
                    color: CatchTokens.of(context).warning,
                  ),
                ],
                gapH12,
                Text(
                  context.l10n.hostsHostAudienceRecipients,
                  style: CatchTextStyles.fieldRowTitle(context),
                ),
                gapH8,
                CatchField<HostSavedAudience>.select(
                  copy: catchFieldCopy(context.l10n),
                  title: context.l10n.hostSavedAudienceFieldLabel,
                  contract: CatchContractConstraints
                      .upsertOrganizerCampaignCallablePayloadSavedAudienceId,
                  contractValueBuilder: (audience) => audience.audienceId,
                  values: audiences,
                  itemLabelBuilder: (audience) =>
                      _savedAudienceLabel(context, audience),
                  value: selectedAudience,
                  states: <WidgetState>{
                    if (!(_campaign == null)) WidgetState.disabled,
                  },
                  onChanged: (value) =>
                      setState(() => _selectedAudience = value),
                ),
                gapH12,
                CatchField<HostWhatsappTemplate>.select(
                  copy: catchFieldCopy(context.l10n),
                  title: context.l10n.hostsHostAudienceTemplate,
                  contract: CatchContractConstraints
                      .upsertOrganizerCampaignCallablePayloadTemplateId,
                  contractValueBuilder: (value) => value.templateId,
                  values: approved,
                  itemLabelBuilder: (value) =>
                      '${value.name} · ${value.language}',
                  value: template,
                  states: <WidgetState>{
                    if (!(_campaign == null)) WidgetState.disabled,
                  },
                  onChanged: (value) {
                    if (value == null) return;
                    setState(() {
                      _selectedTemplate = value;
                      _syncVariableControllers(value);
                    });
                  },
                ),
                if (hostCampaignTemplateUsesInvite(template)) ...[
                  gapH12,
                  CatchField<Event>.select(
                    copy: catchFieldCopy(context.l10n),
                    title: context.l10n.hostsHostAudienceLinkedEvent,
                    contract: CatchContractConstraints
                        .upsertOrganizerCampaignCallablePayloadEventId,
                    contractValueBuilder: (event) => event.id,
                    values: events,
                    itemLabelBuilder: (event) =>
                        '${event.title} · ${AppTimeFormatters.shortDate(event.startTime)}',
                    value: _eventIn(events, _selectedEvent),
                    hintText: context.l10n.hostsHostAudienceChooseEvent,
                    helperText: context.l10n.hostsHostAudienceLinkedEventHelp,
                    states: <WidgetState>{
                      if (!(_campaign == null)) WidgetState.disabled,
                    },
                    onChanged: (value) => setState(() {
                      _selectedEvent = value;
                      _inviteDestination = value == null
                          ? null
                          : _destinationsFor(value).first;
                    }),
                  ),
                  if (_selectedEvent case final event?) ...[
                    gapH12,
                    CatchField<_HostInviteDestination>.select(
                      copy: catchFieldCopy(context.l10n),
                      title: context.l10n.hostsHostAudienceInviteDestination,
                      contract: CatchContractConstraints
                          .upsertOrganizerCampaignCallablePayloadInviteDestinationKind,
                      contractValueBuilder: (value) => value.wireValue,
                      values: _destinationsFor(event),
                      itemLabelBuilder: (value) =>
                          _inviteDestinationLabel(context, value),
                      value:
                          _inviteDestination ?? _destinationsFor(event).first,
                      helperText: event.isExternalCompanion
                          ? context
                                .l10n
                                .hostsHostAudienceExternalAttributionExplanation
                          : context
                                .l10n
                                .hostsHostAudienceCatchAttributionExplanation,
                      states: <WidgetState>{
                        if (!(_campaign == null)) WidgetState.disabled,
                      },
                      onChanged: (value) =>
                          setState(() => _inviteDestination = value),
                    ),
                  ],
                ],
                for (final variable in template.variableNames)
                  if (!hostCampaignIsInviteVariable(variable)) ...[
                    gapH12,
                    CatchField.input(
                      copy: catchFieldCopy(context.l10n),
                      title: variable,
                      contractExemption:
                          'Template-variable keys are provider-defined; the generated contract constrains the map, not each dynamic value field.',
                      controller: _controllerForVariable(variable),
                      maxLength: 240,
                      states: <WidgetState>{
                        if (!(_campaign == null)) WidgetState.disabled,
                      },
                    ),
                  ],
                gapH16,
                if (_campaign == null)
                  CatchButton(
                    label: context.l10n.hostsHostAudiencePreviewCampaign,
                    onPressed: _busy
                        ? null
                        : () => _saveAndPreview(
                            connection,
                            template,
                            selectedAudience,
                          ),
                    status: (_busy)
                        ? CatchButtonStatus.loading
                        : CatchButtonStatus.idle,
                  )
                else
                  HostCampaignReportSection(
                    campaign: _campaign!,
                    busy: _busy,
                    onApprove: _campaign!.canApprove ? _approveCampaign : null,
                    onSend: _campaign!.canDispatch ? _dispatchCampaign : null,
                    onCancel:
                        _campaign!.status == 'cancelled' ||
                            _campaign!.status == 'completed' ||
                            _campaign!.status == 'partiallyFailed'
                        ? null
                        : _cancelCampaign,
                    onRefresh: _refreshCampaign,
                    onNew: _newCampaign,
                  ),
              ],
            ),
          );
        },
      ),
    );
  }

  Future<void> _saveAndPreview(
    HostWhatsappConnection connection,
    HostWhatsappTemplate template,
    HostSavedAudience? selectedAudience,
  ) => _run(() async {
    final variables = {
      for (final entry in _variableControllers.entries)
        if (template.variableNames.contains(entry.key) &&
            !hostCampaignIsInviteVariable(entry.key))
          entry.key: entry.value.text.trim(),
    };
    final needsInvite = hostCampaignTemplateUsesInvite(template);
    if (_scheduledAt != null && !_scheduledAt!.isAfter(DateTime.now())) {
      setState(() {
        _scheduleError = context.l10n.hostsHostAudienceBlockerSchedule;
      });
      return;
    }
    if (_campaignNameController.text.trim().isEmpty ||
        selectedAudience == null ||
        variables.values.any((value) => value.isEmpty) ||
        (needsInvite && _selectedEvent == null)) {
      throw StateError(context.l10n.hostsHostAudienceCompleteCampaign);
    }
    final preview = await ref
        .read(hostAudienceControllerProvider)
        .saveAndPreviewCampaign(
          organizerId: widget.club.id,
          draft: HostCampaignDraft(
            requestId: '${DateTime.now().microsecondsSinceEpoch}-host',
            name: _campaignNameController.text.trim(),
            messageClass: _messageClass.wireValue,
            savedAudienceId: selectedAudience.audienceId,
            connectionId: connection.connectionId,
            templateId: template.templateId,
            templateVariables: variables,
            eventId: needsInvite ? _selectedEvent!.id : null,
            inviteDestinationKind: needsInvite
                ? (_inviteDestination ??
                          _destinationsFor(_selectedEvent!).first)
                      .wireValue
                : null,
            scheduledAt: _scheduledAt,
          ),
        );
    if (mounted) setState(() => _campaign = preview);
  });

  Future<void> _approveCampaign() => _run(() async {
    final campaign = await ref
        .read(hostAudienceControllerProvider)
        .approveCampaign(organizerId: widget.club.id, campaign: _campaign!);
    if (mounted) setState(() => _campaign = campaign);
  });

  Future<void> _dispatchCampaign() => _run(() async {
    final campaign = await ref
        .read(hostAudienceControllerProvider)
        .dispatchCampaign(organizerId: widget.club.id, campaign: _campaign!);
    if (mounted) setState(() => _campaign = campaign);
  });

  Future<void> _cancelCampaign() => _run(() async {
    final campaign = await ref
        .read(hostAudienceControllerProvider)
        .cancelCampaign(organizerId: widget.club.id, campaign: _campaign!);
    if (mounted) setState(() => _campaign = campaign);
  });

  Future<void> _refreshCampaign() => _run(() async {
    final campaign = await ref
        .read(hostAudienceControllerProvider)
        .getCampaignReport(
          organizerId: widget.club.id,
          campaignId: _campaign!.campaignId,
        );
    if (mounted) setState(() => _campaign = campaign);
  });

  void _newCampaign() {
    setState(() {
      _campaign = null;
      _campaignNameController.clear();
      _selectedEvent = null;
      _inviteDestination = null;
      _scheduledAt = null;
      _scheduleError = null;
    });
  }

  Future<void> _pickSchedule() async {
    final now = DateTime.now();
    final initial = _scheduledAt ?? now.add(const Duration(hours: 1));
    final date = await showCatchDatePicker(
      copy: catchDatePickerCopy(context.l10n),
      context: context,
      initialDate: initial,
      firstDate: DateUtils.dateOnly(now),
      lastDate: DateUtils.dateOnly(now.add(const Duration(days: 365))),
      title: context.l10n.hostSendsSchedule,
    );
    if (date == null || !mounted) return;
    final time = await showCatchTimePicker(
      copy: catchTimePickerCopy(context.l10n),
      context: context,
      initialTime: TimeOfDay.fromDateTime(initial),
      title: context.l10n.hostSendsSchedule,
    );
    if (time == null || !mounted) return;
    final scheduledAt = DateTime(
      date.year,
      date.month,
      date.day,
      time.hour,
      time.minute,
    );
    setState(() {
      _scheduledAt = scheduledAt;
      _scheduleError = scheduledAt.isAfter(DateTime.now())
          ? null
          : context.l10n.hostsHostAudienceBlockerSchedule;
    });
  }

  Future<void> _run(Future<void> Function() action) async {
    if (_busy) return;
    setState(() => _busy = true);
    widget.onBusyChanged?.call(true);
    try {
      await action();
    } on Object catch (error) {
      if (mounted) {
        showCatchNoticeError(
          context,
          error,
          errorContext: AppErrorContext.club,
        );
      }
    } finally {
      if (mounted) setState(() => _busy = false);
      widget.onBusyChanged?.call(false);
    }
  }

  void _syncVariableControllers(HostWhatsappTemplate template) {
    final retained = template.variableNames.where(
      (name) => !hostCampaignIsInviteVariable(name),
    );
    final removed = _variableControllers.keys
        .where((name) => !retained.contains(name))
        .toList();
    for (final name in removed) {
      _variableControllers.remove(name)?.dispose();
    }
    for (final name in retained) {
      _variableControllers.putIfAbsent(name, TextEditingController.new);
    }
    if (!hostCampaignTemplateUsesInvite(template)) {
      _selectedEvent = null;
      _inviteDestination = null;
    }
  }

  TextEditingController _controllerForVariable(String name) =>
      _variableControllers.putIfAbsent(name, TextEditingController.new);

  void _disposeVariableControllers() {
    for (final controller in _variableControllers.values) {
      controller.dispose();
    }
    _variableControllers.clear();
  }
}

class HostCampaignReportSection extends StatelessWidget {
  const HostCampaignReportSection({
    super.key,
    required this.campaign,
    required this.busy,
    required this.onApprove,
    required this.onSend,
    required this.onCancel,
    required this.onRefresh,
    required this.onNew,
  });

  final HostCampaign campaign;
  final bool busy;
  final VoidCallback? onApprove;
  final VoidCallback? onSend;
  final VoidCallback? onCancel;
  final VoidCallback onRefresh;
  final VoidCallback onNew;

  @override
  Widget build(BuildContext context) {
    final counts = campaign.audienceCounts;
    final delivery = campaign.deliveryCounts;
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        CatchNotice(
          dismissLabel: context.l10n.coreCatchNoticeTooltipDismiss,
          notice: CatchNoticeData(
            id: 'host.audience.campaign.${campaign.campaignId}',
            title: context.l10n.hostsHostAudienceCampaignStatus(
              status: campaign.status,
            ),
            message: context.l10n.hostsHostAudienceCampaignCounts(
              total: counts['total'],
              reachable: counts['reachable'],
              optedOut: counts['optedOut'],
              unknown: counts['unknown'],
            ),
            tone: campaign.blockers.isEmpty
                ? CatchNoticeTone.status
                : CatchNoticeTone.warning,
          ),
        ),
        if (campaign.blockers.isNotEmpty) ...[
          gapH8,
          CatchText(
            campaign.blockers
                .map((value) => hostCampaignBlockerLabel(context, value))
                .join(' · '),
            variant: CatchTextVariant.supporting,
            color: CatchTokens.of(context).warning,
          ),
        ],
        if (delivery.values.values.any((value) => value > 0)) ...[
          gapH8,
          CatchText(
            context.l10n.hostsHostAudienceDeliveryCounts(
              sent: delivery['sent'],
              delivered: delivery['delivered'],
              read: delivery['read'],
              failed: delivery['failed'],
            ),
            variant: CatchTextVariant.supporting,
            color: CatchTokens.of(context).ink2,
          ),
        ],
        gapH12,
        Wrap(
          spacing: CatchSpacing.s2,
          runSpacing: CatchSpacing.s2,
          children: [
            if (onApprove != null)
              CatchButton(
                label: context.l10n.hostsHostAudienceApprove,
                onPressed: busy ? null : onApprove,
                status: (busy)
                    ? CatchButtonStatus.loading
                    : CatchButtonStatus.idle,
              ),
            if (onSend != null)
              CatchButton(
                label: context.l10n.hostsHostAudienceSendNow,
                onPressed: busy ? null : onSend,
                status: (busy)
                    ? CatchButtonStatus.loading
                    : CatchButtonStatus.idle,
              ),
            CatchButton(
              label: context.l10n.hostsHostAudienceRefresh,
              variant: CatchButtonVariant.secondary,
              onPressed: busy ? null : onRefresh,
            ),
            if (onCancel != null)
              CatchButton(
                label: context.l10n.hostsHostAudienceCancel,
                variant: CatchButtonVariant.ghost,
                onPressed: busy ? null : onCancel,
              ),
            CatchButton(
              label: context.l10n.hostsHostAudienceNewCampaign,
              variant: CatchButtonVariant.ghost,
              onPressed: busy ? null : onNew,
            ),
          ],
        ),
      ],
    );
  }
}

HostSavedAudience? _audienceIn(
  List<HostSavedAudience> audiences,
  HostSavedAudience? selected,
  String? initialAudienceId,
) {
  final requestedId = selected?.audienceId ?? initialAudienceId;
  if (requestedId != null) {
    for (final audience in audiences) {
      if (audience.audienceId == requestedId) return audience;
    }
  }
  return audiences.isEmpty ? null : audiences.first;
}

String _savedAudienceLabel(BuildContext context, HostSavedAudience audience) =>
    audience.lastPreviewMatchCount == null
    ? audience.name
    : context.l10n.hostSavedAudienceOption(
        name: audience.name,
        count: audience.lastPreviewMatchCount!,
      );

String _messageClassLabel(
  BuildContext context,
  _HostCampaignMessageClass value,
) => switch (value) {
  _HostCampaignMessageClass.eventFollowUp =>
    context.l10n.hostsHostAudienceMessageFollowUp,
  _HostCampaignMessageClass.organizerUpdate =>
    context.l10n.hostsHostAudienceMessageUpdate,
  _HostCampaignMessageClass.organizerPromotion =>
    context.l10n.hostsHostAudienceMessagePromotion,
};

Event? _eventIn(List<Event> events, Event? selected) {
  if (selected == null) return null;
  for (final event in events) {
    if (event.id == selected.id) return event;
  }
  return null;
}

List<_HostInviteDestination> _destinationsFor(Event event) {
  final destinations = <_HostInviteDestination>[];
  if (event.isExternalCompanion &&
      event.eventOrigin?.externalEventUrl?.isNotEmpty == true) {
    destinations.add(_HostInviteDestination.externalBooking);
  } else {
    destinations.add(_HostInviteDestination.catchEvent);
  }
  if (event.hasWebRuntime) {
    destinations.add(_HostInviteDestination.eventRuntime);
  }
  return destinations;
}

String _inviteDestinationLabel(
  BuildContext context,
  _HostInviteDestination value,
) => switch (value) {
  _HostInviteDestination.catchEvent =>
    context.l10n.hostsHostAudienceDestinationCatchPage,
  _HostInviteDestination.eventRuntime =>
    context.l10n.hostsHostAudienceDestinationRuntime,
  _HostInviteDestination.externalBooking =>
    context.l10n.hostsHostAudienceDestinationExternal,
};

String hostCampaignBlockerLabel(BuildContext context, String value) =>
    switch (value) {
      HostCampaignBlockers.providerSetupRequired =>
        context.l10n.hostsHostAudienceBlockerProvider,
      HostCampaignBlockers.senderInactive =>
        context.l10n.hostsHostAudienceBlockerSender,
      HostCampaignBlockers.templateMissing ||
      HostCampaignBlockers.templateUnapproved =>
        context.l10n.hostsHostAudienceBlockerTemplate,
      HostCampaignBlockers.noReachableRecipients =>
        context.l10n.hostsHostAudienceBlockerNoRecipients,
      HostCampaignBlockers.audienceCoveragePartial =>
        context.l10n.hostsHostAudienceBlockerCoverage,
      HostCampaignBlockers.audienceTooLarge =>
        context.l10n.hostsHostAudienceBlockerTooLarge,
      HostCampaignBlockers.eventMissing ||
      HostCampaignBlockers.eventUnavailable =>
        context.l10n.hostsHostAudienceBlockerEvent,
      HostCampaignBlockers.scheduleInPast =>
        context.l10n.hostsHostAudienceBlockerSchedule,
      _ => value,
    };
