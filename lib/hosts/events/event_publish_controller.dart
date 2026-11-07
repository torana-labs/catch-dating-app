import 'package:catch_dating_app/contexts/events/data/private_event_setup_view.dart';
import 'package:catch_dating_app/contexts/events/data/read_models/host_event_setup_view_reads.dart';
import 'package:catch_dating_app/hosts/events/event_publish_state.dart';
import 'package:catch_dating_app/hosts/events/event_workspace_controller.dart';
import 'package:riverpod_annotation/riverpod_annotation.dart';

part 'event_publish_controller.g.dart';

/// The publication screen, read through the event's setup view listener:
/// its name, whether it is published, whether it can be, and its setup
/// revision.
@riverpod
HostEventPublishState hostEventPublishController(
  Ref ref,
  HostEventRequest request,
) {
  final viewValue = ref.watch(
    privateEventSetupViewProvider(
      organizerId: request.organizerId,
      eventId: request.eventId,
    ),
  );
  final view = viewValue.value;
  if (view == null) {
    return switch (viewValue) {
      AsyncValue(:final error?) => HostEventPublishState(
        status: HostEventPublishStatus.error,
        error: error,
      ),
      _ => const HostEventPublishState.loading(),
    };
  }
  if (view.sourceCoverage == PrivateEventSetupCoverage.missing ||
      view.summary == null) {
    return const HostEventPublishState(status: HostEventPublishStatus.missing);
  }
  final summary = view.summary!;
  return HostEventPublishState(
    status: HostEventPublishStatus.ready,
    eventTitle: summary.name,
    published: summary.publicationState == 'published',
    canPublish: summary.publicationReadiness?.canPublish ?? false,
    setupRevision: view.setupRevision ?? summary.setupRevision,
  );
}
