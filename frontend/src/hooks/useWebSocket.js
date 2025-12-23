// WebSocket notification types - exported for use in AuthContext
export const NotificationType = {
  TOOL_ACCESS_UPDATED: 'tool_access_updated',
  TOOL_DELETED: 'tool_deleted',
  TOOL_CREATED: 'tool_created',
  ROLE_CHANGED: 'role_changed',
  USER_SUSPENDED: 'user_suspended',
  USER_REACTIVATED: 'user_reactivated',
  REFRESH_DASHBOARD: 'refresh_dashboard',
  CREDENTIALS_UPDATED: 'credentials_updated',
};

// Note: WebSocket is now handled directly in AuthContext for simpler state management
export default NotificationType;
