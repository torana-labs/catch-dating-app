part of 'host_operational_roster_section.dart';

class HostRosterHandoffSheet extends StatelessWidget {
  const HostRosterHandoffSheet({
    super.key,
    required this.instructions,
    required this.onCopy,
  });

  final EventRosterHandoffInstructions instructions;
  final Future<void> Function(String value) onCopy;

  @override
  Widget build(BuildContext context) {
    final emailAlias = instructions.emailAlias;
    final whatsappNumber = instructions.whatsappNumber;
    final whatsappMessage = instructions.whatsappMessage;
    return CatchSheet.standard(
      title: context.l10n.hostsOperationalRosterForwardTitle,
      subtitle: context.l10n.hostsOperationalRosterForwardSubtitle,
      glyph: CatchIcons.alternateEmailOutlined,
      footer: CatchButton.sheet(
        role: CatchButtonEmphasis.dismiss,
        label: context.l10n.hostsOperationalRosterForwardDone,
        onPressed: () => Navigator.of(context).pop(),
      ),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          if (!instructions.hasAvailableChannel) ...[
            CatchBanner.error(
              message: context.l10n.hostsOperationalRosterForwardProviderSetup,
            ),
            gapH12,
          ],
          CatchSection.fieldRows(
            first: true,
            children: [
              CatchField.read(
                copy: catchFieldCopy(context.l10n),
                title: context.l10n.hostsOperationalRosterForwardEmail,
                body:
                    emailAlias ??
                    context.l10n.hostsOperationalRosterForwardNotAvailable,
                icon: CatchIcons.emailOutlined,
                actions: emailAlias == null
                    ? null
                    : CatchButton(
                        label: context.l10n.hostsOperationalRosterForwardCopy,
                        onPressed: () => unawaited(onCopy(emailAlias)),
                        size: CatchButtonSize.md,
                        variant: CatchButtonVariant.ghost,
                      ),
              ),
              CatchField.read(
                copy: catchFieldCopy(context.l10n),
                title: context.l10n.hostsOperationalRosterForwardWhatsapp,
                body: whatsappNumber == null || whatsappMessage == null
                    ? context.l10n.hostsOperationalRosterForwardNotAvailable
                    : context.l10n.hostsOperationalRosterForwardWhatsappBody(
                        whatsappNumber: whatsappNumber,
                        whatsappMessage: whatsappMessage,
                      ),
                icon: CatchIcons.sendRounded,
                actions: whatsappNumber == null || whatsappMessage == null
                    ? null
                    : CatchButton(
                        label: context.l10n.hostsOperationalRosterForwardCopy,
                        onPressed: () => unawaited(
                          onCopy('$whatsappNumber\n$whatsappMessage'),
                        ),
                        size: CatchButtonSize.md,
                        variant: CatchButtonVariant.ghost,
                      ),
              ),
            ],
          ),
        ],
      ),
    );
  }
}
