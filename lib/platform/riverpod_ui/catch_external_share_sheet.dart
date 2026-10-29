import 'dart:async';
import 'dart:typed_data';
import 'dart:ui' as ui;

import 'package:catch_dating_app/l10n/l10n.dart';
import 'package:catch_dating_app/platform/device/external_share.dart';
import 'package:catch_dating_app/platform/errors/app_exception.dart';
import 'package:catch_dating_app/platform/riverpod_ui/catch_notice_feedback.dart';
import 'package:catch_tokens/catch_tokens.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/material.dart';
import 'package:flutter/rendering.dart';

/// UI adapter for the app's Riverpod-backed external share controller.
///
/// Owns PNG capture, platform sharing, attribution and localized errors.
class CatchExternalShareSheet extends StatefulWidget {
  const CatchExternalShareSheet({
    super.key,
    required this.media,
    required this.share,
    required this.fileName,
    required this.buttonLabel,
    required this.footnote,
    this.subject,
    this.text,
    this.onShareIntent,
    this.maxWidth = CatchLayout.richShareCardWidth,
    this.pixelRatio = CatchLayout.richShareCardPixelRatio,
  });

  final Widget media;
  final ExternalShareController share;
  final String fileName;
  final String buttonLabel;
  final String footnote;
  final String? subject;
  final String? text;
  final Future<void> Function()? onShareIntent;
  final double maxWidth;
  final double pixelRatio;

  @override
  State<CatchExternalShareSheet> createState() =>
      _CatchExternalShareSheetState();
}

class _CatchExternalShareSheetState extends State<CatchExternalShareSheet> {
  final _captureKey = GlobalKey();
  bool _sharing = false;

  Future<void> _share(BuildContext buttonContext) async {
    if (_sharing) return;
    setState(() => _sharing = true);
    final shareFailureMessage =
        buttonContext.l10n.coreCatchShareCardSheetVisiblecopyUnableToShareThis;

    try {
      final box = buttonContext.findRenderObject() as RenderBox?;
      final origin = box == null
          ? null
          : box.localToGlobal(Offset.zero) & box.size;
      if (!mounted) return;

      final bytes = await _captureCardPng(
        key: _captureKey,
        pixelRatio: widget.pixelRatio,
      );
      if (widget.onShareIntent case final onShareIntent?) {
        unawaited(_recordShareIntent(onShareIntent));
      }
      await widget.share.sharePngFile(
        pngBytes: bytes,
        fileName: widget.fileName,
        subject: widget.subject,
        text: widget.text,
        origin: origin,
      );
    } catch (error) {
      if (!mounted) return;
      showCatchNoticeError(
        context,
        ExternalActionException(shareFailureMessage, cause: error),
      );
    } finally {
      if (mounted) setState(() => _sharing = false);
    }
  }

  Future<void> _recordShareIntent(Future<void> Function() callback) async {
    try {
      await callback();
    } on Object {
      // Attribution telemetry must never delay or prevent platform sharing.
    }
  }

  @override
  Widget build(BuildContext context) => CatchShareCardSheet(
    media: widget.media,
    captureKey: _captureKey,
    buttonLabel: widget.buttonLabel,
    footnote: widget.footnote,
    onShare: (buttonContext) => unawaited(_share(buttonContext)),
    isSharing: _sharing,
    maxWidth: widget.maxWidth,
  );
}

Future<Uint8List> _captureCardPng({
  required GlobalKey key,
  required double pixelRatio,
}) async {
  final boundary =
      key.currentContext?.findRenderObject() as RenderRepaintBoundary?;
  final image = await boundary?.toImage(pixelRatio: pixelRatio);
  final byteData = await image?.toByteData(format: ui.ImageByteFormat.png);
  image?.dispose();
  final bytes = byteData?.buffer.asUint8List();
  if (bytes == null) {
    throw StateError('Share card did not render.');
  }
  return bytes;
}
