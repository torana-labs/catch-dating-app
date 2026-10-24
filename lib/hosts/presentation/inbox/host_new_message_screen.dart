import 'package:catch_dating_app/auth/data/auth_repository.dart';
import 'package:catch_dating_app/core/app_error_message.dart';
import 'package:catch_dating_app/core/presentation/catch_ui_copy.dart';
import 'package:catch_dating_app/core/riverpod_ui/catch_async_value_adapter.dart';
import 'package:catch_dating_app/core/riverpod_ui/catch_localized_error_state.dart';
import 'package:catch_dating_app/core/riverpod_ui/catch_notice_feedback.dart';
import 'package:catch_dating_app/core/schema_contracts/generated/field_constraints.g.dart';
import 'package:catch_dating_app/hosts/data/crm/host_communication_repository.dart';
import 'package:catch_dating_app/hosts/domain/crm/host_audience_contact.dart';
import 'package:catch_dating_app/hosts/domain/crm/host_communication_plan.dart';
import 'package:catch_dating_app/hosts/presentation/customers/host_customer_row.dart';
import 'package:catch_dating_app/hosts/presentation/customers/host_customers_controller.dart';
import 'package:catch_dating_app/hosts/presentation/customers/host_customers_screen_state.dart';
import 'package:catch_dating_app/hosts/presentation/inbox/host_inbox_view_model.dart';
import 'package:catch_dating_app/hosts/presentation/inbox/host_inbox_whatsapp_pages_controller.dart';
import 'package:catch_dating_app/l10n/l10n.dart';
import 'package:catch_dating_app/matches/data/match_repository.dart';
import 'package:catch_dating_app/routing/go_router.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

class HostNewMessageSelection {
  const HostNewMessageSelection({
    required this.endpointId,
    required this.scope,
  });
  final String endpointId;
  final HostInboxScope scope;
}

class HostNewMessageScreen extends ConsumerStatefulWidget {
  const HostNewMessageScreen({super.key, required this.organizerId});
  final String organizerId;
  @override
  ConsumerState<HostNewMessageScreen> createState() =>
      _HostNewMessageScreenState();
}

class _HostNewMessageScreenState extends ConsumerState<HostNewMessageScreen> {
  String _query = '';
  String? _contactId;
  String? _name;
  bool _opening = false;

  @override
  Widget build(BuildContext context) {
    final request = HostCustomersDirectoryRequest(
      organizerId: widget.organizerId,
      search: _query,
      sort: HostCustomerSort.name,
    );
    final directory = catchAsyncStateFromAsyncValue(
      ref.watch(hostCustomersDirectoryControllerProvider(request)),
    );
    return CatchRouteScaffold(
      topBarBuilder: (_, scrolledUnder) => CatchTopBar.route(
        title: context.l10n.hostInboxNewMessage,
        navigation: CatchTopBarNavigation(
          mode: CatchTopBarNavigationMode.back,
          onPressed: () {
            if (_opening) return;
            if (_contactId != null) {
              setState(() {
                _contactId = null;
                _name = null;
              });
            } else {
              Navigator.of(context).pop();
            }
          },
        ),
      ),
      body: CatchRouteBody.fullBleed(
        child: CustomScrollView(
          slivers: [
            if (_contactId == null) ...[
              SliverToBoxAdapter(
                child: CatchSection.content(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      CatchText(
                        context.l10n.hostInboxChoosePerson,
                        variant: CatchTextVariant.supporting,
                      ),
                      gapH12,
                      CatchSearchField.expanded(
                        copy: catchSearchFieldCopy(context.l10n),
                        value: _query,
                        contract: CatchContractConstraints
                            .mobileFormStateChatsInboxSearchQuery,
                        placeholder: context.l10n.hostInboxFindPerson,
                        onChanged: (value) => setState(() => _query = value),
                      ),
                    ],
                  ),
                ),
              ),
              SliverToBoxAdapter(
                child: CatchSection.rows(
                  children: [
                    CatchField.navigate(
                      content: CatchRecordLayout(
                        title: context.l10n.hostInboxAddPerson,
                        icon: CatchIcons.personAddAlt1Outlined,
                      ),
                      onActivate: _addPerson,
                    ),
                  ],
                ),
              ),
              if (directory.isLoading && !directory.hasData)
                CatchSection.sliverLoadingRows(
                  layoutBuilder: (_, _) => const CatchPersonLayout.placeholder(
                    hasSupportingText: true,
                    hasBadge: true,
                  ),
                ),
              if (directory.hasError)
                SliverToBoxAdapter(
                  child: CatchLocalizedErrorState(
                    directory.error!,
                    context: AppErrorContext.club,
                    onRetry: () => ref.invalidate(
                      hostCustomersDirectoryControllerProvider(request),
                    ),
                  ),
                ),
              if (directory.value case final page?) ...[
                CatchSection.sliverRows(
                  itemCount: page.contacts.length,
                  itemBuilder: (context, index) {
                    final contact = page.contacts[index];
                    return CatchField.navigate(
                      key: ValueKey('new-message-${contact.contactId}'),
                      content: hostCustomerPersonLayout(context, contact),
                      onActivate: () => setState(() {
                        _contactId = contact.contactId;
                        _name = contact.displayName;
                      }),
                    );
                  },
                ),
                if (page.contacts.isEmpty)
                  SliverToBoxAdapter(
                    child: CatchSection.content(
                      child: CatchText(
                        context.l10n.hostCustomersNoResults,
                        variant: CatchTextVariant.supporting,
                      ),
                    ),
                  ),
                if (page.canLoadMore)
                  SliverToBoxAdapter(
                    child: CatchSection.content(
                      child: CatchButton(
                        label: context.l10n.hostInboxMoreConversations,
                        onPressed: () => ref
                            .read(
                              hostCustomersDirectoryControllerProvider(
                                request,
                              ).notifier,
                            )
                            .loadMore(),
                      ),
                    ),
                  ),
              ],
            ] else
              SliverToBoxAdapter(
                child: HostNewMessageRouteSection(
                  organizerId: widget.organizerId,
                  contactId: _contactId!,
                  name: _name,
                  opening: _opening,
                  onStartCatch: () => _startCatch(_contactId!),
                ),
              ),
            const CatchScrollTerminalGap.sliver(),
          ],
        ),
      ),
    );
  }

  Future<void> _startCatch(String id) async {
    if (_opening) return;
    final accountId = catchAsyncStateFromAsyncValue(
      ref.read(uidProvider),
    ).value;
    if (accountId == null) return;
    setState(() => _opening = true);
    try {
      final matchId = await ref
          .read(hostCustomersControllerProvider)
          .startConversation(organizerId: widget.organizerId, contactId: id);
      if (!mounted) return;
      final match = await ref.read(matchStreamProvider(matchId).future);
      if (!mounted) return;
      final uid = catchAsyncStateFromAsyncValue(ref.read(uidProvider)).value;
      if (match == null ||
          uid == null ||
          uid != accountId ||
          !match.isClubHostInquiry ||
          match.clubId != widget.organizerId ||
          (match.user1Id != uid && match.user2Id != uid)) {
        throw StateError('Conversation is not available in this workspace.');
      }
      if (mounted) {
        Navigator.of(context).pop(
          HostNewMessageSelection(
            endpointId: matchId,
            scope: match.eventIds.isEmpty
                ? const HostInboxScope.general()
                : HostInboxScope.event(match.eventIds.last),
          ),
        );
      }
    } on Object catch (error) {
      if (mounted) {
        showCatchNoticeError(
          context,
          error,
          errorContext: AppErrorContext.chat,
        );
      }
    } finally {
      if (mounted) setState(() => _opening = false);
    }
  }

  Future<void> _addPerson() async {
    final accountId = catchAsyncStateFromAsyncValue(
      ref.read(uidProvider),
    ).value;
    final created = await context.pushNamed<HostCreatedCustomer>(
      Routes.hostAddCustomerScreen.name,
      queryParameters: {'organizerId': widget.organizerId},
    );
    if (mounted &&
        created != null &&
        accountId ==
            catchAsyncStateFromAsyncValue(ref.read(uidProvider)).value) {
      ref.invalidate(hostCustomersDirectoryControllerProvider);
      setState(() {
        _contactId = created.contactId;
        _name = created.displayName;
      });
    }
  }
}

class HostNewMessageRouteSection extends ConsumerWidget {
  const HostNewMessageRouteSection({
    super.key,
    required this.organizerId,
    required this.contactId,
    required this.name,
    required this.opening,
    required this.onStartCatch,
  });
  final String organizerId;
  final String contactId;
  final String? name;
  final bool opening;
  final VoidCallback onStartCatch;
  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final id = contactId;
    final provider = hostCommunicationPlanProvider(organizerId, id);
    final result = catchAsyncStateFromAsyncValue(ref.watch(provider));
    final plan = result.value;
    final valid =
        plan != null &&
        plan.organizerId == organizerId &&
        plan.singleRecipient.contactId == id;
    final catchAvailable =
        valid &&
        plan.singleRecipient.outcome == HostCommunicationOutcome.inCatch;
    final whatsappState = catchAsyncStateFromAsyncValue(
      ref.watch(hostInboxWhatsappPagesProvider(organizerId)),
    );
    final whatsappPage = whatsappState.value;
    final whatsapp = whatsappPage?.threads
        .where((t) => t.contactId == id)
        .firstOrNull;
    final whatsappComplete =
        whatsappPage != null &&
        whatsappPage.nextCursor == null &&
        whatsappPage.error == null;
    return CatchSectionList(
      emptyStateOmitted: true,
      children: [
        CatchSection.rows(
          children: [
            CatchField.read(
              content: CatchPersonLayout(
                name:
                    name ??
                    plan?.singleRecipient.displayName ??
                    context.l10n.hostInboxNewMessage,
              ),
            ),
          ],
        ),
        if (result.isLoading && !valid)
          CatchSection.loadingRows(
            title: context.l10n.hostInboxAvailableRoutes,
            layouts: [
              CatchRecordLayout.placeholder(
                icon: CatchIcons.chatBubbleOutlineRounded,
              ),
              CatchRecordLayout.placeholder(
                icon: CatchIcons.personOutlineRounded,
              ),
            ],
          ),
        if (result.hasError)
          CatchSection.content(
            child: CatchLocalizedErrorState(
              result.error!,
              context: AppErrorContext.chat,
              onRetry: () => ref.invalidate(provider),
            ),
          ),
        if (valid)
          CatchSection.rows(
            title: context.l10n.hostInboxAvailableRoutes,
            children: [
              if (catchAvailable)
                CatchField.navigate(
                  content: CatchRecordLayout(
                    title: context.l10n.hostInboxMessageVia(
                      channel: context.l10n.hostInboxCatchChannel,
                    ),
                    icon: CatchIcons.chatBubbleOutlineRounded,
                  ),
                  states: {if (opening) WidgetState.disabled},
                  onActivate: onStartCatch,
                ),
              if (whatsapp != null)
                CatchField.navigate(
                  content: CatchRecordLayout(
                    title: context.l10n.hostInboxMessageVia(
                      channel: context.l10n.hostInboxWhatsappReplyChannel,
                    ),
                    icon: CatchIcons.chatBubbleOutlineRounded,
                    description: whatsapp.serviceWindowOpen
                        ? null
                        : context.l10n.hostInboxWhatsappWindowClosed,
                  ),
                  onActivate: () => Navigator.of(context).pop(
                    HostNewMessageSelection(
                      endpointId: whatsapp.threadId,
                      scope: whatsapp.eventIds.isEmpty
                          ? const HostInboxScope.general()
                          : HostInboxScope.event(whatsapp.eventIds.last),
                    ),
                  ),
                ),
              CatchField.navigate(
                content: CatchRecordLayout(
                  title: context.l10n.hostInboxOpenPerson,
                  icon: CatchIcons.personOutlineRounded,
                ),
                onActivate: () => context.pushNamed(
                  Routes.hostCustomerDetailScreen.name,
                  pathParameters: {'contactId': id},
                  queryParameters: {'organizerId': organizerId},
                ),
              ),
            ],
          ),
        if (!whatsappComplete && whatsapp == null)
          CatchSection.content(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                CatchText(
                  context.l10n.hostInboxPartialSources,
                  variant: CatchTextVariant.supporting,
                ),
                if (whatsappPage?.nextCursor != null)
                  CatchButton(
                    label: context.l10n.hostInboxMoreConversations,
                    onPressed: whatsappPage!.loadingMore
                        ? null
                        : () => ref
                              .read(
                                hostInboxWhatsappPagesProvider(
                                  organizerId,
                                ).notifier,
                              )
                              .loadMore(),
                  ),
                if (whatsappState.hasError)
                  CatchButton(
                    label: context.l10n.sharedActionTryAgain,
                    onPressed: () => ref.invalidate(
                      hostInboxWhatsappPagesProvider(organizerId),
                    ),
                  ),
              ],
            ),
          ),
        if (valid && !catchAvailable && whatsapp == null && whatsappComplete)
          CatchSection.content(
            child: CatchText(
              context.l10n.hostInboxNewMessageUnavailable,
              variant: CatchTextVariant.supporting,
            ),
          ),
      ],
    );
  }
}
