import 'package:catch_dating_app/contexts/audience/data/crm/host_contacts_repository.dart';
import 'package:catch_dating_app/contexts/audience/domain/crm/host_audience_contact_detail.dart';
import 'package:catch_dating_app/contexts/audience/domain/crm/host_customer_memory.dart';
import 'package:catch_dating_app/hosts/people/person_state.dart';
import 'package:catch_platform/riverpod_ui/catch_async_value_adapter.dart';
import 'package:flutter_riverpod/experimental/mutation.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:riverpod_annotation/riverpod_annotation.dart';

part 'person_controller.g.dart';

/// One person from three listeners: the directory row (name, tags,
/// revision), the contact detail read model (attendance, revenue, nights)
/// and the team's newest note. A write reaches the page through them.
@riverpod
HostPersonState hostPersonController(
  Ref ref,
  String organizerId,
  String contactId,
) {
  final summary = catchAsyncStateFromAsyncValue(
    ref.watch(hostContactSummaryRowProvider(organizerId, contactId)),
  );
  final facts = catchAsyncStateFromAsyncValue(
    ref.watch(hostContactDetailFactsProvider(organizerId, contactId)),
  );
  final notes = catchAsyncStateFromAsyncValue(
    ref.watch(hostContactNotesProvider(organizerId, contactId)),
  );
  final row = summary.value;
  final view = facts.value;
  final latest = notes.value;
  if (row == null || view == null || latest == null) {
    for (final part in [summary, facts, notes]) {
      if (part.hasError) {
        return HostPersonState(
          status: HostPersonStatus.error,
          error: part.error,
        );
      }
    }
    return const HostPersonState.loading();
  }
  return HostPersonState(
    status: HostPersonStatus.ready,
    detail: HostAudienceContactDetail.fromReadModels(
      organizerId: organizerId,
      contact: row.contact,
      linkedAccount: row.linkedAccount,
      facts: view,
      notes: latest.notes,
      notesTruncated: latest.truncated,
    ),
  );
}

/// Restarts a person's listeners after a failure (the error retry).
void refreshHostPerson(WidgetRef ref, String organizerId, String contactId) {
  ref
    ..invalidate(hostContactSummaryRowProvider(organizerId, contactId))
    ..invalidate(hostContactDetailFactsProvider(organizerId, contactId))
    ..invalidate(hostContactNotesProvider(organizerId, contactId));
}

/// The existing contact commands the People pages use: add a note, set the
/// tags, and open a conversation with the person.
@riverpod
HostPeopleCommands hostPeopleCommands(Ref ref) =>
    HostPeopleCommands(ref.watch(hostContactsRepositoryProvider));

class HostPeopleCommands {
  const HostPeopleCommands(this._contacts);

  static final noteMutation = Mutation<HostCustomerNote>();
  static final tagsMutation = Mutation<void>();
  static final messageMutation = Mutation<String>();

  final HostContactsRepository _contacts;

  /// The most tags one person can carry.
  static const int tagLimit = 5;

  Future<HostCustomerNote> addNote({
    required String organizerId,
    required String contactId,
    required String body,
  }) => _contacts.createContactNote(
    organizerId: organizerId,
    contactId: contactId,
    body: body,
  );

  /// Replaces the person's tags with [labels], fenced by the record's
  /// revision.
  Future<void> setTags({
    required String organizerId,
    required String contactId,
    required int expectedRevision,
    required List<String> labels,
  }) => _contacts.mutateContact(
    organizerId: organizerId,
    contactId: contactId,
    expectedRevision: expectedRevision,
    manualTags: labels,
  );

  /// Opens (or finds) the Catch conversation with the person; returns its
  /// match id.
  Future<String> startConversation({
    required String organizerId,
    required String contactId,
  }) => _contacts.startContactConversation(
    organizerId: organizerId,
    contactId: contactId,
  );
}
