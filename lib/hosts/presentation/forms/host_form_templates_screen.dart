import 'package:catch_dating_app/core/app_error_message.dart';
import 'package:catch_dating_app/core/riverpod_ui/catch_async_boundary.dart';
import 'package:catch_dating_app/core/riverpod_ui/catch_localized_error_state.dart';
import 'package:catch_dating_app/core/riverpod_ui/catch_notice_feedback.dart';
import 'package:catch_dating_app/hosts/data/host_forms_repository.dart';
import 'package:catch_dating_app/hosts/domain/forms/host_form_editor.dart';
import 'package:catch_dating_app/hosts/domain/forms/host_form_summary.dart';
import 'package:catch_dating_app/hosts/presentation/forms/host_form_copy.dart';
import 'package:catch_dating_app/hosts/presentation/forms/host_forms_controller.dart';
import 'package:catch_dating_app/l10n/l10n.dart';
import 'package:catch_dating_app/routing/go_router.dart';
import 'package:catch_tokens/catch_tokens.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

class HostFormTemplatesScreen extends ConsumerStatefulWidget {
  const HostFormTemplatesScreen({super.key, required this.organizerId});

  final String organizerId;

  @override
  ConsumerState<HostFormTemplatesScreen> createState() =>
      _HostFormTemplatesScreenState();
}

class _HostFormTemplatesScreenState
    extends ConsumerState<HostFormTemplatesScreen> {
  String? _creatingTemplateId;

  @override
  Widget build(BuildContext context) {
    final templates = ref.watch(hostFormTemplatesProvider(widget.organizerId));
    final t = CatchTokens.of(context);
    return CatchRouteScaffold(
      topBarBuilder: (context, scrolledUnder) => CatchTopBar.route(
        title: context.l10n.hostFormTemplatesTitle,
        navigation: const CatchTopBarNavigation(
          mode: CatchTopBarNavigationMode.back,
        ),
        emphasis: scrolledUnder
            ? CatchTopBarEmphasis.divided
            : CatchTopBarEmphasis.plain,
      ),
      body: CatchRouteBody.standardSections(
        sections: [
          CatchSectionListItem(
            child: CatchSection.plain(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  CatchText(
                    context.l10n.hostFormTemplatesSubtitle,
                    variant: CatchTextVariant.supporting,
                    color: t.ink2,
                  ),
                  gapH20,
                  CatchAsyncBoundary<List<HostFormTemplateSummary>>(
                    value: templates,
                    onRetry: () => ref.invalidate(
                      hostFormTemplatesProvider(widget.organizerId),
                    ),
                    initialLoadTimeout: null,
                    loadingBuilder: (_) => CatchSection.containedLoadingRows(
                      layouts: List.generate(
                        7,
                        (_) => CatchRecordLayout.placeholder(
                          icon: CatchIcons.descriptionOutlined,
                          hasMetadata: true,
                          hasDescription: true,
                        ),
                      ),
                    ),
                    errorBuilder: (_, error, _, onBoundaryRetry) =>
                        CatchLocalizedErrorState(
                          error,
                          context: AppErrorContext.forms,
                          onRetry: onBoundaryRetry,
                        ),
                    builder: (context, values) => CatchSection.containedRows(
                      children: [
                        for (final template in values)
                          CatchField.navigate(
                            key: ValueKey(
                              'host-form-template-${template.templateId}',
                            ),
                            onActivate: () => _create(template),
                            states: {
                              if (_creatingTemplateId != null)
                                WidgetState.disabled,
                            },
                            content: CatchRecordLayout(
                              title: template.title,
                              description: template.description,
                              metadata:
                                  _creatingTemplateId == template.templateId
                                  ? context.l10n.hostAudienceCreatingForm
                                  : context.l10n.hostFormTemplateSummary(
                                      purpose: hostFormPurposeLabel(
                                        context,
                                        template.purpose,
                                      ),
                                      count: template.questionCount,
                                    ),
                              icon: template.templateId == 'blank_form'
                                  ? CatchIcons.addRounded
                                  : CatchIcons.descriptionOutlined,
                            ),
                          ),
                      ],
                    ),
                  ),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }

  Future<void> _create(HostFormTemplateSummary template) async {
    setState(() => _creatingTemplateId = template.templateId);
    try {
      final editor = await ref
          .read(hostFormsControllerProvider)
          .create(
            organizerId: widget.organizerId,
            templateId: template.templateId,
            requestId: _requestId(template.templateId),
          );
      if (!mounted) return;
      ref.invalidate(
        hostFormsDirectoryControllerProvider(
          HostFormListRequest(organizerId: widget.organizerId),
        ),
      );
      context.pushReplacementNamed(
        Routes.hostFormBuilderScreen.name,
        pathParameters: {'formId': editor.form.formId},
        queryParameters: {'organizerId': widget.organizerId},
      );
    } on Object catch (error) {
      if (!mounted) return;
      showCatchNoticeError(context, error);
      setState(() => _creatingTemplateId = null);
    }
  }
}

String _requestId(String templateId) =>
    'create_${templateId}_${DateTime.now().microsecondsSinceEpoch}';
