import 'package:catch_dating_app/core/presentation/catch_ui_copy.dart';
import 'package:catch_dating_app/events/domain/event_draft.dart';
import 'package:catch_dating_app/hosts/presentation/event_management/create/create_event_form_keys.dart';
import 'package:catch_dating_app/hosts/presentation/widgets/host_loading_skeleton.dart';
import 'package:catch_dating_app/l10n/l10n.dart';
import 'package:catch_tokens/catch_tokens.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/material.dart';

String draftDeleteConfirmationDialogTitle(AppLocalizations l10n) =>
    l10n.hostsDraftPickerSheetVisiblecopyDeleteDraft;
List<CatchDialogAction<bool>> draftDeleteConfirmationDialogActions(
  AppLocalizations l10n,
) => [
  CatchDialogAction(label: l10n.hostsDraftPickerSheetLabelCancel, value: false),
  CatchDialogAction(
    label: l10n.hostsDraftPickerSheetLabelDelete,
    value: true,
    isDestructive: true,
  ),
];

String draftDeleteConfirmationDialogMessage(
  AppLocalizations l10n,
  EventDraft draft,
) {
  return l10n.hostsDraftPickerSheetVisiblecopyThisWillPermanentlyDelete(
    summary: draft.summary,
  );
}

Future<bool?> showDraftDeleteConfirmationDialog({
  required BuildContext context,
  required EventDraft draft,
}) {
  return showCatchAdaptiveDialog<bool>(
    context: context,
    title: draftDeleteConfirmationDialogTitle(context.l10n),
    message: draftDeleteConfirmationDialogMessage(context.l10n, draft),
    actions: draftDeleteConfirmationDialogActions(context.l10n),
  );
}

class DraftCard extends StatelessWidget {
  const DraftCard({
    super.key,
    required this.draft,
    required this.isDeleting,
    required this.onSelect,
    required this.onDelete,
    this.titleOverride,
    this.bodyOverride,
  });

  final EventDraft draft;
  final bool isDeleting;
  final VoidCallback onSelect;
  final VoidCallback? onDelete;
  final String? titleOverride;
  final String? bodyOverride;

  @override
  Widget build(BuildContext context) {
    final t = CatchTokens.of(context);

    return CatchFieldLanes.single(
      child: CatchField.content(
        emphasis: CatchFieldEmphasis.title,
        copy: catchFieldCopy(context.l10n),
        title: titleOverride ?? draft.summary,
        body:
            bodyOverride ??
            context.l10n.hostDraftSavedAt(time: _formatRelative(draft.savedAt)),
        icon: CatchIcons.descriptionOutlined,
        iconColor: t.ink3,
        onTap: isDeleting ? null : onSelect,
        showChevron: false,
        actions: Tooltip(
          message: context.l10n.hostsDraftPickerSheetMessageDeleteDraft,
          child: CatchIconAction(
            key: CreateEventFormKeys.deleteDraft(draft.id),
            onPressed: isDeleting ? null : onDelete,
            size: 36,
            backgroundColor: Colors.transparent,
            child: isDeleting
                ? const HostInlineIconSkeleton()
                : Icon(
                    CatchIcons.deleteOutlineRounded,
                    size: CatchIconSize.control,
                    color: t.ink2,
                  ),
          ),
        ),
      ),
    );
  }
}

String _formatRelative(DateTime dt) {
  final now = DateTime.now();
  final diff = now.difference(dt);
  if (diff.inMinutes < 1) return 'Just now';
  if (diff.inMinutes < 60) return '${diff.inMinutes}m ago';
  if (diff.inHours < 24) return '${diff.inHours}h ago';
  if (diff.inDays == 1) return 'Yesterday';
  if (diff.inDays < 7) return '${diff.inDays}d ago';
  return '${dt.day}/${dt.month}/${dt.year}';
}
