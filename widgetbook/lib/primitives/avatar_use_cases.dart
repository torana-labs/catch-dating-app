import 'package:catch_dating_app/l10n/l10n.dart';
import 'package:catch_dating_app/platform/l10n/catch_ui_copy.dart';
import 'package:catch_tokens/catch_tokens.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/material.dart';
import 'package:widgetbook_annotation/widgetbook_annotation.dart' as widgetbook;
import 'package:widgetbook_workspace/support/widgetbook_harness.dart';

@widgetbook.UseCase(
  name: 'Caller colors and count copy',
  type: CatchAvatarColors,
  path: '[Core primitives]/People',
)
Widget avatarCallerColors(BuildContext context) {
  final t = CatchTokens.of(context);
  final colors = CatchAvatarColors(
    accent: t.success,
    deep: Color.lerp(t.success, CatchTokens.editorialBlack, 0.6)!,
    soft: Color.lerp(t.success, CatchTokens.editorialWhite, 0.85)!,
  );
  return WidgetbookCatalogFrame(
    title: 'Caller-owned avatar colors and copy',
    catalogId: 'catch.person_avatar.colors',
    children: [
      Wrap(
        spacing: CatchSpacing.s4,
        runSpacing: CatchSpacing.s3,
        children: [
          CatchAvatar(size: 64, name: 'Asha Shah', colors: colors),
          CatchAvatar(size: 64, name: 'Asha Shah', colors: colors, dim: true),
          CatchAvatarRow(
            items: const [CatchPersonAvatarItem(name: 'Asha Shah')],
            totalCount: 8,
            limit: 3,
            size: 48,
            veiledCount: 2,
            veiledColors: colors,
            countLabelBuilder: (count) => '+$count',
          ),
        ],
      ),
    ],
  );
}

@widgetbook.UseCase(
  name: 'Collection states',
  type: CatchAvatarRow,
  path: '[Core primitives]/People',
)
Widget avatarRowStates(BuildContext context) {
  final t = CatchTokens.of(context);
  final countLabelBuilder = catchAvatarCountLabelBuilder(context.l10n);
  final colors = CatchAvatarColors(
    accent: t.success,
    deep: Color.lerp(t.success, CatchTokens.editorialBlack, 0.6)!,
    soft: Color.lerp(t.success, CatchTokens.editorialWhite, 0.85)!,
  );
  const pair = [
    CatchPersonAvatarItem(name: 'Aarav Kapoor'),
    CatchPersonAvatarItem(name: 'Riya Shah'),
  ];
  return WidgetbookCatalogFrame(
    title: 'CatchAvatarRow',
    catalogId: 'catch.person_avatar.stack',
    children: [
      for (final state in [
        (
          'two-avatars',
          CatchAvatarRow(items: pair, countLabelBuilder: countLabelBuilder),
        ),
        (
          'overflow-count',
          CatchAvatarRow(
            items: pair,
            totalCount: 8,
            countLabelBuilder: countLabelBuilder,
          ),
        ),
        (
          'veiled',
          CatchAvatarRow(
            items: const [CatchPersonAvatarItem(name: 'Visible guest')],
            totalCount: 6,
            veiledCount: 3,
            veiledColors: colors,
            countLabelBuilder: countLabelBuilder,
          ),
        ),
        (
          'empty',
          CatchAvatarRow(items: const [], countLabelBuilder: countLabelBuilder),
        ),
        (
          'count-only',
          CatchAvatarRow(
            items: const [],
            totalCount: 8,
            countLabelBuilder: countLabelBuilder,
          ),
        ),
        (
          'overflow-hidden',
          CatchAvatarRow(
            items: pair,
            totalCount: 8,
            showOverflowCount: false,
            countLabelBuilder: countLabelBuilder,
          ),
        ),
      ])
        Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            CatchMetadataText(state.$1, color: t.ink2),
            gapH8,
            state.$2,
          ],
        ),
    ],
  );
}
