part of 'host_sends_page_body.dart';

class _HostSendsPageBodySliverState extends ConsumerState<HostSendsPageBody> {
  late _HostSendFlow _flow;
  int _generation = 0;
  bool _sameScope(int generation) => mounted && generation == _generation;
  String? _paginationBaseKey;
  List<HostSendSummary> _additionalSends = const [];
  String? _nextCursor;
  bool _loadingMore = false;
  bool _busy = false;

  @override
  void initState() {
    super.initState();
    _flow = widget.initialSavedAudienceId == null
        ? const _SendHistory()
        : const _SendCompose();
  }

  @override
  void didUpdateWidget(covariant HostSendsPageBody oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (oldWidget.organizer.id != widget.organizer.id) {
      _generation++;
      _flow = const _SendHistory();
      _paginationBaseKey = null;
      _additionalSends = const [];
      _nextCursor = null;
      _loadingMore = false;
      _busy = false;
    }
  }

  @override
  Widget build(BuildContext context) {
    final content = switch (_flow) {
      _SendIntent() => HostSendIntentMenu(
        organizer: widget.organizer,
        onBack: _showHistory,
        onOpenInbox: widget.onOpenInbox,
        onStartCampaign: () => setState(() => _flow = const _SendCompose()),
        onStartEventAnnouncement: _composeEventAnnouncement,
        onStartFollowerUpdate: _composeFollowerUpdate,
        preferredEventId: widget.preferredEventId,
        initialSegment: widget.initialSegment,
        broadcastEnabled: widget.broadcastEnabled,
        now: widget.now ?? DateTime.now(),
      ),
      _SendCompose() => _HostSendsComposer(
        organizer: widget.organizer,
        initialSavedAudienceId: widget.initialSavedAudienceId,
        onBusyChanged: _setBusy,
        onBack: _showHistory,
      ),
      _SendCampaign(:final campaign) => _HostSendsCampaignReport(
        campaign: campaign,
        busy: _busy,
        onBack: _showHistory,
        onApprove: campaign.canApprove
            ? () => _runCampaignAction(
                (controller) => controller.approveCampaign(
                  organizerId: widget.organizer.id,
                  campaign: campaign,
                ),
              )
            : null,
        onSend: campaign.canDispatch
            ? () => _runCampaignAction(
                (controller) => controller.dispatchCampaign(
                  organizerId: widget.organizer.id,
                  campaign: campaign,
                ),
              )
            : null,
        onRefresh: () => _openCampaign(campaign.campaignId),
        onNew: () => setState(() => _flow = const _SendIntent()),
      ),
      _SendAnnouncement(:final announcement) => _HostSendsAnnouncementReport(
        announcement: announcement,
        onBack: _showHistory,
      ),
      _SendFollowerUpdate(:final update) => _HostSendsFollowerUpdateReport(
        update: update,
        onBack: _showHistory,
      ),
      _SendHistory() => _HostSendsHistory(
        organizerId: widget.organizer.id,
        busy: _busy,
        loadingMore: _loadingMore,
        paginationBaseKey: _paginationBaseKey,
        additionalSends: _additionalSends,
        nextCursor: _nextCursor,
        onNew: () => setState(() => _flow = const _SendIntent()),
        onOpen: _open,
        onLoadMore: _loadMore,
      ),
    };
    final history = _HostSendsHistory(
      organizerId: widget.organizer.id,
      busy: _busy,
      loadingMore: _loadingMore,
      paginationBaseKey: _paginationBaseKey,
      additionalSends: _additionalSends,
      nextCursor: _nextCursor,
      onNew: () => setState(() => _flow = const _SendIntent()),
      onOpen: _open,
      onLoadMore: _loadMore,
    );
    return HostNavigationWorkspace(
      spec: HostDirectoryWorkspace<_HostSendFlow>(
        index: widget.indexBuilder(
          SliverPadding(
            padding: CatchInsets.fieldSectionChildTop,
            sliver: SliverList.list(children: [history]),
          ),
        ),
        selection: _flow is _SendHistory ? null : _flow,
        detailBuilder: (_) => CatchWorkspacePaneScaffold(
          title: CatchTopBar.route(
            title: context.l10n.hostMessagingWorkspaceSends,
            leading: CatchIconAction.toolbar(
              icon: CatchIcons.back,
              tooltip: MaterialLocalizations.of(context).backButtonTooltip,
              onPressed: _busy ? null : _showHistory,
            ),
          ),
          body: ListView(padding: CatchInsets.pageBody, children: [content]),
        ),
        unselected: CatchEmptyState(
          icon: CatchIcons.disclosure,
          title: context.l10n.coreCatchFieldVisiblecopySelect,
        ),
        onBack: _busy ? null : _showHistory,
      ),
    );
  }

  void _showHistory() {
    if (_busy) return;
    setState(() {
      _flow = const _SendHistory();
      ref.invalidate(hostSendsProvider(widget.organizer.id));
    });
  }

  Future<void> _open(HostSendSummary send) async {
    switch (send) {
      case HostCampaignSendSummary():
        await _openCampaign(send.campaignId);
      case HostAnnouncementSendSummary():
        setState(() => _flow = _SendAnnouncement(send));
      case HostFollowerUpdateSendSummary():
        setState(() => _flow = _SendFollowerUpdate(send));
    }
  }

  Future<void> _composeFollowerUpdate(int remainingQuota) async {
    final generation = _generation;
    if (_busy) return;
    final organizer = widget.organizer;
    final sent = await showHostFollowerUpdateComposer(
      context: context,
      organizer: organizer,
      remainingQuota: remainingQuota,
      requestIdFactory: HostOrganizerPostController.generateRequestId,
      onSubmitPost: ({required requestId, required text}) async {
        if (!mounted || !_sameScope(generation)) {
          throw StateError('Organizer changed.');
        }
        _setBusy(true);
        try {
          await ref
              .read(hostOrganizerPostControllerProvider)
              .createPost(
                clubId: organizer.id,
                requestId: requestId,
                text: text,
              );
        } finally {
          if (mounted && _sameScope(generation)) _setBusy(false);
        }
      },
    );
    if (!mounted || !_sameScope(generation) || !sent) return;
    ref.invalidate(
      watchOrganizerPostRemainingWeeklyQuotaProvider(widget.organizer.id),
    );
    ref.invalidate(hostSendsProvider(widget.organizer.id));
    setState(() => _flow = const _SendHistory());
  }

  Future<void> _composeEventAnnouncement(
    HostEventAnnouncementTarget target,
  ) async {
    final generation = _generation;
    if (_busy) return;
    HostInboxBroadcastController.reset(ref);
    final initialSegment =
        widget.initialSegment == HostInboxAudienceSegment.booked &&
            target.bookedCount == 0 &&
            target.prospectiveCount > 0
        ? HostInboxAudienceSegment.prospective
        : widget.initialSegment;
    final result =
        await showCatchBottomSheet<SendEventBroadcastCallableResponse>(
          context: context,
          builder: (_) => HostBroadcastComposerSheet(
            event: target.event,
            bookedCount: target.bookedCount,
            prospectiveCount: target.prospectiveCount,
            initialSegment: initialSegment,
            sendingEnabled: widget.broadcastEnabled,
          ),
        );
    if (!mounted || !_sameScope(generation) || result == null) return;
    ref.invalidate(hostSendsProvider(widget.organizer.id));
    setState(() => _flow = const _SendHistory());
    final suffix = result.isPartial
        ? context.l10n.hostsHostInboxScreenVisiblecopySomePushAttemptsFailed
        : '';
    showCatchNotice(
      context,
      context.l10n.hostsHostInboxScreenVisiblecopyBroadcastSentToRecipientcount(
        recipientCount: result.recipientCount,
        suffix: suffix,
      ),
    );
  }

  Future<void> _openCampaign(String campaignId) async {
    final generation = _generation;
    if (_busy) return;
    _setBusy(true);
    try {
      final campaign = await ref
          .read(hostAudienceControllerProvider)
          .getCampaignReport(
            organizerId: widget.organizer.id,
            campaignId: campaignId,
          );
      if (mounted && _sameScope(generation)) {
        setState(() => _flow = _SendCampaign(campaign));
      }
    } on Object catch (error) {
      if (mounted && _sameScope(generation)) {
        showCatchNoticeError(
          context,
          error,
          errorContext: AppErrorContext.organizer,
        );
      }
    } finally {
      if (mounted && _sameScope(generation)) _setBusy(false);
    }
  }

  Future<void> _loadMore(
    HostSendsPage firstPage,
    String baseKey,
    String cursor,
  ) async {
    final generation = _generation;
    if (_loadingMore) return;
    setState(() => _loadingMore = true);
    try {
      final nextPage = await ref
          .read(hostAudienceControllerProvider)
          .listSends(organizerId: widget.organizer.id, cursor: cursor);
      if (!mounted || !_sameScope(generation)) return;
      final existingKeys = <String>{
        for (final send in firstPage.sends) '${send.runtimeType}:${send.id}',
        if (_paginationBaseKey == baseKey)
          for (final send in _additionalSends) '${send.runtimeType}:${send.id}',
      };
      setState(() {
        if (_paginationBaseKey != baseKey) {
          _paginationBaseKey = baseKey;
          _additionalSends = const [];
        }
        _additionalSends = [
          ..._additionalSends,
          ...nextPage.sends.where(
            (send) => existingKeys.add('${send.runtimeType}:${send.id}'),
          ),
        ];
        _nextCursor = nextPage.nextCursor;
      });
    } on Object catch (error) {
      if (mounted && _sameScope(generation)) {
        showCatchNoticeError(
          context,
          error,
          errorContext: AppErrorContext.organizer,
        );
      }
    } finally {
      if (mounted && _sameScope(generation)) {
        setState(() => _loadingMore = false);
      }
    }
  }

  Future<void> _runCampaignAction(
    Future<HostCampaign> Function(HostAudienceController) action,
  ) async {
    final generation = _generation;
    if (_busy) return;
    _setBusy(true);
    try {
      final campaign = await action(ref.read(hostAudienceControllerProvider));
      if (mounted && _sameScope(generation)) {
        setState(() => _flow = _SendCampaign(campaign));
      }
      if (mounted && _sameScope(generation)) {
        ref.invalidate(hostSendsProvider(widget.organizer.id));
      }
    } on Object catch (error) {
      if (mounted && _sameScope(generation)) {
        showCatchNoticeError(
          context,
          error,
          errorContext: AppErrorContext.organizer,
        );
      }
    } finally {
      if (mounted && _sameScope(generation)) _setBusy(false);
    }
  }

  void _setBusy(bool value) {
    if (!mounted || _busy == value) return;
    setState(() => _busy = value);
    widget.onBusyChanged(value);
  }
}

class _HostSendsHistory extends ConsumerWidget {
  const _HostSendsHistory({
    required this.organizerId,
    required this.busy,
    required this.loadingMore,
    required this.paginationBaseKey,
    required this.additionalSends,
    required this.nextCursor,
    required this.onNew,
    required this.onOpen,
    required this.onLoadMore,
  });

  final String organizerId;
  final bool busy;
  final bool loadingMore;
  final String? paginationBaseKey;
  final List<HostSendSummary> additionalSends;
  final String? nextCursor;
  final VoidCallback onNew;
  final ValueChanged<HostSendSummary> onOpen;
  final void Function(HostSendsPage, String, String) onLoadMore;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final sends = ref.watch(hostSendsProvider(organizerId));
    final showWhatsappSetup =
        catchAsyncStateFromAsyncValue(
          ref.watch(hostMessagingSetupProvider(organizerId)),
        ).value?.canManageWhatsappSender(
          embeddedSignupSupported: hostWhatsappEmbeddedSignupSupported,
        ) !=
        false;
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        CatchSection.content(
          child: Wrap(
            spacing: CatchSpacing.s2,
            runSpacing: CatchSpacing.s2,
            children: [
              CatchButton(
                key: const ValueKey('host-sends-new-message'),
                label: context.l10n.hostSendsChooseIntent,
                onPressed: busy ? null : onNew,
              ),
              if (showWhatsappSetup)
                CatchButton(
                  label: context.l10n.hostSendsSettings,
                  variant: CatchButtonVariant.secondary,
                  onPressed: busy
                      ? null
                      : () => context.pushNamed(
                          Routes.hostOrganizerMessagingScreen.name,
                          pathParameters: {'clubId': organizerId},
                        ),
                ),
            ],
          ),
        ),
        gapH16,
        CatchSection.content(
          child: HostManualSendList(organizerId: organizerId),
        ),
        gapH16,
        sends.when(
          loading: () =>
              const CatchFieldLanes.single(child: LinearProgressIndicator()),
          error: (error, _) => CatchLocalizedErrorState(
            error,
            context: AppErrorContext.organizer,
            mode: CatchErrorStateMode.compact,
            onRetry: () => ref.invalidate(hostSendsProvider(organizerId)),
          ),
          data: (page) => _HostSendsHistoryPage(
            page: page,
            busy: busy,
            loadingMore: loadingMore,
            paginationBaseKey: paginationBaseKey,
            additionalSends: additionalSends,
            paginationNextCursor: nextCursor,
            onOpen: onOpen,
            onLoadMore: onLoadMore,
          ),
        ),
      ],
    );
  }
}

class _HostSendsHistoryPage extends StatelessWidget {
  const _HostSendsHistoryPage({
    required this.page,
    required this.busy,
    required this.loadingMore,
    required this.paginationBaseKey,
    required this.additionalSends,
    required this.paginationNextCursor,
    required this.onOpen,
    required this.onLoadMore,
  });

  final HostSendsPage page;
  final bool busy;
  final bool loadingMore;
  final String? paginationBaseKey;
  final List<HostSendSummary> additionalSends;
  final String? paginationNextCursor;
  final ValueChanged<HostSendSummary> onOpen;
  final void Function(HostSendsPage, String, String) onLoadMore;

  @override
  Widget build(BuildContext context) {
    final baseKey = _hostSendsBaseKey(page);
    final hasCurrentPagination = paginationBaseKey == baseKey;
    final sends = [...page.sends, if (hasCurrentPagination) ...additionalSends];
    final nextCursor = hasCurrentPagination
        ? paginationNextCursor
        : page.nextCursor;
    if (sends.isEmpty) {
      return CatchEmptyState(
        title: context.l10n.hostSendsEmpty,
        message: context.l10n.hostSendsEmptyHelp,
      );
    }
    return CatchSectionList(
      emptyStateOmitted: true,
      children: [
        CatchSection.rows(
          title: context.l10n.hostMessagingWorkspaceSends,
          children: [
            for (final send in sends)
              CatchField.navigate(
                key: ValueKey(switch (send) {
                  HostCampaignSendSummary(:final campaignId) =>
                    'campaign-$campaignId',
                  HostAnnouncementSendSummary(:final broadcastId) =>
                    'announcement-$broadcastId',
                  HostFollowerUpdateSendSummary(:final postId) =>
                    'update-$postId',
                }),
                onActivate: () => onOpen(send),
                states: {if (busy) WidgetState.disabled},
                content: _hostSendLayout(context, send),
              ),
          ],
        ),
        if (nextCursor != null)
          CatchSection.content(
            child: CatchButton(
              label: context.l10n.hostSendsLoadMore,
              variant: CatchButtonVariant.secondary,
              status: (loadingMore)
                  ? CatchButtonStatus.loading
                  : CatchButtonStatus.idle,
              onPressed: loadingMore
                  ? null
                  : () => onLoadMore(page, baseKey, nextCursor),
            ),
          ),
      ],
    );
  }
}

CatchRecordLayout _hostSendLayout(BuildContext context, HostSendSummary send) =>
    switch (send) {
      HostCampaignSendSummary campaign => CatchRecordLayout(
        icon: CatchIcons.chat,
        title: campaign.name,
        metadata: [
          context.l10n.hostSendsWhatsappBusinessChannel,
          campaign.templateName ?? campaign.templateId,
          AppTimeFormatters.shortDate(campaign.activityAt),
        ].join(' · '),
        description: campaign.status,
      ),
      HostAnnouncementSendSummary announcement => CatchRecordLayout(
        icon: CatchIcons.chat,
        title: announcement.eventName,
        metadata: [
          context.l10n.hostSendsCatchAnnouncementChannel,
          context.l10n.hostSendsRecipients(count: announcement.recipientCount),
          AppTimeFormatters.shortDate(announcement.sentAt),
        ].join(' · '),
        description: announcement.partialFailure
            ? context.l10n.hostSendsPartial
            : announcement.audience,
      ),
      HostFollowerUpdateSendSummary update => CatchRecordLayout(
        icon: CatchIcons.chat,
        title: context.l10n.hostSendsFollowerUpdateChannel,
        metadata: [
          context.l10n.hostSendsFollowersAudience,
          if (update.hasTrackedDelivery)
            context.l10n.hostSendsRecipients(
              count: update.activityAvailableCount,
            ),
          AppTimeFormatters.shortDate(update.createdAt),
        ].join(' · '),
        description: context.l10n.hostSendsFollowerDeliveryStatus(
          status: update.deliveryStatus,
        ),
      ),
    };

class _HostSendsComposer extends StatelessWidget {
  const _HostSendsComposer({
    required this.organizer,
    required this.initialSavedAudienceId,
    required this.onBusyChanged,
    required this.onBack,
  });

  final Organizer organizer;
  final String? initialSavedAudienceId;
  final ValueChanged<bool> onBusyChanged;
  final VoidCallback onBack;

  @override
  Widget build(BuildContext context) => Column(
    crossAxisAlignment: CrossAxisAlignment.stretch,
    children: [
      HostSendsBackButton(onPressed: onBack),
      gapH12,
      HostCampaignEditor(
        organizer: organizer,
        initialSavedAudienceId: initialSavedAudienceId,
        onBusyChanged: onBusyChanged,
      ),
    ],
  );
}

class _HostSendsCampaignReport extends StatelessWidget {
  const _HostSendsCampaignReport({
    required this.campaign,
    required this.busy,
    required this.onBack,
    required this.onApprove,
    required this.onSend,
    required this.onRefresh,
    required this.onNew,
  });

  final HostCampaign campaign;
  final bool busy;
  final VoidCallback onBack;
  final VoidCallback? onApprove;
  final VoidCallback? onSend;
  final VoidCallback onRefresh;
  final VoidCallback onNew;

  @override
  Widget build(BuildContext context) => Column(
    crossAxisAlignment: CrossAxisAlignment.stretch,
    children: [
      HostSendsBackButton(onPressed: busy ? null : onBack),
      gapH12,
      CatchSection.divided(
        title: context.l10n.hostSendsCampaignType,
        child: HostCampaignReportSection(
          campaign: campaign,
          busy: busy,
          onApprove: onApprove,
          onSend: onSend,
          onCancel: null,
          onRefresh: onRefresh,
          onNew: onNew,
        ),
      ),
    ],
  );
}

class _HostSendsAnnouncementReport extends StatelessWidget {
  const _HostSendsAnnouncementReport({
    required this.announcement,
    required this.onBack,
  });

  final HostAnnouncementSendSummary announcement;
  final VoidCallback onBack;

  @override
  Widget build(BuildContext context) => Column(
    crossAxisAlignment: CrossAxisAlignment.stretch,
    children: [
      HostSendsBackButton(onPressed: onBack),
      gapH12,
      CatchSection.divided(
        title: context.l10n.hostSendsAnnouncementType,
        child: CatchNotice(
          dismissLabel: context.l10n.coreCatchNoticeTooltipDismiss,
          notice: CatchNoticeData(
            id: 'host.sends.announcement.${announcement.broadcastId}',
            title: announcement.eventName,
            message: [
              context.l10n.hostSendsRecipients(
                count: announcement.recipientCount,
              ),
              AppTimeFormatters.dateTime(announcement.sentAt),
              if (announcement.partialFailure) context.l10n.hostSendsPartial,
            ].join(' · '),
            tone: announcement.partialFailure
                ? CatchNoticeTone.warning
                : CatchNoticeTone.status,
          ),
        ),
      ),
    ],
  );
}

class _HostSendsFollowerUpdateReport extends StatelessWidget {
  const _HostSendsFollowerUpdateReport({
    required this.update,
    required this.onBack,
  });

  final HostFollowerUpdateSendSummary update;
  final VoidCallback onBack;

  @override
  Widget build(BuildContext context) => Column(
    crossAxisAlignment: CrossAxisAlignment.stretch,
    children: [
      HostSendsBackButton(onPressed: onBack),
      gapH12,
      CatchSection.divided(
        title: context.l10n.hostSendsFollowerUpdateChannel,
        child: CatchNotice(
          dismissLabel: context.l10n.coreCatchNoticeTooltipDismiss,
          notice: CatchNoticeData(
            id: 'host.sends.follower-update.${update.postId}',
            title: context.l10n.hostSendsFollowersAudience,
            message: [
              AppTimeFormatters.dateTime(update.createdAt),
              if (update.eventId != null)
                context.l10n.hostSendsLinkedEventUpdate,
              context.l10n.hostSendsFollowerDeliveryStatus(
                status: update.deliveryStatus,
              ),
              if (update.hasTrackedDelivery)
                context.l10n.hostSendsRecipients(
                  count: update.activityAvailableCount,
                ),
            ].join(' · '),
            tone: update.deliveryCompleted
                ? CatchNoticeTone.status
                : CatchNoticeTone.warning,
          ),
        ),
      ),
    ],
  );
}

String _hostSendsBaseKey(HostSendsPage page) => [
  page.nextCursor ?? '',
  for (final send in page.sends) '${send.runtimeType}:${send.id}',
].join('|');

sealed class _HostSendFlow {
  const _HostSendFlow();
}

final class _SendHistory extends _HostSendFlow {
  const _SendHistory();
}

final class _SendIntent extends _HostSendFlow {
  const _SendIntent();
}

final class _SendCompose extends _HostSendFlow {
  const _SendCompose();
}

final class _SendCampaign extends _HostSendFlow {
  const _SendCampaign(this.campaign);
  final HostCampaign campaign;
}

final class _SendAnnouncement extends _HostSendFlow {
  const _SendAnnouncement(this.announcement);
  final HostAnnouncementSendSummary announcement;
}

final class _SendFollowerUpdate extends _HostSendFlow {
  const _SendFollowerUpdate(this.update);
  final HostFollowerUpdateSendSummary update;
}
