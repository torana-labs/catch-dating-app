import 'package:catch_ui/src/components/catch_badge.dart';
import 'package:flutter/foundation.dart';

/// What a [CatchTableCell] draws: plain [text], a two-line [title], [number]
/// figures or a [badge].
enum CatchTableCellVariant { text, title, number, badge }

/// The colour of a text cell: [secondary] for quiet values, the status tones
/// for a value that needs a look ("2 missing").
enum CatchTableCellTone { secondary, success, warning, danger }

/// One data cell of a [CatchTableRow.cells] row, as the system Table cell.
@immutable
class CatchTableCell {
  /// A string, optionally in a [tone].
  const CatchTableCell.text(String this._text, {this.tone})
    : variant = CatchTableCellVariant.text,
      value = null,
      subtitle = null,
      badge = null;

  /// A title with an optional muted [subtitle] under it: a guest and their
  /// household.
  const CatchTableCell.title(String this._text, {this.subtitle})
    : variant = CatchTableCellVariant.title,
      value = null,
      tone = null,
      badge = null;

  /// Tabular figures; [text] is the caller-formatted [value] ("1,284"), or
  /// the value as written when it is null.
  const CatchTableCell.number(num this.value, {String? text})
    : // The public argument stays `text`; the field is private.
      // ignore: prefer_initializing_formals
      _text = text,
      variant = CatchTableCellVariant.number,
      tone = null,
      subtitle = null,
      badge = null;

  /// A status badge.
  const CatchTableCell.badge(CatchBadge this.badge)
    : variant = CatchTableCellVariant.badge,
      _text = null,
      value = null,
      tone = null,
      subtitle = null;

  final CatchTableCellVariant variant;
  final String? _text;

  /// The figure of a [CatchTableCellVariant.number] cell.
  final num? value;
  final CatchTableCellTone? tone;
  final String? subtitle;
  final CatchBadge? badge;

  /// What the cell reads: its text, or the number as written.
  String get text => _text ?? (value == null ? '' : '$value');
}
