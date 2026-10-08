{{- define "wd.labels" -}}
app.kubernetes.io/part-of: wd-ai
app.kubernetes.io/managed-by: {{ .Release.Service }}
helm.sh/chart: {{ .Chart.Name }}-{{ .Chart.Version }}
{{- end -}}

{{/* wd.selector: dict "root" . "component" "api" */}}
{{- define "wd.selector" -}}
app.kubernetes.io/name: wd-ai
app.kubernetes.io/instance: {{ .root.Release.Name }}
app.kubernetes.io/component: {{ .component }}
{{- end -}}

{{/* wd.image: dict "root" . "name" "api" */}}
{{- define "wd.image" -}}
{{ .root.Values.image.registry }}/{{ .name }}:{{ .root.Values.image.tag }}
{{- end -}}

{{- define "wd.pullSecrets" -}}
{{- with .Values.image.pullSecrets }}
imagePullSecrets:
{{- toYaml . | nindent 2 }}
{{- end }}
{{- end -}}

{{- define "wd.ollamaUrl" -}}
{{- if .Values.ollama.externalUrl -}}{{ .Values.ollama.externalUrl }}{{- else -}}http://{{ .Release.Name }}-ollama:11434{{- end -}}
{{- end -}}

{{/* Models the Ollama pod must pull. */}}
{{- define "wd.ollamaModels" -}}
{{- join " " .Values.ollama.models -}}
{{- end -}}

{{/* Env vars that give a workload its database connection. */}}
{{- define "wd.dbEnv" -}}
{{- if .Values.postgres.enabled }}
- name: POSTGRES_PASSWORD
  valueFrom:
    secretKeyRef: { name: {{ .Values.secrets.existingSecret }}, key: POSTGRES_PASSWORD }
- name: DATABASE_URL
  value: "postgresql+asyncpg://{{ .Values.postgres.user }}:$(POSTGRES_PASSWORD)@{{ .Release.Name }}-postgres:5432/{{ .Values.postgres.database }}"
{{- else }}
- name: DATABASE_URL
  valueFrom:
    secretKeyRef: { name: {{ .Values.secrets.existingSecret }}, key: DATABASE_URL }
{{- end }}
{{- end -}}

{{- define "wd.storageEndpoint" -}}
{{- if .Values.storage.enabled -}}http://{{ .Release.Name }}-storage:8333{{- else -}}{{ .Values.storage.endpoint }}{{- end -}}
{{- end -}}

{{- define "wd.comfyuiUrl" -}}
{{- if .Values.comfyui.enabled -}}http://{{ .Release.Name }}-comfyui:{{ .Values.comfyui.port }}{{- else -}}{{ .Values.env.COMFYUI_BASE_URL }}{{- end -}}
{{- end -}}

{{/* Object storage settings for the API and the media worker. */}}
{{- define "wd.storageEnv" -}}
- { name: STORAGE_ENDPOINT, value: {{ include "wd.storageEndpoint" . | quote }} }
- { name: STORAGE_PUBLIC_ENDPOINT, value: {{ .Values.storage.publicEndpoint | quote }} }
- { name: STORAGE_BUCKET, value: {{ .Values.storage.bucket | quote }} }
- { name: STORAGE_REGION, value: {{ .Values.storage.region | quote }} }
- { name: STORAGE_ACCESS_KEY, value: {{ .Values.storage.accessKey | quote }} }
- name: STORAGE_SECRET_KEY
  valueFrom:
    secretKeyRef: { name: {{ .Values.secrets.existingSecret }}, key: STORAGE_SECRET_KEY }
{{- end -}}

{{/* Env shared by the API and the migration job. */}}
{{- define "wd.apiEnv" -}}
{{ include "wd.dbEnv" . }}
- name: REDIS_URL
  value: "redis://{{ .Release.Name }}-redis:6379/0"
- name: LITELLM_BASE_URL
  value: "http://{{ .Release.Name }}-litellm:4000"
- name: LITELLM_API_KEY
  valueFrom:
    secretKeyRef: { name: {{ .Values.secrets.existingSecret }}, key: LITELLM_API_KEY }
- name: OLLAMA_BASE_URL
  value: {{ include "wd.ollamaUrl" . | quote }}
- name: COMFYUI_BASE_URL
  value: {{ .Values.env.COMFYUI_BASE_URL | quote }}
- name: LOG_LEVEL
  value: {{ .Values.env.LOG_LEVEL | quote }}
- name: AUTH_MODE
  value: {{ .Values.auth.mode | quote }}
{{- if ne .Values.auth.mode "stub" }}
- name: API_AUTH_SECRET
  valueFrom:
    secretKeyRef: { name: {{ .Values.secrets.existingSecret }}, key: API_AUTH_SECRET }
- name: ADMIN_EMAILS
  value: {{ .Values.auth.adminEmails | quote }}
{{- end }}
{{- include "wd.storageEnv" . | nindent 0 }}
{{- end -}}

{{/* Sign-in settings for the web pod (ADR-0030). Provider keys are optional: a provider with no key is simply not offered. */}}
{{- define "wd.webAuthEnv" -}}
- name: AUTH_MODE
  value: {{ .Values.auth.mode | quote }}
{{- if ne .Values.auth.mode "stub" }}
- name: AUTH_TRUST_HOST
  value: "true"
{{- with .Values.auth.url }}
- name: AUTH_URL
  value: {{ . | quote }}
{{- end }}
{{- range $key := list "AUTH_SECRET" "API_AUTH_SECRET" }}
- name: {{ $key }}
  valueFrom:
    secretKeyRef: { name: {{ $.Values.secrets.existingSecret }}, key: {{ $key }} }
{{- end }}
{{- range $key := list "AUTH_GOOGLE_ID" "AUTH_GOOGLE_SECRET" "AUTH_GITHUB_ID" "AUTH_GITHUB_SECRET" "AUTH_MICROSOFT_ENTRA_ID_ID" "AUTH_MICROSOFT_ENTRA_ID_SECRET" "AUTH_MICROSOFT_ENTRA_ID_ISSUER" }}
- name: {{ $key }}
  valueFrom:
    secretKeyRef: { name: {{ $.Values.secrets.existingSecret }}, key: {{ $key }}, optional: true }
{{- end }}
{{- end }}
{{- end -}}
