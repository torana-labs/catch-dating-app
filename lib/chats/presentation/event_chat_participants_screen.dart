import 'dart:async';
import 'package:catch_dating_app/auth/data/auth_repository.dart';
import 'package:catch_dating_app/chats/domain/event_chat_participant.dart';
import 'package:catch_dating_app/chats/presentation/event_chat_participants_controller.dart';
import 'package:catch_dating_app/core/presentation/catch_ui_copy.dart';
import 'package:catch_dating_app/core/riverpod_ui/catch_async_boundary.dart';
import 'package:catch_dating_app/core/riverpod_ui/catch_async_value_adapter.dart';
import 'package:catch_dating_app/l10n/l10n.dart';
import 'package:catch_dating_app/routing/route_contract.dart';
import 'package:catch_tokens/catch_tokens.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

class EventChatParticipantsScreen extends ConsumerStatefulWidget {
  const EventChatParticipantsScreen({super.key, required this.eventId});
  final String eventId;
  @override
  ConsumerState<EventChatParticipantsScreen> createState() =>
      _EventChatParticipantsScreenState();
}

class _EventChatParticipantsScreenState
    extends ConsumerState<EventChatParticipantsScreen>
    with WidgetsBindingObserver {
  bool _resumed = true;
  bool _ownedDialog = false;
  bool _dialogBackgrounded = false;
  bool? _active;
  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addObserver(this);
    _resumed =
        WidgetsBinding.instance.lifecycleState == null ||
        WidgetsBinding.instance.lifecycleState == AppLifecycleState.resumed;
  }

  @override
  void dispose() {
    WidgetsBinding.instance.removeObserver(this);
    super.dispose();
  }

  @override
  void didChangeAppLifecycleState(AppLifecycleState state) {
    if (state != AppLifecycleState.resumed && _ownedDialog) {
      _dialogBackgrounded = true;
    }
    setState(() => _resumed = state == AppLifecycleState.resumed);
  }

  void _syncActive(bool active) {
    if (_active == active) {
      return;
    }
    _active = active;
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (!mounted || _active != active) {
        return;
      }
      ref
          .read(
            eventChatParticipantsControllerProvider(widget.eventId).notifier,
          )
          .setForeground(active);
    });
  }

  Future<void> _manageMember(
    EventChatParticipantsState reviewed,
    EventChatParticipant person,
    String action,
  ) async {
    if (ref.read(uidProvider).asData?.value != reviewed.uid ||
        reviewed.access?.canManage != true) {
      return;
    }
    final l = context.l10n;
    final label = switch (action) {
      'remove' => l.eventChatRemoveMember,
      'ban' => l.eventChatBanMember,
      _ => l.eventChatReinstateMember,
    };
    final message = switch (action) {
      'remove' => l.eventChatRemoveMemberDisclosure,
      'ban' => l.eventChatBanMemberDisclosure,
      _ => l.eventChatReinstateMemberDisclosure,
    };
    _ownedDialog = true;
    _dialogBackgrounded = false;
    try {
      final confirmed = await showCatchConfirmDialog(
        context: context,
        copy: catchDialogCopy(l),
        title: label,
        message: message,
        confirmLabel: label,
        danger: action != 'reinstate',
      );
      if (confirmed != true ||
          !mounted ||
          _dialogBackgrounded ||
          !_resumed ||
          ref.read(uidProvider).asData?.value != reviewed.uid) {
        return;
      }
      final latest = ref
          .read(eventChatParticipantsControllerProvider(widget.eventId))
          .asData
          ?.value;
      if (latest?.access?.canManage != true ||
          !latest!.page.items.any(
            (row) =>
                row.uid == person.uid &&
                row.membershipRevision == person.membershipRevision,
          )) {
        return;
      }
      await ref
          .read(
            eventChatParticipantsControllerProvider(widget.eventId).notifier,
          )
          .manageMember(person, action);
    } finally {
      _ownedDialog = false;
      if (mounted) {
        _syncActive(_resumed && (ModalRoute.isCurrentOf(context) ?? true));
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final provider = eventChatParticipantsControllerProvider(widget.eventId);
    final value = ref.watch(provider);
    final presented = catchAsyncStateFromAsyncValue(value);
    final active =
        _resumed && ((ModalRoute.isCurrentOf(context) ?? true) || _ownedDialog);
    _syncActive(active);
    return CatchRouteScaffold(
      topBarBuilder: (context, scrolledUnder) => CatchTopBar.route(
        title: context.l10n.eventChatParticipantsTitle,
        navigation: const CatchTopBarNavigation(
          mode: CatchTopBarNavigationMode.back,
        ),
        emphasis: scrolledUnder
            ? CatchTopBarEmphasis.divided
            : CatchTopBarEmphasis.plain,
        actions: [
          CatchIconAction.toolbar(
            tooltip: context.l10n.eventChatRefresh,
            icon: CatchIcons.refreshRounded,
            onPressed: !active || presented.isLoading
                ? null
                : () => unawaited(ref.read(provider.notifier).refresh()),
          ),
        ],
      ),
      body: CatchRouteBody.standardConstrained(
        child: !active
            ? const SizedBox.shrink()
            : CatchAsyncBoundary<EventChatParticipantsState>(
                value: value,
                retainDataOn: const {},
                onRetry: () => unawaited(ref.read(provider.notifier).refresh()),
                builder: (context, state) => EventChatParticipantsRowList(
                  state: state,
                  onOpen: (uid) => context.pushNamed(
                    Routes.eventParticipantProfileScreen.name,
                    pathParameters: {
                      'eventId': widget.eventId,
                      'participantUid': uid,
                    },
                    queryParameters: GoRouterState.of(
                      context,
                    ).uri.queryParameters,
                  ),
                  onLoadMore: () =>
                      unawaited(ref.read(provider.notifier).loadMore()),
                  onManage: (person, action) =>
                      unawaited(_manageMember(state, person, action)),
                ),
              ),
      ),
    );
  }
}

class EventChatParticipantsRowList extends StatelessWidget {
  const EventChatParticipantsRowList({
    super.key,
    required this.state,
    required this.onOpen,
    required this.onLoadMore,
    this.onManage,
  });
  final EventChatParticipantsState state;
  final ValueChanged<String> onOpen;
  final VoidCallback onLoadMore;
  final void Function(EventChatParticipant, String)? onManage;
  @override
  Widget build(BuildContext context) {
    final l = context.l10n;
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        CatchText(
          l.eventChatParticipantsDescription,
          variant: CatchTextVariant.bodyM,
          color: CatchTokens.of(context).ink,
        ),
        gapH24,
        if (state.page.items.isEmpty)
          CatchText(
            state.page.nextCursor == null
                ? l.eventChatParticipantsEmpty
                : l.eventChatParticipantsContinue,
            variant: CatchTextVariant.supporting,
          ),
        if (state.page.items.isNotEmpty)
          CatchSection.fieldRows(
            first: true,
            children: [
              for (final person in state.page.items)
                Row(
                  key: ValueKey('event-participant-${person.uid}'),
                  children: [
                    Expanded(
                      child: CatchField.nav(
                        copy: catchFieldCopy(l),
                        title: person.displayName,
                        body: [
                          if (person.uid == state.uid) l.eventChatYou,
                          person.isRemoved
                              ? l.eventChatMemberRemoved
                              : person.isBanned
                              ? l.eventChatMemberBanned
                              : person.isHost
                              ? l.eventChatParticipantHost
                              : l.eventChatParticipantAttendee,
                        ].join(' · '),
                        emphasis: CatchFieldEmphasis.title,
                        titleMaxLines: 3,
                        bodyMaxLines: 3,
                        onTap: person.isJoined
                            ? () => onOpen(person.uid)
                            : null,
                      ),
                    ),
                    if (state.access?.canManage == true &&
                        onManage != null &&
                        person.uid != state.uid &&
                        !person.isHost)
                      CatchActionMenu<String>(
                        tooltip: l.eventChatMemberActions,
                        items: [
                          if (person.isJoined)
                            CatchActionMenuItem(
                              value: 'remove',
                              label: l.eventChatRemoveMember,
                            ),
                          if (!person.isBanned)
                            CatchActionMenuItem(
                              value: 'ban',
                              label: l.eventChatBanMember,
                            ),
                          if (!person.isJoined)
                            CatchActionMenuItem(
                              value: 'reinstate',
                              label: l.eventChatReinstateMember,
                            ),
                        ],
                        onSelected: (action) => onManage!(person, action),
                      ),
                  ],
                ),
            ],
          ),
        if (state.page.nextCursor != null) ...[
          gapH24,
          CatchButton(
            label: l.eventChatParticipantsMore,
            variant: CatchButtonVariant.secondary,
            fullWidth: true,
            onPressed: onLoadMore,
          ),
        ],
      ],
    );
  }
}
