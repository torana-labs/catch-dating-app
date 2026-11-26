import 'dart:async';

import 'package:catch_dating_app/contexts/programmes/data/program_projection_lifetime.dart';
import 'package:catch_dating_app/contexts/programmes/domain/program_lodging_board.dart';
import 'package:catch_dating_app/contexts/programmes/domain/program_lodging_setup.dart';
import 'package:catch_dating_app/hosts/programmes/planner/lodging/programme_lodging_body.dart';
import 'package:catch_dating_app/hosts/programmes/planner/lodging/programme_lodging_controller.dart';
import 'package:catch_dating_app/hosts/programmes/planner/lodging/programme_lodging_membership_body.dart';
import 'package:catch_dating_app/hosts/programmes/planner/lodging/programme_lodging_setup_body.dart';
import 'package:catch_dating_app/hosts/programmes/planner/lodging/programme_lodging_state.dart';
import 'package:catch_l10n/l10n.dart';
import 'package:catch_platform/errors/app_error_message.dart';
import 'package:catch_platform/riverpod_ui/catch_async_value_adapter.dart';
import 'package:catch_platform/riverpod_ui/catch_localized_error_state.dart';
import 'package:catch_platform/routing/route_contract.dart';
import 'package:catch_tokens/catch_tokens.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/widgets.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

/// The stay planner: room-sharing parties placed in contracted hotel rooms
/// through `manageProgramLodging`, from a private setup to rooms published
/// to guests.
///
/// It shows one of five views. While the programme has no lodging setup:
/// Set up lodging and Review social memberships. With a setup: the
/// proposal and its room board (approve, confirm each hotel, publish rooms
/// to guests, move a party, regenerate, refresh). Editing: the setup form
/// or the membership review, each closed with the top bar. When the
/// private planning access runs out: a refresh. A new account, authority
/// or source read drops any open draft.
///
/// Only a programme coordinator or the owner reaches it; Rooms offers it
/// to them, and the server refuses anyone else.
class HostProgrammeLodgingScreen extends ConsumerStatefulWidget {
  const HostProgrammeLodgingScreen({super.key, required this.programId});

  final String programId;

  @override
  ConsumerState<HostProgrammeLodgingScreen> createState() =>
      _HostProgrammeLodgingScreenState();
}

/// The top bar of a view: an editing view's [title] and its [close]; a
/// null title is the planner's own bar with back.
typedef _LodgingBar = ({String? title, VoidCallback? close});

const _LodgingBar _plainBar = (title: null, close: null);

class _HostProgrammeLodgingScreenState
    extends ConsumerState<HostProgrammeLodgingScreen> {
  ProgramLodgingDraft? _editing;
  ProgramLodgingSetup? _editingSetup;
  ProgramLodgingSetup? _membershipSetup;
  ProgramLodgingMembership? _membership;
  Set<String> _membershipGroups = {};
  int _membershipEpoch = 0;

  HostProgrammeLodgingControllerProvider get _provider =>
      hostProgrammeLodgingControllerProvider(widget.programId);
  HostProgrammeLodgingController get _controller =>
      ref.read(_provider.notifier);

  // Bound tear-offs stay equal across busy rebuilds, so the board keeps
  // its own pending selection fence.
  Future<List<ProgramLodgingDestination>> _destinations(
    String proposalId,
    String partyId,
  ) => _controller.destinations(proposalId, partyId);
  Future<void> _move(String proposalId, String partyId, String inventoryId) =>
      _controller.move(proposalId, partyId, inventoryId);

  /// The controller shows a failed action's error and keeps its retry.
  void _action(Future<void> Function() action) {
    unawaited(() async {
      try {
        await action();
      } on Object catch (_) {}
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
    if (mounted) _closeMembership();
  }

  void _closeMembership() => setState(() {
    _membershipSetup = null;
    _membership = null;
    _membershipGroups = {};
    _membershipEpoch++;
  });

  void _back() => context.canPop()
      ? context.pop()
      : context.goNamed(
          Routes.hostProgramLodgingScreen.name,
          pathParameters: {'programId': widget.programId},
        );

  @override
  Widget build(BuildContext context) {
    final l10n = context.l10n;
    final read = catchAsyncStateFromAsyncValue(ref.watch(_provider));
    final _LodgingBar? bar;
    final Widget body;
    // A failed or reloading read never keeps showing the older private view.
    final settled = read.isSettledData ? read.value : null;
    if (read.error case final error?) {
      bar = _plainBar;
      body = CatchLocalizedErrorState(
        error,
        context: AppErrorContext.event,
        onRetry: () => ref.invalidate(_provider),
      );
    } else if (settled == null) {
      bar = _plainBar;
      body = const CatchPageBody.screen(child: CatchLoadingIndicator());
    } else {
      (bar, body) = _view(context, settled);
    }
    return CatchRoot(
      format: CatchFormat.nightsOut,
      child: CatchScreen(
        key: const ValueKey<String>('host-programme-lodging-screen'),
        bodyScrolls: false,
        topBar: switch (bar) {
          null => null,
          (:final title, :final close) => CatchTopBar(
            variant: CatchTopBarVariant.tool,
            // A close leaves an editing view; otherwise back leaves the
            // planner. A disabled close keeps a call's view in place.
            back: close == null && title != null
                ? CatchTopBarBack(
                    label: l10n.coreCatchAdaptiveDialogVisiblecopyCancel,
                    close: true,
                    onPressed: () {},
                  )
                : close == null
                ? CatchTopBarBack(onPressed: _back)
                : CatchTopBarBack(
                    label: l10n.coreCatchAdaptiveDialogVisiblecopyCancel,
                    close: true,
                    onPressed: close,
                  ),
            kicker: title == null ? null : l10n.hostProgrammeLodgingTitle,
            title: title ?? l10n.hostProgrammeLodgingTitle,
          ),
        },
        body: body,
      ),
    );
  }

  (_LodgingBar?, Widget) _view(
    BuildContext context,
    HostProgrammeLodgingState view,
  ) {
    final l10n = context.l10n;
    final expired = CatchPageBody.screen(
      children: [
        CatchNotice.inline(
          key: const ValueKey<String>('host-programme-lodging-expired'),
          tone: CatchNoticeTone.warning,
          icon: CatchIcons.info,
          body: l10n.hostProgrammeLodgingMembershipExpired,
        ),
        CatchButton(
          label: l10n.hostProgrammeLodgingRefresh,
          fullWidth: true,
          onPressed: view.locked ? null : _controller.refresh,
        ),
      ],
    );
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
      return (_plainBar, expired);
    }
    if (_editing != null && !identical(view.setup, _editingSetup)) {
      // A rebuilt account, authority or source read cannot keep a private
      // draft from the previous projection lifetime.
      _editing = null;
      _editingSetup = null;
    }
    if (_membershipSetup != null && !identical(view.setup, _membershipSetup)) {
      _membershipSetup = null;
      _membership = null;
      _membershipGroups = {};
      _membershipEpoch++;
    }
    if (_membershipSetup case final setup?) {
      final membershipActive = ref.watch(
        programProjectionActiveProvider(
          programProjectionDeadline(
            setup.accessExpiresAt,
            _membership?.accessExpiresAt,
          ),
        ),
      );
      if (!membershipActive) return (_plainBar, expired);
      return (
        (
          title: l10n.hostProgrammeLodgingMembershipTitle,
          close: view.busy ? null : _closeMembership,
        ),
        HostProgrammeLodgingMembershipBody(
          catalog: setup.catalog!,
          membership: _membership,
          selectedGroups: _membershipGroups,
          busy: view.busy,
          error: view.error,
          onChooseGuest: (id) => _action(() => _chooseMembershipGuest(id)),
          onGroupsChanged: (ids) => setState(() => _membershipGroups = ids),
          onSave: () => _action(_saveMembership),
        ),
      );
    }
    if (_editing case final editing?) {
      return (
        (
          title: l10n.hostProgrammeLodgingSetup,
          close: view.busy
              ? null
              : () {
                  setState(() => _editing = null);
                  _controller.refresh();
                },
        ),
        HostProgrammeLodgingSetupBody(
          key: ObjectKey(editing),
          initial: editing,
          busy: view.busy,
          error: view.error,
          resolveDates: (arrival, departure) => _controller.resolveDates(
            editing.catalog.timezone,
            arrival,
            departure,
          ),
          onSave: (draft, adoptions) async {
            await _controller.saveDraft(draft, adoptions: adoptions);
            if (mounted) setState(() => _editing = null);
          },
        ),
      );
    }
    final review = view.review;
    if (review == null) {
      return (
        _plainBar,
        CatchPageBody.screen(
          children: [
            CatchEmptyState(
              icon: CatchIcons.hotel,
              title: l10n.hostProgrammeLodgingSetupMissing,
            ),
            if (view.error case final error?)
              CatchNotice.inline(
                tone: CatchNoticeTone.danger,
                icon: CatchIcons.error,
                body: appErrorMessage(
                  error,
                  l10n: l10n,
                  context: AppErrorContext.event,
                ),
              ),
            CatchButton(
              key: const ValueKey<String>('host-programme-lodging-start-setup'),
              label: l10n.hostProgrammeLodgingSetup,
              fullWidth: true,
              onPressed: view.busy ? null : () => _action(_openSetup),
            ),
            CatchButton(
              key: const ValueKey<String>(
                'host-programme-lodging-start-membership',
              ),
              label: l10n.hostProgrammeLodgingMembershipTitle,
              variant: CatchButtonVariant.secondary,
              fullWidth: true,
              onPressed: view.busy ? null : () => _action(_openMembership),
            ),
          ],
        ),
      );
    }
    return (
      null,
      HostProgrammeLodgingBody(
        state: view,
        review: review,
        onBack: _back,
        onPreview: _destinations,
        onMove: _move,
        onDecide: (action, {hotelId}) =>
            _action(() => _controller.decide(action, hotelId: hotelId)),
        onMembership: () => _action(_openMembership),
        onEditSetup: () => _action(_openSetup),
        onRegenerate: () => _action(_controller.regenerate),
        onRefresh: _controller.refresh,
      ),
    );
  }
}
