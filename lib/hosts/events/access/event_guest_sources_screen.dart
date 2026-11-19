import 'package:catch_dating_app/contexts/events/data/event_repository.dart';
import 'package:catch_dating_app/contexts/events/domain/event.dart';
import 'package:catch_dating_app/contexts/organizers/data/organizers_repository.dart';
import 'package:catch_dating_app/hosts/events/event_workspace_controller.dart';
import 'package:catch_dating_app/hosts/presentation/host_event_booking_controller.dart';
import 'package:catch_dating_app/hosts/presentation/widgets/host_event_check_in_qr_section.dart';
import 'package:catch_dating_app/hosts/presentation/widgets/host_event_manage_section.dart';
import 'package:catch_dating_app/hosts/presentation/widgets/host_operational_roster_section.dart';
import 'package:catch_l10n/l10n.dart';
import 'package:catch_platform/l10n/catch_ui_copy.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

/// Where an event's guests come from, for nights run on Catch or elsewhere:
/// Catch registration, importing a guest file, a connected Luma event and
/// forwarding the roster, and the check-in link and QR for an event run
/// outside Catch.
///
/// Every control is the old event screen's own: [HostPublicRegistrationField]
/// (`configureEventRegistration`), [HostGuestIntakeField]
/// (`manageHostRosterIntake`, `importEventAttendees`, the Luma provider
/// callables, `createEventRosterHandoff`) and [HostEventCheckInQrSection]
/// (`createEventVenueSession`).
class HostEventGuestSourcesScreen extends ConsumerWidget {
  const HostEventGuestSourcesScreen({super.key, required this.request});

  final HostEventRequest request;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final l10n = context.l10n;
    final event = ref.watch(watchEventProvider(request.eventId)).value;
    final organizer = ref
        .watch(watchOrganizerProvider(request.organizerId))
        .value;
    final registration = ref.watch(
      HostEventBookingController.publicRegistrationMutation,
    );
    return CatchRoot(
      child: CatchScreen(
        key: const ValueKey<String>('host-event-guest-sources-screen'),
        topBar: CatchTopBar(
          variant: CatchTopBarVariant.tool,
          back: CatchTopBarBack(label: l10n.hostEventsBack),
          kicker: event?.title,
          title: l10n.hostEventsGuestSourcesTitle,
        ),
        body: event == null || organizer == null
            ? const CatchPageBody.screen(child: CatchLoadingIndicator())
            : CatchPageBody.screen(
                child: CatchStack(
                  gap: CatchStackGap.section,
                  children: [
                    CatchSection.fieldRows(
                      children: [
                        HostPublicRegistrationField(
                          organizer: organizer,
                          event: event,
                          mutation: registration,
                          onChanged: (on) => _setRegistration(ref, event, on),
                        ),
                        HostGuestIntakeField(
                          eventId: event.id,
                          organizerId: event.organizerId,
                          bookingProvider: event.eventOrigin?.provider,
                          suggestedRevenueAmountMinor: event.priceInPaise,
                          revenueCurrency: event.currency,
                        ),
                      ],
                    ),
                    if (event.isExternalCompanion && event.hasWebRuntime)
                      CatchSection.fieldRows(
                        children: [
                          CatchField.control(
                            copy: catchFieldCopy(l10n),
                            title: l10n
                                .hostsHostEventAttendancePanelTitleCheckInQr,
                            body:
                                l10n.hostsHostEventAttendancePanelBodyCheckInQr,
                            icon: CatchIcons.qrCode,
                            contractExemption:
                                'Disclosure-only public runtime URL and QR; '
                                'no editable value is submitted or persisted.',
                            child: HostEventCheckInQrSection(event: event),
                          ),
                        ],
                      ),
                  ],
                ),
              ),
      ),
    );
  }

  /// Turns Catch registration on or off; the field shows the error.
  void _setRegistration(WidgetRef ref, Event event, bool on) {
    HostEventBookingController.publicRegistrationMutation
        .run(
          ref,
          (tx) => tx
              .get(hostEventBookingControllerProvider.notifier)
              .setPublicRegistration(event: event, enabled: on),
        )
        .then<void>((_) {}, onError: (Object _) {});
  }
}
