import 'package:catch_dating_app/core/external_share.dart';
import 'package:catch_dating_app/core/riverpod_ui/catch_external_share_sheet.dart';
import 'package:catch_dating_app/core/widgets/event_activity_visuals.dart';
import 'package:catch_dating_app/core/widgets/event_backdrop_image.dart';
import 'package:catch_dating_app/events/data/event_callable_responses.dart';
import 'package:catch_dating_app/events/domain/event.dart';
import 'package:catch_dating_app/events/domain/event_formatters.dart';
import 'package:catch_dating_app/events/presentation/attendee_event_share_controller.dart';
import 'package:catch_dating_app/events/shared/event_invite_share_copy.dart';
import 'package:catch_dating_app/l10n/l10n.dart';
import 'package:catch_dating_app/routing/app_deep_links.dart';
import 'package:catch_tokens/catch_tokens.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/material.dart';

Future<void> showEventShareCardSheet(
  BuildContext context, {
  required Event event,
  required ExternalShareController share,
  String? inviteCode,
  String? inviteLinkId,
  Uri? inviteUri,
  Future<void> Function()? onShareIntent,
}) {
  return showCatchBottomSheet<void>(
    context: context,
    builder: (_) => CatchExternalShareSheet(
      media: EventShareCard(event: event),
      share: share,
      fileName: 'catch-event-invite.png',
      buttonLabel: context.l10n.eventsInviteShareButton,
      footnote: context.l10n.eventsInviteShareFootnote,
      subject: EventInviteShareCopy.subject(event, context.l10n),
      text: EventInviteShareCopy.eventDetailInviteText(
        event,
        l10n: context.l10n,
        inviteCode: inviteCode,
        inviteLinkId: inviteLinkId,
        inviteUri: inviteUri,
      ),
      onShareIntent: onShareIntent,
    ),
  );
}

/// Creates the attendee's stable referral link before opening the native share
/// sheet. If audience projection is still converging, sharing still works with
/// the ordinary event URL and never makes a false attribution claim.
Future<void> showTrackedAttendeeEventShareCardSheet(
  BuildContext context, {
  required Event event,
  required ExternalShareController share,
  required AttendeeEventShareActions actions,
  String? fallbackInviteCode,
  String? fallbackInviteLinkId,
}) async {
  CreateEventInviteLinkCallableResponse? personalLink;
  for (var attempt = 0; attempt < 3 && personalLink == null; attempt += 1) {
    try {
      personalLink = await actions.createInviteLink(
        eventId: event.id,
        isExternalEvent: event.eventOrigin?.isExternal == true,
        label: context.l10n.eventsAttendeeShareLinkLabel,
      );
    } on Object {
      if (attempt < 2) {
        await Future<void>.delayed(Duration(milliseconds: 250 * (attempt + 1)));
      }
    }
  }
  if (!context.mounted) return;
  await showEventShareCardSheet(
    context,
    event: event,
    share: share,
    inviteCode: personalLink == null ? fallbackInviteCode : null,
    inviteLinkId: personalLink == null ? fallbackInviteLinkId : null,
    inviteUri: personalLink == null
        ? null
        : AppDeepLinks.eventInvite(personalLink.inviteToken),
    onShareIntent: personalLink == null
        ? null
        : () => actions.recordShareIntent(
            eventId: event.id,
            inviteLinkId: personalLink!.inviteLinkId,
          ),
  );
}

class EventShareCard extends StatelessWidget {
  const EventShareCard({super.key, required this.event});

  final Event event;

  @override
  Widget build(BuildContext context) {
    final t = CatchTokens.of(context);
    final visual = eventActivityVisual(event.activityKind, context: context);
    final priceLabel = event.isFree
        ? context.l10n.eventsInviteShareFree
        : EventFormatters.priceInPaise(
            event.priceInPaise,
            currencyCode: event.currency,
          );

    return AspectRatio(
      aspectRatio: CatchLayout.richShareCardAspectRatio,
      child: CatchSurface(
        backgroundColor: t.ink,
        borderRole: CatchBorderRole.boundary,
        padding: EdgeInsets.zero,
        clipBehavior: Clip.antiAlias,
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            Expanded(
              flex: 5,
              child: Stack(
                fit: StackFit.expand,
                children: [
                  EventBackdropImage(
                    visual: visual,
                    dense: true,
                    iconAlignment: Alignment.centerRight,
                    iconSize: CatchLayout.eventHeroBackdropIconSize,
                    iconOpacity: CatchOpacity.fallbackArtworkIcon,
                  ),
                  Positioned(
                    top: CatchSpacing.s5,
                    left: CatchSpacing.s5,
                    child: CatchSurface(
                      backgroundColor: t.primaryInk.withValues(
                        alpha: CatchOpacity.scrimFill,
                      ),
                      borderSpec: CatchBorder.resolve(
                        t,
                        CatchBorderRole.boundary,
                        color: visual.accent.withValues(
                          alpha: CatchOpacity.subtleBorder,
                        ),
                      ),
                      radius: CatchRadius.pill,
                      padding: CatchInsets.compactLabelContent,
                      child: CatchText(
                        context.l10n.eventsEventShareCardTextCatchInvite,
                        variant: CatchTextVariant.statusLabel,
                        color: visual.accent,
                      ),
                    ),
                  ),
                  Positioned(
                    top: CatchSpacing.s5,
                    right: CatchSpacing.s5,
                    child: CatchIconTile(
                      icon: visual.icon,
                      iconColor: visual.accent,
                      backgroundColor: t.primaryInk.withValues(
                        alpha: CatchOpacity.scrimFill,
                      ),
                      borderColor: visual.accent.withValues(
                        alpha: CatchOpacity.subtleBorder,
                      ),
                      size: CatchLayout.richShareCardHeaderIconExtent,
                      iconSize: CatchIcon.md,
                      radius: CatchRadius.pill,
                    ),
                  ),
                  Positioned(
                    left: CatchSpacing.s5,
                    right: CatchSpacing.s5,
                    bottom: CatchSpacing.s5,
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        Text(
                          event.activitySummaryLabel.toUpperCase(),
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                          style: CatchTextStyles.kicker(
                            context,
                            color: t.primaryInk.withValues(
                              alpha: CatchOpacity.onFillMuted,
                            ),
                          ),
                        ),
                        gapH8,
                        Text(
                          event.title,
                          maxLines: 3,
                          overflow: TextOverflow.ellipsis,
                          style: CatchTextStyles.eventDisplay(
                            context,
                            step: CatchTextStylesSize.l,
                            height: 0.98,
                            color: t.primaryInk,
                          ),
                        ),
                      ],
                    ),
                  ),
                ],
              ),
            ),
            Expanded(
              flex: 4,
              child: ColoredBox(
                color: t.surface,
                child: Padding(
                  padding: CatchInsets.contentRelaxed,
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      CatchMetaRow(
                        icon: CatchIcons.calendarTodayOutlined,
                        label: event.longDateLabel,
                        color: visual.accent,
                      ),
                      gapH10,
                      CatchMetaRow(
                        icon: CatchIcons.clock,
                        label: event.timeRangeLabel,
                        color: visual.accent,
                      ),
                      gapH10,
                      CatchMetaRow(
                        icon: CatchIcons.locationOnOutlined,
                        label: event.locationName,
                        color: visual.accent,
                      ),
                      const Spacer(),
                      Wrap(
                        spacing: CatchSpacing.micro6,
                        runSpacing: CatchSpacing.micro6,
                        children: [
                          EventShareChip(label: priceLabel),
                          EventShareChip(
                            label: _spotsLabel(event, context.l10n),
                          ),
                        ],
                      ),
                      gapH14,
                      CatchAttributionRow(
                        brandLabel:
                            context.l10n.coreCatchShareCardFooterTextCatch,
                        trailing: context.l10n.eventsInviteShareFooter,
                      ),
                    ],
                  ),
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class EventShareChip extends StatelessWidget {
  const EventShareChip({super.key, required this.label});

  final String label;

  @override
  Widget build(BuildContext context) {
    final t = CatchTokens.of(context);
    return CatchSurface(
      backgroundColor: t.primarySoft,
      borderSpec: CatchBorder.resolve(
        t,
        CatchBorderRole.boundary,
        color: t.primary.withValues(alpha: CatchOpacity.subtleBorder),
      ),
      radius: CatchRadius.pill,
      padding: CatchInsets.compactLabelContent,
      child: CatchText(
        label,
        variant: CatchTextVariant.statusLabel,
        color: t.ink,
      ),
    );
  }
}

String _spotsLabel(Event event, AppLocalizations l10n) {
  final spots = event.spotsRemaining;
  if (spots == 0) return l10n.eventsInviteShareWaitlistOpen;
  return l10n.eventsInviteShareSpotsLeft(count: spots);
}
