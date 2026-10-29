import 'package:catch_dating_app/kernel/activity_taxonomy.dart';
import 'package:catch_dating_app/l10n/l10n.dart';
import 'package:catch_dating_app/platform/l10n/catch_ui_copy.dart';
import 'package:catch_dating_app/platform/theme/activity_palette.dart';
import 'package:catch_tokens/catch_tokens.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/material.dart';
import 'package:widgetbook_annotation/widgetbook_annotation.dart' as widgetbook;
import 'package:widgetbook_workspace/support/contract_preview.dart';

import '../../preview_layout_contracts.dart';

@widgetbook.UseCase(
  name: 'Contract states',
  type: CatchAvatar,
  path: '[Core primitives]/People',
)
Widget catchPersonAvatarContractStates(BuildContext context) {
  final t = CatchTokens.of(context);

  return WidgetbookContractFrame(
    title: 'CatchAvatar',
    contractId: 'catch.person_avatar',
    states: const [
      'photo',
      'fallback-initials',
      'activity-context',
      'activity-dim',
      'ring',
      'status-dot',
      'obscured',
      'square',
      'count',
      'veiled-run',
      'veiled-dinner',
      'monogram',
      'monogram-display',
    ],
    children: [
      const WidgetbookContractStateCard(
        label: 'photo',
        child: CatchAvatar(
          size: 56,
          name: 'Aanya Rao',
          imageUrl: 'https://example.invalid/avatar-aanya.jpg',
        ),
      ),
      const WidgetbookContractStateCard(
        label: 'fallback-initials',
        child: CatchAvatar(size: 56, name: 'Dev Malhotra'),
      ),
      WidgetbookContractStateCard(
        label: 'activity-context',
        child: CatchAvatar(
          size: 56,
          name: 'Run club',
          initials: 'RC',
          colors: ActivityPalette.resolve(
            context,
            ActivityKind.socialRun,
          ).avatarColors,
        ),
      ),
      WidgetbookContractStateCard(
        label: 'activity-dim',
        child: CatchAvatar(
          size: 56,
          name: 'Dinner',
          initials: 'DN',
          colors: ActivityPalette.resolve(
            context,
            ActivityKind.dinner,
          ).avatarColors,
          dim: true,
        ),
      ),
      WidgetbookContractStateCard(
        label: 'ring',
        child: CatchAvatar(
          size: 64,
          name: 'Mira Shah',
          borderWidth: CatchStroke.avatarRing,
          borderColor: t.primary,
        ),
      ),
      const WidgetbookContractStateCard(
        label: 'status-dot',
        child: CatchAvatar(
          size: 56,
          name: 'Noor Khan',
          status: CatchAvatarStatus.online,
        ),
      ),
      const WidgetbookContractStateCard(
        label: 'obscured',
        child: CatchAvatar(size: 56, name: 'Private guest', obscured: true),
      ),
      const WidgetbookContractStateCard(
        label: 'square',
        child: CatchAvatar(
          size: 56,
          name: 'Host team',
          variant: CatchAvatarVariant.square,
        ),
      ),
      WidgetbookContractStateCard(
        label: 'count',
        child: CatchAvatar.count(
          countLabelBuilder: catchAvatarCountLabelBuilder(context.l10n),
          size: 48,
          count: 19,
        ),
      ),
      WidgetbookContractStateCard(
        label: 'veiled-run',
        child: CatchAvatar.veiled(
          size: 48,
          colors: ActivityPalette.resolve(
            context,
            ActivityKind.socialRun,
          ).avatarColors,
          borderWidth: CatchStroke.avatarRing,
          borderColor: t.surface,
        ),
      ),
      WidgetbookContractStateCard(
        label: 'veiled-dinner',
        child: CatchAvatar.veiled(
          size: 48,
          colors: ActivityPalette.resolve(
            context,
            ActivityKind.dinner,
          ).avatarColors,
          borderWidth: CatchStroke.avatarRing,
          borderColor: t.surface,
        ),
      ),
      const WidgetbookContractStateCard(
        label: 'monogram',
        child: CatchAvatar.monogram(
          size: 36,
          name: 'Riya S.',
          ground: CatchGround.pink,
        ),
      ),
      const WidgetbookContractStateCard(
        label: 'monogram-display',
        child: CatchAvatar.monogram(
          size: 88,
          name: 'Carter Road Runners',
          initials: 'CR',
          ground: CatchGround.coral,
          borderWidth: 4,
          borderColor: CatchTokens.editorialWhite,
        ),
      ),
    ],
  );
}

@widgetbook.UseCase(
  name: 'Contract states',
  type: CatchAvatarViewport,
  path: '[Core primitives]/People',
)
Widget catchPersonAvatarShellContractStates(BuildContext context) {
  final t = CatchTokens.of(context);

  return WidgetbookContractFrame(
    title: 'CatchAvatarViewport',
    contractId: 'catch.person_avatar.shell',
    states: const [
      'circle',
      'square',
      'label-fit',
      'obscured-circle',
      'obscured-square',
    ],
    children: [
      WidgetbookContractStateCard(
        label: 'circle',
        child: CatchAvatarViewport(
          size: 56,
          child: ColoredBox(color: t.primarySoft),
        ),
      ),
      WidgetbookContractStateCard(
        label: 'square',
        child: CatchAvatarViewport(
          size: 56,
          variant: CatchAvatarVariant.square,
          child: ColoredBox(color: t.raised),
        ),
      ),
      WidgetbookContractStateCard(
        label: 'label-fit',
        child: CatchAvatarViewport.label(
          size: 56,
          child: Text(
            '+199',
            style: CatchTextStyles.avatarCount(
              context,
              size: 56 * CatchLayout.avatarCountFontScale,
              color: t.ink2,
            ),
          ),
        ),
      ),
      for (final variant in CatchAvatarVariant.values)
        WidgetbookContractStateCard(
          label: 'obscured-${variant.name}',
          child: CatchAvatarViewport.obscured(
            size: 56,
            variant: variant,
            child: const CatchAvatarInitialsSurface(
              name: 'Private guest',
              size: 56,
            ),
          ),
        ),
    ],
  );
}

@widgetbook.UseCase(
  name: 'Contract states',
  type: CatchAvatarInitialsSurface,
  path: '[Core primitives]/People',
)
Widget catchAvatarInitialsSurfaceContractStates(BuildContext context) {
  return WidgetbookContractFrame(
    title: 'CatchAvatarInitialsSurface',
    contractId: 'catch.person_avatar.initials',
    states: [
      'derived',
      'explicit',
      'empty',
      'activity',
      'dim',
      'activity-empty',
    ],
    children: [
      WidgetbookContractStateCard(
        label: 'derived',
        child: SizedBox.square(
          dimension: WidgetbookPreviewLayout.avatarPreviewExtent,
          child: CatchAvatarInitialsSurface(name: 'Aanya Rao', size: 56),
        ),
      ),
      WidgetbookContractStateCard(
        label: 'explicit',
        child: SizedBox.square(
          dimension: WidgetbookPreviewLayout.avatarPreviewExtent,
          child: CatchAvatarInitialsSurface(
            name: 'Host team',
            initials: 'HT',
            size: 56,
          ),
        ),
      ),
      WidgetbookContractStateCard(
        label: 'empty',
        child: SizedBox.square(
          dimension: WidgetbookPreviewLayout.avatarPreviewExtent,
          child: CatchAvatarInitialsSurface(name: '', size: 56),
        ),
      ),
      WidgetbookContractStateCard(
        label: 'activity',
        child: SizedBox.square(
          dimension: WidgetbookPreviewLayout.avatarPreviewExtent,
          child: CatchAvatarInitialsSurface.activity(
            colors: ActivityPalette.resolve(
              context,
              ActivityKind.socialRun,
            ).avatarColors,
            initials: 'SR',
            size: 56,
          ),
        ),
      ),
      WidgetbookContractStateCard(
        label: 'dim',
        child: SizedBox.square(
          dimension: WidgetbookPreviewLayout.avatarPreviewExtent,
          child: CatchAvatarInitialsSurface.activity(
            colors: ActivityPalette.resolve(
              context,
              ActivityKind.dinner,
            ).avatarColors,
            initials: 'DN',
            size: 56,
            dim: true,
          ),
        ),
      ),
      WidgetbookContractStateCard(
        label: 'activity-empty',
        child: SizedBox.square(
          dimension: WidgetbookPreviewLayout.avatarPreviewExtent,
          child: CatchAvatarInitialsSurface.activity(
            colors: ActivityPalette.resolve(
              context,
              ActivityKind.yoga,
            ).avatarColors,
            initials: '',
            size: 56,
          ),
        ),
      ),
    ],
  );
}
