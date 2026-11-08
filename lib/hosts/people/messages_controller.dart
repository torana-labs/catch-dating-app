import 'package:catch_dating_app/chats/chats.dart';
import 'package:catch_dating_app/contexts/audience/data/crm/host_whatsapp_repository.dart';
import 'package:catch_dating_app/contexts/audience/domain/crm/host_whatsapp_thread.dart';
import 'package:catch_dating_app/contexts/events/data/event_repository.dart';
import 'package:catch_dating_app/contexts/events/domain/event.dart';
import 'package:catch_dating_app/hosts/people/automations_controller.dart';
import 'package:catch_dating_app/hosts/people/automations_state.dart';
import 'package:catch_dating_app/hosts/people/messages_state.dart';
import 'package:catch_platform/riverpod_ui/catch_async_value_adapter.dart';
import 'package:flutter/foundation.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:riverpod_annotation/riverpod_annotation.dart';

part 'messages_controller.g.dart';

/// Which conversations Messages shows, and the day Tonight means.
@immutable
class HostMessagesRequest {
  const HostMessagesRequest({
    required this.organizerId,
    required this.day,
    this.filter = HostMessagesFilter.all,
  });

  final String organizerId;

  /// Today, at midnight.
  final DateTime day;
  final HostMessagesFilter filter;

  @override
  bool operator ==(Object other) =>
      other is HostMessagesRequest &&
      other.organizerId == organizerId &&
      other.day == day &&
      other.filter == filter;

  @override
  int get hashCode => Object.hash(organizerId, day, filter);
}

/// Messages, composed from the Catch conversations listener, the WhatsApp
/// threads read, the organizer's events (for Tonight) and Automatic
/// messages (for its row).
@riverpod
HostMessagesState hostMessagesController(Ref ref, HostMessagesRequest request) {
  final organizerId = request.organizerId;
  final catchRead = catchAsyncStateFromAsyncValue(
    ref.watch(chatsListViewModelProvider),
  );
  final whatsappRead = catchAsyncStateFromAsyncValue(
    ref.watch(hostWhatsappThreadsProvider(organizerId)),
  );
  final events = catchAsyncStateFromAsyncValue(
    ref.watch(watchEventsForOrganizerProvider(organizerId)),
  ).value;
  final automations = ref.watch(
    hostAutomationsControllerProvider(
      organizerId,
      DateTime(request.day.year, request.day.month),
    ),
  );
  final automationsReady = automations.status == HostAutomationsStatus.ready;
  final automationsOn = automationsReady ? automations.onCount : null;
  final automationsSent = automationsReady ? automations.sentThisMonth : null;

  final catchView = catchRead.value;
  final whatsapp = whatsappRead.value;
  if (catchView == null || whatsapp == null) {
    final error = catchRead.hasError ? catchRead.error : whatsappRead.error;
    final failed =
        (catchRead.hasError && catchView == null) ||
        (whatsappRead.hasError && whatsapp == null);
    return HostMessagesState(
      status: failed ? HostMessagesStatus.error : HostMessagesStatus.loading,
      filter: request.filter,
      automationsOn: automationsOn,
      automationsSent: automationsSent,
      error: failed ? error : null,
    );
  }
  final tonight = <String>{
    for (final event in events ?? const <Event>[])
      if (!event.isCancelled && _sameDay(event.startTime, request.day))
        event.id,
  };
  final all = composeHostMessageThreads(
    organizerId: organizerId,
    catchThreads: [...catchView.newMatches, ...catchView.conversations],
    whatsappThreads: whatsapp.threads,
    tonightEventIds: tonight,
  );
  return HostMessagesState(
    status: HostMessagesStatus.ready,
    filter: request.filter,
    threads: switch (request.filter) {
      HostMessagesFilter.all => all,
      HostMessagesFilter.unread => [
        for (final thread in all)
          if (thread.unread) thread,
      ],
      HostMessagesFilter.tonight => [
        for (final thread in all)
          if (thread.tonight) thread,
      ],
    },
    unreadCount: all.where((thread) => thread.unread).length,
    automationsOn: automationsOn,
    automationsSent: automationsSent,
  );
}

/// One row per person: their Catch conversations with this organizer and
/// their WhatsApp threads, keyed the way the inbox opens them. The newest
/// message wins the preview; a person waits on the host when a Catch
/// conversation has unread messages or their newest WhatsApp message is
/// theirs.
List<HostMessageThread> composeHostMessageThreads({
  required String organizerId,
  required List<ChatThreadPreview> catchThreads,
  required List<HostWhatsappThreadSummary> whatsappThreads,
  required Set<String> tonightEventIds,
}) {
  final byPerson = <String, _HostThreadBuilder>{};
  for (final thread in catchThreads) {
    final match = thread.match;
    if (match.organizerId != organizerId ||
        !match.isOrganizerHostInquiry ||
        match.isBlocked ||
        match.isClosed) {
      continue;
    }
    byPerson
        .putIfAbsent('uid:${thread.otherUid}', _HostThreadBuilder.new)
        .add(
          name: thread.displayName,
          photoUrl: thread.photoUrl,
          preview: thread.previewText,
          at: thread.timestamp,
          waiting: thread.unreadCount > 0,
          eventIds: thread.eventIds,
        );
  }
  for (final thread in whatsappThreads) {
    final personId = thread.linkedUid == null
        ? 'contact:${thread.contactId}'
        : 'uid:${thread.linkedUid}';
    byPerson
        .putIfAbsent(personId, _HostThreadBuilder.new)
        .add(
          name: thread.displayName,
          preview: thread.lastMessageBody,
          at: thread.lastMessageAt,
          waiting:
              thread.lastMessageDirection ==
              HostWhatsappMessageDirection.inbound,
          eventIds: thread.eventIds,
        );
  }
  final threads = [
    for (final entry in byPerson.entries)
      entry.value.build(entry.key, tonightEventIds),
  ]..sort((a, b) => b.at.compareTo(a.at));
  return List.unmodifiable(threads);
}

class _HostThreadBuilder {
  String name = '';
  String? photoUrl;
  String preview = '';
  DateTime? at;
  bool waiting = false;
  final List<String> eventIds = <String>[];

  void add({
    required String name,
    required String preview,
    required DateTime at,
    required bool waiting,
    required List<String> eventIds,
    String? photoUrl,
  }) {
    this.photoUrl ??= photoUrl;
    if (this.at == null || at.isAfter(this.at!)) {
      this.name = name;
      this.preview = preview;
      this.at = at;
    }
    this.waiting = this.waiting || waiting;
    for (final id in eventIds) {
      if (!this.eventIds.contains(id)) this.eventIds.add(id);
    }
  }

  HostMessageThread build(String personId, Set<String> tonight) =>
      HostMessageThread(
        personId: personId,
        name: name,
        photoUrl: photoUrl,
        preview: preview,
        at: at!,
        unread: waiting,
        tonight: eventIds.any(tonight.contains),
        eventId: eventIds.isEmpty ? null : eventIds.last,
      );
}

bool _sameDay(DateTime a, DateTime b) =>
    a.year == b.year && a.month == b.month && a.day == b.day;

/// Reads Messages again after a failure.
void retryHostMessagesReads(WidgetRef ref, String organizerId) => ref
  ..invalidate(chatsListViewModelProvider)
  ..invalidate(hostWhatsappThreadsProvider(organizerId))
  ..invalidate(watchEventsForOrganizerProvider(organizerId))
  ..invalidate(hostPeopleAutomationsProvider(organizerId));
