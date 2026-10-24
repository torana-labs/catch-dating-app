import 'package:catch_dating_app/core/riverpod_ui/catch_async_value_adapter.dart';
import 'package:catch_dating_app/events/domain/event.dart';
import 'package:catch_dating_app/events/presentation/event_attendee_lookup_controller.dart';
import 'package:catch_dating_app/events/presentation/widgets/event_detail_surface_style.dart';
import 'package:catch_dating_app/events/presentation/widgets/event_hype_avatar_row.dart';
import 'package:catch_dating_app/l10n/l10n.dart';
import 'package:catch_dating_app/public_profile/domain/public_profile.dart';
import 'package:catch_dating_app/swipes/domain/swipe_window.dart';
import 'package:catch_tokens/catch_tokens.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:riverpod_annotation/riverpod_annotation.dart';

part 'who_is_going_section.g.dart';

const _whoIsGoingAvatarLimit = 7;

@riverpod
Future<Map<String, (String name, String? photoUrl)>> attendeeProfiles(
  Ref ref,
  List<String> uids,
) async {
  if (uids.isEmpty) return {};
  final profiles = await ref
      .watch(eventAttendeeLookupProvider)
      .fetchProfiles(uids);
  return {
    for (final profile in profiles)
      profile.uid: (profile.name, profile.primaryPhotoThumbnailUrl),
  };
}

class WhoIsGoingSection extends ConsumerWidget {
  const WhoIsGoingSection({
    super.key,
    required this.event,
    this.surfaceStyle,
    this.showHeader = true,
    this.showCatchWindowStatus = true,
    this.now,
  });

  final Event event;
  final EventDetailSurfaceStyle? surfaceStyle;
  final bool showHeader;
  final bool showCatchWindowStatus;
  final DateTime? now;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final referenceNow = now ?? DateTime.now();
    final isUpcoming = event.isUpcomingAt(referenceNow);
    final totalCount = isUpcoming ? event.signedUpCount : event.attendedCount;
    final avatarItemsState = isUpcoming || totalCount <= 0
        ? null
        : catchAsyncStateFromAsyncValue(
            ref.watch(
              eventHypeAvatarsProvider(
                EventHypeAvatarQuery(
                  eventId: event.id,
                  limit: _whoIsGoingAvatarLimit,
                ),
              ),
            ),
          );
    final avatarItems = avatarItemsState?.value;
    return WhoIsGoingBody(
      event: event,
      totalCount: totalCount,
      avatarItems: avatarItems,
      surfaceStyle: surfaceStyle,
      showHeader: showHeader,
      showCatchWindowStatus: showCatchWindowStatus,
      now: referenceNow,
    );
  }
}

class WhoIsGoingBody extends StatelessWidget {
  const WhoIsGoingBody({
    super.key,
    required this.event,
    required this.totalCount,
    this.avatarItems,
    this.surfaceStyle,
    this.showHeader = true,
    this.showCatchWindowStatus = true,
    this.now,
  });

  final Event event;
  final int totalCount;
  final List<CatchPersonAvatarItem>? avatarItems;
  final EventDetailSurfaceStyle? surfaceStyle;
  final bool showHeader;
  final bool showCatchWindowStatus;
  final DateTime? now;

  @override
  Widget build(BuildContext context) {
    final t = CatchTokens.of(context);
    final total = totalCount;
    final referenceNow = now ?? DateTime.now();
    final isUpcoming = event.isUpcomingAt(referenceNow);
    final hasActiveSwipeWindow = hasOpenSwipeWindow(event, now: referenceNow);

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        if (showHeader) ...[
          Row(
            children: [
              Expanded(
                child: CatchText(
                  context.l10n.eventsWhoIsGoingTextWhoSGoing,
                  variant: CatchTextVariant.titleL,
                  color: surfaceStyle?.headingColor,
                ),
              ),
              Text(
                context.l10n.eventsWhoIsGoingTextTotalCapacitylimit(
                  total: total,
                  capacityLimit: event.capacityLimit,
                ),
                style: CatchTextStyles.labelL(
                  context,
                  color: surfaceStyle?.bodyColor ?? t.ink2,
                ),
              ),
            ],
          ),
          gapH12,
        ],
        if (total == 0)
          WhoIsGoingEmptyState(
            title: isUpcoming
                ? context.l10n.eventsWhoIsGoingTitleNoAttendeesYet
                : context.l10n.eventsWhoIsGoingTitleNoAttendeesBooked,
            message: isUpcoming
                ? context.l10n.eventsWhoIsGoingMessageBeTheFirstTo
                : context.l10n.eventsWhoIsGoingMessageThisEventDidNot,
            surfaceStyle: surfaceStyle,
          )
        else ...[
          EventHypeAvatarRow(
            eventId: event.id,
            totalCount: total,
            avatarItems: avatarItems,
            activityKind: event.activityKind,
            size: 44,
            limit: _whoIsGoingAvatarLimit,
            obscured: isUpcoming,
            showOverflowCount: true,
          ),
          if (showCatchWindowStatus) ...[
            gapH12,
            if (isUpcoming)
              SwipeWindowBanner(
                icon: CatchIcons.lockOutlineRounded,
                message: context.l10n.eventsWhoIsGoingMessageCatchesUnlockFor24,
                surfaceStyle: surfaceStyle,
              )
            else if (hasActiveSwipeWindow)
              SwipeWindowBanner(
                icon: CatchIcons.favoriteRounded,
                message: context.l10n.eventsWhoIsGoingMessageTheCatchWindowIs,
                surfaceStyle: surfaceStyle,
              )
            else
              SwipeWindowBanner(
                icon: CatchIcons.scheduleRounded,
                message: context.l10n.eventsWhoIsGoingMessageTheCatchWindowFor,
                surfaceStyle: surfaceStyle,
              ),
          ],
        ],
      ],
    );
  }
}

class WhoIsGoingEmptyState extends StatelessWidget {
  const WhoIsGoingEmptyState({
    super.key,
    required this.title,
    required this.message,
    this.surfaceStyle,
  });

  final String title;
  final String message;
  final EventDetailSurfaceStyle? surfaceStyle;

  @override
  Widget build(BuildContext context) {
    final t = CatchTokens.of(context);

    return CatchSurface(
      padding: CatchInsets.content,
      radius: CatchRadius.md,
      backgroundColor: surfaceStyle?.surfaceBackground,
      borderSpec: CatchBorder.resolve(
        t,
        CatchBorderRole.separator,
        color: surfaceStyle?.borderColor,
      ),
      child: Row(
        children: [
          Icon(
            CatchIcons.groups2Outlined,
            size: CatchIcon.control,
            color: surfaceStyle?.mutedColor ?? t.ink3,
          ),
          gapW12,
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                CatchText(
                  title,
                  variant: CatchTextVariant.sectionTitle,
                  color: surfaceStyle?.headingColor,
                ),
                gapH4,
                CatchText(
                  message,
                  variant: CatchTextVariant.supporting,
                  color: surfaceStyle?.bodyColor ?? t.ink2,
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

class SwipeWindowBanner extends StatelessWidget {
  const SwipeWindowBanner({
    super.key,
    required this.icon,
    required this.message,
    this.surfaceStyle,
  });

  final IconData icon;
  final String message;
  final EventDetailSurfaceStyle? surfaceStyle;

  @override
  Widget build(BuildContext context) {
    final t = CatchTokens.of(context);

    return CatchSurface(
      padding: CatchInsets.contentDense,
      tone: surfaceStyle == null
          ? CatchSurfaceTone.primarySoft
          : CatchSurfaceTone.transparent,
      backgroundColor: surfaceStyle?.primarySoftColor,
      radius: CatchRadius.md,
      child: Row(
        children: [
          Icon(
            icon,
            size: CatchIcon.xs,
            color: surfaceStyle?.primaryColor ?? t.primary,
          ),
          gapW8,
          Expanded(
            child: CatchText(
              message,
              variant: CatchTextVariant.supporting,
              color: surfaceStyle?.primaryColor ?? t.primary,
            ),
          ),
        ],
      ),
    );
  }
}
