import 'package:catch_dating_app/contexts/audience/data/crm/host_saved_audience_repository.dart';
import 'package:catch_dating_app/contexts/audience/domain/crm/host_saved_audience.dart';
import 'package:riverpod_annotation/riverpod_annotation.dart';

part 'host_saved_audience_members_controller.g.dart';

class HostSavedAudienceMembersState {
  const HostSavedAudienceMembersState({
    required this.preview,
    required this.members,
    this.loadingMore = false,
    this.loadMoreError,
  });

  final HostSavedAudiencePreview preview;
  final List<HostSavedAudiencePreviewContact> members;
  final bool loadingMore;
  final Object? loadMoreError;
}

@riverpod
class HostSavedAudienceMembersController
    extends _$HostSavedAudienceMembersController {
  int _generation = 0;
  bool _hasBuilt = false;

  @override
  Future<HostSavedAudienceMembersState> build(
    HostSavedAudience audience,
  ) async {
    final generation = ++_generation;
    final operationRef = ref;
    final reload = _hasBuilt;
    _hasBuilt = true;
    final repository = ref.read(hostSavedAudienceRepositoryProvider);
    final authoritative = reload
        ? await repository.reloadSavedAudience(
            organizerId: audience.organizerId,
            audienceId: audience.audienceId,
            isCurrent: () => operationRef.mounted && generation == _generation,
          )
        : audience;
    if (!operationRef.mounted || generation != _generation) {
      throw StateError('Saved group refresh was superseded.');
    }
    final preview = await repository.previewSavedAudience(
      organizerId: authoritative.organizerId,
      audience: authoritative,
      sampleLimit: 25,
    );
    return HostSavedAudienceMembersState(
      preview: preview,
      members: preview.sample,
    );
  }

  Future<void> loadMore() async {
    // A refresh can retain old AsyncData. It does not own a usable cursor.
    if (state.isLoading || state.hasError) return;
    final current = state.asData?.value;
    if (current == null ||
        current.loadingMore ||
        current.preview.nextCursor == null) {
      return;
    }
    final generation = _generation;
    final operationRef = ref;
    state = AsyncData(
      HostSavedAudienceMembersState(
        preview: current.preview,
        members: current.members,
        loadingMore: true,
      ),
    );
    try {
      final page = await ref
          .read(hostSavedAudienceRepositoryProvider)
          .previewSavedAudience(
            organizerId: audience.organizerId,
            audience: current.preview.audience,
            sampleLimit: 25,
            cursor: current.preview.nextCursor,
          );
      if (!operationRef.mounted || generation != _generation) return;
      state = AsyncData(
        HostSavedAudienceMembersState(
          preview: page,
          members: [...current.members, ...page.sample],
        ),
      );
    } on Object catch (error) {
      if (!operationRef.mounted || generation != _generation) return;
      state = AsyncData(
        HostSavedAudienceMembersState(
          preview: current.preview,
          members: current.members,
          loadMoreError: error,
        ),
      );
    }
  }
}
