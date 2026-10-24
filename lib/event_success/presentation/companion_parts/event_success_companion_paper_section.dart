part of '../event_success_companion_screen.dart';

class CompanionPaperScaffold extends StatelessWidget {
  const CompanionPaperScaffold({
    super.key,
    required this.event,
    required this.plan,
    required this.presentation,
    required this.showSelfCheckIn,
    required this.eventEnded,
    required this.selfCheckInActionState,
    required this.onSelfCheckIn,
  });

  final Event event;
  final EventSuccessPlan plan;
  final EventSuccessMomentPresentation presentation;
  final bool showSelfCheckIn;
  final bool eventEnded;
  final SelfCheckInActionState selfCheckInActionState;
  final Future<void> Function(String venueSessionToken) onSelfCheckIn;

  @override
  Widget build(BuildContext context) {
    final t = CatchTokens.of(context);
    return CatchScaffold.workspace(
      key: const ValueKey('eventSuccessCompanionPaper'),
      backgroundColor: t.bg,
      footer: showSelfCheckIn
          ? SafeArea(
              minimum: CatchInsets.pageBody.copyWith(
                top: CatchSpacing.s2,
                bottom: CatchSpacing.s3,
              ),
              child: CompanionSelfCheckInSection(
                event: event,
                actionState: selfCheckInActionState,
                onSelfCheckIn: onSelfCheckIn,
              ),
            )
          : null,
      body: SafeArea(
        child: CatchScrollView(
          scrollViewKey: EventSuccessCompanionKeys.scrollView,
          maxContentWidth: CatchLayout.maxContentWidth,
          padding: CatchInsets.pageBody.copyWith(
            top: CatchSpacing.s2,
            bottom: CatchSpacing.s8,
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              CompanionPaperNavigationRow(plan: plan),
              gapH20,
              CompanionPaperTicket(event: event, plan: plan),
              gapH24,
              CompanionExpectationSection(
                event: event,
                plan: plan,
                showSelfCheckIn: showSelfCheckIn,
                eventEnded: eventEnded,
              ),
              if (!showSelfCheckIn) ...[
                gapH16,
                CompanionPrivacySection(text: presentation.privacyLine),
              ],
            ],
          ),
        ),
      ),
    );
  }
}

class CompanionPaperNavigationRow extends StatelessWidget {
  const CompanionPaperNavigationRow({super.key, required this.plan});

  final EventSuccessPlan plan;

  @override
  Widget build(BuildContext context) {
    final t = CatchTokens.of(context);
    final canPop = _companionCanPop(context);
    final totalSteps = math.max(1, plan.playbook.runOfShow.length);
    final activeStep = (plan.activeStepIndex + 1).clamp(1, totalSteps);
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        Row(
          children: [
            Tooltip(
              message: MaterialLocalizations.of(context).backButtonTooltip,
              child: CatchIconAction(
                backgroundColor: Colors.transparent,
                onPressed: canPop ? () => _popCompanion(context) : null,
                child: Icon(
                  CatchIcons.arrowBackRounded,
                  size: CatchIcon.md,
                  color: canPop ? t.ink3 : t.line2,
                ),
              ),
            ),
            gapW8,
            Expanded(
              child: Text(
                context
                    .l10n
                    .eventSuccessEventSuccessCompanionSharedTextEventCompanion,
                textAlign: TextAlign.center,
                style: CatchTextStyles.fieldRowTitle(context),
              ),
            ),
            gapW8,
            SizedBox(
              width: CatchLayout.eventSuccessStageNavExtent,
              child: CatchText(
                context.l10n
                    .eventSuccessEventSuccessCompanionSharedTextPadleftTotalsteps(
                      padLeft: activeStep.toString().padLeft(2, '0'),
                      totalSteps: totalSteps,
                    ),
                textAlign: TextAlign.end,
                variant: CatchTextVariant.statusLabel,
                color: t.ink2,
              ),
            ),
          ],
        ),
        gapH18,
        CompanionPaperProgressIndicator(active: activeStep, total: totalSteps),
      ],
    );
  }
}

class CompanionPaperProgressIndicator extends StatelessWidget {
  const CompanionPaperProgressIndicator({
    super.key,
    required this.active,
    required this.total,
  });

  final int active;
  final int total;

  @override
  Widget build(BuildContext context) {
    final t = CatchTokens.of(context);
    final count = total.clamp(1, 13);
    return Row(
      children: [
        for (var index = 0; index < count; index++) ...[
          Expanded(
            child: CatchSurface(
              backgroundColor: index < active ? t.primary : t.line2,
              radius: CatchRadius.pill,
              height: CatchSpacing.micro3,
              padding: EdgeInsets.zero,
              duration: Duration.zero,
              child: const SizedBox.expand(),
            ),
          ),
          if (index != count - 1) gapW4,
        ],
      ],
    );
  }
}

class CompanionPaperTicket extends StatelessWidget {
  const CompanionPaperTicket({
    super.key,
    required this.event,
    required this.plan,
  });

  final Event event;
  final EventSuccessPlan plan;

  @override
  Widget build(BuildContext context) {
    final t = CatchTokens.of(context);
    final activitySwatch = ActivityPalette.of(
      context,
    ).forKind(event.activityKind);
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        CatchText(
          context
              .l10n
              .eventSuccessEventSuccessCompanionSharedTextYourTicketToday,
          variant: CatchTextVariant.sectionTitle,
          color: t.ink2,
        ),
        gapH12,
        CatchSurface(
          padding: EdgeInsets.zero,
          radius: CatchRadius.md,
          backgroundColor: t.surface,
          borderRole: CatchBorderRole.separator,
          boxShadow: CatchElevation.card,
          child: ClipRRect(
            borderRadius: BorderRadius.circular(CatchRadius.md),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                CompanionPaperTicketHeader(
                  event: event,
                  plan: plan,
                  swatch: activitySwatch,
                ),
                Padding(
                  padding: CatchInsets.contentDense,
                  child: Row(
                    children: [
                      Expanded(
                        child: CompanionPaperTicketRow(
                          label: context
                              .l10n
                              .eventSuccessEventSuccessCompanionSharedLabelWhen,
                          value: _paperTicketTime(event),
                        ),
                      ),
                      gapW12,
                      Expanded(
                        child: CompanionPaperTicketRow(
                          label: context
                              .l10n
                              .eventSuccessEventSuccessCompanionSharedLabelWhere,
                          value: event.locationName,
                        ),
                      ),
                      gapW12,
                      Expanded(
                        child: CompanionPaperTicketRow(
                          label: context
                              .l10n
                              .eventSuccessEventSuccessCompanionSharedLabelEntry,
                          value: event.isFree
                              ? context
                                    .l10n
                                    .eventSuccessEventSuccessCompanionSharedVisiblecopyFree
                              : EventFormatters.priceInPaise(
                                  event.priceInPaise,
                                  currencyCode: event.currency,
                                ),
                        ),
                      ),
                    ],
                  ),
                ),
                const CompanionPaperTicketDivider(),
                Padding(
                  padding: CatchInsets.contentBlock,
                  child: Row(
                    children: [
                      Expanded(child: CompanionPaperTicketText(event: event)),
                      gapW16,
                      const CompanionPaperTicketImage(),
                    ],
                  ),
                ),
              ],
            ),
          ),
        ),
      ],
    );
  }
}

class CompanionPaperTicketHeader extends StatelessWidget {
  const CompanionPaperTicketHeader({
    super.key,
    required this.event,
    required this.plan,
    required this.swatch,
  });

  final Event event;
  final EventSuccessPlan plan;
  final ActivitySwatch swatch;

  @override
  Widget build(BuildContext context) {
    final foreground = CatchTokens.editorialWhite;
    return CatchSurface(
      radius: CatchRadius.none,
      backgroundColor: swatch.deep,
      child: Stack(
        children: [
          Positioned.fill(
            child: CustomPaint(
              painter: _CompanionPaperTicketHeaderPainter(
                lineColor: swatch.accent.withValues(
                  alpha: CatchOpacity.eventSuccessPaperLine,
                ),
                markColor: foreground.withValues(
                  alpha: CatchOpacity.eventSuccessPaperMark,
                ),
              ),
            ),
          ),
          Padding(
            padding: CatchInsets.paperTicketHeader,
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                CatchText(
                  context.l10n
                      .eventSuccessEventSuccessCompanionSharedTextTitleLocationname(
                        title: plan.playbook.title,
                        locationName: event.locationName,
                      )
                      .toUpperCase(),
                  maxLines: 1,

                  variant: CatchTextVariant.sectionTitle,
                  color: foreground.withValues(
                    alpha: CatchOpacity.eventSuccessProminent,
                  ),
                ),
                gapH6,
                CatchText(
                  event.title,
                  maxLines: 2,

                  variant: CatchTextVariant.titleL,
                  color: foreground,
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

class CompanionPaperTicketRow extends StatelessWidget {
  const CompanionPaperTicketRow({
    super.key,
    required this.label,
    required this.value,
  });

  final String label;
  final String value;

  @override
  Widget build(BuildContext context) {
    final t = CatchTokens.of(context);
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        CatchText(
          label,
          maxLines: 1,

          variant: CatchTextVariant.sectionTitle,
          color: t.ink3,
        ),
        gapH6,
        Text(
          value,
          maxLines: 2,
          overflow: TextOverflow.ellipsis,
          style: CatchTextStyles.labelL(context),
        ),
      ],
    );
  }
}

class CompanionPaperTicketDivider extends StatelessWidget {
  const CompanionPaperTicketDivider({super.key});

  @override
  Widget build(BuildContext context) {
    final t = CatchTokens.of(context);
    return SizedBox(
      height: CatchSpacing.s3,
      child: CustomPaint(
        painter: _CompanionPaperTicketDividerPainter(color: t.line2),
      ),
    );
  }
}

class CompanionPaperTicketText extends StatelessWidget {
  const CompanionPaperTicketText({super.key, required this.event});

  final Event event;

  @override
  Widget build(BuildContext context) {
    final booked = event.bookedCount ?? 0;
    final capacity = event.capacityLimit;
    final label = context.l10n
        .eventSuccessEventSuccessCompanionSharedLabelAdmitOneNoPadleft(
          padLeft: booked.toString().padLeft(2, '0'),
          capacity: capacity,
        );
    final value = _paperTicketCode(event);

    return CompanionPaperTicketRow(label: label, value: value);
  }
}

class CompanionPaperTicketImage extends StatelessWidget {
  const CompanionPaperTicketImage({super.key});

  @override
  Widget build(BuildContext context) {
    final t = CatchTokens.of(context);
    return SizedBox(
      width: CatchLayout.eventSuccessPaperBarcodeWidth,
      height: CatchLayout.eventSuccessPaperBarcodeHeight,
      child: CustomPaint(
        painter: _CompanionPaperTicketImagePainter(color: t.ink),
      ),
    );
  }
}

class CompanionExpectationSection extends StatelessWidget {
  const CompanionExpectationSection({
    super.key,
    required this.event,
    required this.plan,
    required this.showSelfCheckIn,
    required this.eventEnded,
  });

  final Event event;
  final EventSuccessPlan plan;
  final bool showSelfCheckIn;
  final bool eventEnded;

  @override
  Widget build(BuildContext context) {
    final t = CatchTokens.of(context);
    final items = _paperExpectationItems(
      l10n: context.l10n,
      event: event,
      plan: plan,
      showSelfCheckIn: showSelfCheckIn,
      eventEnded: eventEnded,
    );
    return CatchSurface(
      radius: CatchRadius.md,
      backgroundColor: t.surface,
      borderRole: CatchBorderRole.separator,
      padding: CatchInsets.content,
      boxShadow: CatchElevation.card,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          StageSectionHeader(
            icon: CatchIcons.eventAvailableRounded,
            label: context
                .l10n
                .eventSuccessEventSuccessCompanionSharedLabelWhatToExpect,
            color: t.primary,
          ),
          gapH12,
          for (final item in items) ...[
            CompanionExpectationRow._(item: item),
            if (item != items.last) gapH12,
          ],
        ],
      ),
    );
  }
}

class CompanionExpectationRow extends StatelessWidget {
  const CompanionExpectationRow._({required this._item});

  final _PaperExpectationItem _item;

  @override
  Widget build(BuildContext context) {
    final t = CatchTokens.of(context);
    final item = _item;
    return Row(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Padding(
          padding: CatchInsets.inlineIconTopTight,
          child: Icon(item.icon, size: CatchIcon.sm, color: t.ink3),
        ),
        gapW12,
        Expanded(
          child: CatchText(item.label, variant: CatchTextVariant.supporting),
        ),
      ],
    );
  }
}

class CompanionPrivacySection extends StatelessWidget {
  const CompanionPrivacySection({super.key, required this.text});

  final String text;

  @override
  Widget build(BuildContext context) {
    final t = CatchTokens.of(context);
    return CatchSurface(
      radius: CatchRadius.sm,
      backgroundColor: t.primarySoft,
      padding: CatchInsets.contentDense,
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Icon(
            CatchIcons.lockOutlineRounded,
            size: CatchIcon.sm,
            color: t.ink2,
          ),
          gapW8,
          Expanded(
            child: CatchText(
              text,
              variant: CatchTextVariant.supporting,
              color: t.ink2,
            ),
          ),
        ],
      ),
    );
  }
}

class CompanionSelfCheckInSection extends StatelessWidget {
  const CompanionSelfCheckInSection({
    super.key,
    required this.event,
    required this.actionState,
    required this.onSelfCheckIn,
  });

  final Event event;
  final SelfCheckInActionState actionState;
  final Future<void> Function(String venueSessionToken) onSelfCheckIn;

  @override
  Widget build(BuildContext context) {
    return CatchButton(
      label:
          context.l10n.eventSuccessEventSuccessCompanionSharedLabelIMHereCheck,
      leading: Icon(CatchIcons.locationOnOutlined),
      status: (actionState.isCheckingIn)
          ? CatchButtonStatus.loading
          : CatchButtonStatus.idle,
      onPressed: actionState.isCheckingIn
          ? null
          : () => unawaited(_scanAndCheckIn(context)),
      fullWidth: true,
      size: CatchButtonSize.lg,
    );
  }

  Future<void> _scanAndCheckIn(BuildContext context) async {
    final venueSessionToken = await showCatchBottomSheet<String>(
      context: context,
      builder: (context) => EventCheckInQrScannerSheet(eventId: event.id),
    );
    if (venueSessionToken != null && context.mounted) {
      await onSelfCheckIn(venueSessionToken);
    }
  }
}
