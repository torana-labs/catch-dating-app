import 'package:catch_dating_app/contexts/programmes/domain/program_whatsapp_models.dart';
import 'package:catch_dating_app/hosts/programmes/planner/inbox/programme_inbox_body.dart';
import 'package:catch_dating_app/hosts/programmes/planner/programme_state.dart';
import 'package:catch_dating_app/hosts/programmes/planner/widgets/programme_state_body.dart';
import 'package:catch_l10n/l10n.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/widgets.dart';

const _exemption =
    'Assistant settings travel with updateProgramAssistantSettings, which '
    'validates every field against its contract.';

/// The guest assistant (RbProgAssistant): the wedding's number, whether the
/// assistant answers, what it may answer and read, who everything else
/// goes to and how soon, its languages and what it never does.
class HostProgrammeAssistantBody extends StatelessWidget {
  const HostProgrammeAssistantBody({
    super.key,
    required this.status,
    required this.settings,
    required this.onChange,
    required this.onRetry,
    this.busy = false,
  });

  final HostProgrammeStatus status;
  final ProgramAssistantSettings? settings;

  /// Saves one change; the screen fences it with the settings revision.
  final ValueChanged<ProgramAssistantSettingsChange> onChange;
  final VoidCallback onRetry;
  final bool busy;

  @override
  Widget build(BuildContext context) {
    final l10n = context.l10n;
    final settings = this.settings;
    if (status != HostProgrammeStatus.ready || settings == null) {
      return HostProgrammeStateBody(status: status, onRetry: onRetry);
    }
    final sender = settings.sender;
    final topics = [
      (
        ProgramAssistantTopic.schedule,
        l10n.hostProgrammeInboxTopicSchedule,
        l10n.hostProgrammeInboxTopicScheduleNote,
      ),
      (
        ProgramAssistantTopic.dressCode,
        l10n.hostProgrammeInboxTopicDressCode,
        l10n.hostProgrammeInboxTopicDressCodeNote,
      ),
      (
        ProgramAssistantTopic.travel,
        l10n.hostProgrammeInboxTopicTravel,
        l10n.hostProgrammeInboxTopicTravelNote,
      ),
      (
        ProgramAssistantTopic.stay,
        l10n.hostProgrammeInboxTopicStay,
        l10n.hostProgrammeInboxTopicStayNote,
      ),
      (
        ProgramAssistantTopic.venues,
        l10n.hostProgrammeInboxTopicVenues,
        l10n.hostProgrammeInboxTopicVenuesNote,
      ),
      (
        ProgramAssistantTopic.rsvp,
        l10n.hostProgrammeInboxTopicRsvp,
        l10n.hostProgrammeInboxTopicRsvpNote,
      ),
    ];
    final reads = [
      (
        ProgramAssistantAttachment.tickets,
        l10n.hostProgrammeInboxReadTickets,
        l10n.hostProgrammeInboxReadTicketsNote,
      ),
      (
        ProgramAssistantAttachment.ids,
        l10n.hostProgrammeInboxReadIds,
        l10n.hostProgrammeInboxReadIdsNote,
      ),
    ];
    final within = [
      (ProgramAssistantReplyWithin.hour, l10n.hostProgrammeInboxWithinHour),
      (
        ProgramAssistantReplyWithin.fourHours,
        l10n.hostProgrammeInboxWithinFourHours,
      ),
      (
        ProgramAssistantReplyWithin.sameDay,
        l10n.hostProgrammeInboxWithinSameDay,
      ),
    ];
    List<T> toggled<T>(List<T> current, T value, bool on) => [
      for (final item in current)
        if (item != value) item,
      if (on) value,
    ];
    return CatchPageBody.screen(
      children: [
        CatchSection(
          title: l10n.hostProgrammeInboxAssistantNumber,
          dividers: CatchSectionPlacement.none,
          children: [
            CatchIndexRow(
              key: const ValueKey<String>('host-programme-assistant-number'),
              icon: CatchIcons.chat,
              iconTone: sender?.connected == true
                  ? CatchIndexRowTone.success
                  : CatchIndexRowTone.warning,
              title:
                  sender?.displayPhoneNumber ??
                  l10n.hostProgrammeInboxAssistantNoNumber,
              subtitle: sender?.verifiedName == null
                  ? null
                  : l10n.hostProgrammeInboxAssistantShowsAs(
                      name: sender!.verifiedName!,
                    ),
              status: sender?.connected == true
                  ? l10n.hostProgrammeInboxAssistantConnected
                  : l10n.hostProgrammeInboxAssistantNotConnected,
              statusTone: sender?.connected == true
                  ? CatchIndexRowTone.success
                  : CatchIndexRowTone.warning,
              onTap: null,
            ),
            CatchText(
              sender != null && !sender.boundToProgramme
                  ? l10n.hostProgrammeInboxAssistantSharedNumber
                  : l10n.hostProgrammeInboxAssistantNumberNote,
              variant: CatchTextVariant.bodySmall,
              tone: CatchTextTone.secondary,
            ),
          ],
        ),
        CatchSection(
          children: [
            CatchIndexRow(
              title: l10n.hostProgrammeInboxAssistantOn,
              subtitle: l10n.hostProgrammeInboxAssistantOnNote,
              onTap: null,
              trailing: CatchToggleInput(
                key: const ValueKey<String>('host-programme-assistant-on'),
                value: settings.enabled,
                semanticLabel: l10n.hostProgrammeInboxAssistantOn,
                contractExemption: _exemption,
                onChanged: busy
                    ? null
                    : (on) =>
                          onChange(ProgramAssistantSettingsChange(enabled: on)),
              ),
            ),
          ],
        ),
        CatchSection(
          title: l10n.hostProgrammeInboxAssistantMayAnswer,
          children: [
            for (final (topic, title, note) in topics)
              CatchIndexRow(
                title: title,
                subtitle: note,
                onTap: null,
                trailing: CatchToggleInput(
                  key: ValueKey<String>(
                    'host-programme-assistant-topic-${topic.name}',
                  ),
                  value: settings.answerTopics.contains(topic),
                  semanticLabel: title,
                  contractExemption: _exemption,
                  onChanged: busy
                      ? null
                      : (on) => onChange(
                          ProgramAssistantSettingsChange(
                            answerTopics: toggled(
                              settings.answerTopics,
                              topic,
                              on,
                            ),
                          ),
                        ),
                ),
              ),
          ],
        ),
        CatchSection(
          title: l10n.hostProgrammeInboxAssistantReads,
          children: [
            for (final (attachment, title, note) in reads)
              CatchIndexRow(
                title: title,
                subtitle: note,
                onTap: null,
                trailing: CatchToggleInput(
                  key: ValueKey<String>(
                    'host-programme-assistant-read-${attachment.name}',
                  ),
                  value: settings.attachmentReads.contains(attachment),
                  semanticLabel: title,
                  contractExemption: _exemption,
                  onChanged: busy
                      ? null
                      : (on) => onChange(
                          ProgramAssistantSettingsChange(
                            attachmentReads: toggled(
                              settings.attachmentReads,
                              attachment,
                              on,
                            ),
                          ),
                        ),
                ),
              ),
          ],
        ),
        CatchSection(
          title: l10n.hostProgrammeInboxEverythingElse,
          empty: l10n.hostProgrammeInboxNoStaff,
          dividers: CatchSectionPlacement.none,
          children: [
            for (final member in settings.staff)
              CatchIndexRow(
                title: member.displayName ?? member.uid,
                leading: CatchAvatar.system(
                  size: CatchAvatarSize.sm,
                  name: member.displayName ?? '',
                ),
                onTap: null,
                trailing: CatchToggleInput(
                  key: ValueKey<String>(
                    'host-programme-assistant-staff-${member.uid}',
                  ),
                  value: settings.escalationStaffUids.contains(member.uid),
                  semanticLabel: member.displayName ?? member.uid,
                  contractExemption: _exemption,
                  onChanged: busy
                      ? null
                      : (on) => onChange(
                          ProgramAssistantSettingsChange(
                            escalationStaffUids: toggled(
                              settings.escalationStaffUids,
                              member.uid,
                              on,
                            ),
                          ),
                        ),
                ),
              ),
          ],
        ),
        CatchStack(
          gap: CatchStackGap.g8,
          children: [
            CatchText(
              l10n.hostProgrammeInboxReplyWithin,
              variant: CatchTextVariant.labelAction,
            ),
            CatchStack(
              direction: CatchStackDirection.row,
              gap: CatchStackGap.g6,
              wrap: true,
              children: [
                for (final (value, label) in within)
                  CatchChip.choice(
                    key: ValueKey<String>(
                      'host-programme-assistant-within-${value.name}',
                    ),
                    label: label,
                    selected: settings.replyWithin == value,
                    mode: CatchChipMode.single,
                    size: CatchChipSize.sm,
                    onPressed: busy
                        ? null
                        : () => onChange(
                            ProgramAssistantSettingsChange(replyWithin: value),
                          ),
                  ),
              ],
            ),
          ],
        ),
        CatchSection(
          title: l10n.hostProgrammeInboxLanguages,
          note: l10n.hostProgrammeInboxLanguagesNote,
          dividers: CatchSectionPlacement.none,
          children: [
            CatchStack(
              direction: CatchStackDirection.row,
              gap: CatchStackGap.g6,
              wrap: true,
              children: [
                for (final language in ProgramAssistantLanguage.values)
                  CatchChip.choice(
                    key: ValueKey<String>(
                      'host-programme-assistant-language-${language.name}',
                    ),
                    label: hostProgrammeInboxLanguageName(l10n, language),
                    selected: settings.languages.contains(language),
                    mode: CatchChipMode.multiple,
                    size: CatchChipSize.sm,
                    onPressed:
                        busy ||
                            (settings.languages.length == 1 &&
                                settings.languages.contains(language))
                        ? null
                        : () => onChange(
                            ProgramAssistantSettingsChange(
                              languages: toggled(
                                settings.languages,
                                language,
                                !settings.languages.contains(language),
                              ),
                            ),
                          ),
                  ),
              ],
            ),
          ],
        ),
        CatchSection(
          title: l10n.hostProgrammeInboxNeverDoes,
          children: [
            for (final rule in settings.neverDoes)
              CatchIndexRow(
                icon: CatchIcons.block,
                title: hostProgrammeAssistantNeverDoesText(l10n, rule),
                onTap: null,
              ),
            CatchIndexRow(
              icon: CatchIcons.block,
              title: l10n.hostProgrammeInboxNeverGuesses,
              onTap: null,
            ),
          ],
        ),
      ],
    );
  }
}

String hostProgrammeAssistantNeverDoesText(
  AppLocalizations l10n,
  ProgramAssistantNeverDoes rule,
) => switch (rule) {
  ProgramAssistantNeverDoes.promisesChanges =>
    l10n.hostProgrammeInboxNeverPromises,
  ProgramAssistantNeverDoes.sharesOtherGuests =>
    l10n.hostProgrammeInboxNeverShares,
  ProgramAssistantNeverDoes.handlesPayments =>
    l10n.hostProgrammeInboxNeverPayments,
  ProgramAssistantNeverDoes.givesMedicalOrLegalAdvice =>
    l10n.hostProgrammeInboxNeverAdvice,
  ProgramAssistantNeverDoes.sharesStaffContacts =>
    l10n.hostProgrammeInboxNeverStaff,
};
