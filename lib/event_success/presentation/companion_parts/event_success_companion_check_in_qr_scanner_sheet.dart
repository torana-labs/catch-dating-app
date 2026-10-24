part of '../event_success_companion_screen.dart';

class EventCheckInQrScannerSheet extends StatefulWidget {
  const EventCheckInQrScannerSheet({super.key, required this.eventId});

  final String eventId;

  @override
  State<EventCheckInQrScannerSheet> createState() =>
      _EventCheckInQrScannerSheetState();
}

class _EventCheckInQrScannerSheetState
    extends State<EventCheckInQrScannerSheet> {
  String? _errorText;

  @override
  Widget build(BuildContext context) {
    final t = CatchTokens.of(context);
    final height = math.min(MediaQuery.sizeOf(context).height * 0.72, 560.0);
    return SizedBox(
      height: height,
      child: Padding(
        padding: _companionQrSheetPadding,
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Icon(CatchIcons.qrCodeScannerRounded, color: t.primary),
                gapW10,
                Expanded(
                  child: CatchText(
                    context
                        .l10n
                        .eventSuccessEventSuccessCompanionLiveCardsTextScanHostQr,
                    variant: CatchTextVariant.sectionTitle,
                  ),
                ),
                Tooltip(
                  message: context
                      .l10n
                      .eventSuccessEventSuccessCompanionLiveCardsMessageClose,
                  child: CatchIconAction(
                    onPressed: () => Navigator.of(context).maybePop(),
                    child: Icon(
                      CatchIcons.closeRounded,
                      size: CatchIcon.md,
                      color: t.ink2,
                    ),
                  ),
                ),
              ],
            ),
            gapH10,
            Expanded(
              child: ClipRRect(
                borderRadius: BorderRadius.circular(CatchRadius.sm),
                child: Stack(
                  fit: StackFit.expand,
                  children: [
                    EventCheckInQrScanner(
                      eventId: widget.eventId,
                      onResult: _handleScanResult,
                    ),
                    CatchSurface(
                      tone: CatchSurfaceTone.transparent,
                      radius: CatchRadius.sm,
                      borderSpec: CatchBorderSpec(
                        role: CatchBorderRole.selected,
                        color: t.primary,
                        width: CatchStroke.selection,
                      ),
                      padding: EdgeInsets.zero,
                      duration: Duration.zero,
                      child: const SizedBox.expand(),
                    ),
                    if (_errorText != null)
                      Align(
                        alignment: Alignment.bottomCenter,
                        child: CatchSurface(
                          width: double.infinity,
                          padding: CatchInsets.contentDense,
                          backgroundColor: t.ink.withValues(
                            alpha: CatchOpacity.eventSuccessQrErrorFill,
                          ),
                          radius: CatchRadius.none,
                          child: CatchText(
                            _errorText!,
                            variant: CatchTextVariant.supporting,
                            color: CatchTokens.editorialWhite,
                            textAlign: TextAlign.center,
                          ),
                        ),
                      ),
                  ],
                ),
              ),
            ),
            gapH10,
            CatchText(
              context
                  .l10n
                  .eventSuccessEventSuccessCompanionLiveCardsTextLocationStillVerifiesThe,
              variant: CatchTextVariant.supporting,
              color: t.ink2,
            ),
          ],
        ),
      ),
    );
  }

  void _handleScanResult(EventCheckInQrScan scan) {
    switch (scan.result) {
      case EventCheckInQrScanResult.ignored:
        return;
      case EventCheckInQrScanResult.invalid:
        setState(
          () => _errorText = context
              .l10n
              .eventSuccessEventSuccessCompanionLiveCardsVisiblecopyThisIsNotA,
        );
      case EventCheckInQrScanResult.wrongEvent:
        setState(
          () => _errorText = context
              .l10n
              .eventSuccessEventSuccessCompanionLiveCardsVisiblecopyThisQrBelongsTo,
        );
      case EventCheckInQrScanResult.printableJoinOnly:
        setState(
          () => _errorText = context
              .l10n
              .eventSuccessEventSuccessCompanionLiveCardsTextLocationStillVerifiesThe,
        );
      case EventCheckInQrScanResult.matchedVenueSession:
        unawaited(HapticFeedback.lightImpact());
        Navigator.of(context).maybePop(scan.venueSessionToken);
    }
  }
}
