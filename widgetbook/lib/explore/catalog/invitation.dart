import 'package:catch_dating_app/contexts/account/data/auth_repository.dart';
import 'package:catch_dating_app/contexts/events/data/event_repository.dart';
import 'package:catch_dating_app/contexts/events/domain/event.dart';
import 'package:catch_dating_app/contexts/profiles/data/public_profile_repository.dart';
import 'package:catch_dating_app/core/theme/app_theme.dart';
import 'package:catch_dating_app/cross_paths/cross_paths.dart';
import 'package:flutter/material.dart';
import 'package:widgetbook_annotation/widgetbook_annotation.dart' as widgetbook;

import '../../preview_layout_contracts.dart';
import '../../support/page_preview.dart';
import '../../support/widgetbook_harness.dart';
import 'cross_paths_fixtures.dart';
import 'fixtures.dart';
import 'preview.dart';

@widgetbook.UseCase(
  name: 'Cross Paths invitation states',
  type: CrossPathsInvitationScreen,
  path: '[Explore]/Screens',
)
Widget crossPathsInvitationStates(BuildContext context) {
  final pending = widgetbookExploreCrossPathsInvitation(
    id: 'widgetbook-cross-paths-pending',
    status: CrossPathsInvitationStatus.pending,
  );
  final accepted = widgetbookExploreCrossPathsInvitation(
    id: 'widgetbook-cross-paths-accepted',
    status: CrossPathsInvitationStatus.accepted,
    conversationId: 'widgetbook-cross-paths-plan',
  );
  final outgoing = widgetbookExploreCrossPathsInvitation(
    id: 'widgetbook-cross-paths-outgoing',
    status: CrossPathsInvitationStatus.pending,
    outgoing: true,
  );
  final declined = widgetbookExploreCrossPathsInvitation(
    id: 'widgetbook-cross-paths-declined',
    status: CrossPathsInvitationStatus.declined,
  );
  final expired = widgetbookExploreCrossPathsInvitation(
    id: 'widgetbook-cross-paths-expired',
    status: CrossPathsInvitationStatus.expired,
  );
  final invalidated = widgetbookExploreCrossPathsInvitation(
    id: 'widgetbook-cross-paths-invalidated',
    status: CrossPathsInvitationStatus.invalidated,
    invalidationReason: CrossPathsInvitationInvalidationReason.eventUnavailable,
  );
  final pairHeld = widgetbookExploreCrossPathsInvitation(
    id: 'widgetbook-cross-paths-pair-held',
    status: CrossPathsInvitationStatus.accepted,
    outgoing: true,
    pairHoldId: 'widgetbook-cross-paths-hold',
  );
  final pairHold = CrossPathsPairHold(
    id: 'widgetbook-cross-paths-hold',
    eventId: widgetbookExploreFeedItems[1].event.id,
    invitationId: pairHeld.id,
    requesterUid: widgetbookExploreViewerUid,
    attendeeUid: widgetbookExploreCrossPathsSuggestion.profile.uid,
    participantIds: const [
      widgetbookExploreViewerUid,
      'widgetbook-cross-paths-rhea',
    ],
    status: CrossPathsPairHoldStatus.active,
    requesterBookingStatus: 'held',
    attendeeBookingStatus: 'signedUp',
    requesterPriceInPaise: 0,
    currency: 'INR',
    expiresAt: DateTime.now().add(const Duration(minutes: 15)),
    conversationId: null,
  );
  return WidgetbookScrollCatalogFrame(
    title: 'CrossPathsInvitationScreen',
    catalogId: 'screen.cross_paths.invitation',
    children: [
      WidgetbookPageStateCard(
        label: 'incoming invitation',
        child: WidgetbookExploreDeviceFrame(
          height: WidgetbookPreviewLayout.exploreTallPreviewHeight,
          child: _CrossPathsInvitationScope(invitation: pending),
        ),
      ),
      WidgetbookPageStateCard(
        label: 'outgoing invitation',
        child: WidgetbookExploreDeviceFrame(
          height: WidgetbookPreviewLayout.exploreTallPreviewHeight,
          child: _CrossPathsInvitationScope(invitation: outgoing),
        ),
      ),
      WidgetbookPageStateCard(
        label: 'accepted event plan',
        child: WidgetbookExploreDeviceFrame(
          height: WidgetbookPreviewLayout.exploreTallPreviewHeight,
          child: _CrossPathsInvitationScope(invitation: accepted),
        ),
      ),
      WidgetbookPageStateCard(
        label: 'pair spot held but requester not booked',
        child: WidgetbookExploreDeviceFrame(
          height: WidgetbookPreviewLayout.exploreTallPreviewHeight,
          child: _CrossPathsInvitationScope(
            invitation: pairHeld,
            pairHold: pairHold,
          ),
        ),
      ),
      WidgetbookPageStateCard(
        label: 'declined terminal receipt',
        child: WidgetbookExploreDeviceFrame(
          height: WidgetbookPreviewLayout.exploreTallPreviewHeight,
          child: _CrossPathsInvitationScope(invitation: declined),
        ),
      ),
      WidgetbookPageStateCard(
        label: 'expired terminal receipt',
        child: WidgetbookExploreDeviceFrame(
          height: WidgetbookPreviewLayout.exploreTallPreviewHeight,
          child: _CrossPathsInvitationScope(invitation: expired),
        ),
      ),
      WidgetbookPageStateCard(
        label: 'event invalidated receipt',
        child: WidgetbookExploreDeviceFrame(
          height: WidgetbookPreviewLayout.exploreTallPreviewHeight,
          child: _CrossPathsInvitationScope(invitation: invalidated),
        ),
      ),
      WidgetbookPageStateCard(
        label: 'missing profile media',
        child: WidgetbookExploreDeviceFrame(
          height: WidgetbookPreviewLayout.exploreTallPreviewHeight,
          child: _CrossPathsInvitationScope(
            invitation: pending,
            missingMedia: true,
          ),
        ),
      ),
      WidgetbookPageStateCard(
        label: 'long event location copy',
        child: WidgetbookExploreDeviceFrame(
          height: WidgetbookPreviewLayout.exploreTallPreviewHeight,
          child: _CrossPathsInvitationScope(
            invitation: pending,
            event: widgetbookExploreFeedItems[1].event.copyWith(
              meetingPoint:
                  'The courtyard entrance beside the heritage library, '
                  'opposite the east fountain at Kala Ghoda',
            ),
          ),
        ),
      ),
      WidgetbookPageStateCard(
        label: 'text scale 2.0',
        child: WidgetbookExploreMediaOverride(
          textScaler: const TextScaler.linear(2),
          child: WidgetbookExploreDeviceFrame(
            height: WidgetbookPreviewLayout.exploreExpandedPreviewHeight,
            child: _CrossPathsInvitationScope(invitation: pending),
          ),
        ),
      ),
      WidgetbookPageStateCard(
        label: 'reduced motion',
        child: WidgetbookExploreMediaOverride(
          disableAnimations: true,
          child: WidgetbookExploreDeviceFrame(
            height: WidgetbookPreviewLayout.exploreTallPreviewHeight,
            child: _CrossPathsInvitationScope(invitation: pending),
          ),
        ),
      ),
      WidgetbookPageStateCard(
        label: 'dark theme',
        child: Theme(
          data: AppTheme.dark,
          child: WidgetbookExploreDeviceFrame(
            height: WidgetbookPreviewLayout.exploreTallPreviewHeight,
            child: _CrossPathsInvitationScope(invitation: accepted),
          ),
        ),
      ),
    ],
  );
}

class _CrossPathsInvitationScope extends StatelessWidget {
  const _CrossPathsInvitationScope({
    required this.invitation,
    this.event,
    this.missingMedia = false,
    this.pairHold,
  });

  final CrossPathsInvitation invitation;
  final Event? event;
  final bool missingMedia;
  final CrossPathsPairHold? pairHold;

  @override
  Widget build(BuildContext context) {
    final profile = missingMedia
        ? widgetbookExploreCrossPathsSuggestion.profile.copyWith(
            profilePhotos: const [],
          )
        : widgetbookExploreCrossPathsSuggestion.profile;
    final event = this.event ?? widgetbookExploreFeedItems[1].event;
    return WidgetbookFixtureScope(
      overrides: [
        uidProvider.overrideWith(
          (ref) => Stream.value(widgetbookExploreViewerUid),
        ),
        watchCrossPathsInvitationProvider(
          invitation.id,
        ).overrideWith((ref) => Stream.value(invitation)),
        watchPublicProfileProvider(
          widgetbookExploreCrossPathsSuggestion.profile.uid,
        ).overrideWith((ref) => Stream.value(profile)),
        watchEventProvider(
          invitation.eventId,
        ).overrideWith((ref) => Stream.value(event)),
        if (pairHold != null)
          watchCrossPathsPairHoldProvider(
            pairHold!.id,
          ).overrideWith((ref) => Stream.value(pairHold)),
      ],
      child: CrossPathsInvitationScreen(invitationId: invitation.id),
    );
  }
}
