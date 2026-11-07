import 'package:flutter/foundation.dart';

/// [status] is the system's info tone, in indigo; [neutral] is the plain
/// grey tile for a note that is neither help nor a warning.
enum CatchNoticeTone { status, success, warning, danger, event, neutral }

/// The quiet button under the copy of an inline notice: "Offer places".
@immutable
class CatchNoticeAction {
  const CatchNoticeAction({required this.label, this.onPressed});

  final String label;

  /// Null disables the action.
  final VoidCallback? onPressed;
}
