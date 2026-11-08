import 'package:catch_dating_app/contexts/programmes/domain/program_message_models.dart';
import 'package:catch_dating_app/contexts/programmes/domain/program_models.dart';
import 'package:catch_dating_app/hosts/programmes/planner/programme_messages_body.dart';
import 'package:catch_l10n/l10n.dart';
import 'package:catch_platform/l10n/catch_ui_copy.dart';
import 'package:catch_platform/time/time_formatters.dart';
import 'package:catch_tokens/catch_tokens.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/widgets.dart';

/// The lead times a function or flight message offers, in minutes.
const hostProgrammeMessageOffsets = [-1440, -120, -30, 0];

/// A planned message (RbProgMessage): what it is tied to and when, who
/// gets it and what it says, with the quiet-hours notice.
class HostProgrammeMessageBody extends StatelessWidget {
  const HostProgrammeMessageBody({
    super.key,
    required this.draft,
    required this.functions,
    required this.flights,
    required this.hostName,
    required this.hasSender,
    required this.onChanged,
    required this.onPickDate,
    this.error,
  });

  final ProgramMessageDraft draft;
  final List<OrganizerFunctionDetail> functions;

  /// Inbound legs a message can be tied to, as (legId, label).
  final List<(String, String)> flights;
  final String hostName;

  /// Whether the organiser has an active WhatsApp sender.
  final bool hasSender;
  final ValueChanged<ProgramMessageDraft> onChanged;
  final VoidCallback onPickDate;
  final String? error;

  ProgramMessageDraft _with({
    ProgramMessageAnchorKind? anchorKind,
    String? anchorId,
    bool clearAnchor = false,
    int? offsetMinutes,
    ProgramMessageAudience? audience,
    ProgramMessageTemplate? template,
  }) => ProgramMessageDraft(
    anchorKind: anchorKind ?? draft.anchorKind,
    anchorId: clearAnchor ? null : anchorId ?? draft.anchorId,
    offsetMinutes: offsetMinutes ?? draft.offsetMinutes,
    scheduledAt: draft.scheduledAt,
    audience: audience ?? draft.audience,
    template: template ?? draft.template,
    name: draft.name,
  );

  @override
  Widget build(BuildContext context) {
    final l10n = context.l10n;
    final copy = catchFieldCopy(l10n);
    final functionIds = [for (final function in functions) function.functionId];
    final flightIds = [for (final (id, _) in flights) id];
    final tiedToFunction =
        draft.anchorKind == ProgramMessageAnchorKind.function;
    return CatchPageBody.screen(
      children: [
        if (error != null)
          CatchNotice.inline(
            tone: CatchNoticeTone.danger,
            icon: CatchIcons.error,
            body: error!,
          ),
        if (!hasSender)
          CatchNotice.inline(
            tone: CatchNoticeTone.warning,
            icon: CatchIcons.chat,
            body: l10n.hostProgrammeMessageNoSender,
          ),
        CatchSection(
          title: l10n.hostProgrammeMessageWhen,
          dividers: CatchSectionPlacement.none,
          children: [
            CatchPageTabBar<ProgramMessageAnchorKind>.segmented(
              selected: draft.anchorKind,
              label: l10n.hostProgrammeMessageTiedToLabel,
              onChanged: (kind) =>
                  onChanged(_with(anchorKind: kind, clearAnchor: true)),
              options: [
                for (final kind in ProgramMessageAnchorKind.values)
                  CatchOption(
                    value: kind,
                    label: switch (kind) {
                      ProgramMessageAnchorKind.function =>
                        l10n.hostProgrammeMessageTieFunction,
                      ProgramMessageAnchorKind.flight =>
                        l10n.hostProgrammeMessageTieFlight,
                      ProgramMessageAnchorKind.date =>
                        l10n.hostProgrammeMessageTieDate,
                    },
                  ),
              ],
            ),
            if (tiedToFunction)
              CatchField.select(
                key: const ValueKey<String>('host-programme-message-function'),
                copy: copy,
                title: l10n.hostProgrammeMessageFunction,
                contractExemption: 'A function of this programme.',
                values: functionIds,
                value: functionIds.contains(draft.anchorId)
                    ? draft.anchorId
                    : null,
                itemLabelBuilder: (id) => functions
                    .firstWhere((function) => function.functionId == id)
                    .name,
                onChanged: (id) => onChanged(_with(anchorId: id)),
              ),
            if (draft.anchorKind == ProgramMessageAnchorKind.flight)
              CatchField.select(
                key: const ValueKey<String>('host-programme-message-flight'),
                copy: copy,
                title: l10n.hostProgrammeMessageFlight,
                contractExemption: 'An inbound leg of this programme.',
                values: flightIds,
                value: flightIds.contains(draft.anchorId)
                    ? draft.anchorId
                    : null,
                itemLabelBuilder: (id) =>
                    flights.firstWhere((flight) => flight.$1 == id).$2,
                onChanged: (id) => onChanged(_with(anchorId: id)),
              ),
            if (draft.anchorKind == ProgramMessageAnchorKind.date)
              CatchIndexRow(
                key: const ValueKey<String>('host-programme-message-date'),
                icon: CatchIcons.date,
                title: l10n.hostProgrammeMessageSendOn,
                value: draft.scheduledAt == null
                    ? l10n.hostProgrammeCreatePick
                    : '${AppTimeFormatters.weekdayDayMonth(draft.scheduledAt!)}'
                          ' · ${AppTimeFormatters.time(draft.scheduledAt!)}',
                chevron: true,
                onTap: onPickDate,
              )
            else
              CatchStack(
                direction: CatchStackDirection.row,
                gap: CatchStackGap.g8,
                wrap: true,
                children: [
                  for (final offset in hostProgrammeMessageOffsets)
                    CatchChip.choice(
                      key: ValueKey<String>(
                        'host-programme-message-offset-$offset',
                      ),
                      label: hostProgrammeMessageOffsetLabel(l10n, offset),
                      selected: draft.offsetMinutes == offset,
                      mode: CatchChipMode.single,
                      onPressed: () => onChanged(_with(offsetMinutes: offset)),
                    ),
                ],
              ),
          ],
        ),
        CatchSection(
          title: l10n.hostProgrammeMessageWho,
          dividers: CatchSectionPlacement.none,
          children: [
            for (final audience in ProgramMessageAudience.values)
              if (tiedToFunction ||
                  audience == ProgramMessageAudience.everyone ||
                  audience == ProgramMessageAudience.notReplied)
                CatchChoiceTile(
                  key: ValueKey<String>(
                    'host-programme-message-who-${audience.name}',
                  ),
                  variant: CatchChoiceTileVariant.row,
                  contractExemption: 'Planned message audience.',
                  title: hostProgrammeMessageAudienceLabel(l10n, audience),
                  selected: draft.audience == audience,
                  onTap: () => onChanged(_with(audience: audience)),
                ),
          ],
        ),
        CatchSection(
          title: l10n.hostProgrammeMessageWhat,
          dividers: CatchSectionPlacement.none,
          children: [
            CatchField.select(
              key: const ValueKey<String>('host-programme-message-template'),
              copy: copy,
              title: l10n.hostProgrammeMessageTemplate,
              contractExemption: 'A WhatsApp template for programmes.',
              values: ProgramMessageTemplate.values,
              value: draft.template,
              itemLabelBuilder: (template) =>
                  hostProgrammeMessageTemplateLabel(l10n, template),
              onChanged: (template) => onChanged(_with(template: template)),
            ),
            CatchChatBubble(
              text: hostProgrammeMessageTemplatePreview(l10n, draft.template),
              variant: CatchChatBubbleVariant.host,
              format: CatchFormat.nightsOut,
              author: CatchChatAuthor(name: hostName),
            ),
          ],
        ),
        CatchNotice.inline(
          tone: CatchNoticeTone.neutral,
          icon: CatchIcons.night,
          title: l10n.hostProgrammeMessageQuietTitle,
          body: l10n.hostProgrammeMessageQuietBody,
        ),
      ],
    );
  }
}

String hostProgrammeMessageOffsetLabel(AppLocalizations l10n, int offset) =>
    switch (offset) {
      -1440 => l10n.hostProgrammeMessageDayBefore,
      -120 => l10n.hostProgrammeMessageTwoHours,
      -30 => l10n.hostProgrammeMessageHalfHour,
      _ => l10n.hostProgrammeMessageWhenStarts,
    };

String hostProgrammeMessageTemplateLabel(
  AppLocalizations l10n,
  ProgramMessageTemplate template,
) => switch (template) {
  ProgramMessageTemplate.functionStarting =>
    l10n.hostProgrammeMessageTemplateStarting,
  ProgramMessageTemplate.getReady => l10n.hostProgrammeMessageTemplateReady,
  ProgramMessageTemplate.transportReady => l10n.hostProgrammeMessageTemplateCar,
  ProgramMessageTemplate.rsvpReminder => l10n.hostProgrammeMessageTemplateReply,
};

String hostProgrammeMessageTemplatePreview(
  AppLocalizations l10n,
  ProgramMessageTemplate template,
) => switch (template) {
  ProgramMessageTemplate.functionStarting =>
    l10n.hostProgrammeMessagePreviewStarting,
  ProgramMessageTemplate.getReady => l10n.hostProgrammeMessagePreviewReady,
  ProgramMessageTemplate.transportReady => l10n.hostProgrammeMessagePreviewCar,
  ProgramMessageTemplate.rsvpReminder => l10n.hostProgrammeMessagePreviewReply,
};
