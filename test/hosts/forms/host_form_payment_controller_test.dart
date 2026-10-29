import 'dart:async';

import 'package:catch_dating_app/contexts/forms/data/host_forms_repository.dart';
import 'package:catch_dating_app/contexts/forms/domain/forms/host_form_payment.dart';
import 'package:catch_dating_app/core/external_links.dart';
import 'package:catch_dating_app/hosts/presentation/forms/host_form_payment_controller.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:url_launcher/url_launcher.dart';

class _Repository extends Fake implements HostFormsRepository {
  final actions = <HostFormPaymentConnectionAction>[];
  bool available = true;
  List<HostFormPaymentConnection> connections = [];
  final connectionIds = <String?>[];
  Completer<HostFormPaymentSetup>? pending;
  @override
  Future<HostFormPaymentSetup> managePaymentConnection({
    required String organizerId,
    required HostFormPaymentConnectionAction action,
    String? connectionId,
  }) async {
    expect(organizerId, 'org_test');
    actions.add(action);
    connectionIds.add(connectionId);
    if (pending case final request?) return request.future;
    return HostFormPaymentSetup(
      available: available,
      connections: connections,
      authorizationUri: action == HostFormPaymentConnectionAction.begin
          ? Uri.parse('https://auth.razorpay.com/authorize?state=opaque')
          : null,
    );
  }
}

void main() {
  final provider = hostFormPaymentControllerProvider('org_test');
  ProviderContainer setup(_Repository repository, List<Uri> opened) {
    final container = ProviderContainer(
      overrides: [
        hostFormsRepositoryProvider.overrideWithValue(repository),
        externalLinkControllerProvider.overrideWithValue(
          ExternalLinkController((
            uri, {
            mode = LaunchMode.platformDefault,
          }) async {
            opened.add(uri);
            return true;
          }),
        ),
      ],
    );
    addTearDown(container.dispose);
    final subscription = container.listen(provider, (_, _) {});
    addTearDown(subscription.close);
    return container;
  }

  test(
    'OAuth return refreshes authoritative setup without assuming success',
    () async {
      final repository = _Repository();
      final opened = <Uri>[];
      final container = setup(repository, opened);
      await container.read(provider.future);
      await container.read(provider.notifier).connect();
      expect(repository.actions, [
        HostFormPaymentConnectionAction.list,
        HostFormPaymentConnectionAction.begin,
        HostFormPaymentConnectionAction.list,
      ]);
      expect(opened.single.host, 'auth.razorpay.com');
      expect(container.read(provider).requireValue.setup.connections, isEmpty);
      expect(container.read(provider).requireValue.pending, isFalse);
    },
  );

  test(
    'unconfigured setup cannot start OAuth and concurrent operations are fenced',
    () async {
      final repository = _Repository()..available = false;
      final container = setup(repository, []);
      await container.read(provider.future);
      await container.read(provider.notifier).connect();
      expect(repository.actions, [HostFormPaymentConnectionAction.list]);
      repository.available = true;
      await container.read(provider.notifier).refresh();
      repository.pending = Completer<HostFormPaymentSetup>();
      final refresh = container.read(provider.notifier).refresh();
      await container.read(provider.notifier).connect();
      expect(
        repository.actions.where(
          (a) => a == HostFormPaymentConnectionAction.begin,
        ),
        isEmpty,
      );
      repository.pending!.completeError(StateError('unavailable'));
      await refresh;
      expect(container.read(provider).requireValue.pending, isFalse);
      expect(container.read(provider).requireValue.error, isNotNull);
      expect(container.read(provider).requireValue.setup.available, isTrue);
    },
  );
  test(
    'check connection refreshes the selected fee account without changing merchants',
    () async {
      final repository = _Repository()
        ..connections = [
          for (final id in ['newest', 'selected'])
            HostFormPaymentConnection(
              connectionId: id,
              status: HostFormPaymentConnectionStatus.ready,
              mode: HostFormPaymentMode.test,
              accountId: 'acc_$id',
              webhookVerified: true,
            ),
        ];
      final container = setup(repository, []);
      await container.read(provider.future);
      await container.read(provider.notifier).refresh('selected');
      expect(repository.actions.last, HostFormPaymentConnectionAction.refresh);
      expect(repository.connectionIds.last, 'selected');
    },
  );
}
