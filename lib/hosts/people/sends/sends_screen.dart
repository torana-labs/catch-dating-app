import 'dart:async';

import 'package:catch_dating_app/contexts/audience/data/crm/host_campaign_repository.dart';
import 'package:catch_dating_app/contexts/audience/data/crm/host_communication_repository.dart';
import 'package:catch_dating_app/contexts/audience/data/crm/host_whatsapp_repository.dart';
import 'package:catch_dating_app/contexts/audience/domain/crm/host_campaign.dart';
import 'package:catch_dating_app/contexts/audience/domain/crm/host_manual_send_task.dart';
import 'package:catch_dating_app/contexts/audience/domain/crm/host_send_summary.dart';
import 'package:catch_dating_app/contexts/organizers/domain/organizer.dart';
import 'package:catch_dating_app/hosts/people/people_controller.dart';
import 'package:catch_dating_app/hosts/people/sends/campaign_body.dart';
import 'package:catch_dating_app/hosts/people/sends/sends_body.dart';
import 'package:catch_dating_app/hosts/people/sends/sends_controller.dart';
import 'package:catch_dating_app/hosts/people/sends/sends_detail_body.dart';
import 'package:catch_dating_app/hosts/people/sends/sends_sheets_body.dart';
import 'package:catch_dating_app/hosts/people/sends/sends_state.dart';
import 'package:catch_dating_app/hosts/people/widgets/people_scope_body.dart';
import 'package:catch_dating_app/hosts/presentation/host_audience_controller.dart';
import 'package:catch_dating_app/hosts/presentation/host_organizer_post_controller.dart';
import 'package:catch_l10n/l10n.dart';
import 'package:catch_platform/cache/app_clock.dart';
import 'package:catch_platform/errors/app_error_message.dart';
import 'package:catch_platform/riverpod_ui/catch_notice_feedback.dart';
import 'package:catch_platform/routing/route_contract.dart';
import 'package:catch_tokens/catch_tokens.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

/// Sends: everything the organizer sends to many people at once, and the
/// personal WhatsApp handoffs still to send by hand.
///
/// The history (campaigns, event announcements, follower updates) and the
/// handoff queue sit in the list; Choose what to send, a new campaign or a
/// report open beside it on a wider window and replace it on a phone. It
/// watches [hostSendsControllerProvider] and runs the existing commands:
/// campaigns and handoffs on [hostAudienceControllerProvider], follower
/// updates on [hostOrganizerPostControllerProvider]. An event announcement
/// opens the compose screen.
class HostSendsScreen extends ConsumerStatefulWidget {
  const HostSendsScreen({
    super.key,
    this.initialOrganizerId,
    this.initialSavedAudienceId,
    this.preferredEventId,
    this.now,
  });

  final String? initialOrganizerId;

  /// Opens a new campaign to this saved audience (`compose=1&audienceId=`).
  final String? initialSavedAudienceId;

  /// The event an announcement starts on when it can take one.
  final String? preferredEventId;

  /// A fixed clock for previews and tests; null follows the app clock.
  final DateTime? now;

  @override
  ConsumerState<HostSendsScreen> createState() => _HostSendsScreenState();
}

class _HostSendsScreenState extends ConsumerState<HostSendsScreen> {
  late HostSendsFlow? _flow = widget.initialSavedAudienceId == null
      ? null
      : HostSendsCompose(savedAudienceId: widget.initialSavedAudienceId);
  bool _busy = false;
  bool _replanning = false;
  String? _organizerId;
  late final DateTime _openedAt =
      widget.now ?? ref.read(appClockProvider).now();

  @override
  Widget build(BuildContext context) => CatchRoot(
    // The size class is read below the root that measures the window.
    child: Builder(
      builder: (context) {
        final l10n = context.l10n;
        final split =
            CatchRootScope.sizeClassOf(context) != CatchWindowSize.compact;
        final scope = ref.watch(
          hostPeopleOrganizerProvider(widget.initialOrganizerId),
        );
        final organizer = scope.organizer;
        if (organizer != null && _organizerId != organizer.id) {
          // Another organizer starts from its history.
          if (_organizerId != null) _flow = null;
          _organizerId = organizer.id;
        }
        final flow = _flow;
        final Widget body;
        if (organizer == null) {
          body = HostPeopleScopeBody(
            organizer: scope,
            onRetry: () => retryHostPeopleOrganizer(ref, scope.uid),
            onSignIn: () => context.go(Routes.authScreen.path),
          );
        } else {
          final state = ref.watch(
            hostSendsControllerProvider(
              HostSendsRequest(
                organizerId: organizer.id,
                now: _openedAt,
                preferredEventId: widget.preferredEventId,
              ),
            ),
          );
          final list = CatchScrollView(
            primary: false,
            child: HostSendsBody(
              state: state,
              busy: _busy,
              replanning: _replanning,
              onChoose: () => setState(() => _flow = const HostSendsChoose()),
              onSettings: () => _openSettings(organizer.id),
              onOpen: (send) => unawaited(_open(organizer, send)),
              onLoadMore: () => ref
                  .read(hostSendPagesProvider(organizer.id).notifier)
                  .loadMore(),
              onOpenTask: (task) => unawaited(_openTask(task)),
              onReplan: (tasks) => unawaited(_replan(organizer.id, tasks)),
              onLoadMoreTasks: () => ref
                  .read(hostManualSendTaskPagesProvider(organizer.id).notifier)
                  .loadMore(),
              onRetry: () => retryHostSendsReads(ref, organizer.id),
            ),
          );
          final detail = flow == null
              ? CatchScrollView(
                  primary: false,
                  child: CatchPageBody(
                    child: CatchEmptyState(
                      icon: CatchIcons.send,
                      title: l10n.coreCatchFieldVisiblecopySelect,
                    ),
                  ),
                )
              : CatchScrollView(
                  primary: false,
                  child: CatchPageBody(
                    child: CatchStack(
                      gap: CatchStackGap.g16,
                      children: [
                        CatchPaneHeader(
                          title: hostSendsFlowTitle(l10n, flow),
                          back: CatchTopBarBack(
                            label: l10n.hostMessagingWorkspaceSends,
                            onPressed: _busy ? null : _closeFlow,
                          ),
                        ),
                        switch (flow) {
                          HostSendsChoose() => HostSendsChooseBody(
                            state: state,
                            onConversation: () => context.goNamed(
                              Routes.hostInboxScreen.name,
                              queryParameters: {'organizerId': organizer.id},
                            ),
                            onCampaign: () => setState(
                              () => _flow = const HostSendsCompose(),
                            ),
                            onAnnouncement: () =>
                                unawaited(_announce(organizer, state)),
                            onFollowerUpdate: () => unawaited(
                              _followerUpdate(organizer, state.quota ?? 0),
                            ),
                            onSettings: () => _openSettings(organizer.id),
                          ),
                          HostSendsCompose(:final savedAudienceId) =>
                            HostCampaignBody(
                              key: ValueKey<String?>(
                                '${organizer.id}/$savedAudienceId',
                              ),
                              organizer: organizer,
                              initialSavedAudienceId: savedAudienceId,
                              onBusyChanged: _setBusy,
                            ),
                          HostSendsCampaignReport(:final campaign) =>
                            HostCampaignReportSection(
                              campaign: campaign,
                              busy: _busy,
                              onApprove: campaign.canApprove
                                  ? () => unawaited(
                                      _campaignAction(
                                        (commands) => commands.approveCampaign(
                                          organizerId: organizer.id,
                                          campaign: campaign,
                                        ),
                                      ),
                                    )
                                  : null,
                              onSend: campaign.canDispatch
                                  ? () => unawaited(
                                      _campaignAction(
                                        (commands) => commands.dispatchCampaign(
                                          organizerId: organizer.id,
                                          campaign: campaign,
                                        ),
                                      ),
                                    )
                                  : null,
                              onRefresh: () => unawaited(
                                _openCampaign(
                                  organizer.id,
                                  campaign.campaignId,
                                ),
                              ),
                              onNew: () => setState(
                                () => _flow = const HostSendsChoose(),
                              ),
                            ),
                          HostSendsSummaryReport(:final send) =>
                            HostSendsReportBody(send: send),
                        },
                      ],
                    ),
                  ),
                );
          body = split
              ? CatchPaneLayout(
                  pattern: CatchPaneLayoutMode.listDetail,
                  detailOpen: flow != null,
                  children: [list, detail],
                )
              : flow == null
              ? list
              : detail;
        }
        return CatchScreen(
          key: const ValueKey<String>('host-sends-screen'),
          bodyScrolls: organizer == null,
          topBar: CatchTopBar(
            variant: CatchTopBarVariant.tool,
            kicker: organizer?.name,
            title: l10n.hostMessagingWorkspaceSends,
            back: CatchTopBarBack(
              label: l10n.hostPeopleBack,
              onPressed: _busy
                  ? null
                  : () => context.goNamed(
                      Routes.hostInboxScreen.name,
                      queryParameters: {'organizerId': ?organizer?.id},
                    ),
            ),
          ),
          body: body,
        );
      },
    ),
  );

  void _closeFlow() {
    if (_busy) return;
    setState(() => _flow = null);
  }

  void _setBusy(bool value) {
    if (!mounted || _busy == value) return;
    setState(() => _busy = value);
  }

  void _openSettings(String organizerId) => context.pushNamed(
    Routes.hostOrganizerMessagingScreen.name,
    pathParameters: {'organizerId': organizerId},
  );

  Future<void> _open(Organizer organizer, HostSendSummary send) async {
    switch (send) {
      case HostCampaignSendSummary(:final campaignId):
        await _openCampaign(organizer.id, campaignId);
      case HostAnnouncementSendSummary() || HostFollowerUpdateSendSummary():
        setState(() => _flow = HostSendsSummaryReport(send));
    }
  }

  Future<void> _openCampaign(String organizerId, String campaignId) =>
      _campaignAction(
        (commands) => commands.getCampaignReport(
          organizerId: organizerId,
          campaignId: campaignId,
        ),
      );

  Future<void> _campaignAction(
    Future<HostCampaign> Function(HostAudienceController commands) action,
  ) async {
    if (_busy) return;
    final organizerId = _organizerId;
    _setBusy(true);
    try {
      // provider-graph: ownership-widget-async-callback:_HostSendsScreenState._campaignAction:await:action watch CAT156 -- Carried from the Sends workspace: each action is a hostAudienceControllerProvider campaign command; this method holds only the local busy flag and the campaign the report shows.
      final campaign = await action(ref.read(hostAudienceControllerProvider));
      if (mounted && organizerId == _organizerId) {
        setState(() => _flow = HostSendsCampaignReport(campaign));
      }
    } on Object catch (error) {
      if (mounted) {
        showCatchNoticeError(
          context,
          error,
          errorContext: AppErrorContext.organizer,
        );
      }
    } finally {
      _setBusy(false);
    }
  }

  /// Opens the compose screen on the announcement's event; it confirms the
  /// send itself.
  Future<void> _announce(Organizer organizer, HostSendsState state) async {
    final event = state.announcement.event;
    if (event == null) return;
    final sent = await context.pushNamed<Object?>(
      Routes.hostNewMessageScreen.name,
      queryParameters: {'organizerId': organizer.id, 'eventId': event.id},
    );
    if (mounted && sent != null) setState(() => _flow = null);
  }

  Future<void> _followerUpdate(Organizer organizer, int remainingQuota) async {
    if (_busy || remainingQuota <= 0) return;
    final organizerId = organizer.id;
    final whatsappAvailable = await _followerWhatsappAvailable(organizerId);
    if (!mounted || organizerId != _organizerId) return;
    final posted = await showCatchBottomSheet<HostFollowerUpdatePosted>(
      context: context,
      builder: (_) => HostFollowerUpdateSheet(
        remainingQuota: remainingQuota,
        requestIdFactory: HostOrganizerPostController.generateRequestId,
        whatsappAvailable: whatsappAvailable,
        onSubmit: ({required requestId, required text, required whatsapp}) =>
            ref
                .read(hostOrganizerPostControllerProvider)
                .createPost(
                  organizerId: organizerId,
                  requestId: requestId,
                  text: text,
                  whatsapp: whatsapp,
                ),
      ),
    );
    if (!mounted || posted == null) return;
    final whatsapp = posted.response?.whatsapp;
    showCatchNotice(
      context,
      whatsapp == null
          ? context.l10n.hostsHostOrganizerToolsCatchbuttonPostedToFollowers
          : context.l10n.hostFollowerUpdatePostedWhatsapp(
              count: whatsapp.queuedCount,
            ),
    );
    setState(() => _flow = null);
  }

  /// The WhatsApp switch needs an active number holding an approved
  /// organizer_follower_update template with one body variable; the server
  /// re-checks both. A setup read that fails leaves the switch off.
  Future<bool> _followerWhatsappAvailable(String organizerId) async {
    try {
      final setup = await ref.read(
        hostMessagingSetupProvider(organizerId).future,
      );
      return setup.connection?.isActive == true &&
          setup.templates.any(
            (template) =>
                template.name == 'organizer_follower_update' &&
                template.isApproved &&
                !template.hasMediaHeader &&
                template.variableNames.length == 1,
          );
    } on Object {
      return false;
    }
  }

  Future<void> _openTask(HostManualSendTask task) async {
    await showCatchBottomSheet<bool>(
      context: context,
      builder: (_) => HostManualSendSheet(task: task),
    );
  }

  Future<void> _replan(
    String organizerId,
    List<HostManualSendTask> tasks,
  ) async {
    if (_replanning) return;
    setState(() => _replanning = true);
    try {
      // provider-graph: ownership-widget-async:_HostSendsScreenState._replan:await:hostAudienceControllerProvider.replanManualSendTasks watch CAT156 -- Carried from the manual send list: the audience controller checks the routes; this method holds only the local flag and shows the results sheet.
      final result = await ref
          .read(hostAudienceControllerProvider)
          .replanManualSendTasks(
            organizerId: organizerId,
            taskIds: tasks.map((task) => task.taskId).take(50).toList(),
          );
      if (!mounted) return;
      await showCatchBottomSheet<void>(
        context: context,
        builder: (_) => HostManualSendReplanSheet(
          tasks: tasks,
          results: {for (final item in result.results) item.taskId: item},
        ),
      );
    } on Object catch (error) {
      if (mounted) {
        showCatchNoticeError(
          context,
          error,
          errorContext: AppErrorContext.organizer,
        );
      }
    } finally {
      if (mounted) setState(() => _replanning = false);
    }
  }
}

/// The detail pane's title.
String hostSendsFlowTitle(AppLocalizations l10n, HostSendsFlow flow) =>
    switch (flow) {
      HostSendsChoose() => l10n.hostSendsChooseIntent,
      HostSendsCompose() => l10n.hostsHostAudienceCampaign,
      HostSendsCampaignReport() => l10n.hostSendsCampaignType,
      HostSendsSummaryReport(:final send) => switch (send) {
        HostFollowerUpdateSendSummary() => l10n.hostSendsFollowerUpdateChannel,
        _ => l10n.hostSendsAnnouncementType,
      },
    };
