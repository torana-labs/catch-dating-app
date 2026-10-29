import 'package:catch_dating_app/contexts/events/domain/event.dart';
import 'package:catch_dating_app/core/presentation/catch_ui_copy.dart';
import 'package:catch_dating_app/l10n/l10n.dart';
import 'package:catch_dating_app/routing/route_contract.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

/// Manage-screen entry into the event's organizer Moments workspace.
class OrganizerMomentsEntryField extends StatelessWidget {
  const OrganizerMomentsEntryField({
    super.key,
    required this.clubId,
    required this.event,
  });

  final String clubId;
  final Event event;

  @override
  Widget build(BuildContext context) {
    return CatchFieldLanes.single(
      child: CatchField.nav(
        copy: catchFieldCopy(context.l10n),
        title: context.l10n.hostMomentsManageEntryTitle,
        body: context.l10n.hostMomentsManageEntryBody,
        icon: CatchIcons.magic,
        emphasis: CatchFieldEmphasis.title,
        onTap: () => context.pushNamed(
          Routes.hostAppEventMomentsScreen.name,
          pathParameters: {'clubId': clubId, 'eventId': event.id},
          extra: event,
        ),
      ),
    );
  }
}
