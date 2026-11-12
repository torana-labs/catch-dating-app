import 'dart:async';

import 'package:catch_dating_app/contexts/events/domain/event_host_photos.dart';
import 'package:catch_dating_app/hosts/insights/host_event_photos_controller.dart';
import 'package:catch_dating_app/hosts/insights/host_event_photos_section.dart';
import 'package:catch_l10n/l10n.dart';
import 'package:catch_platform/errors/app_error_message.dart';
import 'package:catch_platform/l10n/catch_ui_copy.dart';
import 'package:catch_platform/riverpod_ui/catch_async_value_adapter.dart';
import 'package:catch_platform/riverpod_ui/catch_notice_feedback.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/widgets.dart';
import 'package:flutter_riverpod/experimental/mutation.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

/// The event report's photos for checked-in guests, bound to
/// [hostEventPhotosControllerProvider]: Add photos runs the picker and the
/// uploads, a tap on a photo confirms and removes it.
///
/// A failed load, or a viewer who cannot manage the album, leaves the
/// section out rather than taking the report down with it.
class HostEventReportPhotosSection extends ConsumerWidget {
  const HostEventReportPhotosSection({super.key, required this.eventId});

  final String eventId;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final provider = hostEventPhotosControllerProvider(eventId);
    final photos = catchAsyncStateFromAsyncValue(ref.watch(provider));
    if (photos.isTerminalError) return const SizedBox.shrink();
    final state = photos.value;
    if (state != null && !state.album.canManage) {
      return const SizedBox.shrink();
    }
    final controller = ref.read(provider.notifier);
    final removing = <String>{};
    for (final photo in state?.photos ?? const <EventHostPhoto>[]) {
      final removeMutation = _removeMutation(photo.photoId);
      listenToCatchMutationErrors(
        context,
        ref,
        mutations: [removeMutation],
        errorContext: AppErrorContext.event,
      );
      if (ref.watch(removeMutation).isPending) removing.add(photo.photoId);
    }
    return HostEventPhotosSection(
      state: state,
      removing: removing,
      onAdd: () => unawaited(
        HostEventPhotosController.addPhotosMutation
            .run(ref, (tx) => tx.get(provider.notifier).addPhotos())
            .catchError((Object error) {
              if (context.mounted) {
                showCatchNoticeError(
                  context,
                  error,
                  errorContext: AppErrorContext.event,
                );
              }
            }),
      ),
      onRetry: (photoId) => unawaited(controller.retry(photoId)),
      onDismiss: controller.dismiss,
      onRemove: (photo) => unawaited(_remove(context, ref, photo)),
    );
  }

  Mutation<void> _removeMutation(String photoId) =>
      HostEventPhotosController.removePhotoMutation(
        HostEventPhotosController.removeMutationKey(
          eventId: eventId,
          photoId: photoId,
        ),
      );

  Future<void> _remove(
    BuildContext context,
    WidgetRef ref,
    EventHostPhoto photo,
  ) async {
    final l10n = context.l10n;
    final confirmed = await showCatchConfirmDialog(
      context: context,
      title: l10n.hostEventPhotosRemoveTitle,
      copy: catchDialogCopy(l10n),
      message: l10n.hostEventPhotosRemoveBody,
      confirmLabel: l10n.hostEventPhotosRemoveConfirm,
      cancelLabel: l10n.hostEventPhotosRemoveKeep,
      danger: true,
    );
    if (confirmed != true || !context.mounted) return;
    try {
      await _removeMutation(photo.photoId).run(
        ref,
        (tx) => tx
            .get(hostEventPhotosControllerProvider(eventId).notifier)
            .remove(photo.photoId),
      );
    } on Object {
      // listenToCatchMutationErrors in build shows the failure.
    }
  }
}
