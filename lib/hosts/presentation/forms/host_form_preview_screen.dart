import 'package:catch_dating_app/core/app_error_message.dart';
import 'package:catch_dating_app/core/riverpod_ui/catch_async_boundary.dart';
import 'package:catch_dating_app/hosts/presentation/forms/host_form_body.dart';
import 'package:catch_dating_app/hosts/presentation/forms/host_forms_controller.dart';
import 'package:catch_dating_app/l10n/l10n.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

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
    final state = ref.watch(
      hostFormEditorControllerProvider(organizerId, formId),
    );
    return CatchRouteScaffold(
      topBarBuilder: (context, scrolledUnder) => CatchTopBar.route(
        title: context.l10n.hostAudienceQuestionPreview,
        navigation: const CatchTopBarNavigation(
          mode: CatchTopBarNavigationMode.back,
        ),
        emphasis: scrolledUnder
            ? CatchTopBarEmphasis.divided
            : CatchTopBarEmphasis.plain,
      ),
      body: CatchRouteBody.standardConstrainedSlivers(
        slivers: [
          CatchAsyncBoundary<HostFormEditorState>.sliver(
            value: state,
            onRetry: () => ref
                .read(
                  hostFormEditorControllerProvider(
                    organizerId,
                    formId,
                  ).notifier,
                )
                .reload(),
            initialLoadTimeout: null,
            errorContext: AppErrorContext.forms,
            builder: (context, value) => SliverToBoxAdapter(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  CatchText(
                    context.l10n.hostFormPreviewSubtitle,
                    variant: CatchTextVariant.supporting,
                  ),
                  gapH24,
                  HostFormBody(definition: value.editor.definition),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }
}
