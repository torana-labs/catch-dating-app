import 'package:catch_dating_app/core/presentation/catch_ui_copy.dart';
import 'package:catch_dating_app/event_success/domain/event_success_wingman_request.dart';
import 'package:catch_dating_app/l10n/l10n.dart';
import 'package:catch_dating_app/public_profile/domain/public_profile.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/material.dart';

class EventSuccessHostHelpSection extends StatelessWidget {
  const EventSuccessHostHelpSection({
    super.key,
    required this.requests,
    required this.profiles,
    required this.rotationsEnabled,
  });

  final List<EventSuccessWingmanRequest> requests;
  final List<PublicProfile> profiles;
  final bool rotationsEnabled;

  @override
  Widget build(BuildContext context) {
    final activeRequests =
        requests.where((request) => request.isActive).toList()
          ..sort((a, b) => b.updatedAt.compareTo(a.updatedAt));
    final profileByUid = {for (final profile in profiles) profile.uid: profile};
    return CatchSection.containedRows(
      title: context.l10n.eventSuccessEventSuccessHostSharedTextHelpMeSayHi,
      count: context.l10n.eventSuccessEventSuccessHostSharedLabelLengthActive(
        length: activeRequests.length,
      ),
      children: [
        if (activeRequests.isEmpty)
          CatchField.content(
            copy: catchFieldCopy(context.l10n),
            title: context
                .l10n
                .eventSuccessEventSuccessHostSharedTextNoHostHelpRequests,
            body: rotationsEnabled
                ? context
                      .l10n
                      .eventSuccessEventSuccessHostSharedTextAttendeesExplicitlyAskedThe
                : context
                      .l10n
                      .eventSuccessEventSuccessHostSharedTextAttendeesExplicitlyAskedThef44110,
            icon: CatchIcons.support,
          ),
        for (final request in activeRequests)
          CatchField.read(
            content: eventSuccessHostHelpLayout(
              context,
              request: request,
              requester: profileByUid[request.requesterUid],
              target: profileByUid[request.targetUid],
            ),
          ),
      ],
    );
  }
}

CatchPersonLayout eventSuccessHostHelpLayout(
  BuildContext context, {
  required EventSuccessWingmanRequest request,
  required PublicProfile? requester,
  required PublicProfile? target,
}) => CatchPersonLayout(
  name:
      requester?.name ??
      context.l10n.eventSuccessEventSuccessHostSharedVisiblecopyAttendee,
  imageUrl: requester?.primaryPhotoThumbnailUrl,
  supportingText: context.l10n
      .eventSuccessEventSuccessHostSharedVisiblecopyAskedForHelpMeeting(
        targetName:
            target?.name ??
            context
                .l10n
                .eventSuccessEventSuccessHostSharedVisiblecopyThisAttendee,
      ),
  context: request.note?.trim().isNotEmpty == true ? request.note : null,
  badges: [
    CatchRowBadge(
      label: context.l10n.eventSuccessEventSuccessHostSharedLabelHostVisible,
      tone: CatchBadgeTone.brand,
    ),
  ],
);
