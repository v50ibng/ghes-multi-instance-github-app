export interface InstallationWebhookPayload {
  action: string;
  installation: {
    id: number;
    account?: {
      login?: string;
    };
    target_type?: string;
    repository_selection?: string;
    suspended_at?: string | null;
  };
  repositories?: Array<{
    full_name: string;
  }>;
}

export interface InstallationRepositoriesWebhookPayload extends InstallationWebhookPayload {
  repositories_added?: Array<{
    full_name: string;
  }>;
  repositories_removed?: Array<{
    full_name: string;
  }>;
}
