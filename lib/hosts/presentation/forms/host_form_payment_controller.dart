import 'package:catch_dating_app/contexts/forms/data/host_forms_repository.dart';
import 'package:catch_dating_app/contexts/forms/domain/forms/host_form_payment.dart';
import 'package:catch_dating_app/core/external_links.dart';
import 'package:catch_dating_app/exceptions/app_exception.dart';
import 'package:riverpod_annotation/riverpod_annotation.dart';

part 'host_form_payment_controller.g.dart';

class HostFormPaymentSetupState {
  const HostFormPaymentSetupState({
    required this.setup,
    this.pending = false,
    this.error,
  });
  final HostFormPaymentSetup setup;
  final bool pending;
  final Object? error;
}

@riverpod
class HostFormPaymentController extends _$HostFormPaymentController {
  @override
  Future<HostFormPaymentSetupState> build(String organizerId) async =>
      HostFormPaymentSetupState(
        setup: await ref
            .read(hostFormsRepositoryProvider)
            .managePaymentConnection(
              organizerId: organizerId,
              action: HostFormPaymentConnectionAction.list,
            ),
      );

  Future<void> refresh([String? selectedConnectionId]) {
    final setup = state.asData?.value.setup;
    final ready = setup?.connections.where((connection) => connection.ready);
    final selected =
        ready
            ?.where(
              (connection) => connection.connectionId == selectedConnectionId,
            )
            .firstOrNull ??
        ready?.firstOrNull;
    return setup?.available == true && selected != null
        ? _run(
            HostFormPaymentConnectionAction.refresh,
            connectionId: selected.connectionId,
          )
        : _run(HostFormPaymentConnectionAction.list);
  }

  Future<void> connect() => _run(HostFormPaymentConnectionAction.begin);
  Future<void> disconnect(String connectionId) => _run(
    HostFormPaymentConnectionAction.disconnect,
    connectionId: connectionId,
  );

  Future<void> _run(
    HostFormPaymentConnectionAction action, {
    String? connectionId,
  }) async {
    final current = state.asData?.value;
    if (current == null ||
        current.pending ||
        (action != HostFormPaymentConnectionAction.list &&
            !current.setup.available)) {
      return;
    }
    final repository = ref.read(hostFormsRepositoryProvider);
    final links = ref.read(externalLinkControllerProvider);
    state = AsyncData(
      HostFormPaymentSetupState(setup: current.setup, pending: true),
    );
    try {
      final result = await repository.managePaymentConnection(
        organizerId: organizerId,
        action: action,
        connectionId: connectionId,
      );
      if (!ref.mounted) return;
      if (action == HostFormPaymentConnectionAction.begin) {
        final uri = result.authorizationUri;
        if (uri == null || !await links.openExternal(uri)) {
          throw const ExternalActionException(
            'The payment authorization page could not open.',
          );
        }
        if (!ref.mounted) return;
        // Returning from a browser is not proof that OAuth or webhook setup succeeded.
        final latest = await repository.managePaymentConnection(
          organizerId: organizerId,
          action: HostFormPaymentConnectionAction.list,
        );
        if (!ref.mounted) return;
        state = AsyncData(HostFormPaymentSetupState(setup: latest));
      } else {
        state = AsyncData(HostFormPaymentSetupState(setup: result));
      }
    } catch (error) {
      if (ref.mounted) {
        state = AsyncData(
          HostFormPaymentSetupState(setup: current.setup, error: error),
        );
      }
    }
  }
}
