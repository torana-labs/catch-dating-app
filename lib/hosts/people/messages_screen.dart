import 'dart:async';

import 'package:catch_dating_app/contexts/account/data/auth_repository.dart';
import 'package:catch_dating_app/contexts/audience/data/crm/host_whatsapp_repository.dart';
import 'package:catch_dating_app/hosts/people/conversation/conversation_body.dart';
import 'package:catch_dating_app/hosts/people/conversation/conversation_controller.dart';
import 'package:catch_dating_app/hosts/people/conversation/conversation_drafts.dart';
import 'package:catch_dating_app/hosts/people/conversation/conversation_pages_controller.dart';
import 'package:catch_dating_app/hosts/people/conversation/conversation_people.dart';
import 'package:catch_dating_app/hosts/people/conversation/conversation_programme_controller.dart';
import 'package:catch_dating_app/hosts/people/conversation/conversation_screen.dart';
import 'package:catch_dating_app/hosts/people/messages_body.dart';
import 'package:catch_dating_app/hosts/people/messages_controller.dart';
import 'package:catch_dating_app/hosts/people/messages_state.dart';
import 'package:catch_dating_app/hosts/people/people_controller.dart';
import 'package:catch_dating_app/hosts/people/people_screen.dart';
import 'package:catch_dating_app/hosts/people/widgets/people_scope_body.dart';
import 'package:catch_l10n/l10n.dart';
import 'package:catch_platform/cache/app_clock.dart';
import 'package:catch_platform/riverpod_ui/catch_async_value_adapter.dart';
import 'package:catch_platform/routing/route_contract.dart';
import 'package:catch_tokens/catch_tokens.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

/// The People tab's Messages view: every conversation with the organizer,
/// Catch and WhatsApp together, newest first, narrowed by the chips, a
/// name search and a scope (an event with its Booked and Prospective
/// people, a programme, or General inquiries).
///
/// It resolves the organizer, keeps the chip, scope, segment, search and
/// the open conversation, watches [hostMessagesControllerProvider] and
/// opens a conversation, Automatic messages or the compose screen. The open
/// conversation ([HostConversationScreen]) replaces the list on a phone and
/// sits beside it on a wider window; it is kept in the route as
/// `threadId` with its `eventId`, `scope=general` or `programId`.
class HostMessagesScreen extends ConsumerStatefulWidget {
  const HostMessagesScreen({
    super.key,
    this.initialOrganizerId,
    this.threadId,
    this.threadScope,
    this.initialScope,
    this.initialSegment = HostInboxAudienceSegment.booked,
    this.now,
  });

  final String? initialOrganizerId;

  /// The open conversation: a person (`uid:`, `contact:`) or one of their
  /// sources (a Catch conversation id or a WhatsApp thread id).
  final String? threadId;

  /// The scope the open conversation is read in; null reads it from the
  /// conversation itself.
  final HostInboxScope? threadScope;

  /// The scope the list opens on; null lists every conversation.
  final HostInboxScope? initialScope;
  final HostInboxAudienceSegment initialSegment;

  /// A fixed clock for previews and tests; null follows the app clock.
  final DateTime? now;

  @override
  ConsumerState<HostMessagesScreen> createState() => _HostMessagesScreenState();
}

class _HostMessagesScreenState extends ConsumerState<HostMessagesScreen> {
  HostMessagesFilter _filter = HostMessagesFilter.all;
  late HostInboxScope? _scope = widget.initialScope;
  late HostInboxAudienceSegment _segment = widget.initialSegment;
  String _query = '';

  /// Reply drafts for every conversation opened here, by person, scope and
  /// route; cleared when the account changes.
  final _drafts = HostReplyDrafts();
  String? _accountId;

  @override
  void dispose() {
    _drafts.dispose();
    super.dispose();
  }

  @override
  void didUpdateWidget(covariant HostMessagesScreen oldWidget) {
    super.didUpdateWidget(oldWidget);
    final scope = widget.initialScope;
    if (scope != null && scope != oldWidget.initialScope) {
      _scope = scope;
      _segment = widget.initialSegment;
    }
  }

  @override
  Widget build(BuildContext context) => CatchRoot(
    // The size class is read below the root that measures the window.
    child: Builder(
      builder: (context) {
        final split =
            CatchRootScope.sizeClassOf(context) != CatchWindowSize.compact;
        final uid = catchAsyncStateFromAsyncValue(ref.watch(uidProvider));
        if (!uid.isLoading) {
          if (_accountId != null && _accountId != uid.value) {
            // Cleared after this frame: the open conversation listens.
            WidgetsBinding.instance.addPostFrameCallback((_) {
              if (mounted) _drafts.clear();
            });
          }
          _accountId = uid.value;
        }
        final l10n = context.l10n;
        final now = widget.now ?? ref.read(appClockProvider).now();
        final scope = ref.watch(
          hostPeopleOrganizerProvider(widget.initialOrganizerId),
        );
        final organizer = scope.organizer;
        final threadId = widget.threadId?.trim();
        final conversation =
            organizer == null || threadId == null || threadId.isEmpty
            ? null
            : HostConversationRequest(
                organizerId: organizer.id,
                selection: threadId,
                scope: widget.threadScope,
              );
        // On a phone the open conversation fills the screen; its pane
        // header carries the person, back and the actions.
        final fullConversation = conversation != null && !split;
        final Widget body;
        if (fullConversation) {
          body = HostConversationScreen(
            key: ValueKey<HostConversationRequest>(conversation),
            request: conversation,
            drafts: _drafts,
            presentation: HostConversationPresentation.pane,
            onBack: () => _closeThread(organizer!.id),
          );
        } else if (organizer == null) {
          body = HostPeopleScopeBody(
            organizer: scope,
            onRetry: () => retryHostPeopleOrganizer(ref, scope.uid),
            onSignIn: () => context.go(Routes.authScreen.path),
          );
        } else {
          final request = HostMessagesRequest(
            organizerId: organizer.id,
            day: DateTime(now.year, now.month, now.day),
            filter: _filter,
            scope: _scope,
            segment: _segment,
            query: _query,
          );
          final list = HostMessagesBody(
            state: ref.watch(hostMessagesControllerProvider(request)),
            now: now,
            selectedThreadId: threadId,
            onView: (view) => openHostPeopleView(context, view, organizer.id),
            onFilter: (filter) => setState(() => _filter = filter),
            onScope: (scope) => setState(() {
              _scope = scope;
              _segment = HostInboxAudienceSegment.booked;
            }),
            onSegment: (segment) => setState(() => _segment = segment),
            onSearch: (query) => setState(() => _query = query),
            onMoreCatch: _loadMoreCatch,
            onMoreWhatsapp: () => ref
                .read(hostWhatsappThreadPagesProvider(organizer.id).notifier)
                .loadMore(),
            onOpenThread: (thread) => context.goNamed(
              Routes.hostInboxScreen.name,
              queryParameters: {
                'organizerId': organizer.id,
                'threadId': thread.personId,
                ...hostConversationScopeQuery(switch (_scope) {
                  final scope? when !scope.isProgram => scope,
                  _ => switch (thread.eventId) {
                    final eventId? => HostInboxScope.event(eventId),
                    null => const HostInboxScope.general(),
                  },
                }),
              },
            ),
            onSends: () => context.goNamed(
              Routes.hostInboxScreen.name,
              queryParameters: {
                'organizerId': organizer.id,
                'workspace': 'campaigns',
              },
            ),
            onAutomations: () => context.pushNamed(
              Routes.hostAudienceAutomationsScreen.name,
              queryParameters: {'organizerId': organizer.id},
            ),
            onRetry: () {
              retryHostMessagesReads(ref, organizer.id);
              if (_scope?.programId case final programId?) {
                ref.invalidate(
                  hostInboxProgramAudiencePagesProvider(
                    organizer.id,
                    programId,
                  ),
                );
              }
            },
          );
          body = split
              ? CatchPaneLayout(
                  pattern: CatchPaneLayoutMode.listDetail,
                  detailOpen: conversation != null,
                  children: [
                    CatchScrollView(primary: false, child: list),
                    if (conversation != null)
                      HostConversationScreen(
                        key: ValueKey<HostConversationRequest>(conversation),
                        request: conversation,
                        drafts: _drafts,
                        presentation: HostConversationPresentation.pane,
                        onBack: () => _closeThread(organizer.id),
                      )
                    else
                      CatchScrollView(
                        primary: false,
                        child: CatchPageBody(
                          child: CatchEmptyState(
                            icon: CatchIcons.chat,
                            title: l10n.hostInboxSelectConversationTitle,
                            message: l10n.hostInboxSelectConversationBody,
                          ),
                        ),
                      ),
                  ],
                )
              : list;
        }
        return CatchScreen(
          key: const ValueKey<String>('host-messages-screen'),
          bodyScrolls: !fullConversation && (!split || organizer == null),
          topBar: fullConversation
              ? null
              : CatchTopBar(
                  variant: CatchTopBarVariant.tabHome,
                  kicker: organizer?.name,
                  title: l10n.hostPeopleTitle,
                  actions: [
                    CatchButton(
                      label: l10n.hostPeopleMessage,
                      leading: CatchIcon(
                        CatchIcons.add,
                        size: CatchIconSize.md,
                      ),
                      onPressed: organizer == null
                          ? null
                          : () => context.pushNamed(
                              Routes.hostNewMessageScreen.name,
                              queryParameters: {'organizerId': organizer.id},
                            ),
                    ),
                  ],
                ),
          body: body,
        );
      },
    ),
  );

  void _closeThread(String organizerId) => context.goNamed(
    Routes.hostInboxScreen.name,
    queryParameters: {'organizerId': organizerId},
  );

  void _loadMoreCatch() {
    final uid = catchAsyncStateFromAsyncValue(ref.read(uidProvider)).value;
    if (uid == null) return;
    unawaited(ref.read(hostInboxCatchPagesProvider(uid).notifier).loadMore());
  }
}

/// A conversation scope as route query: `eventId`, `programId` or
/// `scope=general`.
Map<String, String> hostConversationScopeQuery(HostInboxScope scope) =>
    switch (scope.kind) {
      HostInboxScopeKind.event => {'eventId': scope.eventId!},
      HostInboxScopeKind.program => {'programId': scope.programId!},
      HostInboxScopeKind.general => const {'scope': 'general'},
    };
