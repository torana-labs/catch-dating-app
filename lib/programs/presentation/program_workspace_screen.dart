import 'package:catch_dating_app/contexts/programmes/data/program_setup_repository.dart';
import 'package:catch_dating_app/contexts/programmes/domain/program_models.dart';
import 'package:catch_dating_app/core/schema_contracts/generated/field_constraints.g.dart';
import 'package:catch_dating_app/l10n/l10n.dart';
import 'package:catch_dating_app/platform/errors/app_error_message.dart';
import 'package:catch_dating_app/platform/l10n/catch_ui_copy.dart';
import 'package:catch_dating_app/platform/riverpod_ui/catch_async_boundary.dart';
import 'package:catch_dating_app/platform/riverpod_ui/catch_localized_error_state.dart';
import 'package:catch_dating_app/platform/time/time_formatters.dart';
import 'package:catch_dating_app/programs/presentation/program_workspace_controller.dart';
import 'package:catch_dating_app/routing/route_contract.dart';
import 'package:catch_tokens/catch_tokens.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

part 'program_workspace_surface.dart';

/// Organizer program workspace — program header, schedule day rail and
/// function management. Guests/team/import live on pushed sibling routes so
/// the schedule stays the focus here.
class ProgramWorkspaceScreen extends ConsumerWidget {
  const ProgramWorkspaceScreen({super.key, required this.programId});

  final String programId;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final detailAsync = ref.watch(organizerProgramDetailProvider(programId));
    return CatchAsyncBoundary<OrganizerProgramDetail>(
      retainDataOn: const {},
      value: detailAsync,
      onRetry: () => ref.invalidate(organizerProgramDetailProvider(programId)),
      loadingBuilder: (_) => CatchRouteScaffold(
        topBarBuilder: (context, scrolledUnder) => CatchTopBar.route(
          title: context.l10n.programsWorkspaceTitle,
          emphasis: scrolledUnder
              ? CatchTopBarEmphasis.divided
              : CatchTopBarEmphasis.plain,
          navigation: const CatchTopBarNavigation(
            mode: CatchTopBarNavigationMode.back,
          ),
        ),
        body: const CatchRouteBody.standardViewport(
          child: CatchStateViewport.loading(accountForBottomOverlay: false),
        ),
      ),
      errorBuilder: (_, error, _, onBoundaryRetry) => CatchRouteScaffold(
        topBarBuilder: (context, scrolledUnder) => CatchTopBar.route(
          title: context.l10n.programsWorkspaceTitle,
          emphasis: scrolledUnder
              ? CatchTopBarEmphasis.divided
              : CatchTopBarEmphasis.plain,
          navigation: const CatchTopBarNavigation(
            mode: CatchTopBarNavigationMode.back,
          ),
        ),
        body: CatchRouteBody.standardViewport(
          child: CatchLocalizedErrorState(
            error,
            context: AppErrorContext.event,
            onRetry: onBoundaryRetry,
          ),
        ),
      ),
      builder: (context, detail) =>
          ProgramWorkspacePageBody(programDetail: detail),
    );
  }
}

class ProgramWorkspacePageBody extends ConsumerStatefulWidget {
  const ProgramWorkspacePageBody({super.key, required this.programDetail});

  final OrganizerProgramDetail programDetail;

  @override
  ConsumerState<ProgramWorkspacePageBody> createState() =>
      _ProgramWorkspacePageBodyState();
}

class _ProgramWorkspacePageBodyState
    extends ConsumerState<ProgramWorkspacePageBody> {
  int _selectedDayIndex = 0;

  List<DateTime> get _days {
    final days = <DateTime>{};
    for (final fn in widget.programDetail.functions) {
      days.add(DateUtils.dateOnly(fn.startsAt));
    }
    final sorted = days.toList()..sort();
    return sorted;
  }

  List<OrganizerFunctionDetail> _functionsOn(DateTime day) =>
      widget.programDetail.functions
          .where((fn) => DateUtils.isSameDay(fn.startsAt, day))
          .toList(growable: false)
        ..sort((a, b) => a.startsAt.compareTo(b.startsAt));

  @override
  Widget build(BuildContext context) {
    final detail = widget.programDetail;
    final program = detail.program;
    final days = _days;
    if (_selectedDayIndex >= days.length && days.isNotEmpty) {
      _selectedDayIndex = 0;
    }
    final selectedDay = days.isEmpty ? null : days[_selectedDayIndex];
    final dayFunctions = selectedDay == null
        ? const <OrganizerFunctionDetail>[]
        : _functionsOn(selectedDay);

    return CatchRouteScaffold(
      topBarBuilder: (context, scrolledUnder) => CatchTopBar.route(
        title: context.l10n.programsWorkspaceTitle,
        emphasis: scrolledUnder
            ? CatchTopBarEmphasis.divided
            : CatchTopBarEmphasis.plain,
        navigation: const CatchTopBarNavigation(
          mode: CatchTopBarNavigationMode.back,
        ),
      ),
      body: CatchRouteBody.standardSections(
        sections: [
          CatchSectionListItem(
            child: CatchSection.status(
              title: program.title,
              message:
                  '${AppTimeFormatters.shortDate(program.startsAt)} – '
                  '${AppTimeFormatters.shortDate(program.endsAt)} · '
                  '${program.timezone}',
              meta: Wrap(
                spacing: CatchSpacing.s2,
                runSpacing: CatchSpacing.s2,
                children: [
                  CatchBadge(label: program.kind.name),
                  CatchBadge(
                    label: program.status.name,
                    tone: program.status == ProgramStatus.active
                        ? CatchBadgeTone.success
                        : CatchBadgeTone.neutral,
                  ),
                  CatchBadge(
                    label: context.l10n.programsWorkspaceStatsGuests(
                      count: detail.counts['guests'] ?? 0,
                    ),
                  ),
                  CatchBadge(
                    label: context.l10n.programsWorkspaceStatsHouseholds(
                      count: detail.counts['households'] ?? 0,
                    ),
                  ),
                  CatchBadge(
                    label: context.l10n.programsWorkspaceStatsLegs(
                      count: detail.counts['inboundLegs'] ?? 0,
                    ),
                  ),
                  CatchBadge(
                    label: context.l10n.programsWorkspaceStatsStaff(
                      count: detail.counts['activeStaff'] ?? 0,
                    ),
                  ),
                ],
              ),
            ),
          ),
          CatchSectionListItem(
            child: CatchSection.collection(
              title: context.l10n.programsWorkspaceScheduleTitle,
              message: context.l10n.programsWorkspaceScheduleSubtitle,
              emptyMessage: days.isEmpty
                  ? context.l10n.programsWorkspaceNoFunctions
                  : context.l10n.programsWorkspaceDayEmpty,
              leading: days.length <= 1
                  ? null
                  : CatchChoiceInput<int>.segmented(
                      scrollable: true,
                      options: [
                        for (var i = 0; i < days.length; i++)
                          CatchOption(
                            value: i,
                            label: context.l10n.programsWorkspaceDayLabel(
                              index: i + 1,
                              date: AppTimeFormatters.weekdayDayMonth(days[i]),
                            ),
                          ),
                      ],
                      selected: _selectedDayIndex,
                      contractExemption:
                          'Local day-rail filter over the schedule; no payload field is written from the selection.',
                      onChanged: (index) =>
                          setState(() => _selectedDayIndex = index),
                    ),
              actionLabel: context.l10n.programsWorkspaceFunctionNew,
              onAction: () => _editFunction(context, null),
              children: [
                for (final fn in dayFunctions)
                  ProgramWorkspaceFunctionTile(
                    function: fn,
                    onEdit: () => _editFunction(context, fn),
                    onInvitations: () => _editInvitations(context, fn),
                  ),
              ],
            ),
          ),
          CatchSectionListItem(
            child: CatchSection.collection(
              title: context.l10n.programsWorkspacePickupTitle,
              emptyMessage: context.l10n.programsWorkspacePickupEmpty,
              actionLabel: context.l10n.programsWorkspacePickupNew,
              onAction: () => _editPickupPoint(context, null),
              children: [
                for (final point in detail.pickupPoints)
                  ProgramWorkspaceStationTile(
                    station: point,
                    onEdit: () => _editPickupPoint(context, point),
                  ),
              ],
            ),
          ),
          CatchSectionListItem(
            child: CatchSection.collection(
              title: context.l10n.programsWorkspaceHotelsTitle,
              emptyMessage: context.l10n.programsWorkspaceHotelEmpty,
              actionLabel: context.l10n.programsWorkspaceHotelNew,
              onAction: () => _editHotel(context, null),
              children: [
                for (final hotel in detail.hotels)
                  ProgramWorkspaceHotelTile(
                    hotel: hotel,
                    onEdit: () => _editHotel(context, hotel),
                  ),
              ],
            ),
          ),
          CatchSectionListItem(
            child: CatchSection.fieldRows(
              title: context.l10n.programsWorkspaceManageTitle,
              children: [
                CatchField.nav(
                  copy: catchFieldCopy(context.l10n),
                  title: context.l10n.programsLodgingTitle,
                  icon: CatchIcons.hotel,
                  emphasis: CatchFieldEmphasis.title,
                  onTap: () => context.pushNamed(
                    Routes.hostProgramLodgingScreen.name,
                    pathParameters: {'programId': program.programId},
                  ),
                ),
                CatchField.nav(
                  copy: catchFieldCopy(context.l10n),
                  title: context.l10n.programsWorkspaceGuestsTitle,
                  icon: CatchIcons.people,
                  emphasis: CatchFieldEmphasis.title,
                  onTap: () => context.pushNamed(
                    Routes.hostProgramGuestsScreen.name,
                    pathParameters: {'programId': program.programId},
                  ),
                ),
                CatchField.nav(
                  copy: catchFieldCopy(context.l10n),
                  title: context.l10n.programsWorkspaceTeamTitle,
                  icon: CatchIcons.work,
                  emphasis: CatchFieldEmphasis.title,
                  onTap: () => context.pushNamed(
                    Routes.hostProgramTeamScreen.name,
                    pathParameters: {'programId': program.programId},
                  ),
                ),
                CatchField.nav(
                  copy: catchFieldCopy(context.l10n),
                  title: context.l10n.programsWorkspaceImportTitle,
                  icon: CatchIcons.upload,
                  emphasis: CatchFieldEmphasis.title,
                  onTap: () => context.pushNamed(
                    Routes.hostProgramImportScreen.name,
                    pathParameters: {'programId': program.programId},
                  ),
                ),
              ],
            ),
          ),
          CatchSectionListItem(
            child: CatchSection.fieldRows(
              title: context.l10n.programsWorkspaceCommunicationsTitle,
              children: [
                CatchField.nav(
                  copy: catchFieldCopy(context.l10n),
                  title: context.l10n.programsWorkspaceMomentsTitle,
                  icon: CatchIcons.magic,
                  emphasis: CatchFieldEmphasis.title,
                  onTap: () => context.pushNamed(
                    Routes.hostProgramMomentsScreen.name,
                    pathParameters: {'programId': program.programId},
                    queryParameters: {'title': program.title},
                  ),
                ),
                CatchField.nav(
                  copy: catchFieldCopy(context.l10n),
                  title: context.l10n.programsWorkspaceInboxTitle,
                  icon: CatchIcons.conversations,
                  emphasis: CatchFieldEmphasis.title,
                  onTap: () => context.pushNamed(
                    Routes.hostInboxScreen.name,
                    queryParameters: {
                      'programId': program.programId,
                      'organizerId': program.organizerId,
                    },
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Future<void> _editFunction(
    BuildContext context,
    OrganizerFunctionDetail? existing,
  ) async {
    final draft = await showDialog<ProgramFunctionDraft>(
      context: context,
      builder: (_) => ProgramFunctionEditDialog(existing: existing),
    );
    if (draft == null || !mounted) return;
    await ref
        .read(programWorkspaceControllerProvider.notifier)
        .upsertFunction(
          programId: widget.programDetail.program.programId,
          functionId: existing?.functionId,
          expectedRevision: existing?.revision,
          name: draft.name,
          startsAt: draft.startsAt,
          endsAt: draft.endsAt,
          venueName: draft.venueName,
          venueNotes: draft.venueNotes,
          status: draft.status.name,
        );
    if (!mounted) return;
    ref.invalidate(
      organizerProgramDetailProvider(widget.programDetail.program.programId),
    );
  }

  Future<void> _editPickupPoint(
    BuildContext context,
    ProgramStation? existing,
  ) async {
    final draft = await showDialog<ProgramPickupPointDraft>(
      context: context,
      builder: (_) => ProgramPickupPointEditDialog(existing: existing),
    );
    if (draft == null || !mounted) return;
    await ref
        .read(programWorkspaceControllerProvider.notifier)
        .upsertPickupPoint(
          programId: widget.programDetail.program.programId,
          pickupPointId: existing?.pickupPointId,
          expectedRevision: existing?.revision,
          kind: draft.kind,
          label: draft.label,
          iataCode: draft.iataCode,
          terminal: draft.terminal,
          meetingZone: draft.meetingZone,
          instructions: draft.instructions,
          active: draft.active,
        );
    if (!mounted) return;
    ref.invalidate(
      organizerProgramDetailProvider(widget.programDetail.program.programId),
    );
  }

  Future<void> _editHotel(BuildContext context, ProgramHotel? existing) async {
    final draft = await showDialog<ProgramHotelDraft>(
      context: context,
      builder: (_) => ProgramHotelEditDialog(existing: existing),
    );
    if (draft == null || !mounted) return;
    await ref
        .read(programWorkspaceControllerProvider.notifier)
        .upsertHotel(
          programId: widget.programDetail.program.programId,
          hotelId: existing?.hotelId,
          expectedRevision: existing?.revision,
          name: draft.name,
          address: draft.address,
          receptionContact: draft.receptionContact,
          notes: draft.notes,
          active: draft.active,
        );
    if (!mounted) return;
    ref.invalidate(
      organizerProgramDetailProvider(widget.programDetail.program.programId),
    );
  }

  Future<void> _editInvitations(
    BuildContext context,
    OrganizerFunctionDetail fn,
  ) async {
    var mode = fn.invitationMode;
    final selected = await showDialog<String>(
      context: context,
      builder: (_) => StatefulBuilder(
        builder: (context, setDialogState) => CatchDialog<void>(
          title: context.l10n.programsWorkspaceFunctionInvitations,
          actions: [
            CatchButton(
              label: context.l10n.coreCatchAdaptiveDialogVisiblecopyCancel,
              variant: CatchButtonVariant.secondary,
              onPressed: () => Navigator.of(context).pop(),
            ),
            CatchButton(
              label: context.l10n.programsWorkspaceFunctionSave,
              onPressed: () => Navigator.of(context).pop(mode),
            ),
          ],
          child: CatchSection.containedFieldRows(
            children: [
              CatchChoiceInput<String>.segmented(
                options: [
                  CatchOption(
                    value: 'allGuests',
                    label: context.l10n.programsGuestsInviteModeAll,
                  ),
                  CatchOption(
                    value: 'selectedGuests',
                    label: context.l10n.programsGuestsInviteModeSelected,
                  ),
                ],
                selected: mode,
                contract: CatchContractConstraints
                    .applyProgramFunctionInvitationsCallablePayloadInvitationMode,
                contractValueBuilder: (value) => value,
                onChanged: (value) => setDialogState(() => mode = value),
              ),
              if (mode == 'selectedGuests') ...[
                gapH12,
                CatchText(
                  context.l10n.programsGuestsInviteSelectionHint,
                  variant: CatchTextVariant.bodyS,
                ),
              ],
            ],
          ),
        ),
      ),
    );
    if (selected == null || selected == fn.invitationMode || !mounted) return;
    await ref
        .read(programWorkspaceControllerProvider.notifier)
        .applyFunctionInvitations(
          programId: widget.programDetail.program.programId,
          functionId: fn.functionId,
          invitationMode: selected,
          expectedRevision: fn.revision,
        );
    if (!mounted) return;
    ref.invalidate(
      organizerProgramDetailProvider(widget.programDetail.program.programId),
    );
  }
}

class ProgramWorkspaceFunctionTile extends StatelessWidget {
  const ProgramWorkspaceFunctionTile({
    super.key,
    required this.function,
    required this.onEdit,
    required this.onInvitations,
  });

  final OrganizerFunctionDetail function;
  final VoidCallback onEdit;
  final VoidCallback onInvitations;

  @override
  Widget build(BuildContext context) {
    final fn = function;
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        CatchFieldRow.standard(
          leading: Icon(CatchIcons.eventConfirmed),
          body: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              CatchText(fn.name, variant: CatchTextVariant.sectionTitle),
              const SizedBox(height: CatchSpacing.s1),
              CatchText(
                '${AppTimeFormatters.time(fn.startsAt)} – '
                '${AppTimeFormatters.time(fn.endsAt)} · ${fn.venueName}',
                variant: CatchTextVariant.bodyS,
              ),
              const SizedBox(height: CatchSpacing.s2),
              Wrap(
                spacing: CatchSpacing.s2,
                runSpacing: CatchSpacing.s2,
                children: [
                  CatchBadge(
                    label: fn.status.name,
                    tone: fn.status == ProgramFunctionStatus.scheduled
                        ? CatchBadgeTone.brand
                        : CatchBadgeTone.neutral,
                  ),
                  CatchBadge(
                    label: context.l10n.programsWorkspaceInvitations(
                      mode: fn.isSelectedGuests
                          ? context.l10n.programsGuestsInviteModeSelected
                          : context.l10n.programsGuestsInviteModeAll,
                    ),
                  ),
                  if (fn.checkInEnabled)
                    CatchBadge(
                      label: context.l10n.programsWorkspaceCheckedIn(
                        checked: fn.checkedInCount ?? 0,
                        expected: fn.expectedCount ?? 0,
                      ),
                      tone: CatchBadgeTone.success,
                    ),
                  if (fn.dressCode != null && fn.dressCode!.isNotEmpty)
                    CatchBadge(label: fn.dressCode!),
                ],
              ),
              if (fn.instructions != null && fn.instructions!.isNotEmpty) ...[
                gapH8,
                CatchText(fn.instructions!, variant: CatchTextVariant.bodyS),
              ],
              gapH12,
              Wrap(
                spacing: CatchSpacing.s2,
                children: [
                  CatchButton(
                    label: context.l10n.programsWorkspaceFunctionEdit,
                    leading: Icon(CatchIcons.edit, size: CatchIconSize.sm),
                    variant: CatchButtonVariant.secondary,
                    size: CatchButtonSize.md,
                    onPressed: onEdit,
                  ),
                  CatchButton(
                    label: context.l10n.programsWorkspaceFunctionInvitations,
                    leading: Icon(CatchIcons.send, size: CatchIconSize.sm),
                    variant: CatchButtonVariant.secondary,
                    size: CatchButtonSize.md,
                    onPressed: onInvitations,
                  ),
                ],
              ),
            ],
          ),
        ),
        gapH8,
      ],
    );
  }
}
