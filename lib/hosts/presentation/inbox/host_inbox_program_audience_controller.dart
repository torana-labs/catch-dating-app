import 'package:catch_dating_app/contexts/programmes/data/organizer_program_views_repository.dart';
import 'package:catch_dating_app/contexts/programmes/data/program_setup_repository.dart';
import 'package:catch_dating_app/contexts/programmes/domain/organizer_program_views.dart';
import 'package:catch_dating_app/contexts/programmes/domain/program_models.dart';
import 'package:riverpod_annotation/riverpod_annotation.dart';

part 'host_inbox_program_audience_controller.g.dart';

/// Verified program identity and the guest pages loaded for its Inbox scope.
/// An incomplete page set is never presented as the full program audience.
class HostInboxProgramAudiencePageState {
  const HostInboxProgramAudiencePageState({
    required this.program,
    required this.guestContactsById,
    required this.nextCursor,
    this.loadingMore = false,
    this.error,
  });

  final OrganizerProgramSummary program;
  final Map<String, String?> guestContactsById;
  final String? nextCursor;
  final bool loadingMore;
  final Object? error;

  int get guestCount => guestContactsById.length;
  int get unlinkedGuestCount =>
      guestContactsById.values.where((contactId) => contactId == null).length;
  Set<String> get contactIds => guestContactsById.values.nonNulls.toSet();
}

@riverpod
class HostInboxProgramAudiencePages extends _$HostInboxProgramAudiencePages {
  int _generation = 0;

  @override
  Future<HostInboxProgramAudiencePageState> build(
    String organizerId,
    String programId,
  ) async {
    _generation++;
    final repository = ref.watch(programSetupRepositoryProvider);
    // The latest-50 program menu is a navigation convenience, not authority.
    // Read this exact programme's view (rules admit only its setup readers)
    // before requesting or displaying any guest page. Only its identity and
    // title are watched, so a setup-list change does not restart the pages.
    final identity = await ref.watch(
      organizerProgramViewStreamProvider(programId).selectAsync(
        (view) => (
          programId: view['programId'],
          organizerId: view['organizerId'],
          title: view['title'],
          kind: view['kind'],
          status: view['status'],
          revision: view['revision'],
        ),
      ),
    );
    if (identity.programId != programId ||
        identity.organizerId != organizerId) {
      throw StateError('Program is unavailable for this organizer.');
    }
    final program = organizerProgramSummaryFromView({
      'programId': identity.programId,
      'title': identity.title,
      'kind': identity.kind,
      'status': identity.status,
      'revision': identity.revision,
    });
    final page = await repository.listGuests(programId);
    _checkPage(page);
    return HostInboxProgramAudiencePageState(
      program: program,
      guestContactsById: Map.unmodifiable({
        for (final guest in page.guests) guest.guestId: guest.contactId,
      }),
      nextCursor: page.nextCursor,
    );
  }

  void _checkPage(ProgramGuestListPage page) {
    if (page.programId != programId) {
      throw StateError('Guest page belongs to another program.');
    }
  }

  Future<void> loadMore() async {
    final generation = _generation;
    final current = state.asData?.value;
    if (current == null || current.nextCursor == null || current.loadingMore) {
      return;
    }
    state = AsyncData(
      HostInboxProgramAudiencePageState(
        program: current.program,
        guestContactsById: current.guestContactsById,
        nextCursor: current.nextCursor,
        loadingMore: true,
      ),
    );
    try {
      final page = await ref
          .read(programSetupRepositoryProvider)
          .listGuests(programId, cursor: current.nextCursor);
      if (!ref.mounted || generation != _generation) return;
      _checkPage(page);
      if (page.nextCursor == current.nextCursor) {
        throw StateError('Program guest cursor did not advance.');
      }
      state = AsyncData(
        HostInboxProgramAudiencePageState(
          program: current.program,
          guestContactsById: Map.unmodifiable({
            ...current.guestContactsById,
            for (final guest in page.guests) guest.guestId: guest.contactId,
          }),
          nextCursor: page.nextCursor,
        ),
      );
    } on Object catch (error) {
      if (ref.mounted && generation == _generation) {
        state = AsyncData(
          HostInboxProgramAudiencePageState(
            program: current.program,
            guestContactsById: current.guestContactsById,
            nextCursor: current.nextCursor,
            error: error,
          ),
        );
      }
    }
  }
}
