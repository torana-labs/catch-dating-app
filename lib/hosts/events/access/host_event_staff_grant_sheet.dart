import 'package:catch_dating_app/contexts/organizers/data/host_event_staff_repository.dart';
import 'package:catch_l10n/l10n.dart';
import 'package:catch_platform/l10n/catch_ui_copy.dart';
import 'package:catch_platform/schema_contracts/generated/field_constraints.g.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/material.dart';

/// What the host chose in the grant sheet: a phone number and how long the
/// door access lasts.
class HostEventStaffGrantInput {
  const HostEventStaffGrantInput({
    required this.phoneNumber,
    required this.window,
  });

  final String phoneNumber;
  final HostEventStaffGrantWindow window;
}

/// The sheet that grants temporary door access: a phone number (at least
/// eight characters, with the required-number error) and an access window.
/// It pops a [HostEventStaffGrantInput], or nothing when dismissed.
class HostEventStaffGrantSheet extends StatefulWidget {
  const HostEventStaffGrantSheet({super.key});

  @override
  State<HostEventStaffGrantSheet> createState() =>
      _HostEventStaffGrantSheetState();
}

class _HostEventStaffGrantSheetState extends State<HostEventStaffGrantSheet> {
  final _phoneController = TextEditingController();
  var _window = HostEventStaffGrantWindow.twelveHours;
  var _showPhoneError = false;

  @override
  void dispose() {
    _phoneController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return CatchSheet.standard(
      title: context.l10n.hostsEventStaffGrantTitle,
      subtitle: context.l10n.hostsEventStaffGrantSubtitle,
      footer: CatchButton.sheet(
        role: CatchButtonEmphasis.commit,
        label: context.l10n.hostsEventStaffGrantAction,

        onPressed: _submit,
      ),
      child: CatchFieldLanes.divided(
        children: [
          CatchField.input(
            copy: catchFieldCopy(context.l10n),
            title: context.l10n.hostsEventStaffPhone,
            contract: CatchContractConstraints
                .grantEventStaffCallablePayloadPhoneNumber,
            controller: _phoneController,
            keyboardType: TextInputType.phone,
            errorText: _showPhoneError
                ? context.l10n.hostsEventStaffPhoneRequired
                : null,
          ),
          CatchMenu<HostEventStaffGrantWindow>.anchored(
            items: [
              for (final window in HostEventStaffGrantWindow.values)
                CatchMenuItem<HostEventStaffGrantWindow>(
                  value: window,
                  label: _windowLabel(context, window),
                  selected: window == _window,
                  variant: CatchMenuItemVariant.choice,
                ),
            ],
            onSelected: (window, _) => setState(() => _window = window),
            builder: (context, controller, _) => CatchFieldLanes.single(
              child: CatchField.nav(
                copy: catchFieldCopy(context.l10n),
                title: context.l10n.hostsEventStaffAccessDuration,
                valueText: _windowLabel(context, _window),
                onTap: controller.isOpen ? controller.close : controller.open,
              ),
            ),
          ),
        ],
      ),
    );
  }

  void _submit() {
    final phone = _phoneController.text.trim();
    if (phone.length < 8) {
      setState(() => _showPhoneError = true);
      return;
    }
    Navigator.of(
      context,
    ).pop(HostEventStaffGrantInput(phoneNumber: phone, window: _window));
  }
}

String _windowLabel(BuildContext context, HostEventStaffGrantWindow window) =>
    switch (window) {
      HostEventStaffGrantWindow.fourHours =>
        context.l10n.hostsEventStaffDurationFourHours,
      HostEventStaffGrantWindow.twelveHours =>
        context.l10n.hostsEventStaffDurationTwelveHours,
      HostEventStaffGrantWindow.oneDay =>
        context.l10n.hostsEventStaffDurationOneDay,
      HostEventStaffGrantWindow.sevenDays =>
        context.l10n.hostsEventStaffDurationSevenDays,
    };
