part of 'catch_section.dart';

Widget _buildActionModule(
  BuildContext context, {
  required String title,
  required String message,
  required String actionLabel,
  required VoidCallback? onAction,
  required Key? actionKey,
  required Widget? details,
  required IconData? icon,
  required CatchSectionEmphasis actionEmphasis,
  required CatchButtonStatus actionStatus,
  required Widget? feedback,
}) {
  return _buildSectionModule(
    context,
    title: title,
    message: message,
    icon: icon,
    details: details,
    action: CatchButton(
      key: actionKey,
      label: actionLabel,
      onPressed: onAction,
      variant: switch (actionEmphasis) {
        CatchSectionEmphasis.primary => CatchButtonVariant.primary,
        CatchSectionEmphasis.secondary => CatchButtonVariant.secondary,
        CatchSectionEmphasis.destructive => CatchButtonVariant.danger,
      },
      status: actionStatus,
      fullWidth: true,
    ),
    feedback: feedback,
  );
}

Widget _buildSectionModule(
  BuildContext context, {
  required String title,
  String? message,
  IconData? icon,
  Widget? details,
  Widget? body,
  Widget? action,
  Widget? feedback,
}) {
  final tokens = CatchTokens.of(context);
  final heading = Semantics(
    header: true,
    child: Text(title, style: CatchTextStyles.sectionTitle(context)),
  );
  return CatchSurface(
    tone: CatchSurfaceTone.primarySoft,
    radius: CatchRadius.md,
    padding: const EdgeInsets.all(CatchSpacing.s4),
    child: Column(
      mainAxisSize: MainAxisSize.min,
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        if (icon == null)
          heading
        else
          Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Icon(icon, color: tokens.ink2, size: CatchIconSize.md),
              const SizedBox(width: CatchSpacing.s2),
              Expanded(child: heading),
            ],
          ),
        if (details != null) ...[
          const SizedBox(height: CatchSpacing.s3),
          details,
        ],
        if (message != null && message.trim().isNotEmpty) ...[
          const SizedBox(height: CatchSpacing.s3),
          Text(
            message,
            style: CatchTextStyles.supporting(context, color: tokens.ink2),
          ),
        ],
        if (body != null) ...[const SizedBox(height: CatchSpacing.s3), body],
        if (action != null) ...[
          const SizedBox(height: CatchSpacing.s4),
          action,
        ],
        if (feedback != null) ...[
          const SizedBox(height: CatchSpacing.s2),
          feedback,
        ],
      ],
    ),
  );
}
