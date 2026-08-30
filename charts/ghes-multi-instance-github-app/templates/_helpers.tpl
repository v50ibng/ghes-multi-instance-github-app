{{- define "ghes-multi-instance-github-app.name" -}}
{{- default .Chart.Name .Values.nameOverride | trunc 63 | trimSuffix "-" -}}
{{- end -}}

{{- define "ghes-multi-instance-github-app.fullname" -}}
{{- if .Values.fullnameOverride -}}
{{- .Values.fullnameOverride | trunc 63 | trimSuffix "-" -}}
{{- else -}}
{{- $name := default .Chart.Name .Values.nameOverride -}}
{{- if contains $name .Release.Name -}}
{{- .Release.Name | trunc 63 | trimSuffix "-" -}}
{{- else -}}
{{- printf "%s-%s" .Release.Name $name | trunc 63 | trimSuffix "-" -}}
{{- end -}}
{{- end -}}
{{- end -}}

{{- define "ghes-multi-instance-github-app.chart" -}}
{{- printf "%s-%s" .Chart.Name .Chart.Version | replace "+" "_" | trunc 63 | trimSuffix "-" -}}
{{- end -}}

{{- define "ghes-multi-instance-github-app.labels" -}}
helm.sh/chart: {{ include "ghes-multi-instance-github-app.chart" . }}
app.kubernetes.io/name: {{ include "ghes-multi-instance-github-app.name" . }}
app.kubernetes.io/instance: {{ .Release.Name }}
app.kubernetes.io/version: {{ .Chart.AppVersion | quote }}
app.kubernetes.io/managed-by: {{ .Release.Service }}
{{- end -}}

{{- define "ghes-multi-instance-github-app.selectorLabels" -}}
app.kubernetes.io/name: {{ include "ghes-multi-instance-github-app.name" . }}
app.kubernetes.io/instance: {{ .Release.Name }}
{{- end -}}

{{- define "ghes-multi-instance-github-app.serviceAccountName" -}}
{{- if .Values.serviceAccount.create -}}
{{- default (include "ghes-multi-instance-github-app.fullname" .) .Values.serviceAccount.name -}}
{{- else -}}
{{- default "default" .Values.serviceAccount.name -}}
{{- end -}}
{{- end -}}

{{- define "ghes-multi-instance-github-app.credentialsSecretName" -}}
{{- if .Values.credentials.existingSecret -}}
{{- .Values.credentials.existingSecret -}}
{{- else if .Values.credentials.create -}}
{{- printf "%s-credentials" (include "ghes-multi-instance-github-app.fullname" .) -}}
{{- else -}}
{{- fail "credentials.existingSecret must be set when credentials.create=false" -}}
{{- end -}}
{{- end -}}

{{- define "ghes-multi-instance-github-app.certificateName" -}}
{{- default (printf "%s-certificate" (include "ghes-multi-instance-github-app.fullname" .)) .Values.certificate.name -}}
{{- end -}}

{{- define "ghes-multi-instance-github-app.certificateSecretName" -}}
{{- default (printf "%s-tls" (include "ghes-multi-instance-github-app.fullname" .)) .Values.certificate.secretName -}}
{{- end -}}
