import 'package:catch_dating_app/contexts/messaging/data/event_chat_repository.dart';
import 'package:catch_dating_app/contexts/messaging/domain/event_chat.dart';
import 'package:catch_dating_app/core/presentation/catch_ui_copy.dart';
import 'package:catch_dating_app/core/riverpod_ui/catch_async_boundary.dart';
import 'package:catch_dating_app/core/riverpod_ui/catch_localized_error_state.dart';
import 'package:catch_dating_app/exceptions/app_exception.dart';
import 'package:catch_dating_app/l10n/l10n.dart';
import 'package:catch_dating_app/routing/route_contract.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

class EventChatEntrySection extends ConsumerWidget {
  const EventChatEntrySection({super.key, required this.eventId});
  final String eventId;
  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final provider = eventChatAccessProvider(eventId);
    return CatchAsyncBoundary<EventChatAccess>(
      value: ref.watch(provider),
      retainDataOn: const {},
      loadingBuilder: (_) => const SizedBox.shrink(),
      errorBuilder: (_, error, _, retry) =>
          error is PermissionException || error is DocumentNotFoundException
          ? const SizedBox.shrink()
          : CatchLocalizedErrorState(
              error,
              mode: CatchErrorStateMode.compact,
              onRetry: retry,
              retryLabel: context.l10n.eventChatRefresh,
            ),
      onRetry: () => ref.invalidate(provider),
      builder: (context, access) => CatchSection.fieldRows(
        children: [
          CatchField.nav(
            copy: catchFieldCopy(context.l10n),
            title: context.l10n.eventChatTitle,
            body: access.isRoomOpen
                ? context.l10n.eventChatEntryBody
                : context.l10n.eventChatGuestWaiting,
            emphasis: CatchFieldEmphasis.title,
            icon: CatchIcons.chat,
            onTap: () => context.pushNamed(
              Routes.eventChatScreen.name,
              pathParameters: {'eventId': eventId},
            ),
          ),
        ],
      ),
    );
  }
}
