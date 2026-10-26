import 'package:catch_dating_app/events/domain/event.dart';
import 'package:catch_dating_app/events/domain/event_participation.dart';
import 'package:catch_dating_app/l10n/l10n.dart';
import 'package:catch_dating_app/swipes/domain/swipe_window.dart';
import 'package:catch_dating_app/user_profile/domain/user_profile.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/material.dart';

class SwipeEmptyContent {
  const SwipeEmptyContent({
    required this.title,
    required this.message,
    required this.icon,
  });

  final String title;
  final String message;
  final IconData icon;
}

SwipeEmptyContent defaultSwipeEmptyContent(AppLocalizations l10n) =>
    SwipeEmptyContent(
      title: l10n.swipesSwipeEmptyContentTitleNoMoreAttendees,
      message: l10n.swipesSwipeEmptyContentMessageJoinMoreEventsTo,
      icon: CatchIcons.activity,
    );

SwipeEmptyContent buildSwipeEmptyContent({
  required AppLocalizations l10n,
  required Event? event,
  required UserProfile? currentUser,
  required EventParticipation? currentUserParticipation,
  DateTime? now,
}) {
  final referenceNow = now ?? DateTime.now();
  if (event == null) {
    return SwipeEmptyContent(
      title: l10n.swipesSwipeEmptyContentTitleCatchUnavailable,
      message: l10n.swipesSwipeEmptyContentMessageThisEventCouldNot,
      icon: CatchIcons.noResults,
    );
  }

  if (currentUser == null) {
    return SwipeEmptyContent(
      title: l10n.swipesSwipeEmptyContentTitleSignInRequired,
      message: l10n.swipesSwipeEmptyContentMessageSignInAgainTo,
      icon: CatchIcons.locked,
    );
  }

  if (currentUserParticipation?.status != EventParticipationStatus.attended) {
    return SwipeEmptyContent(
      title: l10n.swipesSwipeEmptyContentTitleCatchUnavailable,
      message: l10n.swipesSwipeEmptyContentMessageYouCanOnlyCatch,
      icon: CatchIcons.verified,
    );
  }

  if (event.isUpcomingAt(referenceNow)) {
    return SwipeEmptyContent(
      title: l10n.swipesSwipeEmptyContentTitleEventInProgress,
      message: l10n.swipesSwipeEmptyContentMessageCatchesUnlockFor24,
      icon: CatchIcons.time,
    );
  }

  if (!hasOpenSwipeWindow(event, now: referenceNow)) {
    return SwipeEmptyContent(
      title: l10n.swipesSwipeEmptyContentTitleCatchWindowClosed,
      message: l10n.swipesSwipeEmptyContentMessageThisEventIsPast,
      icon: CatchIcons.expired,
    );
  }

  return defaultSwipeEmptyContent(l10n);
}
