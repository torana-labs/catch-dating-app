part of 'host_event_participants_section.dart';

class HostEventCheckInQrSection extends ConsumerStatefulWidget {
  const HostEventCheckInQrSection({super.key, required this.event});

  final Event event;

  @override
  ConsumerState<HostEventCheckInQrSection> createState() =>
      _HostEventCheckInQrSectionState();
}

String hostEventVenueQrData({
  required Event event,
  required String venueSessionToken,
}) => EventVenueSessionQrPayload(
  eventId: event.id,
  venueSessionToken: venueSessionToken,
).encode(runtimeJoinUri: event.runtimeJoinUri());

class _HostEventCheckInQrSectionState
    extends ConsumerState<HostEventCheckInQrSection> {
  bool _sharing = false;

  Future<void> _shareRuntimeLink(Uri runtimeLink) async {
    if (_sharing) return;
    setState(() => _sharing = true);
    try {
      await ref
          .read(externalShareControllerProvider)
          .shareText(
            subject:
                context.l10n.hostsHostEventAttendancePanelRuntimeShareSubject,
            text: context.l10n.hostsHostEventAttendancePanelRuntimeShareText(
              runtimeUrl: runtimeLink.toString(),
            ),
          );
      if (mounted) {
        showCatchNotice(
          context,
          context.l10n.hostsHostEventAttendancePanelRuntimeShareReady,
        );
      }
    } catch (error) {
      if (mounted) showCatchNoticeError(context, error);
    } finally {
      if (mounted) setState(() => _sharing = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final runtimeLink = widget.event.runtimeJoinUri();
    final venueSessionAsync = ref.watch(
      eventVenueSessionProvider(widget.event.id),
    );
    return Align(
      alignment: Alignment.centerLeft,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          venueSessionAsync.when(
            data: (session) => CatchSurface(
              radius: CatchRadius.sm,
              backgroundColor: CatchTokens.editorialWhite,
              padding: CatchInsets.iconChipContent,
              child: QrImageView(
                key: ValueKey('host_event_live_qr_${session.expiresAtMillis}'),
                data: hostEventVenueQrData(
                  event: widget.event,
                  venueSessionToken: session.venueSessionToken,
                ),
                size: CatchLayout.eventSuccessVenueQrExtent,
                padding: EdgeInsets.zero,
                backgroundColor: CatchTokens.editorialWhite,
              ),
            ),
            loading: () => const SizedBox.square(
              dimension: CatchLayout.eventSuccessVenueQrExtent,
              child: Center(child: CircularProgressIndicator()),
            ),
            error: (error, _) => SizedBox(
              width: CatchLayout.eventSuccessVenueQrErrorMaxWidth,
              child: CatchLocalizedErrorState(
                error,
                onRetry: () =>
                    ref.invalidate(eventVenueSessionProvider(widget.event.id)),
                mode: CatchErrorStateMode.inline,
              ),
            ),
          ),
          if (runtimeLink != null) ...[
            gapH10,
            CatchButton(
              label:
                  context.l10n.hostsHostEventAttendancePanelRuntimeShareLabel,
              leading: Icon(CatchIcons.share),
              size: CatchButtonSize.md,
              variant: CatchButtonVariant.secondary,
              status: (_sharing)
                  ? CatchButtonStatus.loading
                  : CatchButtonStatus.idle,
              onPressed: _sharing ? null : () => _shareRuntimeLink(runtimeLink),
            ),
          ],
        ],
      ),
    );
  }
}
