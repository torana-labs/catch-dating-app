import 'package:catch_dating_app/hosts/events/access/host_event_staff_section.dart';
import 'package:catch_dating_app/hosts/events/event_workspace_controller.dart';
import 'package:catch_l10n/l10n.dart';
import 'package:catch_platform/routing/route_contract.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/widgets.dart';
import 'package:go_router/go_router.dart';

/// Who can open this event's door: the event's own staff grants, which give
/// someone check-ins and guest names for this event only, and a way to the
/// organizer's whole team.
///
/// The grants are the existing event staff access (`grantEventStaff`,
/// `revokeEventStaff`) in [HostEventStaffSection]. The workspace rereads
/// its door team when this screen closes.
class HostEventDoorScreen extends StatelessWidget {
  const HostEventDoorScreen({super.key, required this.request});

  final HostEventRequest request;

  @override
  Widget build(BuildContext context) {
    final l10n = context.l10n;
    return CatchRoot(
      child: CatchScreen(
        key: const ValueKey<String>('host-event-door-screen'),
        topBar: CatchTopBar(
          variant: CatchTopBarVariant.tool,
          back: CatchTopBarBack(label: l10n.hostEventsBack),
          title: l10n.hostEventsDoorTitle,
        ),
        body: CatchPageBody.screen(
          child: CatchStack(
            gap: CatchStackGap.section,
            children: [
              CatchText(l10n.hostEventsDoorBody, tone: CatchTextTone.secondary),
              HostEventStaffSection(
                organizerId: request.organizerId,
                eventId: request.eventId,
              ),
              CatchSection(
                children: [
                  CatchIndexRow(
                    key: const ValueKey<String>('host-event-door-team'),
                    title: l10n.hostEventsDoorWholeTeam,
                    subtitle: l10n.hostEventsDoorWholeTeamBody,
                    chevron: true,
                    onTap: () => context.pushNamed(
                      Routes.hostOrganizerTeamScreen.name,
                      queryParameters: {'organizerId': request.organizerId},
                    ),
                  ),
                ],
              ),
            ],
          ),
        ),
      ),
    );
  }
}
