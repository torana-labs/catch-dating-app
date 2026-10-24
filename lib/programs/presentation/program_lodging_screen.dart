import 'dart:async';

import 'package:catch_dating_app/core/app_error_message.dart';
import 'package:catch_dating_app/core/presentation/catch_ui_copy.dart';
import 'package:catch_dating_app/core/riverpod_ui/catch_async_boundary.dart';
import 'package:catch_dating_app/core/riverpod_ui/catch_localized_error_banner.dart';
import 'package:catch_dating_app/core/riverpod_ui/catch_localized_error_state.dart';
import 'package:catch_dating_app/core/schema_contracts/generated/field_constraints.g.dart';
import 'package:catch_dating_app/l10n/l10n.dart';
import 'package:catch_dating_app/programs/data/program_lodging_repository.dart';
import 'package:catch_dating_app/programs/data/program_projection_lifetime.dart';
import 'package:catch_dating_app/programs/domain/program_lodging_board.dart';
import 'package:catch_dating_app/programs/domain/program_lodging_setup.dart';
import 'package:catch_dating_app/programs/domain/program_models.dart';
import 'package:catch_dating_app/programs/presentation/program_lodging_controller.dart';
import 'package:catch_dating_app/programs/presentation/program_lodging_layout.dart';
import 'package:catch_dating_app/programs/presentation/program_lodging_setup_page_body.dart';
import 'package:catch_tokens/catch_tokens.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

/// The private coordinator route. Hotel desks retain their separate scoped
/// operational board; this route never fetches private collections directly.
class ProgramLodgingScreen extends ConsumerStatefulWidget {
  const ProgramLodgingScreen({super.key, required this.programId});
  final String programId;

  @override
  ConsumerState<ProgramLodgingScreen> createState() =>
      _ProgramLodgingScreenState();
}

class _ProgramLodgingScreenState extends ConsumerState<ProgramLodgingScreen> {
  ProgramLodgingDraft? _editing;
  ProgramLodgingSetup? _editingSetup;
  ProgramLodgingSetup? _membershipSetup;
  ProgramLodgingMembership? _membership;
  Set<String> _membershipGroups = {};
  int _membershipEpoch = 0;

  ProgramLodgingController get _controller =>
      ref.read(programLodgingControllerProvider(widget.programId).notifier);

  Future<List<ProgramLodgingDestination>> _destinations(
    String proposalId,
    String partyId,
  ) => _controller.destinations(proposalId, partyId);
  Future<void> _move(String proposalId, String partyId, String inventoryId) =>
      _controller.move(proposalId, partyId, inventoryId);

  void _action(Future<void> Function() action) {
    unawaited(() async {
      try {
        await action();
      } catch (_) {
        // The controller owns the visible mutation error and exact retry.
      }
    }());
  }

  Future<void> _openSetup() async {
    final setup = await _controller.loadSetup();
    if (!mounted) return;
    final catalog = setup.catalog;
    if (catalog == null) {
      throw const FormatException('Setup catalog is absent.');
    }
    setState(() {
      _editingSetup = setup;
      _editing = ProgramLodgingDraft(
        catalog: catalog,
        configuration: setup.configuration,
      );
    });
  }

  Future<void> _openMembership() async {
    final setup = await _controller.loadSetup();
    if (!mounted) return;
    setState(() {
      _membershipEpoch++;
      _membershipSetup = setup;
      _membership = null;
      _membershipGroups = {};
    });
  }

  Future<void> _chooseMembershipGuest(String guestId) async {
    final setup = _membershipSetup;
    final epoch = ++_membershipEpoch;
    final membership = await _controller.loadMembership(guestId);
    if (!mounted ||
        epoch != _membershipEpoch ||
        !identical(setup, _membershipSetup)) {
      return;
    }
    setState(() {
      _membership = membership;
      _membershipGroups = membership.groupIds.toSet();
    });
  }

  Future<void> _saveMembership() async {
    final membership = _membership;
    if (membership == null) return;
    await _controller.saveMembership(membership, _membershipGroups.toList());
    if (mounted) {
      setState(() {
        _membershipSetup = null;
        _membership = null;
        _membershipEpoch++;
      });
    }
  }

  @override
  Widget build(BuildContext context) => CatchAsyncBoundary<ProgramLodgingView>(
    retainDataOn: const {},
    value: ref.watch(programLodgingControllerProvider(widget.programId)),
    onRetry: () =>
        ref.invalidate(programLodgingControllerProvider(widget.programId)),
    loadingBuilder: (_) => const ProgramLodgingScaffold(
      body: CatchStateViewport.loading(accountForBottomOverlay: false),
    ),
    errorBuilder: (_, error, _, retry) => ProgramLodgingScaffold(
      body: CatchLocalizedErrorState(
        error,
        context: AppErrorContext.event,
        onRetry: retry,
      ),
    ),
    builder: (context, view) {
      final active = ref.watch(
        programProjectionActiveProvider(
          programProjectionDeadline(
            view.setup.accessExpiresAt,
            view.review?.accessExpiresAt,
          ),
        ),
      );
      if (!active) {
        _editing = null;
        _editingSetup = null;
        _membershipSetup = null;
        _membership = null;
        _membershipGroups = {};
        _membershipEpoch++;
        return ProgramLodgingExpiredPageBody(
          busy: view.busy || view.retryAction != null,
          onRefresh: _controller.refresh,
        );
      }
      if (_editing != null && !identical(view.setup, _editingSetup)) {
        // Account/authority rebuild or a new source read cannot retain a
        // private draft from the previous projection lifetime.
        _editing = null;
        _editingSetup = null;
      }
      if (_membershipSetup != null &&
          !identical(view.setup, _membershipSetup)) {
        _membershipSetup = null;
        _membership = null;
        _membershipGroups = {};
        _membershipEpoch++;
      }
      if (_membershipSetup != null) {
        return ProgramLodgingMembershipPageBody(
          setup: _membershipSetup!,
          view: view,
          membership: _membership,
          selectedGroups: _membershipGroups,
          onChooseGuest: (id) => _action(() => _chooseMembershipGuest(id)),
          onGroupsChanged: (ids) => setState(() => _membershipGroups = ids),
          onSave: () => _action(_saveMembership),
          onCancel: () => setState(() {
            _membershipSetup = null;
            _membership = null;
            _membershipGroups = {};
            _membershipEpoch++;
          }),
          onRefresh: _controller.refresh,
        );
      }
      final editing = _editing;
      if (editing != null) {
        return CatchRouteScaffold(
          topBarBuilder: (context, scrolledUnder) => CatchTopBar.route(
            title: context.l10n.programsLodgingSetup,
            subtitle: editing.catalog.timezone,
            navigation: const CatchTopBarNavigation(
              mode: CatchTopBarNavigationMode.back,
            ),
          ),
          body: CatchRouteBody.standardSections(
            sections: [
              CatchSectionListItem(
                child: ProgramLodgingSetupPageBody(
                  key: ObjectKey(editing),
                  initial: editing,
                  busy: view.busy,
                  error: view.error,
                  resolveDates: (arrival, departure) =>
                      _controller.resolveDates(
                        editing.catalog.timezone,
                        arrival,
                        departure,
                      ),
                  onSave: (draft, adoptions) async {
                    await _controller.saveDraft(draft, adoptions: adoptions);
                    if (mounted) setState(() => _editing = null);
                  },
                  onCancel: () {
                    setState(() => _editing = null);
                    _controller.refresh();
                  },
                ),
              ),
            ],
          ),
        );
      }
      final review = view.review;
      if (review == null) {
        return ProgramLodgingScaffold(
          body: Column(
            children: [
              CatchEmptyState(
                icon: CatchIcons.hotel,
                message: context.l10n.programsLodgingSetupMissing,
              ),
              if (view.error != null)
                CatchLocalizedErrorBanner(
                  view.error!,
                  context: AppErrorContext.event,
                ),
              CatchButton(
                label: context.l10n.programsLodgingMembershipTitle,
                onPressed: view.busy ? null : () => _action(_openMembership),
              ),
              CatchButton(
                label: context.l10n.programsLodgingSetup,
                onPressed: view.busy ? null : () => _action(_openSetup),
              ),
            ],
          ),
        );
      }
      final proposal = review.proposal;
      final approved = review.workflow['approvedProposalId'] == proposal.id;
      final published =
          review.workflow['guestPublishedProposalId'] == proposal.id;
      final retry = view.retryAction;
      return CatchRouteScaffold(
        topBarBuilder: (context, scrolledUnder) => CatchTopBar.route(
          title: context.l10n.programsLodgingTitle,
          subtitle: context.l10n.programsLodgingSubtitle,
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
              child: CatchSection.contained(
                title: context.l10n.programsLodgingReview,
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.stretch,
                  children: [
                    if (view.error != null)
                      CatchLocalizedErrorBanner(
                        view.error!,
                        context: AppErrorContext.event,
                      ),
                    if (proposal.unplacedPartyIds.isNotEmpty)
                      CatchText(
                        context.l10n.programsLodgingUnplaced(
                          count: proposal.unplacedPartyIds.length,
                        ),
                        variant: CatchTextVariant.bodyL,
                        color: CatchTokens.of(context).ink,
                      ),
                    if (!proposal.searchComplete)
                      CatchText(
                        context.l10n.programsLodgingBoundedSearch,
                        variant: CatchTextVariant.bodyL,
                        color: CatchTokens.of(context).ink,
                      ),
                    for (final explanation in proposal.explanations)
                      CatchText(
                        explanation,
                        variant: CatchTextVariant.bodyL,
                        color: CatchTokens.of(context).ink,
                      ),
                    CatchButton(
                      label: context.l10n.programsLodgingMembershipTitle,
                      variant: CatchButtonVariant.secondary,
                      onPressed: view.busy || retry != null
                          ? null
                          : () => _action(_openMembership),
                    ),
                    CatchButton(
                      label: context.l10n.programsLodgingEditSetup,
                      variant: CatchButtonVariant.secondary,
                      onPressed: view.busy || retry != null
                          ? null
                          : () => _action(_openSetup),
                    ),
                    CatchButton(
                      label: context.l10n.programsLodgingRegenerate,
                      variant: CatchButtonVariant.secondary,
                      onPressed: view.busy || retry != null
                          ? null
                          : () => _action(_controller.regenerate),
                    ),
                    CatchButton(
                      label: context.l10n.programsLodgingApprove,
                      onPressed:
                          view.busy ||
                              proposal.unplacedPartyIds.isNotEmpty ||
                              (retry != null &&
                                  retry != ProgramLodgingAction.approve) ||
                              (retry == null && approved)
                          ? null
                          : () => _action(
                              () => _controller.decide(
                                ProgramLodgingAction.approve,
                              ),
                            ),
                    ),
                    for (final hotelId in review.allocatedHotelIds)
                      CatchButton(
                        label: review.isHotelConfirmed(hotelId)
                            ? context.l10n.programsLodgingHotelConfirmed(
                                hotel: review.hotelLabels[hotelId] ?? hotelId,
                              )
                            : context.l10n.programsLodgingConfirmHotel(
                                hotel: review.hotelLabels[hotelId] ?? hotelId,
                              ),
                        variant: CatchButtonVariant.secondary,
                        onPressed:
                            view.busy ||
                                !approved ||
                                review.isHotelConfirmed(hotelId) ||
                                (retry != null &&
                                    (retry !=
                                            ProgramLodgingAction.confirmHotel ||
                                        view.retryHotelId != hotelId))
                            ? null
                            : () => _action(
                                () => _controller.decide(
                                  ProgramLodgingAction.confirmHotel,
                                  hotelId: hotelId,
                                ),
                              ),
                      ),
                    CatchButton(
                      label: context.l10n.programsLodgingPublish,
                      onPressed:
                          view.busy ||
                              (retry != null &&
                                  retry !=
                                      ProgramLodgingAction.publishGuests) ||
                              (retry == null && (!approved || published))
                          ? null
                          : () => _action(
                              () => _controller.decide(
                                ProgramLodgingAction.publishGuests,
                              ),
                            ),
                    ),
                    CatchButton(
                      label: context.l10n.programsRoomsRefresh,
                      variant: CatchButtonVariant.ghost,
                      onPressed: view.busy || retry != null
                          ? null
                          : _controller.refresh,
                    ),
                  ],
                ),
              ),
            ),
            CatchSectionListItem(
              child: AbsorbPointer(
                absorbing: view.busy || retry != null,
                child: ProgramLodgingLayout(
                  proposalId: proposal.id,
                  units: review.units,
                  parties: review.parties,
                  // Bound method tear-offs stay equal across busy-state rebuilds,
                  // preserving the board's own pending-operation fence.
                  onPreview: _destinations,
                  onMove: _move,
                  copy: ProgramLodgingBoardCopy(
                    parties: context.l10n.programsLodgingParties,
                    rooms: context.l10n.programsRoomsTitle,
                    list: context.l10n.programsLodgingList,
                    map: context.l10n.programsLodgingMap,
                    move: context.l10n.programsLodgingMove,
                    locked: context.l10n.programsLodgingLocked,
                    provisional: context.l10n.programsLodgingProvisional,
                    empty: context.l10n.programsLodgingEmpty,
                  ),
                ),
              ),
            ),
          ],
        ),
      );
    },
  );
}

class ProgramLodgingScaffold extends StatelessWidget {
  const ProgramLodgingScaffold({super.key, required this.body});
  final Widget body;
  @override
  Widget build(BuildContext context) => CatchRouteScaffold(
    topBarBuilder: (context, scrolledUnder) => CatchTopBar.route(
      title: context.l10n.programsLodgingTitle,
      subtitle: context.l10n.programsLodgingSubtitle,
      emphasis: scrolledUnder
          ? CatchTopBarEmphasis.divided
          : CatchTopBarEmphasis.plain,
      navigation: const CatchTopBarNavigation(
        mode: CatchTopBarNavigationMode.back,
      ),
    ),
    body: CatchRouteBody.standardViewport(child: body),
  );
}

class ProgramLodgingExpiredPageBody extends StatelessWidget {
  const ProgramLodgingExpiredPageBody({
    super.key,
    required this.busy,
    required this.onRefresh,
  });
  final bool busy;
  final VoidCallback onRefresh;
  @override
  Widget build(BuildContext context) => CatchRouteScaffold(
    topBarBuilder: (context, scrolledUnder) => CatchTopBar.route(
      title: context.l10n.programsLodgingTitle,
      subtitle: context.l10n.programsLodgingSubtitle,
      emphasis: scrolledUnder
          ? CatchTopBarEmphasis.divided
          : CatchTopBarEmphasis.plain,
      navigation: const CatchTopBarNavigation(
        mode: CatchTopBarNavigationMode.back,
      ),
    ),
    body: CatchRouteBody.standardViewport(
      child: Column(
        children: [
          CatchText(
            context.l10n.programsLodgingMembershipExpired,
            variant: CatchTextVariant.bodyL,
            color: CatchTokens.of(context).ink,
          ),
          CatchButton(
            label: context.l10n.programsRoomsRefresh,
            onPressed: busy ? null : onRefresh,
          ),
        ],
      ),
    ),
  );
}

class ProgramLodgingMembershipPageBody extends ConsumerWidget {
  const ProgramLodgingMembershipPageBody({
    super.key,
    required this.setup,
    required this.view,
    required this.membership,
    required this.selectedGroups,
    required this.onChooseGuest,
    required this.onGroupsChanged,
    required this.onSave,
    required this.onCancel,
    required this.onRefresh,
  });
  final ProgramLodgingSetup setup;
  final ProgramLodgingView view;
  final ProgramLodgingMembership? membership;
  final Set<String> selectedGroups;
  final ValueChanged<String> onChooseGuest;
  final ValueChanged<Set<String>> onGroupsChanged;
  final VoidCallback onSave;
  final VoidCallback onCancel;
  final VoidCallback onRefresh;
  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final l10n = context.l10n;
    final catalog = setup.catalog!;
    final membership = this.membership;
    final active = ref.watch(
      programProjectionActiveProvider(
        programProjectionDeadline(
          setup.accessExpiresAt,
          membership?.accessExpiresAt,
        ),
      ),
    );
    if (!active) {
      return ProgramLodgingExpiredPageBody(
        busy: view.busy || view.retryAction != null,
        onRefresh: onRefresh,
      );
    }
    final groups = {
      for (final group in catalog.rows('groups'))
        requiredString(group, 'id'): requiredString(group, 'label'),
      if (membership != null)
        for (final group in mapList(membership.json['groups'], 'groups'))
          requiredString(group, 'id'): requiredString(group, 'label'),
    };
    return CatchRouteScaffold(
      topBarBuilder: (context, scrolledUnder) => CatchTopBar.route(
        title: context.l10n.programsLodgingTitle,
        subtitle: context.l10n.programsLodgingSubtitle,
        emphasis: scrolledUnder
            ? CatchTopBarEmphasis.divided
            : CatchTopBarEmphasis.plain,
        navigation: const CatchTopBarNavigation(
          mode: CatchTopBarNavigationMode.back,
        ),
      ),
      body: CatchRouteBody.standard(
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            CatchSection.containedFieldRows(
              title: l10n.programsLodgingMembershipTitle,
              children: [
                CatchText(
                  l10n.programsLodgingMembershipHint,
                  variant: CatchTextVariant.bodyL,
                  color: CatchTokens.of(context).ink,
                ),
                CatchField<String>.choices(
                  copy: catchFieldCopy(l10n),
                  title: l10n.programsGuestsNameLabel,
                  contract: CatchContractConstraints
                      .upsertProgramGuestCallablePayloadGuestId,
                  contractValueBuilder: (v) => v,
                  values: catalog
                      .rows('guests')
                      .map((g) => requiredString(g, 'id'))
                      .toList(),
                  selected: {?membership?.guestId},
                  itemLabelBuilder: (id) =>
                      requiredString(catalog.row('guests', id), 'label'),
                  onSelectionChanged: view.busy || !active
                      ? null
                      : (ids) {
                          final id = ids.firstOrNull;
                          if (id != null) {
                            onChooseGuest(id);
                          }
                        },
                ),
                if (membership != null && active) ...[
                  CatchText(
                    membership.label,
                    variant: CatchTextVariant.bodyL,
                    color: CatchTokens.of(context).ink,
                  ),
                  CatchField<String>.choices(
                    copy: catchFieldCopy(l10n),
                    title: l10n.programsGuestsGroupsTitle,
                    contract: CatchContractConstraints
                        .upsertProgramGuestCallablePayloadGroupIds,
                    contractValueBuilder: (v) => v,
                    mode: CatchChipMode.multiple,
                    allowEmptySelection: true,
                    values: groups.keys.toList(),
                    selected: selectedGroups,
                    itemLabelBuilder: (id) => groups[id]!,
                    onSelectionChanged: view.busy ? null : onGroupsChanged,
                  ),
                  for (final row in membership.evidence)
                    CatchText(
                      l10n.programsLodgingMembershipEvidence(
                        group: groups[requiredString(row, 'groupId')]!,
                        source: requiredString(row, 'sourceLabel'),
                        status: row['selected'] == true
                            ? (row['included'] == true
                                  ? l10n.programsLodgingMembershipIncluded
                                  : l10n.programsLodgingMembershipExcluded)
                            : l10n.programsLodgingMembershipSuggested,
                      ),
                      variant: CatchTextVariant.bodyL,
                      color: CatchTokens.of(context).ink,
                    ),
                  for (final groupId in membership.groupIds)
                    if (!membership.evidence.any(
                      (e) => e['selected'] == true && e['groupId'] == groupId,
                    ))
                      CatchText(
                        l10n.programsLodgingMembershipEvidence(
                          group: groups[groupId]!,
                          source: l10n.programsLodgingMembershipCanonical,
                          status: l10n.programsLodgingMembershipIncluded,
                        ),
                        variant: CatchTextVariant.bodyL,
                        color: CatchTokens.of(context).ink,
                      ),
                  CatchButton(
                    label: l10n.programsLodgingMembershipSave,
                    onPressed: view.busy || selectedGroups.length > 20
                        ? null
                        : onSave,
                  ),
                ],
                if (view.error != null)
                  CatchLocalizedErrorBanner(
                    view.error!,
                    context: AppErrorContext.event,
                  ),
                CatchButton(
                  label: l10n.coreCatchAdaptiveDialogVisiblecopyCancel,
                  variant: CatchButtonVariant.secondary,
                  onPressed: view.busy ? null : onCancel,
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }
}
