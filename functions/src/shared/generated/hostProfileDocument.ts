/* eslint-disable */
// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs

/**
 * Professional host identity stored at hostProfiles/{uid}. This document is separate from users/{uid} dating profile data and publicProfiles/{uid}.
 */
export interface HostProfileDocument {
  /**
   * Professional display name for host, club, event, and support-chat surfaces.
   */
  displayName: string;
  /**
   * Professional host avatar or organization logo URL.
   */
  avatarUrl?: string | null;
  /**
   * Professional title such as Founder, Coach, Organizer, or Community Lead.
   */
  roleTitle?: string | null;
  /**
   * Professional host bio. Must not mirror dating-profile prompts.
   */
  bio?: string | null;
  status: "active" | "pending" | "suspended";
  verified?: boolean;
  /**
   * @maxItems 20
   */
  linkedOrganizerIds?: string[];
  /**
   * Serialized Firestore Timestamp fixture shape.
   */
  createdAt: {
    _seconds: number;
    _nanoseconds: number;
  };
  /**
   * Serialized Firestore Timestamp fixture shape.
   */
  updatedAt: {
    _seconds: number;
    _nanoseconds: number;
  };
}
