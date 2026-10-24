import 'package:catch_tokens/catch_tokens.dart';
import 'package:catch_ui/src/foundations/catch_text_styles.dart';
import 'package:catch_ui/src/primitives/catch_gap.dart';
import 'package:flutter/material.dart';

/// Brand attribution and context for exported media.
class CatchAttributionRow extends StatelessWidget {
  const CatchAttributionRow({
    super.key,
    required this.brandLabel,
    required this.trailing,
    this.trailingColor,
  });

  /// Already-localized brand label supplied by the share-card owner.
  final String brandLabel;
  final String trailing;
  final Color? trailingColor;

  @override
  Widget build(BuildContext context) {
    final t = CatchTokens.of(context);
    return Row(
      children: [
        Text(brandLabel, style: CatchTextStyles.kicker(context, color: t.ink)),
        gapW12,
        Expanded(
          child: Text(
            trailing,
            maxLines: 1,
            overflow: TextOverflow.ellipsis,
            textAlign: TextAlign.end,
            style: CatchTextStyles.statusLabel(
              context,
              color: trailingColor ?? t.ink2,
            ),
          ),
        ),
      ],
    );
  }
}
