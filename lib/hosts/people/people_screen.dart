import 'dart:async';

import 'package:catch_dating_app/contexts/audience/domain/crm/host_audience_contact.dart';
import 'package:catch_dating_app/hosts/people/duplicates/duplicates_controller.dart';
import 'package:catch_dating_app/hosts/people/duplicates/duplicates_screen.dart';
import 'package:catch_dating_app/hosts/people/people_body.dart';
import 'package:catch_dating_app/hosts/people/people_controller.dart';
import 'package:catch_dating_app/hosts/people/people_desktop_body.dart';
import 'package:catch_dating_app/hosts/people/people_state.dart';
import 'package:catch_dating_app/hosts/people/person_controller.dart';
import 'package:catch_dating_app/hosts/people/person_screen.dart';
import 'package:catch_dating_app/hosts/people/widgets/people_scope_body.dart';
import 'package:catch_dating_app/hosts/people/widgets/people_tab_bar.dart';
import 'package:catch_dating_app/hosts/presentation/customers/host_customers_controller.dart';
import 'package:catch_l10n/l10n.dart';
import 'package:catch_platform/device/external_share.dart';
import 'package:catch_platform/errors/app_error_message.dart';
import 'package:catch_platform/riverpod_ui/catch_notice_feedback.dart';
import 'package:catch_platform/routing/route_contract.dart';
import 'package:catch_tokens/catch_tokens.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

/// The People tab's People view: everyone who has come to or followed the
/// organizer, filtered by the projection's segments and saved groups.
///
/// On a phone it is the list and a person opens on their own page; on an
/// expanded window the list sits beside the person it selects. It resolves
/// the organizer, keeps the filter, search and selection, watches
/// [hostPeopleControllerProvider] and turns the body's callbacks into
/// navigation and the existing contact commands.
class HostPeopleScreen extends ConsumerStatefulWidget {
  const HostPeopleScreen({
    super.key,
    this.initialOrganizerId,
    this.initialContactId,
  });

  final String? initialOrganizerId;

  /// A person to select in the list pane on an expanded window.
  final String? initialContactId;

  @override
  ConsumerState<HostPeopleScreen> createState() => _HostPeopleScreenState();
}

class _HostPeopleScreenState extends ConsumerState<HostPeopleScreen> {
  HostPeopleFilter _filter = HostPeopleFilter.everyone;
  String _search = '';

  /// An export is being prepared or shared.
  bool _exporting = false;
  String? _selectedContactId;

  @override
  void initState() {
    super.initState();
    _selectedContactId = widget.initialContactId;
  }

  @override
  Widget build(BuildContext context) {
    listenToCatchMutationErrors(
      context,
      ref,
      mutations: [HostPeopleCommands.messageMutation],
      errorContext: AppErrorContext.chat,
    );
    listenToCatchMutationErrors(
      context,
      ref,
      mutations: [HostDuplicateCommands.undoMutation],
      errorContext: AppErrorContext.organizer,
    );
    return CatchRoot(
      // The size class is read below the root that measures the window.
      child: Builder(
        builder: (context) {
          final l10n = context.l10n;
          final expanded =
              CatchRootScope.sizeClassOf(context) == CatchWindowSize.expanded;
          final scope = ref.watch(
            hostPeopleOrganizerProvider(widget.initialOrganizerId),
          );
          final organizer = scope.organizer;

          final CatchTopBar? topBar = expanded
              ? null
              : CatchTopBar(
                  variant: CatchTopBarVariant.tabHome,
                  kicker: organizer?.name,
                  title: l10n.hostPeopleTitle,
                  actions: [
                    CatchIconAction.icon(
                      key: const ValueKey<String>('host-people-export'),
                      icon: CatchIcons.download,
                      tooltip: l10n.hostsHostAudienceExport,
                      onPressed: organizer == null || _exporting
                          ? null
                          : () => unawaited(_export(organizer.id)),
                    ),
                    CatchButton(
                      label: l10n.hostPeopleAdd,
                      leading: CatchIcon(
                        CatchIcons.add,
                        size: CatchIconSize.md,
                      ),
                      onPressed: organizer == null
                          ? null
                          : () => unawaited(_add(organizer.id)),
                    ),
                  ],
                );

          final Widget body;
          if (organizer == null) {
            body = HostPeopleScopeBody(
              organizer: scope,
              onRetry: () => retryHostPeopleOrganizer(ref, scope.uid),
              onSignIn: () => context.go(Routes.authScreen.path),
            );
          } else {
            final request = HostPeopleRequest(
              organizerId: organizer.id,
              filter: _filter,
              search: expanded ? _search : '',
            );
            final state = ref.watch(hostPeopleControllerProvider(request));
            void loadMore() => unawaited(
              ref
                  .read(hostPeopleDirectoryProvider(request).notifier)
                  .loadMore(),
            );
            void openView(HostPeopleView view) =>
                openHostPeopleView(context, view, organizer.id);
            final duplicates = ref.watch(
              hostPeopleDuplicateSummaryProvider(organizer.id),
            );
            void openDuplicates() => context.pushNamed(
              Routes.hostPeopleDuplicatesScreen.name,
              queryParameters: {'organizerId': organizer.id},
            );
            if (expanded) {
              final selectedId =
                  _selectedContactId ?? state.people.firstOrNull?.contactId;
              final messaging = ref
                  .watch(HostPeopleCommands.messageMutation)
                  .isPending;
              body = HostPeopleDesktopBody(
                state: state,
                selectedContactId: selectedId,
                person: selectedId == null
                    ? null
                    : ref.watch(
                        hostPersonControllerProvider(organizer.id, selectedId),
                      ),
                messaging: messaging,
                undoing: ref
                    .watch(HostDuplicateCommands.undoMutation)
                    .isPending,
                duplicates: duplicates,
                onOpenDuplicates: openDuplicates,
                onExport: _exporting
                    ? null
                    : () => unawaited(_export(organizer.id, search: _search)),
                onView: openView,
                onSearch: (value) => setState(() {
                  _search = value;
                  _selectedContactId = null;
                }),
                onSelectPerson: (contact) =>
                    setState(() => _selectedContactId = contact.contactId),
                onCompose: () => context.pushNamed(
                  Routes.hostNewMessageScreen.name,
                  queryParameters: {'organizerId': organizer.id},
                ),
                onMessagePerson: () {
                  if (selectedId == null) return;
                  unawaited(
                    messageHostPerson(
                      context,
                      ref,
                      organizerId: organizer.id,
                      contactId: selectedId,
                    ),
                  );
                },
                onAddTag: () {
                  final person = selectedId == null
                      ? null
                      : ref
                            .read(
                              hostPersonControllerProvider(
                                organizer.id,
                                selectedId,
                              ),
                            )
                            .detail;
                  if (person == null) return;
                  unawaited(addHostPersonTag(context, ref, person));
                },
                onLoadMore: loadMore,
                onRetry: () => retryHostPeopleReads(ref, request),
                onRetryPerson: () {
                  if (selectedId == null) return;
                  refreshHostPerson(ref, organizer.id, selectedId);
                },
                onUndoMerge: (merge) => unawaited(
                  confirmUndoHostMerge(
                    context,
                    ref,
                    organizerId: organizer.id,
                    merge: merge,
                  ),
                ),
              );
            } else {
              body = HostPeopleBody(
                state: state,
                duplicates: duplicates,
                onOpenDuplicates: openDuplicates,
                onView: openView,
                onFilter: (filter) => setState(() => _filter = filter),
                onOpenGroup: (group) => context.pushNamed(
                  Routes.hostSavedAudienceDetailScreen.name,
                  pathParameters: {'audienceId': group.audienceId},
                  queryParameters: {'organizerId': organizer.id},
                ),
                onOpenPerson: (contact) => _openPerson(organizer.id, contact),
                onLoadMore: loadMore,
                onRetry: () => retryHostPeopleReads(ref, request),
              );
            }
          }

          return CatchScreen(
            key: const ValueKey<String>('host-people-screen'),
            topBar: topBar,
            bodyScrolls: !expanded,
            body: body,
          );
        },
      ),
    );
  }

  void _openPerson(String organizerId, HostAudienceContact contact) =>
      context.pushNamed(
        Routes.hostCustomerDetailScreen.name,
        pathParameters: {'contactId': contact.contactId},
        queryParameters: {'organizerId': organizerId},
        extra: contact.displayName,
      );

  /// Exports the people this list shows (the chosen filter and, on wide
  /// windows, the search) as a CSV through the existing contact export, and
  /// shares the file. The commands are read before anything is awaited.
  Future<void> _export(String organizerId, {String search = ''}) async {
    if (_exporting) return;
    final l10n = context.l10n;
    final customers = ref.read(hostCustomersControllerProvider);
    final share = ref.read(externalShareControllerProvider);
    final query = HostPeopleRequest(
      organizerId: organizerId,
      filter: _filter,
      search: search,
    ).query;
    setState(() => _exporting = true);
    try {
      // provider-graph: ownership-widget-async:_HostPeopleScreenState._export:await:hostCustomersControllerProvider.exportCustomers watch CAT156 -- Export runs the existing contact export and shares the file; the screen holds only its local exporting flag. Move the flag into a mutation in the CAT156 migration.
      final export = await customers.exportCustomers(
        organizerId: organizerId,
        query: query,
      );
      // provider-graph: ownership-widget-async:_HostPeopleScreenState._export:await:externalShareControllerProvider.shareCsvFile watch CAT156 -- Sharing the exported file through the platform share sheet; mechanical.
      await share.shareCsvFile(
        csv: export.csv,
        fileName: export.fileName,
        subject: l10n.hostsHostAudienceExportSubject,
        text: export.truncated
            ? l10n.hostsHostAudienceExportTruncated
            : l10n.hostsHostAudienceExportCount(count: export.rowCount),
      );
    } on Object catch (error) {
      if (mounted) {
        showCatchNoticeError(
          context,
          error,
          errorContext: AppErrorContext.customer,
        );
      }
    } finally {
      if (mounted) setState(() => _exporting = false);
    }
  }

  Future<void> _add(String organizerId) async {
    final created = await context.pushNamed<Object?>(
      Routes.hostAddCustomerScreen.name,
      queryParameters: {'organizerId': organizerId},
    );
    if (!mounted || created == null) return;
    retryHostPeopleReads(
      ref,
      HostPeopleRequest(organizerId: organizerId, filter: _filter),
    );
  }
}

/// Moves between the People tab's views: People and Forms on the audience
/// route, Messages on the inbox route.
void openHostPeopleView(
  BuildContext context,
  HostPeopleView view,
  String organizerId,
) => switch (view) {
  HostPeopleView.people => context.goNamed(
    Routes.hostAudienceScreen.name,
    queryParameters: {'organizerId': organizerId, 'view': 'people'},
  ),
  HostPeopleView.messages => context.goNamed(
    Routes.hostInboxScreen.name,
    queryParameters: {'organizerId': organizerId},
  ),
  HostPeopleView.forms => context.goNamed(
    Routes.hostAudienceScreen.name,
    queryParameters: {'organizerId': organizerId, 'view': 'forms'},
  ),
};
