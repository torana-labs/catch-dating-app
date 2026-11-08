import 'package:catch_dating_app/contexts/forms/data/host_forms_repository.dart';
import 'package:catch_dating_app/hosts/forms/form_new_body.dart';
import 'package:catch_dating_app/hosts/forms/form_new_state.dart';
import 'package:catch_dating_app/hosts/forms/forms_controller.dart';
import 'package:catch_dating_app/hosts/presentation/forms/host_forms_controller.dart';
import 'package:catch_l10n/l10n.dart';
import 'package:catch_platform/errors/app_error_message.dart';
import 'package:catch_platform/riverpod_ui/catch_async_value_adapter.dart';
import 'package:catch_platform/riverpod_ui/catch_localized_error_state.dart';
import 'package:catch_platform/riverpod_ui/catch_notice_feedback.dart';
import 'package:catch_platform/routing/route_contract.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/widgets.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

/// A new form, step 1 of 2: choose what happens after someone answers, or a
/// template, then make the form and go on to its questions.
///
/// Reads the organizer's templates; Next makes the form from the chosen
/// template through the existing create command and replaces this step
/// with the form's questions.
class HostFormNewScreen extends ConsumerStatefulWidget {
  const HostFormNewScreen({super.key, required this.organizerId});

  final String organizerId;

  @override
  ConsumerState<HostFormNewScreen> createState() => _HostFormNewScreenState();
}

class _HostFormNewScreenState extends ConsumerState<HostFormNewScreen> {
  bool _templates = false;
  String? _selected;

  @override
  Widget build(BuildContext context) {
    final l10n = context.l10n;
    final create = ref.watch(hostFormCreateMutation);
    final creating = create.isPending;
    final provider = hostFormTemplatesProvider(widget.organizerId);
    final value = catchAsyncStateFromAsyncValue(ref.watch(provider));
    final all = value.value;
    final choices = all == null
        ? const <HostFormNewChoice>[]
        : _templates
        ? HostFormNewState.templateChoices(all)
        : HostFormNewState.kinds(all);
    final selected = choices.any((choice) => choice.templateId == _selected)
        ? _selected
        : choices.firstOrNull?.templateId;
    final state = HostFormNewState(
      status: all == null
          ? HostFormNewStatus.loading
          : HostFormNewStatus.content,
      choices: choices,
      templates: _templates,
      selectedTemplateId: selected,
      creating: creating,
      failed: create.hasError,
    );
    final body = value.hasError && all == null
        ? CatchLocalizedErrorState(
            value.error!,
            context: AppErrorContext.forms,
            onRetry: () => ref.invalidate(provider),
          )
        : HostFormNewBody(
            state: state,
            onSelect: (id) => setState(() => _selected = id),
          );
    return CatchRoot(
      child: CatchScreen(
        topBar: CatchTopBar(
          variant: CatchTopBarVariant.tool,
          title: l10n.hostFormsNewTitle,
          kicker: l10n.hostFormsNewKicker,
          back: CatchTopBarBack(
            label: l10n.hostFormsClose,
            close: true,
            onPressed: () => context.pop(),
          ),
        ),
        body: body,
        dock: CatchDock(
          primary: CatchDockAction(
            label: l10n.hostFormsNewNext,
            loading: creating,
            onPressed: selected == null || creating
                ? null
                : () => _create(selected),
          ),
          secondary: CatchDockAction(
            label: _templates
                ? l10n.hostFormsNewKinds
                : l10n.hostFormsNewTemplates,
            onPressed: creating
                ? null
                : () => setState(() => _templates = !_templates),
          ),
        ),
      ),
    );
  }

  Future<void> _create(String templateId) async {
    try {
      final editor = await hostFormCreateMutation.run(
        ref,
        (tx) => tx
            .get(hostFormsControllerProvider)
            .create(
              organizerId: widget.organizerId,
              templateId: templateId,
              requestId:
                  'create_${templateId}_${DateTime.now().microsecondsSinceEpoch}',
            ),
      );
      if (!mounted) return;
      ref.invalidate(hostFormsDirectoryControllerProvider);
      context.pushReplacementNamed(
        Routes.hostFormBuilderScreen.name,
        pathParameters: {'formId': editor.form.formId},
        queryParameters: {
          'organizerId': widget.organizerId,
          'view': 'questions',
        },
      );
    } on Object catch (error) {
      if (!mounted) return;
      showCatchNoticeError(context, error, errorContext: AppErrorContext.forms);
    }
  }
}
