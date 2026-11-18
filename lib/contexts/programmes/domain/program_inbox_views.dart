import 'package:catch_dating_app/contexts/programmes/domain/program_whatsapp_models.dart';

/// A thread keeps at most this many messages on screen, newest last; the
/// callable returned the same window.
const programWhatsappThreadMessageWindow = 200;

/// One inbox row from a `programWhatsappThreadViews` document at [now]. The
/// view holds the instant the 24-hour window ends; whether it is open is the
/// phone's clock.
ProgramWhatsappThreadSummary programWhatsappSummaryFromView(
  Map<Object?, Object?> row,
  DateTime now,
) {
  final expires = row['serviceWindowExpiresAtMillis'];
  final lastInbound = row['lastInboundAtMillis'];
  final nowMillis = now.millisecondsSinceEpoch;
  return ProgramWhatsappThreadSummary.fromMap({
    ...row,
    'serviceWindowOpen':
        expires is int &&
        lastInbound is int &&
        nowMillis >= lastInbound &&
        nowMillis < expires,
  });
}

/// The inbox at [now]: every thread newest first, the counts of each
/// segment and the segment [filter] names. Counts and segments come from
/// the rows the account lists, so they stay current as threads change.
ProgramWhatsappInbox programWhatsappInboxFromViews({
  required String programId,
  required ProgramWhatsappFilter filter,
  required List<Map<Object?, Object?>> rows,
  required ProgramWhatsappSender? sender,
  required DateTime now,
}) {
  final all = [for (final row in rows) programWhatsappSummaryFromView(row, now)]
    ..sort(_newestFirst);
  bool segment(ProgramWhatsappThreadSummary thread) => switch (filter) {
    ProgramWhatsappFilter.all => true,
    ProgramWhatsappFilter.needsYou =>
      thread.state == ProgramWhatsappThreadState.needsYou,
    ProgramWhatsappFilter.handled =>
      thread.state == ProgramWhatsappThreadState.handled,
  };
  return ProgramWhatsappInbox(
    programId: programId,
    filter: filter,
    needsYou: all
        .where((t) => t.state == ProgramWhatsappThreadState.needsYou)
        .length,
    handled: all
        .where((t) => t.state == ProgramWhatsappThreadState.handled)
        .length,
    all: all.length,
    threads: all.where(segment).toList(growable: false),
    nextCursor: null,
    sender: sender,
  );
}

int _newestFirst(
  ProgramWhatsappThreadSummary a,
  ProgramWhatsappThreadSummary b,
) {
  final byTime = b.lastMessageAt.compareTo(a.lastMessageAt);
  return byTime != 0 ? byTime : b.threadId.compareTo(a.threadId);
}

/// One conversation: the thread's view, its household names (carried by the
/// view) and its newest messages, oldest first. [messageRows] are newest
/// first, as the query returns them; the message's author label was copied
/// onto it when it was written.
ProgramWhatsappThread programWhatsappThreadFromViews({
  required String programId,
  required Map<Object?, Object?> threadRow,
  required List<Map<Object?, Object?>> messageRows,
  required bool moreMessages,
  required DateTime now,
}) {
  final summary = programWhatsappSummaryFromView(threadRow, now);
  final householdId = threadRow['householdId'] as String?;
  final shown = messageRows.take(programWhatsappThreadMessageWindow).toList();
  return ProgramWhatsappThread(
    programId: programId,
    summary: summary,
    household: householdId == null
        ? null
        : ProgramWhatsappHousehold(
            householdId: householdId,
            label:
                threadRow['householdLabel'] as String? ?? summary.displayName,
            primaryContactName: threadRow['primaryContactName'] as String?,
            guestCount: threadRow['guestCount'] as int? ?? 0,
          ),
    messages: [
      for (final row in shown.reversed)
        ProgramWhatsappMessage.fromMap({
          ...row,
          'authorName': row['authorLabel'],
        }),
    ],
    truncated:
        moreMessages || messageRows.length > programWhatsappThreadMessageWindow,
  );
}

/// The programme's saved replies from `programWhatsappCannedReplies`, by
/// sort order, without the archived ones, as the callable listed them.
List<ProgramCannedReply> programCannedRepliesFromViews(
  List<Map<Object?, Object?>> rows,
) =>
    [
      for (final row in rows)
        if (row['archived'] != true) ProgramCannedReply.fromMap(row),
    ]..sort((a, b) {
      final bySort = a.sortOrder.compareTo(b.sortOrder);
      return bySort != 0 ? bySort : a.cannedReplyId.compareTo(b.cannedReplyId);
    });
