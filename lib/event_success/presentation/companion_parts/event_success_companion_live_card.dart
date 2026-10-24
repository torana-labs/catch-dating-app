part of '../event_success_companion_screen.dart';

const EdgeInsets _companionRotationSlotGap = EdgeInsets.only(
  bottom: CatchSpacing.s2,
);
const EdgeInsets _companionPreviewIconInset = EdgeInsets.only(
  top: CatchSpacing.micro2,
);
const EdgeInsets _companionQrSheetPadding = EdgeInsets.fromLTRB(
  CatchSpacing.s4,
  CatchSpacing.s4,
  CatchSpacing.s4,
  CatchSpacing.s5,
);
const EdgeInsets _companionStageCueGap = EdgeInsets.only(
  bottom: CatchSpacing.s3,
);

@immutable
class AssignmentOptOutActionState {
  const AssignmentOptOutActionState({
    required this.optedOut,
    this.isSaving = false,
  });

  final bool optedOut;
  final bool isSaving;

  bool get included => !optedOut;
}

class MicroPodCard extends StatelessWidget {
  const MicroPodCard({
    super.key,
    required this.event,
    required this.assignment,
    required this.peerProfiles,
    required this.peersLoading,
    required this.actionState,
    required this.onIncludeChanged,
  });

  final Event event;
  final EventSuccessAssignment? assignment;
  final List<PublicProfile> peerProfiles;
  final bool peersLoading;
  final AssignmentOptOutActionState actionState;
  final ValueChanged<bool> onIncludeChanged;

  @override
  Widget build(BuildContext context) {
    final t = CatchTokens.of(context);
    final assigned = assignment;
    final optedOut = actionState.optedOut;
    final groupSlots =
        assigned?.groupRotationSlots ?? const <EventSuccessGroupRotationSlot>[];
    final profilesByUid = {
      for (final profile in peerProfiles) profile.uid: profile,
    };
    return CompanionStageSurface(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          StageSectionHeader(
            icon: CatchIcons.groups2Outlined,
            label: context
                .l10n
                .eventSuccessEventSuccessCompanionLiveCardsLabelStarterGroup,
            color: t.primary,
          ),
          gapH10,
          CatchText(
            optedOut
                ? context
                      .l10n
                      .eventSuccessEventSuccessCompanionLiveCardsTextStarterGroupsPausedFor
                : assigned?.displayTitle ??
                      context
                          .l10n
                          .eventSuccessEventSuccessCompanionLiveCardsTextYourStarterGroupIs,
            variant: CatchTextVariant.titleL,
          ),
          gapH6,
          CatchText(
            optedOut
                ? context
                      .l10n
                      .eventSuccessEventSuccessCompanionLiveCardsTextYouWonTBe
                : assigned?.displaySubtitle ??
                      context
                          .l10n
                          .eventSuccessEventSuccessCompanionLiveCardsTextTheHostWillPublish,
            variant: CatchTextVariant.supporting,
            color: t.ink2,
          ),
          if (assigned != null) ...[
            gapH14,
            if (groupSlots.isNotEmpty)
              if (peersLoading)
                CatchBadge(
                  label: context
                      .l10n
                      .eventSuccessEventSuccessCompanionLiveCardsLabelLoadingGroupMembers,
                  icon: CatchIcons.hourglassEmptyRounded,
                )
              else
                Column(
                  children: [
                    for (final slot in groupSlots)
                      GroupRotationSlotRow(
                        slot: slot,
                        profilesByUid: profilesByUid,
                      ),
                  ],
                )
            else
              PeopleTokenRow(
                countLabel: context.l10n
                    .eventSuccessEventSuccessCompanionLiveCardsVisiblecopyValue1People(
                      value1: assigned.peerUids.length + 1,
                    ),
                loading: peersLoading,
                loadingLabel: context
                    .l10n
                    .eventSuccessEventSuccessCompanionLiveCardsVisiblecopyLoadingGroupMembers,
                profiles: peerProfiles,
              ),
          ],
          gapH14,
          CompanionStageActionSection(
            child: IncludeMeField(
              label: context
                  .l10n
                  .eventSuccessEventSuccessCompanionLiveCardsLabelIncludeMeInStarter,
              included: actionState.included,
              busy: actionState.isSaving,
              onChanged: onIncludeChanged,
            ),
          ),
        ],
      ),
    );
  }
}

class RotationScheduleCard extends StatelessWidget {
  const RotationScheduleCard({
    super.key,
    required this.event,
    required this.assignment,
    required this.peerProfiles,
    required this.peersLoading,
    required this.actionState,
    required this.onIncludeChanged,
  });

  final Event event;
  final EventSuccessAssignment? assignment;
  final List<PublicProfile> peerProfiles;
  final bool peersLoading;
  final AssignmentOptOutActionState actionState;
  final ValueChanged<bool> onIncludeChanged;

  @override
  Widget build(BuildContext context) {
    final t = CatchTokens.of(context);
    final assigned = assignment;
    final optedOut = actionState.optedOut;
    final profilesByUid = {
      for (final profile in peerProfiles) profile.uid: profile,
    };
    return CompanionStageSurface(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          StageSectionHeader(
            icon: CatchIcons.syncAltRounded,
            label: context
                .l10n
                .eventSuccessEventSuccessCompanionLiveCardsLabelTimedRotations,
            color: t.primary,
          ),
          gapH10,
          CatchText(
            optedOut
                ? context
                      .l10n
                      .eventSuccessEventSuccessCompanionLiveCardsTextTimedRotationsPausedFor
                : assigned?.displayTitle ??
                      context
                          .l10n
                          .eventSuccessEventSuccessCompanionLiveCardsTextYourRotationScheduleIs,
            variant: CatchTextVariant.titleL,
          ),
          gapH6,
          CatchText(
            optedOut
                ? context
                      .l10n
                      .eventSuccessEventSuccessCompanionLiveCardsTextYouWonTBe
                : assigned?.displaySubtitle ??
                      context
                          .l10n
                          .eventSuccessEventSuccessCompanionLiveCardsTextYourTimedPairingsAppear,
            variant: CatchTextVariant.supporting,
            color: t.ink2,
          ),
          if (assigned != null) ...[
            gapH14,
            if (peersLoading)
              CatchBadge(
                label: context
                    .l10n
                    .eventSuccessEventSuccessCompanionLiveCardsLabelLoadingPartnerNames,
                icon: CatchIcons.hourglassEmptyRounded,
              )
            else
              Column(
                children: [
                  for (final slot in assigned.rotationSlots)
                    RotationSlotRow(
                      slot: slot,
                      peerName:
                          profilesByUid[slot.peerUid]?.name ??
                          context
                              .l10n
                              .eventSuccessEventSuccessCompanionLiveCardsVisiblecopyPartner,
                    ),
                ],
              ),
          ],
          gapH14,
          CompanionStageActionSection(
            child: IncludeMeField(
              label: context
                  .l10n
                  .eventSuccessEventSuccessCompanionLiveCardsLabelIncludeMeInTimed,
              included: actionState.included,
              busy: actionState.isSaving,
              onChanged: onIncludeChanged,
            ),
          ),
        ],
      ),
    );
  }
}

class LiveStepContextCard extends StatelessWidget {
  const LiveStepContextCard({super.key, required this.step});

  final EventRunOfShowStep? step;

  @override
  Widget build(BuildContext context) {
    final t = CatchTokens.of(context);
    final activeStep = step;
    return CompanionStageSurface(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          StageSectionHeader(
            icon: CatchIcons.locationOnOutlined,
            label:
                activeStep?.stage.label ??
                context
                    .l10n
                    .eventSuccessEventSuccessCompanionLiveCardsLabelLiveCue,
            color: t.primary,
          ),
          gapH10,
          CatchText(
            activeStep == null
                ? context
                      .l10n
                      .eventSuccessEventSuccessCompanionLiveCardsTextEventIsLive
                : activeStep.title,
            variant: CatchTextVariant.titleL,
          ),
          gapH6,
          CatchText(
            activeStep?.attendeeExperience ??
                context
                    .l10n
                    .eventSuccessEventSuccessCompanionLiveCardsTextFollowTheHostFor,
            variant: CatchTextVariant.supporting,
            color: t.ink2,
          ),
        ],
      ),
    );
  }
}

/// Informational preview of what the host will guide the attendee through
/// once check-in opens. Opt-out controls live on the at-event cards instead.
class PreCheckInPlanningCard extends StatelessWidget {
  const PreCheckInPlanningCard({
    super.key,
    required this.microPodsEnabled,
    required this.guidedRotationsEnabled,
    required this.liveRevealEnabled,
    required this.socialMissionsEnabled,
    required this.wingmanRequestsEnabled,
  });

  final bool microPodsEnabled;
  final bool guidedRotationsEnabled;
  final bool liveRevealEnabled;
  final bool socialMissionsEnabled;
  final bool wingmanRequestsEnabled;

  @override
  Widget build(BuildContext context) {
    final t = CatchTokens.of(context);
    final entries = <CompanionPreviewText>[
      if (microPodsEnabled)
        CompanionPreviewText(
          icon: CatchIcons.groups2Outlined,
          text: context
              .l10n
              .eventSuccessEventSuccessCompanionLiveCardsTextSmallStarterGroupWhen,
        ),
      if (guidedRotationsEnabled)
        CompanionPreviewText(
          icon: CatchIcons.syncAltRounded,
          text: context
              .l10n
              .eventSuccessEventSuccessCompanionLiveCardsTextTimedPartnerRotationsDuring,
        ),
      if (liveRevealEnabled)
        CompanionPreviewText(
          icon: CatchIcons.boltRounded,
          text: context
              .l10n
              .eventSuccessEventSuccessCompanionLiveCardsTextSynchronizedPartnerRevealsAs,
        ),
      if (socialMissionsEnabled)
        CompanionPreviewText(
          icon: CatchIcons.chatBubbleOutlineRounded,
          text: context
              .l10n
              .eventSuccessEventSuccessCompanionLiveCardsTextLiveConversationPromptsFrom,
        ),
      if (wingmanRequestsEnabled)
        CompanionPreviewText(
          icon: CatchIcons.volunteerActivismOutlined,
          text: context
              .l10n
              .eventSuccessEventSuccessCompanionLiveCardsTextYouCanAskThe,
        ),
    ];
    return CompanionStageSurface(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          StageSectionHeader(
            icon: CatchIcons.eventAvailableOutlined,
            label: context
                .l10n
                .eventSuccessEventSuccessCompanionLiveCardsLabelPreview,
            color: t.primary,
          ),
          gapH10,
          CatchText(
            context
                .l10n
                .eventSuccessEventSuccessCompanionLiveCardsTextWhatWeLlGuide,
            variant: CatchTextVariant.titleL,
          ),
          gapH6,
          CatchText(
            context
                .l10n
                .eventSuccessEventSuccessCompanionLiveCardsTextLivePartnerAndGroup,
            variant: CatchTextVariant.supporting,
            color: t.ink2,
          ),
          gapH14,
          for (final entry in entries) ...[entry, gapH8],
        ],
      ),
    );
  }
}

class CompanionPreviewText extends StatelessWidget {
  const CompanionPreviewText({
    super.key,
    required this.icon,
    required this.text,
  });

  final IconData icon;
  final String text;

  @override
  Widget build(BuildContext context) {
    final t = CatchTokens.of(context);
    return Row(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Padding(
          padding: _companionPreviewIconInset,
          child: Icon(icon, size: CatchIcon.xs, color: t.ink2),
        ),
        gapW6,
        Expanded(child: CatchText(text, variant: CatchTextVariant.supporting)),
      ],
    );
  }
}

class IncludeMeField extends StatelessWidget {
  const IncludeMeField({
    super.key,
    required this.label,
    required this.included,
    required this.busy,
    required this.onChanged,
  });

  final String label;
  final bool included;
  final bool busy;
  final ValueChanged<bool> onChanged;

  @override
  Widget build(BuildContext context) {
    final t = CatchTokens.of(context);
    return Row(
      children: [
        Expanded(
          child: Text(
            label,
            style: CatchTextStyles.labelL(context, color: t.surface),
          ),
        ),
        CatchToggleInput(
          contract: CatchContractConstraints
              .mobileFormStateEventSuccessLiveCardIncluded,
          value: included,
          semanticLabel: label,
          onChanged: busy ? null : onChanged,
        ),
      ],
    );
  }
}

@immutable
class SelfCheckInActionState {
  const SelfCheckInActionState({this.isCheckingIn = false});

  final bool isCheckingIn;
}

class SelfCheckInCard extends StatefulWidget {
  const SelfCheckInCard({
    super.key,
    required this.event,
    required this.actionState,
    required this.onSelfCheckIn,
  });

  final Event event;
  final SelfCheckInActionState actionState;
  final Future<void> Function(String venueSessionToken) onSelfCheckIn;

  @override
  State<SelfCheckInCard> createState() => _SelfCheckInCardState();
}

class _SelfCheckInCardState extends State<SelfCheckInCard> {
  bool _checkingIn = false;

  @override
  Widget build(BuildContext context) {
    final busy = widget.actionState.isCheckingIn || _checkingIn;
    final t = CatchTokens.of(context);
    return CompanionStageSurface(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          StageSectionHeader(
            icon: CatchIcons.qrCode2Rounded,
            label: context
                .l10n
                .eventSuccessEventSuccessCompanionLiveCardsLabelArrival,
            color: t.primary,
          ),
          gapH10,
          CatchText(
            context
                .l10n
                .eventSuccessEventSuccessCompanionLiveCardsTextArrivalCheckIn,
            variant: CatchTextVariant.titleL,
          ),
          gapH6,
          CatchText(
            context
                .l10n
                .eventSuccessEventSuccessCompanionLiveCardsTextConfirmYouAreAt,
            variant: CatchTextVariant.supporting,
            color: t.ink2,
          ),
          gapH14,
          CompanionStageActionSection(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                CatchButton(
                  label: context
                      .l10n
                      .eventSuccessEventSuccessCompanionLiveCardsLabelScanHostQr,
                  leading: Icon(CatchIcons.qrCodeScannerRounded),
                  status: (busy)
                      ? CatchButtonStatus.loading
                      : CatchButtonStatus.idle,
                  onPressed: busy ? null : () => _scanHostQr(context),
                  fullWidth: true,
                ),
                gapH8,
                CatchButton(
                  label: context
                      .l10n
                      .eventSuccessEventSuccessCompanionLiveCardsLabelCheckIn,
                  variant: CatchButtonVariant.ghost,
                  status: (busy)
                      ? CatchButtonStatus.loading
                      : CatchButtonStatus.idle,
                  onPressed: busy ? null : () => _scanHostQr(context),
                  fullWidth: true,
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Future<void> _scanHostQr(BuildContext context) async {
    final venueSessionToken = await showCatchBottomSheet<String>(
      context: context,
      builder: (context) =>
          EventCheckInQrScannerSheet(eventId: widget.event.id),
    );
    if (venueSessionToken != null && context.mounted) {
      await _checkIn(venueSessionToken);
    }
  }

  Future<void> _checkIn(String venueSessionToken) async {
    setState(() => _checkingIn = true);
    try {
      await widget.onSelfCheckIn(venueSessionToken);
    } finally {
      if (mounted) setState(() => _checkingIn = false);
    }
  }
}

class StagePromptCard extends StatelessWidget {
  const StagePromptCard({super.key, required this.prompt, this.title});

  final String prompt;
  final String? title;

  @override
  Widget build(BuildContext context) {
    final t = CatchTokens.of(context);
    return CompanionStageSurface(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          StageSectionHeader(
            icon: CatchIcons.chatBubbleOutlineRounded,
            label: title ?? context.l10n.eventSuccessSocialMissionTitle,
            color: t.primary,
          ),
          gapH12,
          CatchText(prompt, variant: CatchTextVariant.titleL),
        ],
      ),
    );
  }
}

class StageConversationCueCard extends StatelessWidget {
  const StageConversationCueCard({
    super.key,
    required this.title,
    required this.cues,
    this.subtitle,
  });

  final String title;
  final String? subtitle;
  final List<EventSuccessConversationCue> cues;

  @override
  Widget build(BuildContext context) {
    if (cues.isEmpty) return const SizedBox.shrink();

    final t = CatchTokens.of(context);
    final moment = cues.first.moment;
    final icon = switch (moment) {
      EventSuccessConversationCueMoment.live => CatchIcons.forumOutlined,
      EventSuccessConversationCueMoment.postEvent => CatchIcons.chatOutlined,
    };
    return CompanionStageSurface(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          StageSectionHeader(icon: icon, label: title, color: t.primary),
          if (subtitle != null) ...[
            gapH8,
            CatchText(
              subtitle!,
              variant: CatchTextVariant.supporting,
              color: t.ink2,
            ),
          ],
          gapH14,
          for (final cue in cues.take(3)) StageCueCard(cue: cue),
        ],
      ),
    );
  }
}

class StageCueCard extends StatelessWidget {
  const StageCueCard({super.key, required this.cue});

  final EventSuccessConversationCue cue;

  @override
  Widget build(BuildContext context) {
    final t = CatchTokens.of(context);
    return Padding(
      padding: _companionStageCueGap,
      child: CatchSurface(
        backgroundColor: t.primarySoft,
        radius: CatchRadius.sm,
        padding: CatchInsets.contentDense,
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Expanded(
                  child: CatchText(
                    cue.title,
                    variant: CatchTextVariant.sectionTitle,
                  ),
                ),
                Tooltip(
                  message:
                      cue.moment == EventSuccessConversationCueMoment.postEvent
                      ? context
                            .l10n
                            .eventSuccessEventSuccessCompanionLiveCardsMessageCopyOpener
                      : context
                            .l10n
                            .eventSuccessEventSuccessCompanionLiveCardsMessageCopyCue,
                  child: CatchIconAction(
                    onPressed: () => _copyCue(context, cue),
                    child: Icon(
                      CatchIcons.contentCopyRounded,
                      size: CatchIcon.md,
                      color: t.primary,
                    ),
                  ),
                ),
              ],
            ),
            gapH4,
            CatchText(
              cue.body,
              variant: CatchTextVariant.supporting,
              color: t.ink2,
            ),
          ],
        ),
      ),
    );
  }

  Future<void> _copyCue(
    BuildContext context,
    EventSuccessConversationCue cue,
  ) async {
    await Clipboard.setData(ClipboardData(text: cue.body));
    if (!context.mounted) return;
    showCatchNotice(
      context,
      cue.moment == EventSuccessConversationCueMoment.postEvent
          ? context
                .l10n
                .eventSuccessEventSuccessCompanionLiveCardsVisiblecopyOpenerCopied
          : context
                .l10n
                .eventSuccessEventSuccessCompanionLiveCardsVisiblecopyCueCopied,
    );
  }
}

class StageSectionHeader extends StatelessWidget {
  const StageSectionHeader({
    super.key,
    required this.icon,
    required this.label,
    required this.color,
  });

  final IconData icon;
  final String label;
  final Color color;

  @override
  Widget build(BuildContext context) {
    return Row(
      children: [
        Icon(icon, size: CatchIcon.md, color: color),
        gapW6,
        Expanded(
          child: Text(
            label,
            maxLines: 2,
            overflow: TextOverflow.ellipsis,
            style: CatchTextStyles.labelL(context, color: color),
          ),
        ),
      ],
    );
  }
}
