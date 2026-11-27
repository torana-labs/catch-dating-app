import 'package:catch_dating_app/contexts/audience/data/crm/host_saved_audience_repository.dart';
import 'package:catch_dating_app/contexts/audience/data/crm/host_whatsapp_repository.dart';
import 'package:catch_dating_app/contexts/audience/domain/crm/host_campaign.dart';
import 'package:catch_dating_app/contexts/audience/domain/crm/host_campaign_policy.dart';
import 'package:catch_dating_app/contexts/audience/domain/crm/host_messaging_setup.dart';
import 'package:catch_dating_app/contexts/events/data/event_repository.dart';
import 'package:catch_dating_app/contexts/events/domain/event.dart';
import 'package:catch_dating_app/contexts/organizers/domain/organizer.dart';
import 'package:catch_dating_app/hosts/people/host_audience_controller.dart';
import 'package:catch_dating_app/hosts/people/sends/sends_detail_body.dart';
import 'package:catch_l10n/l10n.dart';
import 'package:catch_platform/catch_async_state.dart';
import 'package:catch_platform/errors/app_error_message.dart';
import 'package:catch_platform/l10n/catch_ui_copy.dart';
import 'package:catch_platform/riverpod_ui/catch_async_value_adapter.dart';
import 'package:catch_platform/riverpod_ui/catch_notice_feedback.dart';
import 'package:catch_platform/schema_contracts/generated/field_constraints.g.dart';
import 'package:catch_platform/time/time_formatters.dart';
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

/// A saved-audience WhatsApp Business campaign: name, message type, send
/// now or at a time, the saved audience, the approved template, the linked
/// event and invite destination when the template carries an invite, the
/// template's values, then Preview campaign and the report with Approve,
/// Send now, Refresh, Cancel and New campaign.
///
/// It reads [hostMessagingSetupProvider], the saved audiences and the
/// organizer's events, and runs the existing campaign commands on
/// [hostAudienceControllerProvider].
class HostCampaignScreen extends ConsumerStatefulWidget {
  const HostCampaignScreen({
    super.key,
    required this.organizer,
    this.initialSavedAudienceId,
    this.onBusyChanged,
  });

  final Organizer organizer;
  final String? initialSavedAudienceId;
  final ValueChanged<bool>? onBusyChanged;

  @override
  ConsumerState<HostCampaignScreen> createState() => _HostCampaignScreenState();
}

class _HostCampaignScreenState extends ConsumerState<HostCampaignScreen> {
  final _campaignNameController = TextEditingController();
  final Map<String, TextEditingController> _variableControllers = {};
  HostSavedAudienceSummary? _selectedAudience;
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
  void didUpdateWidget(covariant HostCampaignScreen oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (oldWidget.organizer.id != widget.organizer.id ||
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
    final l10n = context.l10n;
    final messaging = catchAsyncStateFromAsyncValue(
      ref.watch(hostMessagingSetupProvider(widget.organizer.id)),
    );
    final savedAudiences = catchAsyncStateFromAsyncValue(
      ref.watch(hostAllSavedAudienceSummariesProvider(widget.organizer.id)),
    );
    final setup = messaging.value;
    if (setup == null) {
      return messaging.hasError
          ? CatchErrorState(
              title: l10n.hostsHostAudienceCampaign,
              message: l10n.hostPeopleMessagesErrorBody,
              retryLabel: l10n.hostPeopleRetry,
              onRetry: () => ref.invalidate(
                hostMessagingSetupProvider(widget.organizer.id),
              ),
              mode: CatchErrorStateMode.inline,
            )
          : const CatchLoadingIndicator();
    }
    final connection = setup.connection;
    final approved = setup.approvedTemplates;
    final events =
        catchAsyncStateFromAsyncValue(
          ref.watch(watchEventsForOrganizerProvider(widget.organizer.id)),
        ).value?.where((event) => !event.isCancelled).toList(growable: false) ??
        const <Event>[];
    if (connection == null || !connection.isActive) {
      return CatchText(
        l10n.hostsHostAudienceCampaignNeedsActiveSender,
        key: const ValueKey<String>('host-campaign-needs-sender'),
        variant: CatchTextVariant.bodySmall,
        tone: CatchTextTone.secondary,
      );
    }
    if (approved.isEmpty) {
      return CatchText(
        l10n.hostsHostAudienceCampaignNeedsTemplate,
        key: const ValueKey<String>('host-campaign-needs-template'),
        variant: CatchTextVariant.bodySmall,
        tone: CatchTextTone.secondary,
      );
    }
    if (savedAudiences.status == CatchAsyncStatus.error) {
      return CatchErrorState(
        title: l10n.hostSavedAudienceFieldLabel,
        message: l10n.hostPeopleMessagesErrorBody,
        retryLabel: l10n.hostPeopleRetry,
        onRetry: () => ref.invalidate(
          hostAllSavedAudienceSummariesProvider(widget.organizer.id),
        ),
        mode: CatchErrorStateMode.inline,
      );
    }
    if (savedAudiences.status == CatchAsyncStatus.loading) {
      return const CatchLoadingIndicator();
    }
    final audiences = savedAudiences.value?.audiences ?? const [];
    if (audiences.isEmpty) {
      return CatchNotice.inline(
        key: const ValueKey<String>('host-campaign-no-audience'),
        title: l10n.hostSavedAudiencesEmptyTitle,
        body: l10n.hostSavedAudiencesEmptyBody,
      );
    }
    final template = _selectedTemplate ?? approved.first;
    final selectedAudience = _audienceIn(
      audiences,
      _selectedAudience,
      widget.initialSavedAudienceId,
    );
    final locked = _campaign != null;
    final lockedStates = <WidgetState>{if (locked) WidgetState.disabled};
    final event = _eventIn(events, _selectedEvent);
    return CatchStack(
      children: [
        CatchFieldLanes.single(
          child: CatchField.input(
            key: const ValueKey<String>('host-campaign-name'),
            copy: catchFieldCopy(l10n),
            title: l10n.hostsHostAudienceCampaignName,
            contract: CatchContractConstraints
                .upsertOrganizerCampaignCallablePayloadName,
            controller: _campaignNameController,
            placeholder: l10n.hostsHostAudienceCampaignNameExample,
            states: lockedStates,
          ),
        ),
        CatchFieldLanes.single(
          child: CatchField<_HostCampaignMessageClass>.select(
            copy: catchFieldCopy(l10n),
            title: l10n.hostsHostAudienceMessageType,
            contract: CatchContractConstraints
                .upsertOrganizerCampaignCallablePayloadMessageClass,
            contractValueBuilder: (value) => value.wireValue,
            values: _HostCampaignMessageClass.values,
            itemLabelBuilder: (value) => _messageClassLabel(context, value),
            value: _messageClass,
            states: lockedStates,
            onChanged: (value) {
              if (value != null) setState(() => _messageClass = value);
            },
          ),
        ),
        CatchIndexRow(
          key: const ValueKey<String>('host-campaign-schedule'),
          title: l10n.hostSendsDeliveryTime,
          subtitle: _scheduledAt == null
              ? l10n.hostSendsSendNow
              : AppTimeFormatters.dateTime(_scheduledAt!),
          icon: CatchIcons.event,
          action: CatchIndexRowAction(
            label: l10n.hostSendsSchedule,
            onPressed: locked || _busy ? null : _pickSchedule,
          ),
          onTap: null,
        ),
        if (_scheduledAt != null)
          CatchButton(
            key: const ValueKey<String>('host-campaign-clear-schedule'),
            label: l10n.hostSendsClearSchedule,
            variant: CatchButtonVariant.quiet,
            size: CatchButtonSize.sm,
            onPressed: locked || _busy
                ? null
                : () => setState(() {
                    _scheduledAt = null;
                    _scheduleError = null;
                  }),
          ),
        if (_scheduleError case final error?)
          CatchText(
            error,
            variant: CatchTextVariant.bodySmall,
            tone: CatchTextTone.warning,
          ),
        CatchText(
          l10n.hostsHostAudienceRecipients,
          variant: CatchTextVariant.labelAction,
        ),
        CatchFieldLanes.single(
          child: CatchField<HostSavedAudienceSummary>.select(
            key: const ValueKey<String>('host-campaign-audience'),
            copy: catchFieldCopy(l10n),
            title: l10n.hostSavedAudienceFieldLabel,
            contract: CatchContractConstraints
                .upsertOrganizerCampaignCallablePayloadSavedAudienceId,
            contractValueBuilder: (audience) => audience.audienceId,
            values: audiences,
            itemLabelBuilder: (audience) =>
                _savedAudienceLabel(context, audience),
            value: selectedAudience,
            states: lockedStates,
            onChanged: (value) => setState(() => _selectedAudience = value),
          ),
        ),
        CatchFieldLanes.single(
          child: CatchField<HostWhatsappTemplate>.select(
            copy: catchFieldCopy(l10n),
            title: l10n.hostsHostAudienceTemplate,
            contract: CatchContractConstraints
                .upsertOrganizerCampaignCallablePayloadTemplateId,
            contractValueBuilder: (value) => value.templateId,
            values: approved,
            itemLabelBuilder: (value) => '${value.name} · ${value.language}',
            value: template,
            states: lockedStates,
            onChanged: (value) {
              if (value == null) return;
              setState(() {
                _selectedTemplate = value;
                _syncVariableControllers(value);
              });
            },
          ),
        ),
        if (hostCampaignTemplateUsesInvite(template)) ...[
          CatchFieldLanes.single(
            child: CatchField<Event>.select(
              copy: catchFieldCopy(l10n),
              title: l10n.hostsHostAudienceLinkedEvent,
              contract: CatchContractConstraints
                  .upsertOrganizerCampaignCallablePayloadEventId,
              contractValueBuilder: (event) => event.id,
              values: events,
              itemLabelBuilder: (event) =>
                  '${event.title} · ${AppTimeFormatters.shortDate(event.startTime)}',
              value: event,
              hintText: l10n.hostsHostAudienceChooseEvent,
              helperText: l10n.hostsHostAudienceLinkedEventHelp,
              states: lockedStates,
              onChanged: (value) => setState(() {
                _selectedEvent = value;
                _inviteDestination = value == null
                    ? null
                    : _destinationsFor(value).first;
              }),
            ),
          ),
          if (event != null)
            CatchFieldLanes.single(
              child: CatchField<_HostInviteDestination>.select(
                copy: catchFieldCopy(l10n),
                title: l10n.hostsHostAudienceInviteDestination,
                contract: CatchContractConstraints
                    .upsertOrganizerCampaignCallablePayloadInviteDestinationKind,
                contractValueBuilder: (value) => value.wireValue,
                values: _destinationsFor(event),
                itemLabelBuilder: (value) =>
                    _inviteDestinationLabel(context, value),
                value: _inviteDestination ?? _destinationsFor(event).first,
                helperText: event.isExternalCompanion
                    ? l10n.hostsHostAudienceExternalAttributionExplanation
                    : l10n.hostsHostAudienceCatchAttributionExplanation,
                states: lockedStates,
                onChanged: (value) =>
                    setState(() => _inviteDestination = value),
              ),
            ),
        ],
        for (final variable in template.variableNames)
          if (!hostCampaignIsInviteVariable(variable))
            CatchFieldLanes.single(
              child: CatchField.input(
                copy: catchFieldCopy(l10n),
                title: variable,
                contractExemption:
                    'Template-variable keys are provider-defined; the generated contract constrains the map, not each dynamic value field.',
                controller: _controllerForVariable(variable),
                maxLength: 240,
                states: lockedStates,
              ),
            ),
        if (_campaign case final campaign?)
          HostSendsCampaignSection(
            campaign: campaign,
            busy: _busy,
            onApprove: campaign.canApprove ? _approveCampaign : null,
            onSend: campaign.canDispatch ? _dispatchCampaign : null,
            onCancel:
                campaign.status == 'cancelled' ||
                    campaign.status == 'completed' ||
                    campaign.status == 'partiallyFailed'
                ? null
                : _cancelCampaign,
            onRefresh: _refreshCampaign,
            onNew: _newCampaign,
          )
        else
          CatchButton(
            key: const ValueKey<String>('host-campaign-preview'),
            label: l10n.hostsHostAudiencePreviewCampaign,
            status: _busy ? CatchButtonStatus.loading : CatchButtonStatus.idle,
            onPressed: _busy
                ? null
                : () => _saveAndPreview(connection, template, selectedAudience),
          ),
      ],
    );
  }

  Future<void> _saveAndPreview(
    HostWhatsappConnection connection,
    HostWhatsappTemplate template,
    HostSavedAudienceSummary? selectedAudience,
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
    // provider-graph: ownership-widget-async:_HostCampaignScreenState._saveAndPreview:await:hostAudienceControllerProvider.saveAndPreviewCampaign watch CAT156 -- Existing bounded review signal at _HostCampaignScreenState._saveAndPreview (await:hostAudienceControllerProvider.saveAndPreviewCampaign). The method combines local completion publication with an awaited provider seam or declared Future callback. Its mutated fields/caller contract need focused classification: navigation, form/media/animation feedback may be mechanical, while loaded data, authorization, server pending/error or retry identity need a generated owner. This watch disposition does not certify compliance or declare a confirmed violation; inspect the exact responsibility before its CAT156 migration.
    final preview = await ref
        .read(hostAudienceControllerProvider)
        .saveAndPreviewCampaign(
          organizerId: widget.organizer.id,
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
    // provider-graph: ownership-widget-async:_HostCampaignScreenState._approveCampaign:await:hostAudienceControllerProvider.approveCampaign watch CAT156 -- Existing bounded review signal at _HostCampaignScreenState._approveCampaign (await:hostAudienceControllerProvider.approveCampaign). The method combines local completion publication with an awaited provider seam or declared Future callback. Its mutated fields/caller contract need focused classification: navigation, form/media/animation feedback may be mechanical, while loaded data, authorization, server pending/error or retry identity need a generated owner. This watch disposition does not certify compliance or declare a confirmed violation; inspect the exact responsibility before its CAT156 migration.
    final campaign = await ref
        .read(hostAudienceControllerProvider)
        .approveCampaign(
          organizerId: widget.organizer.id,
          campaign: _campaign!,
        );
    if (mounted) setState(() => _campaign = campaign);
  });

  Future<void> _dispatchCampaign() => _run(() async {
    // provider-graph: ownership-widget-async:_HostCampaignScreenState._dispatchCampaign:await:hostAudienceControllerProvider.dispatchCampaign watch CAT156 -- Existing bounded review signal at _HostCampaignScreenState._dispatchCampaign (await:hostAudienceControllerProvider.dispatchCampaign). The method combines local completion publication with an awaited provider seam or declared Future callback. Its mutated fields/caller contract need focused classification: navigation, form/media/animation feedback may be mechanical, while loaded data, authorization, server pending/error or retry identity need a generated owner. This watch disposition does not certify compliance or declare a confirmed violation; inspect the exact responsibility before its CAT156 migration.
    final campaign = await ref
        .read(hostAudienceControllerProvider)
        .dispatchCampaign(
          organizerId: widget.organizer.id,
          campaign: _campaign!,
        );
    if (mounted) setState(() => _campaign = campaign);
  });

  Future<void> _cancelCampaign() => _run(() async {
    // provider-graph: ownership-widget-async:_HostCampaignScreenState._cancelCampaign:await:hostAudienceControllerProvider.cancelCampaign watch CAT156 -- Existing bounded review signal at _HostCampaignScreenState._cancelCampaign (await:hostAudienceControllerProvider.cancelCampaign). The method combines local completion publication with an awaited provider seam or declared Future callback. Its mutated fields/caller contract need focused classification: navigation, form/media/animation feedback may be mechanical, while loaded data, authorization, server pending/error or retry identity need a generated owner. This watch disposition does not certify compliance or declare a confirmed violation; inspect the exact responsibility before its CAT156 migration.
    final campaign = await ref
        .read(hostAudienceControllerProvider)
        .cancelCampaign(organizerId: widget.organizer.id, campaign: _campaign!);
    if (mounted) setState(() => _campaign = campaign);
  });

  Future<void> _refreshCampaign() => _run(() async {
    // provider-graph: ownership-widget-async:_HostCampaignScreenState._refreshCampaign:await:hostAudienceControllerProvider.getCampaignReport watch CAT156 -- Existing bounded review signal at _HostCampaignScreenState._refreshCampaign (await:hostAudienceControllerProvider.getCampaignReport). The method combines local completion publication with an awaited provider seam or declared Future callback. Its mutated fields/caller contract need focused classification: navigation, form/media/animation feedback may be mechanical, while loaded data, authorization, server pending/error or retry identity need a generated owner. This watch disposition does not certify compliance or declare a confirmed violation; inspect the exact responsibility before its CAT156 migration.
    final campaign = await ref
        .read(hostAudienceControllerProvider)
        .getCampaignReport(
          organizerId: widget.organizer.id,
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
      // provider-graph: ownership-widget-async-callback:_HostCampaignScreenState._run:await:action watch CAT156 -- Existing bounded review signal at _HostCampaignScreenState._run (await:action). The method combines local completion publication with an awaited provider seam or declared Future callback. Its mutated fields/caller contract need focused classification: navigation, form/media/animation feedback may be mechanical, while loaded data, authorization, server pending/error or retry identity need a generated owner. This watch disposition does not certify compliance or declare a confirmed violation; inspect the exact responsibility before its CAT156 migration.
      await action();
    } on Object catch (error) {
      if (mounted) {
        showCatchNoticeError(
          context,
          error,
          errorContext: AppErrorContext.organizer,
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

HostSavedAudienceSummary? _audienceIn(
  List<HostSavedAudienceSummary> audiences,
  HostSavedAudienceSummary? selected,
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

String _savedAudienceLabel(
  BuildContext context,
  HostSavedAudienceSummary audience,
) => audience.lastPreviewMatchCount == null
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
