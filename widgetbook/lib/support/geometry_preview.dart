import 'package:catch_tokens/catch_tokens.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/material.dart';

Widget widgetbookGeometrySectionHeaderComparison(
  BuildContext context, {
  required double width,
  required String label,
  required String description,
  required Widget child,
}) {
  final t = CatchTokens.of(context);

  return SizedBox(
    width: width,
    child: Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        CatchText(label, variant: CatchTextVariant.titleS, color: t.ink),
        const SizedBox(height: CatchSpacing.s1),
        Text(
          description,
          style: CatchTextStyles.supporting(context, color: t.ink2),
        ),
        const SizedBox(height: CatchSpacing.s3),
        child,
      ],
    ),
  );
}

Widget widgetbookGeometryPage(
  BuildContext context, {
  Key? fitContentKey,
  required String title,
  required List<String> contractIds,
  required List<String> principles,
  required List<Widget> children,
}) {
  final t = CatchTokens.of(context);
  final content = Center(
    child: ConstrainedBox(
      constraints: const BoxConstraints(maxWidth: _reviewWidth),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Text(title, style: CatchTextStyles.headline(context)),
          const SizedBox(height: CatchSpacing.s2),
          Text(
            contractIds.join(' · '),
            style: CatchTextStyles.supporting(context, color: t.ink2),
          ),
          const SizedBox(height: CatchSpacing.s4),
          Text(
            'Comparative geometry only. Use each component’s Contract states page for the exhaustive API and state inventory.',
            style: CatchTextStyles.supporting(context, color: t.ink2),
          ),
          const SizedBox(height: CatchSpacing.s4),
          for (final principle in principles) ...[
            Text('— $principle', style: CatchTextStyles.supporting(context)),
            const SizedBox(height: CatchSpacing.s1),
          ],
          const SizedBox(height: CatchSpacing.s6),
          for (final indexed in children.indexed) ...[
            if (indexed.$1 > 0) const SizedBox(height: CatchSpacing.s5),
            indexed.$2,
          ],
        ],
      ),
    ),
  );

  return ColoredBox(
    color: t.bg,
    child: SafeArea(
      child: SingleChildScrollView(
        padding: fitContentKey == null
            ? const EdgeInsets.all(CatchSpacing.s6)
            : const EdgeInsets.fromLTRB(
                CatchSpacing.s6,
                CatchSpacing.s6,
                CatchSpacing.s6,
                0,
              ),
        child: fitContentKey == null
            ? content
            : Padding(
                key: fitContentKey,
                padding: const EdgeInsets.only(bottom: CatchSpacing.s6),
                child: content,
              ),
      ),
    ),
  );
}

Widget widgetbookGeometrySpecimen(
  BuildContext context, {
  required String label,
  required Widget child,
  String? description,
}) {
  final t = CatchTokens.of(context);

  return DecoratedBox(
    decoration: BoxDecoration(
      color: t.surface,
      border: Border.all(color: t.line),
      borderRadius: BorderRadius.circular(CatchRadius.lg),
    ),
    child: Padding(
      padding: CatchInsets.content,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(label, style: CatchTextStyles.titleL(context)),
          if (description != null) ...[
            const SizedBox(height: CatchSpacing.s1),
            Text(
              description,
              style: CatchTextStyles.supporting(context, color: t.ink2),
            ),
          ],
          const SizedBox(height: CatchSpacing.s4),
          child,
        ],
      ),
    ),
  );
}

const _reviewWidth = 960.0;

const widgetbookGeometryComponentWidth = 420.0;

const widgetbookGeometryPhoneWidth = 390.0;

void widgetbookGeometryIgnoreBool(bool _) {}

String widgetbookGeometryIdentityString(String value) => value;
