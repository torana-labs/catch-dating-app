import 'package:catch_tokens/catch_tokens.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/material.dart';
import 'package:widgetbook_annotation/widgetbook_annotation.dart' as widgetbook;

import '../../preview_layout_contracts.dart';
import '../../support/contract_preview.dart';
import 'metrics.dart';
import 'preview.dart';

@widgetbook.UseCase(
  name: 'Typography roles',
  type: FoundationTypographyTokens,
  path: '[Foundation tokens]/Core',
)
Widget foundationTypographyRoles(BuildContext context) {
  return const FoundationTypographyTokens();
}

class FoundationTypographyTokens extends StatelessWidget {
  const FoundationTypographyTokens({super.key});

  @override
  Widget build(BuildContext context) {
    return WidgetbookContractFrame.foundation(
      title: 'Typography roles',
      contractId: 'foundation.typography',
      states: const [
        'semantic text roles',
        'Archivo brand/display',
        'platform body/UI',
        'mono data',
      ],
      children: [
        WidgetbookFoundationSpecSection(
          title: 'Archivo brand/display',
          child: _TypeStack(
            rows: [
              _TypeSpec(
                'displayXxl · 72',
                'Host it',
                CatchTextStyles.displayXxl(context),
              ),
              _TypeSpec(
                'displayXl · 60',
                'Tonight',
                CatchTextStyles.displayXl(context),
              ),
              _TypeSpec(
                'displayL · 48',
                'Host the room',
                CatchTextStyles.displayL(context),
              ),
              _TypeSpec(
                'displayM · 38',
                'Sundowner 5K',
                CatchTextStyles.displayM(context),
              ),
              _TypeSpec(
                'displayS · 30',
                'Fort Greene Run Club',
                CatchTextStyles.displayS(context),
              ),
              _TypeSpec(
                'displayXs · 24',
                'Build a better guest list',
                CatchTextStyles.displayXs(context),
              ),
            ],
          ),
        ),
        WidgetbookFoundationSpecSection(
          title: 'Platform app/body',
          child: _TypeStack(
            rows: [
              _TypeSpec(
                'headline',
                'Tonight around Bandra',
                CatchTextStyles.headline(context),
              ),
              _TypeSpec(
                'titleL',
                'Professional profile',
                CatchTextStyles.titleL(context),
              ),

              _TypeSpec(
                'bodyM',
                'Smaller long-form copy for cards, sheets, and explanations.',
                CatchTextStyles.bodyM(context),
              ),

              _TypeSpec(
                'sectionTitle',
                'Profile',
                CatchTextStyles.sectionTitle(context),
              ),
              _TypeSpec(
                'bodyLead',
                'Review requests before spots are confirmed.',
                CatchTextStyles.bodyLead(context),
              ),
              _TypeSpec(
                'bodyL',
                'Public event details should read clearly.',
                CatchTextStyles.bodyL(context),
              ),
              _TypeSpec(
                'bodyS',
                'Saturday - 8:30 PM',
                CatchTextStyles.bodyS(context),
              ),
              _TypeSpec(
                'supporting',
                'Shown below field and row labels.',
                CatchTextStyles.supporting(context),
              ),
              _TypeSpec('titleS', 'CONTINUE', CatchTextStyles.titleS(context)),
              _TypeSpec(
                'fieldLabel',
                'INVITE CODE',
                CatchTextStyles.fieldLabel(context),
              ),
              _TypeSpec(
                'statusLabel',
                'OPEN',
                CatchTextStyles.statusLabel(context),
              ),
              _TypeSpec(
                'buttonSm',
                'Cancel',
                CatchTextStyles.buttonSm(context),
              ),
              _TypeSpec(
                'buttonMd',
                'Save profile',
                CatchTextStyles.buttonMd(context),
              ),
              _TypeSpec(
                'buttonLg',
                'Create event',
                CatchTextStyles.buttonLg(context),
              ),
              _TypeSpec(
                'avatarCount(12)',
                '+4',
                CatchTextStyles.avatarCount(context, size: 12),
              ),
              _TypeSpec(
                'statCompact',
                '24',
                CatchTextStyles.statCompact(context),
              ),
              _TypeSpec(
                'clubMemberSeal',
                '128',
                CatchTextStyles.clubMemberSeal(context),
              ),
            ],
          ),
        ),
        WidgetbookFoundationSpecSection(
          title: 'Mono data',
          child: _TypeStack(
            rows: [
              _TypeSpec('kicker', 'HOST MODE', CatchTextStyles.kicker(context)),
              _TypeSpec(
                'kickerLg',
                "TONIGHT'S PICK",
                CatchTextStyles.kickerLg(context),
              ),
              _TypeSpec(
                'monoLabel',
                '6 going - 2.4 km away',
                CatchTextStyles.monoLabel(context),
              ),
              _TypeSpec(
                'monoCapsLabel',
                '8:30 PM - 24 SPOTS',
                CatchTextStyles.monoCapsLabel(context),
              ),
              _TypeSpec(
                'numericLarge',
                '6/6',
                CatchTextStyles.numericLarge(context),
              ),
              _TypeSpec(
                'numericMeta',
                '7 km - 4 min walk',
                CatchTextStyles.numericMeta(context),
              ),
              _TypeSpec('meta', 'WAITLIST', CatchTextStyles.meta(context)),
              _TypeSpec('badge', 'Open', CatchTextStyles.badge(context)),
              _TypeSpec(
                'badgeCaps',
                'VERIFIED',
                CatchTextStyles.badgeCaps(context),
              ),
              _TypeSpec(
                'statDisplay',
                '128',
                CatchTextStyles.statDisplay(context),
              ),
              _TypeSpec(
                'debugDetails',
                'FirebaseException(permission-denied)',
                CatchTextStyles.debugDetails(context),
              ),
              _TypeSpec('otpDigit', '7', CatchTextStyles.otpDigit(context)),
              _TypeSpec(
                'avatarInitials(18)',
                'AS',
                CatchTextStyles.avatarInitials(context, size: 18),
              ),
            ],
          ),
        ),
        WidgetbookFoundationSpecSection(
          title: 'Technical',
          child: _TypeStack(
            rows: [
              _TypeSpec(
                'transparentInput',
                'Invisible input carrier',
                CatchTextStyles.transparentInput(),
              ),
              _TypeSpec(
                'iconRasterGlyph',
                String.fromCharCode(CatchIcons.running.codePoint),
                CatchTextStyles.iconRasterGlyph(
                  icon: CatchIcons.running,
                  size: 28,
                  color: CatchTokens.of(context).ink,
                ),
              ),
            ],
          ),
        ),
      ],
    );
  }
}

class _TypeStack extends StatelessWidget {
  const _TypeStack({required this.rows});

  final List<_TypeSpec> rows;

  @override
  Widget build(BuildContext context) {
    final t = CatchTokens.of(context);
    return Column(
      children: [
        for (final row in rows)
          Padding(
            padding: const EdgeInsets.only(bottom: CatchSpacing.s4),
            child: DecoratedBox(
              decoration: BoxDecoration(
                border: Border(bottom: BorderSide(color: t.line)),
              ),
              child: Padding(
                padding: const EdgeInsets.only(bottom: CatchSpacing.s3),
                child: Row(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    SizedBox(
                      width: WidgetbookPreviewLayout.foundationTypeLabelWidth,
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            row.name,
                            style: CatchTextStyles.monoLabel(context),
                          ),
                          gapH4,
                          Text(
                            _typeStyleSummary(row.style),
                            style: CatchTextStyles.monoLabelS(
                              context,
                              color: t.ink3,
                            ),
                          ),
                        ],
                      ),
                    ),
                    const SizedBox(width: CatchSpacing.s4),
                    Expanded(child: Text(row.sample, style: row.style)),
                  ],
                ),
              ),
            ),
          ),
      ],
    );
  }
}

class _TypeSpec {
  const _TypeSpec(this.name, this.sample, this.style);

  final String name;
  final String sample;
  final TextStyle style;
}

String _typeStyleSummary(TextStyle style) {
  final family = switch (style.fontFamily) {
    null => 'inherited',
    'packages/catch_ui/Archivo' => 'Archivo',
    'packages/catch_ui/IBM Plex Mono' => 'IBM Plex Mono',
    final family => family,
  };
  final size = style.fontSize == null
      ? '-'
      : widgetbookFoundationNumber(style.fontSize!);
  final weight = style.fontWeight?.value.toString() ?? '-';
  final height = style.height == null
      ? '-'
      : widgetbookFoundationNumber(style.height!);
  final tracking = style.letterSpacing == null
      ? '0'
      : widgetbookFoundationNumber(style.letterSpacing!);
  return '$family / ${size}px / w$weight / h$height / ls$tracking';
}
