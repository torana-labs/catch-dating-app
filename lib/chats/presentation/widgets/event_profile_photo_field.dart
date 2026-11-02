import 'dart:async';
import 'package:catch_dating_app/chats/presentation/widgets/event_profile_answer_field.dart';
import 'package:catch_dating_app/l10n/l10n.dart';
import 'package:catch_tokens/catch_tokens.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/material.dart';

/// An owned photo choice that stays disabled until its current preview decodes.
class EventProfilePhotoField extends StatefulWidget {
  const EventProfilePhotoField({
    super.key,
    required this.image,
    required this.label,
    required this.selected,
    required this.onChanged,
  });
  final ImageProvider image;
  final String label;
  final bool selected;
  final ValueChanged<bool>? onChanged;
  @override
  State<EventProfilePhotoField> createState() => _EventProfilePhotoFieldState();
}

class _EventProfilePhotoFieldState extends State<EventProfilePhotoField> {
  bool _ready = false, _failed = false;
  void _resolved(bool success) {
    if (!mounted || (_ready == success && _failed == !success)) return;
    final image = widget.image;
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (mounted && image == widget.image) {
        setState(() {
          _ready = success;
          _failed = !success;
        });
      }
    });
  }

  @override
  void didUpdateWidget(EventProfilePhotoField oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (oldWidget.image != widget.image) {
      unawaited(oldWidget.image.evict());
      _ready = false;
      _failed = false;
    }
  }

  @override
  void dispose() {
    unawaited(widget.image.evict());
    super.dispose();
  }

  @override
  Widget build(BuildContext context) => Row(
    children: [
      SizedBox.square(
        dimension: CatchLayout.avatarIdentityExtent,
        // ignore: catch_ui_lints/catch_no_raw_surface_shell -- D18 drawing debt until this moves onto a library component (CAT-227)
        child: Image(
          image: widget.image,
          fit: BoxFit.contain,
          semanticLabel: widget.label,
          frameBuilder: (_, child, frame, sync) {
            if (frame != null || sync) _resolved(true);
            return child;
          },
          errorBuilder: (_, _, _) {
            _resolved(false);
            return const CatchImageFallbackSurface();
          },
        ),
      ),
      gapW16,
      Expanded(
        child: EventProfileAnswerField.share(
          label: widget.label,
          answer: _failed
              ? context.l10n.eventProfilePhotoUnavailable
              : context.l10n.eventProfileChoosePhoto,
          selected: widget.selected,
          onChanged: _ready ? widget.onChanged : null,
        ),
      ),
    ],
  );
}
