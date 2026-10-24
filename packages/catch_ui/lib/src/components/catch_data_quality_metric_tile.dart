import 'package:catch_tokens/catch_tokens.dart';
import 'package:catch_ui/src/components/catch_metric_data.dart';
import 'package:catch_ui/src/components/catch_metric_data_status.dart';
import 'package:catch_ui/src/foundations/catch_text_styles.dart';
import 'package:catch_ui/src/primitives/catch_gap.dart';
import 'package:catch_ui/src/primitives/catch_surface.dart';
import 'package:flutter/material.dart';

/// Summary surface for a caller-formatted metric and its data-quality status.
class CatchDataQualityMetricTile extends StatelessWidget {
  const CatchDataQualityMetricTile({super.key, required this.data});

  final CatchMetricData data;

  @override
  Widget build(BuildContext context) {
    final t = CatchTokens.of(context);
    final muted = data.status == CatchMetricDataStatus.missing;
    return CatchSurface(
      padding: CatchInsets.content,
      borderRole: CatchBorderRole.boundary,
      backgroundColor: muted
          ? t.warning.withValues(alpha: CatchOpacity.warningFill)
          : t.surface,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Wrap(
            spacing: CatchSpacing.s3,
            runSpacing: CatchSpacing.s2,
            crossAxisAlignment: WrapCrossAlignment.center,
            children: [
              Icon(data.icon, size: CatchIcon.sm, color: t.ink2),
              if (data.status != CatchMetricDataStatus.ready)
                Text(
                  data.status == CatchMetricDataStatus.partial
                      ? data.partialBadgeLabel
                      : data.missingBadgeLabel,
                  style: CatchTextStyles.statusLabel(context, color: t.ink2),
                ),
            ],
          ),
          gapH12,
          Text(
            muted ? '—' : data.value,
            style: CatchTextStyles.metric(
              context,
              color: muted ? t.ink3 : t.ink,
            ),
          ),
          gapH4,
          Text(
            data.label,
            style: CatchTextStyles.supporting(context, color: t.ink2),
          ),
          if (data.caption case final caption?
              when caption.trim().isNotEmpty) ...[
            gapH8,
            Text(
              caption,
              style: CatchTextStyles.supporting(context, color: t.ink3),
            ),
          ],
        ],
      ),
    );
  }
}
