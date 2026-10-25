import 'package:catch_dating_app/core/presentation/catch_ui_copy.dart';
import 'package:catch_dating_app/event_rehearsal/domain/event_rehearsal.dart';
import 'package:catch_dating_app/l10n/l10n.dart';
import 'package:catch_tokens/catch_tokens.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/material.dart';
import 'package:intl/intl.dart';
import 'package:qr_flutter/qr_flutter.dart';

class EventRehearsalGuestLinkSection extends StatelessWidget {
  const EventRehearsalGuestLinkSection({
    super.key,
    required this.guestUrl,
    required this.isLoading,
    required this.onCopy,
    required this.onShare,
    required this.onRotate,
  });

  final String guestUrl;
  final bool isLoading;
  final VoidCallback onCopy;
  final VoidCallback onShare;
  final VoidCallback onRotate;

  @override
  Widget build(BuildContext context) => CatchSection.fieldRows(
    title: context.l10n.hostEventRehearsalGuestLinkTitle,
    children: [
      CatchField.control(
        copy: catchFieldCopy(context.l10n),
        title: context.l10n.hostEventRehearsalGuestLinkTitle,
        body: context.l10n.hostEventRehearsalGuestLinkBody,
        icon: CatchIcons.qrCode2Rounded,
        contractExemption:
            'The callable returns this opaque practice-only guest URL.',
        disclosureMode: CatchFieldMode.localExpanded,
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            CatchSurface(
              duration: Duration.zero,
              radius: CatchRadius.none,
              backgroundColor: CatchTokens.editorialWhite,
              child: Padding(
                padding: CatchInsets.iconChipContent,
                child: QrImageView(
                  data: guestUrl,
                  size: CatchLayout.eventSuccessVenueQrExtent,
                  padding: EdgeInsets.zero,
                  backgroundColor: CatchTokens.editorialWhite,
                ),
              ),
            ),
            gapH12,
            SelectableText(
              guestUrl,
              style: Theme.of(context).textTheme.bodySmall,
            ),
            gapH12,
            Wrap(
              spacing: CatchSpacing.s2,
              runSpacing: CatchSpacing.s2,
              children: [
                CatchButton(
                  label: context.l10n.hostEventRehearsalCopyLink,
                  leading: Icon(CatchIcons.contentCopyRounded),
                  size: CatchButtonSize.md,
                  variant: CatchButtonVariant.secondary,
                  onPressed: isLoading ? null : onCopy,
                ),
                CatchButton(
                  label: context.l10n.hostEventRehearsalShareLink,
                  leading: Icon(CatchIcons.share),
                  size: CatchButtonSize.md,
                  variant: CatchButtonVariant.secondary,
                  onPressed: isLoading ? null : onShare,
                ),
                CatchButton(
                  label: context.l10n.hostEventRehearsalRotateLink,
                  leading: Icon(CatchIcons.refresh),
                  size: CatchButtonSize.md,
                  variant: CatchButtonVariant.ghost,
                  onPressed: isLoading ? null : onRotate,
                ),
              ],
            ),
          ],
        ),
      ),
    ],
  );
}

class EventRehearsalRunSection extends StatelessWidget {
  const EventRehearsalRunSection({
    super.key,
    required this.session,
    required this.isLoading,
    required this.onControl,
  });

  final EventRehearsalSession session;
  final bool isLoading;
  final void Function(EventRehearsalControlAction action, int? minutes)
  onControl;

  @override
  Widget build(BuildContext context) {
    final formatter = DateFormat.jm(
      Localizations.localeOf(context).toLanguageTag(),
    );
    return CatchSection.fieldRows(
      title: context.l10n.hostEventRehearsalRunTitle,
      children: [
        CatchField.control(
          copy: catchFieldCopy(context.l10n),
          title: context.l10n.hostEventRehearsalMoment(
            current: session.activeStepIndex + 1,
            total: EventRehearsalGuestMoment.values.length,
          ),
          body: context.l10n.hostEventRehearsalClock(
            time: formatter.format(session.virtualNow),
          ),
          icon: CatchIcons.timerOutlined,
          contractExemption:
              'Virtual rehearsal clock controls are callable-owned commands.',
          disclosureMode: CatchFieldMode.localExpanded,
          child: Wrap(
            spacing: CatchSpacing.s2,
            runSpacing: CatchSpacing.s2,
            children: [
              ...switch (session.status) {
                EventRehearsalStatus.draft || EventRehearsalStatus.ready => [
                  CatchButton(
                    label: context.l10n.hostEventRehearsalStart,
                    size: CatchButtonSize.md,
                    status: isLoading
                        ? CatchButtonStatus.loading
                        : CatchButtonStatus.idle,
                    onPressed: isLoading
                        ? null
                        : () => onControl(
                            EventRehearsalControlAction.start,
                            null,
                          ),
                  ),
                ],
                EventRehearsalStatus.running => [
                  CatchButton(
                    label: context.l10n.hostEventRehearsalPause,
                    size: CatchButtonSize.md,
                    variant: CatchButtonVariant.secondary,
                    status: isLoading
                        ? CatchButtonStatus.loading
                        : CatchButtonStatus.idle,
                    onPressed: isLoading
                        ? null
                        : () => onControl(
                            EventRehearsalControlAction.pause,
                            null,
                          ),
                  ),
                ],
                EventRehearsalStatus.paused => [
                  CatchButton(
                    label: context.l10n.hostEventRehearsalResume,
                    size: CatchButtonSize.md,
                    status: isLoading
                        ? CatchButtonStatus.loading
                        : CatchButtonStatus.idle,
                    onPressed: isLoading
                        ? null
                        : () => onControl(
                            EventRehearsalControlAction.resume,
                            null,
                          ),
                  ),
                ],
                EventRehearsalStatus.complete ||
                EventRehearsalStatus.expired => <Widget>[],
              },
              if (session.hasStarted &&
                  session.status != EventRehearsalStatus.complete) ...[
                CatchButton(
                  label: context.l10n.hostEventRehearsalPrevious,
                  size: CatchButtonSize.md,
                  variant: CatchButtonVariant.ghost,
                  status: isLoading
                      ? CatchButtonStatus.loading
                      : CatchButtonStatus.idle,
                  onPressed: isLoading
                      ? null
                      : () => onControl(
                          EventRehearsalControlAction.previous,
                          null,
                        ),
                ),
                CatchButton(
                  label: context.l10n.hostEventRehearsalNext,
                  size: CatchButtonSize.md,
                  variant: CatchButtonVariant.secondary,
                  status: isLoading
                      ? CatchButtonStatus.loading
                      : CatchButtonStatus.idle,
                  onPressed: isLoading
                      ? null
                      : () => onControl(
                          EventRehearsalControlAction.advance,
                          null,
                        ),
                ),
                CatchButton(
                  label: context.l10n.hostEventRehearsalAdvanceFive,
                  size: CatchButtonSize.md,
                  variant: CatchButtonVariant.secondary,
                  onPressed: isLoading
                      ? null
                      : () => onControl(
                          EventRehearsalControlAction.advanceClock,
                          5,
                        ),
                ),
                CatchButton(
                  label: context.l10n.hostEventRehearsalAdvanceFifteen,
                  size: CatchButtonSize.md,
                  variant: CatchButtonVariant.secondary,
                  onPressed: isLoading
                      ? null
                      : () => onControl(
                          EventRehearsalControlAction.advanceClock,
                          15,
                        ),
                  semanticsLabel: context.l10n.hostEventRehearsalAdvanceFifteen,
                ),
                CatchButton(
                  label: context.l10n.hostEventRehearsalComplete,
                  size: CatchButtonSize.md,
                  variant: CatchButtonVariant.danger,
                  status: isLoading
                      ? CatchButtonStatus.loading
                      : CatchButtonStatus.idle,
                  onPressed: isLoading
                      ? null
                      : () => onControl(
                          EventRehearsalControlAction.complete,
                          null,
                        ),
                ),
              ],
            ],
          ),
        ),
      ],
    );
  }
}
