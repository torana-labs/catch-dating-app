import 'dart:async';

import 'package:catch_dating_app/contexts/audience/domain/crm/host_audience_contact_detail.dart';
import 'package:catch_dating_app/contexts/connections/data/match_repository.dart';
import 'package:catch_dating_app/hosts/people/person_body.dart';
import 'package:catch_dating_app/hosts/people/person_controller.dart';
import 'package:catch_dating_app/hosts/people/widgets/people_text_sheet.dart';
import 'package:catch_l10n/l10n.dart';
import 'package:catch_platform/errors/app_error_message.dart';
import 'package:catch_platform/riverpod_ui/catch_notice_feedback.dart';
import 'package:catch_platform/routing/route_contract.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

/// One person on a phone: who they are, their stats, the team's notes and
/// tags, and their nights with the organizer.
///
/// It watches [hostPersonControllerProvider] and turns the body's callbacks
/// and the menu into the existing contact commands: start a conversation,
/// set the tags and add a note.
class HostPersonScreen extends ConsumerWidget {
  const HostPersonScreen({
    super.key,
    required this.organizerId,
    required this.contactId,
    this.onBack,
  });

  final String organizerId;
  final String contactId;

  /// Back to People; null pops the route.
  final VoidCallback? onBack;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final l10n = context.l10n;
    final state = ref.watch(
      hostPersonControllerProvider(organizerId, contactId),
    );
    final messaging = ref.watch(HostPeopleCommands.messageMutation).isPending;
    listenToCatchMutationErrors(
      context,
      ref,
      mutations: [
        HostPeopleCommands.messageMutation,
        HostPeopleCommands.noteMutation,
        HostPeopleCommands.tagsMutation,
      ],
      errorContext: AppErrorContext.organizer,
    );
    final detail = state.detail;
    return CatchRoot(
      child: CatchScreen(
        key: const ValueKey<String>('host-person-screen'),
        topBar: CatchTopBar(
          variant: CatchTopBarVariant.tool,
          back: CatchTopBarBack(
            label: l10n.hostPeopleBackToPeople,
            onPressed: onBack ?? () => Navigator.of(context).maybePop(),
          ),
          actions: [
            CatchMenu<HostPersonMenuAction>.anchored(
              items: [
                CatchMenuItem(
                  value: HostPersonMenuAction.addNote,
                  label: l10n.hostPeopleAddNote,
                  icon: CatchIcons.note,
                  enabled: detail != null,
                ),
              ],
              onSelected: (action, _) {
                if (detail == null) return;
                switch (action) {
                  case HostPersonMenuAction.addNote:
                    unawaited(addHostPersonNote(context, ref, detail));
                }
              },
              builder: (context, controller, _) => CatchIconAction(
                tooltip: l10n.hostPeopleMoreActions,
                variant: CatchIconActionVariant.plain,
                onPressed: () =>
                    controller.isOpen ? controller.close() : controller.open(),
                child: CatchIcon(CatchIcons.more),
              ),
            ),
          ],
        ),
        body: CatchPageBody(
          child: HostPersonBody(
            state: state,
            messaging: messaging,
            onMessage: () => unawaited(
              messageHostPerson(
                context,
                ref,
                organizerId: organizerId,
                contactId: contactId,
              ),
            ),
            onAddTag: () {
              if (detail == null) return;
              unawaited(addHostPersonTag(context, ref, detail));
            },
            onRetry: () => refreshHostPerson(ref, organizerId, contactId),
          ),
        ),
      ),
    );
  }
}

/// The person menu's actions.
enum HostPersonMenuAction { addNote }

/// Opens the Catch conversation with a person: the existing
/// start-conversation command, then the conversation in Messages.
Future<void> messageHostPerson(
  BuildContext context,
  WidgetRef ref, {
  required String organizerId,
  required String contactId,
}) async {
  try {
    final matchId = await HostPeopleCommands.messageMutation.run(
      ref,
      (tx) => tx
          .get(hostPeopleCommandsProvider)
          .startConversation(organizerId: organizerId, contactId: contactId),
    );
    final match = await ref.read(matchStreamProvider(matchId).future);
    if (!context.mounted) return;
    final eventIds = match?.eventIds ?? const <String>[];
    context.goNamed(
      Routes.hostInboxScreen.name,
      queryParameters: {
        'organizerId': organizerId,
        'threadId': matchId,
        if (eventIds.isEmpty) 'scope': 'general' else 'eventId': eventIds.last,
      },
    );
  } on Object {
    // The mutation is watched for errors, which the screen shows.
  }
}

/// Asks for a tag and adds it to the person's tags.
Future<void> addHostPersonTag(
  BuildContext context,
  WidgetRef ref,
  HostAudienceContactDetail detail,
) async {
  final l10n = context.l10n;
  if (detail.manualTags.length >= HostPeopleCommands.tagLimit) {
    showCatchNotice(
      context,
      l10n.hostPeopleTagLimit(count: HostPeopleCommands.tagLimit),
      tone: CatchNoticeTone.warning,
    );
    return;
  }
  final label = await showCatchBottomSheet<String>(
    context: context,
    builder: (_) => HostPeopleTextSheet(
      title: l10n.hostPeopleAddTag,
      fieldTitle: l10n.hostPeopleTagField,
      saveLabel: l10n.hostPeopleAddTagSave,
      maxLength: 40,
    ),
  );
  if (label == null || !context.mounted) return;
  final labels = [
    for (final tag in detail.manualTags) tag.label,
    if (!detail.manualTags.any((tag) => tag.label == label)) label,
  ];
  try {
    await HostPeopleCommands.tagsMutation.run(
      ref,
      (tx) => tx
          .get(hostPeopleCommandsProvider)
          .setTags(
            organizerId: detail.organizerId,
            contactId: detail.contactId,
            expectedRevision: detail.revision,
            labels: labels,
          ),
    );
    refreshHostPerson(ref, detail.organizerId, detail.contactId);
  } on Object {
    // The mutation is watched for errors, which the screen shows.
  }
}

/// Asks for a note and adds it to the person's record.
Future<void> addHostPersonNote(
  BuildContext context,
  WidgetRef ref,
  HostAudienceContactDetail detail,
) async {
  final l10n = context.l10n;
  final body = await showCatchBottomSheet<String>(
    context: context,
    builder: (_) => HostPeopleTextSheet(
      title: l10n.hostPeopleAddNote,
      fieldTitle: l10n.hostPeopleNoteField,
      placeholder: l10n.hostPeopleNotesNote,
      saveLabel: l10n.hostPeopleAddNoteSave,
      maxLength: 2000,
      lines: 4,
    ),
  );
  if (body == null || !context.mounted) return;
  try {
    await HostPeopleCommands.noteMutation.run(
      ref,
      (tx) => tx
          .get(hostPeopleCommandsProvider)
          .addNote(
            organizerId: detail.organizerId,
            contactId: detail.contactId,
            body: body,
          ),
    );
    refreshHostPerson(ref, detail.organizerId, detail.contactId);
  } on Object {
    // The mutation is watched for errors, which the screen shows.
  }
}
