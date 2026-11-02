import 'dart:async';

import 'package:catch_dating_app/contexts/profiles/domain/form_profile.dart';
import 'package:catch_dating_app/contexts/profiles/domain/form_profile_photo_preview.dart';
import 'package:catch_dating_app/l10n/l10n.dart';
import 'package:catch_dating_app/platform/errors/app_error_message.dart';
import 'package:catch_dating_app/platform/l10n/catch_ui_copy.dart';
import 'package:catch_dating_app/platform/riverpod_ui/catch_async_boundary.dart';
import 'package:catch_dating_app/user_profile/presentation/form_profiles_controller.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

class FormProfilePhotoField extends ConsumerWidget {
  const FormProfilePhotoField({
    super.key,
    required this.responseId,
    required this.field,
    required this.selected,
    required this.busy,
    required this.onChanged,
  });
  final String responseId;
  final FormProfileField field;
  final bool selected;
  final bool busy;
  final ValueChanged<bool> onChanged;
  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final assetId = (field.value! as List<String>).single;
    final provider = formProfilePhotoPreviewProvider(
      responseId,
      field.questionId,
      assetId,
    );
    return CatchAsyncBoundary<FormProfilePhotoPreview>(
      value: ref.watch(provider),
      retainDataOn: const {},
      errorContext: AppErrorContext.profile,
      onRetry: () => ref.invalidate(provider),
      builder: (context, photo) => FormProfilePhotoSelectionField(
        key: ObjectKey(photo),
        photo: photo,
        label: field.label,
        selected: selected,
        onChanged: busy ? null : onChanged,
        onRetry: () => ref.invalidate(provider),
      ),
    );
  }
}

/// Keep the private image in memory only and evict its decoder entry on leave.
/// The selection remains disabled until the actual image has rendered.
class FormProfilePhotoSelectionField extends StatefulWidget {
  const FormProfilePhotoSelectionField({
    super.key,
    required this.photo,
    required this.label,
    required this.selected,
    required this.onChanged,
    required this.onRetry,
  });
  final FormProfilePhotoPreview photo;
  final String label;
  final bool selected;
  final ValueChanged<bool>? onChanged;
  final VoidCallback onRetry;
  @override
  State<FormProfilePhotoSelectionField> createState() =>
      _FormProfilePhotoSelectionFieldState();
}

class _FormProfilePhotoSelectionFieldState
    extends State<FormProfilePhotoSelectionField> {
  late MemoryImage _image;
  bool _decoded = false;
  bool _failed = false;
  bool _framePending = false;
  @override
  void initState() {
    super.initState();
    _image = MemoryImage(widget.photo.bytes);
  }

  @override
  void didUpdateWidget(FormProfilePhotoSelectionField oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (!identical(oldWidget.photo, widget.photo)) {
      unawaited(_image.evict());
      _image = MemoryImage(widget.photo.bytes);
      _decoded = false;
      _failed = false;
      _framePending = false;
    }
  }

  @override
  void dispose() {
    unawaited(_image.evict());
    super.dispose();
  }

  void _resolved(bool success) {
    if (_framePending || _decoded || _failed) return;
    _framePending = true;
    final current = _image;
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (!mounted || !identical(current, _image)) return;
      setState(() {
        _decoded = success;
        _failed = !success;
        _framePending = false;
      });
    });
  }

  @override
  Widget build(BuildContext context) => Column(
    crossAxisAlignment: CrossAxisAlignment.stretch,
    children: [
      AspectRatio(
        aspectRatio: 4 / 5,
        // ignore: catch_ui_lints/catch_no_raw_surface_shell -- D18 drawing debt until this moves onto a library component (CAT-227)
        child: Image(
          image: _image,
          fit: BoxFit.contain,
          semanticLabel: widget.label,
          frameBuilder: (_, child, frame, synchronous) {
            if (frame != null || synchronous) _resolved(true);
            return child;
          },
          errorBuilder: (_, _, _) {
            _resolved(false);
            return const CatchImageFallbackSurface();
          },
        ),
      ),
      if (_failed)
        CatchButton(
          label: context.l10n.formProfilePhotoRetry,
          onPressed: widget.onRetry,
          variant: CatchButtonVariant.secondary,
        ),
      CatchFieldLanes.single(
        child: CatchField.toggle(
          copy: catchFieldCopy(context.l10n),
          title: widget.label,
          helperText: context.l10n.formProfileUsePhoto,
          titleMaxLines: 3,
          contractExemption:
              'Photo selection uses the exact source question after owned preview; claim revalidates and safety-checks the original bytes.',
          value: widget.selected,
          onChanged: _decoded ? widget.onChanged : null,
        ),
      ),
    ],
  );
}
