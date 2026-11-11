import 'package:catch_dating_app/contexts/programmes/domain/program_models.dart';
import 'package:catch_l10n/l10n.dart';
import 'package:catch_platform/l10n/catch_ui_copy.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/widgets.dart';

/// What the trip sheet asks for: mark it arrived, or void it with a
/// reason.
@immutable
class HostProgrammeTripDecision {
  const HostProgrammeTripDecision.arrived() : voidReason = null;
  const HostProgrammeTripDecision.voided(String this.voidReason);

  final String? voidReason;
}

/// One trip: who it carried, and Mark arrived or Void this trip.
class HostProgrammeTripSheet extends StatefulWidget {
  const HostProgrammeTripSheet({super.key, required this.trip});

  final ProgramTripSummary trip;

  @override
  State<HostProgrammeTripSheet> createState() => _HostProgrammeTripSheetState();
}

class _HostProgrammeTripSheetState extends State<HostProgrammeTripSheet> {
  String _reason = '';

  @override
  Widget build(BuildContext context) {
    final l10n = context.l10n;
    final trip = widget.trip;
    final live = trip.status == TransportTripStatus.enRoute;
    final canVoid =
        trip.status != TransportTripStatus.voided &&
        trip.status != TransportTripStatus.cancelled;
    return CatchSheet.standard(
      title:
          '${trip.vendorName ?? l10n.hostProgrammeTripsNoVendor} · ${trip.plateDisplay}',
      subtitle: trip.destinationLabel,
      footer: live
          ? CatchButton.sheet(
              key: const ValueKey<String>('host-programme-trip-arrived'),
              label: l10n.hostProgrammeTripsMarkArrived,
              role: CatchButtonEmphasis.commit,
              onPressed: () => Navigator.of(
                context,
              ).pop(const HostProgrammeTripDecision.arrived()),
            )
          : null,
      child: CatchSection(
        dividers: CatchSectionPlacement.none,
        children: [
          CatchText(
            trip.guestNames.isEmpty
                ? l10n.hostProgrammePeople(count: trip.passengerCount)
                : trip.guestNames.join(', '),
            variant: CatchTextVariant.bodySmall,
          ),
          if (canVoid) ...[
            CatchField.input(
              key: const ValueKey<String>('host-programme-trip-reason'),
              copy: catchFieldCopy(l10n),
              title: l10n.hostProgrammeTripsVoidReason,
              contractExemption: 'Reason the planner gives for voiding a trip.',
              maxLength: 200,
              onChanged: (value) => setState(() => _reason = value),
            ),
            CatchButton(
              key: const ValueKey<String>('host-programme-trip-void'),
              label: l10n.hostProgrammeTripsVoid,
              variant: CatchButtonVariant.danger,
              fullWidth: true,
              onPressed: _reason.trim().isEmpty
                  ? null
                  : () => Navigator.of(
                      context,
                    ).pop(HostProgrammeTripDecision.voided(_reason.trim())),
            ),
          ],
        ],
      ),
    );
  }
}
