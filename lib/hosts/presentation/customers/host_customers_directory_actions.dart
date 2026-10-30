part of 'host_customers_screen.dart';

// Directory dialogs own navigation results and refresh only their source data.
extension _HostCustomersDirectoryActions on _HostCustomersScreenState {
  Future<void> _reviewDuplicates(String organizerId) async {
    final changed = await showCatchBottomSheet<bool>(
      context: context,
      builder: (_) => HostContactMergeReviewSheet(organizerId: organizerId),
    );
    if (!mounted || changed != true) return;
    ref.invalidate(hostCustomersDirectoryControllerProvider);
    ref.invalidate(hostCrmSummaryProvider(organizerId));
  }

  Future<void> _openAudienceEditor(
    Organizer organizer, {
    HostSavedAudience? audience,
  }) async {
    final saved = await context.pushNamed<HostSavedAudience>(
      audience == null
          ? Routes.hostCreateSavedAudienceScreen.name
          : Routes.hostSavedAudienceDetailScreen.name,
      pathParameters: audience == null
          ? const {}
          : {'audienceId': audience.audienceId},
      queryParameters: {'organizerId': organizer.id},
      extra: audience,
    );
    if (!mounted || saved == null) return;
    ref.invalidate(hostSavedAudiencesProvider(organizer.id));
    ref.invalidate(hostAllSavedAudiencesProvider(organizer.id));
    ref.invalidate(hostAllSavedAudienceSummariesProvider(organizer.id));
    ref.invalidate(hostGroupDirectoryControllerProvider);
  }
}

extension _HostSavedAudienceEditorActions on _HostSavedAudienceEditorFormState {
  void _invalidateAudienceDirectories() {
    ref.invalidate(hostSavedAudiencesProvider(widget.organizerId));
    ref.invalidate(hostAllSavedAudiencesProvider(widget.organizerId));
    ref.invalidate(hostAllSavedAudienceSummariesProvider(widget.organizerId));
    ref.invalidate(hostGroupDirectoryControllerProvider);
  }
}
