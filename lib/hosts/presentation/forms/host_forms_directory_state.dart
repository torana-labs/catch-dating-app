part of 'host_forms_controller.dart';

@immutable
class HostFormsDirectoryState {
  const HostFormsDirectoryState({
    required this.forms,
    required this.hasMore,
    this.loadingMore = false,
    this.loadMoreError,
  });

  final List<HostFormSummary> forms;

  /// Whether more forms follow the rows listened to.
  final bool hasMore;
  final bool loadingMore;
  final Object? loadMoreError;

  bool get canLoadMore => hasMore && !loadingMore;

  HostFormsDirectoryState copyWith({
    bool? loadingMore,
    Object? loadMoreError,
    bool clearLoadMoreError = false,
  }) => HostFormsDirectoryState(
    forms: forms,
    hasMore: hasMore,
    loadingMore: loadingMore ?? this.loadingMore,
    loadMoreError: clearLoadMoreError
        ? null
        : loadMoreError ?? this.loadMoreError,
  );
}
