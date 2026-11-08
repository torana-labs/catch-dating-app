import 'package:catch_dating_app/contexts/programmes/domain/program_models.dart';
import 'package:catch_l10n/l10n.dart';
import 'package:catch_platform/time/time_formatters.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/widgets.dart';

/// The job an alert was raised for, as staff read it.
String staffDutyLabel(AppLocalizations l10n, String duty) => switch (duty) {
  'programAdmin' || 'programCoordinator' => l10n.hostStaffDutyCoordinator,
  'guestRelations' => l10n.hostStaffDutyGuests,
  'communications' => l10n.hostStaffDutyMessages,
  'functionCheckIn' => l10n.hostStaffDutyDoor,
  'functionLead' => l10n.hostStaffDutyLead,
  'airportGreeter' => l10n.hostStaffDutyGreeter,
  'hotelDesk' => l10n.hostStaffDutyHotel,
  'transportDispatcher' => l10n.hostStaffDutyDispatch,
  'reconciliationViewer' => l10n.hostStaffDutyReconcile,
  'stakeholderViewer' => l10n.hostStaffDutyCounts,
  _ => duty,
};

/// One alert for the jobs this person holds: its severity as the marker,
/// what happened, whose job it touches and how long ago.
class StaffAttentionRow extends StatelessWidget {
  const StaffAttentionRow({super.key, required this.item, required this.now});

  final ProgramStaffAttentionItem item;
  final DateTime now;

  @override
  Widget build(BuildContext context) {
    final l10n = context.l10n;
    return CatchIndexRow(
      title: item.title,
      titleMaxLines: 3,
      subtitle: staffDutyLabel(l10n, item.duty),
      meta: AppTimeFormatters.compactRelativeTime(item.createdAt, now: now),
      marker: switch (item.severity) {
        'urgent' => CatchIndexRowTone.danger,
        'warning' => CatchIndexRowTone.warning,
        _ => CatchIndexRowTone.info,
      },
      onTap: null,
    );
  }
}
