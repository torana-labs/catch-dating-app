import 'package:catch_ui/src/components/catch_step_list.dart';

/// One step in a [CatchStepList] sequence.
class CatchStepRowData {
  const CatchStepRowData({
    required this.title,
    this.body,
    this.marker,
    this.tag,
  });

  final String title;
  final String? body;

  /// Replaces the step's automatic number, such as a time of day.
  final String? marker;

  /// A short coloured note under the body, such as what the step includes.
  final String? tag;
}
