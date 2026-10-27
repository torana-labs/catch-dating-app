import 'package:catch_tokens/catch_tokens.dart';
import 'package:catch_ui/src/components/catch_notice_tone.dart';
import 'package:catch_ui/src/components/catch_person_avatar_item.dart';
import 'package:catch_ui/src/foundations/catch_icons.dart';
import 'package:flutter/material.dart';

class CatchNoticeData {
  const CatchNoticeData({
    required this.id,
    required this.title,
    this.message,
    IconData? icon,
    this.person,
    this.accentColor,
    this.tone = CatchNoticeTone.status,
    this.actionLabel,
    this.onAction,
    this.duration = CatchMotion.noticeAutoDismiss,
    this.dedupeKey,
    this.priority = 0,
    this.dismissible = true,
    // Keep the public argument `icon`; an initializing formal would expose
    // the private backing field instead of the caller-configurable input.
    // ignore: prefer_initializing_formals
  }) : _icon = icon,
       onOpen = null;

  /// Arrival notifications are one action, not an inline message with buttons.
  const CatchNoticeData.arrival({
    required this.id,
    required this.title,
    required VoidCallback this.onOpen,
    this.message,
    IconData? icon,
    this.person,
    this.accentColor,
    this.tone = CatchNoticeTone.event,
    this.duration = CatchMotion.noticeAutoDismiss,
    this.dedupeKey,
    this.priority = 0,
    // Keep the public icon argument rather than exposing its backing field.
    // ignore: prefer_initializing_formals
  }) : _icon = icon,
       actionLabel = null,
       onAction = null,
       dismissible = true;

  final String id;
  final String title;
  final String? message;

  /// Feature adapters own copy, identity and semantic color. The renderer owns
  /// geometry, text roles, palette derivation and image-failure fallback.
  final IconData? _icon;
  final CatchPersonAvatarItem? person;
  final Color? accentColor;
  final CatchNoticeTone tone;
  final String? actionLabel;
  final VoidCallback? onAction;
  final VoidCallback? onOpen;
  final Duration? duration;
  final String? dedupeKey;
  final int priority;
  final bool dismissible;

  IconData get icon => _icon ?? CatchIcons.info;

  bool get isPersistent => duration == null;
}
