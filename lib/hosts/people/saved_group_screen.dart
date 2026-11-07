import 'dart:async';

import 'package:catch_dating_app/hosts/people/saved_group_body.dart';
import 'package:catch_dating_app/hosts/people/saved_group_controller.dart';
import 'package:catch_dating_app/hosts/people/saved_group_state.dart';
import 'package:catch_l10n/l10n.dart';
import 'package:catch_platform/errors/app_error_message.dart';
import 'package:catch_platform/riverpod_ui/catch_notice_feedback.dart';
import 'package:catch_platform/routing/route_contract.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

/// A saved group: its rules, who matches now, and Save group or Delete.
///
/// It watches [hostSavedGroupControllerProvider] and keeps the draft (the
/// At least value, and the name while the group is new). Save runs the
/// existing upsert with the attendance rule changed and every other rule
/// kept; Delete runs the existing archive; Message opens the existing
/// campaign composer for the group.
class HostSavedGroupScreen extends ConsumerStatefulWidget {
  const HostSavedGroupScreen({
    super.key,
    required this.organizerId,
    this.audienceId,
  });

  final String organizerId;

  /// The group to edit; null makes a new one.
  final String? audienceId;

  @override
  ConsumerState<HostSavedGroupScreen> createState() =>
      _HostSavedGroupScreenState();
}

class _HostSavedGroupScreenState extends ConsumerState<HostSavedGroupScreen> {
  final _name = TextEditingController();
  int? _atLeast;
  String? _createRequestId;

  @override
  void initState() {
    super.initState();
    _name.addListener(() => setState(() {}));
  }

  @override
  void dispose() {
    _name.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final l10n = context.l10n;
    final state = ref.watch(
      hostSavedGroupControllerProvider(widget.organizerId, widget.audienceId),
    );
    listenToCatchMutationErrors(
      context,
      ref,
      mutations: [
        HostSavedGroupCommands.saveMutation,
        HostSavedGroupCommands.deleteMutation,
      ],
      errorContext: AppErrorContext.organizer,
    );
    final saving = ref.watch(HostSavedGroupCommands.saveMutation).isPending;
    final deleting = ref.watch(HostSavedGroupCommands.deleteMutation).isPending;
    final busy = saving || deleting;
    final audience = state.audience;
    final creating = widget.audienceId == null;
    final atLeast = _atLeast ?? state.atLeast ?? 1;
    final changed = creating
        ? _name.text.trim().isNotEmpty
        : _atLeast != null && _atLeast != state.atLeast;
    final ready =
        state.status == HostSavedGroupStatus.ready && !state.handPicked;
    return CatchRoot(
      child: CatchScreen(
        key: const ValueKey<String>('host-saved-group-screen'),
        topBar: CatchTopBar(
          variant: CatchTopBarVariant.tool,
          title: audience?.name ?? l10n.hostPeopleGroupNew,
          kicker: l10n.hostPeopleGroupKicker,
          back: CatchTopBarBack(
            label: l10n.hostPeopleBackToPeople,
            onPressed: busy ? null : () => Navigator.of(context).maybePop(),
          ),
          action: audience == null
              ? null
              : CatchTopBarAction(
                  label: l10n.hostPeopleMessage,
                  onPressed: () => context.pushNamed(
                    Routes.hostInboxScreen.name,
                    queryParameters: {
                      'organizerId': widget.organizerId,
                      'workspace': 'campaigns',
                      'audienceId': audience.audienceId,
                      'compose': '1',
                    },
                  ),
                ),
        ),
        body: HostSavedGroupBody(
          state: state,
          atLeast: atLeast,
          name: creating ? _name : null,
          busy: busy,
          onAtLeast: (value) => setState(() => _atLeast = value),
          onOpenPerson: (person) => context.pushNamed(
            Routes.hostCustomerDetailScreen.name,
            pathParameters: {'contactId': person.contactId},
            queryParameters: {
              'organizerId': widget.organizerId,
              if (audience != null) '_parentAudienceId': audience.audienceId,
            },
            extra: person.displayName,
          ),
          onRetry: () {
            final id = widget.audienceId;
            if (id != null) refreshHostSavedGroup(ref, widget.organizerId, id);
          },
        ),
        dock: ready
            ? CatchDock(
                primary: CatchDockAction(
                  label: l10n.hostPeopleGroupSave,
                  loading: saving,
                  onPressed: changed && !busy
                      ? () => unawaited(_save(state, atLeast))
                      : null,
                ),
                secondary: audience == null
                    ? null
                    : CatchDockAction(
                        label: l10n.hostPeopleGroupDelete,
                        loading: deleting,
                        onPressed: busy
                            ? null
                            : () => unawaited(_delete(state)),
                      ),
              )
            : null,
      ),
    );
  }

  Future<void> _save(HostSavedGroupState state, int atLeast) async {
    final audience = state.audience;
    final requestId = audience == null
        ? _createRequestId ??= _newRequestId()
        : _newRequestId();
    try {
      final saved = await HostSavedGroupCommands.saveMutation.run(
        ref,
        (tx) => tx
            .get(hostSavedGroupCommandsProvider)
            .save(
              organizerId: widget.organizerId,
              requestId: requestId,
              name: audience?.name ?? _name.text.trim(),
              atLeast: atLeast,
              audience: audience,
            ),
      );
      if (!mounted) return;
      _createRequestId = null;
      refreshHostSavedGroup(ref, widget.organizerId, saved.audienceId);
      if (audience == null) {
        context.pushReplacementNamed(
          Routes.hostSavedAudienceDetailScreen.name,
          pathParameters: {'audienceId': saved.audienceId},
          queryParameters: {'organizerId': widget.organizerId},
        );
      } else {
        setState(() => _atLeast = null);
      }
    } on Object {
      // The mutation is watched for errors, which the screen shows.
    }
  }

  Future<void> _delete(HostSavedGroupState state) async {
    final audience = state.audience;
    if (audience == null) return;
    try {
      await HostSavedGroupCommands.deleteMutation.run(
        ref,
        (tx) => tx
            .get(hostSavedGroupCommandsProvider)
            .delete(organizerId: widget.organizerId, audience: audience),
      );
      if (!mounted) return;
      refreshHostSavedGroup(ref, widget.organizerId, audience.audienceId);
      await Navigator.of(context).maybePop();
    } on Object {
      // The mutation is watched for errors, which the screen shows.
    }
  }
}

String _newRequestId() =>
    '${DateTime.now().microsecondsSinceEpoch}-people-saved-group';
