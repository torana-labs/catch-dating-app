import 'package:catch_dating_app/hosts/forms/form_share_body.dart';
import 'package:catch_dating_app/hosts/presentation/forms/host_forms_controller.dart';
import 'package:catch_l10n/l10n.dart';
import 'package:catch_platform/device/clipboard.dart';
import 'package:catch_platform/device/external_links.dart';
import 'package:catch_platform/device/external_share.dart';
import 'package:catch_platform/errors/app_error_message.dart';
import 'package:catch_platform/riverpod_ui/catch_async_value_adapter.dart';
import 'package:catch_platform/riverpod_ui/catch_localized_error_state.dart';
import 'package:catch_platform/riverpod_ui/catch_notice_feedback.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/widgets.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

/// Sharing one form: its link with Copy, and WhatsApp, Story and Embed.
///
/// Reads the form's share assets (its public link and embed snippet) and
/// the form's title. Copy and Embed use the clipboard, WhatsApp opens a
/// WhatsApp message with the link, and Story opens the system share sheet.
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
  String get organizerId => widget.organizerId;
  String get formId => widget.formId;

  @override
  Widget build(BuildContext context) {
    final l10n = context.l10n;
    final assetsProvider = hostFormShareAssetsControllerProvider(
      organizerId: organizerId,
      formId: formId,
    );
    final assets = catchAsyncStateFromAsyncValue(ref.watch(assetsProvider));
    final title = catchAsyncStateFromAsyncValue(
      ref.watch(hostFormEditorControllerProvider(organizerId, formId)),
    ).value?.editor.definition.title;
    final value = assets.value;
    final body = assets.hasError && value == null
        ? CatchLocalizedErrorState(
            assets.error!,
            context: AppErrorContext.forms,
            onRetry: () => ref.invalidate(assetsProvider),
          )
        : HostFormShareBody(
            url: value?.canonicalUrl,
            onCopy: () => _copy(value!.canonicalUrl, l10n.hostFormsShareCopied),
            onShare: (target) async {
              final url = value!.canonicalUrl;
              switch (target) {
                case HostFormShareTarget.whatsapp:
                  await _run(
                    () => ref
                        .read(externalLinkControllerProvider)
                        .openExternal(
                          Uri.https('wa.me', '/', <String, String>{
                            'text': url,
                          }),
                        ),
                  );
                case HostFormShareTarget.story:
                  await _run(
                    () => ref
                        .read(externalShareControllerProvider)
                        .shareText(text: url, subject: title),
                  );
                case HostFormShareTarget.embed:
                  await _copy(
                    value.embedSnippet,
                    l10n.hostFormsShareEmbedCopied,
                  );
              }
            },
          );
    return CatchRoot(
      child: CatchScreen(
        topBar: CatchTopBar(
          variant: CatchTopBarVariant.tool,
          title: l10n.hostFormsShareTitle,
          kicker: title,
          back: CatchTopBarBack(label: l10n.hostFormsBack),
        ),
        body: body,
      ),
    );
  }

  Future<void> _copy(String text, String confirmation) => _run(() async {
    await ref.read(clipboardControllerProvider).copyText(text);
    if (mounted) {
      showCatchNotice(context, confirmation, tone: CatchNoticeTone.success);
    }
  });

  Future<void> _run(Future<void> Function() action) async {
    try {
      await action();
    } on Object catch (error) {
      if (mounted) showCatchNoticeError(context, error);
    }
  }
}
