import 'package:catch_dating_app/contexts/audience/data/host_roster_file_parser.dart';
import 'package:catch_dating_app/contexts/audience/data/host_roster_file_service.dart';
import 'package:catch_dating_app/contexts/audience/domain/host_roster_import.dart';
import 'package:catch_dating_app/contexts/forms/data/host_application_repository.dart';
import 'package:catch_dating_app/contexts/forms/domain/host_application_import.dart';
import 'package:flutter/foundation.dart';
import 'package:riverpod_annotation/riverpod_annotation.dart';

part 'host_applications_controller.g.dart';

@immutable
class HostApplicationsDirectoryState {
  const HostApplicationsDirectoryState({
    required this.applications,
    required this.nextCursor,
    this.loadingMore = false,
    this.loadMoreError,
  });

  final List<HostApplicationSummary> applications;
  final String? nextCursor;
  final bool loadingMore;
  final Object? loadMoreError;

  bool get canLoadMore => nextCursor != null && !loadingMore;

  HostApplicationsDirectoryState copyWith({
    List<HostApplicationSummary>? applications,
    String? nextCursor,
    bool clearNextCursor = false,
    bool? loadingMore,
    Object? loadMoreError,
    bool clearLoadMoreError = false,
  }) => HostApplicationsDirectoryState(
    applications: applications ?? this.applications,
    nextCursor: clearNextCursor ? null : nextCursor ?? this.nextCursor,
    loadingMore: loadingMore ?? this.loadingMore,
    loadMoreError: clearLoadMoreError
        ? null
        : loadMoreError ?? this.loadMoreError,
  );
}

@riverpod
class HostApplicationsDirectoryController
    extends _$HostApplicationsDirectoryController {
  @override
  Future<HostApplicationsDirectoryState> build(
    HostApplicationListRequest request,
  ) async {
    final page = await ref
        .read(hostApplicationRepositoryProvider)
        .listApplications(request);
    return HostApplicationsDirectoryState(
      applications: page.applications,
      nextCursor: page.nextCursor,
    );
  }

  Future<void> loadMore() async {
    final current = state.asData?.value;
    if (current == null || !current.canLoadMore) return;
    state = AsyncData(
      current.copyWith(loadingMore: true, clearLoadMoreError: true),
    );
    try {
      final page = await ref
          .read(hostApplicationRepositoryProvider)
          .listApplications(request.copyWith(cursor: current.nextCursor));
      final byId = <String, HostApplicationSummary>{
        for (final application in current.applications)
          application.applicationId: application,
        for (final application in page.applications)
          application.applicationId: application,
      };
      state = AsyncData(
        HostApplicationsDirectoryState(
          applications: List.unmodifiable(byId.values),
          nextCursor: page.nextCursor,
        ),
      );
    } on Object catch (error) {
      state = AsyncData(
        current.copyWith(loadingMore: false, loadMoreError: error),
      );
    }
  }
}

@riverpod
HostApplicationsController hostApplicationsController(Ref ref) =>
    HostApplicationsController(
      ref.watch(hostApplicationRepositoryProvider),
      ref.watch(hostRosterFileServiceProvider),
    );

class HostApplicationsController {
  const HostApplicationsController(this._repository, this._fileService);

  final HostApplicationRepository _repository;
  final HostRosterFileService _fileService;

  Future<HostRosterTable?> pickImportFile() async {
    final file = await _fileService.pickRosterFile();
    if (file == null) return null;
    return parseHostRosterFile(fileName: file.name, bytes: file.bytes);
  }

  Future<HostApplicationImportResult> importDraft({
    required String organizerId,
    required HostApplicationImportDraft draft,
    required String consentCopy,
    required String consentVersion,
    required String retentionCopy,
  }) async {
    final form = await _repository.publishImportedForm(
      organizerId: organizerId,
      draft: draft,
      consentCopy: consentCopy,
      consentVersion: consentVersion,
      retentionCopy: retentionCopy,
    );
    final preview = await _repository.previewImport(
      organizerId: organizerId,
      formVersionId: form.formVersionId,
      draft: draft,
    );
    if (preview.validRowCount == 0) {
      throw const HostApplicationImportException(
        HostApplicationImportIssue.noRows,
      );
    }
    return _repository.importApplications(
      organizerId: organizerId,
      form: form,
      draft: draft,
    );
  }

  Future<HostApplicationReviewResult> reviewApplication({
    required String organizerId,
    required String applicationId,
    required int expectedRevision,
    required HostApplicationReviewStatus reviewStatus,
    String? reviewNote,
  }) => _repository.reviewApplication(
    organizerId: organizerId,
    applicationId: applicationId,
    expectedRevision: expectedRevision,
    reviewStatus: reviewStatus,
    reviewNote: reviewNote,
  );
}
