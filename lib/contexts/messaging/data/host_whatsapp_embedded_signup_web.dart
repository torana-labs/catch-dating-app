import 'dart:js_interop';

import 'package:catch_dating_app/contexts/audience/audience.dart';

bool get hostWhatsappEmbeddedSignupSupported => true;

@JS('catchStartWhatsappEmbeddedSignup')
external JSPromise<_HostWhatsappSignupJsResult> _startWhatsappEmbeddedSignup(
  _HostWhatsappSignupJsConfig config,
);

extension type _HostWhatsappSignupJsConfig._(JSObject _) implements JSObject {
  external factory _HostWhatsappSignupJsConfig({
    String appId,
    String configId,
    String graphVersion,
  });
}

extension type _HostWhatsappSignupJsResult._(JSObject _) implements JSObject {
  external String get authorizationCode;
  external String get wabaId;
  external String get phoneNumberId;
  external JSString? get businessId;
}

Future<HostWhatsappSignupResult> startHostWhatsappEmbeddedSignup(
  HostWhatsappEmbeddedSignupConfig config,
) async {
  final appId = config.appId;
  final configId = config.configId;
  final graphVersion = config.graphVersion;
  if (appId == null || configId == null || graphVersion == null) {
    throw StateError('WhatsApp Embedded Signup is not configured.');
  }
  final result = await _startWhatsappEmbeddedSignup(
    _HostWhatsappSignupJsConfig(
      appId: appId,
      configId: configId,
      graphVersion: graphVersion,
    ),
  ).toDart;
  return HostWhatsappSignupResult(
    authorizationCode: result.authorizationCode,
    wabaId: result.wabaId,
    phoneNumberId: result.phoneNumberId,
    businessId: result.businessId?.toDart,
  );
}
