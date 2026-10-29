import 'package:catch_dating_app/contexts/programmes/data/program_setup_repository.dart';
import 'package:catch_dating_app/contexts/programmes/data/program_snapshot_reader.dart';
import 'package:catch_dating_app/contexts/programmes/data/program_work_repository.dart';
import 'package:catch_dating_app/contexts/programmes/domain/phone_import_access.dart';
import 'package:catch_dating_app/contexts/programmes/domain/program_models.dart';
import 'package:catch_dating_app/core/schema_contracts/generated/field_constraints.g.dart';
import 'package:catch_dating_app/l10n/l10n.dart';
import 'package:catch_dating_app/platform/app_config.dart';
import 'package:catch_dating_app/platform/device/external_share.dart';
import 'package:catch_dating_app/platform/errors/app_error_message.dart';
import 'package:catch_dating_app/platform/errors/app_exception.dart';
import 'package:catch_dating_app/platform/l10n/catch_ui_copy.dart';
import 'package:catch_dating_app/platform/riverpod_ui/catch_async_boundary.dart';
import 'package:catch_dating_app/platform/riverpod_ui/catch_async_value_adapter.dart';
import 'package:catch_dating_app/platform/riverpod_ui/catch_localized_error_state.dart';
import 'package:catch_dating_app/programs/presentation/program_guest_edit_dialog.dart';
import 'package:catch_dating_app/programs/presentation/program_guest_group_edit_dialog.dart';
import 'package:catch_dating_app/programs/presentation/program_workspace_controller.dart';
import 'package:catch_dating_app/routing/route_contract.dart';
import 'package:catch_tokens/catch_tokens.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

/// Household × function RSVP grid for the organizer workspace. One function
/// is selected at a time; each household card lists members with their join
/// state and a segmented RSVP editor that writes through
/// `recordProgramFunctionRsvp`.
class ProgramGuestsScreen extends ConsumerWidget {
  const ProgramGuestsScreen({super.key, required this.programId});

  final String programId;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final detailAsync = ref.watch(organizerProgramDetailProvider(programId));
    final guestsAsync = ref.watch(programGuestListProvider(programId));
    final detailState = catchAsyncStateFromAsyncValue(detailAsync);
    final program = detailState.isSettledData
        ? detailState.value?.program
        : null;
    final workAccessAsync =
        program?.kind == ProgramKind.wedding &&
            program?.status != ProgramStatus.archived
        ? ref.watch(programWorkEntryProvider(programId, null))
        : null;
    return CatchAsyncBoundary<OrganizerProgramDetail>(
      retainDataOn: const {},
      value: detailAsync,
      onRetry: () => ref.invalidate(organizerProgramDetailProvider(programId)),
      loadingBuilder: (_) => CatchRouteScaffold(
        topBarBuilder: (context, scrolledUnder) => CatchTopBar.route(
          title: context.l10n.programsGuestsTitle,
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
          title: context.l10n.programsGuestsTitle,
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
      builder: (context, detail) => CatchAsyncBoundary<ProgramGuestListPage>(
        retainDataOn: const {},
        value: guestsAsync,
        onRetry: () => ref.invalidate(programGuestListProvider(programId)),
        loadingBuilder: (_) => CatchRouteScaffold(
          topBarBuilder: (context, scrolledUnder) => CatchTopBar.route(
            title: detail.program.title,
            subtitle: context.l10n.programsGuestsTitle,
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
            title: detail.program.title,
            subtitle: context.l10n.programsGuestsTitle,
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
        builder: (context, page) => ProgramGuestsPageBody(
          programId: programId,
          programTitle: detail.program.title,
          functions: [
            for (final fn in detail.functions)
              ProgramGuestsFunction(functionId: fn.functionId, name: fn.name),
          ],
          hotels: detail.hotels,
          guestPage: page,
          canManageGuests: true,
          canShareRsvpLinks: detail.program.status != ProgramStatus.archived,
          phoneImportSection:
              workAccessAsync != null &&
                  detail.program.kind == ProgramKind.wedding &&
                  detail.program.status != ProgramStatus.archived
              ? CatchAsyncBoundary<ProgramReadView<ProgramWorkAccess>>(
                  retainDataOn: const {},
                  value: workAccessAsync,
                  onRetry: () =>
                      ref.invalidate(programWorkEntryProvider(programId, null)),
                  loadingBuilder: (_) => const CatchLoadingIndicator(),
                  errorBuilder: (context, error, _, onRetry) =>
                      error is PermissionException ||
                          error is SignInRequiredException ||
                          error is DocumentNotFoundException
                      ? const SizedBox.shrink()
                      : CatchLocalizedErrorState(
                          error,
                          context: AppErrorContext.event,
                          mode: CatchErrorStateMode.inline,
                          onRetry: onRetry,
                          retryLabel: context.l10n.sharedActionTryAgain,
                        ),
                  builder: (context, result) {
                    final access = result.value;
                    if (result.snapshotAt != null ||
                        access.programId != programId ||
                        access.organizerId != detail.program.organizerId ||
                        !access.isManager ||
                        !canImportWeddingPhoneContacts(
                          access,
                          DateTime.now(),
                        )) {
                      return const SizedBox.shrink();
                    }
                    return CatchSection.action(
                      title: context.l10n.phoneImportEntryTitle,
                      message: context.l10n.phoneImportEntryHelp,
                      actionKey: const ValueKey('program-guests-phone-import'),
                      actionLabel: context.l10n.phoneImportChooseContacts,
                      onAction: () => context.pushNamed(
                        Routes.hostWorkPhoneImportScreen.name,
                        pathParameters: {'programId': programId},
                      ),
                    );
                  },
                )
              : null,
        ),
      ),
    );
  }
}

/// Guest desk for `guestRelations` staff landing from the work shell. Renders
/// the same household × function grid as the organizer screen, sourced from
/// `getProgramWorkAccess` instead of the manager-only `getOrganizerProgram`;
/// guest/household/group mutations stay hidden unless the actor also holds
/// `programCoordinator` (or is the organizer manager).

/// The function columns the guest desk matrix renders. Both the organizer
/// detail model and the staff work-access model map onto it.
class ProgramGuestsFunction {
  const ProgramGuestsFunction({required this.functionId, required this.name});

  final String functionId;
  final String name;
}

class ProgramGuestsPageBody extends ConsumerStatefulWidget {
  const ProgramGuestsPageBody({
    super.key,
    required this.programId,
    required this.programTitle,
    required this.functions,
    required this.hotels,
    required this.guestPage,
    required this.canManageGuests,
    this.canShareRsvpLinks = false,
    this.phoneImportSection,
  });

  final String programId;
  final String programTitle;
  final List<ProgramGuestsFunction> functions;
  final List<ProgramHotel> hotels;
  final ProgramGuestListPage guestPage;

  /// Guest/household/group upserts stay coordinator-only; `guestRelations`
  /// desks read the same grid and record per-function RSVPs instead.
  final bool canManageGuests;

  /// Link issuance is independent of coordinator-only guest edits.
  final bool canShareRsvpLinks;

  /// The manager route owns live import eligibility and navigation.
  final Widget? phoneImportSection;

  @override
  ConsumerState<ProgramGuestsPageBody> createState() =>
      _ProgramGuestsPageBodyState();
}

class _ProgramGuestsPageBodyState extends ConsumerState<ProgramGuestsPageBody> {
  String? _selectedFunctionId;
  String? _pendingGuestKey;
  String? _pendingRsvpLinkHouseholdId;
  Object? _mutationError;

  ProgramGuestsFunction? get _selectedFunction {
    final functions = widget.functions;
    if (functions.isEmpty) return null;
    for (final fn in functions) {
      if (fn.functionId == _selectedFunctionId) return fn;
    }
    return functions.first;
  }

  /// Join rows keyed `guestId:functionId` for O(1) cell lookups.
  Map<String, ProgramFunctionGuestRow> get _joinIndex {
    final index = <String, ProgramFunctionGuestRow>{};
    for (final row in widget.guestPage.functionGuests) {
      index['${row.guestId}:${row.functionId}'] = row;
    }
    return index;
  }

  void _refresh() {
    ref.invalidate(programGuestListProvider(widget.programId));
    if (widget.canManageGuests) {
      ref.invalidate(organizerProgramDetailProvider(widget.programId));
    }
  }

  Future<void> _recordRsvp(ProgramGuestRow guest, String status) async {
    final fn = _selectedFunction;
    if (fn == null) return;
    setState(() {
      _pendingGuestKey = guest.guestId;
      _mutationError = null;
    });
    try {
      await ref
          .read(programWorkspaceControllerProvider.notifier)
          .recordFunctionRsvp(
            programId: widget.programId,
            functionId: fn.functionId,
            guestId: guest.guestId,
            rsvpStatus: status,
            allowUninvited: true,
          );
      _refresh();
    } catch (error) {
      if (mounted) setState(() => _mutationError = error);
    } finally {
      if (mounted) setState(() => _pendingGuestKey = null);
    }
  }

  /// Mint the household's guest-facing token and hand the URL to the native
  /// share sheet (organizers send it over WhatsApp/SMS).
  Future<void> _shareRsvpLink(ProgramHouseholdRow household) async {
    if (!widget.canShareRsvpLinks || _pendingRsvpLinkHouseholdId != null) {
      return;
    }
    setState(() {
      _pendingRsvpLinkHouseholdId = household.householdId;
      _mutationError = null;
    });
    try {
      final link = await ref
          .read(programWorkspaceControllerProvider.notifier)
          .issueHouseholdRsvpLink(
            programId: widget.programId,
            householdId: household.householdId,
          );
      final url = AppConfig.publicSiteUrl.resolve(
        '/rsvp/${Uri.encodeComponent(link.token)}',
      );
      if (!mounted) return;
      await ref
          .read(externalShareControllerProvider)
          .shareText(
            text: url.toString(),
            subject: context.l10n.programsGuestsRsvpLinkSubject(
              household: household.label,
            ),
            origin: _shareOrigin(context),
          );
    } catch (error) {
      if (mounted) setState(() => _mutationError = error);
    } finally {
      if (mounted) setState(() => _pendingRsvpLinkHouseholdId = null);
    }
  }

  @override
  Widget build(BuildContext context) {
    final page = widget.guestPage;
    final selectedFn = _selectedFunction;
    final joinIndex = _joinIndex;
    final guestsByHousehold = <String?, List<ProgramGuestRow>>{};
    for (final guest in page.guests) {
      guestsByHousehold.putIfAbsent(guest.householdId, () => []).add(guest);
    }
    final householdById = {for (final h in page.households) h.householdId: h};
    final householdIds = page.households
        .where((h) => guestsByHousehold.containsKey(h.householdId))
        .map((h) => h.householdId)
        .toList(growable: false);
    final unaffiliated = guestsByHousehold[null] ?? const [];

    return CatchRouteScaffold(
      topBarBuilder: (context, scrolledUnder) => CatchTopBar.route(
        title: widget.programTitle,
        subtitle: context.l10n.programsGuestsTitle,
        emphasis: scrolledUnder
            ? CatchTopBarEmphasis.divided
            : CatchTopBarEmphasis.plain,
        navigation: const CatchTopBarNavigation(
          mode: CatchTopBarNavigationMode.back,
        ),
      ),
      body: CatchRouteBody.standardSections(
        sections: [
          if (widget.phoneImportSection case final section?)
            CatchSectionListItem(child: section),
          if (widget.functions.length > 1)
            CatchSectionListItem(
              child: CatchChoiceInput<String>.segmented(
                scrollable: true,
                options: [
                  for (final fn in widget.functions)
                    CatchOption(value: fn.functionId, label: fn.name),
                ],
                selected: selectedFn?.functionId,
                contractExemption:
                    'Picks which function column the matrix inspects; RSVP writes carry their own functionId per cell.',
                onChanged: (id) => setState(() => _selectedFunctionId = id),
              ),
            ),
          if (_mutationError != null)
            CatchSectionListItem(
              child: CatchBanner(
                title: context.l10n.programsGuestsMutationFailed,
                message: appErrorMessage(
                  _mutationError!,
                  l10n: context.l10n,
                  context: AppErrorContext.event,
                ),
                icon: CatchIcons.info,
                tone: CatchBannerTone.danger,
              ),
            ),
          CatchSectionListItem(
            child: CatchSection.collection(
              title: context.l10n.programsGuestsGridTitle,
              message: selectedFn == null
                  ? null
                  : context.l10n.programsGuestsGridSubtitle(
                      function: selectedFn.name,
                    ),
              emptyTitle: context.l10n.programsGuestsEmptyTitle,
              emptyMessage: context.l10n.programsGuestsEmptyMessage,
              emptyIcon: CatchIcons.people,
              actionLabel: widget.canManageGuests
                  ? context.l10n.programsGuestsAddGuest
                  : null,
              onAction: widget.canManageGuests
                  ? () => _addGuest(context)
                  : null,
              children: [
                if (page.guests.isNotEmpty) ...[
                  for (final householdId in householdIds)
                    Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Row(
                          children: [
                            Expanded(
                              child: CatchText(
                                householdById[householdId]!.label,
                                variant: CatchTextVariant.supportingStrong,
                              ),
                            ),
                            if (widget.canShareRsvpLinks)
                              CatchIconAction.icon(
                                icon: CatchIcons.link,
                                tooltip:
                                    context.l10n.programsGuestsShareRsvpLink,
                                status: _pendingRsvpLinkHouseholdId != null
                                    ? CatchIconActionStatus.disabled
                                    : CatchIconActionStatus.enabled,
                                onPressed: () =>
                                    _shareRsvpLink(householdById[householdId]!),
                              ),
                          ],
                        ),
                        gapH8,
                        for (final member in guestsByHousehold[householdId]!)
                          ProgramGuestsFunctionRow(
                            guest: member,
                            functions: widget.functions,
                            selectedFunction: selectedFn,
                            joinIndex: joinIndex,
                            pending: _pendingGuestKey == member.guestId,
                            onRsvp: _recordRsvp,
                          ),
                        gapH12,
                      ],
                    ),
                  if (unaffiliated.isNotEmpty)
                    Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        CatchText(
                          context.l10n.programsGuestsNoHousehold,
                          variant: CatchTextVariant.supportingStrong,
                        ),
                        gapH8,
                        for (final member in unaffiliated)
                          ProgramGuestsFunctionRow(
                            guest: member,
                            functions: widget.functions,
                            selectedFunction: selectedFn,
                            joinIndex: joinIndex,
                            pending: _pendingGuestKey == member.guestId,
                            onRsvp: _recordRsvp,
                          ),
                      ],
                    ),
                ],
              ],
            ),
          ),
          CatchSectionListItem(
            child: CatchSection.collection(
              title: context.l10n.programsGuestsGroupsTitle,
              message: page.groups.isEmpty
                  ? null
                  : context.l10n.programsGuestsGroupsSubtitle,
              emptyTitle: context.l10n.programsGuestsGroupsEmpty,
              emptyMessage: context.l10n.programsGuestsGroupsSubtitle,
              emptyIcon: CatchIcons.people,
              actionLabel: widget.canManageGuests
                  ? context.l10n.programsGuestsGroupNew
                  : null,
              onAction: widget.canManageGuests
                  ? () => _addGroup(context)
                  : null,
              children: [
                for (final group in page.groups)
                  CatchFieldRow.standard(
                    leading: Icon(CatchIcons.people),
                    body: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        CatchText(
                          group.label,
                          variant: CatchTextVariant.sectionTitle,
                        ),
                        const SizedBox(height: CatchSpacing.s1),
                        CatchText(
                          '${group.dimension} · '
                          '${context.l10n.programsGuestsGroupMembers(count: group.memberCount)}',
                          variant: CatchTextVariant.bodyS,
                        ),
                        if (group.hotelId != null)
                          CatchText(
                            context.l10n.programsGuestsGroupHotelSummary(
                              hotel:
                                  widget.hotels
                                      .where(
                                        (hotel) =>
                                            hotel.hotelId == group.hotelId,
                                      )
                                      .firstOrNull
                                      ?.name ??
                                  context.l10n.programsGuestsHotelUnavailable,
                            ),
                            variant: CatchTextVariant.bodyS,
                          ),
                      ],
                    ),
                    trailing: widget.canManageGuests
                        ? Row(
                            mainAxisSize: MainAxisSize.min,
                            children: [
                              CatchIconAction.icon(
                                icon: CatchIcons.edit,
                                variant: CatchIconActionVariant.plain,
                                tooltip: context.l10n.programsGuestsGroupEdit,
                                onPressed: () => _editGroup(context, group),
                              ),
                              CatchIconAction.icon(
                                icon: CatchIcons.delete,
                                variant: CatchIconActionVariant.plain,
                                accent: CatchTokens.of(context).danger,
                                tooltip: context.l10n.programsGuestsGroupDelete,
                                onPressed: () => _deleteGroup(context, group),
                              ),
                            ],
                          )
                        : null,
                  ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Future<void> _addGuest(BuildContext context) async {
    final draft = await showDialog<ProgramGuestEditResult>(
      context: context,
      builder: (_) => ProgramGuestEditDialog(
        households: widget.guestPage.households,
        groups: widget.guestPage.groups,
      ),
    );
    if (draft == null || !mounted) return;
    setState(() => _mutationError = null);
    try {
      await ref
          .read(programWorkspaceControllerProvider.notifier)
          .upsertGuest(
            programId: widget.programId,
            displayName: draft.displayName,
            householdId: draft.householdId,
            groupIds: draft.groupIds,
            phoneE164: draft.phoneE164,
            email: draft.email,
          );
      _refresh();
    } catch (error) {
      if (mounted) setState(() => _mutationError = error);
    }
  }

  Future<void> _addGroup(BuildContext context) => _editGroup(context, null);

  Future<void> _editGroup(
    BuildContext context,
    ProgramGuestGroupRow? group,
  ) async {
    final draft =
        await showDialog<({String label, String dimension, String? hotelId})>(
          context: context,
          builder: (_) =>
              ProgramGuestGroupEditDialog(hotels: widget.hotels, group: group),
        );
    if (draft == null || !mounted) return;
    setState(() => _mutationError = null);
    try {
      await ref
          .read(programWorkspaceControllerProvider.notifier)
          .upsertGuestGroup(
            programId: widget.programId,
            label: draft.label,
            dimension: draft.dimension,
            groupId: group?.groupId,
            expectedRevision: group?.revision,
            hotelId: draft.hotelId == group?.hotelId ? null : draft.hotelId,
            clearHotel: group?.hotelId != null && draft.hotelId == null,
          );
      _refresh();
    } catch (error) {
      if (mounted) setState(() => _mutationError = error);
    }
  }

  Future<void> _deleteGroup(
    BuildContext context,
    ProgramGuestGroupRow group,
  ) async {
    final confirmed = await showCatchConfirmDialog(
      copy: catchDialogCopy(context.l10n),
      context: context,
      title: context.l10n.programsGuestsGroupDeleteTitle,
      message: context.l10n.programsGuestsGroupDeleteMessage(
        label: group.label,
      ),
      confirmLabel: context.l10n.programsGuestsGroupDelete,
      danger: true,
    );
    if (confirmed != true || !mounted) return;
    setState(() => _mutationError = null);
    try {
      await ref
          .read(programWorkspaceControllerProvider.notifier)
          .deleteGuestGroup(
            programId: widget.programId,
            groupId: group.groupId,
            expectedRevision: group.revision,
          );
      _refresh();
    } catch (error) {
      if (mounted) setState(() => _mutationError = error);
    }
  }
}

/// One guest row: per-function status chips for the whole program plus the
/// RSVP editor for the currently selected function.
class ProgramGuestsFunctionRow extends StatelessWidget {
  const ProgramGuestsFunctionRow({
    super.key,
    required this.guest,
    required this.functions,
    required this.selectedFunction,
    required this.joinIndex,
    required this.pending,
    required this.onRsvp,
  });

  final ProgramGuestRow guest;
  final List<ProgramGuestsFunction> functions;
  final ProgramGuestsFunction? selectedFunction;
  final Map<String, ProgramFunctionGuestRow> joinIndex;
  final bool pending;
  final void Function(ProgramGuestRow guest, String status) onRsvp;

  @override
  Widget build(BuildContext context) {
    final selected = selectedFunction;
    final join = selected == null
        ? null
        : joinIndex['${guest.guestId}:${selected.functionId}'];
    return CatchFieldRow.standard(
      leading: Icon(CatchIcons.person),
      body: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          CatchText(guest.displayName, variant: CatchTextVariant.sectionTitle),
          const SizedBox(height: CatchSpacing.s2),
          Wrap(
            spacing: CatchSpacing.s1,
            runSpacing: CatchSpacing.s1,
            children: [
              for (final fn in functions)
                Builder(
                  builder: (context) {
                    final join = joinIndex['${guest.guestId}:${fn.functionId}'];
                    final status = join == null
                        ? 'pending'
                        : join.invited
                        ? join.rsvpStatus
                        : 'notInvited';
                    return CatchBadge(
                      label: context.l10n.programsGuestFunctionStatus(
                        functionName: fn.name,
                        status: _guestStatusLabel(context, status),
                      ),
                      tone: _guestStatusTone(
                        status,
                        isSelected: fn.functionId == selected?.functionId,
                      ),
                    );
                  },
                ),
            ],
          ),
          if (selected != null) ...[
            const SizedBox(height: CatchSpacing.s2),
            if (pending)
              const Column(children: [gapH8, CatchLoadingIndicator(), gapH8])
            else
              CatchChoiceInput<String>.segmented(
                options: [
                  CatchOption(
                    value: 'attending',
                    label: context.l10n.programsDoorRsvpAttending,
                  ),
                  CatchOption(
                    value: 'maybe',
                    label: context.l10n.programsDoorRsvpMaybe,
                  ),
                  CatchOption(
                    value: 'declined',
                    label: context.l10n.programsDoorRsvpDeclined,
                  ),
                  CatchOption(
                    value: 'pending',
                    label: context.l10n.programsDoorRsvpPending,
                  ),
                ],
                selected: join?.rsvpStatus ?? 'pending',
                contract: CatchContractConstraints
                    .recordProgramFunctionRsvpCallablePayloadRsvpStatus,
                contractValueBuilder: (status) => status,
                onChanged: (status) => onRsvp(guest, status),
              ),
          ],
        ],
      ),
    );
  }
}

String _guestStatusLabel(BuildContext context, String status) =>
    switch (status) {
      'attending' => context.l10n.programsDoorRsvpAttending,
      'declined' => context.l10n.programsDoorRsvpDeclined,
      'maybe' => context.l10n.programsDoorRsvpMaybe,
      'pending' => context.l10n.programsDoorRsvpPending,
      'notInvited' => context.l10n.programsGuestNotInvited,
      _ => status,
    };

CatchBadgeTone _guestStatusTone(String status, {required bool isSelected}) {
  return switch (status) {
    'attending' => CatchBadgeTone.success,
    'declined' => CatchBadgeTone.danger,
    'maybe' => CatchBadgeTone.warning,
    'notInvited' => CatchBadgeTone.neutral,
    _ => isSelected ? CatchBadgeTone.brand : CatchBadgeTone.neutral,
  };
}

Rect? _shareOrigin(BuildContext context) {
  final box = context.findRenderObject() as RenderBox?;
  return box == null ? null : box.localToGlobal(Offset.zero) & box.size;
}
