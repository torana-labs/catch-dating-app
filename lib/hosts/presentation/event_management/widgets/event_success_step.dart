import 'package:catch_dating_app/contexts/formats/domain/event_success_defaults.dart';
import 'package:catch_dating_app/contexts/formats/domain/event_success_structure.dart';
import 'package:catch_dating_app/contexts/live/data/event_success_repository.dart';
import 'package:catch_dating_app/contexts/live/domain/event_success_layout.dart';
import 'package:catch_dating_app/event_success/event_success.dart'
    show
        EventSuccessController,
        EventSuccessDefaultsSection,
        EventSuccessRoomSetupSection,
        eventSuccessControllerProvider;
import 'package:catch_dating_app/kernel/activity_taxonomy.dart';
import 'package:catch_dating_app/l10n/l10n.dart';
import 'package:catch_dating_app/platform/l10n/catch_ui_copy.dart';
import 'package:catch_dating_app/platform/riverpod_ui/catch_async_value_adapter.dart';
import 'package:catch_dating_app/platform/schema_contracts/generated/field_constraints.g.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/experimental/mutation.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

class EventSuccessStep extends ConsumerStatefulWidget {
  const EventSuccessStep({
    super.key,
    required this.organizerId,
    required this.activityKind,
    required this.eventSuccessDefaults,
    required this.targetAttendeeCount,
    required this.onEventSuccessDefaultsChanged,
    this.eventFormat,
    this.embedded = false,
    this.requiredForRuntime = false,
  });

  final bool embedded;
  final bool requiredForRuntime;
  final String organizerId;
  final ActivityKind activityKind;
  final EventFormatSnapshot? eventFormat;
  final EventSuccessDefaults eventSuccessDefaults;
  final int targetAttendeeCount;
  final ValueChanged<EventSuccessDefaults> onEventSuccessDefaultsChanged;

  @override
  ConsumerState<EventSuccessStep> createState() => _EventSuccessStepState();
}

class _EventSuccessStepState extends ConsumerState<EventSuccessStep> {
  bool _customizing = false;

  @override
  Widget build(BuildContext context) {
    final organizerId = widget.organizerId;
    final activityKind = widget.activityKind;
    final eventFormat = widget.eventFormat;
    final eventSuccessDefaults = widget.eventSuccessDefaults;
    final targetAttendeeCount = widget.targetAttendeeCount;
    final onEventSuccessDefaultsChanged = widget.onEventSuccessDefaultsChanged;
    final layoutsAsync = _customizing && eventSuccessDefaults.enabled
        ? ref.watch(watchOrganizerEventSuccessLayoutsProvider(organizerId))
        : const AsyncData<List<EventSuccessLayout>>([]);
    final layoutMutation = ref.watch(
      EventSuccessController.upsertLayoutMutation,
    );
    final layoutsState = catchAsyncStateFromAsyncValue(layoutsAsync);
    Future<EventSuccessLayout> saveLayout(EventSuccessLayout layout) =>
        EventSuccessController.upsertLayoutMutation.run(
          ref,
          (tx) => tx
              .get(eventSuccessControllerProvider.notifier)
              .upsertLayout(organizerId: organizerId, layout: layout),
        );
    final usesWholeGroup =
        eventSuccessDefaults.structureConfig.unitKind ==
        EventSuccessUnitKind.wholeGroup;

    final content = CatchSectionList(
      emptyStateOmitted: true,
      children: [
        CatchSection.fieldRows(
          children: [
            if (widget.requiredForRuntime)
              CatchField.read(
                copy: catchFieldCopy(context.l10n),
                title: context.l10n.hostsEventSuccessStepTitleLiveEventGuide,
                body: context.l10n.hostsCreateEventGuideReady(
                  format:
                      (eventFormat ??
                              EventFormatSnapshot.fromActivityKind(
                                activityKind,
                              ))
                          .label,
                ),
                bodyMaxLines: 4,
              )
            else
              CatchField.toggle(
                copy: catchFieldCopy(context.l10n),
                title: context.l10n.hostsEventSuccessStepTitleLiveEventGuide,
                contract: CatchContractConstraints
                    .createOrganizerCallablePayloadHostDefaultsEventSuccessEnabled,
                body: eventSuccessDefaults.enabled
                    ? context.l10n.hostsCreateEventGuideReady(
                        format:
                            (eventFormat ??
                                    EventFormatSnapshot.fromActivityKind(
                                      activityKind,
                                    ))
                                .label,
                      )
                    : context.l10n.hostsCreateEventGuideOptional,
                bodyMaxLines: 4,
                value: eventSuccessDefaults.enabled,
                onChanged: (enabled) => onEventSuccessDefaultsChanged(
                  eventSuccessDefaults.copyWith(enabled: enabled),
                ),
              ),
            if (eventSuccessDefaults.enabled)
              Semantics(
                expanded: _customizing,
                child: CatchField.action(
                  copy: catchFieldCopy(context.l10n),
                  key: const ValueKey('host.create_event.customize_guide'),
                  title: _customizing
                      ? context.l10n.hostsCreateEventHideGuide
                      : context.l10n.hostsCreateEventCustomizeGuide,
                  onTap: () => setState(() => _customizing = !_customizing),
                ),
              ),
          ],
        ),
        if (_customizing && eventSuccessDefaults.enabled)
          EventSuccessDefaultsSection(
            showEnableToggle: false,
            defaults: eventSuccessDefaults,
            activityKind: activityKind,
            eventFormat: eventFormat,
            targetAttendeeCount: targetAttendeeCount,
            onChanged: (update) =>
                onEventSuccessDefaultsChanged(update(eventSuccessDefaults)),
            title: context.l10n.hostsEventSuccessStepTitleLiveEventGuide,
            subtitle: context.l10n.hostsEventSuccessStepSubtitleSaveASimplePlan,
          ),
        if (_customizing && eventSuccessDefaults.enabled)
          EventSuccessRoomSetupSection(
            layoutsState: layoutsState,
            selectedLayoutId: eventSuccessDefaults.layoutId,
            usesWholeGroup: usesWholeGroup,
            enabled: true,
            isSavingLayout: layoutMutation.isPending,
            saveError: layoutMutation.hasError
                ? (layoutMutation as MutationError).error
                : null,
            onSelected: (layoutId) => onEventSuccessDefaultsChanged(
              eventSuccessDefaults.copyWith(layoutId: layoutId),
            ),
            onSaveLayout: saveLayout,
          ),
      ],
    );
    if (widget.embedded) return content;
    return SingleChildScrollView(
      padding: CatchInsets.formStepBodyRelaxedWithBottomActions,
      child: content,
    );
  }
}
