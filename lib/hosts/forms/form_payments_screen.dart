import 'package:catch_dating_app/contexts/forms/domain/forms/host_form_payment_record.dart';
import 'package:catch_dating_app/hosts/forms/form_payment_sheet.dart';
import 'package:catch_dating_app/hosts/forms/form_payments_body.dart';
import 'package:catch_dating_app/hosts/forms/form_payments_state.dart';
import 'package:catch_dating_app/hosts/presentation/forms/host_form_payments_controller.dart';
import 'package:catch_dating_app/hosts/presentation/forms/host_forms_controller.dart';
import 'package:catch_l10n/l10n.dart';
import 'package:catch_platform/device/clipboard.dart';
import 'package:catch_platform/errors/app_error_message.dart';
import 'package:catch_platform/riverpod_ui/catch_async_value_adapter.dart';
import 'package:catch_platform/riverpod_ui/catch_localized_error_state.dart';
import 'package:catch_platform/riverpod_ui/catch_notice_feedback.dart';
import 'package:catch_platform/routing/route_contract.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/widgets.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

/// One form's fee payments, by status.
///
/// Reads the form's payment records a page at a time and live (a checkout
/// that completes, fails or is refunded moves at once), filtered by All,
/// Pending, Submitted, Refunds or Needs attention, and the form's title.
/// Refresh reads the filter again; a payment opens its details, which can
/// copy a reference or open the response it was made with.
class HostFormPaymentsScreen extends ConsumerStatefulWidget {
  const HostFormPaymentsScreen({
    super.key,
    required this.organizerId,
    required this.formId,
  });

  final String organizerId;
  final String formId;

  @override
  ConsumerState<HostFormPaymentsScreen> createState() =>
      _HostFormPaymentsScreenState();
}

class _HostFormPaymentsScreenState
    extends ConsumerState<HostFormPaymentsScreen> {
  HostFormPaymentFilter _filter = HostFormPaymentFilter.all;

  @override
  Widget build(BuildContext context) {
    final l10n = context.l10n;
    final provider = hostFormPaymentsControllerProvider(
      widget.organizerId,
      widget.formId,
      _filter,
    );
    final value = catchAsyncStateFromAsyncValue(ref.watch(provider));
    final title = catchAsyncStateFromAsyncValue(
      ref.watch(
        hostFormEditorControllerProvider(widget.organizerId, widget.formId),
      ),
    ).value?.editor.definition.title;
    final page = value.value;
    final state = HostFormPaymentsViewState(
      filter: _filter,
      items: page?.items ?? const [],
      loading: page == null,
      refreshing: value.isRefreshing,
      hasMore: page?.hasMore ?? false,
      loadingMore: page?.loadingMore ?? false,
      loadMoreError: page?.loadMoreError,
    );
    final body = value.hasError && page == null
        ? CatchLocalizedErrorState(
            value.error!,
            context: AppErrorContext.forms,
            onRetry: () => ref.invalidate(provider),
          )
        : HostFormPaymentsBody(
            state: state,
            onFilter: (filter) => setState(() => _filter = filter),
            onRefresh: () => ref.invalidate(provider),
            onOpen: _open,
            onLoadMore: () => ref.read(provider.notifier).loadMore(),
          );
    return CatchRoot(
      child: CatchScreen(
        topBar: CatchTopBar(
          variant: CatchTopBarVariant.tool,
          title: l10n.hostFormPaymentsTitle,
          kicker: title,
          back: CatchTopBarBack(label: l10n.hostFormsBack),
        ),
        body: body,
      ),
    );
  }

  Future<void> _open(HostFormPaymentRecord payment) async {
    final responseId = await showCatchBottomSheet<String>(
      context: context,
      builder: (sheetContext) => HostFormPaymentSheet(
        payment: payment,
        onOpenResponse: payment.responseId == null
            ? null
            : () => Navigator.of(sheetContext).pop(payment.responseId),
        onCopy: (text) async {
          await ref.read(clipboardControllerProvider).copyText(text);
          if (sheetContext.mounted) {
            showCatchNotice(
              sheetContext,
              sheetContext.l10n.hostOnboardingDoneCopied,
            );
          }
        },
      ),
    );
    if (responseId == null || !mounted) return;
    await context.pushNamed(
      Routes.hostFormResponseDetailScreen.name,
      pathParameters: {'responseId': responseId},
      queryParameters: {'organizerId': widget.organizerId},
    );
  }
}
