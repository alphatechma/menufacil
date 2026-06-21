{{- define "backend.name" -}}menufacil-api-java{{- end -}}

{{/* Deployment/Service metadata: name, part-of, component, managed-by */}}
{{- define "backend.metaLabels" -}}
app.kubernetes.io/name: menufacil-api-java
app.kubernetes.io/part-of: menufacil
app.kubernetes.io/component: backend
app.kubernetes.io/managed-by: argocd
{{- end -}}

{{/* Pod template: name, part-of, component (sem managed-by) */}}
{{- define "backend.podLabels" -}}
app.kubernetes.io/name: menufacil-api-java
app.kubernetes.io/part-of: menufacil
app.kubernetes.io/component: backend
{{- end -}}

{{/* Aux (Ingress/ConfigMap): name, part-of, managed-by (sem component) */}}
{{- define "backend.auxLabels" -}}
app.kubernetes.io/name: menufacil-api-java
app.kubernetes.io/part-of: menufacil
app.kubernetes.io/managed-by: argocd
{{- end -}}

{{- define "backend.selectorLabels" -}}
app.kubernetes.io/name: menufacil-api-java
{{- end -}}
