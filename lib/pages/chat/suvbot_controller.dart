import 'package:catch_dating_app/contexts/messaging/data/suvbot_repository.dart';
import 'package:flutter_riverpod/experimental/mutation.dart';
import 'package:riverpod_annotation/riverpod_annotation.dart';

part 'suvbot_controller.g.dart';

@riverpod
class SuvbotController extends _$SuvbotController {
  static final requestMutation = Mutation<void>();

  @override
  void build() {}

  Future<void> requestAction({required String actionId, String? text}) => ref
      .read(suvbotRepositoryProvider)
      .requestAction(actionId: actionId, text: text);
}
