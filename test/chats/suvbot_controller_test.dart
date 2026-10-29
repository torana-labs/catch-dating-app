import 'package:catch_dating_app/chats/presentation/suvbot_controller.dart';
import 'package:catch_dating_app/contexts/messaging/data/suvbot_repository.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  group('SuvbotController', () {
    test('delegates demo action requests to the repository', () async {
      final repository = _FakeSuvbotRepository();
      final container = ProviderContainer(
        overrides: [suvbotRepositoryProvider.overrideWithValue(repository)],
      );
      addTearDown(container.dispose);

      await container
          .read(suvbotControllerProvider.notifier)
          .requestAction(actionId: 'seedDemo', text: 'Reset roster');

      expect(repository.lastActionId, 'seedDemo');
      expect(repository.lastText, 'Reset roster');
    });
  });
}

class _FakeSuvbotRepository extends Fake implements SuvbotRepository {
  String? lastActionId;
  String? lastText;

  @override
  Future<void> requestAction({required String actionId, String? text}) async {
    lastActionId = actionId;
    lastText = text;
  }
}
