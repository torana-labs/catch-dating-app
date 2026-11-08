part of 'host_forms_controller.dart';

@immutable
class HostFormsDirectoryState {
  const HostFormsDirectoryState({
    required this.forms,
    required this.nextCursor,
    this.loadingMore = false,
    this.loadMoreError,
  });

  final List<HostFormSummary> forms;
  final String? nextCursor;
  final bool loadingMore;
  final Object? loadMoreError;

  bool get canLoadMore => nextCursor != null && !loadingMore;

  HostFormsDirectoryState copyWith({
    List<HostFormSummary>? forms,
    String? nextCursor,
    bool? loadingMore,
    Object? loadMoreError,
    bool clearLoadMoreError = false,
  }) => HostFormsDirectoryState(
    forms: forms ?? this.forms,
    nextCursor: nextCursor ?? this.nextCursor,
    loadingMore: loadingMore ?? this.loadingMore,
    loadMoreError: clearLoadMoreError
        ? null
        : loadMoreError ?? this.loadMoreError,
  );
}
