import 'package:catch_dating_app/core/theme/activity_palette.dart';
import 'package:catch_dating_app/core/time_formatters.dart';
import 'package:catch_dating_app/events/domain/event.dart';
import 'package:catch_dating_app/events/domain/event_formatters.dart';
import 'package:catch_dating_app/hosts/presentation/inbox/host_inbox_view_model.dart';
import 'package:catch_dating_app/l10n/l10n.dart';
import 'package:catch_dating_app/programs/domain/program_models.dart';
import 'package:catch_tokens/catch_tokens.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/material.dart';

class HostInboxScopeMenu extends StatefulWidget {
  const HostInboxScopeMenu({
    super.key,
    required this.workspace,
    required this.now,
    required this.onChanged,
  });

  final HostInboxViewModel workspace;
  final DateTime now;
  final ValueChanged<HostInboxScope> onChanged;

  @override
  State<HostInboxScopeMenu> createState() => _HostInboxScopeMenuState();
}

class _HostInboxScopeMenuState extends State<HostInboxScopeMenu> {
  final _menuController = MenuController();

  @override
  Widget build(BuildContext context) {
    final t = CatchTokens.of(context);
    final eventsById = {
      for (final event in widget.workspace.events) event.id: event,
    };
    final programsById = {
      for (final program in widget.workspace.programs)
        program.programId: program,
    };
    final selectedScope = widget.workspace.selectedScope;
    final selectedEvent = selectedScope.eventId == null
        ? null
        : eventsById[selectedScope.eventId];
    final selectedLabel = _scopeTriggerLabel(
      selectedScope,
      selectedEvent,
      programsById[selectedScope.programId],
    );
    final labelColor = selectedEvent == null
        ? t.ink2
        : ActivityPalette.resolve(context, selectedEvent.activityKind).deep;

    return SliverToBoxAdapter(
      child: Padding(
        padding: CatchInsets.pageHorizontal,
        child: CatchMenu<HostInboxScope>.anchored(
          controller: _menuController,
          alignmentOffset: const Offset(0, CatchSpacing.s1),
          items: [
            for (final scope in widget.workspace.scopeOptions)
              CatchMenuItem<HostInboxScope>(
                value: scope,
                label: _scopeMenuLabel(scope, eventsById, programsById),
                selected: scope == selectedScope,
                variant: CatchMenuItemVariant.choice,
              ),
          ],
          onSelected: (scope, _) {
            widget.onChanged(scope);
            _menuController.close();
          },
          builder: (context, controller, child) => Semantics(
            button: true,
            label: context.l10n.hostsHostInboxScreenLabelInboxScope,
            value: selectedLabel,
            hint: context.l10n.hostsHostInboxScreenVisiblecopySelectAnEventOr,
            child: CatchSurface(
              duration: Duration.zero,
              tone: CatchSurfaceTone.transparent,
              radius: CatchRadius.none,
              onTap: () =>
                  controller.isOpen ? controller.close() : controller.open(),
              child: SizedBox(
                height: CatchLayout.hostInboxScopeSelectorHeight,
                child: Align(
                  alignment: Alignment.centerLeft,
                  child: Row(
                    children: [
                      Expanded(
                        child: Text(
                          selectedLabel.toUpperCase(),
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                          style: CatchTextStyles.monoLabel(
                            context,
                            color: labelColor,
                          ).copyWith(fontWeight: FontWeight.w700),
                        ),
                      ),
                      gapW8,
                      Icon(
                        CatchIcons.expandMoreRounded,
                        size: CatchIcon.sm,
                        color: t.ink3,
                      ),
                    ],
                  ),
                ),
              ),
            ),
          ),
        ),
      ),
    );
  }

  String _scopeTriggerLabel(
    HostInboxScope scope,
    Event? event,
    OrganizerProgramSummary? program,
  ) {
    if (scope.isGeneral) {
      return context.l10n.hostsHostInboxScreenVisiblecopyGeneralInquiries;
    }
    if (scope.isProgram) {
      return program?.title ??
          context.l10n.hostsHostInboxScreenVisiblecopyProgramGuests;
    }
    if (event == null) {
      return context.l10n.hostsHostInboxScreenVisiblecopyEventInquiry;
    }
    final eventName = context.l10n
        .hostsHostInboxScreenVisiblecopyLongweekdayEventtitlelabel(
          longWeekday: AppTimeFormatters.longWeekday(event.startTime),
          eventTitleLabel: event.eventFormat.eventTitleLabel,
        );
    final timing = DateUtils.isSameDay(event.startTime, widget.now)
        ? context.l10n.hostsHostInboxScreenVisiblecopyTonightTime(
            time: AppTimeFormatters.time(event.startTime),
          )
        : context.l10n.hostsHostInboxScreenVisiblecopyShortdatelabelTime(
            shortDateLabel: event.shortDateLabel,
            time: AppTimeFormatters.time(event.startTime),
          );
    return context.l10n.hostsHostInboxScreenVisiblecopyEventnameTiming(
      eventName: eventName,
      timing: timing,
    );
  }

  String _scopeMenuLabel(
    HostInboxScope scope,
    Map<String, Event> eventsById,
    Map<String, OrganizerProgramSummary> programsById,
  ) {
    if (scope.isGeneral) {
      return context.l10n.hostsHostInboxScreenVisiblecopyGeneralInquiries;
    }
    if (scope.isProgram) {
      return programsById[scope.programId]?.title ??
          context.l10n.hostsHostInboxScreenVisiblecopyProgramGuests;
    }
    final event = eventsById[scope.eventId];
    if (event == null) {
      return context.l10n.hostsHostInboxScreenVisiblecopyEventInquiry;
    }
    return context.l10n
        .hostsHostInboxScreenVisiblecopyTitleShortdatelabelCompacttimerangelabel(
          title: event.title,
          shortDateLabel: event.shortDateLabel,
          compactTimeRangeLabel: event.compactTimeRangeLabel,
        );
  }
}
