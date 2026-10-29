import 'package:catch_dating_app/event_success/presentation/reveal/event_success_countdown_text.dart';
import 'package:catch_dating_app/event_success/presentation/reveal/event_success_reveal_header.dart';
import 'package:catch_dating_app/platform/responsive/component_breakpoints.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/material.dart';

class EventSuccessHostRevealViewport extends StatelessWidget {
  const EventSuccessHostRevealViewport({
    super.key,
    required this.number,
    required this.copy,
  });

  final EventSuccessCountdownText number;
  final EventSuccessRevealHeader copy;

  @override
  Widget build(BuildContext context) {
    return CatchViewport.atWidth(
      breakpoint: ComponentBreakpoints.eventSuccessRevealHostCompactBreakpoint,
      compactBuilder: (context) => Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [number, gapH14, copy],
      ),
      expandedBuilder: (context) => Row(
        children: [
          number,
          gapW16,
          Expanded(child: copy),
        ],
      ),
    );
  }
}
