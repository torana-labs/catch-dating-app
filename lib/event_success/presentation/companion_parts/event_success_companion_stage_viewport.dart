part of '../event_success_companion_screen.dart';

class CompanionStageScaffold extends StatelessWidget {
  const CompanionStageScaffold._({
    required this.event,
    required this.plan,
    required this.presentation,
    required this._stageTheme,
    required this.attended,
    required this.showSelfCheckIn,
    required this.eventEnded,
    required this.momentKey,
    required this.momentKind,
    required this.referenceNow,
    required this.content,
  });

  final Event event;
  final EventSuccessPlan plan;
  final EventSuccessMomentPresentation presentation;
  final _CompanionStageTheme _stageTheme;
  final bool attended;
  final bool showSelfCheckIn;
  final bool eventEnded;
  final String momentKey;
  final EventSuccessAttendeeMomentKind momentKind;
  final DateTime referenceNow;
  final Widget content;

  @override
  Widget build(BuildContext context) {
    final stageTheme = _stageTheme;
    return CatchScaffold.workspace(
      key: const ValueKey('eventSuccessCompanionStage'),
      backgroundColor: stageTheme.background,
      body: CatchSurface(
        duration: CatchMotion.slow,
        radius: CatchRadius.none,
        gradient: stageTheme.gradient,
        child: Stack(
          children: [
            Positioned.fill(
              child: IgnorePointer(
                child: CompanionStageMotifImage._(
                  accent: stageTheme.accent,
                  foreground: stageTheme.foreground,
                  visualAsset: stageTheme.visualAsset,
                  idlePulsePeriodMs:
                      presentation.choreography.idlePulsePeriodMs,
                ),
              ),
            ),
            // Sits between motif background and content. Renders nothing
            // when not in the reveal moment, so other beats are untouched.
            Positioned.fill(
              child: RevealCinematicOverlay._(
                eventId: event.id,
                plan: plan,
                presentation: presentation.choreography,
                referenceNow: referenceNow,
                momentKind: momentKind,
                stageTheme: stageTheme,
                checkedInCount: event.checkedInCount ?? 0,
                tickInterval: eventSuccessCeremonyTickInterval,
              ),
            ),
            SafeArea(
              child: CatchScrollView(
                scrollViewKey: EventSuccessCompanionKeys.scrollView,
                maxContentWidth: CatchLayout.maxContentWidth,
                padding: _companionMomentStagePadding,
                child: CompanionMomentViewport._(
                  event: event,
                  plan: plan,
                  presentation: presentation,
                  stageTheme: stageTheme,
                  attended: attended,
                  showSelfCheckIn: showSelfCheckIn,
                  eventEnded: eventEnded,
                  momentKey: momentKey,
                  momentKind: momentKind,
                  content: content,
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class CompanionMomentViewport extends StatelessWidget {
  const CompanionMomentViewport._({
    required this.event,
    required this.plan,
    required this.presentation,
    required this._stageTheme,
    required this.attended,
    required this.showSelfCheckIn,
    required this.eventEnded,
    required this.momentKey,
    required this.momentKind,
    required this.content,
  });

  final Event event;
  final EventSuccessPlan plan;
  final EventSuccessMomentPresentation presentation;
  final _CompanionStageTheme _stageTheme;
  final bool attended;
  final bool showSelfCheckIn;
  final bool eventEnded;
  final String momentKey;
  final EventSuccessAttendeeMomentKind momentKind;
  final Widget content;

  /// Co-presence ring is meaningful only while the room is still gathering.
  /// During the live event itself, the room composition is already known and
  /// the ring just clutters the stage.
  bool get _showArrivalRing => switch (momentKind) {
    EventSuccessAttendeeMomentKind.preArrival ||
    EventSuccessAttendeeMomentKind.selfCheckIn ||
    EventSuccessAttendeeMomentKind.firstHelloCheckIn => true,
    _ => false,
  };

  @override
  Widget build(BuildContext context) {
    final stageTheme = _stageTheme;
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        CompanionStageNavigationRow(foreground: stageTheme.foreground),
        gapH16,
        CompanionHeroSection._(
          event: event,
          plan: plan,
          presentation: presentation,
          stageTheme: stageTheme,
          attended: attended,
          showSelfCheckIn: showSelfCheckIn,
          eventEnded: eventEnded,
        ),
        gapH32,
        if (_showArrivalRing) ...[
          Center(
            child: CompanionArrivalProgressIndicator._(
              checkedInCount: event.checkedInCount ?? 0,
              stageTheme: stageTheme,
              idlePulsePeriodMs: presentation.choreography.idlePulsePeriodMs,
            ),
          ),
          gapH18,
        ] else ...[
          CompanionStageImage._(
            stageTheme: stageTheme,
            icon: presentation.icon,
          ),
          gapH18,
        ],
        AnimatedSwitcher(
          duration: CatchMotion.slow,
          switchInCurve: CatchMotion.standardCurve,
          switchOutCurve: CatchMotion.easeInCubicCurve,
          transitionBuilder: (child, animation) {
            final curved = CurvedAnimation(
              parent: animation,
              curve: CatchMotion.standardCurve,
              reverseCurve: CatchMotion.easeInCubicCurve,
            );
            final offset = Tween<Offset>(
              begin: const Offset(0, 0.16),
              end: Offset.zero,
            ).animate(curved);
            final scale = Tween<double>(begin: 0.94, end: 1).animate(curved);
            return FadeTransition(
              opacity: curved,
              child: SlideTransition(
                position: offset,
                child: ScaleTransition(scale: scale, child: child),
              ),
            );
          },
          child: KeyedSubtree(
            key: ValueKey(momentKey),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                CatchText(
                  presentation.headline,
                  variant: CatchTextVariant.headline,
                  color: stageTheme.foreground,
                ),
                gapH10,
                CatchText(
                  presentation.body,
                  variant: CatchTextVariant.bodyL,
                  color: stageTheme.foreground.withValues(
                    alpha: CatchOpacity.eventSuccessProminent,
                  ),
                ),
                gapH16,
                CompanionPrivacyText._(
                  text: presentation.privacyLine,
                  stageTheme: stageTheme,
                ),
                gapH20,
                content,
              ],
            ),
          ),
        ),
      ],
    );
  }
}

class CompanionStageNavigationRow extends StatelessWidget {
  const CompanionStageNavigationRow({super.key, required this.foreground});

  final Color foreground;

  @override
  Widget build(BuildContext context) {
    final canPop = _companionCanPop(context);
    return Row(
      children: [
        Tooltip(
          message:
              context.l10n.eventSuccessEventSuccessCompanionSharedMessageBack,
          child: CatchIconAction(
            backgroundColor: foreground.withValues(
              alpha: CatchOpacity.subtleFill,
            ),
            onPressed: canPop ? () => _popCompanion(context) : null,
            child: Icon(
              CatchIcons.arrowBackRounded,
              size: CatchIcon.md,
              color: canPop
                  ? foreground
                  : foreground.withValues(
                      alpha: CatchOpacity.eventSuccessDisabled,
                    ),
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
            style: CatchTextStyles.labelL(
              context,
              color: foreground.withValues(
                alpha: CatchOpacity.eventSuccessChrome,
              ),
            ),
          ),
        ),
        gapW8,
        SizedBox(
          width: CatchLayout.eventSuccessStageNavExtent,
          height: CatchLayout.eventSuccessStageNavExtent,
          child: Icon(
            CatchIcons.radioButtonCheckedRounded,
            color: foreground.withValues(alpha: CatchOpacity.eventSuccessMuted),
          ),
        ),
      ],
    );
  }
}

class CompanionHeroSection extends StatelessWidget {
  const CompanionHeroSection._({
    required this.event,
    required this.plan,
    required this.presentation,
    required this._stageTheme,
    required this.attended,
    required this.showSelfCheckIn,
    required this.eventEnded,
  });

  final Event event;
  final EventSuccessPlan plan;
  final EventSuccessMomentPresentation presentation;
  final _CompanionStageTheme _stageTheme;
  final bool attended;
  final bool showSelfCheckIn;
  final bool eventEnded;

  @override
  Widget build(BuildContext context) {
    final fg = _stageTheme.foreground;
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Wrap(
          spacing: CatchSpacing.s2,
          runSpacing: CatchSpacing.s2,
          children: [
            CatchBadge(
              label: _heroBadgeLabel(
                attended: attended,
                showSelfCheckIn: showSelfCheckIn,
                eventEnded: eventEnded,
              ),
              tone: attended ? CatchBadgeTone.success : CatchBadgeTone.brand,
              icon: attended
                  ? CatchIcons.checkRounded
                  : CatchIcons.qrCode2Rounded,
              backgroundColor: fg.withValues(alpha: CatchOpacity.subtleFill),
              foregroundColor: fg,
              borderColor: fg.withValues(
                alpha: CatchOpacity.eventSuccessSubtleBorder,
              ),
            ),
            CatchBadge(
              label: presentation.badgeLabel,
              tone: presentation.badgeTone,
              icon: presentation.icon,
              backgroundColor: fg.withValues(alpha: CatchOpacity.subtleFill),
              foregroundColor: fg,
              borderColor: fg.withValues(
                alpha: CatchOpacity.eventSuccessSubtleBorder,
              ),
            ),
          ],
        ),
        gapH14,
        CatchText(event.title, variant: CatchTextVariant.titleL, color: fg),
        gapH4,
        CatchText(
          context.l10n
              .eventSuccessEventSuccessCompanionSharedTextTitleLocationname29e462(
                title: plan.playbook.title,
                locationName: event.locationName,
              ),
          variant: CatchTextVariant.supporting,
          color: fg.withValues(alpha: CatchOpacity.eventSuccessMutedInk),
        ),
      ],
    );
  }
}

/// Animates a one-shot entry on first build, then breathes the glyph
/// continuously so the hero element never reads as static between moments.

class CompanionStageImage extends StatefulWidget {
  const CompanionStageImage._({required this._stageTheme, required this.icon});

  final _CompanionStageTheme _stageTheme;
  final IconData icon;

  @override
  State<CompanionStageImage> createState() => _CompanionStageImageState();
}

class CompanionPrivacyText extends StatelessWidget {
  const CompanionPrivacyText._({required this.text, required this._stageTheme});

  final String text;
  final _CompanionStageTheme _stageTheme;

  @override
  Widget build(BuildContext context) {
    final stageTheme = _stageTheme;
    return CatchSurface(
      padding: CatchInsets.contentDense,
      radius: CatchRadius.sm,
      backgroundColor: stageTheme.foreground.withValues(
        alpha: CatchOpacity.clubCoverHighlightOverlay,
      ),
      borderSpec: CatchBorder.resolve(
        CatchTokens.of(context),
        CatchBorderRole.boundary,
        color: stageTheme.foreground.withValues(
          alpha: CatchOpacity.eventSuccessPrivacyBorder,
        ),
      ),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Icon(
            CatchIcons.lockOutlineRounded,
            size: CatchIcon.md,
            color: stageTheme.foreground.withValues(
              alpha: CatchOpacity.eventSuccessProminent,
            ),
          ),
          gapW8,
          Expanded(
            child: CatchText(
              text,
              variant: CatchTextVariant.supporting,
              color: stageTheme.foreground.withValues(
                alpha: CatchOpacity.eventSuccessProminent,
              ),
            ),
          ),
        ],
      ),
    );
  }
}

class CompanionMomentPageBody extends StatelessWidget {
  const CompanionMomentPageBody({super.key, required this.children});

  final List<Widget> children;

  @override
  Widget build(BuildContext context) {
    if (children.isEmpty) return const SizedBox.shrink();
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        for (var index = 0; index < children.length; index++) ...[
          if (index > 0) gapH12,
          children[index],
        ],
      ],
    );
  }
}

/// Ambient stage card. The border alpha breathes on a 6s sine so the surface
/// never reads as static — even when no content is changing.

class CompanionStageSurface extends StatefulWidget {
  const CompanionStageSurface({super.key, required this.child});

  final Widget child;

  @override
  State<CompanionStageSurface> createState() => _CompanionStageSurfaceState();
}

class CompanionStageActionSection extends StatelessWidget {
  const CompanionStageActionSection({super.key, required this.child});

  final Widget child;

  @override
  Widget build(BuildContext context) {
    final t = CatchTokens.of(context);
    return CatchSurface(
      radius: CatchRadius.sm,
      backgroundColor: t.ink.withValues(
        alpha: CatchOpacity.eventSuccessActionDockFill,
      ),
      borderSpec: CatchBorder.resolve(
        t,
        CatchBorderRole.boundary,
        color: t.surface.withValues(alpha: CatchOpacity.warningFill),
      ),
      child: Padding(padding: CatchInsets.iconChipContent, child: child),
    );
  }
}

class CompanionStageBanner extends StatelessWidget {
  const CompanionStageBanner({super.key, required this.child});

  final Widget child;

  @override
  Widget build(BuildContext context) {
    final t = CatchTokens.of(context);
    return CatchSurface(
      radius: CatchRadius.sm,
      backgroundColor: t.primarySoft,
      child: Padding(padding: CatchInsets.contentDense, child: child),
    );
  }
}
