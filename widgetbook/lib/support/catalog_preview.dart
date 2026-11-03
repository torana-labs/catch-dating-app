import 'package:catch_tokens/catch_tokens.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/material.dart';

import '../preview_layout_contracts.dart';

class WidgetbookCatalogStateCard extends StatelessWidget {
  const WidgetbookCatalogStateCard({
    super.key,
    required this.label,
    required this.child,
    this.description,
  });

  final String label;
  final String? description;
  final Widget child;

  @override
  Widget build(BuildContext context) {
    final t = CatchTokens.of(context);
    return CatchLegacySurface(
      padding: const EdgeInsets.all(CatchSpacing.s4),
      borderRole: CatchBorderRole.separator,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          CatchKickerText(label: label, color: t.primary),
          if (description != null) ...[
            gapH6,
            Text(description!, style: CatchTextStyles.supporting(context)),
          ],
          gapH14,
          child,
        ],
      ),
    );
  }
}

class WidgetbookCatalogPhoneFrame extends StatelessWidget {
  const WidgetbookCatalogPhoneFrame({
    super.key,
    required this.child,
    this.height = WidgetbookPreviewLayout.defaultPhonePreviewHeight,
  });

  final Widget child;
  final double height;

  @override
  Widget build(BuildContext context) {
    final t = CatchTokens.of(context);
    return Center(
      child: ClipRRect(
        borderRadius: BorderRadius.circular(
          WidgetbookPreviewLayout.phonePreviewCornerRadius,
        ),
        child: DecoratedBox(
          decoration: BoxDecoration(
            color: t.bg,
            border: Border.all(color: t.line2),
          ),
          child: SizedBox(
            width: WidgetbookPreviewLayout.phoneChromeWidth,
            height: height,
            child: child,
          ),
        ),
      ),
    );
  }
}

Widget widgetbookCatalogTextData(String value) =>
    CatchLegacySurface.card(child: Text(value));

Widget widgetbookCatalogSliverTextData(String value) => SliverToBoxAdapter(
  child: Padding(
    padding: const EdgeInsets.all(CatchSpacing.s4),
    child: CatchLegacySurface.card(child: Text(value)),
  ),
);
