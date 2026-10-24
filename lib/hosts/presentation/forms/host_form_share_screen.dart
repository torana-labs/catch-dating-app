import 'package:catch_dating_app/core/app_error_message.dart';
import 'package:catch_dating_app/core/clipboard.dart';
import 'package:catch_dating_app/core/external_share.dart';
import 'package:catch_dating_app/core/presentation/catch_ui_copy.dart';
import 'package:catch_dating_app/core/riverpod_ui/catch_async_boundary.dart';
import 'package:catch_dating_app/core/riverpod_ui/catch_localized_error_state.dart';
import 'package:catch_dating_app/core/riverpod_ui/catch_notice_feedback.dart';
import 'package:catch_dating_app/core/schema_contracts/generated/field_constraints.g.dart';
import 'package:catch_dating_app/hosts/domain/forms/host_form_configuration.dart';
import 'package:catch_dating_app/hosts/domain/forms/host_form_share.dart';
import 'package:catch_dating_app/hosts/presentation/forms/host_form_copy.dart';
import 'package:catch_dating_app/hosts/presentation/forms/host_forms_controller.dart';
import 'package:catch_dating_app/l10n/l10n.dart';
import 'package:catch_tokens/catch_tokens.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:qr_flutter/qr_flutter.dart';

class HostFormShareScreen extends ConsumerStatefulWidget {
  const HostFormShareScreen({
    super.key,
    required this.organizerId,
    required this.formId,
  });
  final String organizerId;
  final String formId;
  @override
  ConsumerState<HostFormShareScreen> createState() =>
      _HostFormShareScreenState();
}

class _HostFormShareScreenState extends ConsumerState<HostFormShareScreen> {
  HostFormShareLink? _trackedLink;
  bool _creatingLink = false;

  @override
  Widget build(BuildContext context) {
    final provider = hostFormShareAssetsControllerProvider(
      organizerId: widget.organizerId,
      formId: widget.formId,
    );
    final editorProvider = hostFormEditorControllerProvider(
      widget.organizerId,
      widget.formId,
    );
    return CatchRouteScaffold(
      topBarBuilder: (context, scrolledUnder) => CatchTopBar.route(
        title: context.l10n.hostFormShare,
        navigation: const CatchTopBarNavigation(
          mode: CatchTopBarNavigationMode.back,
        ),
        emphasis: scrolledUnder
            ? CatchTopBarEmphasis.divided
            : CatchTopBarEmphasis.plain,
      ),
      body: CatchRouteBody.standardConstrainedSlivers(
        slivers: [
          CatchAsyncBoundary<HostFormShareAssets>.sliver(
            value: ref.watch(provider),
            onRetry: () => ref.invalidate(provider),
            initialLoadTimeout: null,
            errorContext: AppErrorContext.forms,
            builder: (context, assets) => SliverToBoxAdapter(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  CatchAsyncBoundary<HostFormEditorState>(
                    value: ref.watch(editorProvider),
                    onRetry: () => ref.read(editorProvider.notifier).reload(),
                    loadingBuilder: (_) => CatchSkeleton.content(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          CatchText(
                            context.l10n.hostFormShare,
                            variant: CatchTextVariant.headline,
                          ),
                          gapH8,
                          CatchBadge.status(label: context.l10n.hostFormShare),
                        ],
                      ),
                    ),
                    errorBuilder: (_, error, _, onBoundaryRetry) =>
                        CatchLocalizedErrorState(
                          error,
                          context: AppErrorContext.forms,
                          mode: CatchErrorStateMode.compact,
                          onRetry: onBoundaryRetry,
                        ),
                    builder: (context, editor) => Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        CatchText(
                          editor.editor.definition.title,
                          variant: CatchTextVariant.headline,
                        ),
                        gapH8,
                        CatchBadge.status(
                          label: hostFormStatusLabel(
                            context,
                            editor.editor.form.status,
                          ),
                          tone:
                              editor.editor.form.status ==
                                  HostFormLifecycleStatus.published
                              ? CatchBadgeTone.success
                              : CatchBadgeTone.neutral,
                        ),
                      ],
                    ),
                  ),
                  gapH32,
                  CatchSection.divided(
                    title: context.l10n.hostFormCanonicalLink,
                    first: true,
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.stretch,
                      children: [
                        SelectableText(
                          assets.canonicalUrl,
                          style: CatchTextStyles.bodyL(context),
                        ),
                        gapH16,
                        Row(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Expanded(
                              child: Builder(
                                builder: (originContext) => CatchButton(
                                  label: context.l10n.hostFormShareLink,
                                  mode: CatchButtonMode.rounded,
                                  fullWidth: true,
                                  onPressed: () => _share(
                                    originContext,
                                    assets.canonicalUrl,
                                  ),
                                ),
                              ),
                            ),
                            gapW12,
                            Expanded(
                              child: CatchButton(
                                label: context.l10n.hostFormCopyLink,
                                mode: CatchButtonMode.rounded,
                                fullWidth: true,
                                variant: CatchButtonVariant.secondary,
                                onPressed: () => _copy(
                                  assets.canonicalUrl,
                                  context.l10n.hostFormLinkCopied,
                                ),
                              ),
                            ),
                          ],
                        ),
                      ],
                    ),
                  ),
                  gapH32,
                  CatchSection.fieldRows(
                    children: [
                      CatchField.nav(
                        copy: catchFieldCopy(context.l10n),
                        title: context.l10n.hostAudienceShowQr,
                        icon: CatchIcons.qrCode2Outlined,
                        emphasis: CatchFieldEmphasis.title,
                        onTap: () => _showQr(assets),
                      ),
                      CatchField.nav(
                        copy: catchFieldCopy(context.l10n),
                        title: _creatingLink
                            ? context.l10n.hostAudienceCreatingLink
                            : context.l10n.hostFormCreateTrackedLink,
                        icon: CatchIcons.linkOutlined,
                        emphasis: CatchFieldEmphasis.title,
                        onTap: _creatingLink ? null : _createTrackedLink,
                      ),
                      CatchField.nav(
                        copy: catchFieldCopy(context.l10n),
                        title: context.l10n.hostFormEmbed,
                        icon: CatchIcons.languageOutlined,
                        emphasis: CatchFieldEmphasis.title,
                        onTap: () => _showEmbed(assets),
                      ),
                    ],
                  ),
                  if (_trackedLink case final link?) ...[
                    gapH24,
                    CatchSection.divided(
                      title: link.label,
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.stretch,
                        children: [
                          SelectableText(
                            link.url,
                            style: CatchTextStyles.bodyL(context),
                          ),
                          gapH8,
                          Wrap(
                            spacing: CatchSpacing.s4,
                            runSpacing: CatchSpacing.s2,
                            children: [
                              CatchButton.command(
                                label: context.l10n.hostFormCopyLink,
                                onPressed: () => _copy(
                                  link.url,
                                  context.l10n.hostFormLinkCopied,
                                ),
                              ),
                              Builder(
                                builder: (originContext) => CatchButton.command(
                                  label: context.l10n.hostFormShareLink,
                                  onPressed: () =>
                                      _share(originContext, link.url),
                                ),
                              ),
                            ],
                          ),
                        ],
                      ),
                    ),
                  ],
                  gapH24,
                  CatchText(
                    context.l10n.hostFormCanonicalLinkHelp,
                    variant: CatchTextVariant.supporting,
                  ),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }

  Future<void> _showQr(HostFormShareAssets assets) =>
      showCatchBottomSheet<void>(
        context: context,
        builder: (context) => CatchSheet.standard(
          title: context.l10n.hostAudienceShowQr,
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              Center(
                child: Semantics(
                  label: assets.canonicalUrl,
                  image: true,
                  child: CatchSurface(
                    backgroundColor: CatchTokens.editorialWhite,
                    padding: CatchInsets.iconChipContent,
                    radius: CatchRadius.sm,
                    child: QrImageView(
                      data: assets.canonicalUrl,
                      size: CatchLayout.eventSuccessVenueQrExtent,
                      padding: EdgeInsets.zero,
                      backgroundColor: CatchTokens.editorialWhite,
                    ),
                  ),
                ),
              ),
              gapH16,
              SelectableText(
                assets.canonicalUrl,
                style: CatchTextStyles.bodyL(context),
              ),
            ],
          ),
        ),
      );

  Future<void> _showEmbed(HostFormShareAssets assets) =>
      showCatchBottomSheet<void>(
        context: context,
        builder: (context) => CatchSheet.standard(
          title: context.l10n.hostFormEmbed,
          subtitle: context.l10n.hostFormEmbedHelp,
          footer: CatchButton.sheet(
            role: CatchButtonEmphasis.commit,
            label: context.l10n.hostFormCopyEmbed,

            onPressed: () =>
                _copy(assets.embedSnippet, context.l10n.hostFormEmbedCopied),
          ),
          child: SelectableText(
            assets.embedSnippet,
            style: CatchTextStyles.bodyL(context),
          ),
        ),
      );

  Future<void> _copy(String value, String confirmation) async {
    try {
      await ref.read(clipboardControllerProvider).copyText(value);
      if (!mounted) return;
      showCatchNotice(context, confirmation, tone: CatchNoticeTone.success);
    } on Object catch (error) {
      if (mounted) showCatchNoticeError(context, error);
    }
  }

  Future<void> _share(BuildContext originContext, String url) async {
    try {
      await ref
          .read(externalShareControllerProvider)
          .shareText(
            text: url,
            subject: context.l10n.hostFormShare,
            origin: _shareOrigin(originContext),
          );
    } on Object catch (error) {
      if (mounted) showCatchNoticeError(context, error);
    }
  }

  Future<void> _createTrackedLink() async {
    final input = await _showTrackedLinkDialog(context);
    if (input == null || !mounted) return;
    setState(() => _creatingLink = true);
    try {
      final link = await ref
          .read(hostFormsControllerProvider)
          .createShareLink(
            organizerId: widget.organizerId,
            formId: widget.formId,
            label: input.label,
            source: input.source,
            requestId: 'share_${DateTime.now().microsecondsSinceEpoch}',
          );
      if (!mounted) return;
      setState(() {
        _trackedLink = link;
        _creatingLink = false;
      });
      showCatchNotice(
        context,
        context.l10n.hostFormTrackedLinkReady,
        tone: CatchNoticeTone.success,
      );
    } on Object catch (error) {
      if (!mounted) return;
      setState(() => _creatingLink = false);
      showCatchNoticeError(context, error);
    }
  }
}

class _TrackedLinkInput {
  const _TrackedLinkInput({required this.label, required this.source});

  final String label;
  final String? source;
}

Future<_TrackedLinkInput?> _showTrackedLinkDialog(BuildContext context) async {
  final label = TextEditingController();
  final source = TextEditingController();
  final result = await showDialog<_TrackedLinkInput>(
    context: context,
    builder: (dialogContext) => CatchDialog(
      title: context.l10n.hostFormTrackedLinkTitle,
      actions: [
        CatchButton(
          label: context.l10n.coreCatchAdaptiveDialogVisiblecopyCancel,
          onPressed: () => Navigator.of(dialogContext).pop(),
          variant: CatchButtonVariant.secondary,
        ),
        CatchButton(
          label: context.l10n.hostFormCreate,
          onPressed: () {
            final value = label.text.trim();
            if (value.isEmpty) return;
            Navigator.of(dialogContext).pop(
              _TrackedLinkInput(
                label: value,
                source: source.text.trim().isEmpty ? null : source.text.trim(),
              ),
            );
          },
        ),
      ],
      child: CatchSection.containedFieldRows(
        children: [
          CatchField.input(
            copy: catchFieldCopy(context.l10n),
            title: context.l10n.hostFormTrackedLinkLabel,
            controller: label,
            contract: CatchContractConstraints
                .createOrganizerFormShareLinkCallablePayloadLabel,
            inputHint: context.l10n.hostFormTrackedLinkLabelHint,
            textInputAction: TextInputAction.next,
          ),
          CatchField.input(
            copy: catchFieldCopy(context.l10n),
            title: context.l10n.hostFormTrackedLinkSource,
            controller: source,
            contract: CatchContractConstraints
                .createOrganizerFormShareLinkCallablePayloadSource,
            inputHint: context.l10n.hostFormTrackedLinkSourceHint,
            textInputAction: TextInputAction.done,
            labelMode: CatchFieldLabelTextMode.optional,
          ),
        ],
      ),
    ),
  );
  label.dispose();
  source.dispose();
  return result;
}

Rect? _shareOrigin(BuildContext context) {
  final box = context.findRenderObject() as RenderBox?;
  return box == null ? null : box.localToGlobal(Offset.zero) & box.size;
}
