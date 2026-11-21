import 'package:catch_dating_app/contexts/audience/data/crm/host_contacts_repository.dart';
import 'package:catch_dating_app/contexts/audience/data/crm/host_saved_audience_repository.dart';
import 'package:catch_dating_app/contexts/audience/domain/crm/host_saved_audience.dart';
import 'package:catch_dating_app/contexts/audience/domain/crm/host_saved_audience_definition.dart';
import 'package:catch_dating_app/contexts/events/data/event_repository.dart';
import 'package:catch_dating_app/contexts/events/domain/event.dart';
import 'package:catch_dating_app/hosts/people/saved_group_state.dart';
import 'package:catch_platform/firebase/read_limit_policy.dart';
import 'package:catch_platform/riverpod_ui/catch_async_value_adapter.dart';
import 'package:flutter_riverpod/experimental/mutation.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:riverpod_annotation/riverpod_annotation.dart';

part 'saved_group_controller.g.dart';

/// Who a saved group holds now: the existing preview command run on the
/// group's current revision, with the first few people.
@riverpod
Future<HostSavedAudiencePreview> hostSavedGroupPreview(
  Ref ref,
  String organizerId,
  String audienceId,
) async {
  final audience = await ref.watch(
    hostSavedAudienceDetailProvider(organizerId, audienceId).future,
  );
  return ref
      .watch(hostSavedAudienceRepositoryProvider)
      .previewSavedAudience(
        organizerId: organizerId,
        audience: audience,
        sampleLimit: HostSavedGroupCommands.sample,
      );
}

/// One page of a hand-picked group's people: page [page] of the group's
/// chosen contact ids, [hostSavedGroupMemberPage] at a time, each with its
/// `hostContactSummaries` row, or no name when the contact has none (merged
/// into another contact, removed or hidden).
@riverpod
Stream<List<HostSavedGroupMember>> hostSavedGroupMembers(
  Ref ref,
  String organizerId,
  String audienceId,
  int page,
) async* {
  final audience = await ref.watch(
    hostSavedAudienceDetailProvider(organizerId, audienceId).future,
  );
  final ids = audience.definition.selectedContactIds
      .skip(page * hostSavedGroupMemberPage)
      .take(hostSavedGroupMemberPage)
      .toList(growable: false);
  yield* ref
      .watch(hostContactsRepositoryProvider)
      .watchContactSummaries(organizerId, ids)
      .map(
        (rows) => [
          for (final id in ids)
            (contactId: id, displayName: rows[id]?.contact.displayName),
        ],
      );
}

/// People a hand-picked group lists per page: one by-id read.
const int hostSavedGroupMemberPage = ReadLimitPolicy.multiIdChunk;

/// A saved group, composed from the group read, its preview and the
/// organizer's events (for a Went to rule's event). No [audienceId] means
/// a new group. A hand-picked group also lists its first [memberPages]
/// pages of people.
@riverpod
HostSavedGroupState hostSavedGroupController(
  Ref ref,
  String organizerId,
  String? audienceId, {
  int memberPages = 1,
}) {
  if (audienceId == null) return const HostSavedGroupState.creating();
  final read = catchAsyncStateFromAsyncValue(
    ref.watch(hostSavedAudienceDetailProvider(organizerId, audienceId)),
  );
  final audience = read.value;
  if (audience == null) {
    return read.hasError
        ? HostSavedGroupState(
            status: HostSavedGroupStatus.error,
            error: read.error,
          )
        : const HostSavedGroupState.loading();
  }
  if (audience.definition.isStatic) {
    return _handPicked(ref, organizerId, audience, memberPages);
  }
  final preview = catchAsyncStateFromAsyncValue(
    ref.watch(hostSavedGroupPreviewProvider(organizerId, audienceId)),
  );
  final state = HostSavedGroupState(
    status: HostSavedGroupStatus.ready,
    audience: audience,
    preview: preview.value,
    previewFailed: preview.hasError && preview.value == null,
  );
  final eventId = state.attendedEventId;
  if (eventId == null) return state;
  final events = catchAsyncStateFromAsyncValue(
    ref.watch(watchEventsForOrganizerProvider(organizerId)),
  ).value;
  return HostSavedGroupState(
    status: state.status,
    audience: audience,
    preview: state.preview,
    previewFailed: state.previewFailed,
    eventTitle: events
        ?.where((event) => event.id == eventId)
        .firstOrNull
        ?.title,
  );
}

/// A hand-picked group with its people, page by page. It lists the chosen
/// ids in order and needs no preview: the count is the list's length.
HostSavedGroupState _handPicked(
  Ref ref,
  String organizerId,
  HostSavedAudience audience,
  int memberPages,
) {
  final total = audience.definition.selectedContactIds.length;
  final pages = (total / hostSavedGroupMemberPage).ceil();
  final shown = memberPages.clamp(1, pages < 1 ? 1 : pages);
  final members = <HostSavedGroupMember>[];
  var failed = false;
  var loading = false;
  for (var page = 0; page < shown && page < pages; page++) {
    final value = catchAsyncStateFromAsyncValue(
      ref.watch(
        hostSavedGroupMembersProvider(organizerId, audience.audienceId, page),
      ),
    );
    final rows = value.value;
    if (rows == null) {
      failed = failed || value.hasError;
      loading = !value.hasError;
      break;
    }
    members.addAll(rows);
  }
  return HostSavedGroupState(
    status: HostSavedGroupStatus.ready,
    audience: audience,
    members: members.isEmpty && (loading || failed) ? null : members,
    membersFailed: failed,
    moreMembers: !loading && !failed && members.length < total,
  );
}

/// Reads a saved group again after a failure. A save needs no reread: the
/// group's listener delivers the new revision, and its preview follows.
void refreshHostSavedGroup(
  WidgetRef ref,
  String organizerId,
  String audienceId,
) {
  ref
    ..invalidate(hostSavedAudienceDetailProvider(organizerId, audienceId))
    ..invalidate(hostSavedGroupPreviewProvider(organizerId, audienceId))
    ..invalidate(hostSavedGroupMembersProvider)
    ..invalidate(hostAllSavedAudienceSummariesProvider(organizerId));
}

/// The existing saved group commands: save (create or update) and delete
/// (archive), each fenced by the group's revision.
@riverpod
HostSavedGroupCommands hostSavedGroupCommands(Ref ref) =>
    HostSavedGroupCommands(ref.watch(hostSavedAudienceRepositoryProvider));

class HostSavedGroupCommands {
  const HostSavedGroupCommands(this._groups);

  static final saveMutation = Mutation<HostSavedAudience>();
  static final deleteMutation = Mutation<HostSavedAudience>();

  /// People shown under the match count.
  static const int sample = 4;

  final HostSavedAudienceRepository _groups;

  /// Saves [name] with the attendance rule set to at least [atLeast]
  /// nights; every other rule of [audience] is kept as it is.
  Future<HostSavedAudience> save({
    required String organizerId,
    required String requestId,
    required String name,
    required int atLeast,
    HostSavedAudience? audience,
  }) {
    final kept = [
      for (final rule
          in audience?.definition.predicates ??
              const <HostSavedAudiencePredicate>[])
        if (rule is! HostSavedAudienceAttendanceCount ||
            rule.operator != HostSavedAudienceAttendanceOperator.atLeast)
          rule,
    ];
    return _groups.upsertSavedAudience(
      organizerId: organizerId,
      requestId: requestId,
      name: name,
      audienceId: audience?.audienceId,
      expectedRevision: audience?.revision,
      definition: HostSavedAudienceDefinition(
        join: audience?.definition.join ?? HostSavedAudienceJoin.all,
        predicates: [
          HostSavedAudienceAttendanceCount(
            operator: HostSavedAudienceAttendanceOperator.atLeast,
            eventCount: atLeast,
          ),
          ...kept,
        ],
      ),
    );
  }

  Future<HostSavedAudience> delete({
    required String organizerId,
    required HostSavedAudience audience,
  }) => _groups.archiveSavedAudience(
    organizerId: organizerId,
    audience: audience,
  );
}
