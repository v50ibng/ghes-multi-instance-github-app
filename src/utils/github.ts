export const toApiBaseUrl = (baseUrl: string): string => {
  const trimmed = baseUrl.replace(/\/+$/, '');
  return `${trimmed}/api/v3`;
};

export const buildIssueDedupeKey = (
  instanceKey: string,
  installationId: number,
  owner: string,
  repo: string,
  title: string,
  body: string,
): string => {
  return [instanceKey, installationId, owner.toLowerCase(), repo.toLowerCase(), title.trim(), body.trim()].join('::');
};
