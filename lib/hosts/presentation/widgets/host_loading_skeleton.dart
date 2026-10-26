import 'package:catch_tokens/catch_tokens.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/material.dart';

export 'host_analytics_report_loading_indicator.dart';

/// A leaf placeholder used where only an inline icon is unresolved.
class HostInlineIconSkeleton extends StatelessWidget {
  const HostInlineIconSkeleton({super.key, this.size = CatchIconSize.md});

  final double size;

  @override
  Widget build(BuildContext context) {
    return CatchSkeleton.box(width: size, height: size, radius: CatchRadius.sm);
  }
}
