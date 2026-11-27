import 'package:catch_dating_app/hosts/forms/form_preview_body.dart';
import 'package:catch_dating_app/hosts/forms/host_forms_controller.dart';
import 'package:catch_l10n/l10n.dart';
import 'package:catch_platform/errors/app_error_message.dart';
import 'package:catch_platform/riverpod_ui/catch_async_value_adapter.dart';
import 'package:catch_platform/riverpod_ui/catch_localized_error_state.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/widgets.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

/// The form as people will see it, drawn from the draft in the form
/// editor. It records nothing and changes nothing.
class HostFormPreviewScreen extends ConsumerWidget {
  const HostFormPreviewScreen({
    super.key,
    required this.organizerId,
    required this.formId,
  });

  final String organizerId;
  final String formId;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final l10n = context.l10n;
    final provider = hostFormEditorControllerProvider(organizerId, formId);
    final value = catchAsyncStateFromAsyncValue(ref.watch(provider));
    final definition = value.value?.editor.definition;
    final Widget body;
    if (definition != null) {
      body = HostFormPreviewBody(definition: definition);
    } else if (value.hasError) {
      body = CatchPageBody.screen(
        child: CatchLocalizedErrorState(
          value.error!,
          context: AppErrorContext.forms,
          onRetry: ref.read(provider.notifier).reload,
        ),
      );
    } else {
      body = const CatchPageBody.screen(child: CatchLoadingIndicator());
    }
    return CatchRoot(
      child: CatchScreen(
        key: const ValueKey<String>('host-form-preview-screen'),
        topBar: CatchTopBar(
          variant: CatchTopBarVariant.tool,
          title: l10n.hostAudienceQuestionPreview,
          kicker: definition?.title,
          back: CatchTopBarBack(label: l10n.hostFormsBack),
        ),
        body: body,
      ),
    );
  }
}
