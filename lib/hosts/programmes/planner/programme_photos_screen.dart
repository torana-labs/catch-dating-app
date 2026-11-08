import 'dart:async';
import 'dart:math';

import 'package:catch_dating_app/contexts/programmes/data/program_asset_upload.dart';
import 'package:catch_dating_app/contexts/programmes/data/program_work_repository.dart';
import 'package:catch_dating_app/hosts/programmes/planner/programme_photos_body.dart';
import 'package:catch_dating_app/hosts/programmes/planner/programme_state.dart';
import 'package:catch_l10n/l10n.dart';
import 'package:catch_platform/cache/app_clock.dart';
import 'package:catch_platform/riverpod_ui/catch_notice_feedback.dart';
import 'package:catch_tokens/catch_tokens.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/widgets.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

final _random = Random.secure();

/// Photos (RbProgPhotos), from `listProgramPhotos`. A tile opens its
/// function's album; Add uploads a photo from this phone through a signed
/// policy (`createProgramAssetUpload`) and files it with
/// `upsertProgramPhoto`.
class HostProgrammePhotosScreen extends ConsumerStatefulWidget {
  const HostProgrammePhotosScreen({super.key, required this.programId});

  final String programId;

  @override
  ConsumerState<HostProgrammePhotosScreen> createState() =>
      _HostProgrammePhotosScreenState();
}

class _HostProgrammePhotosScreenState
    extends ConsumerState<HostProgrammePhotosScreen> {
  String? _functionId;
  bool _uploading = false;

  Future<void> _add() async {
    final l10n = context.l10n;
    final functionId = _functionId;
    setState(() => _uploading = true);
    var ok = true;
    try {
      final asset = await ref
          .read(programAssetUploaderProvider)
          .pickAndUpload(
            programId: widget.programId,
            kind: ProgramAssetKind.photo,
          );
      if (asset != null) {
        await ref
            .read(programWorkRepositoryProvider)
            .upsertPhoto(
              programId: widget.programId,
              photoId: asset.assetId,
              functionId: functionId,
              expectedRevision: 0,
              requestId:
                  'photo-${DateTime.now().microsecondsSinceEpoch}-'
                  '${_random.nextInt(1 << 30)}',
            );
      }
    } on Object {
      ok = false;
    }
    ref.invalidate(programPhotosViewProvider(widget.programId, functionId));
    if (!mounted) return;
    setState(() => _uploading = false);
    if (!ok) {
      showCatchNotice(
        context,
        l10n.hostProgrammePhotosFailed,
        tone: CatchNoticeTone.danger,
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    final l10n = context.l10n;
    final read = ref.watch(
      programPhotosViewProvider(widget.programId, _functionId),
    );
    final photos = read.value?.value;
    return CatchRoot(
      format: CatchFormat.nightsOut,
      child: CatchScreen(
        key: const ValueKey<String>('host-programme-photos-screen'),
        topBar: CatchTopBar(
          variant: CatchTopBarVariant.tool,
          back: CatchTopBarBack(label: l10n.hostProgrammeBackToProgramme),
          title: l10n.hostProgrammePhotosTitle,
        ),
        body: HostProgrammePhotosBody(
          status: read.hasError
              ? HostProgrammeStatus.error
              : photos == null
              ? HostProgrammeStatus.loading
              : HostProgrammeStatus.ready,
          photos: photos,
          now: ref.watch(appClockProvider).now(),
          uploading: _uploading,
          onAlbum: (functionId) => setState(
            () => _functionId = _functionId == functionId ? null : functionId,
          ),
          onAdd: () => unawaited(_add()),
          onRetry: () => ref.invalidate(
            programPhotosViewProvider(widget.programId, _functionId),
          ),
        ),
      ),
    );
  }
}
