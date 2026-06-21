{{/* Nome do recurso: menufacil-<appName> */}}
{{- define "static-frontend.name" -}}
{{- printf "menufacil-%s" (required "appName eh obrigatorio" .Values.appName) -}}
{{- end -}}

{{- define "static-frontend.metaLabels" -}}
app.kubernetes.io/name: {{ include "static-frontend.name" . }}
app.kubernetes.io/part-of: menufacil
app.kubernetes.io/component: {{ .Values.appName }}
app.kubernetes.io/managed-by: argocd
{{- end -}}

{{- define "static-frontend.podLabels" -}}
app.kubernetes.io/name: {{ include "static-frontend.name" . }}
app.kubernetes.io/part-of: menufacil
app.kubernetes.io/component: {{ .Values.appName }}
{{- end -}}

{{- define "static-frontend.auxLabels" -}}
app.kubernetes.io/name: {{ include "static-frontend.name" . }}
app.kubernetes.io/part-of: menufacil
app.kubernetes.io/managed-by: argocd
{{- end -}}

{{- define "static-frontend.configLabels" -}}
app.kubernetes.io/name: {{ include "static-frontend.name" . }}
app.kubernetes.io/part-of: menufacil
{{- end -}}

{{- define "static-frontend.selectorLabels" -}}
app.kubernetes.io/name: {{ include "static-frontend.name" . }}
{{- end -}}
