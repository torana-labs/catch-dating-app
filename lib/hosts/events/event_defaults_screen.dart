import 'dart:async';

import 'package:catch_dating_app/contexts/account/data/auth_repository.dart';
import 'package:catch_dating_app/contexts/events/data/manager_event_setup_defaults_journal.dart';
import 'package:catch_dating_app/contexts/events/data/manager_event_setup_defaults_repository.dart';
import 'package:catch_dating_app/contexts/events/domain/manager_event_setup_preferences.dart';
import 'package:catch_dating_app/hosts/events/event_commands_controller.dart';
import 'package:catch_dating_app/hosts/events/event_defaults_body.dart';
import 'package:catch_dating_app/hosts/events/event_defaults_controller.dart';
import 'package:catch_dating_app/hosts/organizer/event_policy_screen.dart';
import 'package:catch_l10n/l10n.dart';
import 'package:catch_platform/errors/app_error_message.dart';
import 'package:catch_platform/riverpod_ui/catch_notice_feedback.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

/// The organizer's event defaults: what every new event starts with. It
/// watches [hostEventDefaultsControllerProvider] and saves on change
/// through the manager defaults command, and opens the event policy
/// (activity, admission, ages and cancellation) for the rest.
///
/// Each save is kept on the phone before it is sent, with its exact
/// revision. One that is not confirmed (offline, or a lost answer) stays,
/// and the screen offers to send the same request again before any other
/// change, because it may already have reached Catch.
class HostEventDefaultsScreen extends ConsumerStatefulWidget {
  const HostEventDefaultsScreen({
    super.key,
    required this.organizerId,
    this.journal = const ManagerEventSetupDefaultsJournal(),
  });

  final String organizerId;

  /// Where an unconfirmed save waits; replaced in tests.
  final ManagerEventSetupDefaultsJournal journal;

  @override
  ConsumerState<HostEventDefaultsScreen> createState() =>
      _HostEventDefaultsScreenState();
}

class _HostEventDefaultsScreenState
    extends ConsumerState<HostEventDefaultsScreen> {
  ManagerEventSetupDefaultsUpdateRequest? _unresolved;

  @override
  void initState() {
    super.initState();
    unawaited(_loadUnresolved());
  }

  Future<String?> _uid() => ref.read(uidProvider.future);

  Future<void> _loadUnresolved() async {
    try {
      final uid = await _uid();
      if (uid == null) return;
      final pending = await widget.journal.load(
        userId: uid,
        organizerId: widget.organizerId,
      );
      if (mounted) setState(() => _unresolved = pending);
    } on Object {
      // An unreadable journal leaves editing as it was; the next save
      // writes a fresh one.
    }
  }

  /// Keeps [request] on the phone, sends it, and lets it go once Catch has
  /// it. A failure leaves it for Retry.
  Future<void> _send(ManagerEventSetupDefaultsUpdateRequest request) async {
    final uid = await _uid();
    if (uid == null || !mounted) return;
    try {
      await HostEventCommands.defaultsMutation.run(ref, (tx) async {
        await widget.journal.save(userId: uid, request: request);
        if (mounted) setState(() => _unresolved = request);
        await tx
            .get(managerEventSetupDefaultsRepositoryProvider)
            .update(request);
        await widget.journal.clear(userId: uid, request: request);
      });
      if (mounted) setState(() => _unresolved = null);
    } on Object {
      // The mutation listener shows the error; the request stays for Retry.
    }
  }

  @override
  Widget build(BuildContext context) {
    final l10n = context.l10n;
    final organizerId = widget.organizerId;
    final state = ref.watch(hostEventDefaultsControllerProvider(organizerId));
    final saving = ref.watch(HostEventCommands.defaultsMutation).isPending;
    listenToCatchMutationErrors(
      context,
      ref,
      mutations: [HostEventCommands.defaultsMutation],
      errorContext: AppErrorContext.organizer,
    );
    void saveDefaults(
      ManagerEventSetupPreferences Function(ManagerEventSetupPreferences) next,
    ) {
      if (_unresolved != null) return;
      final current = ref
          .read(managerEventSetupDefaultsViewProvider(organizerId))
          .value
          ?.defaults;
      if (current == null) return;
      final request = ManagerEventSetupDefaultsUpdateRequest.forChange(
        current: current,
        requestId: hostEventRequestId(),
        next: next(current.preferences),
      );
      if (request.changes.isEmpty) return;
      unawaited(_send(request));
    }

    final unresolved = _unresolved;
    return CatchRoot(
      child: CatchScreen(
        key: const ValueKey<String>('host-event-defaults-screen'),
        topBar: CatchTopBar(
          variant: CatchTopBarVariant.tool,
          back: CatchTopBarBack(label: l10n.hostEventsBack),
          title: l10n.hostEventsDefaultsTitle,
          kicker: l10n.hostEventsDefaultsKicker,
        ),
        bodyScrolls: false,
        body: HostEventDefaultsBody(
          state: state,
          saving: saving,
          onCollection: (option) => saveDefaults(
            (preferences) => preferences.copyWith(collectionPreference: option),
          ),
          onChange: (next) => saveDefaults((_) => next),
          onRetryUpdate: unresolved == null
              ? null
              : () => unawaited(_send(unresolved)),
          onEdit: () => unawaited(
            Navigator.of(context).push(
              MaterialPageRoute<void>(
                builder: (_) =>
                    OrganizerEventPolicyScreen(organizerId: organizerId),
              ),
            ),
          ),
          onRetry: () => ref.invalidate(
            managerEventSetupDefaultsViewProvider(organizerId),
          ),
        ),
      ),
    );
  }
}
