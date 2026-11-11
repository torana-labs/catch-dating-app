import 'package:catch_dating_app/contexts/programmes/domain/program_models.dart';
import 'package:catch_dating_app/hosts/programmes/planner/programme_team_body.dart';
import 'package:catch_l10n/l10n.dart';
import 'package:catch_platform/l10n/catch_ui_copy.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/services.dart';
import 'package:flutter/widgets.dart';

/// Who to invite: their name, phone and job.
typedef HostProgrammeInvite = ({
  String name,
  String phone,
  ProgramStaffDuty duty,
});

/// Invites one person to the team with one job.
class HostProgrammeInviteSheet extends StatefulWidget {
  const HostProgrammeInviteSheet({super.key});

  @override
  State<HostProgrammeInviteSheet> createState() =>
      _HostProgrammeInviteSheetState();
}

class _HostProgrammeInviteSheetState extends State<HostProgrammeInviteSheet> {
  String _name = '';
  String _phone = '';
  ProgramStaffDuty _duty = ProgramStaffDuty.functionCheckIn;

  @override
  Widget build(BuildContext context) {
    final l10n = context.l10n;
    final copy = catchFieldCopy(l10n);
    final ready = _name.trim().isNotEmpty && _phone.trim().startsWith('+');
    return CatchSheet.standard(
      title: l10n.hostProgrammeTeamInvite,
      footer: CatchButton.sheet(
        key: const ValueKey<String>('host-programme-invite-send'),
        label: l10n.hostProgrammeTeamInviteSend,
        role: CatchButtonEmphasis.commit,
        onPressed: ready
            ? () => Navigator.of(context).pop<HostProgrammeInvite>((
                name: _name.trim(),
                phone: _phone.trim(),
                duty: _duty,
              ))
            : null,
      ),
      child: CatchSection(
        dividers: CatchSectionPlacement.none,
        children: [
          CatchField.input(
            key: const ValueKey<String>('host-programme-invite-name'),
            copy: copy,
            title: l10n.hostProgrammeTeamName,
            contractExemption: 'Staff display name for inviteProgramStaff.',
            maxLength: 80,
            textCapitalization: TextCapitalization.words,
            onChanged: (value) => setState(() => _name = value),
          ),
          CatchField.input(
            key: const ValueKey<String>('host-programme-invite-phone'),
            copy: copy,
            title: l10n.hostProgrammeSetupPhone,
            contractExemption: 'Staff phone for inviteProgramStaff.',
            keyboardType: TextInputType.phone,
            helperText: l10n.hostProgrammeSetupPhoneHelp,
            onChanged: (value) => setState(() => _phone = value),
          ),
          CatchField.select(
            copy: copy,
            title: l10n.hostProgrammeTeamJob,
            contractExemption: 'One staff duty for inviteProgramStaff.',
            values: ProgramStaffDuty.values,
            value: _duty,
            itemLabelBuilder: (duty) => programmeDutyLabel(l10n, duty),
            onChanged: (value) {
              if (value != null) setState(() => _duty = value);
            },
          ),
        ],
      ),
    );
  }
}
