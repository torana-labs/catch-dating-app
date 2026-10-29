import 'package:catch_dating_app/contexts/account/domain/app_version_config.dart';
import 'package:catch_dating_app/platform/device/external_links.dart';
import 'package:flutter/material.dart';
import 'package:riverpod_annotation/riverpod_annotation.dart';

part 'update_required_controller.g.dart';

// keepalive: update-required controller handles global store/deep-link actions
// outside individual feature routes.
@Riverpod(keepAlive: true)
UpdateRequiredController updateRequiredController(Ref ref) =>
    UpdateRequiredController(ref.watch(externalLinkControllerProvider));

class UpdateRequiredController {
  const UpdateRequiredController(this._links);

  final ExternalLinkController _links;

  Future<bool> openStore({
    required TargetPlatform platform,
    required AppVersionConfig config,
  }) async {
    final url = switch (platform) {
      TargetPlatform.iOS => config.storeUrlIos,
      _ => config.storeUrlAndroid,
    };

    final uri = Uri.tryParse(url);
    if (uri == null || !uri.hasScheme) return false;

    return _links.openExternal(uri);
  }
}
